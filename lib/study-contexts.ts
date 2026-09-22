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

export type StudyContext = (typeof STUDY_CONTEXTS)[number];

export function normalizeStudyContext(value?: string): StudyContext {
  return STUDY_CONTEXTS.includes(value as StudyContext)
    ? (value as StudyContext)
    : "General";
}
