export const STUDY_CONTEXTS = [
  "General",
  "Class 6–8",
  "Class 9–10",
  "Class 11–12",
  "CBSE",
  "ICSE",
  "State Board",
  "JEE",
  "NEET",
  "CUET",
  "SSC",
  "College"
] as const;

export type StudyContext = string;

export const SCHOOL_CLASSES = [
  "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6",
  "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"
] as const;

export const SCHOOL_BOARDS = [
  "CBSE", "CISCE (ICSE/ISC)", "NIOS",
  "Andhra Pradesh Board (BSEAP/BIEAP)", "Assam Board (ASSEB)", "Bihar Board (BSEB)",
  "Chhattisgarh Board (CGBSE)", "Goa Board (GBSHSE)", "Gujarat Board (GSEB)",
  "Haryana Board (BSEH)", "Himachal Pradesh Board (HPBOSE)", "Jammu & Kashmir Board (JKBOSE)",
  "Jharkhand Board (JAC)", "Karnataka Board (KSEAB)", "Kerala Board (KBPE/DHSE)",
  "Madhya Pradesh Board (MPBSE)", "Maharashtra Board (MSBSHSE)", "Manipur Board (BOSEM/COHSEM)",
  "Meghalaya Board (MBOSE)", "Mizoram Board (MBSE)", "Nagaland Board (NBSE)",
  "Odisha Board (BSE Odisha/CHSE)", "Punjab Board (PSEB)", "Rajasthan Board (RBSE/BSER)",
  "Sikkim State Board", "Tamil Nadu Board (DGE Tamil Nadu)", "Telangana Board (BSE/TSBIE)",
  "Tripura Board (TBSE)", "Uttar Pradesh Board (UPMSP)", "Uttarakhand Board (UBSE)",
  "West Bengal Board (WBBSE/WBCHSE)"
] as const;

export const STUDY_MEDIUMS = [
  "English Medium", "Hindi Medium", "Assamese Medium", "Bengali Medium", "Bodo Medium",
  "Dogri Medium", "Gujarati Medium", "Kannada Medium", "Kashmiri Medium", "Konkani Medium",
  "Maithili Medium", "Malayalam Medium", "Manipuri Medium", "Marathi Medium", "Nepali Medium",
  "Odia Medium", "Punjabi Medium", "Sanskrit Medium", "Santali Medium", "Sindhi Medium",
  "Tamil Medium", "Telugu Medium", "Urdu Medium"
] as const;

export function buildBoardStudyContext(board: string, schoolClass: string, medium: string) {
  return `${board} | ${schoolClass} | ${medium}`;
}

export function normalizeStudyContext(value?: string): StudyContext {
  const clean = typeof value === "string" ? value.trim().slice(0, 180) : "";
  if (!clean) return "General";
  if (STUDY_CONTEXTS.includes(clean as (typeof STUDY_CONTEXTS)[number])) return clean;

  const [board, schoolClass, medium] = clean.split(" | ");
  if (
    SCHOOL_BOARDS.includes(board as (typeof SCHOOL_BOARDS)[number]) &&
    SCHOOL_CLASSES.includes(schoolClass as (typeof SCHOOL_CLASSES)[number]) &&
    STUDY_MEDIUMS.includes(medium as (typeof STUDY_MEDIUMS)[number])
  ) return clean;

  return "General";
}
