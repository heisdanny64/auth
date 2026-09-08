import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { WarningTriangle as AlertTriangle, SystemRestart as Loader2 } from "iconoir-react";
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
  validateSearch: (search) => ({
    client_id: typeof search.client_id === "string" ? search.client_id : undefined,
    redirect_uri: typeof search.redirect_uri === "string" ? search.redirect_uri : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    prompt: search.prompt === "none" || search.prompt === "login" ? search.prompt : undefined,
    auth_completed:
      search.auth_completed === "1" ||
      search.auth_completed === 1 ||
      search.auth_completed === "true" ||
      search.auth_completed === true
        ? "1"
        : undefined,
  }),
  loader: async ({ search }) => {
    if (!search.client_id || !search.redirect_uri) {
      return { client: null, error: true, user: null, profile: null };
    }

    try {
      new URL(search.redirect_uri);
    } catch {
      return { client: null, error: true, user: null, profile: null };
    }

    let client: AuthorizeClient | null = null;
    try {
      const { data: rawClient, error: clientQueryError } = await supabase
        .from("oauth_clients")
        .select("name, logo_url, allowed_redirect_uris")
        .eq("client_id", search.client_id)
        .maybeSingle();

      if (!clientQueryError && rawClient) {
        const uris = Array.isArray(rawClient.allowed_redirect_uris)
          ? rawClient.allowed_redirect_uris
          : [];
        if (uris.includes(search.redirect_uri)) {
          client = { name: rawClient.name, logoUrl: rawClient.logo_url };
        }
      }

      if (!client) {
        const res = await fetch(
          `/api/authorize-client?clientId=${encodeURIComponent(search.client_id)}&redirectUri=${encodeURIComponent(search.redirect_uri)}`,
        );
        if (res.ok) {
          client = (await res.json()) as AuthorizeClient;
        }
      }
    } catch {
      // Ignored
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    let profile: ProfileRecord | null = null;
    if (user?.id) {
      profile = await getProfile(user.id);
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

function authorizePath(search: ReturnType<typeof Route.useSearch>, completed = true) {
  const params = new URLSearchParams();
  if (search.client_id) params.set("client_id", search.client_id);
  if (search.redirect_uri) params.set("redirect_uri", search.redirect_uri);
  if (search.state) params.set("state", search.state);
  if (search.prompt && (!completed || search.prompt !== "login")) {
    params.set("prompt", search.prompt);
  }
  if (completed) params.set("auth_completed", "1");
  return `/authorize?${params.toString()}`;
}

function Authorize() {
  const loaderData = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user: sessionUser, loading: sessionLoading } = useSession();

  const user = sessionUser ?? loaderData?.user ?? null;
  const isSessionLoading = sessionLoading && !loaderData?.user;

  const [client, setClient] = useState<AuthorizeClient | null>(() => loaderData?.client ?? null);
  const [view, setView] = useState<View>(() =>
    loaderData?.error ? "error" : loaderData?.client ? "ready" : "checking",
  );
  const [profile, setProfile] = useState<ProfileRecord | null>(() => loaderData?.profile ?? null);
  const [pending, setPending] = useState(false);

  const autoIssuedRef = useRef(false);
  const destination = authorizePath(search, true);

  // 1. Initial validation on load if not already supplied by loader
  useEffect(() => {
    let cancelled = false;

    if (loaderData?.client) {
      return;
    }

    if (!search.client_id || !search.redirect_uri) {
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
        // First try direct client query on oauth_clients (if RLS allows anon read)
        const { data: rawClient, error: clientQueryError } = await supabase
          .from("oauth_clients")
          .select("name, logo_url, allowed_redirect_uris")
          .eq("client_id", clientId)
          .maybeSingle();

        if (!clientQueryError && rawClient) {
          const uris = Array.isArray(rawClient.allowed_redirect_uris)
            ? rawClient.allowed_redirect_uris
            : [];
          if (!uris.includes(redirectUri)) {
            if (!cancelled) setView("error");
            return;
          }
          if (!cancelled) {
            setClient({ name: rawClient.name, logoUrl: rawClient.logo_url });
            setView("ready");
          }
          return;
        }

        // Server API endpoint with service role access
        const res = await fetch(
          `/api/authorize-client?clientId=${encodeURIComponent(clientId)}&redirectUri=${encodeURIComponent(redirectUri)}`,
        );

        if (cancelled) return;
        if (!res.ok) {
          setView("error");
          return;
        }

        const data = (await res.json()) as { name: string; logoUrl: string | null };
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
  }, [loaderData?.client, search.client_id, search.redirect_uri]);

  // 2. Fetch profile when user session is available
  const userId = user?.id;
  useEffect(() => {
    if (isSessionLoading || !userId) {
      if (!userId && !isSessionLoading) {
        setProfile(null);
      }
      return;
    }

    if (profile?.id === userId && profile?.handle) {
      return;
    }

    let cancelled = false;
    void getProfile(userId)
      .then((p) => {
        if (cancelled) return;
        if (!p?.handle) {
          navigate({ to: "/onboarding", search: { next: destination }, replace: true });
          return;
        }
        setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [destination, isSessionLoading, navigate, profile?.handle, profile?.id, userId]);

  // Helper to create auth_code and perform final redirect
  const executeAuthorize = useCallback(
    async (targetProfile: ProfileRecord) => {
      if (!search.client_id || !search.redirect_uri) return;
      setPending(true);

      const code = crypto.randomUUID();

      try {
        const { error: insertError } = await supabase.from("auth_codes").insert({
          code,
          user_id: targetProfile.id,
          client_id: search.client_id,
          redirect_uri: search.redirect_uri,
          state: search.state ?? null,
        });

        if (insertError) {
          const res = await fetch("/api/issue-auth-code", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              code,
              clientId: search.client_id,
              redirectUri: search.redirect_uri,
              userId: targetProfile.id,
              state: search.state ?? null,
            }),
          });
          if (!res.ok) {
            const errData = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(errData.error || "Failed to issue authorization code");
          }
        }

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
    [search.client_id, search.redirect_uri, search.state],
  );

  // 3. Handle unauthenticated redirect & prompt behavior
  useEffect(() => {
    if (view !== "ready" || !client || isSessionLoading) return;

    // prompt=none handling
    if (search.prompt === "none") {
      if (!user) {
        const target = new URL(search.redirect_uri!);
        target.searchParams.set("error", "login_required");
        if (search.state) target.searchParams.set("state", search.state);
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
          client_id: search.client_id,
          redirect_uri: search.redirect_uri,
          state: search.state,
          prompt: search.prompt,
        },
        replace: true,
      });
      return;
    }

    // prompt=login without completed sign in: redirect to the Auth form (/)
    if (search.prompt === "login" && search.auth_completed !== "1") {
      navigate({
        to: "/",
        search: {
          client_id: search.client_id,
          redirect_uri: search.redirect_uri,
          state: search.state,
          prompt: search.prompt,
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
    search.auth_completed,
    search.client_id,
    search.prompt,
    search.redirect_uri,
    search.state,
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
          client_id: search.client_id,
          redirect_uri: search.redirect_uri,
          state: search.state,
          prompt: "login",
        },
        replace: true,
      });
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Could not switch accounts");
      setPending(false);
    }
  }

  if (view === "error") {
    return <HardErrorScreen />;
  }

  if (view === "checking" || !client || isSessionLoading || !user || !profile?.handle) {
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
        <div className="flex items-center gap-3.5 rounded-2xl border border-border/70 bg-surface/70 p-3.5">
          <div className="size-12 overflow-hidden rounded-full border border-border bg-surface shrink-0">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Your Spün avatar" className="size-full object-cover" />
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

        {/* Continue button: same default button on the sign-in form card */}
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
          {pending ? "Continuing…" : "Continue"}
        </Button>

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
