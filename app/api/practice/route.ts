import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getGroundingContext } from "@/lib/source-grounding";
import {
  getAdaptiveDifficulty,
  getPracticePerformance,
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

function outputLanguageRule(studentContext: string, requestedLanguage: string) {
  const mediumPart = studentContext
    .split("|")
    .map((part) => part.trim())
    .find((part) => /\bMedium$/i.test(part));

  const mediumLanguage = mediumPart
    ? mediumPart.replace(/\s*Medium$/i, "").trim()
    : "";

  const selectedLanguage = requestedLanguage.includes("—")
    ? requestedLanguage.split("—").pop()?.trim() || ""
    : requestedLanguage.trim();

  const effectiveLanguage = selectedLanguage || mediumLanguage || "Hinglish";
  const languageStyle =
    effectiveLanguage === "Hinglish"
      ? "natural Hinglish using Latin script"
      : effectiveLanguage === "English"
        ? "English"
        : `${effectiveLanguage} using its native script`;

  const instruction = [
    `CRITICAL OUTPUT LANGUAGE REQUIREMENT: The explicit Language selector is ${effectiveLanguage}.`,
    `Write EVERY student-facing value in ${languageStyle}.`,
    "This includes subject/topic labels, questions, answer options, hints, expected answers, feedback and explanations.",
    "The Language selector overrides the school medium; the medium remains curriculum context only.",
    "Keep JSON property names/keys exactly as requested in English.",
  ].join(" ");

  return { effectiveLanguage, instruction };
}

async function groqJson(system: string, user: string, maxTokens = 900) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  let lastError = "Adaptive practice temporarily unavailable.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
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
        lastError = `Adaptive practice AI error (${response.status}): ${detail.slice(0, 260)}`;
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if (retryable && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          continue;
        }
        throw new Error(lastError);
      }

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content;
      if (typeof raw !== "string" || !raw.trim()) {
        lastError = "Adaptive practice response empty hai.";
        if (attempt === 0) continue;
        throw new Error(lastError);
      }

      try {
        return JSON.parse(raw);
      } catch {
        lastError = "Adaptive practice response parse nahi hua.";
        if (attempt === 0) continue;
        throw new Error(lastError);
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
    }
  }

  throw new Error(lastError);
}

async function generatePractice(req: NextRequest, body: any) {
  const sourceQuestion = cleanText(body?.sourceQuestion, 1800);
  const sourceAnswer = cleanText(body?.sourceAnswer, 6500);
  const studentContext = cleanText(body?.studentContext, 180) || "General";
  const language = cleanText(body?.language, 80) || "Hinglish";
  const requestedTopic = cleanText(body?.topic, 140);
  const requestedSubject = cleanText(body?.subject, 80);
  const outputLanguage = outputLanguageRule(studentContext, language);

  if (!sourceQuestion && !sourceAnswer && !requestedTopic) {
    return NextResponse.json({ error: "Practice banane ke liye source topic/question required hai." }, { status: 400 });
  }

  const adaptiveDifficulty = safeDifficulty(body?.difficulty || await getAdaptiveDifficulty(req));
  const groundingContext = await getGroundingContext(
    req,
    body?.sourceId,
    requestedTopic || sourceQuestion || sourceAnswer
  );

  const data = await groqJson(
    [
      "You are Gen-z AI adaptive practice engine for Indian students.",
      "Return ONLY JSON with this exact shape:",
      '{"subject":"...","topic":"...","questions":[{"id":"q1","question":"...","expectedAnswer":"...","hint":"...","difficulty":"easy|medium|hard"},{"id":"q2",...},{"id":"q3",...}]}',
      "Create exactly 3 fresh practice questions on the same concept, not copies of the source question.",
      "Questions must be solvable from the concept just taught. Do not reveal the expected answer inside the question or hint.",
      "Keep wording short and mobile-friendly. Match board/class context.",
      outputLanguage.instruction,
      "Difficulty should center on the supplied adaptive level; small variation is allowed.",
      groundingContext,
    ].filter(Boolean).join("\n\n"),
    [
      `Student context: ${studentContext}`,
      `Output language: ${outputLanguage.effectiveLanguage}`,
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
  const studentContext = cleanText(body?.studentContext, 180) || "General";
  const language = cleanText(body?.language, 80) || "Hinglish";
  const outputLanguage = outputLanguageRule(studentContext, language);
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
      outputLanguage.instruction,
      "Choose nextDifficulty: harder after a clearly correct answer, easier after a major misconception, otherwise same.",
    ].join("\n"),
    [
      `Subject: ${subject}`,
      `Topic: ${topic}`,
      `Difficulty: ${difficulty}`,
      `Question: ${question}`,
      `Expected answer/rubric: ${expectedAnswer}`,
      `Student answer: ${studentAnswer}`,
      `Output language: ${outputLanguage.effectiveLanguage}`,
    ].join("\n"),
    500
  );

  const correct = Boolean(data?.correct);
  const score = Math.max(0, Math.min(100, Number(data?.score) || (correct ? 100 : 0)));
  const feedback = cleanText(data?.feedback, 900) || (correct ? "✅" : "🔁");
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


async function generateQuiz(req: NextRequest, body: any) {
  const topic = cleanText(body?.topic, 140);
  const subject = cleanText(body?.subject, 80) || "General";
  const studentContext = cleanText(body?.studentContext, 180) || "General";
  const language = cleanText(body?.language, 80) || "Hinglish";
  const outputLanguage = outputLanguageRule(studentContext, language);

  if (!topic) {
    return NextResponse.json({ error: "Quiz ke liye topic required hai." }, { status: 400 });
  }

  const adaptiveDifficulty = safeDifficulty(body?.difficulty || await getAdaptiveDifficulty(req));
  const groundingContext = await getGroundingContext(req, body?.sourceId, topic);

  const data = await groqJson(
    [
      "You are Gen-z AI adaptive quiz engine for Indian students.",
      "Return ONLY JSON with this exact shape:",
      '{"subject":"...","topic":"...","questions":[{"id":"q1","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","difficulty":"easy|medium|hard"}]}',
      "Create exactly 5 fresh multiple-choice questions.",
      "Each question must have exactly 4 concise options and exactly one correct answer.",
      "Do not reveal the answer inside the question.",
      "Match the selected board/class context.",
      outputLanguage.instruction,
      "Difficulty should center around the supplied adaptive level.",
      "Use exam-style wording where appropriate but do not claim official current exam weightage.",
      groundingContext,
    ].filter(Boolean).join("\n\n"),
    [
      `Student context: ${studentContext}`,
      `Output language: ${outputLanguage.effectiveLanguage}`,
      `Adaptive level: ${adaptiveDifficulty}`,
      `Subject: ${subject}`,
      `Topic: ${topic}`,
    ].join("\n"),
    1400
  );

  const rawQuestions = Array.isArray(data?.questions) ? data.questions.slice(0, 5) : [];
  const questions = rawQuestions.map((item: any, index: number) => {
    const options = Array.isArray(item?.options)
      ? item.options.slice(0, 4).map((option: unknown) => cleanText(option, 500))
      : [];
    const correctIndex = Number(item?.correctIndex);

    return {
      id: cleanText(item?.id, 24) || `q${index + 1}`,
      question: cleanText(item?.question, 1200),
      options,
      correctIndex:
        Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex <= 3
          ? correctIndex
          : 0,
      explanation: cleanText(item?.explanation, 1200),
      difficulty: safeDifficulty(item?.difficulty || adaptiveDifficulty),
    };
  }).filter((item: any) =>
    item.question &&
    item.options.length === 4 &&
    item.options.every((option: string) => Boolean(option))
  );

  if (questions.length !== 5) {
    throw new Error("5 quiz questions complete generate nahi hue. Dobara try karo.");
  }

  return NextResponse.json({
    ok: true,
    subject: cleanText(data?.subject, 80) || subject,
    topic: cleanText(data?.topic, 140) || topic,
    adaptiveDifficulty,
    questions,
  });
}

async function gradeQuiz(req: NextRequest, body: any) {
  const question = cleanText(body?.question, 1600);
  const subject = cleanText(body?.subject, 80) || "General";
  const topic = cleanText(body?.topic, 140) || "Quiz";
  const difficulty = safeDifficulty(body?.difficulty);
  const options = Array.isArray(body?.options)
    ? body.options.slice(0, 4).map((option: unknown) => cleanText(option, 500))
    : [];
  const selectedIndex = Number(body?.selectedIndex);
  const correctIndex = Number(body?.correctIndex);
  const explanation = cleanText(body?.explanation, 1400);

  if (
    !question ||
    options.length !== 4 ||
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex > 3 ||
    !Number.isInteger(correctIndex) ||
    correctIndex < 0 ||
    correctIndex > 3
  ) {
    return NextResponse.json({ error: "Quiz answer invalid hai." }, { status: 400 });
  }

  const correct = selectedIndex === correctIndex;
  const score = correct ? 100 : 0;
  const feedback = correct
    ? "✅"
    : `✓ ${options[correctIndex]}`;

  await savePracticeAttempt(req, {
    subject,
    topic,
    sourceType: "quiz",
    question,
    studentAnswer: options[selectedIndex],
    expectedAnswer: options[correctIndex],
    correct,
    score,
    difficulty,
    feedback: explanation ? `${feedback}. ${explanation}` : feedback,
  }).catch(() => null);

  return NextResponse.json({
    ok: true,
    correct,
    score,
    feedback,
    explanation,
    correctIndex,
    nextDifficulty: correct
      ? difficulty === "easy" ? "medium" : difficulty === "medium" ? "hard" : "hard"
      : difficulty === "hard" ? "medium" : difficulty === "medium" ? "easy" : "easy",
  });
}

export async function GET(req: NextRequest) {
  try {
    const performance = await getPracticePerformance(req);
    if (!performance) {
      return NextResponse.json({ signedIn: false, performance: null });
    }
    return NextResponse.json({ signedIn: true, performance });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Performance load nahi hua.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    if (action === "generate_quiz") return generateQuiz(req, body);
    if (action === "grade_quiz") return gradeQuiz(req, body);

    return NextResponse.json({ error: "Invalid practice action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adaptive practice failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
