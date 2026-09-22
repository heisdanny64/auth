import React, { useState, useEffect, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { InformationCircleIcon as Info } from "hugeicons-react";
import { StylePicker } from "@/components/avatar/StylePicker";
import { AvatarBuilder } from "@/components/avatar/AvatarBuilder";
import { getProfile, updateAvatarConfig } from "@/lib/profiles";
import { detectAvatarStyle, areConfigsEqual, type AvatarOptions } from "@/lib/dicebear";
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
        baselineConfig: null,
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
    let originalProfileConfig: Record<string, unknown> | null = null;
    let detectedStyle = "adventurer";
    let seed = profile?.handle || "spun-default";

    if (existingConfig) {
      detectedStyle =
        (existingConfig.style as string) || detectAvatarStyle(existingConfig) || "adventurer";
      seed = (existingConfig.seed as string) || profile?.handle || "spun-default";
      originalProfileConfig = {
        ...existingConfig,
        style: detectedStyle,
        seed,
      };
    }

    // In refine mode or whenever an existing profile config exists:
    if (originalProfileConfig) {
      // Check if draft actually differs from the user's saved avatar!
      if (draft && draft.style) {
        const hasRealDifference = !areConfigsEqual(draft, originalProfileConfig);
        if (!hasRealDifference) {
          // Identical to existing saved avatar: clear outdated draft from storage silently!
          if (draftStorageKey && typeof window !== "undefined") {
            try {
              localStorage.removeItem(draftStorageKey);
            } catch (e) {
              console.warn("Failed to clear identical avatar draft:", e);
            }
          }
          draft = null;
        }
      }

      // If an actual differing draft exists, allow user to resume it
      if (draft && draft.style) {
        return {
          hasDraft: true,
          savedDraft: draft,
          phase: "builder" as const,
          style: String(draft.style),
          seed: String(draft.seed || seed),
          options: draft as AvatarOptions,
          config: draft,
          baselineConfig: originalProfileConfig,
          isDirty: true,
        };
      }

      // If in refine mode with no differing draft, open builder with existing profile avatar
      if (mode === "refine") {
        return {
          hasDraft: false,
          savedDraft: null,
          phase: "builder" as const,
          style: detectedStyle,
          seed,
          options: existingConfig as AvatarOptions,
          config: originalProfileConfig,
          baselineConfig: originalProfileConfig,
          isDirty: false,
        };
      }
    }

    // If there is an unsaved draft without an existing profile avatar:
    if (draft && draft.style) {
      return {
        hasDraft: true,
        savedDraft: draft,
        phase: "builder" as const,
        style: String(draft.style),
        seed: String(draft.seed || profile?.handle || "spun-default"),
        options: draft as AvatarOptions,
        config: draft,
        baselineConfig: null,
        isDirty: true,
      };
    }

    // Fresh start or style picker
    return {
      hasDraft: false,
      savedDraft: null,
      phase: "style" as const,
      style: null,
      seed: profile?.handle || "spun-default",
      options: {} as AvatarOptions,
      config: null,
      baselineConfig: null,
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

  // Baseline original configuration to compare against for changes
  const baselineConfigRef = useRef<Record<string, unknown> | null>(initialSetup.baselineConfig);

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

  // Helper to remove draft from localStorage
  const removeDraft = useCallback(() => {
    if (!draftStorageKey || typeof window === "undefined") return;
    try {
      localStorage.removeItem(draftStorageKey);
    } catch (err) {
      console.warn("Failed to remove avatar draft from localStorage:", err);
    }
  }, [draftStorageKey]);

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

  // Sync state if navigation enters with mode === "fresh"
  useEffect(() => {
    if (mode === "fresh") {
      removeDraft();
      setSelectedStyle(null);
      setBuilderSeed(profile?.handle || "spun-default");
      setBuilderOptions({});
      setCurrentConfig(null);
      baselineConfigRef.current = null;
      setPhase("style");
      setIsDirty(false);
      setShowDraftNotice(false);
      setSavedDraft(null);
      setBuilderKey((k) => k + 1);
    }
  }, [mode, removeDraft, profile?.handle]);

  // Draft banner actions:
  // 1. Resume: Dismiss notice, keep current restored draft
  const handleResumeDraft = () => {
    setShowDraftNotice(false);
  };

  // 2. Start over: Clear draft, dismiss notice, respect original entry mode
  const handleStartOver = () => {
    removeDraft();
    setShowDraftNotice(false);
    setSavedDraft(null);

    const existingConfig = profile?.avatar_config;
    if (mode === "refine" && existingConfig) {
      const detectedStyle =
        (existingConfig.style as string) || detectAvatarStyle(existingConfig) || "adventurer";
      const seed = (existingConfig.seed as string) || profile?.handle || "spun-default";
      const originalProfileConfig = { ...existingConfig, style: detectedStyle, seed };

      setSelectedStyle(detectedStyle);
      setBuilderSeed(seed);
      setBuilderOptions(existingConfig);
      setCurrentConfig(originalProfileConfig);
      baselineConfigRef.current = originalProfileConfig;
      setPhase("builder");
      setIsDirty(false);
    } else {
      setSelectedStyle(null);
      setBuilderSeed(profile?.handle || "spun-default");
      setBuilderOptions({});
      setCurrentConfig(null);
      baselineConfigRef.current = null;
      setPhase("style");
      setIsDirty(false);
    }
    setBuilderKey((k) => k + 1);
  };

  // Builder option change handler: only marks dirty and persists if an actual change was made!
  const handleBuilderChange = useCallback(
    (newConfig: { style: string; seed: string; [key: string]: unknown }) => {
      setCurrentConfig(newConfig);

      if (!baselineConfigRef.current) {
        baselineConfigRef.current = newConfig;
        setIsDirty(false);
        removeDraft();
        return;
      }

      const baseline = baselineConfigRef.current;
      const hasActualChange = !areConfigsEqual(newConfig, baseline);

      setIsDirty(hasActualChange);

      if (hasActualChange) {
        persistDraft(newConfig);
      } else {
        // Changed back to original or no differences! Remove draft from storage
        removeDraft();
      }
    },
    [persistDraft, removeDraft],
  );

  // StylePicker selection
  const handleSelectStyle = (styleKey: string) => {
    setSelectedStyle(styleKey);
  };

  // StylePicker -> Builder transition
  const handleBuildAvatar = () => {
    if (!selectedStyle) return;
    const seed = builderSeed || profile?.handle || "spun-default";
    const initialConf = { style: selectedStyle, seed, ...builderOptions };
    setCurrentConfig(initialConf);
    if (!baselineConfigRef.current) {
      baselineConfigRef.current = initialConf;
    }
    // Only save when an actual customization change occurs
    setIsDirty(false);
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
      removeDraft();
      baselineConfigRef.current = config;
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
    removeDraft();
    navigate({ to: "/me" });
  };

  return (
    <div className="relative min-h-screen bg-canvas text-foreground flex flex-col">
      {/* Spün logo + wordmark at its usual position: top left corner of the page */}
      <header className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex items-center gap-2.5">
          <img src="/spun-logo.svg" alt="Spün mark" className="size-8" />
          <span className="font-display text-xl font-semibold tracking-tight">Spün</span>
        </div>
      </header>

      {/* Main page content underneath logo: full screen, no card */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex flex-col">
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
            backIconType={mode === "refine" ? "close" : "back"}
            showSkip={false}
            continueLabel={saving ? "Saving…" : "Save"}
            showContinueArrow={false}
            continueDisabled={saving}
            stepLabel="Avatar Editor · Customise"
            className="flex-1"
          />
        )}
      </main>

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

      {/* Saved Draft Modal Dialog */}
      <Dialog open={showDraftNotice} onOpenChange={setShowDraftNotice}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resume saved draft?</DialogTitle>
            <DialogDescription>
              You have an unsaved avatar draft from a previous session. Would you like to resume
              where you left off or start fresh?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleStartOver}
              className="cursor-pointer"
            >
              Start over
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={handleResumeDraft}
              className="cursor-pointer"
            >
              Resume draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
