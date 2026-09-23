import { NextRequest, NextResponse } from "next/server";
import { normalizeStudyContext } from "@/lib/study-contexts";
import { buildSystemPrompt, type StudyMode } from "@/lib/prompt";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type PdfStudyBody = {
  pdfDataUrl?: string;
  prompt?: string;
  language?: string;
  mode?: StudyMode;
  studentContext?: string;
};

const ALLOWED_MODES = new Set<StudyMode>(["chat", "explain", "notes", "quiz", "exam"]);
const MAX_PDF_BYTES = Math.floor(2.5 * 1024 * 1024);
const MAX_PROMPT_CHARS = 4000;
const MAX_LANGUAGE_CHARS = 80;
const GEMINI_PDF_TIMEOUT_MS = 10_000;

const GEMINI_PDF_FALLBACK_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
];

function collectGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function geminiPdfModelChain() {
  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  return [primary, ...GEMINI_PDF_FALLBACK_MODELS].filter(
    (model, index, models) => models.indexOf(model) === index
  );
}

function canFallbackGemini(status: number) {
  return status === 404 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function studyPdfWithGemini(args: {
  base64: string;
  prompt: string;
  system: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  let lastStatus = 0;

  for (const model of geminiPdfModelChain()) {
    let response: Response;

    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: AbortSignal.timeout(GEMINI_PDF_TIMEOUT_MS),
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
                      mimeType: "application/pdf",
                      data: args.base64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 800,
            },
          }),
        }
      );
    } catch {
      lastStatus = 408;
      continue;
    }

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

    if (!canFallbackGemini(response.status)) {
      throw new Error(`Gemini PDF error (${response.status}): ${detail}`);
    }
  }

  throw new Error(
    `PDF AI response timed out or is temporarily unavailable (${lastStatus || 503}). Please retry once.`
  );
}

export async function POST(req: NextRequest) {
  const rate = enforceRateLimit(req, "pdf", 6, 30 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "PDF Study ki temporary limit reach ho gai hai. Thodi der baad try karo." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = (await req.json()) as PdfStudyBody;
    const dataUrl = body.pdfDataUrl;

    const rawPrompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (rawPrompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: "PDF ke saath prompt bahut lamba hai. Use chhota karke bhejo." },
        { status: 413 }
      );
    }

    const prompt =
      rawPrompt ||
      "Is PDF ko student ke liye simple language me summarize karo, important points aur likely revision questions do.";

    const requestedCountMatch = rawPrompt.match(
      /\b(\d{1,2})\s*(?:mcq|mcqs|questions?|sawal|sawaal)\b/i
    );
    const requestedCount = requestedCountMatch
      ? Math.min(20, Math.max(1, Number(requestedCountMatch[1])))
      : null;

    const completionRule = requestedCount
      ? `Student ne exactly ${requestedCount} MCQ/questions maange hain. Exactly ${requestedCount} hi do, 1 se ${requestedCount} tak number karo. Har MCQ me A-D options aur Answer do. Summary concise rakho aur ${requestedCount} complete kiye bina response end mat karo.`
      : "Student agar specific item/question count maange to exact count follow karo.";

    const language =
      typeof body.language === "string" && body.language.trim()
        ? body.language.trim().slice(0, MAX_LANGUAGE_CHARS)
        : "Hinglish";

    const studentContext = normalizeStudyContext(body.studentContext);

    const requestedMode = body.mode;
    const mode: StudyMode =
      requestedMode && ALLOWED_MODES.has(requestedMode) ? requestedMode : "notes";

    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:application/pdf;base64,")) {
      return NextResponse.json({ error: "Valid PDF required." }, { status: 400 });
    }

    const base64 = dataUrl.split(",", 2)[1];
    if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
      return NextResponse.json({ error: "PDF data invalid hai." }, { status: 400 });
    }

    const estimatedBytes =
      Math.floor((base64.length * 3) / 4) -
      (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

    if (estimatedBytes > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF 2.5 MB se chhoti honi chahiye." }, { status: 413 });
    }

    const system = buildSystemPrompt(language, mode, studentContext);
    const result = await studyPdfWithGemini({
      base64,
      system,
      prompt: `Student request:\n${prompt}\n\nOutput contract:\n${completionRule}`,
    });

    return NextResponse.json({
      reply: result.reply,
      provider: result.provider,
      model: result.model,
      directPdf: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
