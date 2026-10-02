import type { NextRequest } from "next/server";
import { indiaDate, recordLearningSignal, requireLearningUser } from "@/lib/learning-server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xnvrscevqdemnxyuvcpf.supabase.co";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return key;
}

function serviceHeaders(extra?: Record<string, string>) {
  const key = serviceRoleKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function serviceJson(path: string, init?: RequestInit) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...serviceHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Revision database operation failed (${response.status}): ${raw.slice(0, 220)}`);
  }

  return raw ? JSON.parse(raw) : null;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function addIndiaDays(dateText: string, days: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export type RevisionItem = {
  id: string;
  subject: string;
  topic: string;
  due_date: string;
  interval_days: number;
  repetitions: number;
  last_result: "hard" | "okay" | "easy" | null;
  last_score: number | null;
  last_reviewed_at: string | null;
};

async function syncWeakTopics(userId: string) {
  const safeUser = encodeURIComponent(userId);
  const rows = await serviceJson(
    `topic_progress?user_id=eq.${safeUser}&select=subject,topic,mastery_score,last_signal&or=(mastery_score.lt.65,last_signal.eq.needs_practice)&limit=40`
  );

  if (!Array.isArray(rows) || !rows.length) return;

  const today = indiaDate();
  for (const row of rows.slice(0, 20)) {
    const subject = cleanText(row?.subject, 80);
    const topic = cleanText(row?.topic, 140);
    if (!subject || !topic) continue;

    await serviceJson("revision_schedule?on_conflict=user_id,subject,topic", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        subject,
        topic,
        due_date: today,
        interval_days: 1,
        repetitions: 0,
        is_active: true,
        updated_at: new Date().toISOString(),
      }),
    });
  }
}

export async function getRevisionDashboard(req: NextRequest) {
  const user = await requireLearningUser(req);
  await syncWeakTopics(user.id);

  const today = indiaDate();
  const safeUser = encodeURIComponent(user.id);

  const [dueRows, upcomingRows, allRows] = await Promise.all([
    serviceJson(
      `revision_schedule?user_id=eq.${safeUser}&is_active=eq.true&due_date=lte.${today}&select=id,subject,topic,due_date,interval_days,repetitions,last_result,last_score,last_reviewed_at&order=due_date.asc,updated_at.asc&limit=12`
    ),
    serviceJson(
      `revision_schedule?user_id=eq.${safeUser}&is_active=eq.true&due_date=gt.${today}&select=id,subject,topic,due_date,interval_days,repetitions,last_result,last_score,last_reviewed_at&order=due_date.asc&limit=8`
    ),
    serviceJson(
      `revision_schedule?user_id=eq.${safeUser}&is_active=eq.true&select=id,due_date,last_result,last_score,last_reviewed_at&limit=100`
    ),
  ]);

  const due: RevisionItem[] = Array.isArray(dueRows) ? dueRows : [];
  const upcoming: RevisionItem[] = Array.isArray(upcomingRows) ? upcomingRows : [];
  const all: RevisionItem[] = Array.isArray(allRows) ? allRows : [];

  const reviewed = all.filter((item) => Boolean(item.last_reviewed_at));
  const easyCount = reviewed.filter((item) => item.last_result === "easy").length;
  const averageScore = reviewed.length
    ? Math.round(
        reviewed.reduce((sum, item) => sum + Number(item.last_score || 0), 0) / reviewed.length
      )
    : 0;

  return {
    today,
    due,
    upcoming,
    stats: {
      dueToday: due.length,
      scheduled: all.length,
      reviewed: reviewed.length,
      easyCount,
      averageScore,
    },
  };
}

export async function completeRevision(
  req: NextRequest,
  input: { revisionId: string; score: number }
) {
  const user = await requireLearningUser(req);
  const revisionId = cleanText(input.revisionId, 80);
  if (!revisionId) throw new Error("Revision item required.");

  const score = Math.max(0, Math.min(100, Math.round(Number(input.score) || 0)));
  const safeUser = encodeURIComponent(user.id);
  const safeId = encodeURIComponent(revisionId);

  const rows = await serviceJson(
    `revision_schedule?id=eq.${safeId}&user_id=eq.${safeUser}&is_active=eq.true&select=id,subject,topic,due_date,interval_days,repetitions,last_result,last_score,last_reviewed_at&limit=1`
  );

  const item: RevisionItem | null = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (!item) throw new Error("Revision item nahi mila.");

  const result: "hard" | "okay" | "easy" =
    score >= 85 ? "easy" : score >= 60 ? "okay" : "hard";

  const currentInterval = Math.max(1, Number(item.interval_days || 1));
  const repetitions = Math.max(0, Number(item.repetitions || 0)) + 1;

  const nextInterval =
    result === "hard"
      ? 1
      : result === "okay"
        ? Math.min(30, repetitions <= 1 ? 3 : Math.max(3, currentInterval * 2))
        : Math.min(60, repetitions <= 1 ? 7 : Math.max(7, currentInterval * 2));

  const nextDue = addIndiaDays(indiaDate(), nextInterval);
  const signal =
    result === "easy" ? "strong" : result === "hard" ? "needs_practice" : "practice";

  await recordLearningSignal(user.id, {
    subject: item.subject,
    topic: item.topic,
    signal,
    mode: "smart_revision",
  });

  const updated = await serviceJson(
    `revision_schedule?id=eq.${safeId}&user_id=eq.${safeUser}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        due_date: nextDue,
        interval_days: nextInterval,
        repetitions,
        last_result: result,
        last_score: score,
        last_reviewed_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  return {
    result,
    score,
    nextInterval,
    nextDue,
    revision: Array.isArray(updated) ? updated[0] ?? null : null,
  };
}

export async function snoozeRevision(req: NextRequest, revisionIdValue: unknown) {
  const user = await requireLearningUser(req);
  const revisionId = cleanText(revisionIdValue, 80);
  if (!revisionId) throw new Error("Revision item required.");

  const nextDue = addIndiaDays(indiaDate(), 1);
  const rows = await serviceJson(
    `revision_schedule?id=eq.${encodeURIComponent(revisionId)}&user_id=eq.${encodeURIComponent(user.id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        due_date: nextDue,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!Array.isArray(rows) || !rows[0]) throw new Error("Revision item nahi mila.");
  return { nextDue, revision: rows[0] };
}
