import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

export type SavedConversation = {
  id: string;
  title: string;
  mode: string;
  language: string;
  updated_at: string;
};

export type SavedMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function sendMagicLink(email: string) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured yet.");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
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
    .select("id,title,mode,language,updated_at")
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
    })
    .eq("id", conversationId)
    .eq("user_id", params.userId);

  if (updateError) throw updateError;

  return conversationId;
}
