import { NextRequest, NextResponse } from "next/server";
import { adminActivatePaidPlan, adminGetPaymentOrder } from "@/lib/billing-db";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    if (event?.event !== "payment.captured") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = event?.payload?.payment?.entity;
    const orderId = typeof payment?.order_id === "string" ? payment.order_id : "";
    const paymentId = typeof payment?.id === "string" ? payment.id : "";
    const amount = typeof payment?.amount === "number" ? payment.amount : 0;
    if (!orderId || !paymentId || amount <= 0) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const order = await adminGetPaymentOrder(orderId);
    if (!order) return NextResponse.json({ ok: true, ignored: true });
    if (order.amount_paise !== amount || order.currency !== payment.currency) {
      return NextResponse.json({ error: "Webhook payment mismatch." }, { status: 400 });
    }

    await adminActivatePaidPlan({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amountPaise: amount,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
