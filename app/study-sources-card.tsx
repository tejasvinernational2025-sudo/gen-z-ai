"use client";

import { useEffect, useState } from "react";
import {
  createPdfStudySource,
  createTextStudySource,
  deleteStudySourceClient,
  listStudySourcesClient,
  type StudySourceSummary,
} from "@/lib/source-client";

type Props = {
  signedIn: boolean;
  activeSourceId: string;
  onActiveChange: (sourceId: string) => void;
  onSignIn: () => void;
};

async function pdfToDataUrl(file: File) {
  if (file.size > 2.5 * 1024 * 1024) {
    throw new Error("Source PDF 2.5 MB se chhoti honi chahiye.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf =
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;

  if (!isPdf) throw new Error("Valid PDF file select karo.");

  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:application/pdf;base64,${btoa(binary)}`;
}

export default function StudySourcesCard({
  signedIn,
  activeSourceId,
  onActiveChange,
  onSignIn,
}: Props) {
  const [sources, setSources] = useState<StudySourceSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"pdf" | "text">("pdf");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [text, setText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    if (!signedIn) {
      setSources([]);
      onActiveChange("");
      return;
    }

    try {
      const list = await listStudySourcesClient();
      setSources(list);
      if (activeSourceId && !list.some((item) => item.id === activeSourceId)) {
        onActiveChange("");
      }
    } catch {
      setSources([]);
    }
  }

  useEffect(() => {
    void refresh();
  }, [signedIn]);

  const active = sources.find((item) => item.id === activeSourceId) || null;

  async function saveSource() {
    if (!signedIn) {
      onSignIn();
      return;
    }
    if (!title.trim()) {
      setMessage("Book/chapter title likho.");
      return;
    }

    setBusy("save");
    setMessage("");
    try {
      let result: any;
      if (sourceType === "pdf") {
        if (!pdfFile) throw new Error("PDF select karo.");
        const pdfDataUrl = await pdfToDataUrl(pdfFile);
        result = await createPdfStudySource({
          title: title.trim(),
          subject: subject.trim(),
          chapter: chapter.trim(),
          pdfDataUrl,
        });
      } else {
        if (text.trim().length < 40) throw new Error("Chapter text thoda aur complete paste karo.");
        result = await createTextStudySource({
          title: title.trim(),
          subject: subject.trim(),
          chapter: chapter.trim(),
          text: text.trim(),
        });
      }

      await refresh();
      if (result?.source?.id) onActiveChange(result.source.id);
      setTitle("");
      setSubject("");
      setChapter("");
      setText("");
      setPdfFile(null);
      setOpen(false);
      setMessage("Study source save ho gaya aur grounding ON hai ✅");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Study source save nahi hua.");
    } finally {
      setBusy("");
    }
  }

  async function removeSource(sourceId: string) {
    setBusy(sourceId);
    setMessage("");
    try {
      await deleteStudySourceClient(sourceId);
      if (activeSourceId === sourceId) onActiveChange("");
      await refresh();
      setMessage("Study source remove ho gaya.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Source remove nahi hua.");
    } finally {
      setBusy("");
    }
  }

  if (!signedIn) {
    return (
      <section className="studySourcesCard">
        <div className="studySourcesHeader">
          <div>
            <span>CHAPTER / BOOK GROUNDING</span>
            <h3>📚 Apni book se answer lo</h3>
            <p>PDF ya chapter text save karke AI ko selected source ke andar answer karwao.</p>
          </div>
          <button type="button" onClick={onSignIn}>Sign in</button>
        </div>
      </section>
    );
  }

  return (
    <section className="studySourcesCard" aria-label="Chapter and book grounding">
      <div className="studySourcesHeader">
        <div>
          <span>CHAPTER / BOOK GROUNDING</span>
          <h3>📚 {active ? "Grounding ON" : "Apni book ko AI source banao"}</h3>
          <p>
            {active
              ? `${active.title}${active.chapter ? ` · ${active.chapter}` : ""}`
              : "Saved source select karo ya naya PDF/chapter add karo."}
          </p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)}>
          {open ? "Close" : "+ Add source"}
        </button>
      </div>

      {sources.length > 0 && (
        <div className="sourceList">
          <button
            type="button"
            className={!activeSourceId ? "sourceChip selected" : "sourceChip"}
            onClick={() => onActiveChange("")}
          >
            <strong>General AI</strong>
            <small>No book grounding</small>
          </button>
          {sources.map((source) => (
            <div key={source.id} className={activeSourceId === source.id ? "sourceChip selected" : "sourceChip"}>
              <button type="button" onClick={() => onActiveChange(source.id)}>
                <strong>{source.title}</strong>
                <small>
                  {[source.subject, source.chapter].filter(Boolean).join(" · ") || source.source_type.toUpperCase()}
                </small>
              </button>
              <button
                type="button"
                className="sourceDelete"
                aria-label={`Delete ${source.title}`}
                disabled={busy === source.id}
                onClick={() => void removeSource(source.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="sourceForm">
          <div className="sourceTypeTabs">
            <button type="button" className={sourceType === "pdf" ? "active" : ""} onClick={() => setSourceType("pdf")}>PDF</button>
            <button type="button" className={sourceType === "text" ? "active" : ""} onClick={() => setSourceType("text")}>Paste text</button>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book / chapter title" maxLength={160} />
          <div className="sourceMetaGrid">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" maxLength={100} />
            <input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Chapter (optional)" maxLength={160} />
          </div>

          {sourceType === "pdf" ? (
            <label className="sourceFileLabel">
              <span>{pdfFile ? pdfFile.name : "Choose PDF (max 2.5 MB)"}</span>
              <input type="file" accept=".pdf,application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            </label>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              maxLength={120000}
              placeholder="Chapter / notes / textbook text yahan paste karo…"
            />
          )}

          <button type="button" className="sourceSave" disabled={busy === "save"} onClick={saveSource}>
            {busy === "save" ? "Saving source…" : "Save & use this source"}
          </button>
        </div>
      )}

      {active && (
        <div className="groundingBanner">
          ✓ Answers, Photo Solve aur quizzes ko “{active.title}” se ground kiya jayega.
        </div>
      )}
      {message && <div className="sourceMessage">{message}</div>}
    </section>
  );
}
