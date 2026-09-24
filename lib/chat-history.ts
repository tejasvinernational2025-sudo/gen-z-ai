import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

export type SavedConversation = {
  id: string;
  title: string;
  mode: string;
  language: string;
  student_context: string;
  updated_at: string;
};

export type SavedMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}

export async function completeAuthFromUrl(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase || typeof window === "undefined") return null;

  const url = new URL(window.location.href);

  // Supabase may already have auto-detected and exchanged the callback.
  // Prefer that persisted session first to avoid exchanging a one-time code twice.
  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession();

  if (existingSession?.user) {
    if (url.searchParams.has("code") || window.location.hash) {
      url.searchParams.delete("code");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
    return existingSession.user;
  }

  const code = url.searchParams.get("code");

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;

    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, url.pathname + url.search);
    return data.session?.user ?? null;
  }

  if (window.location.hash) {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;

      window.history.replaceState({}, document.title, url.pathname + url.search);
      return data.session?.user ?? null;
    }
  }

  return null;
}

const PRODUCTION_SITE_URL = "https://gen-z-ai-eta.vercel.app";

export async function sendMagicLink(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const redirectTo =
    typeof window !== "undefined" && window.location.origin.startsWith("https://")
      ? window.location.origin
      : PRODUCTION_SITE_URL;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) throw error;
}

export async function signInWithGoogle() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured yet.");
  if (typeof window === "undefined") return;

  const redirectTo = window.location.origin.startsWith("https://")
    ? window.location.origin
    : PRODUCTION_SITE_URL;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) throw error;
}

export async function signOutUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listConversations(userId: string): Promise<SavedConversation[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,mode,language,student_context,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as SavedConversation[];
}

export async function loadConversation(userId: string, conversationId: string): Promise<SavedMessage[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("role,content,created_at")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item) => ({
    role: item.role as "user" | "assistant",
    content: item.content as string,
  }));
}

export async function saveTurn(params: {
  userId: string;
  conversationId: string | null;
  mode: string;
  language: string;
  studentContext: string;
  userText: string;
  assistantText: string;
}) {
  const supabase = getSupabaseClient();
  if (!supabase) return params.conversationId;

  let conversationId = params.conversationId;

  if (!conversationId) {
    const title = params.userText.slice(0, 70) || "New chat";
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: params.userId,
        title,
        mode: params.mode,
        language: params.language,
        student_context: params.studentContext,
      })
      .select("id")
      .single();

    if (error) throw error;
    conversationId = data.id as string;
  }

  const { error: messageError } = await supabase.from("messages").insert([
    {
      conversation_id: conversationId,
      user_id: params.userId,
      role: "user",
      content: params.userText,
    },
    {
      conversation_id: conversationId,
      user_id: params.userId,
      role: "assistant",
      content: params.assistantText,
    },
  ]);

  if (messageError) throw messageError;

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
      mode: params.mode,
      language: params.language,
      student_context: params.studentContext,
    })
    .eq("id", conversationId)
    .eq("user_id", params.userId);

  if (updateError) throw updateError;

  return conversationId;
}
