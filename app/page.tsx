"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { listStudySourcesClient, type StudySourceSummary } from "@/lib/source-client";
import ProgressDashboardCard from "@/app/progress-dashboard-card";
import SmartRevisionCard from "@/app/smart-revision-card";
import { getLearningSnapshot, savePreferredLanguage, trackLearningTurn } from "@/lib/learning-client";
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

type Message = { role: "user" | "assistant"; content: string; apiContent?: string };

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

const LANGUAGE_STORAGE_KEY = "genz-response-language-v2";

export default function Home() {
  const [language, setLanguage] = useState("English");
  const [studentContext, setStudentContext] = useState<StudyContext>("General");
  const [schoolBoard, setSchoolBoard] = useState("");
  const [schoolClass, setSchoolClass] = useState("Class 10");
  const [studyMedium, setStudyMedium] = useState("Hindi Medium");
  const responseLanguageName = language.includes("—")
    ? language.split("—").pop()?.trim() || "English"
    : language.trim() || "English";
  const isEnglish = responseLanguageName === "English";
  const effectiveStudentContext = schoolBoard
    ? buildBoardStudyContext(schoolBoard, schoolClass, studyMedium)
    : studentContext;
  const learningStudentContext = schoolBoard
    ? effectiveStudentContext
    : `${studentContext} | ${schoolClass} | ${studyMedium}`;
  const composerUi = getComposerUiText(effectiveStudentContext, language);
  const learningUi = getLearningHubUiText(learningStudentContext, language);
  const homeCopy = (() => {
    const hindi = responseLanguageName === "Hindi";
    const hinglish = responseLanguageName === "Hinglish";
    if (hindi) return {
      subtitle: "भारतीय छात्रों के लिए किफायती AI ट्यूटर", language: "पढ़ाई की भाषा", signIn: "लॉगिन", history: "इतिहास",
      badge: "हर भारतीय छात्र के लिए", heading: "सवाल मुश्किल है?", accent: "अपनी भाषा में आसान तरीके से सीखें।",
      description: "गणित के सवाल की फोटो लें, विज्ञान का अध्याय समझें या परीक्षा की तैयारी करें। Gen-z AI के साथ चरण-दर-चरण सीखें।",
      cta: "मुफ्त पढ़ाई शुरू करें →", free: "हर दिन मुफ्त: 20 AI चैट · 3 फोटो समाधान · 2 PDF अध्ययन। शुरू करने के लिए भुगतान जरूरी नहीं।",
      langTitle: "आपकी भाषा। आपकी पढ़ाई।", langBody: "ऊपर अपनी पसंद की भाषा चुनें और Gen-z AI से हर विषय आसान तरीके से समझें।",
      allowance: "रोज़ाना मुफ्त पढ़ाई", plans: "प्लान देखें", signInFree: "मुफ्त उपयोग के लिए लॉगिन करें",
    };
    if (hinglish) return {
      subtitle: "Indian students ke liye affordable AI tutor", language: "Study language", signIn: "Login", history: "History",
      badge: "Har Indian student ke liye", heading: "Question mushkil hai?", accent: "Apni language mein step by step seekho.",
      description: "Maths question ki photo lo, Science chapter samjho ya exams ke liye revise karo. Gen-z AI ke saath aasaan learning.",
      cta: "Free Study Shuru Karo →", free: "Roz free: 20 AI chats · 3 photo solutions · 2 PDF studies. Shuru karne ke liye payment nahi.",
      langTitle: "Tumhari language. Tumhari padhai.", langBody: "Upar apni language choose karo aur concepts aasaani se samjho.",
      allowance: "Daily free study", plans: "Plans dekho", signInFree: "Free uses ke liye login karo",
    };
    const regional: Record<string, { heading: string; accent: string; cta: string; badge: string; langTitle: string }> = {
      Assamese: { heading:"প্ৰশ্নটো কঠিন নেকি?", accent:"নিজৰ ভাষাত ধাপে ধাপে শিকক।", cta:"বিনামূলীয়াকৈ পঢ়া আৰম্ভ কৰক →", badge:"ভাৰতীয় শিক্ষাৰ্থীৰ বাবে", langTitle:"আপোনাৰ ভাষা, আপোনাৰ শিক্ষা" },
      Bengali: { heading:"প্রশ্ন কঠিন লাগছে?", accent:"নিজের ভাষায় ধাপে ধাপে শেখো।", cta:"বিনামূল্যে পড়া শুরু করুন →", badge:"ভারতীয় শিক্ষার্থীদের জন্য", langTitle:"তোমার ভাষা, তোমার পড়াশোনা" },
      Bodo: { heading:"सोंलु गोब्राब नामा?", accent:"नोंथांनि रावजों सोलों।", cta:"फ्रि सोलोंनाय जागाय →", badge:"भारतनि फरायसाफोरनि थाखाय", langTitle:"नोंथांनि राव, नोंथांनि सोलोंनाय" },
      Dogri: { heading:"सुआल औखा लगदा ऐ?", accent:"अपनी भाशा च सिक्खो।", cta:"मुफ्त पढ़ाई शुरू करो →", badge:"भारती विद्यार्थियें आस्तै", langTitle:"तुंदी भाशा, तुंदी पढ़ाई" },
      Gujarati: { heading:"પ્રશ્ન મુશ્કેલ લાગે છે?", accent:"તમારી ભાષામાં પગલું દર પગલું શીખો.", cta:"મફતમાં શીખવાનું શરૂ કરો →", badge:"ભારતીય વિદ્યાર્થીઓ માટે", langTitle:"તમારી ભાષા, તમારું શિક્ષણ" },
      Kannada: { heading:"ಪ್ರಶ್ನೆ ಕಷ್ಟವಾಗಿದೆಯೇ?", accent:"ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಹಂತ ಹಂತವಾಗಿ ಕಲಿಯಿರಿ.", cta:"ಉಚಿತವಾಗಿ ಕಲಿಯಲು ಪ್ರಾರಂಭಿಸಿ →", badge:"ಭಾರತೀಯ ವಿದ್ಯಾರ್ಥಿಗಳಿಗಾಗಿ", langTitle:"ನಿಮ್ಮ ಭಾಷೆ, ನಿಮ್ಮ ಕಲಿಕೆ" },
      Kashmiri: { heading:"سوال چھا مُشکِل؟", accent:"پننِس زبانہِ منز ہیٚچھِو۔", cta:"مُفت ہیٚچھُن شروع کٔرِو →", badge:"ہِندوستانُک طالب علم", langTitle:"تُہنز زبان، تُہنز تعلیم" },
      Konkani: { heading:"प्रस्न कठीण दिसता?", accent:"आपल्या भाशेंत शिका.", cta:"फुकट शिकपाक सुरवात करात →", badge:"भारतीय विद्यार्थ्यां खातीर", langTitle:"तुमची भास, तुमचें शिक्षण" },
      Maithili: { heading:"प्रश्न कठिन लगैत अछि?", accent:"अपन भाषा मे सीखू।", cta:"मुफ्त पढ़ाइ शुरू करू →", badge:"भारतीय छात्र सभ लेल", langTitle:"अहाँक भाषा, अहाँक पढ़ाइ" },
      Malayalam: { heading:"ചോദ്യം ബുദ്ധിമുട്ടാണോ?", accent:"നിങ്ങളുടെ ഭാഷയിൽ ഘട്ടം ഘട്ടമായി പഠിക്കൂ.", cta:"സൗജന്യമായി പഠിക്കാൻ തുടങ്ങൂ →", badge:"ഇന്ത്യൻ വിദ്യാർത്ഥികൾക്കായി", langTitle:"നിങ്ങളുടെ ഭാഷ, നിങ്ങളുടെ പഠനം" },
      Manipuri: { heading:"ꯋꯥꯍꯪ ꯑꯁꯤ ꯑꯋꯥꯕ꯭ꯔꯥ?", accent:"ꯅꯍꯥꯛꯀꯤ ꯂꯣꯜꯗ ꯇꯝꯕꯤꯌꯨ।", cta:"ꯐ꯭ꯔꯤꯗ ꯇꯝꯕ ꯍꯧꯔꯣ →", badge:"ꯏꯟꯗꯤꯌꯥꯒꯤ ꯃꯍꯩꯔꯣꯏꯁꯤꯡꯒꯤꯗꯃꯛ", langTitle:"ꯅꯍꯥꯛꯀꯤ ꯂꯣꯜ, ꯅꯍꯥꯛꯀꯤ ꯃꯍꯩ" },
      Marathi: { heading:"प्रश्न कठीण वाटतोय?", accent:"आपल्या भाषेत टप्प्याटप्प्याने शिका.", cta:"मोफत शिकायला सुरुवात करा →", badge:"भारतीय विद्यार्थ्यांसाठी", langTitle:"तुमची भाषा, तुमचे शिक्षण" },
      Nepali: { heading:"प्रश्न गाह्रो लाग्यो?", accent:"आफ्नो भाषामा चरणबद्ध सिक्नुहोस्।", cta:"निःशुल्क पढ्न सुरु गर्नुहोस् →", badge:"भारतीय विद्यार्थीहरूका लागि", langTitle:"तपाईंको भाषा, तपाईंको पढाइ" },
      Odia: { heading:"ପ୍ରଶ୍ନ କଷ୍ଟକର ଲାଗୁଛି?", accent:"ନିଜ ଭାଷାରେ ପର୍ଯ୍ୟାୟକ୍ରମେ ଶିଖନ୍ତୁ।", cta:"ମାଗଣାରେ ପଢ଼ିବା ଆରମ୍ଭ କରନ୍ତୁ →", badge:"ଭାରତୀୟ ଛାତ୍ରଛାତ୍ରୀଙ୍କ ପାଇଁ", langTitle:"ଆପଣଙ୍କ ଭାଷା, ଆପଣଙ୍କ ଶିକ୍ଷା" },
      Punjabi: { heading:"ਸਵਾਲ ਔਖਾ ਲੱਗ ਰਿਹਾ ਹੈ?", accent:"ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਕਦਮ-ਦਰ-ਕਦਮ ਸਿੱਖੋ।", cta:"ਮੁਫ਼ਤ ਪੜ੍ਹਾਈ ਸ਼ੁਰੂ ਕਰੋ →", badge:"ਭਾਰਤੀ ਵਿਦਿਆਰਥੀਆਂ ਲਈ", langTitle:"ਤੁਹਾਡੀ ਭਾਸ਼ਾ, ਤੁਹਾਡੀ ਪੜ੍ਹਾਈ" },
      Sanskrit: { heading:"प्रश्नः कठिनः अस्ति?", accent:"स्वभाषायां क्रमशः पठन्तु।", cta:"निःशुल्कम् अध्ययनम् आरभत →", badge:"भारतीयविद्यार्थिभ्यः", langTitle:"भवतः भाषा, भवतः अध्ययनम्" },
      Santali: { heading:"ᱠᱩᱠᱞᱤ ᱠᱚᱴᱷᱤᱱ ᱠᱟᱱᱟ?", accent:"ᱟᱢᱟᱜ ᱯᱟᱹᱨᱥᱤ ᱛᱮ ᱥᱮᱪᱮᱫᱽ ᱢᱮ।", cta:"ᱯᱷᱨᱤ ᱛᱮ ᱥᱮᱪᱮᱫᱽ ᱮᱦᱚᱵᱽ ᱢᱮ →", badge:"ᱵᱷᱟᱨᱚᱛ ᱨᱮᱱ ᱯᱟᱹᱴᱷᱩᱣᱟᱹ", langTitle:"ᱟᱢᱟᱜ ᱯᱟᱹᱨᱥᱤ, ᱟᱢᱟᱜ ᱥᱮᱪᱮᱫᱽ" },
      Sindhi: { heading:"سوال ڏکيو آهي؟", accent:"پنهنجي ٻوليءَ ۾ سکو.", cta:"مفت پڙهڻ شروع ڪريو →", badge:"ڀارتي شاگردن لاءِ", langTitle:"توهان جي ٻولي، توهان جي پڙهائي" },
      Tamil: { heading:"கேள்வி கடினமாக உள்ளதா?", accent:"உங்கள் மொழியில் படிப்படியாகக் கற்றுக்கொள்ளுங்கள்.", cta:"இலவசமாக கற்கத் தொடங்குங்கள் →", badge:"இந்திய மாணவர்களுக்காக", langTitle:"உங்கள் மொழி, உங்கள் கல்வி" },
      Telugu: { heading:"ప్రశ్న కష్టంగా ఉందా?", accent:"మీ భాషలో దశలవారీగా నేర్చుకోండి.", cta:"ఉచితంగా నేర్చుకోవడం ప్రారంభించండి →", badge:"భారతీయ విద్యార్థుల కోసం", langTitle:"మీ భాష, మీ చదువు" },
      Urdu: { heading:"سوال مشکل لگ رہا ہے؟", accent:"اپنی زبان میں قدم بہ قدم سیکھیں۔", cta:"مفت پڑھائی شروع کریں →", badge:"بھارتی طلبہ کے لیے", langTitle:"آپ کی زبان، آپ کی تعلیم" },
    };
    const localized = regional[responseLanguageName];
    if (localized) return {
      subtitle: "Gen-z AI", language: "Language / भाषा", signIn: "Sign in", history: "History",
      ...localized, description: "Guided Tuition · Photo Solve · PDF Study · Smart Revision",
      free: "20 AI chats · 3 Photo Solve · 2 PDF Study / day",
      langBody: localized.accent, allowance: "Daily free study allowance",
      plans: "View plans", signInFree: "Sign in for free uses",
    };
    return {
      subtitle: "India-first affordable AI tutor", language: "Study language", signIn: "Sign in", history: "History",
      badge: "Built for every Indian student", heading: "Stuck on a question?", accent: "Learn it step by step, in your language.",
      description: "Snap a maths question, understand a science chapter, or revise for exams. Gen-z AI helps you learn with Guided Tuition, Photo Solve and PDF Study.",
      cta: "Start Learning Free →", free: "Free daily access: 20 AI chats · 3 photo solutions · 2 PDF studies. No payment needed to start.",
      langTitle: "Your language. Your learning.", langBody: "Choose your preferred study language above and ask Gen-z AI to explain concepts step by step.",
      allowance: "Daily free study allowance", plans: "View plans", signInFree: "Sign in for free uses",
    };
  })();
  const resourceCopy = responseLanguageName === "Tamil" ? {
    title:"இலவச படிப்பு வளங்கள்", description:"முந்தைய ஆண்டு வினாத்தாள்கள் · இயற்பியல், வேதியியல், கணித சூத்திரத் தாள்கள் · பாடத்திட்ட சரிபார்ப்புப் பட்டியல்", link:"இலவச வளங்களைப் பார்க்க →"
  } : responseLanguageName === "Hindi" ? {
    title:"मुफ्त अध्ययन सामग्री", description:"पिछले वर्षों के प्रश्नपत्र · भौतिकी, रसायन और गणित के सूत्र · पाठ्यक्रम चेकलिस्ट", link:"मुफ्त सामग्री देखें →"
  } : responseLanguageName === "Bengali" ? {
    title:"বিনামূল্যের পড়াশোনার উপকরণ", description:"পূর্ববর্তী বছরের প্রশ্নপত্র · পদার্থবিদ্যা, রসায়ন ও গণিতের সূত্র · সিলেবাস চেকলিস্ট", link:"বিনামূল্যের উপকরণ দেখুন →"
  } : responseLanguageName === "Hinglish" ? {
    title:"Free Study Resources", description:"Pichhle saalon ke papers · Physics, Chemistry aur Maths formula sheets · Syllabus checklist", link:"Free Resources Dekho →"
  } : {
    title:"Free Study Resources", description:"Previous-year paper guide · Physics, Chemistry & Maths formula sheets · Printable syllabus tracker", link:"Explore Free Resources →"
  };
  const [mode, setMode] = useState<StudyMode>("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (messages.length === 0 && !loading) return;
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
  }, [messages, loading]);
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
  const [studySources, setStudySources] = useState<StudySourceSummary[]>([]);
  const [tuitionSubject, setTuitionSubject] = useState("Science");
  const [tuitionTopic, setTuitionTopic] = useState("");
  const [tuitionMinutes, setTuitionMinutes] = useState(30);

  function applyLanguageLocally(nextLanguage: string) {
    setLanguage(nextLanguage);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", nextLanguage);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // Keep the in-memory selection even if browser persistence is unavailable.
    }
  }

  function changeLanguageAndReload(value: string) {
    const nextLanguage = value.trim() || "English";
    applyLanguageLocally(nextLanguage);
    if (user) void savePreferredLanguage(nextLanguage).catch(() => {});
  }

  useEffect(() => {
    try {
      const urlLanguage = new URL(window.location.href).searchParams.get("lang");
      const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const preferred = urlLanguage || savedLanguage || "";
      if (preferred && LANGUAGES.some((item) => item === preferred)) {
        applyLanguageLocally(preferred);
      }
    } catch {
      // Keep the default language when browser persistence is unavailable.
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
    if (!user) return;

    void getLearningSnapshot()
      .then((snapshot) => {
        let urlLanguage = "";
        let savedLanguage = "";
        try {
          urlLanguage = new URL(window.location.href).searchParams.get("lang") || "";
          savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) || "";
        } catch {
          urlLanguage = "";
          savedLanguage = "";
        }

        if (urlLanguage && LANGUAGES.some((item) => item === urlLanguage)) {
          applyLanguageLocally(urlLanguage);
          if (snapshot.profile?.preferred_language !== urlLanguage) {
            void savePreferredLanguage(urlLanguage).catch(() => {});
          }
          return;
        }

        const accountLanguage = snapshot.profile?.preferred_language || "";
        if (accountLanguage && LANGUAGES.some((item) => item === accountLanguage)) {
          applyLanguageLocally(accountLanguage);
          return;
        }

        if (savedLanguage && LANGUAGES.some((item) => item === savedLanguage)) {
          applyLanguageLocally(savedLanguage);
          return;
        }

        applyLanguageLocally("English");
        void savePreferredLanguage("English").catch(() => {});
      })
      .catch(() => {});
  }, [user]);

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

  const activeStudySource = studySources.find((item) => item.id === activeSourceId) || null;

  useEffect(() => {
    if (!user) {
      setStudySources([]);
      return;
    }
    void listStudySourcesClient().then(setStudySources).catch(() => setStudySources([]));
  }, [user, activeSourceId]);

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

  function startGuidedTuition() {
    const topic = tuitionTopic.trim();
    if (!topic) {
      setNotice("Tuition start karne ke liye chapter ya topic likho.");
      document.getElementById("tuition-topic")?.focus();
      return;
    }
    const lessonPrompt = "Act as my personal tuition teacher for " + tuitionSubject + ": " + topic + ". Run a " + tuitionMinutes + "-minute guided lesson for my current class/board context. Teach only one small concept at a time in " + responseLanguageName + ". Start with a very simple explanation and one relatable example, then ask exactly ONE understanding-check question and STOP so I can answer. If I answer incorrectly, explain it again more simply before continuing. After the lesson, give short practice, a mini-test, and clearly identify what I should revise next. Do not dump the full lesson at once.";
    setMode("explain");
    setInput(lessonPrompt);
    setNotice("🎓 Guided tuition class start ho rahi hai…");
    window.setTimeout(() => {
      const composer = document.getElementById("chat-composer");
      composer?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (composer instanceof HTMLFormElement) composer.requestSubmit();
    }, 150);
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

    const isGuidedTuitionPrompt = !pdfDataUrl && !photoDataUrl && userText.startsWith("Act as my personal tuition teacher for ");
    const visibleText = pdfDataUrl
      ? `📄 ${userText}`
      : photoDataUrl
        ? `📷 ${userText}`
        : isGuidedTuitionPrompt
          ? `🎓 ${tuitionSubject} · ${tuitionTopic.trim()} · Guided tuition`
          : userText;
    const nextMessages: Message[] = [...messages, { role: "user", content: visibleText, ...(isGuidedTuitionPrompt ? { apiContent: userText } : {}) }];

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
          : { messages: nextMessages.map((message) => ({ role: message.role, content: message.apiContent || message.content })), language, mode, studentContext: effectiveStudentContext, sourceId: activeSourceId || undefined };

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
            <p>{homeCopy.subtitle}</p>
          </div>
        </div>

        <div className="topActions">
          <label className="languageControl">
            <span>{homeCopy.language}</span>
            <select
              className="language"
              value={language}
              onChange={(e) => changeLanguageAndReload(e.target.value)}
              aria-label="Select study language"
            >
              {LANGUAGES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          {user ? (
            <>
              <button className="ghostButton" onClick={() => setHistoryOpen((value) => !value)}>{homeCopy.history}</button>
              <button className="accountButton" onClick={handleSignOut} title="Sign out">
                {user.email?.slice(0, 1).toUpperCase() || "U"}
              </button>
            </>
          ) : supabaseReady ? (
            <button className="ghostButton" onClick={() => setAuthOpen((value) => !value)}>{homeCopy.signIn}</button>
          ) : (
            <span className="guestPill">Guest</span>
          )}
        </div>
      </header>

      {authOpen && (
        <form className="authPanel authPanelExpanded authPanelSimple" onSubmit={submitLogin}>
          <div className="authIntro">
            <strong>Sign in to Gen-z AI</strong>
            <span>{isEnglish ? "Chats, study plan, progress and revision will stay synced." : "Chats, study plan, progress aur revision sync rahenge."}</span>
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
            {isEnglish ? "No password or OTP to remember. A secure sign-in link will be sent to your email." : "Password ya OTP yaad rakhne ki zarurat nahi. Secure sign-in link email par aayega."}
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
              <p>{isEnglish ? "No saved chats yet." : "Abhi koi saved chat nahi hai."}</p>
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

      <section style={{margin:"16px 0",padding:"16px 20px",borderRadius:16,background:"#edf3ff",color:"#172b58"}}><strong>📚 {resourceCopy.title}</strong><p style={{margin:"8px 0"}}>{resourceCopy.description}</p><a href="/resources" style={{fontWeight:800,color:"#234bd4"}}>{resourceCopy.link}</a></section>
      <section className="hero">
        <span className="badge">{homeCopy.badge}</span>
        <h2>{homeCopy.heading} <span>{homeCopy.accent}</span></h2>
        <p>{homeCopy.description}</p>
        <a className="usageSignIn" href="#study-workspace" style={{ display: "inline-block", marginTop: 12, padding: "14px 22px", textDecoration: "none", fontWeight: 800 }}>
          {homeCopy.cta}
        </a>
        <p style={{ marginTop: 10, fontSize: "0.9rem" }}>{homeCopy.free}</p>
      </section>

      <section aria-label="Learn in your language" style={{ padding: "18px 20px", margin: "16px 0", borderRadius: 16, background: "rgba(99,102,241,0.09)" }}>
        <h3 style={{ margin: "0 0 8px" }}>{homeCopy.langTitle}</h3>
        <p style={{ margin: "0 0 10px" }}>{homeCopy.langBody}</p>
        <small>अपनी भाषा में सवाल पूछें और आसान तरीके से समझें।</small>
      </section>
      <section className="usageCard" aria-label="Daily free usage">
        <div className="usageTop">
          <div>
            <span className="usageEyebrow">{user ? `${displayPlanName(quota?.plan || "free")} plan` : "Free plan"}</span>
            <strong>{user ? (isEnglish ? "Today’s remaining uses" : "Aaj ke remaining uses") : homeCopy.allowance}</strong>
            <small>
              {user
                ? quotaLoading
                  ? (isEnglish ? "Refreshing usage…" : "Usage refresh ho rahi hai…")
                  : (isEnglish ? "Daily limits reset on India time." : "Daily limits India time par reset hoti hain.")
                : (isEnglish ? "Sign in to track daily limits and save chat history." : "लॉगिन करके रोज़ाना उपयोग और चैट इतिहास देखें।")}
            </small>
          </div>
          <button type="button" className="plansButton" onClick={() => setPlansOpen((value) => !value)}>
            {plansOpen ? "Hide plans" : homeCopy.plans}
          </button>
        </div>

        <div className="usageGrid">
          <div className="usageStat">
            <span>✨ Chat</span>
            <strong>{user && quota ? quota.chat.remaining : 20}</strong>
            <small>{user && quota ? `of ${quota.chat.limit} left` : responseLanguageName === "Hindi" ? "प्रतिदिन" : "per day"}</small>
          </div>
          <div className="usageStat">
            <span>📷 Photo Solve</span>
            <strong>{user && quota ? quota.photo.remaining : 3}</strong>
            <small>{user && quota ? `of ${quota.photo.limit} left` : responseLanguageName === "Hindi" ? "प्रतिदिन" : "per day"}</small>
          </div>
          <div className="usageStat">
            <span>📄 PDF Study</span>
            <strong>{user && quota ? quota.pdf.remaining : 2}</strong>
            <small>{user && quota ? `of ${quota.pdf.limit} left` : responseLanguageName === "Hindi" ? "प्रतिदिन" : "per day"}</small>
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
          <span>{isEnglish ? "Set answer depth for your class or exam" : "Class/Exam ke hisaab se answer ki depth set karo"}</span>
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
          <span>{isEnglish ? "Select your board, class and school medium" : "State board students ke liye board, class aur medium select karo"}</span>
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

      <section id="study-workspace" className="chatCard">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="empty">
              <div className="spark">✦</div>
              <h3>{isEnglish ? "Hi! I’m Gen-z AI." : "Namaste! Main Gen-z AI hoon."}</h3>
              <p>{isEnglish ? `Ask a question in ${studentContext} context, or upload a photo or PDF. I’ll help in English.` : `${studentContext} context me question type karo, photo ya PDF upload karo. Main ${language} me help karunga.`}</p>
              <div className="quickGrid">
                <button onClick={() => setInput("Class 10 electricity simple language me samjhao")}>⚡ {responseLanguageName === "Hindi" ? "अध्याय समझें" : responseLanguageName === "Hinglish" ? "Chapter samjho" : "Explain a chapter"}</button>
                <button onClick={() => setInput("Photosynthesis ke short exam notes banao")}>📝 {responseLanguageName === "Hindi" ? "नोट्स बनाएँ" : responseLanguageName === "Hinglish" ? "Notes banao" : "Make notes"}</button>
                <button onClick={() => setInput("Indian Constitution par 5 MCQ quiz lo")}>🎯 {responseLanguageName === "Hindi" ? "क्विज़ शुरू करें" : responseLanguageName === "Hinglish" ? "Quiz shuru karo" : "Start a quiz"}</button>
                <button onClick={() => setInput("JEE ke liye quadratic equations revise karao")}>📚 {responseLanguageName === "Hindi" ? "परीक्षा की तैयारी" : responseLanguageName === "Hinglish" ? "Exam revision karo" : "Exam revision"}</button>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "message user" : "message assistant"}>
                <strong>{message.role === "user" ? "You" : "Gen-z AI"}</strong>
                {message.role === "assistant" && activeStudySource && (
                  <div className="groundingProof" role="status">
                    📚 Grounded in: <strong>{activeStudySource.title}</strong>
                    {activeStudySource.chapter ? ` · ${activeStudySource.chapter}` : ""}
                  </div>
                )}
                {message.role === "assistant" ? <FormattedAnswer text={message.content} /> : <p>{message.content}</p>}
              </div>
            ))
          )}
          {loading && <div className="message assistant"><strong>Gen-z AI</strong><p>{isEnglish ? "Thinking…" : "Soch raha hoon…"}</p></div>}
          <div ref={messagesEndRef} className="messagesEnd" aria-hidden="true" />
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

      <section className="tuitionModeCard" aria-label="AI Tuition Mode">
        <div>
          <span>AI TUITION MODE · GUIDED CLASS</span>
          <h3>🎓 Start a personal tuition class</h3>
          <p>Choose a subject and topic. Your AI tutor teaches one concept at a time, checks understanding, then moves to practice and revision.</p>
        </div>
        <div className="tuitionSetup">
          <label><span>Subject</span><select value={tuitionSubject} onChange={(e) => setTuitionSubject(e.target.value)}>{["Mathematics", "Science", "English", "Hindi", "Social Science"].map((subject) => (<option key={subject} value={subject}>{subject}</option>))}</select></label>
          <label className="tuitionTopicField"><span>Chapter / topic</span><input id="tuition-topic" value={tuitionTopic} onChange={(e) => setTuitionTopic(e.target.value)} placeholder="e.g. Cell respiration" /></label>
          <label><span>Class time</span><select value={tuitionMinutes} onChange={(e) => setTuitionMinutes(Number(e.target.value))}>{[20, 30, 45, 60].map((minutes) => (<option key={minutes} value={minutes}>{minutes} min</option>))}</select></label>
        </div>
        <button type="button" onClick={startGuidedTuition}>Start guided tuition</button>
        <div className="tuitionFlow" aria-label="Tuition lesson flow"><strong>1 · Learn</strong><strong>2 · Check</strong><strong>3 · Practice</strong><strong>4 · Revise</strong></div>
        <small>The tutor pauses after each understanding check so the student participates instead of only reading an AI answer.</small>
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
