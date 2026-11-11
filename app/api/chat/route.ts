import { NextRequest, NextResponse } from "next/server";
import { callAI, ChatMessage } from "@/lib/ai-provider";
import { normalizeStudyContext } from "@/lib/study-contexts";
import { buildSystemPrompt, StudyMode } from "@/lib/prompt";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getLearningPromptContext } from "@/lib/learning-server";
import { getGroundingContext } from "@/lib/source-grounding";
import {
  consumePersistentQuota,
  quotaExceededMessage,
  quotaHeaders,
} from "@/lib/server-quota";

export const runtime = "nodejs";

type RequestBody = {
  messages?: ChatMessage[];
  language?: string;
  mode?: StudyMode;
  studentContext?: string;
  sourceId?: string;
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
        : "English";

    const studentContext = normalizeStudyContext(body.studentContext);

    const requestedMode = body.mode;
    const mode: StudyMode =
      requestedMode && ALLOWED_MODES.has(requestedMode) ? requestedMode : "chat";

    const selectedLanguage = language.includes("—")
      ? language.split("—").pop()?.trim() || "English"
      : language.trim() || "English";
    const nativeLanguageInstruction =
      selectedLanguage === "Hinglish"
        ? "CRITICAL OUTPUT LANGUAGE REQUIREMENT: The Language selector is Hinglish. Answer in natural Hinglish using Latin script. This explicit language choice overrides the school medium and earlier conversation language."
        : selectedLanguage === "English"
          ? "CRITICAL OUTPUT LANGUAGE REQUIREMENT: The Language selector is English. Answer in English. This explicit language choice overrides the school medium and earlier conversation language."
          : `CRITICAL OUTPUT LANGUAGE REQUIREMENT: The Language selector is ${selectedLanguage}. Answer in ${selectedLanguage} using its native script. Translate headings, definitions, examples and exam questions into ${selectedLanguage}. This explicit language choice overrides the school medium and earlier conversation language.`;
    const learningContext = await getLearningPromptContext(req);
    const latestQuestion = messages[messages.length - 1]?.content || "";
    const groundingContext = await getGroundingContext(req, body.sourceId, latestQuestion);
    // Supply exact arithmetic checks for straightforward decimal subtraction found in
    // the student's question or grounded worksheet. This supplements (not replaces)
    // the model's reasoning and never claims to verify more complex expressions.
    const arithmeticSource = `${latestQuestion}\n${groundingContext}`.slice(0, 16000);
    const subtractionMatches = [...arithmeticSource.matchAll(/(?<![\\d.])(-?\\d{1,6}(?:\\.\\d{1,4})?)\\s*[−–-]\\s*(-?\\d{1,6}(?:\\.\\d{1,4})?)/g)].slice(0, 12);
    const exactArithmetic = subtractionMatches.map(match => {
      const left = Number(match[1]);
      const right = Number(match[2]);
      const result = Math.round((left - right) * 10000) / 10000;
      return `${left} - ${right} = ${result}; check: ${result} + ${right} = ${left}`;
    }).join("\n");
    const arithmeticInstruction = exactArithmetic
      ? `Verified decimal subtraction facts (use these exact answers whenever relevant; do not contradict them):\n${exactArithmetic}`
      : "";
    const mcqValidationInstruction = /(?:\\bmcqs?\\b|multiple[ -]?choice|बहुविकल्पीय|विकल्पों|चार विकल्प|quiz|क्विज़)/i.test(latestQuestion)
      ? [
          "CRITICAL MCQ QUALITY CHECK: Before responding, independently solve every proposed question and check all four options.",
          "Exactly ONE option must be correct. Reject and replace any question with two equivalent answers (e.g. 0.7 and 0.70, 1/2 and 2/4, or differently formatted equivalent ratios).",
          "For numerical answers, compare mathematical values rather than text; for fractions, simplify before comparing. Check answer keys, arithmetic, and PDF-grounded facts.",
          "Avoid repeated options and ambiguous wording. Regenerate flawed questions internally before showing the final answer.",
          "When the user asks for Hindi MCQs, write question text, labels, and answer explanations in Hindi even if the site language selector is English; do not translate mathematical symbols.",
          "If the uploaded source lacks enough facts, use fewer well-grounded questions rather than inventing source claims.",
        ].join("\n")
      : "";
    const system = [
      buildSystemPrompt(language, mode, studentContext, learningContext),
      mcqValidationInstruction,
      nativeLanguageInstruction,
      groundingContext,
      arithmeticInstruction,
    ].filter(Boolean).join("\n\n");
    const aiMessages = studentContext.includes(" | ") ? messages.slice(-1) : messages;

    const quota = await consumePersistentQuota(req, "chat");
    if (quota && !quota.allowed) {
      return NextResponse.json(
        { error: quotaExceededMessage(quota) },
        { status: 429, headers: quotaHeaders(quota) }
      );
    }

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
          messages: [{ role: "system", content: system }, ...aiMessages],
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
          "X-GenZ-Stream": "1",
          ...quotaHeaders(quota),
        },
      });
    }

    const result = await callAI(system, aiMessages);

    return NextResponse.json(
      {
        reply: result.text,
        provider: result.provider,
        model: result.model,
      },
      { headers: quotaHeaders(quota) }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
