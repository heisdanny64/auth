import * as React from "react";
import {
  getOptionDescriptor,
  visibleOptionEntries,
  renderAvatarDataUri,
  getAttribution,
  titleize,
  valueLabel,
  paletteFor,
  isOptionalFeature,
  FEATURE_ORDER,
  featureNameFromOption,
  getProbabilityKey,
  OPTIONAL_FEATURES,
  type AvatarOptions,
  type FieldDescriptor,
} from "@/lib/dicebear";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft01Icon as ArrowLeft,
  ArrowRight01Icon as ArrowRight,
  ShuffleIcon as Shuffle,
} from "hugeicons-react";
import { cn } from "@/lib/utils";

export interface AvatarBuilderProps {
  style: string;
  initialOptions?: AvatarOptions;
  seed?: string;
  userHandle?: string;
  onContinue: (config: { style: string; seed: string; [key: string]: unknown }) => void;
  onChange?: (config: { style: string; seed: string; [key: string]: unknown }) => void;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  continueLabel?: string;
  continueDisabled?: boolean;
  showContinueArrow?: boolean;
  stepLabel?: string;
  className?: string;
}

/** Strip # prefix so DiceBear receives bare hex strings e.g. "F59E0B" */
function stripHash(hex: string): string {
  return hex.startsWith("#") ? hex.slice(1) : hex;
}

/** Normalise any color value to lowercase #hex for comparison */
function normalizeColor(val: unknown): string {
  if (!val) return "";
  const raw = Array.isArray(val) ? String(val[0] ?? "") : String(val);
  const clean = raw.startsWith("#") ? raw : `#${raw}`;
  return clean.toLowerCase();
}

function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

interface FeatureGroup {
  feature: string;
  variantEntry?: [string, FieldDescriptor];
  colorEntries: Array<[string, FieldDescriptor]>;
  otherEntries: Array<[string, FieldDescriptor]>;
}

/** Build initial options that explicitly zero out all optional feature probabilities
 *  so the avatar starts clean — no random beard/glasses from DiceBear defaults. */
function buildCleanInitialOptions(
  initialOptions: AvatarOptions,
  descriptor: Record<string, FieldDescriptor>,
): AvatarOptions {
  const opts: AvatarOptions = { ...initialOptions };
  for (const key of Object.keys(descriptor)) {
    if (key.endsWith("Probability")) {
      const featureName = key.replace(/Probability$/, "").toLowerCase();
      if (OPTIONAL_FEATURES.has(featureName) && opts[key] === undefined) {
        opts[key] = 0;
      }
    }
  }
  return opts;
}

export function AvatarBuilder({
  style,
  initialOptions = {},
  seed,
  userHandle,
  onContinue,
  onChange,
  onBack,
  onSkip,
  showSkip = true,
  continueLabel = "Continue",
  continueDisabled = false,
  showContinueArrow = true,
  stepLabel = "Step 2 · Avatar Builder",
  className,
}: AvatarBuilderProps) {
  const [currentSeed, setCurrentSeed] = React.useState<string>(
    seed || (initialOptions?.seed as string) || userHandle || "spun-default",
  );

  const descriptor = React.useMemo(() => getOptionDescriptor(style), [style]);

  const [options, setOptions] = React.useState<AvatarOptions>(() =>
    buildCleanInitialOptions(initialOptions, descriptor),
  );

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const finalSeed = userHandle || currentSeed;
    onChangeRef.current?.({ ...options, style, seed: finalSeed });
  }, [options, style, currentSeed, userHandle]);

  const visibleEntries = React.useMemo(() => visibleOptionEntries(descriptor), [descriptor]);
  const attribution = React.useMemo(() => getAttribution(style), [style]);

  // Group entries by feature
  const featureGroups = React.useMemo(() => {
    const map = new Map<string, FeatureGroup>();

    for (const [key, field] of visibleEntries) {
      const feat = featureNameFromOption(key);
      let group = map.get(feat);
      if (!group) {
        group = { feature: feat, colorEntries: [], otherEntries: [] };
        map.set(feat, group);
      }

      if (
        key.endsWith("Variant") ||
        (field.type === "enum" && !key.toLowerCase().includes("color"))
      ) {
        group.variantEntry = [key, field];
      } else if (key.toLowerCase().includes("color") || field.type === "color") {
        group.colorEntries.push([key, field]);
      } else {
        group.otherEntries.push([key, field]);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const idxA = FEATURE_ORDER.indexOf(a.feature);
      const idxB = FEATURE_ORDER.indexOf(b.feature);
      if (idxA === -1 && idxB === -1) return a.feature.localeCompare(b.feature);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [visibleEntries]);

  // Live avatar URI
  const liveAvatarUri = React.useMemo(
    () => renderAvatarDataUri(style, currentSeed, options, 256),
    [style, currentSeed, options],
  );

  // Randomise
  const handleRandomise = React.useCallback(() => {
    const newSeed = Math.random().toString(36).slice(2, 10);
    setCurrentSeed(newSeed);

    const nextOptions: AvatarOptions = {};

    for (const [key, field] of visibleEntries) {
      const feat = featureNameFromOption(key);
      const isOptional = isOptionalFeature(feat);
      const probKey = getProbabilityKey(key, descriptor);

      if (field.type === "enum" && field.values && field.values.length > 0) {
        const randVal = field.values[Math.floor(Math.random() * field.values.length)];
        nextOptions[key] = [randVal];
      } else if (field.type === "color" || key.toLowerCase().includes("color")) {
        const palette = paletteFor(key);
        const randColor = palette[Math.floor(Math.random() * palette.length)];
        // Store without # for DiceBear
        nextOptions[key] = [stripHash(randColor)];
      }

      if (probKey) {
        if (isOptional) {
          const enabled = Math.random() > 0.5;
          nextOptions[probKey] = enabled ? 100 : 0;
          if (!enabled) {
            delete nextOptions[key];
          }
        } else {
          nextOptions[probKey] = 100;
        }
      }
    }

    setOptions(nextOptions);
  }, [descriptor, visibleEntries]);

  const handleSelectVariant = React.useCallback(
    (key: string, value: string, probKey: string | null, isOptional: boolean) => {
      setOptions((prev) => {
        const next = { ...prev, [key]: [value] };
        if (probKey && isOptional) next[probKey] = 100;
        return next;
      });
    },
    [],
  );

  const handleSelectNone = React.useCallback((key: string, probKey: string | null) => {
    setOptions((prev) => {
      const next = { ...prev };
      delete next[key];
      if (probKey) next[probKey] = 0;
      return next;
    });
  }, []);

  const handleSelectColor = React.useCallback((key: string, colorHex: string) => {
    // DiceBear expects hex WITHOUT the # prefix
    setOptions((prev) => ({ ...prev, [key]: [stripHash(colorHex)] }));
  }, []);

  const handleContinue = React.useCallback(() => {
    // Use userHandle as the persisted seed so it's identifiable in the DB.
    // currentSeed was only used as the visual seed during the session.
    const finalSeed = userHandle || currentSeed;
    onContinue({ ...options, style, seed: finalSeed });
  }, [currentSeed, onContinue, options, style, userHandle]);

  return (
    <div className={cn("flex flex-col w-full", className)}>
      {/* Top header */}
      <div className="flex items-start justify-between gap-4 pb-6">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand uppercase">{stepLabel}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-display">
            Tune your avatar.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Customise individual features or randomise until it feels right.
          </p>
        </div>
        {showSkip && onSkip ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 rounded-full px-3"
          >
            Skip for now
          </Button>
        ) : null}
      </div>

      {/* Preview Section: Seamlessly integrated at the top */}
      <div className="flex flex-col items-center py-4 mb-6">
        {/* Avatar canvas */}
        <div className="relative aspect-square w-36 sm:w-44 lg:w-48 rounded-2xl overflow-hidden bg-neutral-950 border border-border flex items-center justify-center p-2 shadow-inner">
          <img
            src={liveAvatarUri}
            alt="Live Avatar Preview"
            className="size-full object-contain"
            style={{ forcedColorAdjust: "none" }}
          />
        </div>

        {/* Style name & attribution */}
        <div className="mt-3 text-center">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {titleize(style)}
          </span>
          {attribution ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Style by{" "}
              <a
                href={attribution.link}
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline font-medium"
              >
                {attribution.author}
              </a>
            </p>
          ) : null}
        </div>

        {/* Randomise button */}
        <Button
          type="button"
          variant="outline"
          size="default"
          onClick={handleRandomise}
          className="mt-3.5 w-full max-w-[200px] rounded-xl text-xs sm:text-sm cursor-pointer"
        >
          <Shuffle className="size-4 mr-2" /> Randomise
        </Button>
      </div>

      {/* Feature rows in a dedicated scrollable section */}
      <div className="max-h-[460px] sm:max-h-[520px] lg:max-h-[600px] overflow-y-auto px-2 sm:px-3.5 py-2 space-y-7 focus:outline-none">
        {featureGroups.map((group) => {
          const isOptional = isOptionalFeature(group.feature);

          return (
            <div key={group.feature} className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight text-foreground font-display">
                {titleize(group.feature)}
              </h3>

              {group.variantEntry ? (
                <VariantChipsRow
                  style={style}
                  currentSeed={currentSeed}
                  currentOptions={options}
                  variantEntry={group.variantEntry}
                  descriptor={descriptor}
                  isOptional={isOptional}
                  onSelectVariant={handleSelectVariant}
                  onSelectNone={handleSelectNone}
                />
              ) : null}

              {group.colorEntries.map(([colorKey]) => {
                const palette = paletteFor(colorKey);
                const selectedColor = normalizeColor(options[colorKey]);

                return (
                  <div key={colorKey} className="mt-3">
                    <div className="flex flex-wrap gap-3 items-center py-1.5 px-1">
                      {palette.map((color) => {
                        const norm = normalizeColor(color);
                        const isSelected = selectedColor === norm;
                        const light = isLightColor(color);

                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => handleSelectColor(colorKey, color)}
                            style={{ backgroundColor: color, forcedColorAdjust: "none" }}
                            className={cn(
                              "size-8 sm:size-9 rounded-full border-2 border-border-strong/90 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center cursor-pointer hover:scale-110",
                              isSelected &&
                                "ring-2 ring-brand ring-offset-2 ring-offset-background scale-110 border-white",
                            )}
                            title={color}
                            aria-label={`Select colour ${color}`}
                          >
                            {isSelected ? (
                              <svg
                                className={cn("size-4", light ? "text-neutral-900" : "text-white")}
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 8l3.5 3.5 6.5-7" />
                              </svg>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer: Back left, Continue right */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-border/60">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="size-4 mr-2" /> Back
          </Button>
        ) : (
          <div />
        )}

        <Button
          type="button"
          variant="hero"
          size="xl"
          disabled={continueDisabled}
          onClick={handleContinue}
          className="cursor-pointer"
        >
          {continueLabel}
          {showContinueArrow ? <ArrowRight className="size-4 ml-2" /> : null}
        </Button>
      </div>
    </div>
  );
}

// ── VariantChipsRow ────────────────────────────────────────────────────────────

interface VariantChipsRowProps {
  style: string;
  currentSeed: string;
  currentOptions: AvatarOptions;
  variantEntry: [string, FieldDescriptor];
  descriptor: Record<string, FieldDescriptor>;
  isOptional: boolean;
  onSelectVariant: (
    key: string,
    value: string,
    probKey: string | null,
    isOptional: boolean,
  ) => void;
  onSelectNone: (key: string, probKey: string | null) => void;
}

const VariantChipsRow = React.memo(function VariantChipsRow({
  style,
  currentSeed,
  currentOptions,
  variantEntry,
  descriptor,
  isOptional,
  onSelectVariant,
  onSelectNone,
}: VariantChipsRowProps) {
  const [optKey, field] = variantEntry;
  const values = field.values ?? [];
  const probKey = getProbabilityKey(optKey, descriptor);

  const selectedVal = React.useMemo(() => {
    const raw = currentOptions[optKey];
    if (Array.isArray(raw)) return String(raw[0] ?? "");
    if (raw) return String(raw);
    return "";
  }, [currentOptions, optKey]);

  const isNoneSelected = React.useMemo(() => {
    if (!isOptional) return false;
    if (probKey && currentOptions[probKey] !== undefined) {
      return Number(currentOptions[probKey]) === 0;
    }
    return !selectedVal || selectedVal === "none";
  }, [isOptional, probKey, currentOptions, selectedVal]);

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-3 pt-1.5 px-1.5">
      {/* None chip */}
      {isOptional ? (
        <button
          type="button"
          onClick={() => onSelectNone(optKey, probKey)}
          className={cn(
            "group relative flex flex-col items-center justify-center p-1.5 rounded-xl border-2 shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer",
            isNoneSelected
              ? "border-brand bg-brand-subtle"
              : "border-border bg-card hover:border-border-strong",
          )}
          aria-pressed={isNoneSelected}
        >
          <div className="size-16 sm:size-18 rounded-lg overflow-hidden bg-neutral-950 border border-border/70 flex flex-col items-center justify-center text-muted-foreground group-hover:text-foreground">
            <svg
              className="size-6 opacity-60"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M5.636 5.636l12.728 12.728" />
            </svg>
          </div>
          <span
            className={cn(
              "mt-1 text-[11px] tracking-tight font-medium",
              isNoneSelected ? "text-brand" : "text-muted-foreground",
            )}
          >
            None
          </span>
        </button>
      ) : null}

      {/* Variant chips */}
      {values.map((val) => {
        const isSelected = !isNoneSelected && selectedVal === val;
        return (
          <VariantChip
            key={val}
            style={style}
            currentSeed={currentSeed}
            currentOptions={currentOptions}
            optKey={optKey}
            val={val}
            probKey={probKey}
            isOptional={isOptional}
            isSelected={isSelected}
            onSelectVariant={onSelectVariant}
          />
        );
      })}
    </div>
  );
});

// ── VariantChip ────────────────────────────────────────────────────────────────

interface VariantChipProps {
  style: string;
  currentSeed: string;
  currentOptions: AvatarOptions;
  optKey: string;
  val: string;
  probKey: string | null;
  isOptional: boolean;
  isSelected: boolean;
  onSelectVariant: (
    key: string,
    value: string,
    probKey: string | null,
    isOptional: boolean,
  ) => void;
}

const VariantChip = React.memo(function VariantChip({
  style,
  currentSeed,
  currentOptions,
  optKey,
  val,
  probKey,
  isOptional,
  isSelected,
  onSelectVariant,
}: VariantChipProps) {
  const chipPreviewUri = React.useMemo(
    () =>
      renderAvatarDataUri(
        style,
        currentSeed,
        { ...currentOptions, [optKey]: [val], ...(probKey ? { [probKey]: 100 } : {}) },
        64,
      ),
    [currentOptions, currentSeed, optKey, probKey, style, val],
  );

  return (
    <button
      type="button"
      onClick={() => onSelectVariant(optKey, val, probKey, isOptional)}
      className={cn(
        "group relative flex flex-col items-center justify-center p-1.5 rounded-xl border-2 shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer",
        isSelected
          ? "border-brand bg-brand-subtle"
          : "border-border bg-card hover:border-border-strong",
      )}
      aria-pressed={isSelected}
    >
      <div className="size-16 sm:size-18 rounded-lg overflow-hidden bg-neutral-950 border border-border/70 flex items-center justify-center p-0.5">
        <img
          src={chipPreviewUri}
          alt={valueLabel(val)}
          loading="lazy"
          className="size-full object-contain transition-transform group-hover:scale-105"
          style={{ forcedColorAdjust: "none" }}
        />
      </div>
      <span
        className={cn(
          "mt-1 text-[11px] tracking-tight font-medium truncate max-w-[76px] px-0.5",
          isSelected ? "text-brand" : "text-muted-foreground",
        )}
      >
        {valueLabel(val)}
      </span>
    </button>
  );
});
