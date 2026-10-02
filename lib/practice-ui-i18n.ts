export type PracticeUiText = {
  eyebrow: string;
  title: string;
  loading: string;
  question: string;
  hint: string;
  hideHint: string;
  answerPlaceholder: string;
  checking: string;
  checkAnswer: string;
  score: string;
  nextQuestion: string;
  nextSet: string;
  signInSave: string;
  retry: string;
  level: Record<"easy" | "medium" | "hard", string>;
};

const ENGLISH: PracticeUiText = {
  eyebrow: "PHOTO → PRACTICE",
  title: "Practice this concept now",
  loading: "Creating 3 similar questions from the photo solution…",
  question: "Question",
  hint: "Hint",
  hideHint: "Hide hint",
  answerPlaceholder: "Write your answer here…",
  checking: "Checking…",
  checkAnswer: "Check my answer",
  score: "Score",
  nextQuestion: "Next question →",
  nextSet: "Next adaptive set →",
  signInSave: "Sign in to save answers to your mastery and weak-topic profile.",
  retry: "Retry",
  level: { easy: "Easy", medium: "Medium", hard: "Hard" },
};

const TEXT: Record<string, PracticeUiText> = {
  English: ENGLISH,
  Hinglish: {
    eyebrow: "PHOTO → PRACTICE",
    title: "Ab isi concept par practice karo",
    loading: "Photo solution se 3 similar questions ban rahe hain…",
    question: "Question",
    hint: "Hint",
    hideHint: "Hint chhupao",
    answerPlaceholder: "Apna answer yahan likho…",
    checking: "Check ho raha hai…",
    checkAnswer: "Answer check karo",
    score: "Score",
    nextQuestion: "Agla question →",
    nextSet: "Agla adaptive set →",
    signInSave: "Sign in karoge to answers mastery aur weak-topic profile me save honge.",
    retry: "Dobara try karo",
    level: { easy: "Easy", medium: "Medium", hard: "Hard" },
  },
  Hindi: {
    eyebrow: "फोटो → अभ्यास",
    title: "अब इसी अवधारणा का अभ्यास करें",
    loading: "फोटो के समाधान से 3 मिलते-जुलते प्रश्न बनाए जा रहे हैं…",
    question: "प्रश्न",
    hint: "संकेत",
    hideHint: "संकेत छिपाएँ",
    answerPlaceholder: "अपना उत्तर यहाँ लिखें…",
    checking: "जाँच हो रही है…",
    checkAnswer: "उत्तर जाँचें",
    score: "अंक",
    nextQuestion: "अगला प्रश्न →",
    nextSet: "अगला अभ्यास सेट →",
    signInSave: "साइन इन करने पर उत्तर आपकी प्रगति और कमजोर विषयों में सहेजे जाएँगे।",
    retry: "फिर कोशिश करें",
    level: { easy: "आसान", medium: "मध्यम", hard: "कठिन" },
  },
  Kannada: {
    eyebrow: "ಫೋಟೋ → ಅಭ್ಯಾಸ",
    title: "ಈಗ ಇದೇ ಪರಿಕಲ್ಪನೆಯನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ",
    loading: "ಫೋಟೋ ಪರಿಹಾರದಿಂದ 3 ಹೋಲುವ ಪ್ರಶ್ನೆಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗುತ್ತಿದೆ…",
    question: "ಪ್ರಶ್ನೆ",
    hint: "ಸುಳಿವು",
    hideHint: "ಸುಳಿವು ಮರೆಮಾಡಿ",
    answerPlaceholder: "ನಿಮ್ಮ ಉತ್ತರವನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ…",
    checking: "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…",
    checkAnswer: "ಉತ್ತರ ಪರಿಶೀಲಿಸಿ",
    score: "ಅಂಕ",
    nextQuestion: "ಮುಂದಿನ ಪ್ರಶ್ನೆ →",
    nextSet: "ಮುಂದಿನ ಅಭ್ಯಾಸ ಸೆಟ್ →",
    signInSave: "ಸೈನ್ ಇನ್ ಮಾಡಿದರೆ ಉತ್ತರಗಳು ನಿಮ್ಮ ಪ್ರಗತಿ ಮತ್ತು ದುರ್ಬಲ ವಿಷಯಗಳ ಪ್ರೊಫೈಲ್‌ನಲ್ಲಿ ಉಳಿಯುತ್ತವೆ.",
    retry: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    level: { easy: "ಸುಲಭ", medium: "ಮಧ್ಯಮ", hard: "ಕಠಿಣ" },
  },
  Bengali: {
    eyebrow: "ছবি → অনুশীলন",
    title: "এখন এই ধারণাটিই অনুশীলন করুন",
    loading: "ছবির সমাধান থেকে ৩টি একই ধরনের প্রশ্ন তৈরি হচ্ছে…",
    question: "প্রশ্ন",
    hint: "ইঙ্গিত",
    hideHint: "ইঙ্গিত লুকান",
    answerPlaceholder: "আপনার উত্তর এখানে লিখুন…",
    checking: "যাচাই করা হচ্ছে…",
    checkAnswer: "উত্তর যাচাই করুন",
    score: "স্কোর",
    nextQuestion: "পরের প্রশ্ন →",
    nextSet: "পরের অনুশীলন সেট →",
    signInSave: "সাইন ইন করলে উত্তর ও দুর্বল বিষয়ের অগ্রগতি সংরক্ষিত হবে।",
    retry: "আবার চেষ্টা করুন",
    level: { easy: "সহজ", medium: "মাঝারি", hard: "কঠিন" },
  },
  Gujarati: {
    eyebrow: "ફોટો → અભ્યાસ",
    title: "હવે આ જ સંકલ્પનાનો અભ્યાસ કરો",
    loading: "ફોટોના ઉકેલ પરથી 3 સમાન પ્રશ્નો તૈયાર થઈ રહ્યા છે…",
    question: "પ્રશ્ન",
    hint: "સંકેત",
    hideHint: "સંકેત છુપાવો",
    answerPlaceholder: "તમારો જવાબ અહીં લખો…",
    checking: "ચકાસી રહ્યા છીએ…",
    checkAnswer: "જવાબ ચકાસો",
    score: "સ્કોર",
    nextQuestion: "આગળનો પ્રશ્ન →",
    nextSet: "આગળનો અભ્યાસ સેટ →",
    signInSave: "સાઇન ઇન કરશો તો જવાબો તમારી પ્રગતિ અને નબળા વિષયોમાં સાચવાશે.",
    retry: "ફરી પ્રયાસ કરો",
    level: { easy: "સરળ", medium: "મધ્યમ", hard: "કઠિન" },
  },
  Malayalam: {
    eyebrow: "ഫോട്ടോ → പരിശീലനം",
    title: "ഇപ്പോൾ ഇതേ ആശയം പരിശീലിക്കുക",
    loading: "ഫോട്ടോ പരിഹാരത്തിൽ നിന്ന് സമാനമായ 3 ചോദ്യങ്ങൾ തയ്യാറാക്കുന്നു…",
    question: "ചോദ്യം",
    hint: "സൂചന",
    hideHint: "സൂചന മറയ്ക്കുക",
    answerPlaceholder: "നിങ്ങളുടെ ഉത്തരം ഇവിടെ എഴുതുക…",
    checking: "പരിശോധിക്കുന്നു…",
    checkAnswer: "ഉത്തരം പരിശോധിക്കുക",
    score: "സ്കോർ",
    nextQuestion: "അടുത്ത ചോദ്യം →",
    nextSet: "അടുത്ത പരിശീലന സെറ്റ് →",
    signInSave: "സൈൻ ഇൻ ചെയ്താൽ ഉത്തരങ്ങളും ദുർബല വിഷയങ്ങളുടെ പുരോഗതിയും സംരക്ഷിക്കും.",
    retry: "വീണ്ടും ശ്രമിക്കുക",
    level: { easy: "എളുപ്പം", medium: "മധ്യം", hard: "കഠിനം" },
  },
  Marathi: {
    eyebrow: "फोटो → सराव",
    title: "आता याच संकल्पनेचा सराव करा",
    loading: "फोटोच्या उत्तरावरून 3 समान प्रश्न तयार होत आहेत…",
    question: "प्रश्न",
    hint: "सूचना",
    hideHint: "सूचना लपवा",
    answerPlaceholder: "तुमचे उत्तर येथे लिहा…",
    checking: "तपासत आहे…",
    checkAnswer: "उत्तर तपासा",
    score: "गुण",
    nextQuestion: "पुढचा प्रश्न →",
    nextSet: "पुढचा सराव संच →",
    signInSave: "साइन इन केल्यावर उत्तरे आणि कमकुवत विषयांची प्रगती जतन होईल.",
    retry: "पुन्हा प्रयत्न करा",
    level: { easy: "सोपे", medium: "मध्यम", hard: "कठीण" },
  },
  Punjabi: {
    eyebrow: "ਫੋਟੋ → ਅਭਿਆਸ",
    title: "ਹੁਣ ਇਸੇ ਧਾਰਣਾ ਦਾ ਅਭਿਆਸ ਕਰੋ",
    loading: "ਫੋਟੋ ਦੇ ਹੱਲ ਤੋਂ 3 ਮਿਲਦੇ-ਜੁਲਦੇ ਸਵਾਲ ਬਣ ਰਹੇ ਹਨ…",
    question: "ਸਵਾਲ",
    hint: "ਇਸ਼ਾਰਾ",
    hideHint: "ਇਸ਼ਾਰਾ ਲੁਕਾਓ",
    answerPlaceholder: "ਆਪਣਾ ਜਵਾਬ ਇੱਥੇ ਲਿਖੋ…",
    checking: "ਜਾਂਚ ਹੋ ਰਹੀ ਹੈ…",
    checkAnswer: "ਜਵਾਬ ਜਾਂਚੋ",
    score: "ਸਕੋਰ",
    nextQuestion: "ਅਗਲਾ ਸਵਾਲ →",
    nextSet: "ਅਗਲਾ ਅਭਿਆਸ ਸੈੱਟ →",
    signInSave: "ਸਾਈਨ ਇਨ ਕਰਨ ਨਾਲ ਜਵਾਬ ਅਤੇ ਕਮਜ਼ੋਰ ਵਿਸ਼ਿਆਂ ਦੀ ਪ੍ਰਗਤੀ ਸੇਵ ਹੋਵੇਗੀ।",
    retry: "ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ",
    level: { easy: "ਆਸਾਨ", medium: "ਦਰਮਿਆਨਾ", hard: "ਮੁਸ਼ਕਲ" },
  },
  Tamil: {
    eyebrow: "படம் → பயிற்சி",
    title: "இப்போது இதே கருத்தைப் பயிற்சி செய்யுங்கள்",
    loading: "படத் தீர்விலிருந்து ஒத்த 3 கேள்விகள் உருவாக்கப்படுகின்றன…",
    question: "கேள்வி",
    hint: "குறிப்பு",
    hideHint: "குறிப்பை மறை",
    answerPlaceholder: "உங்கள் பதிலை இங்கே எழுதுங்கள்…",
    checking: "சரிபார்க்கப்படுகிறது…",
    checkAnswer: "பதிலை சரிபார்க்கவும்",
    score: "மதிப்பெண்",
    nextQuestion: "அடுத்த கேள்வி →",
    nextSet: "அடுத்த பயிற்சி தொகுப்பு →",
    signInSave: "உள்நுழைந்தால் பதில்களும் பலவீனமான தலைப்புகளின் முன்னேற்றமும் சேமிக்கப்படும்.",
    retry: "மீண்டும் முயற்சிக்கவும்",
    level: { easy: "எளிது", medium: "நடுத்தரம்", hard: "கடினம்" },
  },
  Telugu: {
    eyebrow: "ఫోటో → అభ్యాసం",
    title: "ఇప్పుడు ఇదే భావనను అభ్యాసం చేయండి",
    loading: "ఫోటో పరిష్కారం నుంచి ఇలాంటి 3 ప్రశ్నలు తయారవుతున్నాయి…",
    question: "ప్రశ్న",
    hint: "సూచన",
    hideHint: "సూచన దాచండి",
    answerPlaceholder: "మీ సమాధానాన్ని ఇక్కడ రాయండి…",
    checking: "తనిఖీ చేస్తోంది…",
    checkAnswer: "సమాధానం తనిఖీ చేయండి",
    score: "స్కోర్",
    nextQuestion: "తదుపరి ప్రశ్న →",
    nextSet: "తదుపరి అభ్యాస సెట్ →",
    signInSave: "సైన్ ఇన్ చేస్తే సమాధానాలు మరియు బలహీన అంశాల పురోగతి సేవ్ అవుతుంది.",
    retry: "మళ్లీ ప్రయత్నించండి",
    level: { easy: "సులభం", medium: "మధ్యస్థం", hard: "కష్టం" },
  },
  Urdu: {
    eyebrow: "تصویر → مشق",
    title: "اب اسی تصور کی مشق کریں",
    loading: "تصویر کے حل سے 3 ملتے جلتے سوال تیار ہو رہے ہیں…",
    question: "سوال",
    hint: "اشارہ",
    hideHint: "اشارہ چھپائیں",
    answerPlaceholder: "اپنا جواب یہاں لکھیں…",
    checking: "جانچ ہو رہی ہے…",
    checkAnswer: "جواب چیک کریں",
    score: "اسکور",
    nextQuestion: "اگلا سوال →",
    nextSet: "اگلا مشق سیٹ →",
    signInSave: "سائن اِن کرنے پر جوابات اور کمزور موضوعات کی پیش رفت محفوظ ہوگی۔",
    retry: "دوبارہ کوشش کریں",
    level: { easy: "آسان", medium: "درمیانہ", hard: "مشکل" },
  },
};

function languageFromContext(studentContext: string, language: string) {
  const medium = studentContext
    .split("|")
    .map((part) => part.trim())
    .find((part) => /\bMedium$/i.test(part));

  if (medium) return medium.replace(/\s*Medium$/i, "").trim();

  const named = language.includes("—") ? language.split("—").pop()?.trim() : language.trim();
  return named || "English";
}

export function getPracticeUiText(studentContext: string, language: string) {
  const key = languageFromContext(studentContext, language);
  return TEXT[key] || (key === "Hinglish" ? TEXT.Hinglish : ENGLISH);
}
