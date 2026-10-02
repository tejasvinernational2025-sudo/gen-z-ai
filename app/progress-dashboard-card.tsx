"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/chat-history";

type SubjectPerformance = {
  subject: string;
  attempts: number;
  correct: number;
  accuracy: number;
  averageScore: number;
};

type TopicItem = {
  subject: string;
  topic: string;
  masteryScore: number;
  attempts: number;
  lastSignal: string;
  lastPracticedAt: string;
};

type ProgressDashboard = {
  period: { start: string; end: string; label: string };
  overview: {
    attempts: number;
    correct: number;
    accuracy: number;
    averageScore: number;
    activeDays: number;
    completedPlanTasks: number;
    totalPlanTasks: number;
    completedPlanMinutes: number;
    planCompletionPercent: number;
  };
  trend: {
    previousAttempts: number;
    previousAccuracy: number;
    previousAverageScore: number;
    accuracyDelta: number | null;
  };
  subjects: SubjectPerformance[];
  weakTopics: TopicItem[];
  strongTopics: TopicItem[];
  recentMistakes: Array<{
    subject: string;
    topic: string;
    question: string;
    feedback: string;
    score: number;
    createdAt: string;
  }>;
  parentSummary: {
    headline: string;
    bullets: string[];
    focusNextWeek: string[];
    note: string;
  };
};

type Props = {
  signedIn: boolean;
  onSignIn: () => void;
};

async function readJson(response: Response) {
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
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProgressDashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!signedIn) {
      setData(null);
      return;
    }

    setBusy(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Sign in required.");
      const response = await fetch("/api/progress", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      setData((await readJson(response)) as ProgressDashboard);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Progress load nahi hua.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!signedIn) {
      setData(null);
      return;
    }

    void refresh();
    const handler = () => void refresh();
    window.addEventListener("genz-learning-updated", handler);
    return () => window.removeEventListener("genz-learning-updated", handler);
  }, [signedIn]);

  const parentShareText = useMemo(() => {
    if (!data) return "";
    const lines = [
      "Gen-z AI Weekly Progress Summary",
      data.period.label,
      "",
      data.parentSummary.headline,
      ...data.parentSummary.bullets.map((item) => `• ${item}`),
    ];

    if (data.parentSummary.focusNextWeek.length) {
      lines.push("", "Next focus:");
      lines.push(...data.parentSummary.focusNextWeek.map((item) => `• ${item}`));
    }

    lines.push("", data.parentSummary.note);
    return lines.join("\n");
  }, [data]);

  async function copyParentSummary() {
    if (!parentShareText) return;
    try {
      await navigator.clipboard.writeText(parentShareText);
      setMessage("Parent summary copy ho gayi ✅");
    } catch {
      setMessage("Copy available nahi hua. Share button try karo.");
    }
  }

  async function shareParentSummary() {
    if (!parentShareText) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Gen-z AI Weekly Progress",
          text: parentShareText,
        });
        setMessage("Parent summary share ho gayi ✅");
      } else {
        await copyParentSummary();
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("Share nahi hua. Copy summary use karo.");
    }
  }

  if (!signedIn) {
    return (
      <section className="progressDashboardCard">
        <div className="progressHead">
          <div>
            <span>EXAM PERFORMANCE</span>
            <h3>📊 Progress + Parent Summary</h3>
            <p>Accuracy, weak topics, study activity aur weekly parent report ke liye sign in karo.</p>
          </div>
          <button type="button" onClick={onSignIn}>Sign in</button>
        </div>
      </section>
    );
  }

  const delta = data ? data.trend.accuracyDelta : null;

  return (
    <section className="progressDashboardCard" aria-label="Exam performance and parent progress">
      <div className="progressHead">
        <div>
          <span>EXAM PERFORMANCE</span>
          <h3>📊 Weekly Progress Dashboard</h3>
          <p>
            {data
              ? `${data.period.label} · adaptive practice + daily plan data`
              : "Practice performance load ho rahi hai…"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            if (!data) void refresh();
          }}
        >
          {open ? "Hide" : "View progress"}
        </button>
      </div>

      {busy && !data && <div className="progressMessage">Progress calculate ho rahi hai…</div>}

      {data && (
        <div className="progressQuickGrid">
          <div>
            <span>Accuracy</span>
            <strong>{data.overview.accuracy}%</strong>
            <small>
              {delta === null
                ? "new baseline"
                : delta > 0
                  ? `↑ ${delta} pts vs last week`
                  : delta < 0
                    ? `↓ ${Math.abs(delta)} pts vs last week`
                    : "same as last week"}
            </small>
          </div>
          <div>
            <span>Avg score</span>
            <strong>{data.overview.averageScore}/100</strong>
            <small>{data.overview.attempts} attempts</small>
          </div>
          <div>
            <span>Study activity</span>
            <strong>{data.overview.activeDays}/7 days</strong>
            <small>~{data.overview.completedPlanMinutes} plan minutes</small>
          </div>
          <div>
            <span>Plan complete</span>
            <strong>{data.overview.planCompletionPercent}%</strong>
            <small>{data.overview.completedPlanTasks}/{data.overview.totalPlanTasks} tasks</small>
          </div>
        </div>
      )}

      {open && data && (
        <div className="progressDetails">
          <div className="progressSection">
            <div className="progressSectionTitle">
              <div>
                <strong>Subject performance</strong>
                <span>Last 7 days</span>
              </div>
            </div>
            {data.subjects.length ? (
              <div className="subjectPerformanceList">
                {data.subjects.map((item) => (
                  <div key={item.subject} className="subjectPerformanceRow">
                    <div>
                      <strong>{item.subject}</strong>
                      <small>{item.attempts} attempts · avg {item.averageScore}/100</small>
                    </div>
                    <div className="performanceMeter" aria-label={`${item.subject} accuracy ${item.accuracy}%`}>
                      <span style={{ width: `${Math.max(0, Math.min(100, item.accuracy))}%` }} />
                    </div>
                    <em>{item.accuracy}%</em>
                  </div>
                ))}
              </div>
            ) : (
              <p className="progressEmpty">Abhi subject-wise practice data nahi hai.</p>
            )}
          </div>

          <div className="progressTopicGrid">
            <div className="progressSection">
              <div className="progressSectionTitle">
                <strong>Needs revision</strong>
              </div>
              {data.weakTopics.length ? (
                <div className="progressTopicList">
                  {data.weakTopics.slice(0, 5).map((item) => (
                    <div key={`weak-${item.subject}-${item.topic}`} className="progressTopic weak">
                      <div>
                        <strong>{item.topic}</strong>
                        <small>{item.subject}</small>
                      </div>
                      <em>{item.masteryScore}/100</em>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="progressEmpty">Abhi clear weak topic signal nahi hai.</p>
              )}
            </div>

            <div className="progressSection">
              <div className="progressSectionTitle">
                <strong>Strong topics</strong>
              </div>
              {data.strongTopics.length ? (
                <div className="progressTopicList">
                  {data.strongTopics.slice(0, 5).map((item) => (
                    <div key={`strong-${item.subject}-${item.topic}`} className="progressTopic strong">
                      <div>
                        <strong>{item.topic}</strong>
                        <small>{item.subject}</small>
                      </div>
                      <em>{item.masteryScore}/100</em>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="progressEmpty">Strong-topic data practice ke saath build hoga.</p>
              )}
            </div>
          </div>

          {data.recentMistakes.length > 0 && (
            <div className="progressSection">
              <div className="progressSectionTitle">
                <div>
                  <strong>Recent mistakes</strong>
                  <span>Revision priority</span>
                </div>
              </div>
              <div className="progressMistakeList">
                {data.recentMistakes.slice(0, 4).map((item, index) => (
                  <div key={index} className="progressMistake">
                    <div>
                      <strong>{item.subject} · {item.topic}</strong>
                      <small>{item.question}</small>
                    </div>
                    <em>{item.score}/100</em>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="parentSummaryCard">
            <div className="parentSummaryHead">
              <div>
                <span>PARENT WEEKLY SUMMARY</span>
                <strong>{data.parentSummary.headline}</strong>
              </div>
              <div>
                <button type="button" onClick={copyParentSummary}>Copy</button>
                <button type="button" onClick={shareParentSummary}>Share</button>
              </div>
            </div>

            <ul>
              {data.parentSummary.bullets.map((item, index) => <li key={index}>{item}</li>)}
            </ul>

            {data.parentSummary.focusNextWeek.length > 0 && (
              <div className="parentFocus">
                <strong>Next week focus</strong>
                <span>{data.parentSummary.focusNextWeek.join(" · ")}</span>
              </div>
            )}

            <small>{data.parentSummary.note}</small>
          </div>

          <button type="button" className="progressRefresh" onClick={() => void refresh()} disabled={busy}>
            {busy ? "Refreshing…" : "Refresh progress"}
          </button>
        </div>
      )}

      {message && <div className="progressMessage">{message}</div>}
    </section>
  );
}
