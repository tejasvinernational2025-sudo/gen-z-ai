import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay-live";
import { activatePaidPlan } from "@/lib/payment-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event?.event !== "payment.captured") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = event?.payload?.payment?.entity;
    const orderId = typeof payment?.order_id === "string" ? payment.order_id : "";
    const paymentId = typeof payment?.id === "string" ? payment.id : "";

    if (!orderId || !paymentId) {
      return NextResponse.json({ error: "Webhook payment data missing." }, { status: 400 });
    }

    await activatePaidPlan({ orderId, paymentId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
