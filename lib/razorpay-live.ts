import { createHmac, timingSafeEqual } from "crypto";

export type PaidPlanId = "student" | "student_plus";

export type LivePlanConfig = {
  id: PaidPlanId;
  name: string;
  amount: number;
  currency: "INR";
  validityDays: number;
};

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
};

export type RazorpayPayment = {
  id: string;
  order_id?: string | null;
  amount: number;
  currency: string;
  status: string;
};

type RazorpayPaymentCollection = {
  entity: "collection";
  count: number;
  items: RazorpayPayment[];
};

const RAZORPAY_API = "https://api.razorpay.com/v1";

function positiveInt(value?: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getLivePlan(plan: string): LivePlanConfig | null {
  if (plan !== "student" && plan !== "student_plus") return null;

  const amount =
    plan === "student"
      ? positiveInt(process.env.GENZ_STUDENT_PRICE_PAISE)
      : positiveInt(process.env.GENZ_STUDENT_PLUS_PRICE_PAISE);

  const validityDays =
    plan === "student"
      ? positiveInt(process.env.GENZ_STUDENT_VALIDITY_DAYS)
      : positiveInt(process.env.GENZ_STUDENT_PLUS_VALIDITY_DAYS);

  if (!amount || !validityDays) return null;

  return {
    id: plan,
    name: plan === "student" ? "Student" : "Student Plus",
    amount,
    currency: "INR",
    validityDays,
  };
}

export function getPublicLivePlans() {
  return (["student", "student_plus"] as const).map((id) => {
    const plan = getLivePlan(id);
    return plan
      ? {
          id: plan.id,
          name: plan.name,
          amount: plan.amount,
          currency: plan.currency,
          validityDays: plan.validityDays,
          configured: true,
        }
      : {
          id,
          name: id === "student" ? "Student" : "Student Plus",
          amount: null,
          currency: "INR" as const,
          validityDays: null,
          configured: false,
        };
  });
}

export function razorpayLiveReady() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID?.trim() &&
      process.env.RAZORPAY_KEY_SECRET?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

function razorpayAuthHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay Live API keys are not configured.");
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export function getRazorpayKeyId() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  if (!keyId) throw new Error("Razorpay Live Key ID is not configured.");
  return keyId;
}

export async function createRazorpayOrder(input: {
  amount: number;
  currency: "INR";
  receipt: string;
  userId: string;
  plan: PaidPlanId;
}) {
  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: razorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: {
        genz_user_id: input.userId,
        genz_plan: input.plan,
      },
    }),
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Razorpay order create failed (${response.status}): ${raw.slice(0, 240)}`);
  }

  return JSON.parse(raw) as RazorpayOrder;
}

export async function fetchRazorpayOrderPayments(orderId: string) {
  const response = await fetch(
    `${RAZORPAY_API}/orders/${encodeURIComponent(orderId)}/payments`,
    {
      headers: { Authorization: razorpayAuthHeader() },
      cache: "no-store",
    }
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Razorpay order payments fetch failed (${response.status}): ${raw.slice(0, 240)}`);
  }

  const data = JSON.parse(raw) as RazorpayPaymentCollection;
  return Array.isArray(data.items) ? data.items : [];
}

export async function fetchRazorpayPayment(paymentId: string) {
  const response = await fetch(
    `${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: { Authorization: razorpayAuthHeader() },
      cache: "no-store",
    }
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Razorpay payment fetch failed (${response.status}): ${raw.slice(0, 240)}`);
  }

  return JSON.parse(raw) as RazorpayPayment;
}

export function verifyCheckoutSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) throw new Error("Razorpay Live Key Secret is not configured.");

  const expected = createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  const actualBuffer = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("Razorpay webhook secret is not configured.");

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
