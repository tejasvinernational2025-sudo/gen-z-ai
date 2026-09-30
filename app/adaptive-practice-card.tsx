"use client";

import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/chat-history";

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
    const seed = `${sourceQuestion}\n${sourceAnswer}`.slice(0, 4000);
    if (!sourceAnswer || !seed.trim() || seed === lastSeed.current) return;
    lastSeed.current = seed;
    void generate();
  }, [sourceQuestion, sourceAnswer]);

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
          <span>PHOTO → PRACTICE</span>
          <h4>🎯 Ab isi concept par practice karo</h4>
          <p>
            {pack
              ? `${pack.subject} · ${pack.topic}`
              : "Photo solution se similar questions ban rahe hain…"}
          </p>
        </div>
        {pack && <em>{pack.adaptiveDifficulty} level</em>}
      </div>

      {busy === "generate" && !pack && (
        <div className="practiceLoading">3 similar questions bana raha hoon…</div>
      )}

      {question && pack && (
        <div className="practiceQuestion">
          <div className="practiceQuestionMeta">
            <strong>Question {index + 1}/{pack.questions.length}</strong>
            <span>{question.difficulty}</span>
          </div>

          <p className="practicePrompt">{question.question}</p>

          <button
            type="button"
            className="practiceHint"
            onClick={() => setHintOpen((value) => !value)}
          >
            {hintOpen ? "Hint hide karo" : "💡 Hint"}
          </button>
          {hintOpen && <p className="practiceHintText">{question.hint}</p>}

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Apna answer yahan likho…"
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
              {busy === "grade" ? "Checking…" : "Check my answer"}
            </button>
          ) : (
            <div className={grade.correct ? "practiceResult correct" : "practiceResult incorrect"}>
              <strong>{grade.correct ? "✅ Sahi jawab" : "🔁 Thoda aur practice"}</strong>
              <span>Score: {Math.round(grade.score)}/100</span>
              <p>{grade.feedback}</p>
              {grade.explanation && <small>{grade.explanation}</small>}
              <button type="button" onClick={nextQuestion}>
                {index < pack.questions.length - 1 ? "Next question →" : "Next adaptive set →"}
              </button>
            </div>
          )}
        </div>
      )}

      {!signedIn && pack && (
        <small className="practiceSaveNote">Sign in karoge to answers mastery/weak-topic profile me save honge.</small>
      )}

      {error && (
        <div className="practiceError">
          <span>{error}</span>
          <button type="button" onClick={() => void generate()}>Retry</button>
        </div>
      )}
    </section>
  );
}
