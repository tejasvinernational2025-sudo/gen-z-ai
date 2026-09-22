export const LANGUAGES = [
  "English",
  "Hinglish",
  "हिन्दी — Hindi",
  "অসমীয়া — Assamese",
  "বাংলা — Bengali",
  "बड़ो — Bodo",
  "डोगरी — Dogri",
  "ગુજરાતી — Gujarati",
  "ಕನ್ನಡ — Kannada",
  "کٲشُر — Kashmiri",
  "कोंकणी — Konkani",
  "मैथिली — Maithili",
  "മലയാളം — Malayalam",
  "মৈতৈলোন্ — Manipuri",
  "मराठी — Marathi",
  "नेपाली — Nepali",
  "ଓଡ଼ିଆ — Odia",
  "ਪੰਜਾਬੀ — Punjabi",
  "संस्कृतम् — Sanskrit",
  "ᱥᱟᱱᱛᱟᱲᱤ — Santali",
  "سنڌي — Sindhi",
  "தமிழ் — Tamil",
  "తెలుగు — Telugu",
  "اردو — Urdu"
] as const;

export type Language = (typeof LANGUAGES)[number];
