type NavigateFn = (opts: {
  to?: string;
  search?: Record<string, string>;
  replace?: boolean;
}) => Promise<void>;

/**
 * Safely navigates to an internal route (even if it contains query parameters)
 * using TanStack Router without forcing a full page reload or window refresh.
 * External URLs are navigated using window.location.
 */
export function safeNavigate(navigate: unknown, target: string, options?: { replace?: boolean }) {
  const nav = navigate as NavigateFn;
  const replace = options?.replace ?? true;
  if (!target) {
    void nav({ to: "/", replace });
    return;
  }

  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = new URL(target, origin);

    // If external origin, navigate via window.location
    if (typeof window !== "undefined" && url.origin !== window.location.origin) {
      if (replace) {
        window.location.replace(target);
      } else {
        window.location.assign(target);
      }
      return;
    }

    const search: Record<string, string> = {};
    url.searchParams.forEach((val, key) => {
      search[key] = val;
    });

    void nav({
      to: url.pathname,
      search: Object.keys(search).length > 0 ? search : undefined,
      replace,
    });
  } catch {
    void nav({ to: target, replace });
  }
}
