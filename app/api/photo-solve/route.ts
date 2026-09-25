import { NextRequest, NextResponse } from "next/server";
import { normalizeStudyContext } from "@/lib/study-contexts";
import { buildSystemPrompt, type StudyMode } from "@/lib/prompt";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type PhotoSolveBody = {
  imageDataUrl?: string;
  prompt?: string;
  language?: string;
  mode?: StudyMode;
  studentContext?: string;
};

const ALLOWED_MODES = new Set<StudyMode>(["chat", "explain", "notes", "quiz", "exam"]);
const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = Math.floor(2.8 * 1024 * 1024);
const MAX_PROMPT_CHARS = 4000;
const MAX_LANGUAGE_CHARS = 80;

function parseImageDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];
  if (!ALLOWED_IMAGE_MIME.has(mime)) return null;

  const estimatedBytes =
    Math.floor((base64.length * 3) / 4) -
    (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

  return { mime, base64, estimatedBytes };
}

function collectGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

const GEMINI_VISION_FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

function geminiVisionModelChain() {
  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  return [primary, ...GEMINI_VISION_FALLBACK_MODELS].filter(
    (model, index, models) => models.indexOf(model) === index
  );
}

function canFallbackGeminiVision(status: number) {
  return status === 404 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function solveWithGemini(args: {
  system: string;
  prompt: string;
  mime: string;
  base64: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  let lastStatus = 0;

  for (const model of geminiVisionModelChain()) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: args.system }],
          },
          contents: [
            {
              role: "user",
              parts: [
                { text: args.prompt },
                {
                  inlineData: {
                    mimeType: args.mime,
                    data: args.base64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1600,
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const reply = collectGeminiText(data);
      if (!reply) {
        lastStatus = 502;
        continue;
      }

      return { reply, provider: "gemini", model };
    }

    lastStatus = response.status;
    const detail = (await response.text()).slice(0, 300);

    if (!canFallbackGeminiVision(response.status)) {
      throw new Error(`Gemini vision error (${response.status}): ${detail}`);
    }
  }

  throw new Error(
    `Gemini vision models are temporarily busy/unavailable (${lastStatus || 503}). Please try again shortly.`
  );
}

async function solveWithGroqVision(args: {
  system: string;
  prompt: string;
  imageDataUrl: string;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b";

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: args.system },
        {
          role: "user",
          content: [
            { type: "text", text: args.prompt },
            {
              type: "image_url",
              image_url: { url: args.imageDataUrl },
            },
          ],
        },
      ],
      reasoning_effort: "none",
      temperature: 0.3,
      max_completion_tokens: 1400,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Groq vision error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("Groq vision returned an empty response");

  return { reply, provider: "groq", model };
}

async function solveWithDeepSeek(args: {
  system: string;
  prompt: string;
  imageDataUrl: string;
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const model = process.env.DEEPSEEK_VISION_MODEL || "deepseek-flash";
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: args.system },
        {
          role: "user",
          content: [
            { type: "text", text: args.prompt },
            {
              type: "image_url",
              image_url: {
                url: args.imageDataUrl,
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
    throw new Error(`DeepSeek vision error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error("DeepSeek vision returned an empty response");

  return { reply, provider: "deepseek", model };
}

export async function POST(req: NextRequest) {
  const rate = enforceRateLimit(req, "photo", 8, 30 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Photo Solve ki temporary limit reach ho gai hai. Thodi der baad try karo." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

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
        { error: "Optimized photo size zyada hai. Photo ko crop karke dobara try karo." },
        { status: 413 }
      );
    }

    const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
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

    const studentContext = normalizeStudyContext(body.studentContext);

    const requestedMode = body.mode;
    const mode: StudyMode =
      requestedMode && ALLOWED_MODES.has(requestedMode) ? requestedMode : "explain";

    const system = buildSystemPrompt(language, mode, studentContext);

    if (process.env.GROQ_API_KEY) {
      const groq = await solveWithGroqVision({
        system,
        prompt,
        imageDataUrl: body.imageDataUrl,
      });
      if (groq) return NextResponse.json(groq);
    }

    const configured = process.env.GENZ_AI_PROVIDER?.toLowerCase();

    if (configured === "gemini" || (!configured && process.env.GEMINI_API_KEY)) {
      const result = await solveWithGemini({
        system,
        prompt,
        mime: parsedImage.mime,
        base64: parsedImage.base64,
      });
      if (result) return NextResponse.json(result);
    }

    const deepseek = await solveWithDeepSeek({
      system,
      prompt,
      imageDataUrl: body.imageDataUrl,
    });

    if (deepseek) return NextResponse.json(deepseek);

    const gemini = await solveWithGemini({
      system,
      prompt,
      mime: parsedImage.mime,
      base64: parsedImage.base64,
    });

    if (gemini) return NextResponse.json(gemini);

    return NextResponse.json(
      { error: "Photo Solve ke liye Groq, Gemini ya DeepSeek API key configure karo." },
      { status: 500 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
