import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Tick02Icon as Check,
  Loading03Icon as Loader2,
  Alert02Icon as TriangleAlert,
} from "hugeicons-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { safeNavigate } from "@/lib/navigation";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in · Spün" },
      { name: "description", content: "Completing your Spün sign-in securely." },
      { property: "og:title", content: "Signing you in · Spün" },
      { property: "og:description", content: "Completing your Spün sign-in securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthCallback,
});

type Status = "loading" | "success" | "error";

const loadingSteps = [
  "Verifying your identity…",
  "Exchanging secure tokens…",
  "Preparing your Spün session…",
];

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState(loadingSteps[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "loading") return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % loadingSteps.length;
      setMessage(loadingSteps[i]);
    }, 1400);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    let cancelled = false;

    async function complete() {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errDesc = params.get("error_description") ?? hash.get("error_description");
      if (errDesc) {
        if (!cancelled) {
          setError(errDesc);
          setStatus("error");
        }
        return;
      }

      const code = params.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError && !cancelled) {
          setError(exchangeError.message);
          setStatus("error");
          return;
        }
      }

      // Implicit / magic-link flows land the session via detectSessionInUrl.
      for (let attempt = 0; attempt < 12; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) {
            setStatus("success");
            setMessage("You're signed in.");
            setTimeout(() => {
              const next = params.get("next") ?? "/onboarding";
              safeNavigate(navigate, next, { replace: true });
            }, 900);
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }

      if (!cancelled) {
        setError("We couldn't find a session. Please try signing in again.");
        setStatus("error");
      }
    }

    void complete();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <AuthShell
      eyebrow="Callback"
      title={
        status === "success"
          ? "You're in"
          : status === "error"
            ? "Sign-in failed"
            : "Finishing sign-in"
      }
      subtitle={
        status === "error"
          ? "Something interrupted the handshake with your provider."
          : "Hang tight while we finish setting up your session."
      }
      footer={
        status === "error" ? (
          <Link to="/" className="font-medium text-brand hover:underline">
            Back to sign in
          </Link>
        ) : undefined
      }
    >
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        {status === "loading" ? (
          <Loader2 className="size-9 animate-spin text-brand" />
        ) : status === "success" ? (
          <span className="grid size-10 place-items-center rounded-full bg-brand-gradient text-brand-foreground">
            <Check className="size-5" />
          </span>
        ) : (
          <span className="grid size-10 place-items-center rounded-full border border-destructive/40 text-destructive">
            <TriangleAlert className="size-5" />
          </span>
        )}
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {status === "error" ? error : message}
        </p>
        {status === "error" ? (
          <Button variant="hero" size="xl" className="w-full" onClick={() => navigate({ to: "/" })}>
            Try again
          </Button>
        ) : null}
      </div>
    </AuthShell>
  );
}
