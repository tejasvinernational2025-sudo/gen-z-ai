import { createClient, SupabaseClient } from "@supabase/supabase-js";

const PRODUCTION_SUPABASE_URL = "https://xnvrscevqdemnxyuvcpf.supabase.co";
const PRODUCTION_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_94rVXwzqw-HIFsO_kRKG1g_rDaxw6zm";

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    PRODUCTION_SUPABASE_URL;

  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    PRODUCTION_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return null;

  if (!client) {
    client = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}
