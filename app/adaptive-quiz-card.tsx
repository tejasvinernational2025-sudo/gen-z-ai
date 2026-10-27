"use client";

import { useEffect, useMemo, useState } from "react";
import { getAccessToken } from "@/lib/chat-history";
import { getQuizUiText } from "@/lib/quiz-ui-i18n";

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
  sourceId: string;
  schoolClass: string;
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

const QUIZ_TOPICS: Record<string, string[]> = {
  "Science": ["Chemical Reactions and Equations", "Acids, Bases and Salts", "Life Processes", "Light: Reflection and Refraction", "Electricity", "Cell Structure", "Human Physiology"],
  "Mathematics": ["Real Numbers", "Polynomials", "Quadratic Equations", "Triangles", "Trigonometry", "Statistics", "Probability"],
  "Social Science": ["Nationalism in India", "Resources and Development", "Power Sharing", "Federalism", "Development", "Indian Constitution"],
  "English": ["Reading Comprehension", "Grammar", "Writing Skills", "Literature"],
  "History": ["Ancient India", "Medieval India", "Modern India", "Indian National Movement"],
  "Geography": ["Physical Geography", "Indian Geography", "Climate", "Rivers", "Resources"],
  "Polity": ["Constitution", "Fundamental Rights", "Parliament", "Judiciary", "Federalism"],
  "Economy": ["National Income", "Inflation", "Banking", "Budget", "Economic Development"],
  "CSAT": ["Comprehension", "Logical Reasoning", "Quantitative Aptitude", "Data Interpretation"]
};

const CLASS_TOPICS: Record<string, Record<string, string[]>> = {
  "Class 9": {
    "Science": ["Matter in Our Surroundings", "Is Matter Around Us Pure?", "Atoms and Molecules", "Structure of the Atom", "The Fundamental Unit of Life", "Tissues", "Motion", "Force and Laws of Motion", "Gravitation", "Work and Energy", "Sound"],
    "Mathematics": ["Number Systems", "Polynomials", "Coordinate Geometry", "Linear Equations in Two Variables", "Lines and Angles", "Triangles", "Quadrilaterals", "Circles", "Heron's Formula", "Surface Areas and Volumes", "Statistics"]
  },
  "Class 10": {
    "Science": ["Chemical Reactions and Equations", "Acids, Bases and Salts", "Metals and Non-metals", "Carbon and its Compounds", "Life Processes", "Control and Coordination", "How do Organisms Reproduce?", "Heredity", "Light: Reflection and Refraction", "The Human Eye and the Colourful World", "Electricity", "Magnetic Effects of Electric Current", "Our Environment"],
    "Mathematics": ["Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry", "Some Applications of Trigonometry", "Circles", "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability"],
    "Social Science": ["Nationalism in Europe", "Nationalism in India", "Resources and Development", "Water Resources", "Agriculture", "Power Sharing", "Federalism", "Political Parties", "Development", "Sectors of the Indian Economy", "Money and Credit"]
  }
};

const UPSC_TOPICS: Record<string, Record<string, string[]>> = {
  "UPSC Prelims": {
    "History": ["Ancient India", "Medieval India", "Modern India", "Indian National Movement", "Art and Culture"],
    "Geography": ["Physical Geography", "Indian Geography", "World Geography", "Climatology", "Mapping"],
    "Polity": ["Constitution", "Fundamental Rights", "Parliament", "Judiciary", "Federalism", "Constitutional Bodies"],
    "Economy": ["National Income", "Inflation", "Banking", "Fiscal Policy", "Economic Development"],
    "Environment": ["Ecology", "Biodiversity", "Climate Change", "Conservation"],
    "Science & Technology": ["Space", "Biotechnology", "Information Technology", "Basic Science"]
  },
  "UPSC Mains": {
    "GS Paper I": ["Indian Heritage and Culture", "Modern Indian History", "World History", "Indian Society", "Geography"],
    "GS Paper II": ["Constitution", "Governance", "Social Justice", "International Relations"],
    "GS Paper III": ["Indian Economy", "Agriculture", "Science and Technology", "Environment", "Disaster Management", "Internal Security"],
    "GS Paper IV": ["Ethics and Human Interface", "Attitude", "Aptitude and Foundational Values", "Emotional Intelligence", "Probity in Governance", "Case Studies"],
    "Essay": ["Social Issues", "Governance", "Economy", "Philosophical Themes"]
  },
  "UPSC CSAT": {
    "CSAT": ["Reading Comprehension", "Logical Reasoning", "Analytical Ability", "Decision Making", "Basic Numeracy", "Data Interpretation"]
  }
};

export default function AdaptiveQuizCard({ signedIn, language, studentContext, sourceId, schoolClass }: Props) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Science");
  const [pack, setPack] = useState<QuizPack | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const ui = getQuizUiText(studentContext, language);
  const examTopics = UPSC_TOPICS[studentContext];
  const classTopics = examTopics || CLASS_TOPICS[schoolClass];
  const availableSubjects = classTopics ? Object.keys(classTopics) : Object.keys(QUIZ_TOPICS);
  const availableTopics = classTopics ? (classTopics[subject] || []) : (QUIZ_TOPICS[subject] || []);
  const selectedSubject = availableSubjects.includes(subject) ? subject : availableSubjects[0];
  const selectedTopics = classTopics ? (classTopics[selectedSubject] || []) : (QUIZ_TOPICS[selectedSubject] || []);

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
      setError("Please select a chapter or enter a topic.");
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
      const payload = JSON.stringify({
        action: "generate_quiz",
        topic: topic.trim(),
        subject: selectedSubject,
        studentContext,
        language,
        sourceId: sourceId || undefined,
        difficulty: nextDifficulty,
      });

      let response = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: payload,
      });

      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        response = await fetch("/api/practice", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: payload,
        });
      }

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

    // Guest quizzes do not save attempts; grade instantly using the generated answer key.
    if (!signedIn) {
      const correct = selected === question.correctIndex;
      setResult({
        correct,
        feedback: correct ? "✅" : `✓ ${question.options[question.correctIndex]}`,
        explanation: question.explanation,
        nextDifficulty: correct
          ? question.difficulty === "easy" ? "medium" : "hard"
          : question.difficulty === "hard" ? "medium" : "easy",
      });
      if (correct) setCorrectCount((value) => value + 1);
      setBusy("");
      return;
    }

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
          language,
          studentContext,
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
    return `${ui.question} ${index + 1}/${pack.questions.length}`;
  }, [pack, index, ui.question]);

  return (
    <section className="adaptiveQuiz" aria-label="Adaptive quiz and mistake analysis">
      <div className="adaptiveQuizHead">
        <div>
          <span>{ui.eyebrow}</span>
          <h4>🎯 {ui.title}</h4>
          <p>{ui.description}</p>
        </div>
        {pack && <em>{ui.level[pack.adaptiveDifficulty]}</em>}
      </div>

      {!pack && (
        <div className="quizSetup">
          <p style={{margin:"0 0 8px"}}>{examTopics ? <>Exam: <strong>{studentContext}</strong> · Exam-wise topics</> : <>Selected class: <strong>{schoolClass}</strong>{!classTopics ? " · General topic suggestions (class-wise chapters coming soon)" : " · Class-wise chapter suggestions"}</>}</p>
          <label style={{fontWeight:700}}>1. Choose Subject</label>
          <select aria-label="Quiz subject" value={selectedSubject} onChange={(e) => {setSubject(e.target.value);setTopic("");}} style={{width:"100%",padding:12,borderRadius:10}}>
            {availableSubjects.map((name)=><option key={name} value={name}>{name}</option>)}
          </select>
          <label style={{fontWeight:700}}>2. Choose Topic</label>
          <select aria-label="Quiz topic" value={selectedTopics.includes(topic) ? topic : ""} onChange={(e)=>setTopic(e.target.value)} style={{width:"100%",padding:12,borderRadius:10}}>
            <option value="">Select a topic</option>
            {selectedTopics.map((name)=><option key={name} value={name}>{name}</option>)}
          </select>
          <input
            aria-label="Custom quiz topic (optional)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Or type your own topic (optional)"
            maxLength={140}
          />
          <button type="button" onClick={() => void generateQuiz()} disabled={busy === "generate"}>
            {busy === "generate" ? ui.generating : ui.start}
          </button>
        </div>
      )}

      {question && pack && (
        <div className="quizQuestionCard">
          <div className="quizMeta">
            <strong>{progressText}</strong>
            <span>{ui.level[question.difficulty]}</span>
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
              {busy === "grade" ? ui.checking : ui.check}
            </button>
          ) : (
            <div className={result.correct ? "quizResult correct" : "quizResult incorrect"}>
              <strong>{result.correct ? `✅ ${ui.correct}` : `🔁 ${ui.needsPractice}`}</strong>
              <p>{result.feedback}</p>
              {result.explanation && <small>{result.explanation}</small>}
              <button type="button" onClick={nextQuestion}>
                {index < pack.questions.length - 1 ? ui.nextQuestion : ui.nextSet}
              </button>
            </div>
          )}
        </div>
      )}

      {pack && (
        <div className="quizScoreStrip">
          <span>{ui.currentSet}</span>
          <strong>{correctCount}/{index + (result ? 1 : 0)} {ui.correctCount}</strong>
        </div>
      )}

      {signedIn && performance && (
        <div className="mistakeAnalysis">
          <div className="mistakeStats">
            <div><span>{ui.attempts}</span><strong>{performance.totalAttempts}</strong></div>
            <div><span>{ui.accuracy}</span><strong>{performance.accuracy}%</strong></div>
            <div><span>{ui.avgScore}</span><strong>{performance.averageScore}</strong></div>
          </div>

          {performance.weakTopics.length > 0 && (
            <div className="mistakeBlock">
              <strong>{ui.weakTopics}</strong>
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
              <strong>{ui.recentMistakes}</strong>
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
        <small className="quizSignInHint">{ui.signInHint}</small>
      )}

      {error && <div className="practiceError"><span>{error}</span></div>}
    </section>
  );
}
