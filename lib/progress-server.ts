import type { NextRequest } from "next/server";
import { requireLearningUser } from "@/lib/learning-server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xnvrscevqdemnxyuvcpf.supabase.co";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return key;
}

function serviceHeaders() {
  const key = serviceRoleKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function serviceJson(path: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: serviceHeaders(),
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Progress database operation failed (${response.status}): ${raw.slice(0, 220)}`);
  }

  return raw ? JSON.parse(raw) : null;
}

type PracticeAttempt = {
  subject?: string;
  topic?: string;
  correct?: boolean;
  score?: number;
  feedback?: string | null;
  question?: string;
  created_at?: string;
};

type TopicProgressRow = {
  subject?: string;
  topic?: string;
  mastery_score?: number;
  attempts?: number;
  last_signal?: string;
  last_practiced_at?: string;
};

type DailyPlanRow = {
  plan_date?: string;
  items?: Array<{
    key?: string;
    subject?: string;
    topic?: string;
    minutes?: number;
    task?: string;
  }>;
  completed_keys?: string[];
};

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clean(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function startOfIndiaDayUtc(daysAgo: number) {
  const now = new Date();
  const indiaNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const y = indiaNow.getUTCFullYear();
  const m = indiaNow.getUTCMonth();
  const d = indiaNow.getUTCDate() - daysAgo;
  return new Date(Date.UTC(y, m, d, -5, -30, 0, 0));
}

function indiaDateString(date: Date) {
  const india = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  return `${india.getUTCFullYear()}-${String(india.getUTCMonth() + 1).padStart(2, "0")}-${String(india.getUTCDate()).padStart(2, "0")}`;
}

function summarizeAttempts(rows: PracticeAttempt[]) {
  const attempts = rows.length;
  const correct = rows.filter((row) => Boolean(row.correct)).length;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const averageScore = attempts
    ? Math.round(rows.reduce((sum, row) => sum + safeNumber(row.score), 0) / attempts)
    : 0;

  return { attempts, correct, accuracy, averageScore };
}

function subjectPerformance(rows: PracticeAttempt[]) {
  const map = new Map<string, { attempts: number; correct: number; scoreTotal: number }>();

  for (const row of rows) {
    const subject = clean(row.subject, "General");
    const current = map.get(subject) || { attempts: 0, correct: 0, scoreTotal: 0 };
    current.attempts += 1;
    current.correct += row.correct ? 1 : 0;
    current.scoreTotal += safeNumber(row.score);
    map.set(subject, current);
  }

  return Array.from(map.entries())
    .map(([subject, value]) => ({
      subject,
      attempts: value.attempts,
      correct: value.correct,
      accuracy: value.attempts ? Math.round((value.correct / value.attempts) * 100) : 0,
      averageScore: value.attempts ? Math.round(value.scoreTotal / value.attempts) : 0,
    }))
    .sort((a, b) => b.attempts - a.attempts || b.accuracy - a.accuracy);
}

function planProgress(rows: DailyPlanRow[]) {
  let totalTasks = 0;
  let completedTasks = 0;
  let completedMinutes = 0;
  const activeDates = new Set<string>();

  for (const row of rows) {
    const items = Array.isArray(row.items) ? row.items : [];
    const completed = new Set(Array.isArray(row.completed_keys) ? row.completed_keys : []);
    totalTasks += items.length;

    let dayCompleted = 0;
    for (const item of items) {
      const key = clean(item.key);
      if (key && completed.has(key)) {
        completedTasks += 1;
        dayCompleted += 1;
        completedMinutes += Math.max(0, safeNumber(item.minutes));
      }
    }

    if (dayCompleted > 0 && row.plan_date) activeDates.add(row.plan_date);
  }

  return {
    totalTasks,
    completedTasks,
    completedMinutes: Math.round(completedMinutes),
    planCompletionPercent: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    activePlanDays: activeDates.size,
  };
}

function buildParentSummary(input: {
  current: ReturnType<typeof summarizeAttempts>;
  previous: ReturnType<typeof summarizeAttempts>;
  plan: ReturnType<typeof planProgress>;
  weakTopics: Array<{ subject: string; topic: string; masteryScore: number }>;
  strongTopics: Array<{ subject: string; topic: string; masteryScore: number }>;
  periodLabel: string;
}) {
  const { current, previous, plan, weakTopics, strongTopics, periodLabel } = input;
  const accuracyDelta =
    current.attempts && previous.attempts ? current.accuracy - previous.accuracy : null;

  const headline =
    current.attempts === 0 && plan.completedTasks === 0
      ? "Is week measurable study activity abhi kam hai."
      : current.accuracy >= 80
        ? "Is week practice performance strong rahi."
        : current.accuracy >= 60
          ? "Is week steady progress dikhi, kuch topics par revision useful rahega."
          : "Is week fundamentals aur mistake revision par extra focus useful rahega.";

  const bullets: string[] = [];
  bullets.push(`${periodLabel}: ${current.attempts} practice attempts, ${current.accuracy}% accuracy, average score ${current.averageScore}/100.`);
  bullets.push(`Daily plan: ${plan.completedTasks}/${plan.totalTasks} tasks complete, approx. ${plan.completedMinutes} focused minutes.`);

  if (accuracyDelta !== null) {
    bullets.push(
      accuracyDelta > 0
        ? `Accuracy previous week se ${accuracyDelta} points improve hui.`
        : accuracyDelta < 0
          ? `Accuracy previous week se ${Math.abs(accuracyDelta)} points lower rahi; revision priority badhani chahiye.`
          : "Accuracy previous week ke barabar rahi."
    );
  }

  if (strongTopics[0]) {
    bullets.push(`Strong area: ${strongTopics[0].subject} — ${strongTopics[0].topic}.`);
  }

  if (weakTopics[0]) {
    bullets.push(`Priority area: ${weakTopics[0].subject} — ${weakTopics[0].topic}.`);
  }

  const focusNextWeek = weakTopics.slice(0, 3).map((item) => `${item.subject}: ${item.topic}`);

  return {
    headline,
    bullets,
    focusNextWeek,
    note: "Ye Gen-z AI activity summary hai, school report card ya formal assessment nahi.",
  };
}

export async function getProgressDashboard(req: NextRequest) {
  const user = await requireLearningUser(req);

  const currentStart = startOfIndiaDayUtc(6);
  const previousStart = startOfIndiaDayUtc(13);
  const currentStartIso = currentStart.toISOString();
  const previousStartIso = previousStart.toISOString();
  const currentStartDate = indiaDateString(currentStart);
  const todayDate = indiaDateString(new Date());

  const userId = encodeURIComponent(user.id);

  const [attemptRowsRaw, topicRowsRaw, planRowsRaw] = await Promise.all([
    serviceJson(
      `practice_attempts?user_id=eq.${userId}&created_at=gte.${encodeURIComponent(previousStartIso)}&select=subject,topic,correct,score,feedback,question,created_at&order=created_at.desc&limit=200`
    ),
    serviceJson(
      `topic_progress?user_id=eq.${userId}&select=subject,topic,mastery_score,attempts,last_signal,last_practiced_at&order=last_practiced_at.desc&limit=100`
    ),
    serviceJson(
      `daily_study_plans?user_id=eq.${userId}&plan_date=gte.${previousStartDate}&select=plan_date,items,completed_keys&order=plan_date.desc&limit=20`
    ),
  ]);

  const attemptRows: PracticeAttempt[] = Array.isArray(attemptRowsRaw) ? attemptRowsRaw : [];
  const topicRows: TopicProgressRow[] = Array.isArray(topicRowsRaw) ? topicRowsRaw : [];
  const planRows: DailyPlanRow[] = Array.isArray(planRowsRaw) ? planRowsRaw : [];

  const currentAttempts = attemptRows.filter((row) => {
    const time = row.created_at ? new Date(row.created_at).getTime() : 0;
    return time >= currentStart.getTime();
  });
  const previousAttempts = attemptRows.filter((row) => {
    const time = row.created_at ? new Date(row.created_at).getTime() : 0;
    return time >= previousStart.getTime() && time < currentStart.getTime();
  });

  const currentPlans = planRows.filter((row) => clean(row.plan_date) >= currentStartDate);

  const current = summarizeAttempts(currentAttempts);
  const previous = summarizeAttempts(previousAttempts);
  const plan = planProgress(currentPlans);

  const activePracticeDays = new Set(
    currentAttempts
      .map((row) => (row.created_at ? indiaDateString(new Date(row.created_at)) : ""))
      .filter(Boolean)
  );
  const activeDays = new Set<string>([
    ...Array.from(activePracticeDays),
    ...currentPlans
      .filter((row) => (Array.isArray(row.completed_keys) ? row.completed_keys.length : 0) > 0)
      .map((row) => clean(row.plan_date))
      .filter(Boolean),
  ]).size;

  const normalizedTopics = topicRows.map((row) => ({
    subject: clean(row.subject, "General"),
    topic: clean(row.topic, "Practice"),
    masteryScore: Math.max(0, Math.min(100, Math.round(safeNumber(row.mastery_score)))),
    attempts: Math.max(0, Math.round(safeNumber(row.attempts))),
    lastSignal: clean(row.last_signal, "practice"),
    lastPracticedAt: clean(row.last_practiced_at),
  }));

  const weakTopics = normalizedTopics
    .filter((item) => item.masteryScore < 65 || item.lastSignal === "needs_practice")
    .sort((a, b) => a.masteryScore - b.masteryScore || b.attempts - a.attempts)
    .slice(0, 6);

  const strongTopics = normalizedTopics
    .filter((item) => item.masteryScore >= 70)
    .sort((a, b) => b.masteryScore - a.masteryScore || b.attempts - a.attempts)
    .slice(0, 6);

  const recentMistakes = currentAttempts
    .filter((row) => !row.correct)
    .slice(0, 6)
    .map((row) => ({
      subject: clean(row.subject, "General"),
      topic: clean(row.topic, "Practice"),
      question: clean(row.question),
      feedback: clean(row.feedback),
      score: Math.max(0, Math.min(100, Math.round(safeNumber(row.score)))),
      createdAt: clean(row.created_at),
    }));

  const subjects = subjectPerformance(currentAttempts);
  const accuracyDelta =
    current.attempts && previous.attempts ? current.accuracy - previous.accuracy : null;

  const periodLabel = `${currentStartDate} to ${todayDate}`;
  const parentSummary = buildParentSummary({
    current,
    previous,
    plan,
    weakTopics,
    strongTopics,
    periodLabel,
  });

  return {
    period: {
      start: currentStartDate,
      end: todayDate,
      label: periodLabel,
    },
    overview: {
      ...current,
      activeDays,
      completedPlanTasks: plan.completedTasks,
      totalPlanTasks: plan.totalTasks,
      completedPlanMinutes: plan.completedMinutes,
      planCompletionPercent: plan.planCompletionPercent,
    },
    trend: {
      previousAttempts: previous.attempts,
      previousAccuracy: previous.accuracy,
      previousAverageScore: previous.averageScore,
      accuracyDelta,
    },
    subjects,
    weakTopics,
    strongTopics,
    recentMistakes,
    parentSummary,
  };
}
