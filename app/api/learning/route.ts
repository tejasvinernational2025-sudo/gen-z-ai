import { NextRequest, NextResponse } from "next/server";
import {
  getLearningSnapshot,
  indiaDate,
  localizeLearningSnapshotForDisplay,
  recordLearningSignal,
  requireLearningUser,
  saveDailyPlan,
  saveLearningProfile,
  updateDailyPlanCompleted,
  updatePreferredLanguage,
  type DailyPlanItem,
} from "@/lib/learning-server";

export const runtime = "nodejs";

type LearningAction =
  | "save_profile"
  | "save_language"
  | "generate_plan"
  | "complete_item"
  | "track_turn";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function clampDailyMinutes(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 30;
  return Math.max(10, Math.min(180, Math.round(number)));
}

function uniqueSubjects(value: unknown) {
  if (!Array.isArray(value)) return ["Mathematics", "Science", "English"];
  const items = value
    .map((item) => cleanText(item, 50))
    .filter(Boolean)
    .slice(0, 8);
  return items.length ? Array.from(new Set(items)) : ["Mathematics", "Science", "English"];
}

function buildPlanItems(
  snapshot: Awaited<ReturnType<typeof getLearningSnapshot>>,
  language: string
): DailyPlanItem[] {
  const minutes = Math.max(15, snapshot.profile?.daily_minutes || 30);
  const weak = snapshot.weakTopics
    .filter((item) => item.mastery_score < 70 || item.last_signal === "needs_practice")
    .slice(0, 3);

  const fallbackSubjects =
    snapshot.profile?.preferred_subjects?.length
      ? snapshot.profile.preferred_subjects
      : ["Mathematics", "Science", "English"];

  const first = weak[0];
  const second = weak[1];

  const firstSubject = first?.subject || fallbackSubjects[0] || "Mathematics";
  const firstTopic = first?.topic || "Current school chapter";
  const secondSubject = second?.subject || fallbackSubjects[1] || firstSubject;
  const secondTopic = second?.topic || "Important concepts";

  const learnMinutes = Math.max(8, Math.round(minutes * 0.4));
  const practiceMinutes = Math.max(7, Math.round(minutes * 0.35));
  const recallMinutes = Math.max(5, minutes - learnMinutes - practiceMinutes);

  return [
    {
      key: "learn",
      subject: firstSubject,
      topic: firstTopic,
      minutes: learnMinutes,
      task:
        language === "English"
          ? `Understand the concept: ${firstTopic}. Ask Gen-z AI for a simple explanation and one example.`
          : `Concept samjho: ${firstTopic}. Gen-z AI se simple explanation + 1 example lo.`,
    },
    {
      key: "practice",
      subject: firstSubject,
      topic: firstTopic,
      minutes: practiceMinutes,
      task:
        language === "English"
          ? `Practice: Solve 5 questions/MCQs on ${firstTopic} and review your mistakes.`
          : `Practice karo: ${firstTopic} par 5 questions/MCQs solve karo aur mistakes check karo.`,
    },
    {
      key: "recall",
      subject: secondSubject,
      topic: secondTopic,
      minutes: recallMinutes,
      task:
        language === "English"
          ? `Quick revision: Recall the key points/formulas for ${secondTopic} without looking, then take a 3-question quiz.`
          : `Quick revision: ${secondTopic} ke key points/formulas bina dekhe recall karo, phir 3-question quiz lo.`,
    },
  ];
}

async function classifyTurn(input: {
  userText: string;
  assistantText: string;
  mode: string;
  studentContext: string;
}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: [
        {
          role: "system",
          content:
            'Classify one student learning turn. Return ONLY compact JSON: {"subject":"...","topic":"...","signal":"strong|needs_practice|practice"}. Use a stable school subject name and concise canonical topic name. "needs_practice" when the student is confused, asks for basic explanation, gives a wrong answer, or the assistant corrects a misconception. "strong" only when the student demonstrates a correct answer/understanding. Otherwise "practice". Always return subject and topic in concise canonical English, regardless of the selected language or script. Do not infer sensitive traits.',
        },
        {
          role: "user",
          content: [
            `Context: ${input.studentContext}`,
            `Mode: ${input.mode}`,
            `Student: ${input.userText.slice(0, 1200)}`,
            `Tutor: ${input.assistantText.slice(0, 1400)}`,
          ].join("\n"),
        },
      ],
      temperature: 0,
      max_completion_tokens: 100,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (typeof raw !== "string") return null;

  try {
    const parsed = JSON.parse(raw);
    const subject = cleanText(parsed?.subject, 80);
    const topic = cleanText(parsed?.topic, 140);
    const signal =
      parsed?.signal === "strong" || parsed?.signal === "needs_practice"
        ? parsed.signal
        : "practice";

    if (!subject || !topic) return null;
    return { subject, topic, signal } as const;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireLearningUser(req);
    const language = cleanText(req.nextUrl.searchParams.get("language"), 80);
    const snapshot = await getLearningSnapshot(user.id);
    const displaySnapshot = await localizeLearningSnapshotForDisplay(snapshot, language);
    return NextResponse.json({
      ...displaySnapshot,
      today: indiaDate(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Learning dashboard load nahi hua.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireLearningUser(req);
    const body = await req.json();
    const action = cleanText(body?.action, 40) as LearningAction;

    if (action === "save_profile") {
      const profile = await saveLearningProfile(user.id, {
        board: cleanText(body?.board, 120) || null,
        schoolClass: cleanText(body?.schoolClass, 40) || null,
        medium: cleanText(body?.medium, 80) || null,
        goal: cleanText(body?.goal, 120) || "Overall improvement",
        dailyMinutes: clampDailyMinutes(body?.dailyMinutes),
        preferredSubjects: uniqueSubjects(body?.preferredSubjects),
      });

      return NextResponse.json({ ok: true, profile });
    }

    if (action === "save_language") {
      const language = cleanText(body?.language, 80);
      if (!language) {
        return NextResponse.json({ error: "Language required." }, { status: 400 });
      }
      const profile = await updatePreferredLanguage(user.id, language);
      return NextResponse.json({ ok: true, profile });
    }

    if (action === "generate_plan") {
      const language = cleanText(body?.language, 80) || "Hinglish";
      const snapshot = await getLearningSnapshot(user.id);
      if (!snapshot.profile) {
        return NextResponse.json(
          { error: "Pehle My AI Home Tutor profile save karo." },
          { status: 400 }
        );
      }

      const canonicalSnapshot =
        language === "English"
          ? await localizeLearningSnapshotForDisplay(snapshot, "English")
          : snapshot;
      const items = buildPlanItems(canonicalSnapshot, language);
      const plan = await saveDailyPlan(user.id, items);
      return NextResponse.json({ ok: true, plan });
    }

    if (action === "complete_item") {
      const key = cleanText(body?.key, 80);
      if (!key) return NextResponse.json({ error: "Plan item missing." }, { status: 400 });

      const snapshot = await getLearningSnapshot(user.id);
      if (!snapshot.plan) {
        return NextResponse.json({ error: "Aaj ka plan nahi mila." }, { status: 404 });
      }

      const validKeys = new Set(snapshot.plan.items.map((item) => item.key));
      if (!validKeys.has(key)) {
        return NextResponse.json({ error: "Invalid plan item." }, { status: 400 });
      }

      const current = new Set(snapshot.plan.completed_keys || []);
      if (current.has(key)) current.delete(key);
      else current.add(key);

      const plan = await updateDailyPlanCompleted(
        user.id,
        snapshot.plan.plan_date,
        Array.from(current)
      );
      return NextResponse.json({ ok: true, plan });
    }

    if (action === "track_turn") {
      const userText = cleanText(body?.userText, 4000);
      const assistantText = cleanText(body?.assistantText, 5000);
      if (!userText || !assistantText) {
        return NextResponse.json({ ok: true, tracked: false });
      }

      const classified = await classifyTurn({
        userText,
        assistantText,
        mode: cleanText(body?.mode, 40) || "chat",
        studentContext: cleanText(body?.studentContext, 180) || "General",
      });

      if (!classified) {
        return NextResponse.json({ ok: true, tracked: false });
      }

      const progress = await recordLearningSignal(user.id, {
        ...classified,
        mode: cleanText(body?.mode, 40) || "chat",
      });

      return NextResponse.json({ ok: true, tracked: true, progress });
    }

    return NextResponse.json({ error: "Invalid learning action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Learning action failed.";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
