import { createHmac } from "node:crypto";
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

export type DailyQuotaStatus = {
  plan: string;
  resets_at: string;
  chat: { used: number; limit: number; remaining: number };
  photo: { used: number; limit: number; remaining: number };
  pdf: { used: number; limit: number; remaining: number };
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

  if (!authorization?.startsWith("Bearer ")) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error("Guest quota configuration unavailable");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const agent = req.headers.get("user-agent") || "unknown";
    const visitorHash = createHmac("sha256", serviceKey).update(ip + "|" + agent).digest("hex");
    const guestResponse = await fetch(SUPABASE_URL + "/rest/v1/rpc/consume_genz_guest_quota", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: "Bearer " + serviceKey },
      body: JSON.stringify({p_visitor_hash: visitorHash,p_feature:feature}),
      cache: "no-store",
    });
    if (!guestResponse.ok) throw new Error("Guest quota check failed (" + guestResponse.status + ")");
    const data = await guestResponse.json() as {allowed:boolean;used:number;limit:number};
    if (typeof data.allowed !== "boolean" || !Number.isFinite(data.used)) throw new Error("Guest quota response invalid");
    const ist = new Date(Date.now()+330*60*1000);
    ist.setUTCHours(24,0,0,0);
    return {allowed:data.allowed,plan:"free",feature,used:data.used,limit:data.limit,remaining:Math.max(0,data.limit-data.used),resets_at:new Date(ist.getTime()-330*60*1000).toISOString()};
  }

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


export async function getPersistentQuotaStatus(
  req: NextRequest
): Promise<DailyQuotaStatus | null> {
  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) return null;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/get_daily_quota_status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: authorization,
      },
      body: "{}",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Usage status check failed (${response.status}): ${detail.slice(0, 180)}`
    );
  }

  const data = (await response.json()) as DailyQuotaStatus;

  if (
    !data ||
    typeof data.plan !== "string" ||
    typeof data.chat?.limit !== "number" ||
    typeof data.photo?.limit !== "number" ||
    typeof data.pdf?.limit !== "number"
  ) {
    throw new Error("Usage status response invalid hai.");
  }

  return data;
}
