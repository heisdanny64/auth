import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const authStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;

    try {
      // If this tab was specifically designated as session-only, read from sessionStorage
      if (sessionStorage.getItem("spun_auth_session_only") === "true") {
        return sessionStorage.getItem(key);
      }

      // If remember me is active, read from localStorage
      if (localStorage.getItem("spun_auth_remember") === "true") {
        return localStorage.getItem(key);
      }

      // Check sessionStorage as priority fallback
      const sessionVal = sessionStorage.getItem(key);
      if (sessionVal) return sessionVal;

      return null;
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;

    try {
      if (sessionStorage.getItem("spun_auth_session_only") === "true") {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      }
    } catch (err) {
      void err;
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch (err) {
      void err;
    }
  },
};

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables.",
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: authStorage,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
