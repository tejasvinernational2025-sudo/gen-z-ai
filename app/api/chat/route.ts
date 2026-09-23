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
const MAX_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 8000;
const MAX_TOTAL_CHARS = 24000;
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
