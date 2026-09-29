import { NextRequest, NextResponse } from "next/server";
import {
  createRazorpayOrder,
  getLivePlan,
  getRazorpayKeyId,
  razorpayLiveReady,
} from "@/lib/razorpay-live";
import { recordPaymentOrder, requirePaymentUser } from "@/lib/payment-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!razorpayLiveReady()) {
      return NextResponse.json(
        { error: "Live payment setup abhi complete nahi hua." },
        { status: 503 }
      );
    }

    const user = await requirePaymentUser(req);
    const body = await req.json();
    const plan = getLivePlan(String(body?.plan || ""));

    if (!plan) {
      return NextResponse.json({ error: "Paid plan configuration invalid hai." }, { status: 400 });
    }

    const receipt = `genz_${user.id.replace(/-/g, "").slice(0, 10)}_${Date.now().toString().slice(-10)}`;

    const order = await createRazorpayOrder({
      amount: plan.amount,
      currency: plan.currency,
      receipt,
      userId: user.id,
      plan: plan.id,
    });

    if (!order?.id || order.amount !== plan.amount || order.currency !== plan.currency) {
      throw new Error("Razorpay order response mismatch.");
    }

    await recordPaymentOrder({
      orderId: order.id,
      userId: user.id,
      plan: plan.id,
      amount: plan.amount,
      currency: plan.currency,
      validityDays: plan.validityDays,
    });

    return NextResponse.json({
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: plan.amount,
      currency: plan.currency,
      plan: plan.id,
      planName: plan.name,
      email: user.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment order create nahi hua.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Payment ke liye sign in karo." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
