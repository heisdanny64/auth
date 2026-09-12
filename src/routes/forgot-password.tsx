import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui/button";
import { MailOpen01Icon as MailCheck } from "hugeicons-react";
import { toast } from "sonner";
import { sendPasswordReset } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your Spün password" },
      {
        name: "description",
        content: "Enter your email and we'll send a link to reset your Spün password.",
      },
      { property: "og:title", content: "Reset your Spün password" },
      {
        property: "og:description",
        content: "Enter your email and we'll send a link to reset your Spün password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reset link");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Recovery"
      title={sent ? "Check your inbox" : "Forgot your password?"}
      subtitle={
        sent
          ? `If an account exists for ${email}, a reset link is on its way.`
          : "We'll email you a secure link to set a new password."
      }
      footer={
        <Link to="/" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border-2 border-border bg-surface p-4">
            <MailCheck className="mt-0.5 size-5 text-brand" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              The link expires in 30 minutes. Didn't get it? Check spam, or resend below.
            </p>
          </div>
          <Button variant="social" size="xl" className="w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <Field
            label="Email"
            type="email"
            name="email"
            placeholder="you@studio.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
