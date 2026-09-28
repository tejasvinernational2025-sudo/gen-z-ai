import { NextRequest, NextResponse } from "next/server";
import { getPersistentQuotaStatus } from "@/lib/server-quota";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const status = await getPersistentQuotaStatus(req);

    if (!status) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Usage status unavailable.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
