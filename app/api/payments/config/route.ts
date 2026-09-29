import { NextResponse } from "next/server";
import { getPublicLivePlans, razorpayLiveReady } from "@/lib/razorpay-live";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      live: true,
      ready: razorpayLiveReady(),
      plans: getPublicLivePlans(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
