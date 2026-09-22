import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, StudyMode } from "@/lib/prompt";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

type RequestBody = {
  messages?: ChatMessage[];
  language?: string;
  mode?: StudyMode;
};

async function callDeepSeek(system: string, messages: ChatMessage[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: 1200,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI provider error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI provider returned an empty response");
  return text as string;
}

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
    const reply = await callDeepSeek(system, messages);
    return NextResponse.json({ reply, provider: "deepseek" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
