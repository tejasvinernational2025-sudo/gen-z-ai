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

export type LearningProfile = {
  user_id: string;
  board: string | null;
  school_class: string | null;
  medium: string | null;
  goal: string;
  daily_minutes: number;
  preferred_subjects: string[];
  updated_at: string;
};

export type TopicProgress = {
  subject: string;
  topic: string;
  mastery_score: number;
  attempts: number;
  last_signal: "strong" | "needs_practice" | "practice";
  last_mode: string | null;
  last_practiced_at: string;
};

export type DailyPlanItem = {
  key: string;
  subject: string;
  topic: string;
  minutes: number;
  task: string;
};

export type DailyStudyPlan = {
  plan_date: string;
  items: DailyPlanItem[];
  completed_keys: string[];
  updated_at: string;
};

export type LearningSnapshot = {
  profile: LearningProfile | null;
  weakTopics: TopicProgress[];
  plan: DailyStudyPlan | null;
};

function bearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  return authorization.slice(7).trim() || null;
}

export async function requireLearningUser(req: NextRequest) {
  const token = bearerToken(req);
  if (!token) throw new Error("AUTH_REQUIRED");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
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
    throw new Error(`Learning database operation failed (${response.status}): ${raw.slice(0, 220)}`);
  }

  return raw ? JSON.parse(raw) : null;
}

export function indiaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export async function getLearningSnapshot(userId: string): Promise<LearningSnapshot> {
  const date = indiaDate();
  const safeUserId = encodeURIComponent(userId);

  const [profileRows, topicRows, planRows] = await Promise.all([
    serviceJson(
      `student_learning_profiles?user_id=eq.${safeUserId}&select=user_id,board,school_class,medium,goal,daily_minutes,preferred_subjects,updated_at&limit=1`
    ),
    serviceJson(
      `topic_progress?user_id=eq.${safeUserId}&select=subject,topic,mastery_score,attempts,last_signal,last_mode,last_practiced_at&order=mastery_score.asc,last_practiced_at.desc&limit=6`
    ),
    serviceJson(
      `daily_study_plans?user_id=eq.${safeUserId}&plan_date=eq.${date}&select=plan_date,items,completed_keys,updated_at&limit=1`
    ),
  ]);

  return {
    profile: Array.isArray(profileRows) && profileRows[0] ? profileRows[0] as LearningProfile : null,
    weakTopics: Array.isArray(topicRows) ? topicRows as TopicProgress[] : [],
    plan: Array.isArray(planRows) && planRows[0] ? planRows[0] as DailyStudyPlan : null,
  };
}

export async function saveLearningProfile(
  userId: string,
  input: {
    board: string | null;
    schoolClass: string | null;
    medium: string | null;
    goal: string;
    dailyMinutes: number;
    preferredSubjects: string[];
  }
) {
  const payload = {
    user_id: userId,
    board: input.board,
    school_class: input.schoolClass,
    medium: input.medium,
    goal: input.goal,
    daily_minutes: input.dailyMinutes,
    preferred_subjects: input.preferredSubjects,
    updated_at: new Date().toISOString(),
  };

  const rows = await serviceJson(
    "student_learning_profiles?on_conflict=user_id",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function saveDailyPlan(userId: string, items: DailyPlanItem[]) {
  const payload = {
    user_id: userId,
    plan_date: indiaDate(),
    items,
    completed_keys: [],
    updated_at: new Date().toISOString(),
  };

  const rows = await serviceJson(
    "daily_study_plans?on_conflict=user_id,plan_date",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    }
  );

  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function updateDailyPlanCompleted(
  userId: string,
  planDate: string,
  completedKeys: string[]
) {
  const safeUserId = encodeURIComponent(userId);
  const safeDate = encodeURIComponent(planDate);

  const rows = await serviceJson(
    `daily_study_plans?user_id=eq.${safeUserId}&plan_date=eq.${safeDate}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        completed_keys: completedKeys,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function recordLearningSignal(
  userId: string,
  input: {
    subject: string;
    topic: string;
    signal: "strong" | "needs_practice" | "practice";
    mode?: string;
  }
) {
  return serviceJson("rpc/record_learning_signal_for_user", {
    method: "POST",
    body: JSON.stringify({
      p_user_id: userId,
      p_subject: input.subject,
      p_topic: input.topic,
      p_signal: input.signal,
      p_mode: input.mode || null,
    }),
  });
}

export async function getLearningPromptContext(req: NextRequest) {
  try {
    const user = await requireLearningUser(req);
    const snapshot = await getLearningSnapshot(user.id);

    const profile = snapshot.profile;
    const profileLine = profile
      ? [
          profile.board,
          profile.school_class,
          profile.medium,
          profile.goal ? `Goal: ${profile.goal}` : null,
          profile.daily_minutes ? `Daily study target: ${profile.daily_minutes} min` : null,
        ].filter(Boolean).join(" | ")
      : "";

    const weak = snapshot.weakTopics
      .filter((topic) => topic.mastery_score < 65 || topic.last_signal === "needs_practice")
      .slice(0, 4)
      .map((topic) => `${topic.subject}: ${topic.topic} (${topic.mastery_score}/100)`)
      .join("; ");

    if (!profileLine && !weak) return "";

    return [
      profileLine ? `Saved student learning profile: ${profileLine}` : "",
      weak ? `Topics needing extra support: ${weak}` : "",
      "Use this memory only to personalize teaching depth, examples and revision. Do not shame the student or overstate mastery.",
    ].filter(Boolean).join("\n");
  } catch {
    return "";
  }
}
