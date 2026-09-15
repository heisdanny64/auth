import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signInWithProvider, type OAuthProvider } from "@/lib/auth";

export function SocialRow({ next = "/onboarding" }: { next?: string }) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  async function connect(provider: OAuthProvider) {
    setPending(provider);
    try {
      await signInWithProvider(provider, next);
    } catch (error) {
      setPending(null);
      toast.error(error instanceof Error ? error.message : `Could not sign in with ${provider}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="social"
          size="xl"
          type="button"
          aria-label="Sign in with Google"
          disabled={pending !== null}
          onClick={() => connect("google")}
          className="h-12 w-12 justify-self-center rounded-full p-0"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1H12v2.9h5.35c-.24 1.4-1.7 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.7 0 2.85.72 3.5 1.34l2.4-2.3A9 9 0 1 0 12 21c5.2 0 8.65-3.65 8.65-8.8 0-.6-.06-1.05-.3-1.1Z"
            />
          </svg>
        </Button>
        <Button
          variant="social"
          size="xl"
          type="button"
          aria-label="Sign in with Discord"
          disabled={pending !== null}
          onClick={() => connect("discord")}
          className="h-12 w-12 justify-self-center rounded-full p-0"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path
              fill="currentColor"
              d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.9a.07.07 0 0 0-.08.04c-.2.38-.44.86-.6 1.25a18.3 18.3 0 0 0-5.49 0c-.17-.39-.4-.87-.61-1.25a.07.07 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.46.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.34-.53.64-1.09.9-1.67a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.12c.13-.1.26-.2.4-.3a.07.07 0 0 1 .08 0c3.92 1.79 8.17 1.79 12.05 0a.07.07 0 0 1 .08 0c.13.1.27.21.4.31a.08.08 0 0 1 0 .12 12.3 12.3 0 0 1-1.87.9.08.08 0 0 0-.04.1c.25.58.56 1.14.9 1.67a.08.08 0 0 0 .08.03 19.83 19.83 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.33-.95 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z"
            />
          </svg>
        </Button>
        <Button
          variant="social"
          size="xl"
          type="button"
          aria-label="Sign in with GitHub"
          disabled={pending !== null}
          onClick={() => connect("github")}
          className="h-12 w-12 justify-self-center rounded-full p-0"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69a3.66 3.66 0 0 1 .1-2.64s.84-.27 2.75 1.02a9.63 9.63 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.73c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z"
            />
          </svg>
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
