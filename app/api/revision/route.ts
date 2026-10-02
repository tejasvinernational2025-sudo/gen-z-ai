import { NextRequest, NextResponse } from "next/server";
import {
  completeRevision,
  getRevisionDashboard,
  snoozeRevision,
} from "@/lib/revision-server";

export const runtime = "nodejs";

function cleanAction(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 30) : "";
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await getRevisionDashboard(req));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Revision dashboard load nahi hua.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = cleanAction(body?.action);

    if (action === "complete") {
      const result = await completeRevision(req, {
        revisionId: String(body?.revisionId || ""),
        score: Number(body?.score || 0),
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "snooze") {
      const result = await snoozeRevision(req, body?.revisionId);
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Invalid revision action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Revision update nahi hua.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
