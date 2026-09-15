import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SpunMark() {
  return (
    <span className="inline-flex items-center gap-2">
      <img src="/spun-logo.svg" alt="Spün mark" className="size-8" />
      <span className="font-display text-lg font-semibold tracking-tight">Spün</span>
    </span>
  );
}

interface AuthShellProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  clientLogo?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  containerClassName?: string;
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  clientLogo,
  children,
  footer,
  containerClassName,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen bg-background bg-halo">
      <div
        className={cn(
          "mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8 sm:py-14",
          containerClassName,
        )}
      >
        <header className="flex items-center justify-between">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <SpunMark />
          </Link>
          {eyebrow ? (
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </span>
          ) : null}
        </header>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="rounded-3xl border border-border bg-card/90 p-6 shadow-lift backdrop-blur-sm sm:p-8">
            {clientLogo ? (
              <img
                src={clientLogo}
                alt="App logo"
                className="mb-5 size-14 rounded-2xl border border-border object-cover shadow-xs"
              />
            ) : null}
            {title ? (
              <h1 className="text-[1.75rem] font-semibold leading-tight text-foreground">
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            ) : null}
            <div className={title || subtitle ? "mt-7" : ""}>{children}</div>
          </div>

          {footer ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
          ) : null}
        </div>

        <footer className="text-center text-xs text-muted-foreground/70">
          Protected by Spün · Terms & Privacy
        </footer>
      </div>
    </main>
  );
}
