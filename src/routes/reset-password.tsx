import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/auth/Field";
import { Button } from "@/components/ui/button";
import { Check } from "iconoir-react";
import { toast } from "sonner";
import { updatePassword } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password · Spün" },
      { name: "description", content: "Choose a new password for your Spün account." },
      { property: "og:title", content: "Set a new password · Spün" },
      {
        property: "og:description",
        content: "Choose a new password for your Spün account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

const rules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
];

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const valid = rules.every((r) => r.test(password)) && password === confirm;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    setPending(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      eyebrow="New password"
      title={done ? "Password updated" : "Set a new password"}
      subtitle={
        done
          ? "You can now sign in to Spün with your new password."
          : "Choose something strong — you'll only need it occasionally."
      }
      footer={
        <Link to="/" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-brand-foreground">
            <Check className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">All set. Your password has been changed.</p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <Field
            label="New password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <ul className="space-y-1.5">
            {rules.map((rule) => {
              const ok = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className={
                    ok
                      ? "flex items-center gap-2 text-xs text-brand"
                      : "flex items-center gap-2 text-xs text-muted-foreground"
                  }
                >
                  <span
                    className={
                      ok
                        ? "size-1.5 rounded-full bg-brand"
                        : "size-1.5 rounded-full bg-muted-foreground/50"
                    }
                  />
                  {rule.label}
                </li>
              );
            })}
          </ul>
          <Field
            label="Confirm password"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {confirm && confirm !== password ? (
            <p className="text-xs text-destructive">Passwords don't match.</p>
          ) : null}
          <Button
            type="submit"
            variant="hero"
            size="xl"
            className="w-full"
            disabled={!valid || pending}
          >
            Update password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
