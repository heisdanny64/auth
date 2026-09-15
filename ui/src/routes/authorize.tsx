import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert02Icon as AlertTriangle, Loading03Icon as Loader2 } from "hugeicons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthShell, SpunMark } from "@/components/auth/AuthShell";
import { useSession } from "@/hooks/useSession";
import { signOut } from "@/lib/auth";
import { getProfile, type ProfileRecord } from "@/lib/profiles";
import { resolveProfileAvatarDataUri } from "@/lib/dicebear";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/authorize")({
  ssr: false,
  validateSearch: (search: Record<string, unknown> = {}) => ({
    client_id: typeof search?.client_id === "string" ? search.client_id : undefined,
    redirect_uri: typeof search?.redirect_uri === "string" ? search.redirect_uri : undefined,
    state: typeof search?.state === "string" ? search.state : undefined,
    prompt: search?.prompt === "none" || search?.prompt === "login" ? search.prompt : undefined,
    auth_completed:
      search?.auth_completed === "1" ||
      search?.auth_completed === 1 ||
      search?.auth_completed === "true" ||
      search?.auth_completed === true
        ? "1"
        : undefined,
  }),
  loader: async ({ location }) => {
    const s = location?.search ?? {};
    if (!s.client_id || !s.redirect_uri) {
      return { client: null, error: true, user: null, profile: null };
    }

    try {
      new URL(s.redirect_uri);
    } catch {
      return { client: null, error: true, user: null, profile: null };
    }

    let client: AuthorizeClient | null = null;
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000";
      const res = await fetch(
        `${origin}/api/authorize?client_id=${encodeURIComponent(s.client_id)}&redirect_uri=${encodeURIComponent(s.redirect_uri)}`,
      );
      if (res.ok) {
        client = (await res.json()) as AuthorizeClient;
      }
    } catch (err) {
      console.warn("Could not retrieve client in authorize loader:", err);
    }

    let user = null;
    let profile: ProfileRecord | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
      if (user?.id) {
        profile = await getProfile(user.id);
      }
    } catch (err) {
      console.warn("Could not retrieve user in authorize loader:", err);
    }

    return {
      client,
      error: !client,
      user,
      profile,
    };
  },
  head: () => ({
    meta: [
      { title: "Sign in · Spün" },
      { name: "description", content: "Authorize an application with your Spün account." },
      { property: "og:title", content: "Sign in · Spün" },
      { property: "og:description", content: "Authorize an application with your Spün account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Authorize,
});

type View = "checking" | "error" | "ready";
type AuthorizeClient = { name: string; logoUrl: string | null };

function authorizePath(search?: ReturnType<typeof Route.useSearch>, completed = true) {
  const params = new URLSearchParams();
  if (search?.client_id) params.set("client_id", search.client_id);
  if (search?.redirect_uri) params.set("redirect_uri", search.redirect_uri);
  if (search?.state) params.set("state", search.state);
  if (search?.prompt && (!completed || search.prompt !== "login")) {
    params.set("prompt", search.prompt);
  }
  if (completed) params.set("auth_completed", "1");
  return `/authorize?${params.toString()}`;
}

function Authorize() {
  const loaderData = Route.useLoaderData();
  const rawSearch = Route.useSearch();
  const search = rawSearch ?? {};
  const navigate = useNavigate();
  const { user: sessionUser, loading: sessionLoading } = useSession();

  const user = sessionUser ?? loaderData?.user ?? null;
  const isSessionLoading = sessionLoading && !loaderData?.user;

  const [client, setClient] = useState<AuthorizeClient | null>(() => loaderData?.client ?? null);
  const [view, setView] = useState<View>(() => {
    if (loaderData?.error) return "error";
    if (loaderData?.client) return "ready";
    return "checking";
  });
  const [profile, setProfile] = useState<ProfileRecord | null>(() => loaderData?.profile ?? null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Sync state if loaderData updates
  useEffect(() => {
    if (loaderData?.error) {
      setView("error");
    } else if (loaderData?.client) {
      setClient(loaderData.client);
      setView("ready");
    }
  }, [loaderData?.client, loaderData?.error]);

  const autoIssuedRef = useRef(false);
  const destination = authorizePath(search, true);

  // Client validation effect if not already verified by loader
  useEffect(() => {
    let cancelled = false;

    if (client) {
      return;
    }

    if (!search?.client_id || !search?.redirect_uri) {
      setView("error");
      return;
    }

    try {
      new URL(search.redirect_uri);
    } catch {
      setView("error");
      return;
    }

    async function checkClient() {
      const clientId = search.client_id!;
      const redirectUri = search.redirect_uri!;

      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000";
        const res = await fetch(
          `${origin}/api/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
        );

        if (cancelled) return;
        if (!res.ok) {
          setView("error");
          return;
        }

        const data = (await res.json()) as AuthorizeClient;
        setClient(data);
        setView("ready");
      } catch {
        if (!cancelled) setView("error");
      }
    }

    void checkClient();

    return () => {
      cancelled = true;
    };
  }, [client, search?.client_id, search?.redirect_uri]);

  // 2. Fetch profile when user session is available
  const userId = user?.id;
  useEffect(() => {
    if (isSessionLoading || !userId) {
      if (!userId && !isSessionLoading) {
        setProfile(null);
        setProfileLoading(false);
      }
      return;
    }

    if (profile?.id === userId && profile?.handle) {
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    void getProfile(userId)
      .then((p) => {
        if (cancelled) return;
        setProfileLoading(false);
        if (!p?.handle) {
          navigate({ to: "/onboarding", search: { next: destination }, replace: true });
          return;
        }
        setProfile(p);
      })
      .catch((caught) => {
        if (!cancelled) {
          setProfileLoading(false);
          setProfileError(caught instanceof Error ? caught.message : "Failed to load profile");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [destination, isSessionLoading, navigate, profile?.handle, profile?.id, userId]);

  // Helper to create auth_code and perform final redirect
  const executeAuthorize = useCallback(
    async (targetProfile: ProfileRecord) => {
      if (!search?.client_id || !search?.redirect_uri) return;
      setPending(true);

      try {
        // Get current session token to authenticate the request
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("No active session");

        const res = await fetch("/api/issue", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            client_id: search.client_id,
            redirect_uri: search.redirect_uri,
            state: search.state ?? null,
          }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error || "Failed to issue authorization code");
        }

        const { code } = (await res.json()) as { code: string };

        const target = new URL(search.redirect_uri);
        target.searchParams.set("code", code);
        if (search.state) {
          target.searchParams.set("state", search.state);
        } else {
          target.searchParams.delete("state");
        }

        window.location.assign(target.toString());
      } catch (caught) {
        toast.error(
          caught instanceof Error ? caught.message : "Could not authorize this application",
        );
        setPending(false);
      }
    },
    [search?.client_id, search?.redirect_uri, search?.state],
  );

  // 3. Handle unauthenticated redirect & prompt behavior
  useEffect(() => {
    if (view !== "ready" || !client || isSessionLoading) return;

    // prompt=none handling
    if (search?.prompt === "none") {
      if (!user) {
        if (!search?.redirect_uri) return;
        const target = new URL(search.redirect_uri);
        target.searchParams.set("error", "login_required");
        if (search?.state) target.searchParams.set("state", search.state);
        window.location.replace(target.toString());
        return;
      }
      if (profile && !autoIssuedRef.current) {
        autoIssuedRef.current = true;
        void executeAuthorize(profile);
      }
      return;
    }

    // No active session: redirect to the Auth form (/)
    if (!user) {
      navigate({
        to: "/",
        search: {
          client_id: search?.client_id,
          redirect_uri: search?.redirect_uri,
          state: search?.state,
          prompt: search?.prompt,
        },
        replace: true,
      });
      return;
    }

    // prompt=login without completed sign in: redirect to the Auth form (/)
    if (search?.prompt === "login" && search?.auth_completed !== "1") {
      navigate({
        to: "/",
        search: {
          client_id: search?.client_id,
          redirect_uri: search?.redirect_uri,
          state: search?.state,
          prompt: search?.prompt,
        },
        replace: true,
      });
      return;
    }
  }, [
    client,
    executeAuthorize,
    navigate,
    profile,
    search?.auth_completed,
    search?.client_id,
    search?.prompt,
    search?.redirect_uri,
    search?.state,
    isSessionLoading,
    user,
    view,
  ]);

  function handleContinue() {
    if (!profile) return;
    void executeAuthorize(profile);
  }

  async function handleSwitchAccount() {
    setPending(true);
    try {
      await signOut();
      navigate({
        to: "/",
        search: {
          client_id: search?.client_id,
          redirect_uri: search?.redirect_uri,
          state: search?.state,
          prompt: "login",
        },
        replace: true,
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not switch accounts");
      setPending(false);
    }
  }

  function handleCancel() {
    if (!search?.redirect_uri) {
      navigate({ to: "/" });
      return;
    }
    try {
      const target = new URL(search.redirect_uri);
      target.searchParams.set("error", "access_denied");
      if (search?.state) target.searchParams.set("state", search.state);
      window.location.assign(target.toString());
    } catch {
      navigate({ to: "/" });
    }
  }

  if (view === "error") {
    return <HardErrorScreen />;
  }

  if (profileError) {
    return (
      <AuthShell
        eyebrow="Profile Error"
        title="Could not load your Spün profile"
        subtitle={profileError}
      >
        <div className="space-y-4">
          <Button
            type="button"
            variant="hero"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate({ to: "/" })}
          >
            Back to Sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (
    view === "checking" ||
    !client ||
    isSessionLoading ||
    profileLoading ||
    !user ||
    !profile?.handle
  ) {
    return (
      <main className="relative min-h-screen bg-background bg-halo">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8 sm:py-14">
          <header className="flex items-center justify-between">
            <Link to="/" className="transition-opacity hover:opacity-80">
              <SpunMark />
            </Link>
          </header>
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-7 animate-spin text-brand" />
          </div>
        </div>
      </main>
    );
  }

  const avatarSrc = resolveProfileAvatarDataUri(
    profile.avatar_config,
    profile.handle ?? profile.display_name,
    128,
  );

  return (
    <AuthShell
      eyebrow="Authorize"
      title={`Sign in to ${client.name}`}
      subtitle={`${client.name} wants to access your Spün account.`}
      clientLogo={client.logoUrl}
    >
      <div className="space-y-6">
        {/* Active session identifier */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-surface/70 p-3.5">
          <div className="size-12 overflow-hidden rounded-full border border-border bg-surface shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Your Spün avatar"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center bg-brand/15 font-display text-lg font-semibold text-brand">
                {(profile.display_name || profile.handle || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-semibold text-foreground">@{profile.handle}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <Button
            id="continue-button"
            type="button"
            variant="hero"
            size="xl"
            className="w-full"
            onClick={handleContinue}
            disabled={pending}
          >
            {pending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {pending ? "Continuing…" : `Continue as @${profile.handle}`}
          </Button>

          <Button
            id="cancel-button"
            type="button"
            variant="outline"
            size="xl"
            className="w-full"
            onClick={handleCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>

        {/* Not you? Sign in here link with amber accent */}
        <p className="text-center text-sm text-muted-foreground">
          Not you?{" "}
          <button
            id="switch-account-button"
            type="button"
            onClick={handleSwitchAccount}
            disabled={pending}
            className="font-medium text-brand hover:underline cursor-pointer"
          >
            Sign in here
          </button>
        </p>
      </div>
    </AuthShell>
  );
}

// Hard Error Screen (Access Denied)
function HardErrorScreen() {
  const navigate = useNavigate();

  return (
    <AuthShell
      eyebrow="OAuth 2.0"
      title="Access Denied"
      subtitle="This application is not authorized to use Spün Auth. If you're a developer, ensure your client ID and redirect URI are correctly registered."
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-500">
          <AlertTriangle className="size-5 shrink-0" />
          <p className="text-xs leading-relaxed text-foreground">
            The requesting client ID is not recognized or the redirect URI is not whitelisted.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => navigate({ to: "/" })}
        >
          Back to Spün
        </Button>
      </div>
    </AuthShell>
  );
}
