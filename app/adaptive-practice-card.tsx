"use client";

import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/chat-history";
import { getPracticeUiText } from "@/lib/practice-ui-i18n";

type Difficulty = "easy" | "medium" | "hard";

type PracticeQuestion = {
  id: string;
  question: string;
  expectedAnswer: string;
  hint: string;
  difficulty: Difficulty;
};

type PracticePack = {
  subject: string;
  topic: string;
  adaptiveDifficulty: Difficulty;
  questions: PracticeQuestion[];
};

type GradeResult = {
  correct: boolean;
  score: number;
  feedback: string;
  explanation: string;
  nextDifficulty: Difficulty;
};

type Props = {
  sourceQuestion: string;
  sourceAnswer: string;
  language: string;
  studentContext: string;
  signedIn: boolean;
  sourceId: string;
};

async function parseJson(response: Response) {
  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Practice response read nahi hua.");
  }
  if (!response.ok) throw new Error(data?.error || "Adaptive practice failed.");
  return data;
}

export default function AdaptivePracticeCard({
  sourceQuestion,
  sourceAnswer,
  language,
  studentContext,
  signedIn,
  sourceId,
}: Props) {
  const [pack, setPack] = useState<PracticePack | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [nextDifficulty, setNextDifficulty] = useState<Difficulty | null>(null);
  const lastSeed = useRef("");
  const ui = getPracticeUiText(studentContext, language);

  async function authHeaders(): Promise<Record<string, string>> {
    const token = signedIn ? await getAccessToken() : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function generate(options?: {
    topic?: string;
    subject?: string;
    difficulty?: Difficulty;
  }) {
    setBusy("generate");
    setError("");
    setGrade(null);
    setAnswer("");
    setHintOpen(false);

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          action: "generate",
          sourceQuestion,
          sourceAnswer,
          studentContext,
          language,
          sourceId: sourceId || undefined,
          topic: options?.topic,
          subject: options?.subject,
          difficulty: options?.difficulty,
        }),
      });

      const data = await parseJson(response);
      setPack(data as PracticePack);
      setIndex(0);
      setNextDifficulty(data.adaptiveDifficulty || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Practice generate nahi hui.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const seed = `${sourceQuestion}\n${sourceAnswer}\n${studentContext}\n${language}\n${sourceId}`.slice(0, 4300);
    if (!sourceAnswer || !seed.trim() || seed === lastSeed.current) return;
    lastSeed.current = seed;
    void generate();
  }, [sourceQuestion, sourceAnswer, studentContext, language, sourceId]);

  const question = pack?.questions?.[index] || null;

  async function checkAnswer() {
    if (!question || !answer.trim() || !pack) return;

    setBusy("grade");
    setError("");

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          action: "grade",
          question: question.question,
          studentAnswer: answer.trim(),
          expectedAnswer: question.expectedAnswer,
          subject: pack.subject,
          topic: pack.topic,
          difficulty: question.difficulty,
          sourceType: "photo",
          language,
          studentContext,
        }),
      });

      const data = (await parseJson(response)) as GradeResult;
      setGrade(data);
      setNextDifficulty(data.nextDifficulty);
      if (signedIn) window.dispatchEvent(new Event("genz-learning-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Answer check nahi hua.");
    } finally {
      setBusy("");
    }
  }

  function nextQuestion() {
    if (!pack) return;
    if (index < pack.questions.length - 1) {
      setIndex((value) => value + 1);
      setAnswer("");
      setGrade(null);
      setHintOpen(false);
      return;
    }

    void generate({
      subject: pack.subject,
      topic: pack.topic,
      difficulty: nextDifficulty || pack.adaptiveDifficulty,
    });
  }

  return (
    <section className="adaptivePractice" aria-label="Adaptive practice">
      <div className="adaptivePracticeHead">
        <div>
          <span>{ui.eyebrow}</span>
          <h4>🎯 {ui.title}</h4>
          <p>
            {pack
              ? `${pack.subject} · ${pack.topic}`
              : ui.loading}
          </p>
        </div>
        {pack && <em>{ui.level[pack.adaptiveDifficulty]}</em>}
      </div>

      {busy === "generate" && !pack && (
        <div className="practiceLoading">{ui.loading}</div>
      )}

      {question && pack && (
        <div className="practiceQuestion">
          <div className="practiceQuestionMeta">
            <strong>{ui.question} {index + 1}/{pack.questions.length}</strong>
            <span>{ui.level[question.difficulty]}</span>
          </div>

          <p className="practicePrompt">{question.question}</p>

          <button
            type="button"
            className="practiceHint"
            onClick={() => setHintOpen((value) => !value)}
          >
            {hintOpen ? ui.hideHint : `💡 ${ui.hint}`}
          </button>
          {hintOpen && <p className="practiceHintText">{question.hint}</p>}

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={ui.answerPlaceholder}
            rows={3}
            disabled={Boolean(grade)}
          />

          {!grade ? (
            <button
              type="button"
              className="practiceCheck"
              disabled={!answer.trim() || busy === "grade"}
              onClick={checkAnswer}
            >
              {busy === "grade" ? ui.checking : ui.checkAnswer}
            </button>
          ) : (
            <div className={grade.correct ? "practiceResult correct" : "practiceResult incorrect"}>
              <strong>{grade.correct ? "✅" : "🔁"}</strong>
              <span>{ui.score}: {Math.round(grade.score)}/100</span>
              <p>{grade.feedback}</p>
              {grade.explanation && <small>{grade.explanation}</small>}
              <button type="button" onClick={nextQuestion}>
                {index < pack.questions.length - 1 ? ui.nextQuestion : ui.nextSet}
              </button>
            </div>
          )}
        </div>
      )}

      {!signedIn && pack && (
        <small className="practiceSaveNote">{ui.signInSave}</small>
      )}

      {error && (
        <div className="practiceError">
          <span>{error}</span>
          <button type="button" onClick={() => void generate()}>{ui.retry}</button>
        </div>
      )}
    </section>
  );
}
