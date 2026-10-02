import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xnvrscevqdemnxyuvcpf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_94rVXwzqw-HIFsO_kRKG1g_rDaxw6zm";

const ALLOWED_CATEGORIES = new Set([
  "account",
  "payment",
  "refund",
  "technical",
  "feedback",
  "other",
]);

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return key;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function optionalUserId(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: authorization,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;
    const user = await response.json();
    return user?.id ? String(user.id) : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const rate = enforceRateLimit(req, "support", 5, 60 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Support requests ki temporary limit reach ho gai hai. Thodi der baad try karo." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const email = cleanText(body?.email, 180).toLowerCase();
    const name = cleanText(body?.name, 120);
    const category = cleanText(body?.category, 30);
    const message = cleanText(body?.message, 3000);

    if (!validEmail(email)) {
      return NextResponse.json({ error: "Valid email address required hai." }, { status: 400 });
    }

    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Valid support category select karo." }, { status: 400 });
    }

    if (message.length < 15) {
      return NextResponse.json(
        { error: "Problem ko thoda detail me likho taaki hum help kar saken." },
        { status: 400 }
      );
    }

    const key = serviceRoleKey();
    const userId = await optionalUserId(req);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/support_requests`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        email,
        name: name || null,
        category,
        message,
        user_id: userId,
        status: "open",
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`Support request save failed (${response.status}): ${raw.slice(0, 220)}`);
    }

    const rows = raw ? JSON.parse(raw) : [];
    const id = Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : null;

    return NextResponse.json({
      ok: true,
      requestId: id,
      message: "Support request receive ho gayi hai.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Support request submit nahi hui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
