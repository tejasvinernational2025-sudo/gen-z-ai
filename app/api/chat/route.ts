import { NextRequest, NextResponse } from "next/server";
import { callAI, ChatMessage } from "@/lib/ai-provider";
import { buildSystemPrompt, StudyMode } from "@/lib/prompt";

export const runtime = "nodejs";

type RequestBody = {
  messages?: ChatMessage[];
  language?: string;
  mode?: StudyMode;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const language = body.language || "Hinglish";
    const mode = body.mode || "chat";

    if (!messages.length || !messages[messages.length - 1]?.content?.trim()) {
      return NextResponse.json({ error: "Please enter a question." }, { status: 400 });
    }

    const system = buildSystemPrompt(language, mode);
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
