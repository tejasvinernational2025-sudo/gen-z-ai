import { NextRequest, NextResponse } from "next/server";
import { adminInsertPaymentOrder, requireBillingUser } from "@/lib/billing-db";
import { getPaidPlanConfig, razorpayAuthHeader, requireLiveRazorpay } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireBillingUser(req);
    const body = await req.json();
    const plan = getPaidPlanConfig(typeof body?.plan === "string" ? body.plan : "");

    if (!plan) return NextResponse.json({ error: "Invalid paid plan." }, { status: 400 });
    if (plan.amountPaise <= 0 || plan.validDays <= 0) {
      return NextResponse.json({ error: "Paid plan pricing is not configured yet." }, { status: 503 });
    }

    const { keyId } = requireLiveRazorpay();
    const receipt = ("genz_" + Date.now() + "_" + user.id.slice(0, 8)).slice(0, 40);
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: razorpayAuthHeader(),
      },
      body: JSON.stringify({
        amount: plan.amountPaise,
        currency: "INR",
        receipt,
        notes: {
          product: "Gen-z AI",
          user_id: user.id,
          plan: plan.id,
          valid_days: String(plan.validDays),
        },
      }),
    });

    const razorpayData = await razorpayResponse.json();
    if (!razorpayResponse.ok || !razorpayData?.id) {
      return NextResponse.json(
        { error: razorpayData?.error?.description || "Razorpay order create nahi hua." },
        { status: razorpayResponse.status || 502 }
      );
    }

    await adminInsertPaymentOrder({
      userId: user.id,
      plan: plan.id,
      amountPaise: plan.amountPaise,
      currency: "INR",
      validDays: plan.validDays,
      razorpayOrderId: razorpayData.id,
    });

    return NextResponse.json({
      keyId,
      orderId: razorpayData.id,
      amount: plan.amountPaise,
      currency: "INR",
      plan: plan.id,
      planName: plan.name,
      validDays: plan.validDays,
      email: user.email || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment order failed.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
