import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { callAI } from "@/lib/ai-provider";
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
const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 50000;
const MAX_PROMPT_CHARS = 4000;
const MAX_LANGUAGE_CHARS = 80;

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
      return NextResponse.json({ error: "PDF 6 MB se chhoti honi chahiye." }, { status: 413 });
    }

    const buffer = Buffer.from(base64, "base64");
    if (buffer.byteLength > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "PDF 6 MB se chhoti honi chahiye." }, { status: 413 });
    }

    const parser = new PDFParse({ data: new Uint8Array(buffer) });

    let extractedText = "";
    try {
      const result = await parser.getText();
      extractedText = result.text?.trim() || "";
    } finally {
      await parser.destroy();
    }

    if (!extractedText) {
      return NextResponse.json(
        { error: "PDF me readable text nahi mila. Scanned PDF ke liye Photo Solve use karo." },
        { status: 422 }
      );
    }

    const truncated = extractedText.length > MAX_EXTRACTED_CHARS;
    const studyText = extractedText.slice(0, MAX_EXTRACTED_CHARS);

    const system = buildSystemPrompt(language, mode, studentContext);
    const result = await callAI(system, [
      {
        role: "user",
        content:
          `Student request:\n${prompt}\n\nPDF text:\n${studyText}` +
          (truncated
            ? "\n\nNote: PDF was long, so this MVP analyzed the first extracted section only."
            : ""),
      },
    ]);

    return NextResponse.json({
      reply: result.text,
      provider: result.provider,
      model: result.model,
      truncated,
      extractedCharacters: studyText.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
