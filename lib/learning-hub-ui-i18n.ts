export type LearningHubUiText = {
  hubEyebrow: string;
  hubFlow: string;
  hubDescription: string;
  signIn: string;
  close: string;
  view: string;
  homeEyebrow: string;
  homeSignedOutTitle: string;
  homeSignedOutDesc: string;
  homeTodayPlan: string;
  homeSetupTitle: string;
  homeProfileDesc: string;
  editProfile: string;
  setUp: string;
  dailyTarget: string;
  mainGoal: string;
  focusSubjects: string;
  saveProfile: string;
  saving: string;
  weakTracked: string;
  todayProgress: string;
  topicsAttention: string;
  todayPlan: string;
  refreshPlan: string;
  makePlan: string;
  progressEyebrow: string;
  progressTitle: string;
  progressDesc: string;
  viewProgress: string;
  studyPlanCompletion: string;
  activeDays: string;
  attempts: string;
  accuracy: string;
  avgScore: string;
  trend: string;
  needsRevision: string;
  strongTopics: string;
  recentMistakes: string;
  parentSummary: string;
  sourcesEyebrow: string;
  sourcesSignedOutTitle: string;
  sourcesSignedOutDesc: string;
  groundingOn: string;
  makeBookSource: string;
  addSource: string;
  generalAi: string;
  noBookGrounding: string;
  pasteText: string;
  saveUse: string;
  revisionEyebrow: string;
  revisionSignedOutTitle: string;
  revisionSignedOutDesc: string;
  reviseToday: string;
  hide: string;
  revise: string;
  dueToday: string;
  reviewed: string;
  avgRevisionScore: string;
  todaysRevision: string;
  practiceNow: string;
  tomorrow: string;
  upcoming: string;
  refresh: string;
};

const EN: LearningHubUiText = {
  hubEyebrow: "YOUR LEARNING HUB",
  hubFlow: "Plan → Practice → Track → Revise",
  hubDescription: "Manage your daily plan, saved books, progress and smart revision after chatting with your tutor.",
  signIn: "Sign in", close: "Close", view: "View",
  homeEyebrow: "MY AI HOME TUTOR",
  homeSignedOutTitle: "Personal study plan + weak topic tracking",
  homeSignedOutDesc: "Sign in so Gen-z AI can remember your learning.",
  homeTodayPlan: "Today’s personalized study plan",
  homeSetupTitle: "Set up your learning profile",
  homeProfileDesc: "Your board, class, goal and daily study time are saved.",
  editProfile: "Edit profile", setUp: "Set up",
  dailyTarget: "Daily target", mainGoal: "Main goal", focusSubjects: "Focus subjects",
  saveProfile: "Save profile & make today’s plan", saving: "Saving…",
  weakTracked: "Weak topics tracked", todayProgress: "Today progress",
  topicsAttention: "Topics needing attention", todayPlan: "Today’s plan",
  refreshPlan: "Refresh plan", makePlan: "Make plan",
  progressEyebrow: "EXAM PERFORMANCE", progressTitle: "Progress + parent summary",
  progressDesc: "Quiz/practice accuracy, weak topics and study-plan progress in one place.",
  viewProgress: "View progress", studyPlanCompletion: "Study-plan completion", activeDays: "Active days",
  attempts: "Attempts", accuracy: "Accuracy", avgScore: "Avg score", trend: "Trend",
  needsRevision: "Needs revision", strongTopics: "Strong topics", recentMistakes: "Recent mistakes",
  parentSummary: "Parent summary",
  sourcesEyebrow: "CHAPTER / BOOK GROUNDING",
  sourcesSignedOutTitle: "Use your own book as the AI source",
  sourcesSignedOutDesc: "Save a PDF or chapter text and keep answers grounded in the selected source.",
  groundingOn: "Grounding ON", makeBookSource: "Use your book as an AI source",
  addSource: "+ Add source", generalAi: "General AI", noBookGrounding: "No book grounding",
  pasteText: "Paste text", saveUse: "Save & use this source",
  revisionEyebrow: "SMART REVISION", revisionSignedOutTitle: "Revise weak topics before you forget them",
  revisionSignedOutDesc: "Sign in for spaced revision and a Revise Today list.",
  reviseToday: "Revise Today", hide: "Hide", revise: "Revise",
  dueToday: "Due today", reviewed: "Reviewed", avgRevisionScore: "Avg revision score",
  todaysRevision: "Today’s revision", practiceNow: "Practice now", tomorrow: "Tomorrow",
  upcoming: "Upcoming", refresh: "Refresh",
};

const HINGLISH: LearningHubUiText = {
  ...EN,
  hubEyebrow: "YOUR LEARNING HUB",
  hubFlow: "Plan → Practice → Track → Revise",
  hubDescription: "Daily plan, saved books, progress aur smart revision yahan manage karo.",
  homeEyebrow: "MY AI HOME TUTOR",
  homeSignedOutTitle: "Personal study plan + weak topic tracking",
  homeSignedOutDesc: "Sign in karo taaki Gen-z AI tumhari learning yaad rakh sake.",
  homeTodayPlan: "Aaj ka personalized study plan",
  homeSetupTitle: "Apna learning profile set karo",
  homeProfileDesc: "Board, class, goal aur daily study time save hoga.",
  editProfile: "Profile badlo",
  setUp: "Set up",
  dailyTarget: "Daily target",
  mainGoal: "Main goal",
  focusSubjects: "Focus subjects",
  saveProfile: "Profile save karo aur aaj ka plan banao",
  saving: "Save ho raha hai…",
  weakTracked: "Weak topics",
  todayProgress: "Aaj ki progress",
  topicsAttention: "Dhyan dene wale topics",
  todayPlan: "Aaj ka plan",
  refreshPlan: "Plan refresh karo",
  makePlan: "Plan banao",
  progressTitle: "Progress + parent summary",
  progressDesc: "Quiz/practice accuracy, weak topics aur study-plan progress ek jagah.",
  viewProgress: "Progress dekho",
  studyPlanCompletion: "Study-plan completion",
  activeDays: "Active days",
  needsRevision: "Revision chahiye",
  strongTopics: "Strong topics",
  recentMistakes: "Recent mistakes",
  parentSummary: "Parent summary",
  sourcesSignedOutTitle: "Apni book ko AI source banao",
  sourcesSignedOutDesc: "PDF ya chapter text save karke answers selected source ke hisaab se lo.",
  makeBookSource: "Apni book ko AI source banao",
  addSource: "+ Source add karo",
  noBookGrounding: "Book grounding off",
  pasteText: "Text paste karo",
  saveUse: "Save karke use karo",
  revisionSignedOutTitle: "Weak topics bhoolne se pehle revise karo",
  revisionSignedOutDesc: "Spaced revision aur Revise Today list ke liye sign in karo.",
  reviseToday: "Revise Today",
  hide: "Hide",
  revise: "Revise",
  dueToday: "Aaj due",
  reviewed: "Reviewed",
  avgRevisionScore: "Avg revision score",
  todaysRevision: "Aaj ki revision",
  practiceNow: "Practice now",
  tomorrow: "Tomorrow",
  upcoming: "Upcoming",
  refresh: "Refresh",
};

const HI: LearningHubUiText = {
  ...EN,
  hubEyebrow: "आपका लर्निंग हब", hubFlow: "योजना → अभ्यास → प्रगति → दोहराव",
  hubDescription: "दैनिक योजना, सेव की गई किताबें, प्रगति और स्मार्ट रिविजन यहाँ संभालें।",
  signIn: "साइन इन", close: "बंद करें", view: "देखें",
  homeEyebrow: "मेरा AI होम ट्यूटर", homeSignedOutTitle: "व्यक्तिगत अध्ययन योजना + कमजोर विषय ट्रैकिंग",
  homeSignedOutDesc: "साइन इन करें ताकि Gen-z AI आपकी पढ़ाई याद रख सके।",
  homeTodayPlan: "आज की व्यक्तिगत अध्ययन योजना", homeSetupTitle: "अपना लर्निंग प्रोफाइल सेट करें",
  homeProfileDesc: "बोर्ड, कक्षा, लक्ष्य और दैनिक अध्ययन समय सेव होगा।",
  editProfile: "प्रोफाइल बदलें", setUp: "सेट अप", dailyTarget: "दैनिक लक्ष्य", mainGoal: "मुख्य लक्ष्य",
  focusSubjects: "मुख्य विषय", saveProfile: "प्रोफाइल सेव करें और आज की योजना बनाएँ", saving: "सेव हो रहा है…",
  weakTracked: "कमजोर विषय", todayProgress: "आज की प्रगति", topicsAttention: "ध्यान देने वाले विषय",
  todayPlan: "आज की योजना", refreshPlan: "योजना रिफ्रेश करें", makePlan: "योजना बनाएँ",
  progressEyebrow: "परीक्षा प्रदर्शन", progressTitle: "प्रगति + अभिभावक सारांश",
  progressDesc: "क्विज़/अभ्यास की सटीकता, कमजोर विषय और अध्ययन योजना की प्रगति एक जगह।",
  viewProgress: "प्रगति देखें", studyPlanCompletion: "अध्ययन योजना पूर्णता", activeDays: "सक्रिय दिन",
  attempts: "प्रयास", accuracy: "सटीकता", avgScore: "औसत अंक", trend: "रुझान",
  needsRevision: "दोहराव चाहिए", strongTopics: "मजबूत विषय", recentMistakes: "हाल की गलतियाँ",
  parentSummary: "अभिभावक सारांश",
  sourcesEyebrow: "अध्याय / किताब स्रोत", sourcesSignedOutTitle: "अपनी किताब को AI स्रोत बनाएँ",
  sourcesSignedOutDesc: "PDF या अध्याय टेक्स्ट सेव करके उत्तर चुने हुए स्रोत पर आधारित रखें।",
  groundingOn: "स्रोत चालू", makeBookSource: "अपनी किताब को AI स्रोत बनाएँ", addSource: "+ स्रोत जोड़ें",
  generalAi: "सामान्य AI", noBookGrounding: "कोई किताब स्रोत नहीं", pasteText: "टेक्स्ट पेस्ट करें",
  saveUse: "सेव करें और उपयोग करें",
  revisionEyebrow: "स्मार्ट रिविजन", revisionSignedOutTitle: "कमजोर विषय भूलने से पहले दोहराएँ",
  revisionSignedOutDesc: "स्पेस्ड रिविजन और आज की रिविजन सूची के लिए साइन इन करें।",
  reviseToday: "आज रिविजन करें", hide: "छिपाएँ", revise: "रिवाइज करें", dueToday: "आज बाकी",
  reviewed: "रिव्यू किए", avgRevisionScore: "औसत रिविजन अंक", todaysRevision: "आज का रिविजन",
  practiceNow: "अभी अभ्यास करें", tomorrow: "कल", upcoming: "आने वाला", refresh: "रिफ्रेश",
};

const KN: LearningHubUiText = {
  ...EN,
  hubEyebrow: "ನಿಮ್ಮ ಕಲಿಕೆ ಕೇಂದ್ರ", hubFlow: "ಯೋಜನೆ → ಅಭ್ಯಾಸ → ಪ್ರಗತಿ → ಪುನರವಲೋಕನ",
  hubDescription: "ದೈನಂದಿನ ಯೋಜನೆ, ಉಳಿಸಿದ ಪುಸ್ತಕಗಳು, ಪ್ರಗತಿ ಮತ್ತು ಸ್ಮಾರ್ಟ್ ಪುನರವಲೋಕನವನ್ನು ಇಲ್ಲಿ ನಿರ್ವಹಿಸಿ.",
  signIn: "ಸೈನ್ ಇನ್", close: "ಮುಚ್ಚಿ", view: "ನೋಡಿ",
  homeEyebrow: "ನನ್ನ AI ಹೋಮ್ ಟ್ಯೂಟರ್", homeSignedOutTitle: "ವೈಯಕ್ತಿಕ ಅಧ್ಯಯನ ಯೋಜನೆ + ದುರ್ಬಲ ವಿಷಯಗಳ ಟ್ರ್ಯಾಕಿಂಗ್",
  homeSignedOutDesc: "Gen-z AI ನಿಮ್ಮ ಕಲಿಕೆಯನ್ನು ನೆನಪಿಡಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.",
  homeTodayPlan: "ಇಂದಿನ ವೈಯಕ್ತಿಕ ಅಧ್ಯಯನ ಯೋಜನೆ", homeSetupTitle: "ನಿಮ್ಮ ಕಲಿಕೆ ಪ್ರೊಫೈಲ್ ಹೊಂದಿಸಿ",
  homeProfileDesc: "ಬೋರ್ಡ್, ತರಗತಿ, ಗುರಿ ಮತ್ತು ದಿನದ ಅಧ್ಯಯನ ಸಮಯ ಉಳಿಯುತ್ತದೆ.",
  editProfile: "ಪ್ರೊಫೈಲ್ ಬದಲಿಸಿ", setUp: "ಹೊಂದಿಸಿ", dailyTarget: "ದಿನದ ಗುರಿ", mainGoal: "ಮುಖ್ಯ ಗುರಿ",
  focusSubjects: "ಮುಖ್ಯ ವಿಷಯಗಳು", saveProfile: "ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ ಮತ್ತು ಇಂದಿನ ಯೋಜನೆ ಮಾಡಿ", saving: "ಉಳಿಸಲಾಗುತ್ತಿದೆ…",
  weakTracked: "ದುರ್ಬಲ ವಿಷಯಗಳು", todayProgress: "ಇಂದಿನ ಪ್ರಗತಿ", topicsAttention: "ಗಮನ ಬೇಕಾದ ವಿಷಯಗಳು",
  todayPlan: "ಇಂದಿನ ಯೋಜನೆ", refreshPlan: "ಯೋಜನೆ ನವೀಕರಿಸಿ", makePlan: "ಯೋಜನೆ ಮಾಡಿ",
  progressEyebrow: "ಪರೀಕ್ಷಾ ಪ್ರಗತಿ", progressTitle: "ಪ್ರಗತಿ + ಪೋಷಕರ ಸಾರಾಂಶ",
  progressDesc: "ಕ್ವಿಜ್/ಅಭ್ಯಾಸ ನಿಖರತೆ, ದುರ್ಬಲ ವಿಷಯಗಳು ಮತ್ತು ಅಧ್ಯಯನ ಯೋಜನೆ ಪ್ರಗತಿ ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ.",
  viewProgress: "ಪ್ರಗತಿ ನೋಡಿ", studyPlanCompletion: "ಅಧ್ಯಯನ ಯೋಜನೆ ಪೂರ್ಣತೆ", activeDays: "ಸಕ್ರಿಯ ದಿನಗಳು",
  attempts: "ಪ್ರಯತ್ನಗಳು", accuracy: "ನಿಖರತೆ", avgScore: "ಸರಾಸರಿ ಅಂಕ", trend: "ಪ್ರವೃತ್ತಿ",
  needsRevision: "ಪುನರವಲೋಕನ ಬೇಕು", strongTopics: "ಬಲವಾದ ವಿಷಯಗಳು", recentMistakes: "ಇತ್ತೀಚಿನ ತಪ್ಪುಗಳು",
  parentSummary: "ಪೋಷಕರ ಸಾರಾಂಶ",
  sourcesEyebrow: "ಅಧ್ಯಾಯ / ಪುಸ್ತಕ ಮೂಲ", sourcesSignedOutTitle: "ನಿಮ್ಮ ಪುಸ್ತಕವನ್ನು AI ಮೂಲವನ್ನಾಗಿ ಮಾಡಿ",
  sourcesSignedOutDesc: "PDF ಅಥವಾ ಅಧ್ಯಾಯ ಪಠ್ಯ ಉಳಿಸಿ, ಉತ್ತರಗಳನ್ನು ಆಯ್ದ ಮೂಲಕ್ಕೆ ಸೀಮಿತಗೊಳಿಸಿ.",
  groundingOn: "ಮೂಲ ಸಕ್ರಿಯ", makeBookSource: "ನಿಮ್ಮ ಪುಸ್ತಕವನ್ನು AI ಮೂಲವನ್ನಾಗಿ ಮಾಡಿ", addSource: "+ ಮೂಲ ಸೇರಿಸಿ",
  generalAi: "ಸಾಮಾನ್ಯ AI", noBookGrounding: "ಪುಸ್ತಕ ಮೂಲ ಇಲ್ಲ", pasteText: "ಪಠ್ಯ ಅಂಟಿಸಿ", saveUse: "ಉಳಿಸಿ ಮತ್ತು ಬಳಸಿ",
  revisionEyebrow: "ಸ್ಮಾರ್ಟ್ ಪುನರವಲೋಕನ", revisionSignedOutTitle: "ದುರ್ಬಲ ವಿಷಯಗಳನ್ನು ಮರೆತ ಮೊದಲು ಪುನರವಲೋಕಿಸಿ",
  revisionSignedOutDesc: "ಸ್ಪೇಸ್ಡ್ ರಿವಿಷನ್ ಮತ್ತು ಇಂದಿನ ರಿವಿಷನ್ ಪಟ್ಟಿಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ.",
  reviseToday: "ಇಂದು ಪುನರವಲೋಕಿಸಿ", hide: "ಮರೆಮಾಡಿ", revise: "ಪುನರವಲೋಕಿಸಿ", dueToday: "ಇಂದು ಬಾಕಿ",
  reviewed: "ಪರಿಶೀಲಿಸಿದವು", avgRevisionScore: "ಸರಾಸರಿ ರಿವಿಷನ್ ಅಂಕ", todaysRevision: "ಇಂದಿನ ರಿವಿಷನ್",
  practiceNow: "ಈಗ ಅಭ್ಯಾಸ ಮಾಡಿ", tomorrow: "ನಾಳೆ", upcoming: "ಮುಂದಿನವು", refresh: "ನವೀಕರಿಸಿ",
};

const TA: LearningHubUiText = {
  ...EN,
  hubEyebrow: "உங்கள் கற்றல் மையம்", hubFlow: "திட்டம் → பயிற்சி → முன்னேற்றம் → மறுபயிற்சி",
  hubDescription: "தினசரி திட்டம், சேமித்த புத்தகங்கள், முன்னேற்றம் மற்றும் ஸ்மார்ட் ரிவிஷனை இங்கே நிர்வகிக்கவும்.",
  signIn: "உள்நுழைக", close: "மூடு", view: "பார்க்க",
  homeEyebrow: "என் AI ஹோம் டியூட்டர்", homeSignedOutTitle: "தனிப்பட்ட படிப்பு திட்டம் + பலவீன தலைப்பு கண்காணிப்பு",
  homeSignedOutDesc: "Gen-z AI உங்கள் கற்றலை நினைவில் கொள்ள உள்நுழைக.",
  homeTodayPlan: "இன்றைய தனிப்பட்ட படிப்பு திட்டம்", homeSetupTitle: "உங்கள் கற்றல் சுயவிவரத்தை அமைக்கவும்",
  homeProfileDesc: "போர்டு, வகுப்பு, இலக்கு மற்றும் தினசரி படிப்பு நேரம் சேமிக்கப்படும்.",
  editProfile: "சுயவிவரத்தை திருத்து", setUp: "அமை", dailyTarget: "தினசரி இலக்கு", mainGoal: "முக்கிய இலக்கு",
  focusSubjects: "கவனம் செலுத்தும் பாடங்கள்", saveProfile: "சுயவிவரத்தை சேமித்து இன்றைய திட்டத்தை உருவாக்கு", saving: "சேமிக்கிறது…",
  weakTracked: "பலவீன தலைப்புகள்", todayProgress: "இன்றைய முன்னேற்றம்", topicsAttention: "கவனம் தேவைப்படும் தலைப்புகள்",
  todayPlan: "இன்றைய திட்டம்", refreshPlan: "திட்டத்தை புதுப்பி", makePlan: "திட்டம் உருவாக்கு",
  progressEyebrow: "தேர்வு செயல்திறன்", progressTitle: "முன்னேற்றம் + பெற்றோர் சுருக்கம்",
  progressDesc: "வினாடி வினா/பயிற்சி துல்லியம், பலவீன தலைப்புகள் மற்றும் படிப்பு திட்ட முன்னேற்றம் ஒரே இடத்தில்.",
  viewProgress: "முன்னேற்றத்தை பார்க்க", studyPlanCompletion: "படிப்பு திட்ட நிறைவு", activeDays: "செயலில் இருந்த நாட்கள்",
  attempts: "முயற்சிகள்", accuracy: "துல்லியம்", avgScore: "சராசரி மதிப்பெண்", trend: "போக்கு",
  needsRevision: "மறுபயிற்சி தேவை", strongTopics: "வலுவான தலைப்புகள்", recentMistakes: "சமீபத்திய தவறுகள்",
  parentSummary: "பெற்றோர் சுருக்கம்",
  sourcesEyebrow: "அத்தியாயம் / புத்தக ஆதாரம்", sourcesSignedOutTitle: "உங்கள் புத்தகத்தை AI ஆதாரமாக பயன்படுத்துங்கள்",
  sourcesSignedOutDesc: "PDF அல்லது அத்தியாய உரையை சேமித்து தேர்ந்தெடுத்த ஆதாரத்திலிருந்து பதில்களைப் பெறுங்கள்.",
  groundingOn: "ஆதாரம் செயல்பாட்டில்", makeBookSource: "உங்கள் புத்தகத்தை AI ஆதாரமாக மாற்று", addSource: "+ ஆதாரம் சேர்க்க",
  generalAi: "பொது AI", noBookGrounding: "புத்தக ஆதாரம் இல்லை", pasteText: "உரை ஒட்டு", saveUse: "சேமித்து பயன்படுத்தவும்",
  revisionEyebrow: "ஸ்மார்ட் ரிவிஷன்", revisionSignedOutTitle: "பலவீன தலைப்புகளை மறப்பதற்கு முன் மீள்பார்க்கவும்",
  revisionSignedOutDesc: "இடைவெளி ரிவிஷன் மற்றும் இன்றைய ரிவிஷன் பட்டியலுக்கு உள்நுழைக.",
  reviseToday: "இன்று ரிவிஷன்", hide: "மறை", revise: "ரிவிஷன்", dueToday: "இன்று செய்யவேண்டியது",
  reviewed: "மீள்பார்த்தது", avgRevisionScore: "சராசரி ரிவிஷன் மதிப்பெண்", todaysRevision: "இன்றைய ரிவிஷன்",
  practiceNow: "இப்போது பயிற்சி", tomorrow: "நாளை", upcoming: "வரவிருப்பவை", refresh: "புதுப்பி",
};

const TE: LearningHubUiText = {
  ...EN,
  hubEyebrow: "మీ లెర్నింగ్ హబ్", hubFlow: "ప్లాన్ → అభ్యాసం → ప్రగతి → రివిజన్",
  hubDescription: "రోజువారీ ప్లాన్, సేవ్ చేసిన పుస్తకాలు, ప్రగతి మరియు స్మార్ట్ రివిజన్‌ను ఇక్కడ నిర్వహించండి.",
  signIn: "సైన్ ఇన్", close: "మూసివేయండి", view: "చూడండి",
  homeEyebrow: "నా AI హోమ్ ట్యూటర్", homeSignedOutTitle: "వ్యక్తిగత స్టడీ ప్లాన్ + బలహీన అంశాల ట్రాకింగ్",
  homeSignedOutDesc: "Gen-z AI మీ చదువును గుర్తుంచుకోవడానికి సైన్ ఇన్ చేయండి.",
  homeTodayPlan: "ఈరోజు వ్యక్తిగత స్టడీ ప్లాన్", homeSetupTitle: "మీ లెర్నింగ్ ప్రొఫైల్ సెట్ చేయండి",
  homeProfileDesc: "బోర్డు, క్లాస్, లక్ష్యం మరియు రోజువారీ చదువు సమయం సేవ్ అవుతుంది.",
  editProfile: "ప్రొఫైల్ మార్చండి", setUp: "సెట్ అప్", dailyTarget: "రోజువారీ లక్ష్యం", mainGoal: "ప్రధాన లక్ష్యం",
  focusSubjects: "ఫోకస్ విషయాలు", saveProfile: "ప్రొఫైల్ సేవ్ చేసి ఈరోజు ప్లాన్ చేయండి", saving: "సేవ్ అవుతోంది…",
  weakTracked: "బలహీన అంశాలు", todayProgress: "ఈరోజు ప్రగతి", topicsAttention: "శ్రద్ధ అవసరమైన అంశాలు",
  todayPlan: "ఈరోజు ప్లాన్", refreshPlan: "ప్లాన్ రిఫ్రెష్", makePlan: "ప్లాన్ చేయండి",
  progressEyebrow: "పరీక్ష ప్రగతి", progressTitle: "ప్రగతి + పేరెంట్ సారాంశం",
  progressDesc: "క్విజ్/అభ్యాస ఖచ్చితత్వం, బలహీన అంశాలు మరియు స్టడీ ప్లాన్ ప్రగతి ఒకే చోట.",
  viewProgress: "ప్రగతి చూడండి", studyPlanCompletion: "స్టడీ ప్లాన్ పూర్తి", activeDays: "యాక్టివ్ రోజులు",
  attempts: "ప్రయత్నాలు", accuracy: "ఖచ్చితత్వం", avgScore: "సగటు స్కోర్", trend: "ట్రెండ్",
  needsRevision: "రివిజన్ అవసరం", strongTopics: "బలమైన అంశాలు", recentMistakes: "ఇటీవలి తప్పులు",
  parentSummary: "పేరెంట్ సారాంశం",
  sourcesEyebrow: "అధ్యాయం / పుస్తక మూలం", sourcesSignedOutTitle: "మీ పుస్తకాన్ని AI మూలంగా ఉపయోగించండి",
  sourcesSignedOutDesc: "PDF లేదా అధ్యాయం టెక్స్ట్‌ను సేవ్ చేసి సమాధానాలను ఎంపిక చేసిన మూలానికి పరిమితం చేయండి.",
  groundingOn: "మూలం ఆన్", makeBookSource: "మీ పుస్తకాన్ని AI మూలంగా చేయండి", addSource: "+ మూలం జోడించండి",
  generalAi: "సాధారణ AI", noBookGrounding: "పుస్తక మూలం లేదు", pasteText: "టెక్స్ట్ పేస్ట్ చేయండి", saveUse: "సేవ్ చేసి ఉపయోగించండి",
  revisionEyebrow: "స్మార్ట్ రివిజన్", revisionSignedOutTitle: "బలహీన అంశాలను మర్చిపోకముందే రివైజ్ చేయండి",
  revisionSignedOutDesc: "స్పేస్డ్ రివిజన్ మరియు ఈరోజు రివిజన్ జాబితా కోసం సైన్ ఇన్ చేయండి.",
  reviseToday: "ఈరోజు రివిజన్", hide: "దాచండి", revise: "రివైజ్", dueToday: "ఈరోజు బాకీ",
  reviewed: "రివ్యూ చేసినవి", avgRevisionScore: "సగటు రివిజన్ స్కోర్", todaysRevision: "ఈరోజు రివిజన్",
  practiceNow: "ఇప్పుడు అభ్యాసం", tomorrow: "రేపు", upcoming: "రాబోయేవి", refresh: "రిఫ్రెష్",
};

const ML: LearningHubUiText = {
  ...EN,
  hubEyebrow: "നിങ്ങളുടെ പഠന കേന്ദ്രം", hubFlow: "പദ്ധതി → പരിശീലനം → പുരോഗതി → ആവർത്തനം",
  hubDescription: "ദൈനംദിന പദ്ധതി, സേവ് ചെയ്ത പുസ്തകങ്ങൾ, പുരോഗതി, സ്മാർട്ട് റിവിഷൻ എന്നിവ ഇവിടെ നിയന്ത്രിക്കുക.",
  signIn: "സൈൻ ഇൻ", close: "അടയ്ക്കുക", view: "കാണുക",
  homeEyebrow: "എന്റെ AI ഹോം ട്യൂട്ടർ", homeSignedOutTitle: "വ്യക്തിഗത പഠന പദ്ധതി + ദുർബല വിഷയ ട്രാക്കിംഗ്",
  homeSignedOutDesc: "Gen-z AI നിങ്ങളുടെ പഠനം ഓർക്കാൻ സൈൻ ഇൻ ചെയ്യുക.",
  homeTodayPlan: "ഇന്നത്തെ വ്യക്തിഗത പഠന പദ്ധതി", homeSetupTitle: "നിങ്ങളുടെ പഠന പ്രൊഫൈൽ സജ്ജമാക്കുക",
  homeProfileDesc: "ബോർഡ്, ക്ലാസ്, ലക്ഷ്യം, ദിവസേന പഠിക്കുന്ന സമയം എന്നിവ സേവ് ചെയ്യും.",
  editProfile: "പ്രൊഫൈൽ തിരുത്തുക", setUp: "സജ്ജമാക്കുക", dailyTarget: "ദൈനംദിന ലക്ഷ്യം", mainGoal: "പ്രധാന ലക്ഷ്യം",
  focusSubjects: "പ്രധാന വിഷയങ്ങൾ", saveProfile: "പ്രൊഫൈൽ സേവ് ചെയ്ത് ഇന്നത്തെ പദ്ധതി ഉണ്ടാക്കുക", saving: "സേവ് ചെയ്യുന്നു…",
  weakTracked: "ദുർബല വിഷയങ്ങൾ", todayProgress: "ഇന്നത്തെ പുരോഗതി", topicsAttention: "ശ്രദ്ധ വേണ്ട വിഷയങ്ങൾ",
  todayPlan: "ഇന്നത്തെ പദ്ധതി", refreshPlan: "പദ്ധതി പുതുക്കുക", makePlan: "പദ്ധതി ഉണ്ടാക്കുക",
  progressEyebrow: "പരീക്ഷാ പ്രകടനം", progressTitle: "പുരോഗതി + രക്ഷിതൃ സംഗ്രഹം",
  progressDesc: "ക്വിസ്/പരിശീലന കൃത്യത, ദുർബല വിഷയങ്ങൾ, പഠന പദ്ധതിയുടെ പുരോഗതി എന്നിവ ഒരിടത്ത്.",
  viewProgress: "പുരോഗതി കാണുക", studyPlanCompletion: "പഠന പദ്ധതി പൂർത്തീകരണം", activeDays: "സജീവ ദിവസങ്ങൾ",
  attempts: "ശ്രമങ്ങൾ", accuracy: "കൃത്യത", avgScore: "ശരാശരി സ്കോർ", trend: "പ്രവണതി",
  needsRevision: "റിവിഷൻ വേണം", strongTopics: "ശക്തമായ വിഷയങ്ങൾ", recentMistakes: "സമീപകാല തെറ്റുകൾ",
  parentSummary: "രക്ഷിതൃ സംഗ്രഹം",
  sourcesEyebrow: "അധ്യായം / പുസ്തക ഉറവിടം", sourcesSignedOutTitle: "നിങ്ങളുടെ പുസ്തകം AI ഉറവിടമാക്കുക",
  sourcesSignedOutDesc: "PDF അല്ലെങ്കിൽ അധ്യായ ടെക്സ്റ്റ് സേവ് ചെയ്ത് തിരഞ്ഞെടുത്ത ഉറവിടത്തിൽ നിന്നുള്ള ഉത്തരങ്ങൾ നേടുക.",
  groundingOn: "ഉറവിടം ഓൺ", makeBookSource: "നിങ്ങളുടെ പുസ്തകം AI ഉറവിടമാക്കുക", addSource: "+ ഉറവിടം ചേർക്കുക",
  generalAi: "പൊതു AI", noBookGrounding: "പുസ്തക ഉറവിടമില്ല", pasteText: "ടെക്സ്റ്റ് ഒട്ടിക്കുക", saveUse: "സേവ് ചെയ്ത് ഉപയോഗിക്കുക",
  revisionEyebrow: "സ്മാർട്ട് റിവിഷൻ", revisionSignedOutTitle: "ദുർബല വിഷയങ്ങൾ മറക്കുന്നതിന് മുമ്പ് റിവൈസ് ചെയ്യുക",
  revisionSignedOutDesc: "സ്പേസ്ഡ് റിവിഷനും ഇന്നത്തെ റിവിഷൻ പട്ടികക്കും സൈൻ ഇൻ ചെയ്യുക.",
  reviseToday: "ഇന്ന് റിവൈസ് ചെയ്യുക", hide: "മറയ്ക്കുക", revise: "റിവൈസ്", dueToday: "ഇന്ന് ബാക്കി",
  reviewed: "റിവ്യൂ ചെയ്തത്", avgRevisionScore: "ശരാശരി റിവിഷൻ സ്കോർ", todaysRevision: "ഇന്നത്തെ റിവിഷൻ",
  practiceNow: "ഇപ്പോൾ പരിശീലിക്കുക", tomorrow: "നാളെ", upcoming: "വരാനിരിക്കുന്നവ", refresh: "പുതുക്കുക",
};

function selectedLanguage(studentContext: string, language: string) {
  void studentContext;
  const named = language.includes("—") ? language.split("—").pop()?.trim() : language.trim();
  return named || "English";
}

export function getLearningHubUiText(studentContext: string, language: string) {
  const key = selectedLanguage(studentContext, language);
  if (key === "Hindi") return HI;
  if (key === "Kannada") return KN;
  if (key === "Tamil") return TA;
  if (key === "Telugu") return TE;
  if (key === "Malayalam") return ML;
  if (key === "Hinglish") return HINGLISH;
  return EN;
}
