import type { NextRequest } from "next/server";
import type { PaidPlanId } from "@/lib/razorpay-live";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xnvrscevqdemnxyuvcpf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_94rVXwzqw-HIFsO_kRKG1g_rDaxw6zm";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return key;
}

export async function requirePaymentUser(req: NextRequest) {
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

  const data = await response.json();
  if (!data?.id) throw new Error("AUTH_REQUIRED");

  return {
    id: String(data.id),
    email: typeof data.email === "string" ? data.email : "",
  };
}

async function serviceRpc(name: string, body: Record<string, unknown>) {
  const key = serviceRoleKey();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Payment database operation failed (${response.status}): ${raw.slice(0, 220)}`);
  }

  return raw ? JSON.parse(raw) : null;
}

export async function recordPaymentOrder(input: {
  orderId: string;
  userId: string;
  plan: PaidPlanId;
  amount: number;
  currency: string;
  validityDays: number;
}) {
  return serviceRpc("record_payment_order", {
    p_order_id: input.orderId,
    p_user_id: input.userId,
    p_plan: input.plan,
    p_amount: input.amount,
    p_currency: input.currency,
    p_validity_days: input.validityDays,
  });
}

export async function activatePaidPlan(input: {
  orderId: string;
  paymentId: string;
}) {
  return serviceRpc("activate_paid_plan_from_payment", {
    p_order_id: input.orderId,
    p_payment_id: input.paymentId,
  });
}

export async function getPaymentOrder(orderId: string) {
  return serviceRpc("get_payment_order_for_verification", {
    p_order_id: orderId,
  });
}
