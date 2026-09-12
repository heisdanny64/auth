import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    let sub: { subscription?: { unsubscribe?: () => void } } | null = null;
    try {
      const authListener = supabase.auth.onAuthStateChange((_event, next) => {
        if (!active) return;
        setSession(next);
        setLoading(false);
      });
      sub = authListener.data;
    } catch (err) {
      console.warn("Could not register auth state listener:", err);
      setLoading(false);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data?.session ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Could not get auth session:", err);
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}
