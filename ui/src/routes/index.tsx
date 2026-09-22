import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { SocialRow } from "@/components/auth/SocialRow";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signInWithEmail } from "@/lib/auth";
import { destinationForUser } from "@/lib/profiles";
import { useSession } from "@/hooks/useSession";
import { safeNavigate } from "@/lib/navigation";

export type IndexSearch = {
  returnTo?: string | undefined;
  next?: string | undefined;
  client_id?: string | undefined;
  redirect_uri?: string | undefined;
  state?: string | undefined;
  prompt?: "none" | "login" | undefined;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown> = {}): IndexSearch => ({
    returnTo: typeof search["returnTo"] === "string" ? search["returnTo"] : undefined,
    next: typeof search["next"] === "string" ? search["next"] : undefined,
    client_id: typeof search["client_id"] === "string" ? search["client_id"] : undefined,
    redirect_uri: typeof search["redirect_uri"] === "string" ? search["redirect_uri"] : undefined,
    state: typeof search["state"] === "string" ? search["state"] : undefined,
    prompt:
      search["prompt"] === "none" || search["prompt"] === "login"
        ? (search["prompt"] as "none" | "login")
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in · Spün" },
      {
        name: "description",
        content: "Sign in to Spün to pick up your sessions, playlists and studio settings.",
      },
      { property: "og:title", content: "Sign in · Spün" },
      {
        property: "og:description",
        content: "Sign in to Spün to pick up your sessions, playlists and studio settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const [pending, setPending] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();
  const rawSearch = Route.useSearch();
  const search = rawSearch ?? {};
  const { session } = useSession();

  const customReturnTo =
    search?.returnTo ||
    search?.next ||
    (search?.client_id && search?.redirect_uri
      ? `/authorize?client_id=${encodeURIComponent(search.client_id)}&redirect_uri=${encodeURIComponent(search.redirect_uri)}${search.state ? `&state=${encodeURIComponent(search.state)}` : ""}&auth_completed=1`
      : undefined);

  useEffect(() => {
    if (!session) return;

    if (search?.client_id && search?.redirect_uri) {
      navigate({
        to: "/authorize",
        search: {
          client_id: search.client_id,
          redirect_uri: search.redirect_uri,
          state: search.state,
          prompt: search.prompt === "login" ? undefined : search.prompt,
          auth_completed: "1",
        },
        replace: true,
      });
      return;
    }

    if (customReturnTo) {
      safeNavigate(navigate, customReturnTo, { replace: true });
      return;
    }

    void destinationForUser(session.user.id).then((destination) => {
      navigate({ to: destination, replace: true });
    });
  }, [
    session,
    navigate,
    search?.client_id,
    search?.redirect_uri,
    search?.state,
    search?.prompt,
    customReturnTo,
  ]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const remember = form.get("remember") === "on";
    setPending(true);
    try {
      await signInWithEmail(
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
        remember,
      );
      if (search?.client_id && search?.redirect_uri) {
        navigate({
          to: "/authorize",
          search: {
            client_id: search.client_id,
            redirect_uri: search.redirect_uri,
            state: search.state,
            prompt: search.prompt === "login" ? undefined : search.prompt,
            auth_completed: "1",
          },
          replace: true,
        });
        return;
      }
      if (customReturnTo) {
        safeNavigate(navigate, customReturnTo, { replace: true });
        return;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Sign in to Spün"
      subtitle="Good to see you again. Let's get you signed in."
      footer={
        <>
          New to Spün?{" "}
          <Link
            to="/signup"
            search={{
              client_id: search.client_id,
              redirect_uri: search.redirect_uri,
              state: search.state,
              prompt: search.prompt,
            }}
            className="font-medium text-brand hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <SocialRow next={customReturnTo ?? "/onboarding"} remember={rememberMe} />
        <Field label="Email" type="email" name="email" placeholder="you@studio.com" required />
        <Field
          label="Password"
          type="password"
          name="password"
          placeholder="••••••••"
          required
          hint={
            <Link to="/forgot-password" className="text-xs font-medium text-brand hover:underline">
              Forgot?
            </Link>
          }
        />
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            name="remember"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 rounded border-border bg-surface accent-[oklch(0.79_0.152_72)] cursor-pointer"
          />
          Keep me signed in
        </label>
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
