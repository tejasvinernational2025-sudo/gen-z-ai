import crypto from "node:crypto";

export type PaidPlan = "student" | "student_plus";

type PlanConfig = {
  id: PaidPlan;
  name: string;
  amountPaise: number;
  validDays: number;
};

function positiveInt(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function getPaidPlanConfig(plan: string): PlanConfig | null {
  if (plan === "student") {
    return {
      id: "student",
      name: "Student",
      amountPaise: positiveInt(process.env.GENZ_STUDENT_PRICE_PAISE),
      validDays: positiveInt(process.env.GENZ_STUDENT_VALID_DAYS),
    };
  }

  if (plan === "student_plus") {
    return {
      id: "student_plus",
      name: "Student Plus",
      amountPaise: positiveInt(process.env.GENZ_STUDENT_PLUS_PRICE_PAISE),
      validDays: positiveInt(process.env.GENZ_STUDENT_PLUS_VALID_DAYS),
    };
  }

  return null;
}

export function getPublicPlanConfig() {
  return (["student", "student_plus"] as const).map((id) => {
    const plan = getPaidPlanConfig(id)!;
    return {
      id: plan.id,
      name: plan.name,
      amountPaise: plan.amountPaise,
      validDays: plan.validDays,
      enabled: plan.amountPaise > 0 && plan.validDays > 0,
    };
  });
}

export function requireLiveRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

  if (!keyId.startsWith("rzp_live_") || !keySecret) {
    throw new Error("Razorpay live keys are not configured.");
  }

  return { keyId, keySecret };
}

export function razorpayAuthHeader() {
  const { keyId, keySecret } = requireLiveRazorpay();
  return "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64");
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
) {
  const { keySecret } = requireLiveRazorpay();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(orderId + "|" + paymentId)
    .digest("hex");

  const received = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return received.length === expectedBuffer.length &&
    crypto.timingSafeEqual(received, expectedBuffer);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "";
  if (!secret) throw new Error("Razorpay webhook secret is not configured.");

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return received.length === expectedBuffer.length &&
    crypto.timingSafeEqual(received, expectedBuffer);
}
