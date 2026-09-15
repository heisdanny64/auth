import React, { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { InformationCircleIcon as Info } from "hugeicons-react";
import { StylePicker } from "@/components/avatar/StylePicker";
import { AvatarBuilder } from "@/components/avatar/AvatarBuilder";
import { getProfile, updateAvatarConfig } from "@/lib/profiles";
import { detectAvatarStyle, type AvatarOptions } from "@/lib/dicebear";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface AvatarSearch {
  mode?: "refine" | "fresh";
}

export const Route = createFileRoute("/_authenticated/avatar")({
  ssr: false,
  validateSearch: (search: Record<string, unknown> = {}): AvatarSearch => ({
    mode:
      search?.mode === "refine" || search?.mode === "fresh"
        ? (search.mode as "refine" | "fresh")
        : undefined,
  }),
  loader: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? (await supabase.auth.getUser()).data.user;
    if (!user) return { user: null, profile: null };
    const profile = await getProfile(user.id);
    return { user, profile };
  },
  head: () => ({
    meta: [
      { title: "Avatar Studio · Spün" },
      { name: "description", content: "Customize your Spün avatar." },
    ],
  }),
  component: AvatarPage,
});

function AvatarPage() {
  const { mode } = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const user = loaderData?.user;
  const profile = loaderData?.profile;
  const navigate = useNavigate();

  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const draftStorageKey = user?.id ? `spun_avatar_draft_${user.id}` : null;

  // Compute initial setup synchronously from local draft / mode / existing profile
  const initialSetup = React.useMemo(() => {
    // If user explicitly chose to start afresh, clear and ignore any stored draft
    if (mode === "fresh") {
      if (draftStorageKey && typeof window !== "undefined") {
        try {
          localStorage.removeItem(draftStorageKey);
        } catch (e) {
          console.warn("Failed to clear local avatar draft:", e);
        }
      }
      return {
        hasDraft: false,
        savedDraft: null,
        phase: "style" as const,
        style: null,
        seed: profile?.handle || "spun-default",
        options: {} as AvatarOptions,
        config: null,
        isDirty: false,
      };
    }

    let draft: Record<string, unknown> | null = null;
    if (draftStorageKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(draftStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && parsed.style) {
            draft = parsed;
          }
        }
      } catch (e) {
        console.warn("Failed to parse local avatar draft:", e);
      }
    }

    const existingConfig = profile?.avatar_config;

    // In refine mode, prefer existing profile avatar if draft is absent or from a different style
    if (mode === "refine" && existingConfig) {
      const detectedStyle =
        (existingConfig.style as string) || detectAvatarStyle(existingConfig) || "adventurer";
      const seed = (existingConfig.seed as string) || profile?.handle || "spun-default";

      // If there is an active draft matching the current style, allow user to resume it
      if (draft && draft.style && String(draft.style) === detectedStyle) {
        return {
          hasDraft: true,
          savedDraft: draft,
          phase: "builder" as const,
          style: String(draft.style),
          seed: String(draft.seed || seed),
          options: draft as AvatarOptions,
          config: draft,
          isDirty: true,
        };
      }

      return {
        hasDraft: false,
        savedDraft: null,
        phase: "builder" as const,
        style: detectedStyle,
        seed,
        options: existingConfig as AvatarOptions,
        config: { ...existingConfig, style: detectedStyle, seed },
        isDirty: false,
      };
    }

    if (draft && draft.style) {
      return {
        hasDraft: true,
        savedDraft: draft,
        phase: "builder" as const,
        style: String(draft.style),
        seed: String(draft.seed || profile?.handle || "spun-default"),
        options: draft as AvatarOptions,
        config: draft,
        isDirty: true,
      };
    }

    // Fresh start or plus icon
    return {
      hasDraft: false,
      savedDraft: null,
      phase: "style" as const,
      style: null,
      seed: profile?.handle || "spun-default",
      options: {} as AvatarOptions,
      config: null,
      isDirty: false,
    };
  }, [draftStorageKey, mode, profile]);

  // Phase: "style" or "builder"
  const [phase, setPhase] = useState<"style" | "builder">(() => initialSetup.phase);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(() => initialSetup.style);
  const [builderSeed, setBuilderSeed] = useState<string>(() => initialSetup.seed);
  const [builderOptions, setBuilderOptions] = useState<AvatarOptions>(() => initialSetup.options);
  const [currentConfig, setCurrentConfig] = useState<Record<string, unknown> | null>(
    () => initialSetup.config,
  );

  // Mount key to force AvatarBuilder re-initialization on reset/draft restore
  const [builderKey, setBuilderKey] = useState<number>(1);

  // Persistence & dirty state
  const [isDirty, setIsDirty] = useState(() => initialSetup.isDirty);
  const [saving, setSaving] = useState(false);

  // Leave confirmation dialog
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Draft notice state
  const [showDraftNotice, setShowDraftNotice] = useState(() => initialSetup.hasDraft);
  const [savedDraft, setSavedDraft] = useState<Record<string, unknown> | null>(
    () => initialSetup.savedDraft,
  );

  // Sync state if navigation enters with mode === "fresh"
  useEffect(() => {
    if (mode === "fresh") {
      if (draftStorageKey && typeof window !== "undefined") {
        try {
          localStorage.removeItem(draftStorageKey);
        } catch (e) {
          console.warn("Failed to clear local avatar draft:", e);
        }
      }
      setSelectedStyle(null);
      setBuilderSeed(profile?.handle || "spun-default");
      setBuilderOptions({});
      setCurrentConfig(null);
      setPhase("style");
      setIsDirty(false);
      setShowDraftNotice(false);
      setSavedDraft(null);
      setBuilderKey((k) => k + 1);
    }
  }, [mode, draftStorageKey, profile?.handle]);

  // Persist draft to localStorage
  const persistDraft = useCallback(
    (config: { style: string; seed: string; [key: string]: unknown }) => {
      if (!draftStorageKey || typeof window === "undefined") return;
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(config));
      } catch (err) {
        console.warn("Failed to write avatar draft to localStorage:", err);
      }
    },
    [draftStorageKey],
  );

  // Draft banner actions:
  // 1. Resume: Dismiss notice, keep current restored draft
  const handleResumeDraft = () => {
    setShowDraftNotice(false);
  };

  // 2. Start over: Clear draft, dismiss notice, respect original entry mode
  const handleStartOver = () => {
    if (draftStorageKey && typeof window !== "undefined") {
      localStorage.removeItem(draftStorageKey);
    }
    setShowDraftNotice(false);
    setSavedDraft(null);

    const existingConfig = profile?.avatar_config;
    if (mode === "refine" && existingConfig) {
      const detectedStyle =
        (existingConfig.style as string) || detectAvatarStyle(existingConfig) || "adventurer";
      const seed = (existingConfig.seed as string) || profile?.handle || "spun-default";

      setSelectedStyle(detectedStyle);
      setBuilderSeed(seed);
      setBuilderOptions(existingConfig);
      setCurrentConfig({ ...existingConfig, style: detectedStyle, seed });
      setPhase("builder");
      setIsDirty(false);
    } else {
      setSelectedStyle(null);
      setBuilderSeed(profile?.handle || "spun-default");
      setBuilderOptions({});
      setCurrentConfig(null);
      setPhase("style");
      setIsDirty(false);
    }
    setBuilderKey((k) => k + 1);
  };

  // Builder option change handler
  const handleBuilderChange = useCallback(
    (newConfig: { style: string; seed: string; [key: string]: unknown }) => {
      setCurrentConfig(newConfig);
      setIsDirty(true);
      persistDraft(newConfig);
    },
    [persistDraft],
  );

  // StylePicker selection
  const handleSelectStyle = (styleKey: string) => {
    setSelectedStyle(styleKey);
    setIsDirty(true);
  };

  // StylePicker -> Builder transition
  const handleBuildAvatar = () => {
    if (!selectedStyle) return;
    const seed = builderSeed || profile?.handle || "spun-default";
    const initialConf = { style: selectedStyle, seed, ...builderOptions };
    setCurrentConfig(initialConf);
    persistDraft(initialConf);
    setPhase("builder");
  };

  // Save to Supabase
  const handleSave = async (configToSave?: {
    style: string;
    seed: string;
    [key: string]: unknown;
  }) => {
    const config = configToSave || currentConfig;
    if (!config || !config.style) {
      toast.error("Please pick an avatar style and customize your avatar first.");
      return;
    }
    if (!user?.id) {
      toast.error("You must be signed in to save your avatar.");
      return;
    }

    setSaving(true);
    try {
      await updateAvatarConfig(user.id, config);
      if (draftStorageKey && typeof window !== "undefined") {
        localStorage.removeItem(draftStorageKey);
      }
      setIsDirty(false);
      toast.success("Avatar saved successfully!");
      navigate({ to: "/me" });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save avatar. Please try again.";
      toast.error(message);
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  // Back button click handler with unsaved changes verification
  const handleBackClick = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
    } else {
      navigate({ to: "/me" });
    }
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    if (draftStorageKey && typeof window !== "undefined") {
      try {
        localStorage.removeItem(draftStorageKey);
      } catch (e) {
        console.warn("Failed to clear local avatar draft on leave:", e);
      }
    }
    navigate({ to: "/me" });
  };

  return (
    <div className="relative min-h-screen bg-canvas text-foreground flex flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl">
        {/* Top bar with logo */}
        <header className="mb-6 flex items-center px-1">
          <div className="flex items-center gap-2.5">
            <img src="/spun-logo.svg" alt="Spün mark" className="size-7" />
            <span className="font-display text-lg font-semibold tracking-tight">Spün</span>
          </div>
        </header>

        {/* Main Card */}
        <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:p-10">
          {/* Subtle Saved Draft Notice Banner */}
          {showDraftNotice && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm">
              <div className="flex items-center gap-2.5 text-foreground">
                <Info className="size-4 text-primary shrink-0" />
                <span>You have a saved draft. Continue where you left off?</span>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleStartOver}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 cursor-pointer"
                >
                  Start over
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleResumeDraft}
                  className="text-xs h-8 px-3 cursor-pointer font-medium"
                >
                  Resume
                </Button>
              </div>
            </div>
          )}

          {/* Phase 1: Style Picker */}
          {phase === "style" && (
            <StylePicker
              key="style-picker"
              selectedStyle={selectedStyle}
              onSelectStyle={handleSelectStyle}
              onContinue={handleBuildAvatar}
              onBack={handleBackClick}
              showSkip={false}
              stepLabel="Avatar Editor · Style"
            />
          )}

          {/* Phase 2: Feature Rows Avatar Builder */}
          {phase === "builder" && selectedStyle && (
            <AvatarBuilder
              key={`avatar-builder-${selectedStyle}-${builderKey}`}
              style={selectedStyle}
              seed={builderSeed}
              initialOptions={builderOptions}
              userHandle={profile?.handle || undefined}
              onContinue={handleSave}
              onChange={handleBuilderChange}
              onBack={mode === "refine" ? handleBackClick : () => setPhase("style")}
              showSkip={false}
              continueLabel={saving ? "Saving…" : "Save"}
              showContinueArrow={false}
              continueDisabled={saving}
              stepLabel="Avatar Editor · Customise"
            />
          )}
        </div>
      </div>

      {/* Confirmation Dialog: Unsaved changes on leave */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>You have unsaved changes. Leave anyway?</DialogTitle>
            <DialogDescription>
              Your unsaved changes to your avatar will not be applied to your profile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowLeaveConfirm(false)}>
              Stay
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmLeave}>
              Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
