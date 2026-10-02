import { NextRequest, NextResponse } from "next/server";
import { getProgressDashboard, requireProgressUser } from "@/lib/progress-server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireProgressUser(req);
    const dashboard = await getProgressDashboard(user.id);
    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Progress dashboard load nahi hua.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
