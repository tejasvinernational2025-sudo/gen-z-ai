"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LANGUAGES } from "@/lib/languages";
import { getComposerUiText } from "@/lib/composer-ui-i18n";
import { getLearningHubUiText } from "@/lib/learning-hub-ui-i18n";
import { STUDY_CONTEXTS, SCHOOL_BOARDS, SCHOOL_CLASSES, STUDY_MEDIUMS, buildBoardStudyContext, normalizeStudyContext, type StudyContext } from "@/lib/study-contexts";
import type { StudyMode } from "@/lib/prompt";
import HomeTutorCard from "@/app/home-tutor-card";
import AdaptivePracticeCard from "@/app/adaptive-practice-card";
import AdaptiveQuizCard from "@/app/adaptive-quiz-card";
import StudySourcesCard from "@/app/study-sources-card";
import ProgressDashboardCard from "@/app/progress-dashboard-card";
import SmartRevisionCard from "@/app/smart-revision-card";
import { trackLearningTurn } from "@/lib/learning-client";
import { getSupabaseClient } from "@/lib/supabase";
import {
  completeAuthFromUrl,
  getAccessToken,
  getCurrentUser,
  listConversations,
  loadConversation,
  saveTurn,
  sendMagicLink,
  signInWithGoogle,
  signOutUser,
  type SavedConversation,
} from "@/lib/chat-history";

type Message = { role: "user" | "assistant"; content: string };

type PaymentPlanConfig = {
  id: "student" | "student_plus";
  name: string;
  amount: number | null;
  currency: "INR";
  validityDays: number | null;
  configured: boolean;
};

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; close?: () => void };
  }
}

type QuotaBucket = { used: number; limit: number; remaining: number };
type QuotaStatus = {
  plan: string;
  resets_at: string;
  chat: QuotaBucket;
  photo: QuotaBucket;
  pdf: QuotaBucket;
};

const PLAN_CARDS = [
  { id: "free", name: "Free", chat: 20, photo: 3, pdf: 2, note: "Daily free learning" },
  { id: "student", name: "Student", chat: 100, photo: 15, pdf: 10, note: "For regular study" },
  { id: "student_plus", name: "Student Plus", chat: 300, photo: 40, pdf: 30, note: "For heavy study & exam prep" },
] as const;

function displayPlanName(plan: string) {
  if (plan === "student_plus") return "Student Plus";
  if (plan === "student") return "Student";
  return "Free";
}

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

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : <span key={index}>{part}</span>
  );
}

function FormattedAnswer({ text }: { text: string }) {
  return <div className="formattedAnswer">{text.split("\n").map((line, index) => {
    const clean = line.trim();
    if (!clean) return <div className="answerGap" key={index} />;
    if (/^#{1,3}\s/.test(clean)) return <h3 key={index}>{renderInlineMarkdown(clean.replace(/^#{1,3}\s*/, ""))}</h3>;
    if (/^(?:[-•]|\*)\s+/.test(clean)) return <div className="answerBullet" key={index}><span>•</span><p>{renderInlineMarkdown(clean.replace(/^(?:[-•]|\*)\s+/, ""))}</p></div>;
    return <p key={index}>{renderInlineMarkdown(line)}</p>;
  })}</div>;
}

const LANGUAGE_STORAGE_KEY = "genz-language";

export default function Home() {
  const [language, setLanguage] = useState("Hinglish");
  const [studentContext, setStudentContext] = useState<StudyContext>("General");
  const [schoolBoard, setSchoolBoard] = useState("");
  const [schoolClass, setSchoolClass] = useState("Class 10");
  const [studyMedium, setStudyMedium] = useState("Hindi Medium");
  const effectiveStudentContext = schoolBoard
    ? buildBoardStudyContext(schoolBoard, schoolClass, studyMedium)
    : studentContext;
  const learningStudentContext = schoolBoard
    ? effectiveStudentContext
    : `${studentContext} | ${schoolClass} | ${studyMedium}`;
  const composerUi = getComposerUiText(effectiveStudentContext, language);
  const learningUi = getLearningHubUiText(learningStudentContext, language);
  const [mode, setMode] = useState<StudyMode>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [practiceSeed, setPracticeSeed] = useState<{ question: string; answer: string } | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authCooldown, setAuthCooldown] = useState(0);
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SavedConversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlanConfig[]>([]);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentLoadingPlan, setPaymentLoadingPlan] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState("");

  function chooseLanguage(value: string) {
    const nextLanguage = value.trim() || "Hinglish";
    setLanguage(nextLanguage);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    } catch {
      // Ignore private-mode/storage failures; in-memory selection still works.
    }
  }

  useEffect(() => {
    try {
      const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && LANGUAGES.some((item) => item === savedLanguage)) {
        setLanguage(savedLanguage);
      }
    } catch {
      // Keep the default language when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    setSupabaseReady(Boolean(supabase));
    if (!supabase) return;

    let active = true;

    (async () => {
      try {
        const callbackUser = await completeAuthFromUrl();
        if (active && callbackUser) {
          setUser(callbackUser);
          setNotice("Sign in successful. Chat history on hai.");
          return;
        }

        const currentUser = await getCurrentUser();
        if (active) setUser(currentUser);
      } catch (err) {
        if (active) {
          setUser(null);
          setNotice(
            err instanceof Error
              ? `Login complete nahi hua: ${err.message}`
              : "Login complete nahi hua."
          );
        }
      }
    })();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setAuthCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [authCooldown]);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    listConversations(user.id)
      .then(setHistory)
      .catch(() => setNotice("History load nahi ho pai."));
  }, [user]);

  async function refreshQuota() {
    if (!user) {
      setQuota(null);
      return;
    }

    setQuotaLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setQuota(null);
        return;
      }

      const response = await fetch("/api/quota", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      const data = await readApiJson(response);
      if (!response.ok) throw new Error(data?.error || "Usage status load nahi hua.");
      setQuota(data as QuotaStatus);
    } catch {
      setQuota(null);
    } finally {
      setQuotaLoading(false);
    }
  }

  useEffect(() => {
    if (!user) {
      setQuota(null);
      return;
    }
    void refreshQuota();
  }, [user]);

  async function reconcilePayment(orderId?: string) {
    const accessToken = await getAccessToken();
    if (!accessToken) return null;

    const response = await fetch("/api/payments/reconcile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderId ? { orderId } : {}),
    });
    const result = await readApiJson(response);
    if (!response.ok) throw new Error(result?.error || "Payment status check nahi hua.");

    if (result?.activated) {
      setNotice(`${displayPlanName(result?.plan || "student")} plan activate ho gaya ✅`);
      await refreshQuota();
    }

    return result;
  }

  useEffect(() => {
    if (!user) return;
    void reconcilePayment().catch(() => {});
  }, [user]);

  useEffect(() => {
    fetch("/api/payments/config", { cache: "no-store" })
      .then(async (response) => {
        const data = await readApiJson(response);
        if (!response.ok) throw new Error(data?.error || "Payment config load nahi hua.");
        setPaymentReady(Boolean(data?.ready));
        setPaymentPlans(Array.isArray(data?.plans) ? data.plans : []);
      })
      .catch(() => {
        setPaymentReady(false);
        setPaymentPlans([]);
      });
  }, []);

  const placeholder = useMemo(() => {
    if (pdfDataUrl) return composerUi.placeholders.pdf;
    if (photoDataUrl) return composerUi.placeholders.photo;
    return composerUi.placeholders[mode];
  }, [mode, photoDataUrl, pdfDataUrl, composerUi]);

  async function handleGoogleSignIn() {
    setNotice("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setNotice(
        err instanceof Error
          ? `Google sign-in start nahi hua: ${err.message}`
          : "Google sign-in start nahi hua."
      );
    }
  }

  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    const email = authEmail.trim();
    if (!email) return;

    setNotice("");
    try {
      await sendMagicLink(email);
      setAuthCooldown(60);
      setNotice("Login link email par bhej diya gaya hai. 60 sec tak resend mat karo.");
      setAuthOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login start nahi ho saka.";
      if (/rate limit/i.test(message)) {
        setAuthCooldown(60);
        setNotice("Email rate limit hit ho gai hai. Thoda wait karke dobara try karo.");
      } else {
        setNotice(message);
      }
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
      setMessages([]);
      setConversationId(null);
      setHistory([]);
      setHistoryOpen(false);
      setQuota(null);
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
    setPracticeSeed(null);
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
      chooseLanguage(item.language || "Hinglish");
      setStudentContext(normalizeStudyContext(item.student_context));
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

  async function loadRazorpayCheckout() {
    if (window.Razorpay) return;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Razorpay checkout load nahi hua.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Razorpay checkout load nahi hua."));
      document.body.appendChild(script);
    });
  }

  async function startLiveCheckout(planId: "student" | "student_plus") {
    if (!user) {
      setAuthOpen(true);
      setNotice("Paid plan ke liye pehle sign in karo.");
      return;
    }

    if (!paymentReady || paymentLoadingPlan) return;

    setPaymentLoadingPlan(planId);
    setError("");
    setNotice("");

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Session expire ho gayi. Dobara sign in karo.");

      const response = await fetch("/api/payments/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ plan: planId }),
      });
      const order = await readApiJson(response);
      if (!response.ok) throw new Error(order?.error || "Live payment order create nahi hua.");

      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay checkout available nahi hai.");

      let paymentCompleted = false;
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Gen-z AI",
        description: `${order.planName} plan`,
        order_id: order.orderId,
        prefill: { email: order.email || user.email || "" },
        notes: { plan: order.plan },
        theme: { color: "#6b4df3" },
        handler: async (payment: RazorpaySuccess) => {
          try {
            setNotice("Payment verify ho rahi hai…");
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(payment),
            });
            const result = await readApiJson(verifyResponse);
            if (!verifyResponse.ok) throw new Error(result?.error || "Payment verify nahi hui.");

            if (result?.pending) {
              setNotice("Payment receive hui hai. Capture hote hi plan automatically activate ho jayega.");
              return;
            }

            paymentCompleted = true;
            setNotice(`${displayPlanName(result?.plan || planId)} plan activate ho gaya ✅`);
            await refreshQuota();
          } catch (verifyError) {
            setError(verifyError instanceof Error ? verifyError.message : "Payment verify nahi hui.");
          }
        },
      });

      checkout.open();

      const startedAt = Date.now();
      const timer = window.setInterval(async () => {
        if (paymentCompleted || Date.now() - startedAt > 120_000) {
          window.clearInterval(timer);
          return;
        }

        try {
          const recovered = await reconcilePayment(order.orderId);
          if (recovered?.activated) {
            paymentCompleted = true;
            window.clearInterval(timer);
            checkout.close?.();
          } else if (recovered?.pending) {
            setNotice("Payment process ho rahi hai. Dobara payment mat karo.");
          }
        } catch {
          // Keep the checkout open; the webhook or next poll may still complete activation.
        }
      }, 4000);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Live checkout start nahi hua.");
    } finally {
      setPaymentLoadingPlan(null);
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
        ? { pdfDataUrl, prompt: userText, language, mode, studentContext: effectiveStudentContext }
        : photoDataUrl
          ? { imageDataUrl: photoDataUrl, prompt: userText, language, mode, studentContext: effectiveStudentContext, sourceId: activeSourceId || undefined }
          : { messages: nextMessages, language, mode, studentContext: effectiveStudentContext, sourceId: activeSourceId || undefined };

      const accessToken = user ? await getAccessToken() : null;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      let finalReply = "";

      const contentType = response.headers.get("content-type") || "";
      const streamHeader = response.headers.get("x-genz-stream");
      const isStreamingChat =
        endpoint === "/api/chat" &&
        response.ok &&
        Boolean(response.body) &&
        (streamHeader === "1" || contentType.startsWith("text/plain"));

      if (isStreamingChat) {
        setMessages((current) => [...current, { role: "assistant", content: "" }]);

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          finalReply += decoder.decode(value, { stream: true });

          setMessages((current) => {
            const updated = [...current];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
              updated[lastIndex] = { role: "assistant", content: finalReply };
            }
            return updated;
          });
        }

        finalReply += decoder.decode();

        if (!finalReply.trim()) {
          throw new Error("AI ne empty response diya. Dobara try karo.");
        }
      } else {
        const data = await readApiJson(response);
        if (!response.ok) throw new Error(data?.error || "AI response failed");

        finalReply = data.reply;
        const assistantMessage: Message = { role: "assistant", content: finalReply };
        setMessages((current) => [...current, assistantMessage]);
      }

      if (endpoint === "/api/photo-solve" && finalReply.trim()) {
        setPracticeSeed({ question: userText, answer: finalReply });
      }

      setPhotoDataUrl(null);
      setPhotoName("");

      if (user) {
        try {
          const id = await saveTurn({
            userId: user.id,
            conversationId,
            mode,
            language,
            studentContext: effectiveStudentContext,
            userText: visibleText,
            assistantText: finalReply,
          });
          if (id) setConversationId(id);
          await refreshHistory();

          void trackLearningTurn({
            userText: visibleText,
            assistantText: finalReply,
            mode,
            studentContext: effectiveStudentContext,
          })
            .then(() => window.dispatchEvent(new Event("genz-learning-updated")))
            .catch(() => {});
        } catch {
          setNotice("Answer mil gaya, lekin chat history save nahi ho pai.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      if (user) {
        await refreshQuota();
      }
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
            onChange={(e) => chooseLanguage(e.target.value)}
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
        <form className="authPanel authPanelExpanded authPanelSimple" onSubmit={submitLogin}>
          <div className="authIntro">
            <strong>Sign in to Gen-z AI</strong>
            <span>Chats, study plan, progress aur revision sync rahenge.</span>
          </div>

          <button type="button" className="googleSignInButton" onClick={handleGoogleSignIn}>
            Continue with Google
          </button>

          <div className="authDividerRow"><span>or use email</span></div>

          <label className="authEmailLabel">
            <span>Email address</span>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="student@example.com"
              autoComplete="email"
              required
            />
          </label>

          <button type="submit" className="magicLinkButton" disabled={authCooldown > 0}>
            {authCooldown > 0 ? `Resend in ${authCooldown}s` : "Email me a sign-in link"}
          </button>

          <p className="authPrivacyNote">
            Password ya OTP yaad rakhne ki zarurat nahi. Secure sign-in link email par aayega.
          </p>

          <button type="button" className="authCloseButton" onClick={() => setAuthOpen(false)}>
            Close
          </button>
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

      <section className="usageCard" aria-label="Daily free usage">
        <div className="usageTop">
          <div>
            <span className="usageEyebrow">{user ? `${displayPlanName(quota?.plan || "free")} plan` : "Free plan"}</span>
            <strong>{user ? "Aaj ke remaining uses" : "Daily free study allowance"}</strong>
            <small>
              {user
                ? quotaLoading
                  ? "Usage refresh ho rahi hai…"
                  : "Daily limits India time par reset hoti hain."
                : "Sign in karke daily limits track karo aur chat history save karo."}
            </small>
          </div>
          <button type="button" className="plansButton" onClick={() => setPlansOpen((value) => !value)}>
            {plansOpen ? "Hide plans" : "View plans"}
          </button>
        </div>

        <div className="usageGrid">
          <div className="usageStat">
            <span>✨ Chat</span>
            <strong>{user && quota ? quota.chat.remaining : 20}</strong>
            <small>{user && quota ? `of ${quota.chat.limit} left` : "per day"}</small>
          </div>
          <div className="usageStat">
            <span>📷 Photo Solve</span>
            <strong>{user && quota ? quota.photo.remaining : 3}</strong>
            <small>{user && quota ? `of ${quota.photo.limit} left` : "per day"}</small>
          </div>
          <div className="usageStat">
            <span>📄 PDF Study</span>
            <strong>{user && quota ? quota.pdf.remaining : 2}</strong>
            <small>{user && quota ? `of ${quota.pdf.limit} left` : "per day"}</small>
          </div>
        </div>

        {!user && supabaseReady && (
          <button type="button" className="usageSignIn" onClick={() => setAuthOpen(true)}>
            Sign in for tracked free uses
          </button>
        )}
      </section>

      {plansOpen && (
        <section className="plansPanel" aria-label="Gen-z AI plans">
          <div className="plansHeader">
            <div>
              <span>GEN-Z AI PLANS</span>
              <h3>Choose how much you study</h3>
            </div>
            <small>{paymentReady ? "Live Razorpay checkout ready." : "Live pricing/keys setup pending."}</small>
          </div>

          <div className="planGrid">
            {PLAN_CARDS.map((plan) => {
              const current = (quota?.plan || "free") === plan.id;
              return (
                <article key={plan.id} className={current ? "planCard currentPlan" : "planCard"}>
                  <div className="planNameRow">
                    <div>
                      <strong>{plan.name}</strong>
                      <span>{plan.note}</span>
                    </div>
                    {current && user && <em>Current</em>}
                  </div>
                  <div className="planLimits">
                    <span>✨ {plan.chat} chats/day</span>
                    <span>📷 {plan.photo} Photo Solve/day</span>
                    <span>📄 {plan.pdf} PDF Study/day</span>
                  </div>
                  {plan.id === "free" ? (
                    <button type="button" disabled>Free</button>
                  ) : (() => {
                    const livePlan = paymentPlans.find((item) => item.id === plan.id);
                    const isConfigured = Boolean(paymentReady && livePlan?.configured && livePlan.amount);
                    const isCurrent = current && user;
                    return (
                      <>
                        <div className="planPrice">
                          {livePlan?.configured && livePlan.amount
                            ? `₹${(livePlan.amount / 100).toFixed(0)} / ${livePlan.validityDays} days`
                            : "Live price setup pending"}
                        </div>
                        <button
                          type="button"
                          disabled={!isConfigured || Boolean(paymentLoadingPlan) || Boolean(isCurrent)}
                          onClick={() => startLiveCheckout(plan.id)}
                        >
                          {isCurrent
                            ? "Current plan"
                            : paymentLoadingPlan === plan.id
                              ? "Opening…"
                              : isConfigured
                                ? "Upgrade with Razorpay"
                                : "Setup pending"}
                        </button>
                      </>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        </section>
      )}

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

      <section className="boardPicker" aria-label="School board and medium">
        <div className="boardPickerTitle">
          <strong>School Board & Medium</strong>
          <span>State board students ke liye board, class aur medium select karo</span>
        </div>
        <div className="boardPickerGrid">
          <select
            value={schoolBoard}
            onChange={(e) => {
              const board = e.target.value;
              setSchoolBoard(board);
              if (board) setStudentContext(buildBoardStudyContext(board, schoolClass, studyMedium));
            }}
            aria-label="Select school board"
          >
            <option value="">Select Board</option>
            {SCHOOL_BOARDS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={schoolClass}
            onChange={(e) => {
              const value = e.target.value;
              setSchoolClass(value);
              if (schoolBoard) setStudentContext(buildBoardStudyContext(schoolBoard, value, studyMedium));
            }}
            aria-label="Select class"
          >
            {SCHOOL_CLASSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={studyMedium}
            onChange={(e) => {
              const value = e.target.value;
              setStudyMedium(value);
              if (schoolBoard) setStudentContext(buildBoardStudyContext(schoolBoard, schoolClass, value));
            }}
            aria-label="Select study medium"
          >
            {STUDY_MEDIUMS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {schoolBoard && <div className="boardActive">✓ {studentContext}</div>}
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

      {mode === "quiz" && (
        <AdaptiveQuizCard
          signedIn={Boolean(user)}
          language={language}
          studentContext={effectiveStudentContext}
          sourceId={activeSourceId}
        />
      )}

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
                {message.role === "assistant" ? <FormattedAnswer text={message.content} /> : <p>{message.content}</p>}
              </div>
            ))
          )}
          {loading && <div className="message assistant"><strong>Gen-z AI</strong><p>Soch raha hoon…</p></div>}
        </div>

        {error && <div className="error">{error}</div>}

        {practiceSeed && (
          <AdaptivePracticeCard
            sourceQuestion={practiceSeed.question}
            sourceAnswer={practiceSeed.answer}
            language={language}
            studentContext={effectiveStudentContext}
            signedIn={Boolean(user)}
            sourceId={activeSourceId}
          />
        )}

        <form className="composer" onSubmit={sendMessage}>
          {photoDataUrl && (
            <div className="photoPreview">
              <img src={photoDataUrl} alt={composerUi.studyImage} />
              <div>
                <strong>{composerUi.photoReady}</strong>
                <span>{photoName || composerUi.studyImage}</span>
              </div>
              <button type="button" onClick={removePhoto} aria-label={composerUi.removePhoto}>✕</button>
            </div>
          )}

          {pdfDataUrl && (
            <div className="pdfPreview">
              <div className="pdfIcon">PDF</div>
              <div>
                <strong>{composerUi.pdfReady}</strong>
                <span>{pdfName || composerUi.studyPdf}</span>
              </div>
              <button type="button" onClick={removePdf} aria-label={composerUi.removePdf}>✕</button>
            </div>
          )}

          <div className="comingRow">
            <label className="uploadLabel" htmlFor="photo-upload">📷 {composerUi.photoSolve}</label>
            <input
              id="photo-upload"
              className="fileInput"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoChange(e.target.files?.[0])}
            />
            <label className="uploadLabel" htmlFor="pdf-upload">📄 {composerUi.askPdf}</label>
            <button type="button" className="uploadLabel" onClick={loadSamplePdf}>⬇ {composerUi.samplePdf}</button>
            <input
              id="pdf-upload"
              className="fileInput"
              type="file"
              accept=".pdf,application/pdf,*/*"
              onChange={async (e) => { const file = e.target.files?.[0]; await handlePdfChange(file); e.currentTarget.value = ""; }}
            />
            {user ? <span>☁️ {composerUi.historyOn}</span> : <span>👤 {composerUi.guestMode}</span>}
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

      <section className="learningHubIntro" aria-label="Personal learning tools">
        <span>{learningUi.hubEyebrow}</span>
        <h3>{learningUi.hubFlow}</h3>
        <p>{learningUi.hubDescription}</p>
      </section>

      <div id="home-tutor">
        <HomeTutorCard
          signedIn={Boolean(user)}
          board={schoolBoard}
          schoolClass={schoolClass}
          medium={studyMedium}
          language={language}
          studentContext={learningStudentContext}
          onSignIn={() => setAuthOpen(true)}
        />
      </div>

      <div id="smart-revision">
        <SmartRevisionCard
          signedIn={Boolean(user)}
          language={language}
          studentContext={learningStudentContext}
          sourceId={activeSourceId}
          onSignIn={() => setAuthOpen(true)}
        />
      </div>

      <div id="progress">
        <ProgressDashboardCard
          signedIn={Boolean(user)}
          language={language}
          studentContext={learningStudentContext}
          onSignIn={() => setAuthOpen(true)}
        />
      </div>

      <div id="study-sources">
        <StudySourcesCard
          signedIn={Boolean(user)}
          language={language}
          studentContext={learningStudentContext}
          activeSourceId={activeSourceId}
          onActiveChange={setActiveSourceId}
          onSignIn={() => setAuthOpen(true)}
        />
      </div>

      <footer>
        <div><strong>Gen-z AI</strong> · Student-first · Multilingual · Affordable</div>
        <nav className="footerLinks" aria-label="Legal and support">
          <a href="/support">Support</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/refund">Refund & Cancellation</a>
        </nav>
      </footer>
    </main>
  );
}
