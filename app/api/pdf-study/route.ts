import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { callAI } from "@/lib/ai-provider";
import { buildSystemPrompt, type StudyMode } from "@/lib/prompt";

export const runtime = "nodejs";

type PdfStudyBody = {
  pdfDataUrl?: string;
  prompt?: string;
  language?: string;
  mode?: StudyMode;
};

const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 50000;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PdfStudyBody;
    const dataUrl = body.pdfDataUrl;
    const prompt =
      body.prompt?.trim() ||
      "Is PDF ko student ke liye simple language me summarize karo, important points aur likely revision questions do.";
    const language = body.language || "Hinglish";
    const mode = body.mode || "notes";

    if (!dataUrl?.startsWith("data:application/pdf;base64,")) {
      return NextResponse.json({ error: "Valid PDF required." }, { status: 400 });
    }

    const base64 = dataUrl.split(",", 2)[1];
    if (!base64) {
      return NextResponse.json({ error: "PDF data missing." }, { status: 400 });
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

    const system = buildSystemPrompt(language, mode);
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
