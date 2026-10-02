import { CanvasFactory } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { NextRequest, NextResponse } from "next/server";
import {
  createStudySource,
  deleteStudySource,
  listStudySources,
  requireSourceUser,
} from "@/lib/source-grounding";

export const runtime = "nodejs";

const MAX_PDF_BYTES = Math.floor(2.5 * 1024 * 1024);
const MAX_TEXT_CHARS = 120_000;

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function extractPdfText(base64: string) {
  const parser = new PDFParse({
    data: new Uint8Array(Buffer.from(base64, "base64")),
    CanvasFactory,
  });

  try {
    const result = await parser.getText();
    return String(result.text || "")
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .trim()
      .slice(0, MAX_TEXT_CHARS);
  } finally {
    await parser.destroy();
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireSourceUser(req);
    const sources = await listStudySources(user.id);
    return NextResponse.json({ sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Study sources load nahi hue.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireSourceUser(req);
    const body = await req.json();
    const action = cleanText(body?.action, 30);

    if (action === "delete") {
      const sourceId = cleanText(body?.sourceId, 80);
      if (!sourceId) return NextResponse.json({ error: "Source id required." }, { status: 400 });
      await deleteStudySource(user.id, sourceId);
      return NextResponse.json({ ok: true });
    }

    if (action !== "create") {
      return NextResponse.json({ error: "Invalid source action." }, { status: 400 });
    }

    const title = cleanText(body?.title, 160);
    const subject = cleanText(body?.subject, 100);
    const chapter = cleanText(body?.chapter, 160);
    const sourceType = body?.sourceType === "text" ? "text" : "pdf";

    if (!title) {
      return NextResponse.json({ error: "Book/chapter title required hai." }, { status: 400 });
    }

    let extractedText = "";

    if (sourceType === "text") {
      extractedText = cleanText(body?.text, MAX_TEXT_CHARS);
      if (extractedText.length < 40) {
        return NextResponse.json({ error: "Chapter text thoda aur complete paste karo." }, { status: 400 });
      }
    } else {
      const dataUrl = typeof body?.pdfDataUrl === "string" ? body.pdfDataUrl : "";
      if (!dataUrl.startsWith("data:application/pdf;base64,")) {
        return NextResponse.json({ error: "Valid PDF required hai." }, { status: 400 });
      }

      const base64 = dataUrl.split(",", 2)[1];
      if (!base64 || !/^[A-Za-z0-9+/=]+$/.test(base64)) {
        return NextResponse.json({ error: "PDF data invalid hai." }, { status: 400 });
      }

      const estimatedBytes =
        Math.floor((base64.length * 3) / 4) -
        (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

      if (estimatedBytes > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "Source PDF 2.5 MB se chhoti honi chahiye." }, { status: 413 });
      }

      extractedText = await extractPdfText(base64);
      if (extractedText.length < 40) {
        return NextResponse.json(
          { error: "Is PDF se readable text nahi mila. Text-based PDF ya pasted chapter use karo." },
          { status: 400 }
        );
      }
    }

    const source = await createStudySource(user.id, {
      title,
      subject,
      chapter,
      sourceType,
      extractedText,
    });

    return NextResponse.json({
      ok: true,
      source: source
        ? {
            id: source.id,
            title: source.title,
            subject: source.subject,
            chapter: source.chapter,
            source_type: source.source_type,
            char_count: source.char_count,
            created_at: source.created_at,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Study source save nahi hua.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
