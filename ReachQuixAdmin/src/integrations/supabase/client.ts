import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getAccessToken } from "@/lib/getAccessToken";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client for database, storage, and edge functions.
 * Auth is handled by Firebase; requests use the Firebase ID token via `accessToken`.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  accessToken: getAccessToken,
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
