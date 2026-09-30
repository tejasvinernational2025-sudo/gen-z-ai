import { getAccessToken } from "@/lib/chat-history";

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
  today: string;
};

async function requestLearning(init?: RequestInit) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Sign in required.");

  const response = await fetch("/api/learning", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Learning dashboard response read nahi hua.");
  }

  if (!response.ok) throw new Error(data?.error || "Learning action failed.");
  return data;
}

export async function getLearningSnapshot(): Promise<LearningSnapshot> {
  return requestLearning({ method: "GET" }) as Promise<LearningSnapshot>;
}

export async function saveLearningProfile(input: {
  board: string | null;
  schoolClass: string | null;
  medium: string | null;
  goal: string;
  dailyMinutes: number;
  preferredSubjects: string[];
}) {
  return requestLearning({
    method: "POST",
    body: JSON.stringify({ action: "save_profile", ...input }),
  });
}

export async function generateDailyStudyPlan() {
  return requestLearning({
    method: "POST",
    body: JSON.stringify({ action: "generate_plan" }),
  });
}

export async function toggleDailyPlanItem(key: string) {
  return requestLearning({
    method: "POST",
    body: JSON.stringify({ action: "complete_item", key }),
  });
}

export async function trackLearningTurn(input: {
  userText: string;
  assistantText: string;
  mode: string;
  studentContext: string;
}) {
  return requestLearning({
    method: "POST",
    body: JSON.stringify({ action: "track_turn", ...input }),
  });
}
