import * as React from "react";
import {
  getOptionDescriptor,
  visibleOptionEntries,
  renderAvatarDataUri,
  getAttribution,
  titleize,
  paletteFor,
  isOptionalFeature,
  FEATURE_ORDER,
  featureNameFromOption,
  getProbabilityKey,
  type AvatarOptions,
  type FieldDescriptor,
} from "@/lib/dicebear";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Shuffle, Check, Prohibition } from "iconoir-react";
import { cn } from "@/lib/utils";

export interface AvatarBuilderProps {
  style: string;
  initialOptions?: AvatarOptions;
  seed?: string;
  userHandle?: string;
  onContinue: (config: { style: string; seed: string; [key: string]: unknown }) => void;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  continueLabel?: string;
  className?: string;
}

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
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}

function formatOptionLabel(val: string): string {
  return val
    .replace(/^variant/, "#")
    .replace(/([A-Z])/g, " $1")
    .trim();
}

interface FeatureGroup {
  feature: string;
  variantEntry?: [string, FieldDescriptor];
  colorEntries: Array<[string, FieldDescriptor]>;
  otherEntries: Array<[string, FieldDescriptor]>;
}

export function AvatarBuilder({
  style,
  initialOptions = {},
  seed,
  userHandle,
  onContinue,
  onBack,
  onSkip,
  showSkip = true,
  continueLabel = "Continue",
  className,
}: AvatarBuilderProps) {
  const [currentSeed, setCurrentSeed] = React.useState<string>(
    seed || userHandle || "spun-default",
  );
  const [options, setOptions] = React.useState<AvatarOptions>(() => ({ ...initialOptions }));

  const descriptor = React.useMemo(() => getOptionDescriptor(style), [style]);
  const visibleEntries = React.useMemo(() => visibleOptionEntries(descriptor), [descriptor]);
  const attribution = React.useMemo(() => getAttribution(style), [style]);

  // Group entries by feature
  const featureGroups = React.useMemo(() => {
    const map = new Map<string, FeatureGroup>();

    for (const [key, field] of visibleEntries) {
      const feat = featureNameFromOption(key);
      let group = map.get(feat);
      if (!group) {
        group = {
          feature: feat,
          colorEntries: [],
          otherEntries: [],
        };
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

    // Sort features according to FEATURE_ORDER
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
  const liveAvatarUri = React.useMemo(() => {
    return renderAvatarDataUri(style, currentSeed, options, 256);
  }, [style, currentSeed, options]);

  // Randomise handler
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
        nextOptions[key] = [randColor];
      }

      // Companion probability assignment during randomisation
      if (probKey) {
        if (isOptional) {
          // For optional features during randomisation, probability stays at 50 (balanced, natural)
          nextOptions[probKey] = 50;
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
        if (probKey && isOptional) {
          // When selecting any option other than None for optional feature, force probability to 100
          next[probKey] = 100;
        }
        return next;
      });
    },
    [],
  );

  const handleSelectNone = React.useCallback((key: string, probKey: string | null) => {
    setOptions((prev) => {
      const next = { ...prev };
      delete next[key];
      if (probKey) {
        next[probKey] = 0;
      }
      return next;
    });
  }, []);

  const handleSelectColor = React.useCallback((key: string, colorHex: string) => {
    setOptions((prev) => ({
      ...prev,
      [key]: [colorHex],
    }));
  }, []);

  const handleContinue = React.useCallback(() => {
    // When saving the avatar config, use the user's username as the seed
    const finalSeed = userHandle || currentSeed || "spun-default";
    onContinue({
      ...options,
      style,
      seed: finalSeed,
    });
  }, [currentSeed, onContinue, options, style, userHandle]);

  return (
    <div className={cn("flex flex-col w-full", className)}>
      {/* Top Header */}
      <div className="flex items-start justify-between gap-4 pb-6 border-b border-border/70">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand uppercase">
            Step 2 · Avatar Builder
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-display">
            Tune your avatar.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Customize individual features or randomize until it feels right.
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

      {/* Main Layout: Split on desktop, sticky preview on mobile */}
      <div className="py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-8 items-start">
        {/* Left / Top Sticky Preview Column */}
        <div className="sticky top-4 z-20 flex flex-col items-center bg-card/95 backdrop-blur-md rounded-3xl border border-border/70 p-5 shadow-sm lg:static lg:bg-muted/15">
          {/* Avatar Canvas */}
          <div className="relative aspect-square w-40 sm:w-48 lg:w-56 rounded-2xl overflow-hidden bg-background/80 flex items-center justify-center p-2 border border-border/60 shadow-inner">
            <img
              src={liveAvatarUri}
              alt="Live Avatar Preview"
              className="size-full object-contain drop-shadow-md"
            />
          </div>

          {/* Style Name & Attribution */}
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

          {/* Randomise Button */}
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={handleRandomise}
            className="mt-4 w-full max-w-[220px] rounded-xl border-border/70 hover:bg-brand/10 hover:border-brand/50 text-foreground transition-all"
          >
            <Shuffle className="size-4 mr-2 text-brand" /> Randomise
          </Button>
        </div>

        {/* Right / Bottom Feature Rows */}
        <div className="flex flex-col gap-7 divide-y divide-border/40">
          {featureGroups.map((group) => {
            const isOptional = isOptionalFeature(group.feature);

            return (
              <div key={group.feature} className="pt-6 first:pt-0">
                {/* Feature Name */}
                <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3 font-display">
                  {titleize(group.feature)}
                </h3>

                {/* Variant Chips Row */}
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

                {/* Color Swatch Grids */}
                {group.colorEntries.map(([colorKey]) => {
                  const palette = paletteFor(colorKey);
                  const selectedColor = normalizeColor(options[colorKey]);

                  return (
                    <div key={colorKey} className="mt-3">
                      <div className="flex flex-wrap gap-2.5 items-center pt-1">
                        {palette.map((color) => {
                          const norm = normalizeColor(color);
                          const isSelected = selectedColor === norm;
                          const light = isLightColor(color);

                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => handleSelectColor(colorKey, color)}
                              style={{ backgroundColor: color }}
                              className={cn(
                                "size-8 sm:size-9 rounded-full border border-black/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center justify-center cursor-pointer shadow-sm hover:scale-110",
                                isSelected &&
                                  "ring-2 ring-brand ring-offset-2 ring-offset-background scale-110 shadow-md",
                              )}
                              title={color}
                              aria-label={`Select color ${color}`}
                            >
                              {isSelected ? (
                                <Check
                                  className={cn(
                                    "size-4 stroke-[3]",
                                    light ? "text-neutral-900" : "text-white",
                                  )}
                                />
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
      </div>

      {/* Bottom Footer: Continue on Bottom Left, Back on Bottom Right */}
      <div className="flex items-center justify-between border-t border-border/70 pt-6 mt-6">
        <Button
          type="button"
          variant="hero"
          size="xl"
          onClick={handleContinue}
          className="order-1 shadow-md"
        >
          {continueLabel} <ArrowRight className="size-4 ml-2" />
        </Button>

        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="default"
            onClick={onBack}
            className="order-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4 mr-2" /> Back
          </Button>
        ) : (
          <div className="order-2" />
        )}
      </div>
    </div>
  );
}

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

  // Is None selected for optional features?
  const isNoneSelected =
    isOptional &&
    (currentOptions[probKey ?? ""] === 0 ||
      (!selectedVal &&
        (currentOptions[probKey ?? ""] === undefined || currentOptions[probKey ?? ""] === 0)));

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-2.5 pt-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
      {/* "None" option chip for optional features */}
      {isOptional ? (
        <button
          type="button"
          onClick={() => onSelectNone(optKey, probKey)}
          className={cn(
            "group relative flex flex-col items-center justify-center p-1.5 rounded-xl border shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer",
            isNoneSelected
              ? "border-brand bg-brand/10 ring-2 ring-brand/30 shadow-sm"
              : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40",
          )}
          aria-pressed={isNoneSelected}
        >
          <div className="size-14 sm:size-16 rounded-lg overflow-hidden bg-background/60 flex flex-col items-center justify-center p-0.5 border border-border/40 text-muted-foreground group-hover:text-foreground">
            <Prohibition className="size-6 opacity-75" />
          </div>
          <span
            className={cn(
              "mt-1 text-[10px] tracking-tight font-medium truncate max-w-[64px]",
              isNoneSelected ? "text-foreground font-semibold" : "text-muted-foreground",
            )}
          >
            None
          </span>
        </button>
      ) : null}

      {/* Option value chips */}
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
  // Render miniature avatar preview with this variant applied
  const chipPreviewUri = React.useMemo(() => {
    return renderAvatarDataUri(
      style,
      currentSeed,
      {
        ...currentOptions,
        [optKey]: [val],
        ...(probKey ? { [probKey]: 100 } : {}),
      },
      64,
    );
  }, [currentOptions, currentSeed, optKey, probKey, style, val]);

  return (
    <button
      type="button"
      onClick={() => onSelectVariant(optKey, val, probKey, isOptional)}
      className={cn(
        "group relative flex flex-col items-center justify-center p-1.5 rounded-xl border shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer",
        isSelected
          ? "border-brand bg-brand/10 ring-2 ring-brand/30 shadow-sm"
          : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40",
      )}
      aria-pressed={isSelected}
    >
      <div className="size-14 sm:size-16 rounded-lg overflow-hidden bg-background/60 flex items-center justify-center p-0.5 border border-border/40">
        <img
          src={chipPreviewUri}
          alt={val}
          loading="lazy"
          className="size-full object-contain drop-shadow-sm transition-transform group-hover:scale-105"
        />
      </div>
      <span
        className={cn(
          "mt-1 text-[10px] tracking-tight font-medium truncate max-w-[64px]",
          isSelected ? "text-foreground font-semibold" : "text-muted-foreground",
        )}
      >
        {formatOptionLabel(val)}
      </span>
    </button>
  );
});
