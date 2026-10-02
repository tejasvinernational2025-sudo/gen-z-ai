"use client";

import { useEffect, useMemo, useState } from "react";
import {
  generateDailyStudyPlan,
  getLearningSnapshot,
  saveLearningProfile,
  toggleDailyPlanItem,
  type LearningSnapshot,
} from "@/lib/learning-client";
import { getLearningHubUiText } from "@/lib/learning-hub-ui-i18n";

type Props = {
  signedIn: boolean;
  board: string;
  schoolClass: string;
  medium: string;
  language: string;
  onSignIn: () => void;
};

const GOALS = [
  "Overall improvement",
  "Board exam preparation",
  "Concept clarity",
  "Daily homework",
  "JEE foundation",
  "NEET foundation",
] as const;

const SUBJECTS = ["Mathematics", "Science", "English", "Hindi", "Social Science"];

export default function HomeTutorCard({
  signedIn,
  board,
  schoolClass,
  medium,
  language,
  onSignIn,
}: Props) {
  const [snapshot, setSnapshot] = useState<LearningSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number]>("Overall improvement");
  const [dailyMinutes, setDailyMinutes] = useState(30);
  const [subjects, setSubjects] = useState<string[]>(["Mathematics", "Science", "English"]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ui = getLearningHubUiText(medium, language);

  async function refresh() {
    if (!signedIn) {
      setSnapshot(null);
      return;
    }

    setLoading(true);
    try {
      const data = await getLearningSnapshot();
      setSnapshot(data);
      if (data.profile) {
        setGoal(
          GOALS.includes(data.profile.goal as (typeof GOALS)[number])
            ? (data.profile.goal as (typeof GOALS)[number])
            : "Overall improvement"
        );
        setDailyMinutes(data.profile.daily_minutes || 30);
        if (data.profile.preferred_subjects?.length) {
          setSubjects(data.profile.preferred_subjects);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Learning profile load nahi hua.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();

    const handler = () => void refresh();
    window.addEventListener("genz-learning-updated", handler);
    return () => window.removeEventListener("genz-learning-updated", handler);
  }, [signedIn]);

  const completedCount = useMemo(() => {
    if (!snapshot?.plan) return 0;
    return snapshot.plan.completed_keys?.length || 0;
  }, [snapshot]);

  function toggleSubject(subject: string) {
    setSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : current.length >= 5
          ? current
          : [...current, subject]
    );
  }

  async function saveAndPlan() {
    if (!signedIn) {
      onSignIn();
      return;
    }

    setBusy("save");
    setMessage("");
    try {
      await saveLearningProfile({
        board: board || null,
        schoolClass: schoolClass || null,
        medium: medium || null,
        goal,
        dailyMinutes,
        preferredSubjects: subjects,
      });
      await generateDailyStudyPlan();
      await refresh();
      window.dispatchEvent(new Event("genz-learning-updated"));
      setSettingsOpen(false);
      setMessage("AI Home Tutor profile aur aaj ka study plan ready hai ✅");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profile save nahi hua.");
    } finally {
      setBusy("");
    }
  }

  async function regeneratePlan() {
    setBusy("plan");
    setMessage("");
    try {
      await generateDailyStudyPlan();
      await refresh();
      window.dispatchEvent(new Event("genz-learning-updated"));
      setMessage("Aaj ka plan weak topics ke hisaab se refresh ho gaya.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Study plan refresh nahi hua.");
    } finally {
      setBusy("");
    }
  }

  async function toggleItem(key: string) {
    setBusy(key);
    try {
      await toggleDailyPlanItem(key);
      await refresh();
      window.dispatchEvent(new Event("genz-learning-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Task update nahi hua.");
    } finally {
      setBusy("");
    }
  }

  if (!signedIn) {
    return (
      <section className="homeTutorCard">
        <div className="homeTutorHeader">
          <div>
            <span className="homeTutorEyebrow">{ui.homeEyebrow}</span>
            <h3>{ui.homeSignedOutTitle}</h3>
            <p>{ui.homeSignedOutDesc}</p>
          </div>
          <button type="button" onClick={onSignIn}>{ui.signIn}</button>
        </div>
      </section>
    );
  }

  const profile = snapshot?.profile;
  const plan = snapshot?.plan;
  const weakTopics = snapshot?.weakTopics || [];

  return (
    <section className="homeTutorCard" aria-label="AI home tutor">
      <div className="homeTutorHeader">
        <div>
          <span className="homeTutorEyebrow">{ui.homeEyebrow}</span>
          <h3>{profile ? ui.homeTodayPlan : ui.homeSetupTitle}</h3>
          <p>
            {profile
              ? `${profile.school_class || schoolClass} · ${profile.goal} · ${profile.daily_minutes} min/day`
              : ui.homeProfileDesc}
          </p>
        </div>
        <button
          type="button"
          className="homeTutorSecondary"
          onClick={() => setSettingsOpen((value) => !value)}
        >
          {settingsOpen ? ui.close : profile ? ui.editProfile : ui.setUp}
        </button>
      </div>

      {(settingsOpen || !profile) && (
        <div className="homeTutorSettings">
          <label>
            <span>{ui.dailyTarget}</span>
            <select value={dailyMinutes} onChange={(e) => setDailyMinutes(Number(e.target.value))}>
              {[20, 30, 45, 60, 90].map((item) => (
                <option key={item} value={item}>{item} minutes</option>
              ))}
            </select>
          </label>

          <label>
            <span>{ui.mainGoal}</span>
            <select value={goal} onChange={(e) => setGoal(e.target.value as (typeof GOALS)[number])}>
              {GOALS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <div className="subjectPicker">
            <span>{ui.focusSubjects}</span>
            <div>
              {SUBJECTS.map((subject) => (
                <button
                  type="button"
                  key={subject}
                  className={subjects.includes(subject) ? "selected" : ""}
                  onClick={() => toggleSubject(subject)}
                >
                  {subjects.includes(subject) ? "✓ " : ""}{subject}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="homeTutorPrimary"
            disabled={busy === "save" || subjects.length === 0}
            onClick={saveAndPlan}
          >
            {busy === "save" ? ui.saving : ui.saveProfile}
          </button>
        </div>
      )}

      {profile && (
        <>
          <div className="learningSummaryGrid">
            <div>
              <span>{ui.dailyTarget}</span>
              <strong>{profile.daily_minutes} min</strong>
            </div>
            <div>
              <span>{ui.weakTracked}</span>
              <strong>{weakTopics.filter((item) => item.mastery_score < 70).length}</strong>
            </div>
            <div>
              <span>{ui.todayProgress}</span>
              <strong>{plan ? `${completedCount}/${plan.items.length}` : "0/0"}</strong>
            </div>
          </div>

          {weakTopics.length > 0 && (
            <div className="weakTopics">
              <div className="homeTutorSectionTitle">
                <strong>{ui.topicsAttention}</strong>
                <span>AI chats aur quizzes se automatically update hote hain</span>
              </div>
              <div className="weakTopicList">
                {weakTopics.slice(0, 4).map((item) => (
                  <div key={`${item.subject}-${item.topic}`} className="weakTopicChip">
                    <span>{item.subject}</span>
                    <strong>{item.topic}</strong>
                    <em>{item.mastery_score}/100</em>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dailyPlan">
            <div className="homeTutorSectionTitle">
              <div>
                <strong>{ui.todayPlan}</strong>
                <span>{plan ? "Learn → Practice → Recall" : "Plan abhi generate nahi hua"}</span>
              </div>
              <button
                type="button"
                className="homeTutorSecondary"
                onClick={regeneratePlan}
                disabled={busy === "plan"}
              >
                {busy === "plan" ? ui.saving : plan ? ui.refreshPlan : ui.makePlan}
              </button>
            </div>

            {plan?.items?.length ? (
              <div className="planItems">
                {plan.items.map((item) => {
                  const done = plan.completed_keys?.includes(item.key);
                  return (
                    <button
                      type="button"
                      key={item.key}
                      className={done ? "planItem done" : "planItem"}
                      onClick={() => toggleItem(item.key)}
                      disabled={busy === item.key}
                    >
                      <span className="planCheck">{done ? "✓" : "○"}</span>
                      <span className="planCopy">
                        <strong>{item.subject} · {item.minutes} min</strong>
                        <small>{item.task}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="homeTutorEmpty">Profile save karke aaj ka personalized plan banao.</p>
            )}
          </div>
        </>
      )}

      {loading && <div className="homeTutorMessage">Learning profile refresh ho rahi hai…</div>}
      {message && <div className="homeTutorMessage">{message}</div>}
    </section>
  );
}
