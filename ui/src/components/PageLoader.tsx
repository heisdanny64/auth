import { useEffect, useState, useMemo } from "react";
import { Loading03Icon as Loader2 } from "hugeicons-react";

interface PageLoadingSpinnerProps {
  message?: string;
}

const DEFAULT_MESSAGES = ["Loading…", "Getting things ready…", "Connecting…", "Almost there…"];

export function PageLoadingSpinner({ message }: PageLoadingSpinnerProps) {
  const [index, setIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const messages = useMemo(() => DEFAULT_MESSAGES, []);

  useEffect(() => {
    if (message) return;

    let isMounted = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(() => {
      if (!isMounted) return;
      setIsVisible(false);
      timeout = setTimeout(() => {
        if (!isMounted) return;
        setIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 180);
    }, 1800);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [message, messages.length]);

  const currentMessage = message ?? messages[index];

  return (
    <main
      id="page-loading-spinner"
      className="relative min-h-screen bg-background bg-halo flex items-center justify-center px-4"
      aria-label="Loading page"
    >
      <div className="flex items-center gap-3">
        <Loader2 className="size-5 animate-spin text-brand shrink-0" />
        <span
          className={`text-sm font-medium text-foreground/80 tracking-tight transition-opacity duration-200 select-none ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {currentMessage}
        </span>
      </div>
    </main>
  );
}
