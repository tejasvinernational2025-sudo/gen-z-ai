"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LANGUAGES } from "@/lib/languages";
import type { StudyMode } from "@/lib/prompt";
import { getSupabaseClient } from "@/lib/supabase";
import {
  getCurrentUser,
  listConversations,
  loadConversation,
  saveTurn,
  sendMagicLink,
  signOutUser,
  type SavedConversation,
} from "@/lib/chat-history";

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

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SavedConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    setSupabaseReady(Boolean(supabase));
    if (!supabase) return;

    getCurrentUser().then(setUser).catch(() => setUser(null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    listConversations(user.id)
      .then(setHistory)
      .catch(() => setNotice("History load nahi ho pai."));
  }, [user]);

  const placeholder = useMemo(() => {
    if (photoDataUrl) return "Photo ke baare me kya solve/samjhana hai? (optional)";
    if (mode === "notes") return "Topic ya chapter bhejo — main exam-ready notes banaunga...";
    if (mode === "quiz") return "Kis topic par quiz chahiye?";
    if (mode === "explain") return "Koi concept simple language me samjhana hai?";
    if (mode === "exam") return "Exam + subject + topic likho...";
    return "Kuch bhi pucho — Hindi, Hinglish ya apni language me...";
  }, [mode, photoDataUrl]);

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    const email = authEmail.trim();
    if (!email) return;

    setNotice("");
    try {
      await sendMagicLink(email);
      setNotice("Login link email par bhej diya gaya hai.");
      setAuthOpen(false);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Login start nahi ho saka.");
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      setMessages([]);
      setConversationId(null);
      setHistory([]);
      setHistoryOpen(false);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Sign out nahi ho saka.");
    }
  }

  function newChat() {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setError("");
    setPhotoDataUrl(null);
    setPhotoName("");
    setHistoryOpen(false);
  }

  function removePhoto() {
    setPhotoDataUrl(null);
    setPhotoName("");
  }

  function handlePhotoChange(file?: File) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("JPEG, PNG, WebP ya GIF image upload karo.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Photo 8 MB se chhoti honi chahiye.");
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setPhotoDataUrl(result);
      setPhotoName(file.name);
    };
    reader.onerror = () => setError("Photo read nahi ho pai.");
    reader.readAsDataURL(file);
  }

  async function openConversation(item: SavedConversation) {
    if (!user) return;

    try {
      const savedMessages = await loadConversation(user.id, item.id);
      setMessages(savedMessages);
      setConversationId(item.id);
      setLanguage(item.language || "Hinglish");
      setPhotoDataUrl(null);
      setPhotoName("");
      if (["chat", "explain", "notes", "quiz", "exam"].includes(item.mode)) {
        setMode(item.mode as StudyMode);
      }
      setHistoryOpen(false);
    } catch {
      setNotice("Saved chat open nahi ho pai.");
    }
  }

  async function refreshHistory() {
    if (!user) return;
    try {
      setHistory(await listConversations(user.id));
    } catch {
      setNotice("History refresh nahi ho pai.");
    }
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if ((!question && !photoDataUrl) || loading) return;

    const userText = question || "Is photo me jo study question hai use step-by-step solve karo.";
    const visibleText = photoDataUrl ? `📷 ${userText}` : userText;
    const nextMessages: Message[] = [...messages, { role: "user", content: visibleText }];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const endpoint = photoDataUrl ? "/api/photo-solve" : "/api/chat";
      const requestBody = photoDataUrl
        ? { imageDataUrl: photoDataUrl, prompt: userText, language, mode }
        : { messages: nextMessages, language, mode };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "AI response failed");

      const assistantMessage: Message = { role: "assistant", content: data.reply };
      setMessages((current) => [...current, assistantMessage]);
      setPhotoDataUrl(null);
      setPhotoName("");

      if (user) {
        try {
          const id = await saveTurn({
            userId: user.id,
            conversationId,
            mode,
            language,
            userText: visibleText,
            assistantText: data.reply,
          });
          if (id) setConversationId(id);
          await refreshHistory();
        } catch {
          setNotice("Answer mil gaya, lekin chat history save nahi ho pai.");
        }
      }
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

        <div className="topActions">
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

          {user ? (
            <>
              <button className="ghostButton" onClick={() => setHistoryOpen((value) => !value)}>History</button>
              <button className="accountButton" onClick={handleSignOut} title="Sign out">
                {user.email?.slice(0, 1).toUpperCase() || "U"}
              </button>
            </>
          ) : supabaseReady ? (
            <button className="ghostButton" onClick={() => setAuthOpen((value) => !value)}>Sign in</button>
          ) : (
            <span className="guestPill">Guest</span>
          )}
        </div>
      </header>

      {authOpen && (
        <form className="authPanel" onSubmit={submitLogin}>
          <div>
            <strong>Save your chats</strong>
            <span>Email par secure login link milega.</span>
          </div>
          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="student@example.com"
            required
          />
          <button type="submit">Send link</button>
        </form>
      )}

      {historyOpen && user && (
        <section className="historyPanel">
          <div className="historyHeader">
            <div>
              <strong>Your chats</strong>
              <span>{user.email}</span>
            </div>
            <button onClick={newChat}>+ New chat</button>
          </div>
          <div className="historyList">
            {history.length === 0 ? (
              <p>Abhi koi saved chat nahi hai.</p>
            ) : (
              history.map((item) => (
                <button key={item.id} onClick={() => openConversation(item)}>
                  <strong>{item.title}</strong>
                  <span>{item.language} · {item.mode}</span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {notice && <div className="notice">{notice}</div>}

      <section className="hero">
        <span className="badge">Built for Indian students</span>
        <h2>Learn anything, <span>in your language.</span></h2>
        <p>Ask doubts, understand concepts, solve questions from photos, make notes and prepare for exams.</p>
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
              <p>Question type karo ya photo upload karo. Main {language} me help karunga.</p>
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
          {photoDataUrl && (
            <div className="photoPreview">
              <img src={photoDataUrl} alt="Selected study question" />
              <div>
                <strong>Photo ready</strong>
                <span>{photoName || "Study image"}</span>
              </div>
              <button type="button" onClick={removePhoto} aria-label="Remove photo">✕</button>
            </div>
          )}

          <div className="comingRow">
            <label className="uploadLabel" htmlFor="photo-upload">📷 Photo Solve</label>
            <input
              id="photo-upload"
              className="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
            <span>📄 Ask PDF <small>next</small></span>
            {user ? <span>☁️ History on</span> : <span>👤 Guest mode</span>}
          </div>

          <div className="inputRow">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              rows={2}
            />
            <button type="submit" disabled={loading || (!input.trim() && !photoDataUrl)}>
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
