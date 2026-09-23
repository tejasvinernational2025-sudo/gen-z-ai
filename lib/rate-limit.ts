import type { NextRequest } from "next/server";

type Bucket = {
  count: number;
  resetAt: number;
};

declare global {
  // Best-effort per-instance limiter. A persistent quota layer can replace this at launch.
  // eslint-disable-next-line no-var
  var __genzRateLimitStore: Map<string, Bucket> | undefined;
}

const store =
  globalThis.__genzRateLimitStore ??
  (globalThis.__genzRateLimitStore = new Map<string, Bucket>());

function clientKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  const firstForwarded = forwarded?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();

  return firstForwarded || realIp || "unknown";
}

export function enforceRateLimit(
  req: NextRequest,
  scope: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();

  if (store.size > 5000) {
    for (const [key, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(key);
    }
  }

  const key = `${scope}:${clientKey(req)}`;
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  store.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}
