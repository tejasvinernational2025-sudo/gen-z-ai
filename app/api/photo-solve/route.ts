import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, type StudyMode } from "@/lib/prompt";

export const runtime = "nodejs";

type PhotoSolveBody = {
  imageDataUrl?: string;
  prompt?: string;
  language?: string;
  mode?: StudyMode;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PhotoSolveBody;
    const imageDataUrl = body.imageDataUrl;
    const prompt = body.prompt?.trim() || "Is image me jo study question hai use samjho aur step-by-step solve karo.";
    const language = body.language || "Hinglish";
    const mode = body.mode || "explain";

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Valid image required." }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "DEEPSEEK_API_KEY is not configured." }, { status: 500 });
    }

    const model = process.env.DEEPSEEK_VISION_MODEL || "deepseek-flash";
    const system = buildSystemPrompt(language, mode);

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 1600,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `Vision provider error (${response.status}): ${detail.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return NextResponse.json({ error: "Vision model returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({
      reply,
      provider: "deepseek",
      model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
