import { NextRequest, NextResponse } from "next/server";
import {
  fetchRazorpayPayment,
  verifyCheckoutSignature,
} from "@/lib/razorpay-live";
import {
  activatePaidPlan,
  getPaymentOrder,
  requirePaymentUser,
} from "@/lib/payment-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requirePaymentUser(req);
    const body = await req.json();

    const orderId = String(body?.razorpay_order_id || "");
    const paymentId = String(body?.razorpay_payment_id || "");
    const signature = String(body?.razorpay_signature || "");

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Payment verification details missing hain." }, { status: 400 });
    }

    const verified = verifyCheckoutSignature({ orderId, paymentId, signature });
    if (!verified) {
      return NextResponse.json({ error: "Payment signature invalid hai." }, { status: 400 });
    }

    const savedOrder = await getPaymentOrder(orderId);
    if (!savedOrder || savedOrder.user_id !== user.id) {
      return NextResponse.json({ error: "Payment order account se match nahi karta." }, { status: 403 });
    }

    const payment = await fetchRazorpayPayment(paymentId);

    if (
      payment.order_id !== orderId ||
      payment.amount !== savedOrder.amount ||
      payment.currency !== savedOrder.currency
    ) {
      return NextResponse.json({ error: "Payment amount/order mismatch." }, { status: 400 });
    }

    if (payment.status !== "captured") {
      return NextResponse.json({
        ok: false,
        pending: true,
        status: payment.status,
        message: "Payment receive hui hai; capture confirmation ka wait hai.",
      });
    }

    const activated = await activatePaidPlan({ orderId, paymentId });

    return NextResponse.json({
      ok: true,
      plan: activated?.plan || savedOrder.plan,
      expires_at: activated?.expires_at || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verify nahi hui.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Payment verify karne ke liye sign in karo." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
