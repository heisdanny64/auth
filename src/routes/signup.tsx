import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { SocialRow } from "@/components/auth/SocialRow";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { signUpWithEmail } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  validateSearch: (search) => ({
    client_id: typeof search.client_id === "string" ? search.client_id : undefined,
    redirect_uri: typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    prompt: search.prompt === "none" || search.prompt === "login" ? search.prompt : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create your Spün account" },
      {
        name: "description",
        content: "Set up a Spün account in under a minute and start building your first session.",
      },
      { property: "og:title", content: "Create your Spün account" },
      {
        property: "og:description",
        content: "Set up a Spün account in under a minute and start building your first session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const search = Route.useSearch();
  const returnTo =
    search.client_id && search.redirect_uri
      ? `/authorize?client_id=${encodeURIComponent(search.client_id)}&redirect_uri=${encodeURIComponent(search.redirect_uri)}${search.state ? `&state=${encodeURIComponent(search.state)}` : ""}${search.prompt ? `&prompt=${search.prompt}` : ""}&auth_completed=1`
      : "/onboarding";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    try {
      const data = await signUpWithEmail(
        String(form.get("email") ?? ""),
        String(form.get("password") ?? ""),
        String(form.get("name") ?? ""),
        returnTo,
      );
      if (data.session) {
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
        } else if (returnTo.includes("?")) {
          window.location.replace(returnTo);
        } else {
          navigate({ to: returnTo, replace: true });
        }
      } else {
        setSent(true);
        toast.success("Check your email to confirm your account");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        eyebrow="Sign up"
        title="Confirm your email"
        subtitle="We sent you a confirmation link. Open it to activate your Spün account."
        footer={
          <Link
            to="/"
            search={{
              client_id: search.client_id,
              redirect_uri: search.redirect_uri,
              state: search.state,
              prompt: search.prompt,
            }}
            className="font-medium text-brand hover:underline"
          >
            Back to sign in
          </Link>
        }
      >
        <Button variant="social" size="xl" className="w-full" onClick={() => setSent(false)}>
          Use a different email
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Sign up"
      title="Create your Spün account"
      subtitle="One account for every deck, session and collaborator you work with."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/"
            search={{
              client_id: search.client_id,
              redirect_uri: search.redirect_uri,
              state: search.state,
              prompt: search.prompt,
            }}
            className="font-medium text-brand hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <SocialRow next={returnTo} />
        <Field label="Name" name="name" placeholder="Ada Okoye" required autoComplete="name" />
        <Field label="Email" type="email" name="email" placeholder="you@studio.com" required />
        <Field
          label="Password"
          type="password"
          name="password"
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          By continuing you agree to the Spün Terms of Service and Privacy Policy.
        </p>
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
