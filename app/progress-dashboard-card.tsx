"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/chat-history";

type PeriodMetrics = {
  attempts: number;
  correct: number;
  accuracy: number;
  averageScore: number;
};

type TopicMetric = {
  subject: string;
  topic: string;
  attempts: number;
  mistakes: number;
  accuracy: number;
  averageScore: number;
};

type ProgressDashboard = {
  profile: {
    goal?: string;
    daily_minutes?: number;
    board?: string | null;
    school_class?: string | null;
    medium?: string | null;
  } | null;
  week: PeriodMetrics;
  previousWeek: PeriodMetrics;
  month: PeriodMetrics;
  trendDelta: number | null;
  activeDays7: number;
  plan: {
    daysWithPlans: number;
    activePlanDays: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    plannedMinutes: number;
    completedPlanMinutes: number;
  };
  difficulty: Array<{ level: string } & PeriodMetrics>;
  weakTopics: TopicMetric[];
  strongTopics: TopicMetric[];
  recentMistakes: Array<{
    subject: string;
    topic: string;
    question: string;
    feedback: string;
    score: number;
    created_at: string;
  }>;
  mastery: Array<{
    subject: string;
    topic: string;
    masteryScore: number;
    attempts: number;
    lastSignal: string;
    lastPracticedAt: string;
  }>;
  parentSummary: string;
  generatedAt: string;
};

type Props = {
  signedIn: boolean;
  onSignIn: () => void;
};

async function parseJson(response: Response) {
  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Progress response read nahi hua.");
  }
  if (!response.ok) throw new Error(data?.error || "Progress dashboard load nahi hua.");
  return data;
}

export default function ProgressDashboardCard({ signedIn, onSignIn }: Props) {
  const [data, setData] = useState<ProgressDashboard | null>(null);
  const [range, setRange] = useState<"week" | "month">("week");
  const [open, setOpen] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!signedIn) {
      setData(null);
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in required.");
      const response = await fetch("/api/progress", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = (await parseJson(response)) as ProgressDashboard;
      setData(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Progress load nahi hua.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener("genz-learning-updated", handler);
    return () => window.removeEventListener("genz-learning-updated", handler);
  }, [signedIn]);

  const current = range === "week" ? data?.week : data?.month;

  const trendLabel = useMemo(() => {
    if (!data || data.trendDelta === null) return "More data needed";
    if (data.trendDelta >= 5) return `+${data.trendDelta} pts vs last week`;
    if (data.trendDelta <= -5) return `${data.trendDelta} pts vs last week`;
    return "Stable vs last week";
  }, [data]);

  async function copyParentSummary() {
    if (!data?.parentSummary) return;
    try {
      await navigator.clipboard.writeText(data.parentSummary);
      setMessage("Parent summary copy ho gayi ✅");
    } catch {
      setMessage("Copy nahi hua. Summary ko long-press karke copy kar sakte ho.");
    }
  }

  if (!signedIn) {
    return (
      <section className="progressDashboardCard">
        <div className="progressHeader">
          <div>
            <span>EXAM PERFORMANCE</span>
            <h3>📈 Progress dashboard + parent summary</h3>
            <p>Quiz/practice accuracy, weak topics aur weekly study-plan progress ek jagah.</p>
          </div>
          <button type="button" onClick={onSignIn}>Sign in</button>
        </div>
      </section>
    );
  }

  return (
    <section className="progressDashboardCard" aria-label="Exam performance and parent progress">
      <div className="progressHeader">
        <div>
          <span>EXAM PERFORMANCE</span>
          <h3>📈 Performance & Progress</h3>
          <p>
            {data?.profile?.goal
              ? `${data.profile.goal} · ${data.profile.daily_minutes || 30} min/day target`
              : "Adaptive quiz aur practice se measurable progress track hoti hai."}
          </p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "View progress"}
        </button>
      </div>

      {busy && !data && <div className="progressMessage">Progress calculate ho rahi hai…</div>}

      {data && (
        <>
          <div className="progressQuickGrid">
            <div>
              <span>7-day accuracy</span>
              <strong>{data.week.accuracy}%</strong>
              <small>{data.week.attempts} graded attempts</small>
            </div>
            <div>
              <span>Study-plan completion</span>
              <strong>{data.plan.completionRate}%</strong>
              <small>{data.plan.completedTasks}/{data.plan.totalTasks} tasks</small>
            </div>
            <div>
              <span>Active days</span>
              <strong>{data.activeDays7}/7</strong>
              <small>practice or plan activity</small>
            </div>
          </div>

          {open && (
            <div className="progressBody">
              <div className="progressTabs">
                <button type="button" className={range === "week" ? "active" : ""} onClick={() => setRange("week")}>
                  7 days
                </button>
                <button type="button" className={range === "month" ? "active" : ""} onClick={() => setRange("month")}>
                  30 days
                </button>
              </div>

              <div className="examMetrics">
                <div><span>Attempts</span><strong>{current?.attempts || 0}</strong></div>
                <div><span>Accuracy</span><strong>{current?.accuracy || 0}%</strong></div>
                <div><span>Avg score</span><strong>{current?.averageScore || 0}/100</strong></div>
                <div><span>Trend</span><strong className="trendText">{trendLabel}</strong></div>
              </div>

              <div className="progressSplit">
                <div className="progressSection">
                  <div className="progressSectionTitle">
                    <strong>Needs revision</strong>
                    <span>30-day graded performance</span>
                  </div>
                  {data.weakTopics.length ? (
                    <div className="progressTopicList">
                      {data.weakTopics.slice(0, 5).map((item) => (
                        <div key={`weak-${item.subject}-${item.topic}`} className="progressTopicRow">
                          <div>
                            <strong>{item.topic}</strong>
                            <small>{item.subject} · {item.mistakes} mistakes / {item.attempts} attempts</small>
                          </div>
                          <em>{item.accuracy}%</em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="progressEmpty">Weak-topic analysis ke liye aur graded practice chahiye.</p>
                  )}
                </div>

                <div className="progressSection">
                  <div className="progressSectionTitle">
                    <strong>Strong topics</strong>
                    <span>2+ attempts and 70%+ accuracy</span>
                  </div>
                  {data.strongTopics.length ? (
                    <div className="progressTopicList">
                      {data.strongTopics.slice(0, 5).map((item) => (
                        <div key={`strong-${item.subject}-${item.topic}`} className="progressTopicRow strong">
                          <div>
                            <strong>{item.topic}</strong>
                            <small>{item.subject} · {item.attempts} attempts</small>
                          </div>
                          <em>{item.accuracy}%</em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="progressEmpty">Strong-topic trend ke liye aur attempts complete karo.</p>
                  )}
                </div>
              </div>

              <div className="difficultyBreakdown">
                <div className="progressSectionTitle">
                  <strong>Difficulty performance</strong>
                  <span>Last 30 days</span>
                </div>
                <div className="difficultyGrid">
                  {data.difficulty.map((item) => (
                    <div key={item.level}>
                      <span>{item.level}</span>
                      <strong>{item.accuracy}%</strong>
                      <small>{item.attempts} attempts</small>
                    </div>
                  ))}
                </div>
              </div>

              {data.recentMistakes.length > 0 && (
                <div className="recentMistakesPanel">
                  <div className="progressSectionTitle">
                    <strong>Recent mistakes</strong>
                    <span>Revision priority</span>
                  </div>
                  {data.recentMistakes.slice(0, 4).map((item, index) => (
                    <div className="recentMistakeRow" key={`${item.topic}-${index}`}>
                      <strong>{item.subject} · {item.topic}</strong>
                      <p>{item.question}</p>
                      {item.feedback && <small>{item.feedback}</small>}
                    </div>
                  ))}
                </div>
              )}

              <div className="parentSummaryPanel">
                <div className="progressSectionTitle">
                  <div>
                    <strong>👨‍👩‍👧 Weekly parent summary</strong>
                    <span>Practice data + study-plan completion</span>
                  </div>
                  <button type="button" onClick={() => setParentOpen((value) => !value)}>
                    {parentOpen ? "Hide" : "View"}
                  </button>
                </div>

                {parentOpen && (
                  <>
                    <pre>{data.parentSummary}</pre>
                    <button type="button" className="copyParentSummary" onClick={copyParentSummary}>
                      Copy summary
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {message && <div className="progressMessage">{message}</div>}
    </section>
  );
}
