import { NextRequest, NextResponse } from "next/server";
import { fetchRazorpayOrderPayments } from "@/lib/razorpay-live";
import {
  activatePaidPlan,
  getLatestOpenPaymentOrder,
  getPaymentOrder,
  requirePaymentUser,
} from "@/lib/payment-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requirePaymentUser(req);
    const body = await req.json().catch(() => ({}));
    const requestedOrderId =
      typeof body?.orderId === "string" && body.orderId.trim()
        ? body.orderId.trim()
        : null;

    const savedOrder = requestedOrderId
      ? await getPaymentOrder(requestedOrderId)
      : await getLatestOpenPaymentOrder(user.id);

    if (!savedOrder) {
      return NextResponse.json({ ok: true, found: false });
    }

    if (savedOrder.user_id !== user.id) {
      return NextResponse.json({ error: "Payment order account se match nahi karta." }, { status: 403 });
    }

    if (savedOrder.status === "paid") {
      return NextResponse.json({
        ok: true,
        found: true,
        activated: true,
        plan: savedOrder.plan,
      });
    }

    const payments = await fetchRazorpayOrderPayments(savedOrder.order_id);
    const matching = payments
      .filter((payment) =>
        payment.order_id === savedOrder.order_id &&
        payment.amount === savedOrder.amount &&
        payment.currency === savedOrder.currency
      )
      .sort((a, b) => (a.status === "captured" ? -1 : b.status === "captured" ? 1 : 0));

    const captured = matching.find((payment) => payment.status === "captured");

    if (captured) {
      const activated = await activatePaidPlan({
        orderId: savedOrder.order_id,
        paymentId: captured.id,
      });

      return NextResponse.json({
        ok: true,
        found: true,
        activated: true,
        plan: activated?.plan || savedOrder.plan,
        expires_at: activated?.expires_at || null,
      });
    }

    return NextResponse.json({
      ok: true,
      found: true,
      activated: false,
      pending: true,
      paymentStatuses: matching.map((payment) => payment.status),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment status recover nahi hua.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Payment status ke liye sign in karo." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
