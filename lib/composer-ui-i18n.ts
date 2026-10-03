import type { StudyMode } from "@/lib/prompt";

export type ComposerUiText = {
  photoReady: string;
  pdfReady: string;
  studyImage: string;
  studyPdf: string;
  photoSolve: string;
  askPdf: string;
  samplePdf: string;
  historyOn: string;
  guestMode: string;
  removePhoto: string;
  removePdf: string;
  placeholders: Record<StudyMode | "photo" | "pdf", string>;
};

const ENGLISH: ComposerUiText = {
  photoReady: "Photo ready",
  pdfReady: "PDF ready",
  studyImage: "Study image",
  studyPdf: "Study PDF",
  photoSolve: "Photo Solve",
  askPdf: "Ask PDF",
  samplePdf: "Sample PDF",
  historyOn: "History on",
  guestMode: "Guest mode",
  removePhoto: "Remove photo",
  removePdf: "Remove PDF",
  placeholders: {
    chat: "Ask anything in your preferred study language…",
    explain: "Which concept should I explain simply?",
    notes: "Send a topic or chapter — I’ll make exam-ready notes…",
    quiz: "Which topic do you want a quiz on?",
    exam: "Write exam + subject + topic…",
    photo: "What should I solve or explain from this photo? (optional)",
    pdf: "What should I do with this PDF? Summary, notes, MCQs or a question…",
  },
};

const HINGLISH: ComposerUiText = {
  photoReady: "Photo ready",
  pdfReady: "PDF ready",
  studyImage: "Study image",
  studyPdf: "Study PDF",
  photoSolve: "Photo Solve",
  askPdf: "Ask PDF",
  samplePdf: "Sample PDF",
  historyOn: "History on",
  guestMode: "Guest mode",
  removePhoto: "Photo hatao",
  removePdf: "PDF hatao",
  placeholders: {
    chat: "Kuch bhi pucho — apni study language me…",
    explain: "Koi concept simple language me samjhana hai?",
    notes: "Topic ya chapter bhejo — main exam-ready notes banaunga…",
    quiz: "Kis topic par quiz chahiye?",
    exam: "Exam + subject + topic likho…",
    photo: "Photo ke baare me kya solve/samjhana hai? (optional)",
    pdf: "PDF se kya karna hai? Summary, notes, MCQ ya koi question…",
  },
};

const TEXT: Record<string, ComposerUiText> = {
  English: ENGLISH,
  Hinglish: HINGLISH,
  Hindi: {
    photoReady: "फोटो तैयार",
    pdfReady: "PDF तैयार",
    studyImage: "अध्ययन फोटो",
    studyPdf: "अध्ययन PDF",
    photoSolve: "फोटो हल करें",
    askPdf: "PDF से पूछें",
    samplePdf: "नमूना PDF",
    historyOn: "इतिहास चालू",
    guestMode: "अतिथि मोड",
    removePhoto: "फोटो हटाएँ",
    removePdf: "PDF हटाएँ",
    placeholders: {
      chat: "अपनी पढ़ाई का कोई भी सवाल पूछें…",
      explain: "कौन-सी अवधारणा सरल भाषा में समझनी है?",
      notes: "विषय या अध्याय भेजें — मैं परीक्षा-तैयार नोट्स बनाऊँगा…",
      quiz: "किस विषय पर प्रश्नोत्तरी चाहिए?",
      exam: "परीक्षा + विषय + टॉपिक लिखें…",
      photo: "इस फोटो से क्या हल या समझाना है? (वैकल्पिक)",
      pdf: "इस PDF से क्या करना है? सारांश, नोट्स, MCQ या कोई प्रश्न…",
    },
  },
  Kannada: {
    photoReady: "ಫೋಟೋ ಸಿದ್ಧವಾಗಿದೆ",
    pdfReady: "PDF ಸಿದ್ಧವಾಗಿದೆ",
    studyImage: "ಅಧ್ಯಯನ ಚಿತ್ರ",
    studyPdf: "ಅಧ್ಯಯನ PDF",
    photoSolve: "ಫೋಟೋ ಪರಿಹಾರ",
    askPdf: "PDF ಅನ್ನು ಕೇಳಿ",
    samplePdf: "ಮಾದರಿ PDF",
    historyOn: "ಇತಿಹಾಸ ಆನ್",
    guestMode: "ಅತಿಥಿ ಮೋಡ್",
    removePhoto: "ಫೋಟೋ ತೆಗೆದುಹಾಕಿ",
    removePdf: "PDF ತೆಗೆದುಹಾಕಿ",
    placeholders: {
      chat: "ನಿಮ್ಮ ಅಧ್ಯಯನದ ಯಾವುದೇ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ…",
      explain: "ಯಾವ ಪರಿಕಲ್ಪನೆಯನ್ನು ಸರಳವಾಗಿ ವಿವರಿಸಬೇಕು?",
      notes: "ವಿಷಯ ಅಥವಾ ಅಧ್ಯಾಯ ಕಳುಹಿಸಿ — ಪರೀಕ್ಷೆಗೆ ಉಪಯುಕ್ತ ಟಿಪ್ಪಣಿಗಳನ್ನು ಮಾಡುತ್ತೇನೆ…",
      quiz: "ಯಾವ ವಿಷಯದ ಮೇಲೆ ಕ್ವಿಜ್ ಬೇಕು?",
      exam: "ಪರೀಕ್ಷೆ + ವಿಷಯ + ಪಾಠ ಬರೆಯಿರಿ…",
      photo: "ಈ ಫೋಟೋದಿಂದ ಏನು ಪರಿಹರಿಸಬೇಕು ಅಥವಾ ವಿವರಿಸಬೇಕು? (ಐಚ್ಛಿಕ)",
      pdf: "ಈ PDF ನಿಂದ ಏನು ಬೇಕು? ಸಾರಾಂಶ, ಟಿಪ್ಪಣಿಗಳು, MCQ ಅಥವಾ ಪ್ರಶ್ನೆ…",
    },
  },
  Tamil: {
    photoReady: "படம் தயாராக உள்ளது",
    pdfReady: "PDF தயாராக உள்ளது",
    studyImage: "படிப்பு படம்",
    studyPdf: "படிப்பு PDF",
    photoSolve: "படத்தை தீர்க்கவும்",
    askPdf: "PDF-ஐ கேளுங்கள்",
    samplePdf: "மாதிரி PDF",
    historyOn: "வரலாறு சேமிப்பு இயங்குகிறது",
    guestMode: "விருந்தினர் முறை",
    removePhoto: "படத்தை நீக்கு",
    removePdf: "PDF-ஐ நீக்கு",
    placeholders: {
      chat: "உங்கள் படிப்பைப் பற்றி எதையும் கேளுங்கள்…",
      explain: "எந்த கருத்தை எளிமையாக விளக்க வேண்டும்?",
      notes: "தலைப்பு அல்லது அத்தியாயத்தை அனுப்புங்கள் — தேர்வுக்கான குறிப்புகள் உருவாக்குகிறேன்…",
      quiz: "எந்த தலைப்பில் வினாடி வினா வேண்டும்?",
      exam: "தேர்வு + பாடம் + தலைப்பை எழுதுங்கள்…",
      photo: "இந்த படத்தில் என்ன தீர்க்க அல்லது விளக்க வேண்டும்? (விருப்பம்)",
      pdf: "இந்த PDF-இல் என்ன செய்ய வேண்டும்? சுருக்கம், குறிப்புகள், MCQ அல்லது கேள்வி…",
    },
  },
  Telugu: {
    photoReady: "ఫోటో సిద్ధంగా ఉంది",
    pdfReady: "PDF సిద్ధంగా ఉంది",
    studyImage: "చదువు చిత్రం",
    studyPdf: "చదువు PDF",
    photoSolve: "ఫోటో పరిష్కారం",
    askPdf: "PDF ను అడగండి",
    samplePdf: "నమూనా PDF",
    historyOn: "హిస్టరీ ఆన్",
    guestMode: "గెస్ట్ మోడ్",
    removePhoto: "ఫోటో తొలగించండి",
    removePdf: "PDF తొలగించండి",
    placeholders: {
      chat: "మీ చదువుకు సంబంధించిన ఏ ప్రశ్నైనా అడగండి…",
      explain: "ఏ భావనను సులభంగా వివరించాలి?",
      notes: "టాపిక్ లేదా అధ్యాయం పంపండి — పరీక్షకు ఉపయోగపడే నోట్స్ తయారు చేస్తాను…",
      quiz: "ఏ టాపిక్‌పై క్విజ్ కావాలి?",
      exam: "పరీక్ష + విషయం + టాపిక్ రాయండి…",
      photo: "ఈ ఫోటోలో ఏమి పరిష్కరించాలి లేదా వివరించాలి? (ఐచ్ఛికం)",
      pdf: "ఈ PDF తో ఏమి చేయాలి? సారాంశం, నోట్స్, MCQ లేదా ప్రశ్న…",
    },
  },
  Bengali: {
    photoReady: "ছবি প্রস্তুত",
    pdfReady: "PDF প্রস্তুত",
    studyImage: "পড়ার ছবি",
    studyPdf: "পড়ার PDF",
    photoSolve: "ছবি সমাধান",
    askPdf: "PDF-কে জিজ্ঞাসা করুন",
    samplePdf: "নমুনা PDF",
    historyOn: "ইতিহাস চালু",
    guestMode: "অতিথি মোড",
    removePhoto: "ছবি সরান",
    removePdf: "PDF সরান",
    placeholders: {
      chat: "আপনার পড়াশোনা নিয়ে যেকোনো প্রশ্ন করুন…",
      explain: "কোন ধারণাটি সহজভাবে বুঝতে চান?",
      notes: "বিষয় বা অধ্যায় পাঠান — পরীক্ষার উপযোগী নোট বানাব…",
      quiz: "কোন বিষয়ে কুইজ চান?",
      exam: "পরীক্ষা + বিষয় + টপিক লিখুন…",
      photo: "এই ছবিতে কী সমাধান বা ব্যাখ্যা করতে হবে? (ঐচ্ছিক)",
      pdf: "এই PDF থেকে কী চান? সারাংশ, নোট, MCQ বা প্রশ্ন…",
    },
  },
  Gujarati: {
    photoReady: "ફોટો તૈયાર છે",
    pdfReady: "PDF તૈયાર છે",
    studyImage: "અભ્યાસ ચિત્ર",
    studyPdf: "અભ્યાસ PDF",
    photoSolve: "ફોટો ઉકેલો",
    askPdf: "PDF ને પૂછો",
    samplePdf: "નમૂના PDF",
    historyOn: "હિસ્ટ્રી ચાલુ",
    guestMode: "ગેસ્ટ મોડ",
    removePhoto: "ફોટો દૂર કરો",
    removePdf: "PDF દૂર કરો",
    placeholders: {
      chat: "તમારા અભ્યાસ વિશે કંઈપણ પૂછો…",
      explain: "કયો વિષય સરળ રીતે સમજાવવો છે?",
      notes: "વિષય અથવા અધ્યાય મોકલો — પરીક્ષા માટેના નોટ્સ બનાવીશ…",
      quiz: "કયા વિષય પર ક્વિઝ જોઈએ?",
      exam: "પરીક્ષા + વિષય + ટોપિક લખો…",
      photo: "આ ફોટામાં શું ઉકેલવું અથવા સમજાવવું છે? (વૈકલ્પિક)",
      pdf: "આ PDF માંથી શું જોઈએ? સારાંશ, નોટ્સ, MCQ અથવા પ્રશ્ન…",
    },
  },
  Malayalam: {
    photoReady: "ഫോട്ടോ തയ്യാറാണ്",
    pdfReady: "PDF തയ്യാറാണ്",
    studyImage: "പഠന ചിത്രം",
    studyPdf: "പഠന PDF",
    photoSolve: "ഫോട്ടോ പരിഹാരം",
    askPdf: "PDF-നോട് ചോദിക്കുക",
    samplePdf: "സാമ്പിൾ PDF",
    historyOn: "ഹിസ്റ്ററി ഓൺ",
    guestMode: "ഗസ്റ്റ് മോഡ്",
    removePhoto: "ഫോട്ടോ നീക്കുക",
    removePdf: "PDF നീക്കുക",
    placeholders: {
      chat: "നിങ്ങളുടെ പഠനവുമായി ബന്ധപ്പെട്ട എന്തും ചോദിക്കൂ…",
      explain: "ഏത് ആശയം ലളിതമായി വിശദീകരിക്കണം?",
      notes: "വിഷയം അല്ലെങ്കിൽ അധ്യായം അയയ്ക്കൂ — പരീക്ഷാ നോട്ട്സ് തയ്യാറാക്കാം…",
      quiz: "ഏത് വിഷയത്തിൽ ക്വിസ് വേണം?",
      exam: "പരീക്ഷ + വിഷയം + ടോപ്പിക് എഴുതൂ…",
      photo: "ഈ ഫോട്ടോയിൽ എന്ത് പരിഹരിക്കണം അല്ലെങ്കിൽ വിശദീകരിക്കണം? (ഐച്ഛികം)",
      pdf: "ഈ PDF-ൽ നിന്ന് എന്ത് വേണം? സംഗ്രഹം, നോട്ട്സ്, MCQ അല്ലെങ്കിൽ ചോദ്യം…",
    },
  },
  Marathi: {
    photoReady: "फोटो तयार",
    pdfReady: "PDF तयार",
    studyImage: "अभ्यास चित्र",
    studyPdf: "अभ्यास PDF",
    photoSolve: "फोटो सोडवा",
    askPdf: "PDF ला विचारा",
    samplePdf: "नमुना PDF",
    historyOn: "इतिहास सुरू",
    guestMode: "अतिथी मोड",
    removePhoto: "फोटो काढा",
    removePdf: "PDF काढा",
    placeholders: {
      chat: "तुमच्या अभ्यासाबद्दल काहीही विचारा…",
      explain: "कोणती संकल्पना सोप्या भाषेत समजून घ्यायची आहे?",
      notes: "विषय किंवा धडा पाठवा — परीक्षेसाठी नोट्स तयार करतो…",
      quiz: "कोणत्या विषयावर क्विझ हवी?",
      exam: "परीक्षा + विषय + टॉपिक लिहा…",
      photo: "या फोटोमधून काय सोडवायचे किंवा समजावायचे? (ऐच्छिक)",
      pdf: "या PDF मधून काय हवे? सारांश, नोट्स, MCQ किंवा प्रश्न…",
    },
  },
  Punjabi: {
    photoReady: "ਫੋਟੋ ਤਿਆਰ ਹੈ",
    pdfReady: "PDF ਤਿਆਰ ਹੈ",
    studyImage: "ਪੜ੍ਹਾਈ ਦੀ ਤਸਵੀਰ",
    studyPdf: "ਪੜ੍ਹਾਈ PDF",
    photoSolve: "ਫੋਟੋ ਹੱਲ ਕਰੋ",
    askPdf: "PDF ਨੂੰ ਪੁੱਛੋ",
    samplePdf: "ਨਮੂਨਾ PDF",
    historyOn: "ਹਿਸਟਰੀ ਚਾਲੂ",
    guestMode: "ਗੈਸਟ ਮੋਡ",
    removePhoto: "ਫੋਟੋ ਹਟਾਓ",
    removePdf: "PDF ਹਟਾਓ",
    placeholders: {
      chat: "ਆਪਣੀ ਪੜ੍ਹਾਈ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ…",
      explain: "ਕਿਹੜੀ ਧਾਰਣਾ ਸੌਖੇ ਤਰੀਕੇ ਨਾਲ ਸਮਝਣੀ ਹੈ?",
      notes: "ਵਿਸ਼ਾ ਜਾਂ ਅਧਿਆਇ ਭੇਜੋ — ਇਮਤਿਹਾਨ ਲਈ ਨੋਟਸ ਬਣਾਵਾਂਗਾ…",
      quiz: "ਕਿਹੜੇ ਵਿਸ਼ੇ ਤੇ ਕਵਿਜ਼ ਚਾਹੀਦੀ ਹੈ?",
      exam: "ਇਮਤਿਹਾਨ + ਵਿਸ਼ਾ + ਟਾਪਿਕ ਲਿਖੋ…",
      photo: "ਇਸ ਫੋਟੋ ਵਿੱਚ ਕੀ ਹੱਲ ਜਾਂ ਸਮਝਾਉਣਾ ਹੈ? (ਵਿਕਲਪਿਕ)",
      pdf: "ਇਸ PDF ਤੋਂ ਕੀ ਚਾਹੀਦਾ ਹੈ? ਸਾਰ, ਨੋਟਸ, MCQ ਜਾਂ ਸਵਾਲ…",
    },
  },
  Urdu: {
    photoReady: "تصویر تیار ہے",
    pdfReady: "PDF تیار ہے",
    studyImage: "مطالعہ کی تصویر",
    studyPdf: "مطالعہ PDF",
    photoSolve: "تصویر حل کریں",
    askPdf: "PDF سے پوچھیں",
    samplePdf: "نمونہ PDF",
    historyOn: "ہسٹری آن",
    guestMode: "گیسٹ موڈ",
    removePhoto: "تصویر ہٹائیں",
    removePdf: "PDF ہٹائیں",
    placeholders: {
      chat: "اپنی پڑھائی کے بارے میں کچھ بھی پوچھیں…",
      explain: "کون سا تصور آسان زبان میں سمجھنا ہے؟",
      notes: "موضوع یا باب بھیجیں — امتحان کے لیے نوٹس بناؤں گا…",
      quiz: "کس موضوع پر کوئز چاہیے؟",
      exam: "امتحان + مضمون + موضوع لکھیں…",
      photo: "اس تصویر میں کیا حل یا سمجھانا ہے؟ (اختیاری)",
      pdf: "اس PDF سے کیا چاہیے؟ خلاصہ، نوٹس، MCQ یا سوال…",
    },
  },
};

function selectedLanguage(studentContext: string, language: string) {
  const named = language.includes("—") ? language.split("—").pop()?.trim() : language.trim();
  if (named) return named;

  const medium = studentContext
    .split("|")
    .map((part) => part.trim())
    .find((part) => /\bMedium$/i.test(part));

  return medium ? medium.replace(/\s*Medium$/i, "").trim() : "English";
}

export function getComposerUiText(studentContext: string, language: string) {
  const key = selectedLanguage(studentContext, language);
  return TEXT[key] || (key === "Hinglish" ? HINGLISH : ENGLISH);
}
