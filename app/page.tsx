"use client";

import { FormEvent, useMemo, useState } from "react";
import { LANGUAGES } from "@/lib/languages";
import type { StudyMode } from "@/lib/prompt";

type Message = { role: "user" | "assistant"; content: string };

const MODES: { id: StudyMode; label: string; emoji: string }[] = [
  { id: "chat", label: "Ask AI", emoji: "✨" },
  { id: "explain", label: "Explain", emoji: "🧠" },
  { id: "notes", label: "Notes", emoji: "📝" },
  { id: "quiz", label: "Quiz", emoji: "🎯" },
  { id: "exam", label: "Exam Prep", emoji: "📚" },
];

export default function Home() {
  const [language, setLanguage] = useState("Hinglish");
  const [mode, setMode] = useState<StudyMode>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const placeholder = useMemo(() => {
    if (mode === "notes") return "Topic ya chapter bhejo — main exam-ready notes banaunga...";
    if (mode === "quiz") return "Kis topic par quiz chahiye?";
    if (mode === "explain") return "Koi concept simple language me samjhana hai?";
    if (mode === "exam") return "Exam + subject + topic likho...";
    return "Kuch bhi pucho — Hindi, Hinglish ya apni language me...";
  }, [mode]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, language, mode }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI response failed");

      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brandWrap">
          <div className="logo">G</div>
          <div>
            <h1>Gen-z AI</h1>
            <p>India’s affordable multilingual AI study assistant</p>
          </div>
        </div>
        <select
          className="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Select response language"
        >
          {LANGUAGES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </header>

      <section className="hero">
        <span className="badge">Built for Indian students</span>
        <h2>Learn anything, <span>in your language.</span></h2>
        <p>Ask doubts, understand concepts, make notes, practice quizzes and prepare for exams.</p>
      </section>

      <section className="modes" aria-label="Study modes">
        {MODES.map((item) => (
          <button
            key={item.id}
            className={mode === item.id ? "mode active" : "mode"}
            onClick={() => setMode(item.id)}
          >
            <span>{item.emoji}</span>
            {item.label}
          </button>
        ))}
      </section>

      <section className="chatCard">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty">
              <div className="spark">✦</div>
              <h3>Namaste! Main Gen-z AI hoon.</h3>
              <p>Apna question likho. Main {language} me help karunga.</p>
              <div className="quickGrid">
                <button onClick={() => setInput("Class 10 electricity simple language me samjhao")}>⚡ Explain a chapter</button>
                <button onClick={() => setInput("Photosynthesis ke short exam notes banao")}>📝 Make notes</button>
                <button onClick={() => setInput("Indian Constitution par 5 MCQ quiz lo")}>🎯 Start a quiz</button>
                <button onClick={() => setInput("JEE ke liye quadratic equations revise karao")}>📚 Exam revision</button>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "message user" : "message assistant"}>
                <strong>{message.role === "user" ? "You" : "Gen-z AI"}</strong>
                <p>{message.content}</p>
              </div>
            ))
          )}
          {loading && <div className="message assistant"><strong>Gen-z AI</strong><p>Soch raha hoon…</p></div>}
        </div>

        {error && <div className="error">{error}</div>}

        <form className="composer" onSubmit={sendMessage}>
          <div className="comingRow">
            <span>📷 Photo Solve <small>next</small></span>
            <span>📄 Ask PDF <small>next</small></span>
          </div>
          <div className="inputRow">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              rows={2}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? "…" : "➤"}
            </button>
          </div>
        </form>
      </section>

      <footer>
        <strong>Gen-z AI</strong> · Student-first · Multilingual · Affordable
      </footer>
    </main>
  );
}
