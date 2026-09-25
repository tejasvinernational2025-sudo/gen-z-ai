import { NextRequest, NextResponse } from "next/server";
import { callAI, ChatMessage } from "@/lib/ai-provider";
import { normalizeStudyContext } from "@/lib/study-contexts";
import { buildSystemPrompt, StudyMode } from "@/lib/prompt";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RequestBody = {
  messages?: ChatMessage[];
  language?: string;
  mode?: StudyMode;
  studentContext?: string;
};

const ALLOWED_MODES = new Set<StudyMode>(["chat", "explain", "notes", "quiz", "exam"]);
const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 8000;
const MAX_TOTAL_CHARS = 16000;
const MAX_LANGUAGE_CHARS = 80;

export async function POST(req: NextRequest) {
  const rate = enforceRateLimit(req, "chat", 20, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Thodi der me dobara try karo. Chat request limit temporarily reach ho gai hai." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = (await req.json()) as RequestBody;

    const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    const messages: ChatMessage[] = [];

    for (const item of rawMessages) {
      if (
        !item ||
        (item.role !== "user" && item.role !== "assistant") ||
        typeof item.content !== "string"
      ) {
        return NextResponse.json({ error: "Invalid chat message." }, { status: 400 });
      }

      const content = item.content.trim();
      if (!content) continue;

      if (content.length > MAX_MESSAGE_CHARS) {
        return NextResponse.json(
          { error: "Ek message bahut lamba hai. Use chhota karke bhejo." },
          { status: 413 }
        );
      }

      messages.push({ role: item.role, content });
    }

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }

    const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return NextResponse.json(
        { error: "Chat context bahut lamba ho gaya hai. New chat start karo." },
        { status: 413 }
      );
    }

    const language =
      typeof body.language === "string" && body.language.trim()
        ? body.language.trim().slice(0, MAX_LANGUAGE_CHARS)
        : "Hinglish";

    const studentContext = normalizeStudyContext(body.studentContext);

    const requestedMode = body.mode;
    const mode: StudyMode =
      requestedMode && ALLOWED_MODES.has(requestedMode) ? requestedMode : "chat";

    const system = buildSystemPrompt(language, mode, studentContext);

    // Stream Groq text replies so the student sees the answer immediately.
    if (process.env.GROQ_API_KEY) {
      const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, ...messages],
          max_completion_tokens: 900,
          temperature: 0.4,
          stream: true,
        }),
      });

      if (!groqResponse.ok || !groqResponse.body) {
        const detail = await groqResponse.text();
        return NextResponse.json(
          { error: `Groq error (${groqResponse.status}): ${detail.slice(0, 300)}` },
          { status: groqResponse.status || 500 }
        );
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = groqResponse.body!.getReader();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line.startsWith("data:")) continue;

                const payload = line.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;

                try {
                  const event = JSON.parse(payload);
                  const token = event?.choices?.[0]?.delta?.content;
                  if (typeof token === "string" && token) {
                    controller.enqueue(encoder.encode(token));
                  }
                } catch {
                  // Ignore malformed SSE fragments and continue streaming.
                }
              }
            }

            controller.close();
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
          "X-AI-Provider": "groq",
          "X-AI-Model": model,
        },
      });
    }

    const result = await callAI(system, messages);

    return NextResponse.json({
      reply: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
