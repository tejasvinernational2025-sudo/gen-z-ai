import { PDFParse } from "pdf-parse";
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

type StructuredMcq = {
  question?: string;
  options?: string[];
  answer?: string;
};

type StructuredPdfResult = {
  summary?: string;
  mcqs?: StructuredMcq[];
};

const ALLOWED_MODES = new Set<StudyMode>(["chat", "explain", "notes", "quiz", "exam"]);
const MAX_PDF_BYTES = Math.floor(2.5 * 1024 * 1024);
const MAX_PROMPT_CHARS = 4000;
const MAX_LANGUAGE_CHARS = 80;
const MAX_EXTRACTED_PDF_CHARS = 50_000;
const GEMINI_TIMEOUT_MS = 12_000;
const PDF_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];

function collectGeminiText(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function canFallback(status: number) {
  return [404, 408, 429, 500, 502, 503, 504].includes(status);
}

function formatStructured(result: StructuredPdfResult, requestedCount: number) {
  const summary = typeof result.summary === "string" ? result.summary.trim() : "";
  const mcqs = Array.isArray(result.mcqs) ? result.mcqs.slice(0, requestedCount) : [];

  if (!summary || mcqs.length !== requestedCount) return null;

  const blocks = mcqs.map((mcq, index) => {
    const options = Array.isArray(mcq.options)
      ? mcq.options.slice(0, 4).map((option) =>
          String(option).replace(/^\s*[A-D][.)\-:]\s*/i, "").trim()
        )
      : [];
    if (!mcq.question || !mcq.answer || options.length !== 4) return null;

    const cleanAnswer = String(mcq.answer)
      .replace(/^\s*Answer\s*:\s*/i, "")
      .trim();

    return [
      `${index + 1}. ${mcq.question}`,
      `A. ${options[0]}`,
      `B. ${options[1]}`,
      `C. ${options[2]}`,
      `D. ${options[3]}`,
      `Answer: ${cleanAnswer}`,
    ].join("\n");
  });

  if (blocks.some((item) => item === null)) return null;

  return `PDF Summary\n\n${summary}\n\nMCQs\n\n${blocks.join("\n\n")}`;
}

async function extractPdfText(base64: string) {
  const parser = new PDFParse({ data: Buffer.from(base64, "base64") });

  try {
    const result = await parser.getText();
    return String(result.text || "")
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .trim()
      .slice(0, MAX_EXTRACTED_PDF_CHARS);
  } finally {
    await parser.destroy();
  }
}

async function callGroqPdf(args: {
  text: string;
  prompt: string;
  system: string;
  requestedCount: number | null;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: args.system },
      {
        role: "user",
        content: `${args.prompt}\n\nPDF TEXT:\n${args.text}`,
      },
    ],
    reasoning_effort: "low",
    temperature: 0.3,
    max_completion_tokens: args.requestedCount ? 1800 : 1100,
  };

  if (args.requestedCount) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "pdf_study_result",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            mcqs: {
              type: "array",
              minItems: args.requestedCount,
              maxItems: args.requestedCount,
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: { type: "string" },
                  },
                  answer: { type: "string" },
                },
                required: ["question", "options", "answer"],
                additionalProperties: false,
              },
            },
          },
          required: ["summary", "mcqs"],
          additionalProperties: false,
        },
      },
    };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Groq PDF error (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Groq PDF returned an empty response");

  if (!args.requestedCount) {
    return { reply: raw, provider: "groq", model };
  }

  const parsed = JSON.parse(raw) as StructuredPdfResult;
  const formatted = formatStructured(parsed, args.requestedCount);
  if (!formatted) throw new Error("Groq PDF structured response incomplete");

  return { reply: formatted, provider: "groq", model };
}

async function callGeminiPdf(args: {
  base64: string;
  prompt: string;
  system: string;
  requestedCount: number | null;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  let lastStatus = 0;

  for (const model of PDF_MODELS) {
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: args.requestedCount ? 1800 : 1100,
    };

    if (args.requestedCount) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = {
        type: "OBJECT",
        properties: {
          summary: {
            type: "STRING",
            description: "A concise complete summary in the requested student language.",
          },
          mcqs: {
            type: "ARRAY",
            minItems: args.requestedCount,
            maxItems: args.requestedCount,
            items: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                options: {
                  type: "ARRAY",
                  minItems: 4,
                  maxItems: 4,
                  items: { type: "STRING" },
                },
                answer: {
                  type: "STRING",
                  description: "Correct option letter and answer text.",
                },
              },
              required: ["question", "options", "answer"],
            },
          },
        },
        required: ["summary", "mcqs"],
      };
    }

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
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
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
            generationConfig,
          }),
        }
      );
    } catch {
      lastStatus = 408;
      continue;
    }

    if (!response.ok) {
      lastStatus = response.status;
      const detail = (await response.text()).slice(0, 300);
      if (!canFallback(response.status)) {
        throw new Error(`Gemini PDF error (${response.status}): ${detail}`);
      }
      continue;
    }

    const data = await response.json();
    const raw = collectGeminiText(data);
    if (!raw) {
      lastStatus = 502;
      continue;
    }

    if (!args.requestedCount) {
      return { reply: raw, provider: "gemini", model };
    }

    try {
      const parsed = JSON.parse(raw) as StructuredPdfResult;
      const formatted = formatStructured(parsed, args.requestedCount);
      if (formatted) {
        return { reply: formatted, provider: "gemini", model };
      }
    } catch {
      // Try the fallback model if structured output is incomplete.
    }

    lastStatus = 502;
  }

  throw new Error(
    `PDF response complete nahi ho saka (${lastStatus || 503}). Please retry once.`
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

    const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (rawPrompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: "PDF ke saath prompt bahut lamba hai. Use chhota karke bhejo." },
        { status: 413 }
      );
    }

    const prompt =
      rawPrompt ||
      "Is PDF ko student ke liye simple language me summarize karo aur important revision points do.";

    const requestedCountMatch = rawPrompt.match(
      /\b(\d{1,2})\s*(?:mcq|mcqs|questions?|sawal|sawaal)\b/i
    );
    const requestedCount = requestedCountMatch
      ? Math.min(20, Math.max(1, Number(requestedCountMatch[1])))
      : null;

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

    const contract = requestedCount
      ? `Exactly ${requestedCount} MCQs do. Summary short but complete rakho. Har MCQ me 4 options aur correct answer hona chahiye.`
      : "Student ki request complete karo.";

    const modelPrompt = `Student request:\n${prompt}\n\nRequired output:\n${contract}`;

    if (process.env.GROQ_API_KEY) {
      try {
        const extractedText = await extractPdfText(base64);

        if (extractedText) {
          const groq = await callGroqPdf({
            text: extractedText,
            system,
            requestedCount,
            prompt: modelPrompt,
          });

          if (groq) {
            return NextResponse.json({
              reply: groq.reply,
              provider: groq.provider,
              model: groq.model,
              directPdf: false,
              structured: Boolean(requestedCount),
            });
          }
        }
      } catch (groqError) {
        // Some scanned or malformed PDFs cannot be text-extracted.
        // Fall through to Gemini's native PDF input when configured.
        if (!process.env.GEMINI_API_KEY) throw groqError;
      }
    }

    const result = await callGeminiPdf({
      base64,
      system,
      requestedCount,
      prompt: modelPrompt,
    });

    return NextResponse.json({
      reply: result.reply,
      provider: result.provider,
      model: result.model,
      directPdf: true,
      structured: Boolean(requestedCount),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
