import type { NextRequest } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://xnvrscevqdemnxyuvcpf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_94rVXwzqw-HIFsO_kRKG1g_rDaxw6zm";

function serviceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return key;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function serviceHeaders(extra?: Record<string, string>) {
  const key = serviceRoleKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function serviceJson(path: string, init?: RequestInit) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...serviceHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Study source operation failed (${response.status}): ${raw.slice(0, 220)}`);
  }
  return raw ? JSON.parse(raw) : null;
}

export type StudySource = {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  source_type: "pdf" | "text";
  extracted_text: string;
  char_count: number;
  created_at: string;
  updated_at: string;
};

export async function requireSourceUser(req: NextRequest) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("AUTH_REQUIRED");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: authorization,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error("AUTH_REQUIRED");
  const user = await response.json();
  if (!user?.id) throw new Error("AUTH_REQUIRED");
  return { id: String(user.id), email: typeof user.email === "string" ? user.email : "" };
}

export async function listStudySources(userId: string) {
  const rows = await serviceJson(
    `study_sources?user_id=eq.${encodeURIComponent(userId)}&select=id,title,subject,chapter,source_type,char_count,created_at,updated_at&order=created_at.desc&limit=20`
  );
  return Array.isArray(rows) ? rows : [];
}

export async function createStudySource(
  userId: string,
  input: {
    title: string;
    subject?: string;
    chapter?: string;
    sourceType: "pdf" | "text";
    extractedText: string;
  }
) {
  const title = cleanText(input.title, 160);
  const subject = cleanText(input.subject, 100);
  const chapter = cleanText(input.chapter, 160);
  const extractedText = cleanText(input.extractedText, 120_000);

  if (!title || !extractedText) throw new Error("Title aur source text required hai.");

  const rows = await serviceJson("study_sources", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      title,
      subject: subject || null,
      chapter: chapter || null,
      source_type: input.sourceType,
      extracted_text: extractedText,
      char_count: extractedText.length,
      updated_at: new Date().toISOString(),
    }),
  });

  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export async function deleteStudySource(userId: string, sourceId: string) {
  const safeId = encodeURIComponent(sourceId);
  const safeUser = encodeURIComponent(userId);
  await serviceJson(`study_sources?id=eq.${safeId}&user_id=eq.${safeUser}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function getStudySource(userId: string, sourceId: string): Promise<StudySource | null> {
  const rows = await serviceJson(
    `study_sources?id=eq.${encodeURIComponent(sourceId)}&user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`
  );
  return Array.isArray(rows) && rows[0] ? (rows[0] as StudySource) : null;
}

function tokenize(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
        .slice(0, 80)
    )
  );
}

function chunkText(text: string, target = 1400) {
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length <= target) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (current) chunks.push(current);

    if (paragraph.length <= target) {
      current = paragraph;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += target) {
      chunks.push(paragraph.slice(i, i + target));
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks.slice(0, 100);
}

function relevantExcerpt(text: string, query: string) {
  const chunks = chunkText(text);
  if (!chunks.length) return "";

  const tokens = tokenize(query);
  if (!tokens.length) return chunks.slice(0, 4).join("\n\n---\n\n").slice(0, 7000);

  const scored = chunks.map((chunk, index) => {
    const lower = chunk.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (lower.includes(token)) score += token.length >= 7 ? 3 : 1;
    }
    return { chunk, index, score };
  });

  const top = scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 6)
    .filter((item, index) => item.score > 0 || index < 3);

  return top.map((item) => item.chunk).join("\n\n---\n\n").slice(0, 7000);
}

export async function getGroundingContext(
  req: NextRequest,
  sourceId: unknown,
  query: string
) {
  const id = cleanText(sourceId, 80);
  if (!id) return "";

  try {
    const user = await requireSourceUser(req);
    const source = await getStudySource(user.id, id);
    if (!source) return "";

    const excerpt = relevantExcerpt(source.extracted_text, query);
    if (!excerpt) return "";

    return [
      "ACTIVE STUDY SOURCE (student-uploaded material):",
      `Title: ${source.title}`,
      source.subject ? `Subject: ${source.subject}` : "",
      source.chapter ? `Chapter: ${source.chapter}` : "",
      "Grounding rules:",
      "- Treat the source excerpt below as the primary authority for this answer.",
      "- Answer from this source when the student's request is about it.",
      "- Do not invent facts, chapter numbering, definitions or claims that are not supported by the source.",
      "- If the requested detail is not present in the excerpt, clearly say it is not found in the selected source and then offer a general explanation only if useful.",
      "- Do not claim the source is an official/current textbook unless the student identified it that way.",
      "SOURCE EXCERPT:",
      excerpt,
    ].filter(Boolean).join("\n");
  } catch {
    return "";
  }
}
