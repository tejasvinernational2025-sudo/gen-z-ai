"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LANGUAGES } from "@/lib/languages";
import { STUDY_CONTEXTS, type StudyContext } from "@/lib/study-contexts";
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

async function compressPhotoForUpload(file: File): Promise<string> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Photo decode nahi ho pai."));
      img.src = sourceUrl;
    });

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo process nahi ho pai.");

    let quality = 0.82;
    let dataUrl = "";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      dataUrl = canvas.toDataURL("image/jpeg", quality);

      // Keep JSON request comfortably below Vercel's function body ceiling.
      if (dataUrl.length <= 3_200_000) break;

      quality = Math.max(0.58, quality - 0.08);
      width = Math.max(720, Math.round(width * 0.88));
      height = Math.max(720, Math.round(height * 0.88));
    }

    if (!dataUrl || dataUrl.length > 3_600_000) {
      throw new Error("Photo bahut badi hai. Thoda closer/cropped photo kheench kar try karo.");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function readApiJson(response: Response) {
  const raw = await response.text();

  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    if (response.status === 413) {
      throw new Error("Upload size zyada hai. Chhoti photo/PDF ke saath dobara try karo.");
    }

    throw new Error(
      response.ok
        ? "Server response read nahi ho saka."
        : `Server error (${response.status}). Thodi der baad dobara try karo.`
    );
  }
}

export default function Home() {
  const [language, setLanguage] = useState("Hinglish");
  const [studentContext, setStudentContext] = useState<StudyContext>("General");
  const [mode, setMode] = useState<StudyMode>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");

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
    if (pdfDataUrl) return "PDF se kya karna hai? Notes, summary, MCQ ya koi question...";
    if (photoDataUrl) return "Photo ke baare me kya solve/samjhana hai? (optional)";
    if (mode === "notes") return "Topic ya chapter bhejo — main exam-ready notes banaunga...";
    if (mode === "quiz") return "Kis topic par quiz chahiye?";
    if (mode === "explain") return "Koi concept simple language me samjhana hai?";
    if (mode === "exam") return "Exam + subject + topic likho...";
    return "Kuch bhi pucho — Hindi, Hinglish ya apni language me...";
  }, [mode, photoDataUrl, pdfDataUrl]);

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
    setPdfDataUrl(null);
    setPdfName("");
    setHistoryOpen(false);
  }

  function removePhoto() {
    setPhotoDataUrl(null);
    setPhotoName("");
  }

  function removePdf() {
    setPdfDataUrl(null);
    setPdfName("");
  }

  async function handlePhotoChange(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Photo/image file upload karo.");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setError("Source photo 12 MB se chhoti honi chahiye.");
      return;
    }

    setError("");
    setNotice("Photo optimize ho rahi hai…");

    try {
      const optimized = await compressPhotoForUpload(file);
      setPhotoDataUrl(optimized);
      setPhotoName(file.name || "camera-photo.jpg");
      setPdfDataUrl(null);
      setPdfName("");
      setNotice("");
    } catch (err) {
      setNotice("");
      setError(err instanceof Error ? err.message : "Photo process nahi ho pai.");
    }
  }

  async function handlePdfChange(file?: File) {
    if (!file) return;

    setError("");

    if (file.size > 2.5 * 1024 * 1024) {
      setError("PDF 2.5 MB se chhoti honi chahiye.");
      return;
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      // Trust the file content, not Android's MIME type or display name.
      const isPdf =
        bytes.length >= 5 &&
        bytes[0] === 0x25 && // %
        bytes[1] === 0x50 && // P
        bytes[2] === 0x44 && // D
        bytes[3] === 0x46 && // F
        bytes[4] === 0x2d;   // -

      if (!isPdf) {
        setError("Ye file valid PDF nahi lag rahi. Downloaded .pdf file select karo.");
        return;
      }

      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }

      const base64 = btoa(binary);
      setPdfDataUrl(`data:application/pdf;base64,${base64}`);
      setPdfName(file.name || "study.pdf");
      setPhotoDataUrl(null);
      setPhotoName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF read nahi ho pai.");
    }
  }

  async function loadSamplePdf() {
    setError("");
    setNotice("Sample PDF load ho rahi hai…");

    try {
      const response = await fetch("/api/sample-pdf", { cache: "no-store" });
      if (!response.ok) throw new Error("Sample PDF load nahi ho pai.");

      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }

      const base64 = btoa(binary);
      setPdfDataUrl(`data:application/pdf;base64,${base64}`);
      setPdfName("genz-ai-test.pdf");
      setPhotoDataUrl(null);
      setPhotoName("");
      setNotice("");
    } catch (err) {
      setNotice("");
      setError(err instanceof Error ? err.message : "Sample PDF load nahi ho pai.");
    }
  }

  async function openConversation(item: SavedConversation) {
    if (!user) return;

    try {
      const savedMessages = await loadConversation(user.id, item.id);
      setMessages(savedMessages);
      setConversationId(item.id);
      setLanguage(item.language || "Hinglish");
      if (STUDY_CONTEXTS.includes(item.student_context as StudyContext)) {
        setStudentContext(item.student_context as StudyContext);
      } else {
        setStudentContext("General");
      }
      setPhotoDataUrl(null);
      setPhotoName("");
      setPdfDataUrl(null);
      setPdfName("");
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
    if ((!question && !photoDataUrl && !pdfDataUrl) || loading) return;

    const userText =
      question ||
      (pdfDataUrl
        ? "Is PDF ko student ke liye summarize karo aur important revision points do."
        : "Is photo me jo study question hai use step-by-step solve karo.");

    const visibleText = pdfDataUrl
      ? `📄 ${userText}`
      : photoDataUrl
        ? `📷 ${userText}`
        : userText;
    const nextMessages: Message[] = [...messages, { role: "user", content: visibleText }];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const endpoint = pdfDataUrl
        ? "/api/pdf-study"
        : photoDataUrl
          ? "/api/photo-solve"
          : "/api/chat";

      const requestBody = pdfDataUrl
        ? { pdfDataUrl, prompt: userText, language, mode, studentContext }
        : photoDataUrl
          ? { imageDataUrl: photoDataUrl, prompt: userText, language, mode, studentContext }
          : { messages: nextMessages, language, mode, studentContext };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await readApiJson(response);
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
            studentContext,
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
            <p>India-first affordable AI tutor</p>
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
                  <span>{item.student_context || "General"} · {item.language} · {item.mode}</span>
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {notice && <div className="notice">{notice}</div>}

      <section className="hero">
        <span className="badge">Built for every Indian student</span>
        <h2>Study smarter, <span>in your language.</span></h2>
        <p>Ask doubts, understand concepts, solve questions from photos, study PDFs, make notes and prepare for exams.</p>
      </section>

      <section className="contextBar" aria-label="Student context">
        <div>
          <strong>Study context</strong>
          <span>Class/Exam ke hisaab se answer ki depth set karo</span>
        </div>
        <select
          className="contextSelect"
          value={studentContext}
          onChange={(e) => setStudentContext(e.target.value as StudyContext)}
          aria-label="Select class or exam"
        >
          {STUDY_CONTEXTS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
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
              <p>{studentContext} context me question type karo, photo ya PDF upload karo. Main {language} me help karunga.</p>
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

          {pdfDataUrl && (
            <div className="pdfPreview">
              <div className="pdfIcon">PDF</div>
              <div>
                <strong>PDF ready</strong>
                <span>{pdfName || "Study PDF"}</span>
              </div>
              <button type="button" onClick={removePdf} aria-label="Remove PDF">✕</button>
            </div>
          )}

          <div className="comingRow">
            <label className="uploadLabel" htmlFor="photo-upload">📷 Photo Solve</label>
            <input
              id="photo-upload"
              className="fileInput"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
            <label className="uploadLabel" htmlFor="pdf-upload">📄 Ask PDF</label>
            <button type="button" className="uploadLabel" onClick={loadSamplePdf}>⬇ Sample PDF</button>
            <input
              id="pdf-upload"
              className="fileInput"
              type="file"
              accept=".pdf,application/pdf,*/*"
              onChange={async (e) => { const file = e.target.files?.[0]; await handlePdfChange(file); e.currentTarget.value = ""; }}
            />
            {user ? <span>☁️ History on</span> : <span>👤 Guest mode</span>}
          </div>

          <div className="inputRow">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              rows={2}
            />
            <button type="submit" disabled={loading || (!input.trim() && !photoDataUrl && !pdfDataUrl)}>
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
