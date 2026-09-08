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

export const Route = createFileRoute("/")({
  validateSearch: (search) => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
    next: typeof search.next === "string" ? search.next : undefined,
    client_id: typeof search.client_id === "string" ? search.client_id : undefined,
    redirect_uri: typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    prompt: search.prompt === "none" || search.prompt === "login" ? search.prompt : undefined,
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
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { session } = useSession();

  const customReturnTo =
    search.returnTo ||
    search.next ||
    (search.client_id && search.redirect_uri
      ? `/authorize?client_id=${encodeURIComponent(search.client_id)}&redirect_uri=${encodeURIComponent(search.redirect_uri)}${search.state ? `&state=${encodeURIComponent(search.state)}` : ""}&auth_completed=1`
      : undefined);

  useEffect(() => {
    if (!session) return;

    if (search.client_id && search.redirect_uri) {
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
      if (customReturnTo.includes("?")) {
        window.location.replace(customReturnTo);
      } else {
        navigate({ to: customReturnTo, replace: true });
      }
      return;
    }

    void destinationForUser(session.user.id).then((destination) => {
      navigate({ to: destination, replace: true });
    });
  }, [
    session,
    navigate,
    search.client_id,
    search.redirect_uri,
    search.state,
    search.prompt,
    customReturnTo,
  ]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      await signInWithEmail(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      if (search.client_id && search.redirect_uri) {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back to Spün"
      subtitle="Your sessions, decks and saved mixes are exactly where you left them."
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
        <SocialRow next={customReturnTo ?? "/onboarding"} />
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
        <label className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="remember"
            className="size-4 rounded border-border bg-surface accent-[oklch(0.79_0.152_72)]"
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
