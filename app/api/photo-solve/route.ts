import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, type StudyMode } from "@/lib/prompt";

export const runtime = "nodejs";

type PhotoSolveBody = {
  imageDataUrl?: string;
  prompt?: string;
  language?: string;
  mode?: StudyMode;
};

const ALLOWED_MODES = new Set<StudyMode>(["chat", "explain", "notes", "quiz", "exam"]);
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROMPT_CHARS = 4000;
const MAX_LANGUAGE_CHARS = 80;

function parseImageDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];
  if (!ALLOWED_IMAGE_MIME.has(mime)) return null;

  const estimatedBytes = Math.floor((base64.length * 3) / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  return { mime, base64, estimatedBytes };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PhotoSolveBody;

    if (typeof body.imageDataUrl !== "string") {
      return NextResponse.json({ error: "Valid image required." }, { status: 400 });
    }

    const parsedImage = parseImageDataUrl(body.imageDataUrl);
    if (!parsedImage) {
      return NextResponse.json(
        { error: "JPEG, PNG, WebP ya GIF image bhejo." },
        { status: 400 }
      );
    }

    if (parsedImage.estimatedBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Photo 8 MB se chhoti honi chahiye." },
        { status: 413 }
      );
    }

    const rawPrompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (rawPrompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: "Photo ke saath prompt bahut lamba hai. Use chhota karke bhejo." },
        { status: 413 }
      );
    }

    const prompt =
      rawPrompt ||
      "Is image me jo study question hai use samjho aur step-by-step solve karo.";

    const language =
      typeof body.language === "string" && body.language.trim()
        ? body.language.trim().slice(0, MAX_LANGUAGE_CHARS)
        : "Hinglish";

    const requestedMode = body.mode;
    const mode: StudyMode =
      requestedMode && ALLOWED_MODES.has(requestedMode) ? requestedMode : "explain";

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
                  url: body.imageDataUrl,
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
