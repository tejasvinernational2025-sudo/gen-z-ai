import type { NextRequest } from "next/server";

export type QuotaFeature = "chat" | "photo" | "pdf";

export type QuotaResult = {
  allowed: boolean;
  plan: string;
  feature: QuotaFeature;
  used: number;
  limit: number;
  remaining: number;
  resets_at: string;
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xnvrscevqdemnxyuvcpf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_94rVXwzqw-HIFsO_kRKG1g_rDaxw6zm";

export async function consumePersistentQuota(
  req: NextRequest,
  feature: QuotaFeature
): Promise<QuotaResult | null> {
  const authorization = req.headers.get("authorization");

  // Guest traffic stays on the existing IP limiter.
  if (!authorization?.startsWith("Bearer ")) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/consume_daily_quota`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: authorization,
      },
      body: JSON.stringify({ p_feature: feature }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Usage limit check failed (${response.status}): ${detail.slice(0, 180)}`
    );
  }

  const data = await response.json();
  const result = (Array.isArray(data) ? data[0] : data) as QuotaResult;

  if (
    !result ||
    typeof result.allowed !== "boolean" ||
    typeof result.limit !== "number"
  ) {
    throw new Error("Usage limit response invalid hai.");
  }

  return result;
}

export function quotaHeaders(quota: QuotaResult | null): Record<string, string> {
  if (!quota) return {};

  return {
    "X-Plan": quota.plan,
    "X-Quota-Limit": String(quota.limit),
    "X-Quota-Remaining": String(quota.remaining),
    "X-Quota-Reset": quota.resets_at,
  };
}

export function quotaExceededMessage(quota: QuotaResult) {
  const label =
    quota.feature === "chat"
      ? "text chat"
      : quota.feature === "photo"
        ? "Photo Solve"
        : "PDF Study";

  return `Aaj ki ${quota.plan} plan ${label} limit complete ho gai hai. Daily limit ${quota.limit} hai; next reset ke baad dobara use kar sakte ho.`;
}
