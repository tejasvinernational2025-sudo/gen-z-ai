import type { NextRequest } from "next/server";

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
    throw new Error(`Progress database operation failed (${response.status}): ${raw.slice(0, 220)}`);
  }
  return raw ? JSON.parse(raw) : null;
}

export async function requireProgressUser(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("AUTH_REQUIRED");
  const user = await response.json();
  if (!user?.id) throw new Error("AUTH_REQUIRED");

  return {
    id: String(user.id),
    email: typeof user.email === "string" ? user.email : "",
  };
}

type AttemptRow = {
  subject?: string;
  topic?: string;
  correct?: boolean;
  score?: number;
  difficulty?: string;
  source_type?: string;
  question?: string;
  feedback?: string;
  created_at?: string;
};

type PlanRow = {
  plan_date?: string;
  items?: Array<{ key?: string; subject?: string; topic?: string; minutes?: number; task?: string }>;
  completed_keys?: string[];
};

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function metrics(rows: AttemptRow[]) {
  const attempts = rows.length;
  const correct = rows.filter((row) => Boolean(row.correct)).length;
  const totalScore = rows.reduce((sum, row) => sum + Number(row.score || 0), 0);

  return {
    attempts,
    correct,
    accuracy: attempts ? clampPercent((correct / attempts) * 100) : 0,
    averageScore: attempts ? clampPercent(totalScore / attempts) : 0,
  };
}

function withinDays(iso: string | undefined, days: number, now: number) {
  if (!iso) return false;
  const time = Date.parse(iso);
  return Number.isFinite(time) && time >= now - days * 24 * 60 * 60 * 1000;
}

function betweenDays(iso: string | undefined, fromDays: number, toDays: number, now: number) {
  if (!iso) return false;
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return false;
  const newer = now - fromDays * 24 * 60 * 60 * 1000;
  const older = now - toDays * 24 * 60 * 60 * 1000;
  return time < newer && time >= older;
}

function topicAnalytics(rows: AttemptRow[]) {
  const map = new Map<string, {
    subject: string;
    topic: string;
    attempts: number;
    correct: number;
    scoreTotal: number;
    mistakes: number;
  }>();

  for (const row of rows) {
    const subject = String(row.subject || "General").trim().slice(0, 80) || "General";
    const topic = String(row.topic || "Practice").trim().slice(0, 140) || "Practice";
    const key = `${subject}::${topic}`;
    const current = map.get(key) || {
      subject,
      topic,
      attempts: 0,
      correct: 0,
      scoreTotal: 0,
      mistakes: 0,
    };

    current.attempts += 1;
    current.correct += row.correct ? 1 : 0;
    current.mistakes += row.correct ? 0 : 1;
    current.scoreTotal += Number(row.score || 0);
    map.set(key, current);
  }

  return Array.from(map.values()).map((item) => ({
    subject: item.subject,
    topic: item.topic,
    attempts: item.attempts,
    mistakes: item.mistakes,
    accuracy: clampPercent((item.correct / item.attempts) * 100),
    averageScore: clampPercent(item.scoreTotal / item.attempts),
  }));
}

function planMetrics(plans: PlanRow[]) {
  let totalTasks = 0;
  let completedTasks = 0;
  let plannedMinutes = 0;
  let completedPlanMinutes = 0;
  let activePlanDays = 0;

  for (const plan of plans) {
    const items = Array.isArray(plan.items) ? plan.items : [];
    const completed = new Set(Array.isArray(plan.completed_keys) ? plan.completed_keys : []);
    if (items.some((item) => completed.has(String(item.key || "")))) activePlanDays += 1;

    totalTasks += items.length;
    for (const item of items) {
      const minutes = Math.max(0, Number(item.minutes || 0));
      plannedMinutes += minutes;
      if (completed.has(String(item.key || ""))) {
        completedTasks += 1;
        completedPlanMinutes += minutes;
      }
    }
  }

  return {
    daysWithPlans: plans.length,
    activePlanDays,
    totalTasks,
    completedTasks,
    completionRate: totalTasks ? clampPercent((completedTasks / totalTasks) * 100) : 0,
    plannedMinutes: Math.round(plannedMinutes),
    completedPlanMinutes: Math.round(completedPlanMinutes),
  };
}

function dateDaysAgo(days: number) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function buildParentSummary(input: {
  week: ReturnType<typeof metrics>;
  plan: ReturnType<typeof planMetrics>;
  weakTopics: Array<{ subject: string; topic: string; accuracy: number; mistakes: number }>;
  strongTopics: Array<{ subject: string; topic: string; accuracy: number }>;
  trendDelta: number | null;
  dailyTarget: number | null;
}) {
  const lines: string[] = ["Gen-z AI Weekly Parent Progress"];

  if (input.week.attempts > 0) {
    lines.push(
      `Practice/quiz: ${input.week.attempts} attempts, ${input.week.accuracy}% accuracy, average score ${input.week.averageScore}/100.`
    );
  } else {
    lines.push("Is week abhi graded practice/quiz attempts record nahi hue.");
  }

  if (input.plan.totalTasks > 0) {
    lines.push(
      `Study plan: ${input.plan.completedTasks}/${input.plan.totalTasks} tasks complete (${input.plan.completionRate}%), ${input.plan.completedPlanMinutes} planned minutes marked complete.`
    );
  } else if (input.dailyTarget) {
    lines.push(`Daily study target: ${input.dailyTarget} minutes. Is week plan completion data abhi available nahi hai.`);
  }

  if (input.trendDelta !== null) {
    if (input.trendDelta >= 5) lines.push(`Accuracy trend: pichhle week se +${input.trendDelta} points improvement.`);
    else if (input.trendDelta <= -5) lines.push(`Accuracy trend: pichhle week se ${Math.abs(input.trendDelta)} points lower; revision useful rahegi.`);
    else lines.push("Accuracy trend: pichhle week ke aas-paas stable.");
  }

  if (input.strongTopics.length) {
    lines.push(
      `Strong area: ${input.strongTopics.slice(0, 2).map((item) => `${item.subject} – ${item.topic}`).join(", ")}.`
    );
  }

  if (input.weakTopics.length) {
    lines.push(
      `Focus next: ${input.weakTopics.slice(0, 2).map((item) => `${item.subject} – ${item.topic}`).join(", ")}.`
    );
  } else {
    lines.push("Focus next: aur practice data aane par weak-topic recommendation automatically update hogi.");
  }

  return lines.join("\n");
}

export async function getProgressDashboard(userId: string) {
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sincePlanDate = dateDaysAgo(30);
  const safeUser = encodeURIComponent(userId);

  const [attemptRows, planRows, topicRows, profileRows] = await Promise.all([
    serviceJson(
      `practice_attempts?user_id=eq.${safeUser}&created_at=gte.${encodeURIComponent(since30)}&select=subject,topic,correct,score,difficulty,source_type,question,feedback,created_at&order=created_at.desc&limit=300`
    ),
    serviceJson(
      `daily_study_plans?user_id=eq.${safeUser}&plan_date=gte.${sincePlanDate}&select=plan_date,items,completed_keys&order=plan_date.desc&limit=40`
    ),
    serviceJson(
      `topic_progress?user_id=eq.${safeUser}&select=subject,topic,mastery_score,attempts,last_signal,last_practiced_at&order=mastery_score.asc,last_practiced_at.desc&limit=30`
    ),
    serviceJson(
      `student_learning_profiles?user_id=eq.${safeUser}&select=goal,daily_minutes,board,school_class,medium,preferred_subjects&limit=1`
    ),
  ]);

  const attempts: AttemptRow[] = Array.isArray(attemptRows) ? attemptRows : [];
  const plans: PlanRow[] = Array.isArray(planRows) ? planRows : [];
  const topics = Array.isArray(topicRows) ? topicRows : [];
  const profile = Array.isArray(profileRows) && profileRows[0] ? profileRows[0] : null;

  const weekRows = attempts.filter((row) => withinDays(row.created_at, 7, now));
  const previousWeekRows = attempts.filter((row) => betweenDays(row.created_at, 7, 14, now));
  const monthRows = attempts.filter((row) => withinDays(row.created_at, 30, now));

  const week = metrics(weekRows);
  const previousWeek = metrics(previousWeekRows);
  const month = metrics(monthRows);
  const allTopicAnalytics = topicAnalytics(monthRows);

  const weakTopics = allTopicAnalytics
    .filter((item) => item.attempts >= 1 && item.mistakes > 0)
    .sort((a, b) => b.mistakes - a.mistakes || a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 6);

  const strongTopics = allTopicAnalytics
    .filter((item) => item.attempts >= 2 && item.accuracy >= 70)
    .sort((a, b) => b.accuracy - a.accuracy || b.averageScore - a.averageScore || b.attempts - a.attempts)
    .slice(0, 6);

  const last7Date = dateDaysAgo(6);
  const weekPlans = plans.filter((plan) => String(plan.plan_date || "") >= last7Date);
  const plan = planMetrics(weekPlans);

  const difficulty = ["easy", "medium", "hard"].map((level) => {
    const rows = monthRows.filter((row) => row.difficulty === level);
    return { level, ...metrics(rows) };
  });

  const recentMistakes = monthRows
    .filter((row) => !row.correct)
    .slice(0, 5)
    .map((row) => ({
      subject: String(row.subject || "General"),
      topic: String(row.topic || "Practice"),
      question: String(row.question || "").slice(0, 500),
      feedback: String(row.feedback || "").slice(0, 500),
      score: Number(row.score || 0),
      created_at: String(row.created_at || ""),
    }));

  const recentMastery = topics.slice(0, 8).map((row: any) => ({
    subject: String(row.subject || "General"),
    topic: String(row.topic || "Practice"),
    masteryScore: Number(row.mastery_score || 0),
    attempts: Number(row.attempts || 0),
    lastSignal: String(row.last_signal || "practice"),
    lastPracticedAt: String(row.last_practiced_at || ""),
  }));

  const trendDelta =
    week.attempts > 0 && previousWeek.attempts > 0
      ? week.accuracy - previousWeek.accuracy
      : null;

  const activeDates = new Set<string>();
  for (const row of weekRows) {
    if (row.created_at) activeDates.add(row.created_at.slice(0, 10));
  }
  for (const row of weekPlans) {
    const completed = Array.isArray(row.completed_keys) ? row.completed_keys : [];
    if (completed.length && row.plan_date) activeDates.add(row.plan_date);
  }

  const parentSummary = buildParentSummary({
    week,
    plan,
    weakTopics,
    strongTopics,
    trendDelta,
    dailyTarget: profile?.daily_minutes ? Number(profile.daily_minutes) : null,
  });

  return {
    profile,
    week,
    previousWeek,
    month,
    trendDelta,
    activeDays7: activeDates.size,
    plan,
    difficulty,
    weakTopics,
    strongTopics,
    recentMistakes,
    mastery: recentMastery,
    parentSummary,
    generatedAt: new Date().toISOString(),
  };
}
