import { NextResponse } from "next/server";
import { getPublicPlanConfig, requireLiveRazorpay } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function GET() {
  let liveKeysReady = false;
  try {
    requireLiveRazorpay();
    liveKeysReady = true;
  } catch {
    liveKeysReady = false;
  }

  const plans = getPublicPlanConfig();
  return NextResponse.json({
    currency: "INR",
    live: liveKeysReady,
    ready: liveKeysReady && plans.every((plan) => plan.enabled),
    plans,
  }, { headers: { "Cache-Control": "no-store" } });
}
