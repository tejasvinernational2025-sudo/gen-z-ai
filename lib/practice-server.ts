import type { NextRequest } from "next/server";
import { recordLearningSignal } from "@/lib/learning-server";

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

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function getBearerUser(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;

  const token = authorization.slice(7).trim();
  if (!token) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? { id: String(user.id) } : null;
}

async function serviceJson(path: string, init?: RequestInit) {
  const key = serviceRoleKey();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Practice database operation failed (${response.status}): ${raw.slice(0, 220)}`);
  }

  return raw ? JSON.parse(raw) : null;
}

export type PracticeDifficulty = "easy" | "medium" | "hard";

export async function getAdaptiveDifficulty(req: NextRequest): Promise<PracticeDifficulty> {
  try {
    const user = await getBearerUser(req);
    if (!user) return "medium";

    const rows = await serviceJson(
      `practice_attempts?user_id=eq.${encodeURIComponent(user.id)}&select=correct,score&order=created_at.desc&limit=8`
    );

    if (!Array.isArray(rows) || rows.length < 2) return "medium";

    const accuracy =
      rows.reduce((sum, item) => sum + (item?.correct ? 1 : 0), 0) / rows.length;
    const avgScore =
      rows.reduce((sum, item) => sum + Number(item?.score || 0), 0) / rows.length;

    if (accuracy >= 0.8 && avgScore >= 75) return "hard";
    if (accuracy <= 0.45 || avgScore < 50) return "easy";
    return "medium";
  } catch {
    return "medium";
  }
}

export async function savePracticeAttempt(
  req: NextRequest,
  input: {
    subject: string;
    topic: string;
    sourceType: "photo" | "quiz" | "practice";
    question: string;
    studentAnswer: string;
    expectedAnswer: string;
    correct: boolean;
    score: number;
    difficulty: PracticeDifficulty;
    feedback: string;
  }
) {
  const user = await getBearerUser(req);
  if (!user) return null;

  const payload = {
    user_id: user.id,
    subject: cleanText(input.subject, 80) || "General",
    topic: cleanText(input.topic, 140) || "General practice",
    source_type: input.sourceType,
    question: cleanText(input.question, 2400),
    student_answer: cleanText(input.studentAnswer, 2400),
    expected_answer: cleanText(input.expectedAnswer, 2400),
    correct: Boolean(input.correct),
    score: Math.max(0, Math.min(100, Math.round(input.score))),
    difficulty: input.difficulty,
    feedback: cleanText(input.feedback, 2400),
  };

  const rows = await serviceJson("practice_attempts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  await recordLearningSignal(user.id, {
    subject: payload.subject,
    topic: payload.topic,
    signal: payload.correct ? "strong" : "needs_practice",
    mode: "adaptive_practice",
  });

  return Array.isArray(rows) ? rows[0] ?? null : null;
}


export type PracticePerformance = {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  averageScore: number;
  recentMistakes: Array<{
    subject: string;
    topic: string;
    question: string;
    feedback: string;
    score: number;
    created_at: string;
  }>;
  weakTopics: Array<{
    subject: string;
    topic: string;
    attempts: number;
    mistakes: number;
    accuracy: number;
  }>;
};

export async function getPracticePerformance(req: NextRequest): Promise<PracticePerformance | null> {
  const user = await getBearerUser(req);
  if (!user) return null;

  const rows = await serviceJson(
    `practice_attempts?user_id=eq.${encodeURIComponent(user.id)}&select=subject,topic,question,feedback,correct,score,created_at&order=created_at.desc&limit=40`
  );

  if (!Array.isArray(rows)) return null;

  const totalAttempts = rows.length;
  const correctAttempts = rows.filter((item) => Boolean(item?.correct)).length;
  const averageScore = totalAttempts
    ? Math.round(rows.reduce((sum, item) => sum + Number(item?.score || 0), 0) / totalAttempts)
    : 0;
  const accuracy = totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  const topicMap = new Map<string, { subject: string; topic: string; attempts: number; mistakes: number }>();
  for (const item of rows) {
    const subject = cleanText(item?.subject, 80) || "General";
    const topic = cleanText(item?.topic, 140) || "Practice";
    const key = `${subject}::${topic}`;
    const current = topicMap.get(key) || { subject, topic, attempts: 0, mistakes: 0 };
    current.attempts += 1;
    if (!item?.correct) current.mistakes += 1;
    topicMap.set(key, current);
  }

  const weakTopics = Array.from(topicMap.values())
    .map((item) => ({
      ...item,
      accuracy: Math.round(((item.attempts - item.mistakes) / item.attempts) * 100),
    }))
    .filter((item) => item.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes || a.accuracy - b.accuracy)
    .slice(0, 5);

  const recentMistakes = rows
    .filter((item) => !item?.correct)
    .slice(0, 6)
    .map((item) => ({
      subject: cleanText(item?.subject, 80) || "General",
      topic: cleanText(item?.topic, 140) || "Practice",
      question: cleanText(item?.question, 600),
      feedback: cleanText(item?.feedback, 600),
      score: Number(item?.score || 0),
      created_at: String(item?.created_at || ""),
    }));

  return {
    totalAttempts,
    correctAttempts,
    accuracy,
    averageScore,
    recentMistakes,
    weakTopics,
  };
}
