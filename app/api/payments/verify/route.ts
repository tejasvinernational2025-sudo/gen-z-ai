import { NextRequest, NextResponse } from "next/server";
import { adminActivatePaidPlan, adminGetPaymentOrder, requireBillingUser } from "@/lib/billing-db";
import { razorpayAuthHeader, verifyPaymentSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireBillingUser(req);
    const body = await req.json();
    const orderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const paymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Incomplete payment response." }, { status: 400 });
    }

    const order = await adminGetPaymentOrder(orderId);
    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: "Payment order not found." }, { status: 404 });
    }

    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      return NextResponse.json({ error: "Payment signature invalid." }, { status: 400 });
    }

    let paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
      headers: { Authorization: razorpayAuthHeader() },
      cache: "no-store",
    });
    let payment = await paymentResponse.json();
    if (!paymentResponse.ok) {
      return NextResponse.json({ error: payment?.error?.description || "Payment status verify nahi hua." }, { status: 502 });
    }

    if (payment.order_id !== orderId || payment.amount !== order.amount_paise || payment.currency !== order.currency) {
      return NextResponse.json({ error: "Payment details mismatch." }, { status: 400 });
    }

    if (payment.status === "authorized") {
      paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId) + "/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: razorpayAuthHeader(),
        },
        body: JSON.stringify({ amount: order.amount_paise, currency: order.currency }),
      });
      payment = await paymentResponse.json();
      if (!paymentResponse.ok) {
        return NextResponse.json({ error: payment?.error?.description || "Payment capture nahi hua." }, { status: 502 });
      }
    }

    if (payment.status !== "captured") {
      return NextResponse.json({ error: "Payment abhi captured nahi hai." }, { status: 409 });
    }

    const activation = await adminActivatePaidPlan({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amountPaise: order.amount_paise,
    });

    return NextResponse.json({ ok: true, activation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
