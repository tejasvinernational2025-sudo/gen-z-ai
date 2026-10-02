"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/chat-history";

type RevisionItem = {
  id: string;
  subject: string;
  topic: string;
  due_date: string;
  interval_days: number;
  repetitions: number;
  last_result: "hard" | "okay" | "easy" | null;
  last_score: number | null;
  last_reviewed_at: string | null;
};

type RevisionDashboard = {
  today: string;
  due: RevisionItem[];
  upcoming: RevisionItem[];
  stats: {
    dueToday: number;
    scheduled: number;
    reviewed: number;
    easyCount: number;
    averageScore: number;
  };
};

type PracticeQuestion = {
  id: string;
  question: string;
  expectedAnswer: string;
  hint: string;
  difficulty: "easy" | "medium" | "hard";
};

type PracticePack = {
  subject: string;
  topic: string;
  adaptiveDifficulty: "easy" | "medium" | "hard";
  questions: PracticeQuestion[];
};

type GradeResult = {
  correct: boolean;
  score: number;
  feedback: string;
  explanation: string;
  nextDifficulty: "easy" | "medium" | "hard";
};

type Props = {
  signedIn: boolean;
  language: string;
  studentContext: string;
  sourceId: string;
  onSignIn: () => void;
};

async function parseJson(response: Response) {
  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Revision response read nahi hua.");
  }
  if (!response.ok) throw new Error(data?.error || "Revision action failed.");
  return data;
}

export default function SmartRevisionCard({
  signedIn,
  language,
  studentContext,
  sourceId,
  onSignIn,
}: Props) {
  const [dashboard, setDashboard] = useState<RevisionDashboard | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [activeRevision, setActiveRevision] = useState<RevisionItem | null>(null);
  const [pack, setPack] = useState<PracticePack | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [hintOpen, setHintOpen] = useState(false);

  async function authHeaders(): Promise<Record<string, string>> {
    const token = signedIn ? await getAccessToken() : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function refresh() {
    if (!signedIn) {
      setDashboard(null);
      return;
    }

    setBusy((current) => current || "refresh");
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/revision", { headers, cache: "no-store" });
      setDashboard((await parseJson(response)) as RevisionDashboard);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revision list load nahi hui.");
    } finally {
      setBusy((current) => (current === "refresh" ? "" : current));
    }
  }

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener("genz-learning-updated", handler);
    return () => window.removeEventListener("genz-learning-updated", handler);
  }, [signedIn]);

  const currentQuestion = pack?.questions?.[index] || null;

  const completedAverage = useMemo(() => {
    if (!scores.length) return 0;
    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  }, [scores]);

  async function startRevision(item: RevisionItem) {
    if (!signedIn) {
      onSignIn();
      return;
    }

    setBusy("start");
    setMessage("");
    setActiveRevision(item);
    setPack(null);
    setIndex(0);
    setAnswer("");
    setGrade(null);
    setScores([]);
    setHintOpen(false);

    try {
      const headers = await authHeaders();
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "generate",
          sourceQuestion: "",
          sourceAnswer: "",
          subject: item.subject,
          topic: item.topic,
          studentContext,
          language,
          sourceId: sourceId || undefined,
          difficulty: item.last_result === "hard" ? "easy" : undefined,
        }),
      });

      const data = await parseJson(response);
      setPack(data as PracticePack);
      setOpen(true);
    } catch (error) {
      setActiveRevision(null);
      setMessage(error instanceof Error ? error.message : "Revision practice start nahi hui.");
    } finally {
      setBusy("");
    }
  }

  async function checkAnswer() {
    if (!currentQuestion || !pack || !answer.trim()) return;

    setBusy("grade");
    setMessage("");
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "grade",
          question: currentQuestion.question,
          studentAnswer: answer.trim(),
          expectedAnswer: currentQuestion.expectedAnswer,
          subject: pack.subject,
          topic: pack.topic,
          difficulty: currentQuestion.difficulty,
          sourceType: "practice",
        }),
      });

      const data = (await parseJson(response)) as GradeResult;
      setGrade(data);
      setScores((current) => [...current, Math.max(0, Math.min(100, Number(data.score) || 0))]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revision answer check nahi hua.");
    } finally {
      setBusy("");
    }
  }

  async function finishRevision(finalScores: number[]) {
    if (!activeRevision || !finalScores.length) return;

    const average = Math.round(
      finalScores.reduce((sum, value) => sum + value, 0) / finalScores.length
    );

    setBusy("finish");
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "complete",
          revisionId: activeRevision.id,
          score: average,
        }),
      });

      const result = await parseJson(response);
      setMessage(
        `Revision complete ✅ Score ${average}/100 · Next review ${result.nextDue} (${result.nextInterval} day gap)`
      );
      setActiveRevision(null);
      setPack(null);
      setIndex(0);
      setAnswer("");
      setGrade(null);
      setScores([]);
      setHintOpen(false);
      await refresh();
      window.dispatchEvent(new Event("genz-learning-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revision complete save nahi hua.");
    } finally {
      setBusy("");
    }
  }

  function nextQuestion() {
    if (!pack || !grade) return;

    if (index < pack.questions.length - 1) {
      setIndex((value) => value + 1);
      setAnswer("");
      setGrade(null);
      setHintOpen(false);
      return;
    }

    void finishRevision(scores);
  }

  async function snooze(item: RevisionItem) {
    setBusy(item.id);
    setMessage("");
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "snooze", revisionId: item.id }),
      });
      const result = await parseJson(response);
      setMessage(`“${item.topic}” kal ke liye move ho gaya · ${result.nextDue}`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Revision snooze nahi hua.");
    } finally {
      setBusy("");
    }
  }

  if (!signedIn) {
    return (
      <section className="smartRevisionCard">
        <div className="revisionHeader">
          <div>
            <span>SMART REVISION</span>
            <h3>🔁 Weak topics ko bhoolne se pehle revise karo</h3>
            <p>Spaced revision schedule aur “Revise Today” list ke liye sign in karo.</p>
          </div>
          <button type="button" onClick={onSignIn}>Sign in</button>
        </div>
      </section>
    );
  }

  return (
    <section className="smartRevisionCard" aria-label="Smart revision engine">
      <div className="revisionHeader">
        <div>
          <span>SMART REVISION</span>
          <h3>🔁 Revise Today</h3>
          <p>
            {dashboard
              ? `${dashboard.stats.dueToday} due · ${dashboard.stats.scheduled} topics scheduled · spaced repetition auto-adjusts`
              : "Weak topics ko automatically revision schedule me daala ja raha hai…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            if (!dashboard) void refresh();
          }}
        >
          {open ? "Hide" : dashboard?.stats.dueToday ? `Revise ${dashboard.stats.dueToday}` : "View"}
        </button>
      </div>

      {dashboard && (
        <div className="revisionStats">
          <div><span>Due today</span><strong>{dashboard.stats.dueToday}</strong></div>
          <div><span>Reviewed</span><strong>{dashboard.stats.reviewed}</strong></div>
          <div><span>Avg revision score</span><strong>{dashboard.stats.averageScore}/100</strong></div>
        </div>
      )}

      {open && !activeRevision && dashboard && (
        <div className="revisionBody">
          <div className="revisionSection">
            <div className="revisionSectionTitle">
              <div>
                <strong>Today’s revision</strong>
                <span>Weak / due topics first</span>
              </div>
              <button type="button" onClick={() => void refresh()} disabled={busy === "refresh"}>
                {busy === "refresh" ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {dashboard.due.length ? (
              <div className="revisionList">
                {dashboard.due.map((item) => (
                  <div key={item.id} className="revisionItem">
                    <div>
                      <span>{item.subject}</span>
                      <strong>{item.topic}</strong>
                      <small>
                        {item.repetitions
                          ? `Review #${item.repetitions + 1} · last ${item.last_score ?? 0}/100`
                          : "First smart revision"}
                      </small>
                    </div>
                    <div className="revisionActions">
                      <button type="button" onClick={() => void startRevision(item)} disabled={Boolean(busy)}>
                        Practice now
                      </button>
                      <button type="button" className="revisionSnooze" onClick={() => void snooze(item)} disabled={Boolean(busy)}>
                        Tomorrow
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="revisionClear">
                <strong>✅ Aaj ki revision clear hai</strong>
                <span>Naya weak-topic signal aate hi yahan automatically schedule ho jayega.</span>
              </div>
            )}
          </div>

          {dashboard.upcoming.length > 0 && (
            <div className="revisionSection">
              <div className="revisionSectionTitle">
                <div>
                  <strong>Upcoming</strong>
                  <span>Spaced revision schedule</span>
                </div>
              </div>
              <div className="upcomingRevisionList">
                {dashboard.upcoming.slice(0, 5).map((item) => (
                  <div key={item.id}>
                    <span>{item.due_date}</span>
                    <strong>{item.subject} · {item.topic}</strong>
                    <small>{item.interval_days}-day interval</small>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeRevision && (
        <div className="revisionSession">
          <div className="revisionSessionHead">
            <div>
              <span>REVISION SESSION</span>
              <strong>{activeRevision.subject} · {activeRevision.topic}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveRevision(null);
                setPack(null);
                setGrade(null);
                setScores([]);
              }}
            >
              Exit
            </button>
          </div>

          {busy === "start" && !pack && <div className="revisionLoading">3 recall questions bana raha hoon…</div>}

          {currentQuestion && pack && (
            <div className="revisionQuestion">
              <div className="revisionQuestionMeta">
                <strong>Question {index + 1}/{pack.questions.length}</strong>
                <span>{currentQuestion.difficulty}</span>
              </div>
              <p>{currentQuestion.question}</p>

              <button
                type="button"
                className="revisionHint"
                onClick={() => setHintOpen((value) => !value)}
              >
                {hintOpen ? "Hint hide" : "💡 Hint"}
              </button>
              {hintOpen && <small className="revisionHintText">{currentQuestion.hint}</small>}

              <textarea
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Answer bina dekhe recall karke likho…"
                disabled={Boolean(grade)}
              />

              {!grade ? (
                <button
                  type="button"
                  className="revisionCheck"
                  onClick={checkAnswer}
                  disabled={!answer.trim() || busy === "grade"}
                >
                  {busy === "grade" ? "Checking…" : "Check answer"}
                </button>
              ) : (
                <div className={grade.correct ? "revisionResult correct" : "revisionResult incorrect"}>
                  <strong>{grade.correct ? "✅ Correct" : "🔁 Revise this point"}</strong>
                  <span>Score {Math.round(grade.score)}/100</span>
                  <p>{grade.feedback}</p>
                  {grade.explanation && <small>{grade.explanation}</small>}
                  <button type="button" onClick={nextQuestion} disabled={busy === "finish"}>
                    {index < pack.questions.length - 1
                      ? "Next recall question →"
                      : busy === "finish"
                        ? "Scheduling next review…"
                        : `Finish revision · avg ${completedAverage}/100 →`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {message && <div className="revisionMessage">{message}</div>}
    </section>
  );
}
