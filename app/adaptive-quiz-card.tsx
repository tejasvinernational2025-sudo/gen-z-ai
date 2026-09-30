"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/chat-history";

type Difficulty = "easy" | "medium" | "hard";

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty;
};

type QuizPack = {
  subject: string;
  topic: string;
  adaptiveDifficulty: Difficulty;
  questions: QuizQuestion[];
};

type Performance = {
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
  }>;
  weakTopics: Array<{
    subject: string;
    topic: string;
    attempts: number;
    mistakes: number;
    accuracy: number;
  }>;
};

type Props = {
  signedIn: boolean;
  language: string;
  studentContext: string;
};

async function parseJson(response: Response) {
  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Quiz response read nahi hua.");
  }
  if (!response.ok) throw new Error(data?.error || "Adaptive quiz failed.");
  return data;
}

export default function AdaptiveQuizCard({ signedIn, language, studentContext }: Props) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("General");
  const [pack, setPack] = useState<QuizPack | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  async function authHeaders(): Promise<Record<string, string>> {
    const token = signedIn ? await getAccessToken() : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadPerformance() {
    if (!signedIn) {
      setPerformance(null);
      return;
    }

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/practice", { headers, cache: "no-store" });
      const data = await parseJson(response);
      setPerformance(data?.performance || null);
    } catch {
      setPerformance(null);
    }
  }

  useEffect(() => {
    void loadPerformance();
    const handler = () => void loadPerformance();
    window.addEventListener("genz-learning-updated", handler);
    return () => window.removeEventListener("genz-learning-updated", handler);
  }, [signedIn]);

  async function generateQuiz(nextDifficulty?: Difficulty) {
    if (!topic.trim()) {
      setError("Quiz ke liye topic likho.");
      return;
    }

    setBusy("generate");
    setError("");
    setPack(null);
    setIndex(0);
    setSelected(null);
    setResult(null);
    setCorrectCount(0);

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "generate_quiz",
          topic: topic.trim(),
          subject: subject.trim() || "General",
          studentContext,
          language,
          difficulty: nextDifficulty,
        }),
      });
      const data = await parseJson(response);
      setPack(data as QuizPack);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz generate nahi hua.");
    } finally {
      setBusy("");
    }
  }

  const question = pack?.questions?.[index] || null;

  async function checkAnswer() {
    if (!pack || !question || selected === null) return;

    setBusy("grade");
    setError("");

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "grade_quiz",
          subject: pack.subject,
          topic: pack.topic,
          question: question.question,
          options: question.options,
          selectedIndex: selected,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          difficulty: question.difficulty,
        }),
      });
      const data = await parseJson(response);
      setResult(data);
      if (data.correct) setCorrectCount((value) => value + 1);
      if (signedIn) {
        window.dispatchEvent(new Event("genz-learning-updated"));
        void loadPerformance();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz answer check nahi hua.");
    } finally {
      setBusy("");
    }
  }

  function nextQuestion() {
    if (!pack) return;
    if (index < pack.questions.length - 1) {
      setIndex((value) => value + 1);
      setSelected(null);
      setResult(null);
      return;
    }

    const next = result?.nextDifficulty as Difficulty | undefined;
    void generateQuiz(next);
  }

  const progressText = useMemo(() => {
    if (!pack) return "";
    return `Question ${index + 1}/${pack.questions.length}`;
  }, [pack, index]);

  return (
    <section className="adaptiveQuiz" aria-label="Adaptive quiz and mistake analysis">
      <div className="adaptiveQuizHead">
        <div>
          <span>ADAPTIVE QUIZ</span>
          <h4>🎯 Topic-wise quiz + mistake analysis</h4>
          <p>Har answer ke baad difficulty adjust hoti hai aur signed-in students ki mistakes track hoti hain.</p>
        </div>
        {pack && <em>{pack.adaptiveDifficulty} level</em>}
      </div>

      {!pack && (
        <div className="quizSetup">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g. Mathematics)"
            maxLength={80}
          />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (e.g. Trigonometry)"
            maxLength={140}
          />
          <button type="button" onClick={() => void generateQuiz()} disabled={busy === "generate"}>
            {busy === "generate" ? "Quiz bana raha hoon…" : "Start adaptive quiz"}
          </button>
        </div>
      )}

      {question && pack && (
        <div className="quizQuestionCard">
          <div className="quizMeta">
            <strong>{progressText}</strong>
            <span>{question.difficulty}</span>
          </div>
          <p>{question.question}</p>
          <div className="quizOptions">
            {question.options.map((option, optionIndex) => {
              const isSelected = selected === optionIndex;
              const isCorrect = result && optionIndex === question.correctIndex;
              const isWrongSelected = result && isSelected && !isCorrect;
              const className = isCorrect
                ? "correct"
                : isWrongSelected
                  ? "wrong"
                  : isSelected
                    ? "selected"
                    : "";

              return (
                <button
                  type="button"
                  key={optionIndex}
                  className={className}
                  onClick={() => !result && setSelected(optionIndex)}
                  disabled={Boolean(result)}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                </button>
              );
            })}
          </div>

          {!result ? (
            <button
              type="button"
              className="quizCheck"
              onClick={checkAnswer}
              disabled={selected === null || busy === "grade"}
            >
              {busy === "grade" ? "Checking…" : "Check answer"}
            </button>
          ) : (
            <div className={result.correct ? "quizResult correct" : "quizResult incorrect"}>
              <strong>{result.correct ? "✅ Correct" : "🔁 Needs practice"}</strong>
              <p>{result.feedback}</p>
              {result.explanation && <small>{result.explanation}</small>}
              <button type="button" onClick={nextQuestion}>
                {index < pack.questions.length - 1 ? "Next question →" : "Next adaptive set →"}
              </button>
            </div>
          )}
        </div>
      )}

      {pack && (
        <div className="quizScoreStrip">
          <span>Current set</span>
          <strong>{correctCount}/{pack.questions.length} correct</strong>
        </div>
      )}

      {signedIn && performance && (
        <div className="mistakeAnalysis">
          <div className="mistakeStats">
            <div><span>Attempts</span><strong>{performance.totalAttempts}</strong></div>
            <div><span>Accuracy</span><strong>{performance.accuracy}%</strong></div>
            <div><span>Avg score</span><strong>{performance.averageScore}</strong></div>
          </div>

          {performance.weakTopics.length > 0 && (
            <div className="mistakeBlock">
              <strong>Weak topics</strong>
              {performance.weakTopics.slice(0, 4).map((item) => (
                <div key={`${item.subject}-${item.topic}`} className="weakPerformanceRow">
                  <span>{item.subject} · {item.topic}</span>
                  <em>{item.accuracy}% accuracy</em>
                </div>
              ))}
            </div>
          )}

          {performance.recentMistakes.length > 0 && (
            <div className="mistakeBlock">
              <strong>Recent mistakes</strong>
              {performance.recentMistakes.slice(0, 3).map((item, mistakeIndex) => (
                <div key={mistakeIndex} className="mistakeRow">
                  <span>{item.topic}</span>
                  <small>{item.question}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!signedIn && (
        <small className="quizSignInHint">Sign in karoge to mistake history, weak topics aur accuracy save hogi.</small>
      )}

      {error && <div className="practiceError"><span>{error}</span></div>}
    </section>
  );
}
