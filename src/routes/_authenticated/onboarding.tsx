import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Check, NavArrowRight as ChevronRight, SystemRestart as Loader2 } from "iconoir-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HandleInput } from "@/components/auth/HandleInput";
import { useSession } from "@/hooks/useSession";
import { useHandleChecker, type UseHandleCheckerResult } from "@/hooks/useHandleChecker";
import { completeProfile, destinationForUser, slugifyHandle } from "@/lib/profiles";
import { StylePicker } from "@/components/avatar/StylePicker";
import { AvatarBuilder } from "@/components/avatar/AvatarBuilder";
import type { AvatarOptions } from "@/lib/dicebear";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  validateSearch: (search) => ({ next: typeof search.next === "string" ? search.next : undefined }),
  beforeLoad: async ({ location }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/" });
    const destination = await destinationForUser(data.user.id);
    if (destination === "/me" && location.pathname === "/onboarding") throw redirect({ to: "/me" });
  },
  loader: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    return { user: data.user ?? null };
  },
  head: () => ({
    meta: [
      { title: "Set up your Spün identity" },
      { name: "description", content: "Choose your Spün identity and build an avatar." },
      { property: "og:title", content: "Set up your Spün identity" },
      { property: "og:description", content: "Choose your Spün identity and build an avatar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

type Phase = "identity" | "style" | "builder" | "finish";

type ProfileDraft = {
  displayName: string;
  handle: string;
  style: string | null;
  avatar: Record<string, unknown> | null;
};

function initialName(user: ReturnType<typeof useSession>["user"]) {
  return String(
    user?.user_metadata?.["full_name"] ??
      user?.user_metadata?.["name"] ??
      user?.user_metadata?.["user_name"] ??
      user?.email?.split("@")[0] ??
      "",
  );
}

function Onboarding() {
  const loaderData = Route.useLoaderData();
  const { user: sessionUser } = useSession();
  const user = sessionUser ?? loaderData?.user ?? null;
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [phase, setPhase] = useState<Phase>("identity");
  const [draft, setDraft] = useState<ProfileDraft>(() => {
    const name = initialName(user);
    return { displayName: name, handle: slugifyHandle(name), style: null, avatar: null };
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useHandleChecker({
    handle: draft.handle,
    userId: user?.id,
    debounceMs: 200,
  });

  useEffect(() => {
    if (!user) return;
    setDraft((current) => {
      if (current.displayName || current.handle) return current;
      const name = initialName(user);
      return { ...current, displayName: name, handle: slugifyHandle(name) };
    });
  }, [user]);

  const identityReady =
    Boolean(draft.displayName.trim()) && handleCheck.isValid && !handleCheck.checking;

  function chooseStyle(style: string) {
    setDraft((current) => ({ ...current, style }));
  }

  function handleSkipAvatar() {
    // Skipping explicitly writes null to the avatar_config column in profiles
    setDraft((current) => ({ ...current, avatar: null }));
    setPhase("finish");
  }

  async function handleFinish() {
    if (!user) return;
    setPending(true);
    setError(null);
    try {
      await completeProfile({
        id: user.id,
        handle: draft.handle,
        displayName: draft.displayName.trim(),
        avatarConfig: draft.avatar,
      });

      const next = search.next ?? "/me";
      if (next.includes("?")) {
        window.location.replace(next);
      } else {
        navigate({ to: next, replace: true });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your profile");
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-background bg-halo px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <img src="/spun-logo.svg" alt="Spün mark" className="size-9" />
            <span className="font-display text-xl font-semibold tracking-tight">Spün</span>
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Your setup
          </span>
        </header>

        <section className="overflow-hidden rounded-3xl border-2 border-border bg-card/95 shadow-lift backdrop-blur-sm">
          <Progress current={phase} />

          <div className="p-6 sm:p-10">
            {phase === "identity" ? (
              <IdentityStep
                draft={draft}
                setDraft={setDraft}
                handleCheck={handleCheck}
                ready={identityReady}
                onContinue={() => setPhase("style")}
              />
            ) : null}

            {phase === "style" ? (
              <StylePicker
                selectedStyle={draft.style}
                onSelectStyle={chooseStyle}
                onContinue={() => setPhase("builder")}
                onBack={() => setPhase("identity")}
                onSkip={handleSkipAvatar}
                showSkip={true}
              />
            ) : null}

            {phase === "builder" && draft.style ? (
              <AvatarBuilder
                style={draft.style}
                initialOptions={(draft.avatar as AvatarOptions) ?? undefined}
                userHandle={draft.handle}
                onContinue={(config) => {
                  setDraft((current) => ({ ...current, avatar: config }));
                  setPhase("finish");
                }}
                onBack={() => setPhase("style")}
                onSkip={handleSkipAvatar}
                showSkip={true}
                continueLabel="Continue"
              />
            ) : null}

            {phase === "finish" ? (
              <FinishStep pending={pending} error={error} onFinish={handleFinish} />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Progress({ current }: { current: Phase }) {
  // Step 2 is a two-phase experience. Both phases happen under Step 2.
  // The progress bar stays on Step 2 the entire time.
  const step = current === "identity" ? 1 : current === "style" || current === "builder" ? 2 : 3;

  return (
    <div className="border-b-2 border-border px-5 py-6 sm:px-10">
      <div className="mx-auto flex max-w-lg items-center">
        {[1, 2, 3].map((item, index) => (
          <div key={item} className="contents">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold transition-colors ${
                item < step
                  ? "border-brand bg-brand text-brand-foreground"
                  : item === step
                    ? "border-brand bg-brand/15 text-brand"
                    : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {item < step ? <Check className="size-4" /> : item}
            </span>
            {index < 2 ? (
              <span
                className={`h-0.5 flex-1 transition-colors ${item < step ? "bg-brand" : "bg-border"}`}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function IdentityStep({
  draft,
  setDraft,
  handleCheck,
  ready,
  onContinue,
}: {
  draft: ProfileDraft;
  setDraft: Dispatch<SetStateAction<ProfileDraft>>;
  handleCheck: UseHandleCheckerResult;
  ready: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-wider text-brand uppercase">
          Step 1 · Identity
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-display">
          Make it yours.
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Choose how you’ll show up across every Spün session.
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2 text-left">
          <Label htmlFor="identity-display-name">Display Name</Label>
          <Input
            id="identity-display-name"
            value={draft.displayName}
            onChange={(event) =>
              setDraft((current) => ({ ...current, displayName: event.target.value }))
            }
            placeholder="Ada Okoye"
            autoComplete="name"
            className="bg-surface/50 rounded-md"
          />
        </div>

        <HandleInput
          id="identity-handle"
          label="Username"
          value={draft.handle}
          onChange={(handle) =>
            setDraft((current) => ({
              ...current,
              handle,
            }))
          }
          handleCheck={handleCheck}
          placeholder="ada_okoye"
          autoComplete="username"
          helperText="Lowercase letters, numbers and underscores only."
        />

        <Button
          variant="hero"
          size="xl"
          className="mt-3 w-full"
          disabled={!ready}
          onClick={onContinue}
        >
          Continue <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function FinishStep({
  pending,
  error,
  onFinish,
}: {
  pending: boolean;
  error: string | null;
  onFinish: () => void;
}) {
  // Fire confetti burst on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        confetti({
          particleCount: 110,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#D4A017", "#ffffff", "#1abc9c", "#e74c3c", "#3498db"],
        });
      } catch {
        // Ignored
      }
    }, 100);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto max-w-xl text-center py-6 sm:py-10">
      {/* Animated Checkmark */}
      <div className="relative mx-auto size-24 sm:size-28 flex items-center justify-center my-4">
        <div className="absolute inset-0 rounded-full bg-brand/20 blur-xl animate-pulse pointer-events-none" />
        <div className="onboarding-check relative size-20 sm:size-24 rounded-full border border-brand/40 bg-brand/10 flex items-center justify-center shadow-lg">
          <svg
            className="size-16 sm:size-18"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="28" className="stroke-brand/20" strokeWidth="3.5" />
            <circle
              cx="32"
              cy="32"
              r="28"
              className="stroke-brand animate-draw-circle"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="176"
              strokeDashoffset="176"
            />
            <path
              d="M19 33L28 42L45 23"
              className="stroke-brand animate-draw-check"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset="40"
            />
          </svg>
        </div>
      </div>

      <p className="mt-6 text-xs font-semibold tracking-wider text-brand uppercase">
        Step 3 · Complete
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl font-display">
        You’re all set
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Your digital identity has been minted. Step inside Spün and begin exploring what awaits you.
      </p>

      {error ? (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button
        variant="hero"
        size="xl"
        className="mt-8 w-full max-w-sm mx-auto shadow-md"
        onClick={onFinish}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin size-4 mr-2" /> Saving…
          </>
        ) : (
          <>Finish</>
        )}
      </Button>
    </div>
  );
}
