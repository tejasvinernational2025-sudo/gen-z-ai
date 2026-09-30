import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getAdaptiveDifficulty,
  savePracticeAttempt,
  type PracticeDifficulty,
} from "@/lib/practice-server";

export const runtime = "nodejs";

type PracticeQuestion = {
  id: string;
  question: string;
  expectedAnswer: string;
  hint: string;
  difficulty: PracticeDifficulty;
};

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeDifficulty(value: unknown): PracticeDifficulty {
  return value === "easy" || value === "hard" ? value : "medium";
}

async function groqJson(system: string, user: string, maxTokens = 900) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Adaptive practice AI error (${response.status}): ${detail.slice(0, 260)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Adaptive practice response empty hai.");

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Adaptive practice response parse nahi hua.");
  }
}

async function generatePractice(req: NextRequest, body: any) {
  const sourceQuestion = cleanText(body?.sourceQuestion, 1800);
  const sourceAnswer = cleanText(body?.sourceAnswer, 6500);
  const studentContext = cleanText(body?.studentContext, 180) || "General";
  const language = cleanText(body?.language, 80) || "Hinglish";
  const requestedTopic = cleanText(body?.topic, 140);
  const requestedSubject = cleanText(body?.subject, 80);

  if (!sourceQuestion && !sourceAnswer && !requestedTopic) {
    return NextResponse.json({ error: "Practice banane ke liye source topic/question required hai." }, { status: 400 });
  }

  const adaptiveDifficulty = safeDifficulty(body?.difficulty || await getAdaptiveDifficulty(req));

  const data = await groqJson(
    [
      "You are Gen-z AI adaptive practice engine for Indian students.",
      "Return ONLY JSON with this exact shape:",
      '{"subject":"...","topic":"...","questions":[{"id":"q1","question":"...","expectedAnswer":"...","hint":"...","difficulty":"easy|medium|hard"},{"id":"q2",...},{"id":"q3",...}]}',
      "Create exactly 3 fresh practice questions on the same concept, not copies of the source question.",
      "Questions must be solvable from the concept just taught. Do not reveal the expected answer inside the question or hint.",
      "Keep wording short and mobile-friendly. Match board/class context and requested language.",
      "Difficulty should center on the supplied adaptive level; small variation is allowed.",
    ].join("\n"),
    [
      `Student context: ${studentContext}`,
      `Language: ${language}`,
      `Adaptive level: ${adaptiveDifficulty}`,
      requestedSubject ? `Subject: ${requestedSubject}` : "",
      requestedTopic ? `Topic: ${requestedTopic}` : "",
      sourceQuestion ? `Original student question: ${sourceQuestion}` : "",
      sourceAnswer ? `Tutor explanation/solution: ${sourceAnswer}` : "",
    ].filter(Boolean).join("\n\n"),
    1100
  );

  const subject = cleanText(data?.subject, 80) || requestedSubject || "General";
  const topic = cleanText(data?.topic, 140) || requestedTopic || "Practice";
  const rawQuestions = Array.isArray(data?.questions) ? data.questions.slice(0, 3) : [];

  const questions: PracticeQuestion[] = rawQuestions.map((item: any, index: number) => ({
    id: cleanText(item?.id, 24) || `q${index + 1}`,
    question: cleanText(item?.question, 1200),
    expectedAnswer: cleanText(item?.expectedAnswer, 1200),
    hint: cleanText(item?.hint, 600),
    difficulty: safeDifficulty(item?.difficulty || adaptiveDifficulty),
  })).filter((item: PracticeQuestion) => item.question && item.expectedAnswer);

  if (questions.length !== 3) {
    throw new Error("3 practice questions complete generate nahi hue. Dobara try karo.");
  }

  return NextResponse.json({
    ok: true,
    subject,
    topic,
    adaptiveDifficulty,
    questions,
  });
}

async function gradePractice(req: NextRequest, body: any) {
  const question = cleanText(body?.question, 1600);
  const studentAnswer = cleanText(body?.studentAnswer, 1600);
  const expectedAnswer = cleanText(body?.expectedAnswer, 1600);
  const subject = cleanText(body?.subject, 80) || "General";
  const topic = cleanText(body?.topic, 140) || "Practice";
  const difficulty = safeDifficulty(body?.difficulty);
  const sourceType =
    body?.sourceType === "photo" || body?.sourceType === "quiz"
      ? body.sourceType
      : "practice";

  if (!question || !studentAnswer || !expectedAnswer) {
    return NextResponse.json({ error: "Question aur student answer required hai." }, { status: 400 });
  }

  const data = await groqJson(
    [
      "You are a fair school tutor grading one practice answer.",
      "Return ONLY JSON:",
      '{"correct":true,"score":90,"feedback":"...","explanation":"...","nextDifficulty":"easy|medium|hard"}',
      "Accept equivalent wording and valid alternative methods.",
      "Score 0-100. Feedback must be short and encouraging but factual.",
      "If wrong, explain the key mistake without insulting the student.",
      "Choose nextDifficulty: harder after a clearly correct answer, easier after a major misconception, otherwise same.",
    ].join("\n"),
    [
      `Subject: ${subject}`,
      `Topic: ${topic}`,
      `Difficulty: ${difficulty}`,
      `Question: ${question}`,
      `Expected answer/rubric: ${expectedAnswer}`,
      `Student answer: ${studentAnswer}`,
    ].join("\n"),
    500
  );

  const correct = Boolean(data?.correct);
  const score = Math.max(0, Math.min(100, Number(data?.score) || (correct ? 100 : 0)));
  const feedback = cleanText(data?.feedback, 900) || (correct ? "Sahi jawab ✅" : "Is concept ko ek baar aur revise karo.");
  const explanation = cleanText(data?.explanation, 1400);
  const nextDifficulty = safeDifficulty(data?.nextDifficulty || difficulty);

  await savePracticeAttempt(req, {
    subject,
    topic,
    sourceType,
    question,
    studentAnswer,
    expectedAnswer,
    correct,
    score,
    difficulty,
    feedback,
  }).catch(() => null);

  return NextResponse.json({
    ok: true,
    correct,
    score,
    feedback,
    explanation,
    nextDifficulty,
  });
}

export async function POST(req: NextRequest) {
  const rate = enforceRateLimit(req, "adaptive-practice", 18, 30 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Adaptive practice ki temporary limit reach ho gai hai. Thodi der baad try karo." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const action = cleanText(body?.action, 30);

    if (action === "generate") return generatePractice(req, body);
    if (action === "grade") return gradePractice(req, body);

    return NextResponse.json({ error: "Invalid practice action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adaptive practice failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
