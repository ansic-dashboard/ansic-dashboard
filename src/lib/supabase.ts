import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _failed = false;

export function getSupabase(): SupabaseClient | null {
  if (_failed) return null;
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anonKey) {
    _failed = true;
    return null;
  }
  try {
    _client = createClient(url, anonKey);
    return _client;
  } catch {
    _failed = true;
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
