import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  UserEdit01Icon,
  Edit04Icon,
  Add01Icon,
  Tick02Icon as Check,
  Cancel01Icon as X,
  Alert02Icon as AlertTriangle,
  Loading03Icon as Loader2,
  Mail01Icon as Mail,
  ViewIcon,
  ViewOffIcon,
} from "hugeicons-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HandleInput } from "@/components/auth/HandleInput";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSession } from "@/hooks/useSession";
import {
  signOut,
  linkProviderIdentity,
  unlinkProviderIdentity,
  type OAuthProvider,
} from "@/lib/auth";
import { getProfile, updateProfileDetails, type ProfileRecord } from "@/lib/profiles";
import { useHandleChecker } from "@/hooks/useHandleChecker";
import { resolveProfileAvatarDataUri } from "@/lib/dicebear";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/me")({
  ssr: false,
  loader: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { profile: null, identities: [] };
    const [profile, identitiesRes] = await Promise.all([
      getProfile(user.id),
      supabase.auth.getUserIdentities().catch(() => ({ data: { identities: [] } })),
    ]);
    return {
      profile,
      identities:
        identitiesRes?.data?.identities && identitiesRes.data.identities.length > 0
          ? identitiesRes.data.identities
          : (user.identities ?? []),
    };
  },
  head: () => ({
    meta: [
      { title: "Your Spün account" },
      { name: "description", content: "You're signed in to Spün. Manage your session here." },
      { property: "og:title", content: "Your Spün account" },
      {
        property: "og:description",
        content: "You're signed in to Spün. Manage your session here.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Account,
});

type ProviderKey = "email" | "google" | "github" | "discord";

interface ProviderConfig {
  id: ProviderKey;
  name: string;
}

const ALL_PROVIDERS: ProviderConfig[] = [
  { id: "email", name: "Email & Password" },
  { id: "google", name: "Google" },
  { id: "github", name: "GitHub" },
  { id: "discord", name: "Discord" },
];

function formatMemberSince(dateStr?: string | null): string {
  if (!dateStr) return "Member";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Member";
    const month = d.toLocaleString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `Member since ${month} ${year}`;
  } catch {
    return "Member";
  }
}

// Icons directly matching SocialRow.tsx (monochrome, currentColor)
function ProviderIcon({ provider }: { provider: ProviderKey }) {
  switch (provider) {
    case "email":
      return <Mail className="size-5 text-current" aria-hidden="true" />;
    case "google":
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <path d="M21.35 11.1H12v2.9h5.35c-.24 1.4-1.7 4.1-5.35 4.1a5.9 5.9 0 1 1 0-11.8c1.7 0 2.85.72 3.5 1.34l2.4-2.3A9 9 0 1 0 12 21c5.2 0 8.65-3.65 8.65-8.8 0-.6-.06-1.05-.3-1.1Z" />
        </svg>
      );
    case "github":
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.1.39-1.99 1.03-2.69a3.66 3.66 0 0 1 .1-2.64s.84-.27 2.75 1.02a9.63 9.63 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.73c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
          <path d="M20.32 4.37A19.8 19.8 0 0 0 15.43 2.9a.07.07 0 0 0-.08.04c-.2.38-.44.86-.6 1.25a18.3 18.3 0 0 0-5.49 0c-.17-.39-.4-.87-.61-1.25a.07.07 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.46.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.34-.53.64-1.09.9-1.67a.08.08 0 0 0-.04-.1 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1 0-.12c.13-.1.26-.2.4-.3a.07.07 0 0 1 .08 0c3.92 1.79 8.17 1.79 12.05 0a.07.07 0 0 1 .08 0c.13.1.27.21.4.31a.08.08 0 0 1 0 .12 12.3 12.3 0 0 1-1.87.9.08.08 0 0 0-.04.1c.25.58.56 1.14.9 1.67a.08.08 0 0 0 .08.03 19.83 19.83 0 0 0 6-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.68-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42s.96-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.33-.95 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42s.95-2.42 2.16-2.42c1.21 0 2.18 1.09 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z" />
        </svg>
      );
  }
}

function Account() {
  const loaderData = Route.useLoaderData();
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [signOutPending, setSignOutPending] = useState(false);
  const [profile, setProfile] = useState<ProfileRecord | null>(() => loaderData?.profile ?? null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [identities, setIdentities] = useState<any[]>(() => loaderData?.identities ?? []);
  const [loadingData, setLoadingData] = useState(() => !loaderData?.profile);

  // Edit Profile Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editHandle, setEditHandle] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Disconnect Confirmation Modal state
  const [disconnectTarget, setDisconnectTarget] = useState<ProviderConfig | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Avatar Edit Modal state
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarEditChoice, setAvatarEditChoice] = useState<"refine" | "fresh" | null>("refine");
  const [navigatingAvatar, setNavigatingAvatar] = useState(false);

  // Connect Email Modal state (if user signed up via OAuth and wants to add email/password)
  const [connectEmailModalOpen, setConnectEmailModalOpen] = useState(false);
  const [emailPassword, setEmailPassword] = useState("");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [connectingEmail, setConnectingEmail] = useState(false);

  // Fetch profile and identities
  useEffect(() => {
    if (!user?.id) return;
    let active = true;

    async function load() {
      try {
        const [prof, identitiesRes] = await Promise.all([
          getProfile(user.id),
          supabase.auth.getUserIdentities().catch(() => ({ data: { identities: [] } })),
        ]);
        if (!active) return;
        setProfile(prof);
        const resolvedIdentities =
          identitiesRes?.data?.identities && identitiesRes.data.identities.length > 0
            ? identitiesRes.data.identities
            : (user.identities ?? []);
        setIdentities(resolvedIdentities);
      } catch (err) {
        console.error("Failed to load user profile or identities:", err);
      } finally {
        if (active) setLoadingData(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user?.id, user?.identities]);

  const primaryProviderKey: ProviderKey = (() => {
    const raw = (user?.app_metadata?.["provider"] as string | undefined)?.toLowerCase();
    if (raw === "google" || raw === "github" || raw === "discord" || raw === "email") {
      return raw;
    }
    return "email";
  })();

  function isConnected(id: ProviderKey): boolean {
    const hasIdentity = identities.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i: any) => i.provider?.toLowerCase() === id.toLowerCase(),
    );
    if (hasIdentity) return true;

    if (id === primaryProviderKey) return true;

    const metaProviders = (user?.app_metadata?.["providers"] as string[] | undefined) ?? [];
    if (metaProviders.map((p) => p.toLowerCase()).includes(id)) return true;

    // Supabase does not create an "email" identity entry when a password is set
    // via updateUser({ password }). Treat email as connected if the user has a
    // confirmed email — email_confirmed_at means they can sign in with email/password.
    if (id === "email" && user?.email && user?.email_confirmed_at) return true;

    return false;
  }

  // Ordered list of providers: primary appears first, remaining follow in order
  const orderedProviders = [
    ALL_PROVIDERS.find((p) => p.id === primaryProviderKey) ?? ALL_PROVIDERS[0],
    ...ALL_PROVIDERS.filter((p) => p.id !== primaryProviderKey),
  ];

  const connectedCount = ALL_PROVIDERS.filter((p) => isConnected(p.id)).length;

  const currentDisplayName =
    profile?.display_name ||
    (user?.user_metadata?.["display_name"] as string | undefined) ||
    (user?.user_metadata?.["full_name"] as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Spün User";

  const currentHandle = profile?.handle || user?.email?.split("@")[0] || "user";

  const handleCheck = useHandleChecker({
    handle: editHandle,
    currentHandle: profile?.handle ?? currentHandle,
    userId: user?.id,
    debounceMs: 200,
  });

  const oauthAvatarUrl =
    (user?.user_metadata?.["avatar_url"] as string | undefined) ||
    (user?.user_metadata?.["picture"] as string | undefined) ||
    null;

  const avatarSrc =
    resolveProfileAvatarDataUri(profile?.avatar_config, currentHandle || currentDisplayName, 160) ||
    oauthAvatarUrl;

  const [avatarLoadError, setAvatarLoadError] = useState(false);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSrc]);

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const initials = (currentDisplayName || currentHandle || "S")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Handle Sign Out
  async function handleSignOut() {
    setSignOutPending(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await signOut();
      navigate({ to: "/", replace: true });
    } catch (error) {
      setSignOutPending(false);
      toast.error(error instanceof Error ? error.message : "Could not sign out");
    }
  }

  // Open Edit Profile Modal
  function handleOpenEditProfile() {
    setEditDisplayName(profile?.display_name ?? currentDisplayName);
    setEditHandle(profile?.handle ?? currentHandle);
    setEditModalOpen(true);
  }

  // Handle Handle field change
  function onHandleChange(val: string) {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setEditHandle(sanitized);
  }

  const isHandleValid = handleCheck.isValid;

  const isDisplayNameValid = editDisplayName.trim().length > 0;

  const canSaveProfile =
    isDisplayNameValid && isHandleValid && !handleCheck.checking && !savingProfile;

  // Save edited profile
  async function handleSaveProfile() {
    if (!user?.id || !canSaveProfile) return;
    setSavingProfile(true);

    try {
      await updateProfileDetails({
        userId: user.id,
        displayName: editDisplayName.trim(),
        oldHandle: profile?.handle ?? null,
        newHandle: editHandle.trim().toLowerCase(),
      });

      // Update state immediately without full page reload
      setProfile((prev) => ({
        id: user.id,
        display_name: editDisplayName.trim(),
        handle: editHandle.trim().toLowerCase(),
        avatar_config: prev?.avatar_config ?? null,
        created_at: prev?.created_at ?? new Date().toISOString(),
        handle_changed_at:
          prev?.handle?.toLowerCase() !== editHandle.trim().toLowerCase()
            ? new Date().toISOString()
            : prev?.handle_changed_at,
      }));

      toast.success("Profile updated");
      setEditModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  // Connect provider
  async function handleConnect(provider: ProviderKey) {
    if (provider === "email") {
      setEmailPassword("");
      setConnectEmailModalOpen(true);
      return;
    }

    try {
      await linkProviderIdentity(provider as OAuthProvider, "/me");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("manual linking is disabled") ||
        msg.toLowerCase().includes("manual linking disabled")
      ) {
        toast.error("Account linking is currently unavailable. Please try again later.");
      } else {
        toast.error(msg || `Failed to connect ${provider}`);
      }
    }
  }

  // Connect Email & Password confirmation
  async function handleSaveEmailPassword() {
    if (!emailPassword || emailPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setConnectingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: emailPassword });
      if (error) throw error;

      // Refresh identities list
      const { data } = await supabase.auth.getUserIdentities();
      if (data?.identities) {
        setIdentities(data.identities);
      }

      toast.success("Email & password connected!");
      setConnectEmailModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setConnectingEmail(false);
    }
  }

  // Confirm disconnect provider
  async function handleConfirmDisconnect() {
    if (!disconnectTarget || connectedCount <= 1) return;
    setDisconnecting(true);

    try {
      // Find matching identity
      let currentIdentities = identities;
      if (!currentIdentities || currentIdentities.length === 0) {
        const { data } = await supabase.auth.getUserIdentities();
        currentIdentities = data?.identities ?? [];
      }

      const target = currentIdentities.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => i.provider?.toLowerCase() === disconnectTarget.id.toLowerCase(),
      );

      if (!target) {
        throw new Error(`No linked credentials found for ${disconnectTarget.name}.`);
      }

      await unlinkProviderIdentity(target);

      // Refresh identities list
      const { data: refreshed } = await supabase.auth.getUserIdentities();
      if (refreshed?.identities) {
        setIdentities(refreshed.identities);
      } else {
        setIdentities((prev) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          prev.filter((i: any) => i.provider?.toLowerCase() !== disconnectTarget.id.toLowerCase()),
        );
      }

      toast.success(`Disconnected ${disconnectTarget.name}`);
      setDisconnectTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to disconnect ${disconnectTarget.name}`,
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <AuthShell containerClassName="max-w-md sm:max-w-lg lg:max-w-xl">
      <div className="flex flex-col items-center text-center">
        {/* PROFILE SECTION (top of card) */}
        <div className="relative">
          {/* Avatar Circle Frame */}
          <div className="size-24 sm:size-28 rounded-full border-2 border-border bg-surface/80 p-1 shadow-md flex items-center justify-center overflow-hidden">
            {avatarSrc && !avatarLoadError ? (
              <img
                src={avatarSrc}
                alt={currentDisplayName}
                referrerPolicy="no-referrer"
                onError={() => {
                  if (isMountedRef.current) {
                    setAvatarLoadError(true);
                  }
                }}
                className="size-full rounded-full object-cover"
              />
            ) : (
              <div className="size-full rounded-full bg-primary/10 flex items-center justify-center text-xl sm:text-2xl font-bold font-display text-primary">
                {initials}
              </div>
            )}
          </div>

          {/* Edit/Add Icon Overlay on Avatar (bottom-right corner) */}
          {profile?.avatar_config ? (
            <button
              type="button"
              onClick={() => {
                setAvatarEditChoice("refine");
                setAvatarModalOpen(true);
              }}
              aria-label="Edit avatar"
              title="Edit avatar"
              className="absolute bottom-0 right-0 size-8 rounded-full border border-border bg-card/95 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <UserEdit01Icon className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate({ to: "/avatar", search: { mode: "fresh" } })}
              aria-label="Add avatar"
              title="Add avatar"
              className="absolute bottom-0 right-0 size-8 rounded-full border border-border bg-card/95 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Add01Icon className="size-3.5" />
            </button>
          )}
        </div>

        {/* Display Name + Edit Icon */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {loadingData ? "Loading…" : currentDisplayName}
          </h2>
          <button
            type="button"
            onClick={handleOpenEditProfile}
            aria-label="Edit display name and handle"
            title="Edit profile"
            className="p-1 rounded-md text-primary/80 hover:text-primary transition-colors cursor-pointer"
          >
            <Edit04Icon className="size-4" />
          </button>
        </div>

        {/* Username / Handle */}
        <p className="mt-1 font-mono text-sm text-muted-foreground">@{currentHandle}</p>

        {/* Member Since Date */}
        <p className="mt-1 text-xs text-muted-foreground/80">
          {formatMemberSince(profile?.created_at ?? user?.created_at)}
        </p>

        {/* SIGN-IN METHODS SECTION - Creative Spün styling */}
        <div className="w-full mt-8">
          <div className="mb-3.5 flex items-center justify-between">
            <h3 className="text-xs uppercase font-mono tracking-widest text-muted-foreground/90 font-medium">
              Sign-in Methods
            </h3>
            <span className="text-[0.7rem] text-muted-foreground/60 font-mono">
              {connectedCount} linked
            </span>
          </div>

          <div className="rounded-2xl border-2 border-border bg-surface/40 backdrop-blur-xs divide-y-2 divide-border/40 overflow-hidden shadow-xs">
            {orderedProviders.map((p) => {
              const connected = isConnected(p.id);
              const isPrimary = p.id === primaryProviderKey;

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 sm:px-4 sm:py-3.5 transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-background/90 border-2 border-border flex items-center justify-center text-foreground/90 shrink-0 shadow-xs">
                      <ProviderIcon provider={p.id} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground tracking-tight">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {connected ? (
                          <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-muted-foreground">
                            <span className="size-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-muted-foreground/60">
                            <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                            Not connected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isPrimary ? (
                      <span className="inline-flex items-center gap-1 text-[0.75rem] font-medium tracking-wide text-primary bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-md select-none">
                        <Check className="size-3 stroke-[2.5]" /> Primary
                      </span>
                    ) : connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDisconnectTarget(p)}
                        disabled={connectedCount <= 1}
                        className="h-8 px-3 text-xs border-border/70 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title={
                          connectedCount <= 1
                            ? "At least one sign-in method must stay linked."
                            : undefined
                        }
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConnect(p.id)}
                        className="h-8 px-3.5 text-xs font-medium bg-secondary/80 hover:bg-secondary text-secondary-foreground shadow-xs"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground/75 text-center leading-relaxed">
            You can sign in with any connected method. At least one must stay linked.
          </p>
        </div>

        {/* LOG OUT BUTTON (kept exactly as it is at the bottom of the card) */}
        <div className="w-full mt-8">
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={handleSignOut}
            disabled={signOutPending}
          >
            {signOutPending ? "Signing out…" : "Log out"}
          </Button>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your public display name and unique handle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Display Name Field */}
            <div className="space-y-2 text-left">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Enter display name"
                className="bg-surface/50 rounded-md"
              />
            </div>

            {/* Handle Field */}
            <HandleInput
              id="edit-handle"
              label="Username / Handle"
              value={editHandle}
              onChange={setEditHandle}
              handleCheck={handleCheck}
              placeholder="username"
            />

            {/* Required warning message at all times */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mt-2">
              <p className="text-xs text-amber-500/90 dark:text-amber-400/90 flex items-start gap-1.5 leading-relaxed">
                <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  Changing your handle may break existing links that use @{currentHandle}.
                </span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={savingProfile}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveProfile} disabled={!canSaveProfile}>
              {savingProfile ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AVATAR EDIT PROCEED MODAL */}
      <Dialog open={avatarModalOpen} onOpenChange={setAvatarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How&apos;d you like to proceed?</DialogTitle>
          </DialogHeader>

          <RadioGroup
            value={avatarEditChoice ?? ""}
            onValueChange={(val) => setAvatarEditChoice(val as "refine" | "fresh")}
            className="space-y-3 py-3"
          >
            <label
              htmlFor="choice-refine"
              className={cn(
                "flex items-start gap-3.5 rounded-xl border p-4 text-left transition-colors cursor-pointer",
                avatarEditChoice === "refine"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:bg-surface/60",
              )}
            >
              <RadioGroupItem value="refine" id="choice-refine" className="mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">Refine current</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Edit your existing avatar. Keep your current style, seed, and selected features.
                </p>
              </div>
            </label>

            <label
              htmlFor="choice-fresh"
              className={cn(
                "flex items-start gap-3.5 rounded-xl border p-4 text-left transition-colors cursor-pointer",
                avatarEditChoice === "fresh"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:bg-surface/60",
              )}
            >
              <RadioGroupItem value="fresh" id="choice-fresh" className="mt-0.5" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">Start fresh</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Discard your current avatar and begin from scratch with a new style.
                </p>
              </div>
            </label>
          </RadioGroup>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              disabled={navigatingAvatar}
              onClick={() => setAvatarModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!avatarEditChoice || navigatingAvatar}
              onClick={async () => {
                const choice = avatarEditChoice ?? "refine";
                if (choice === "fresh" && user?.id && typeof window !== "undefined") {
                  try {
                    localStorage.removeItem(`spun_avatar_draft_${user.id}`);
                  } catch (e) {
                    console.warn("Failed to clear local draft before fresh start:", e);
                  }
                }
                setNavigatingAvatar(true);
                try {
                  await navigate({ to: "/avatar", search: { mode: choice } });
                  setAvatarModalOpen(false);
                } finally {
                  setNavigatingAvatar(false);
                }
              }}
            >
              {navigatingAvatar ? "Loading…" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DISCONNECT CONFIRMATION MODAL */}
      <Dialog
        open={disconnectTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDisconnectTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect {disconnectTarget?.name}?</DialogTitle>
            <DialogDescription>
              You&apos;ll no longer be able to sign in with {disconnectTarget?.name}.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisconnectTarget(null)}
              disabled={disconnecting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONNECT EMAIL PASSWORD MODAL */}
      <Dialog
        open={connectEmailModalOpen}
        onOpenChange={(open) => {
          if (!open) setConnectEmailModalOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Email &amp; Password</DialogTitle>
            <DialogDescription>
              Set a password so you can sign in directly with {user?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2 text-left">
              <Label htmlFor="connect-email-password">New Password</Label>
              <div className="relative">
                <Input
                  id="connect-email-password"
                  type={showEmailPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="bg-surface/50 rounded-md pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEmailPassword((v) => !v)}
                  aria-label={showEmailPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                  {showEmailPassword ? (
                    <ViewOffIcon className="size-4" />
                  ) : (
                    <ViewIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConnectEmailModalOpen(false)}
              disabled={connectingEmail}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEmailPassword}
              disabled={connectingEmail || emailPassword.length < 6}
            >
              {connectingEmail ? "Saving…" : "Save Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthShell>
  );
}
