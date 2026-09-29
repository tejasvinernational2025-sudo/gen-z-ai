import type { NextRequest } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xnvrscevqdemnxyuvcpf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_94rVXwzqw-HIFsO_kRKG1g_rDaxw6zm";

function requireSupabaseSecret() {
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || "";
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not configured.");
  return key;
}

export type BillingUser = { id: string; email?: string | null };

export async function requireBillingUser(req: NextRequest): Promise<BillingUser> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("AUTH_REQUIRED");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("AUTH_REQUIRED");
  const user = await response.json();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  return { id: user.id, email: user.email ?? null };
}

export async function adminInsertPaymentOrder(input: {
  userId: string;
  plan: string;
  amountPaise: number;
  currency: string;
  validDays: number;
  razorpayOrderId: string;
}) {
  const secret = requireSupabaseSecret();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/payment_orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      apikey: secret,
    },
    body: JSON.stringify({
      user_id: input.userId,
      plan: input.plan,
      amount_paise: input.amountPaise,
      currency: input.currency,
      valid_days: input.validDays,
      razorpay_order_id: input.razorpayOrderId,
      status: "created",
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Payment order save failed (${response.status}): ${detail.slice(0, 180)}`);
  }
}

export async function adminGetPaymentOrder(razorpayOrderId: string) {
  const secret = requireSupabaseSecret();
  const url = new URL(`${SUPABASE_URL}/rest/v1/payment_orders`);
  url.searchParams.set("razorpay_order_id", `eq.${razorpayOrderId}`);
  url.searchParams.set("select", "user_id,plan,amount_paise,currency,valid_days,razorpay_order_id,razorpay_payment_id,status");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: { apikey: secret },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Payment order lookup failed (${response.status}): ${detail.slice(0, 180)}`);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function adminActivatePaidPlan(input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amountPaise: number;
}) {
  const secret = requireSupabaseSecret();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_activate_paid_plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: secret,
    },
    body: JSON.stringify({
      p_razorpay_order_id: input.razorpayOrderId,
      p_razorpay_payment_id: input.razorpayPaymentId,
      p_amount_paise: input.amountPaise,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Plan activation failed (${response.status}): ${detail.slice(0, 180)}`);
  }

  return response.json();
}
