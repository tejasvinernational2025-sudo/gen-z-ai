import { getAccessToken } from "@/lib/chat-history";

export type StudySourceSummary = {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  source_type: "pdf" | "text";
  char_count: number;
  created_at: string;
  updated_at: string;
};

async function requestSources(init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) throw new Error("Sign in required.");

  const response = await fetch("/api/sources", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Study source response read nahi hua.");
  }

  if (!response.ok) throw new Error(data?.error || "Study source action failed.");
  return data;
}

export async function listStudySourcesClient(): Promise<StudySourceSummary[]> {
  const data = await requestSources({ method: "GET" });
  return Array.isArray(data?.sources) ? data.sources : [];
}

export async function createPdfStudySource(input: {
  title: string;
  subject: string;
  chapter: string;
  pdfDataUrl: string;
}) {
  return requestSources({
    method: "POST",
    body: JSON.stringify({
      action: "create",
      sourceType: "pdf",
      ...input,
    }),
  });
}

export async function createTextStudySource(input: {
  title: string;
  subject: string;
  chapter: string;
  text: string;
}) {
  return requestSources({
    method: "POST",
    body: JSON.stringify({
      action: "create",
      sourceType: "text",
      ...input,
    }),
  });
}

export async function deleteStudySourceClient(sourceId: string) {
  return requestSources({
    method: "POST",
    body: JSON.stringify({ action: "delete", sourceId }),
  });
}
