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
import {
  ShuffleIcon as Shuffle,
  PencilEdit01Icon,
  PaintBoardIcon,
  ColorPickerIcon,
  NoseIcon,
  GlassesIcon,
  Shirt01Icon,
  EarRings01Icon,
  WavingHand02Icon,
  EyeIcon,
  TongueIcon,
  MagicWand01Icon as WandSparklesIcon,
  HatIcon,
  UserIcon,
  EarIcon,
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
  backIconType?: "close" | "back";
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

/** Build initial options that zero out optional features if unset */
function buildCleanInitialOptions(
  initialOptions: AvatarOptions,
  descriptor: Record<string, FieldDescriptor>,
): AvatarOptions {
  const opts: AvatarOptions = { ...initialOptions };
  for (const key of Object.keys(descriptor)) {
    if (key.endsWith("Probability")) {
      const featureName = key.replace(/Probability$/, "").toLowerCase();
      const variantKey = `${key.replace(/Probability$/, "")}Variant`;
      if (OPTIONAL_FEATURES.has(featureName) && opts[key] === undefined) {
        if (opts[variantKey] !== undefined) {
          opts[key] = 100;
        } else {
          opts[key] = 0;
        }
      }
    }
  }
  return opts;
}

// ── Feature Icons ────────────────────────────────────────────────────────────

function HairIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 4C7.5 4 4 6.8 4 10.5c0 2.2 1.3 4.2 2.3 5.7.4.6 1.3.6 1.6 0 .4-1 .6-2.1.9-3 1 .7 2.3 1.1 3.2 1.1s2.2-.4 3.2-1.1c.3.9.5 2 .9 3 .3.6 1.2.6 1.6 0 1-1.5 2.3-3.5 2.3-5.7C20 6.8 16.5 4 12 4z" />
    </svg>
  );
}

function FacialHairIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {/* Mustache */}
      <path d="M12 11.2c-1.8-1.5-4.5-2.2-7.5-1.2-1.5.5-2.5 1.7-2.5 2.7 0 1.2 1.3 2.1 2.8 1.8 2.2-.4 4.5.3 5.7 1.5.5.5 1.3.7 1.5.7s1-.2 1.5-.7c1.2-1.2 3.5-1.9 5.7-1.5 1.5.3 2.8-.6 2.8-1.8 0-1-1-2.2-2.5-2.7-3-1-5.7-.3-7.5 1.2z" />
      {/* Goatee chin patch */}
      <path d="M12 17.5c-1.1 0-1.9 1-1.9 2 0 1.2 1.9 2.5 1.9 2.5s1.9-1.3 1.9-2.5c0-1-.8-2-1.9-2z" />
    </svg>
  );
}

function EyebrowIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.5 14.5c-.3 0-.6-.1-.8-.3-2.6-2.1-6-3.2-9.7-3.2-2.5 0-4.8.6-6.7 1.7-.5.3-1.1.1-1.4-.4-.3-.5-.1-1.1.4-1.4 2.3-1.3 5-2 8-2 4 0 7.8 1.2 10.8 3.6.4.3.5 1 .2 1.4-.2.4-.5.6-.8.6z" />
    </svg>
  );
}

function AccessoriesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l2.4 6.9 7.1.4-5.4 4.6 1.7 7-6.2-3.8-6.2 3.8 1.7-7-5.4-4.6 7.1-.4L12 2z" />
    </svg>
  );
}

function BackgroundIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8.5 7c.8 0 1.5.7 1.5 1.5S11.3 13 10.5 13 9 12.3 9 11.5 9.7 10 10.5 10zm-3 8l3-4 2 2.5 3-4 4 5.5H5.5z" />
    </svg>
  );
}

function CheckmarkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CancelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function getFeatureIconComponent(feature: string) {
  const f = feature.toLowerCase();
  // Icons requested by user:
  // Stroke and Ink: PencilEdit01Icon
  if (f.includes("stroke") || f.includes("ink")) return PencilEdit01Icon;
  // Skin: ColorPickerIcon
  if (f.includes("skin") || f === "base") return ColorPickerIcon;
  // Nose: NoseIcon
  if (f.includes("nose")) return NoseIcon;
  // Glasses: GlassesIcon
  if (f.includes("glasses") || f.includes("sunglasses") || f.includes("eyepatch"))
    return GlassesIcon;
  // Shirt / Clothing / Clothes: Shirt01Icon
  if (
    f.includes("clothing") ||
    f.includes("clothes") ||
    f.includes("shirt") ||
    f.includes("body")
  ) {
    return Shirt01Icon;
  }
  // Earrings: EarRings01Icon
  if (f.includes("earring")) return EarRings01Icon;
  // Gestures: WavingHand02Icon
  if (f.includes("gesture")) return WavingHand02Icon;
  // Cloth graphics / Design: WandSparklesIcon
  if (f.includes("graphic") || f.includes("design")) return WandSparklesIcon;
  // Hair
  if (f.includes("hair") && !f.includes("facial")) return HairIcon;
  // Beard / Facial hair
  if (
    f.includes("beard") ||
    f.includes("facial") ||
    f.includes("mustache") ||
    f.includes("moustache")
  ) {
    return FacialHairIcon;
  }
  // Eye: EyeIcon
  if (f.includes("eye") && !f.includes("brow") && !f.includes("shadow")) return EyeIcon;
  if (f.includes("brow")) return EyebrowIcon;
  // Mouth: TongueIcon
  if (f.includes("mouth") || f.includes("lip")) return TongueIcon;
  // Details: WandSparklesIcon
  if (f.includes("detail")) return WandSparklesIcon;
  // Head: UserIcon
  if (f.includes("head") || f.includes("face")) return UserIcon;
  // Ear: EarIcon
  if (f.includes("ear") && !f.includes("earring") && !f.includes("beard")) return EarIcon;
  // Hat: HatIcon
  if (f.includes("hat") || f.includes("cap")) return HatIcon;
  if (f.includes("accessor") || f.includes("necklace")) return AccessoriesIcon;
  if (f.includes("background")) return BackgroundIcon;
  // Colors : PaintBoardIcon
  if (f.includes("color") || f.includes("colour") || f.includes("palette")) return PaintBoardIcon;
  return PaintBoardIcon;
}

function getFeatureFriendlyLabel(featureName: string): string {
  const f = featureName.toLowerCase();
  if (f === "skin" || f === "base") return "Skin";
  if (f === "facialhair" || f === "facial" || f === "beard") return "Beard";
  if (f === "eyebrows" || f === "eyebrow") return "Brows";
  if (f === "clothing" || f === "shirt" || f === "clothes") return "Clothes";
  if (f === "clothesgraphic" || f === "graphic" || f === "design") return "Design";
  if (f === "rearhair" || f === "rear_hair") return "Rear Hair";
  if (f === "ink") return "Ink";
  if (f === "stroke") return "Stroke";
  if (f === "glasses" || f === "sunglasses") return "Glasses";
  if (f === "earrings" || f === "earring") return "Earrings";
  if (f === "gesture" || f === "gestures") return "Gestures";
  if (f === "details" || f === "detail") return "Details";
  if (f === "head" || f === "face") return "Head";
  if (f === "hat" || f === "cap") return "Hat";
  if (f === "ear") return "Ear";
  return titleize(featureName);
}

// ── Feature Group & Sub-Tab Interfaces ────────────────────────────────────────

export interface SubTab {
  id: string;
  type: "variant" | "graphic" | "color";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variantKey?: string;
  field?: FieldDescriptor;
  values?: string[];
  isOptional?: boolean;
}

export interface ValidFeatureGroup {
  feature: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subTabs: SubTab[];
  colorEntries: Array<[string, FieldDescriptor]>;
}

// ── Main AvatarBuilder Component ─────────────────────────────────────────────

export function AvatarBuilder({
  style,
  initialOptions = {},
  seed,
  userHandle,
  onContinue,
  onChange,
  onBack,
  onSkip,
  showSkip = false,
  continueLabel = "Save",
  continueDisabled = false,
  className,
  backIconType,
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

  // Standard rule throughout all avatar styles:
  // If a feature row has just 1 option, don't show it coz there's nothing to choose there.
  // And "Clothes graphic should be part of Clothes when available, just like how color tabs appear if the selected feature has colours."
  const validFeatureGroups = React.useMemo<ValidFeatureGroup[]>(() => {
    const map = new Map<
      string,
      {
        feature: string;
        variantEntries: Array<[string, FieldDescriptor]>;
        graphicEntry?: [string, FieldDescriptor];
        colorEntries: Array<[string, FieldDescriptor]>;
      }
    >();

    for (const [key, field] of visibleEntries) {
      const lowerKey = key.toLowerCase();

      // Check if this is a clothes graphic option: attach directly to "clothing"
      if (lowerKey.startsWith("clothesgraphic") || lowerKey.startsWith("clothinggraphic")) {
        let group = map.get("clothing");
        if (!group) {
          group = { feature: "clothing", variantEntries: [], colorEntries: [] };
          map.set("clothing", group);
        }
        if (key.endsWith("Variant") || field.type === "enum") {
          group.graphicEntry = [key, field];
        }
        continue;
      }

      const feat = featureNameFromOption(key, style);
      let group = map.get(feat);
      if (!group) {
        group = { feature: feat, variantEntries: [], colorEntries: [] };
        map.set(feat, group);
      }

      if (key.endsWith("Variant") || (field.type === "enum" && !lowerKey.includes("color"))) {
        group.variantEntries.push([key, field]);
      } else if (lowerKey.includes("color") || field.type === "color") {
        group.colorEntries.push([key, field]);
      }
    }

    const result: ValidFeatureGroup[] = [];

    for (const group of map.values()) {
      const groupLabel = getFeatureFriendlyLabel(group.feature);
      const groupIcon = getFeatureIconComponent(group.feature);
      const subTabs: SubTab[] = [];

      // 1. Variant sub-tabs
      // For hair, we might have multiple: hair, frontHair, rearHair, sideburns, hairAccessories
      const variantSubTabs: Array<SubTab & { order: number }> = [];

      for (const [vKey, vField] of group.variantEntries) {
        const cleanVKey = vKey.replace(/Variant$/, "").toLowerCase();
        const isOptional = isOptionalFeature(cleanVKey) || isOptionalFeature(group.feature);
        const values = vField.values ?? [];
        const choices = values.length + (isOptional ? 1 : 0);
        if (choices <= 1) continue; // 1-option rule: skip if only 1 choice

        let id = vKey;
        let label = groupLabel;
        let icon = groupIcon;
        let order = 1;

        if (group.feature === "hair") {
          const lower = vKey.toLowerCase();
          if (lower.startsWith("fronthair")) {
            id = "frontHair";
            label = "Front Hair";
            icon = HairIcon;
            order = 2;
          } else if (lower.startsWith("rearhair")) {
            id = "rearHair";
            label = "Rear Hair";
            icon = HairIcon;
            order = 3;
          } else if (lower.startsWith("sideburn")) {
            id = "sideburns";
            label = "Sideburns";
            icon = HairIcon;
            order = 4;
          } else if (lower.startsWith("hairaccessories")) {
            id = "hairAccessories";
            label = "Accessories";
            icon = WandSparklesIcon;
            order = 5;
          } else {
            id = "hair";
            label = "Hair";
            icon = HairIcon;
            order = 1;
          }
        }

        variantSubTabs.push({
          id,
          type: "variant",
          label,
          icon,
          variantKey: vKey,
          field: vField,
          values: [...values],
          isOptional,
          order,
        });
      }

      variantSubTabs.sort((a, b) => a.order - b.order);
      for (const vSub of variantSubTabs) {
        subTabs.push({
          id: vSub.id,
          type: vSub.type,
          label: vSub.label,
          icon: vSub.icon,
          variantKey: vSub.variantKey,
          field: vSub.field,
          values: vSub.values,
          isOptional: vSub.isOptional,
        });
      }

      // 2. Graphic sub-tab (e.g. for clothes)
      if (group.graphicEntry) {
        const [gKey, gField] = group.graphicEntry;
        const gValues = gField.values ?? [];
        if (gValues.length + 1 > 1) {
          subTabs.push({
            id: "graphic",
            type: "graphic",
            label: "Design",
            icon: WandSparklesIcon,
            variantKey: gKey,
            field: gField,
            values: [...gValues],
            isOptional: true,
          });
        }
      }

      // 3. Colour sub-tab
      const validColorEntries: Array<[string, FieldDescriptor]> = [];
      for (const entry of group.colorEntries) {
        const [cKey] = entry;
        const pal = paletteFor(cKey);
        if (pal && pal.length > 1) {
          validColorEntries.push(entry);
        }
      }

      if (validColorEntries.length > 0) {
        let colorSubTabIcon = PaintBoardIcon;
        const featLower = group.feature.toLowerCase();
        if (featLower.includes("skin") || featLower === "base") {
          colorSubTabIcon = ColorPickerIcon;
        } else if (featLower.includes("background")) {
          colorSubTabIcon = BackgroundIcon;
        } else if (featLower.includes("stroke") || featLower.includes("ink")) {
          colorSubTabIcon = PencilEdit01Icon;
        } else if (variantSubTabs.length === 0 && !group.graphicEntry) {
          colorSubTabIcon = groupIcon;
        }

        subTabs.push({
          id: "color",
          type: "color",
          label: `${groupLabel} Colour`,
          icon: colorSubTabIcon,
        });
      }

      // 1-option rule: If no subTabs at all, do not show this feature!
      if (subTabs.length === 0) continue;

      result.push({
        feature: group.feature,
        label: groupLabel,
        icon: groupIcon,
        subTabs,
        colorEntries: validColorEntries,
      });
    }

    // Sort according to canonical FEATURE_ORDER
    return result.sort((a, b) => {
      const idxA = FEATURE_ORDER.indexOf(a.feature);
      const idxB = FEATURE_ORDER.indexOf(b.feature);
      if (idxA === -1 && idxB === -1) return a.feature.localeCompare(b.feature);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [visibleEntries, style]);

  // Selected feature key & active sub-tab id
  const [selectedFeatureKey, setSelectedFeatureKey] = React.useState<string>(() => {
    return validFeatureGroups[0]?.feature ?? "";
  });

  const [activeSubTabId, setActiveSubTabId] = React.useState<string>(() => {
    return validFeatureGroups[0]?.subTabs[0]?.id ?? "";
  });

  // Keep selectedFeatureKey and activeSubTabId valid when style changes
  React.useEffect(() => {
    if (validFeatureGroups.length === 0) return;
    const exists = validFeatureGroups.find((g) => g.feature === selectedFeatureKey);
    if (!exists) {
      const first = validFeatureGroups[0];
      setSelectedFeatureKey(first.feature);
      setActiveSubTabId(first.subTabs[0]?.id ?? "");
    } else {
      if (!exists.subTabs.some((s) => s.id === activeSubTabId)) {
        setActiveSubTabId(exists.subTabs[0]?.id ?? "");
      }
    }
  }, [validFeatureGroups, selectedFeatureKey, activeSubTabId]);

  const activeGroup = React.useMemo(() => {
    return (
      validFeatureGroups.find((g) => g.feature === selectedFeatureKey) ?? validFeatureGroups[0]
    );
  }, [validFeatureGroups, selectedFeatureKey]);

  const currentSubTab = React.useMemo(() => {
    if (!activeGroup) return null;
    return (
      activeGroup.subTabs.find((s) => s.id === activeSubTabId) ?? activeGroup.subTabs[0] ?? null
    );
  }, [activeGroup, activeSubTabId]);

  // Handle clicking a feature tab
  const handleSelectFeature = React.useCallback((group: ValidFeatureGroup) => {
    setSelectedFeatureKey(group.feature);
    if (group.subTabs.length > 0) {
      setActiveSubTabId(group.subTabs[0].id);
    }
  }, []);

  // Live avatar URI
  const liveAvatarUri = React.useMemo(
    () => renderAvatarDataUri(style, currentSeed, options, 320),
    [style, currentSeed, options],
  );

  // Randomise handler
  const handleRandomise = React.useCallback(() => {
    const newSeed = Math.random().toString(36).slice(2, 10);
    setCurrentSeed(newSeed);

    const nextOptions: AvatarOptions = {};

    for (const [key, field] of visibleEntries) {
      const feat = featureNameFromOption(key, style);
      const cleanKey = key.replace(/(Variant|Probability)$/, "").toLowerCase();
      const isOptional = isOptionalFeature(cleanKey) || isOptionalFeature(feat);
      const probKey = getProbabilityKey(key, descriptor);

      if (field.type === "enum" && field.values && field.values.length > 0) {
        const randVal = field.values[Math.floor(Math.random() * field.values.length)];
        nextOptions[key] = [randVal];
      } else if (field.type === "color" || key.toLowerCase().includes("color")) {
        const palette = paletteFor(key);
        const randColor = palette[Math.floor(Math.random() * palette.length)];
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
  }, [descriptor, visibleEntries, style]);

  // Variant selection
  const handleSelectVariant = React.useCallback(
    (val: string) => {
      if (!currentSubTab || currentSubTab.type === "color" || !currentSubTab.variantKey) return;
      const optKey = currentSubTab.variantKey;
      const probKey = getProbabilityKey(optKey, descriptor);

      setOptions((prev) => {
        const currentVal = prev[optKey];
        const isSame = Array.isArray(currentVal)
          ? currentVal.length === 1 && currentVal[0] === val
          : currentVal === val;
        const currentProb = probKey ? prev[probKey] : undefined;
        if (isSame && (probKey ? currentProb === 100 : true)) {
          return prev;
        }
        const next = { ...prev, [optKey]: [val] };
        if (probKey) next[probKey] = 100;
        return next;
      });
    },
    [currentSubTab, descriptor],
  );

  // Deselect variant (for optional features)
  const handleSelectNone = React.useCallback(() => {
    if (!currentSubTab || currentSubTab.type === "color" || !currentSubTab.variantKey) return;
    const optKey = currentSubTab.variantKey;
    const probKey = getProbabilityKey(optKey, descriptor);

    setOptions((prev) => {
      const currentVal = prev[optKey];
      const currentProb = probKey ? prev[probKey] : undefined;
      if (
        (currentVal === undefined || (Array.isArray(currentVal) && currentVal.length === 0)) &&
        (probKey ? currentProb === 0 : true)
      ) {
        return prev;
      }
      const next = { ...prev };
      delete next[optKey];
      if (probKey) next[probKey] = 0;
      return next;
    });
  }, [currentSubTab, descriptor]);

  // Color selection
  const handleSelectColor = React.useCallback((colorKey: string, colorHex: string) => {
    const cleanHex = stripHash(colorHex);
    setOptions((prev) => {
      const current = prev[colorKey];
      const isSame = Array.isArray(current)
        ? current.length === 1 && String(current[0] || "").toLowerCase() === cleanHex.toLowerCase()
        : String(current || "").toLowerCase() === cleanHex.toLowerCase();
      if (isSame) return prev;
      return {
        ...prev,
        [colorKey]: [cleanHex],
      };
    });
  }, []);

  const handleContinue = React.useCallback(() => {
    const finalSeed = userHandle || currentSeed;
    onContinue({ ...options, style, seed: finalSeed });
  }, [currentSeed, onContinue, options, style, userHandle]);

  // Compute if "None" / Deselect is currently active for current variant sub-tab
  const isNoneSelected = React.useMemo(() => {
    if (!currentSubTab || currentSubTab.type === "color" || !currentSubTab.variantKey) {
      return false;
    }
    const optKey = currentSubTab.variantKey;
    const probKey = getProbabilityKey(optKey, descriptor);
    if (probKey && options[probKey] !== undefined) {
      return Number(options[probKey]) === 0;
    }
    const raw = options[optKey];
    const selectedVal = Array.isArray(raw) ? String(raw[0] ?? "") : String(raw ?? "");
    return !selectedVal || selectedVal === "none";
  }, [currentSubTab, descriptor, options]);

  // Currently selected variant value
  const selectedVariantVal = React.useMemo(() => {
    if (!currentSubTab || currentSubTab.type === "color" || !currentSubTab.variantKey) {
      return "";
    }
    const optKey = currentSubTab.variantKey;
    const raw = options[optKey];
    if (Array.isArray(raw)) return String(raw[0] ?? "");
    if (raw) return String(raw);
    return "";
  }, [currentSubTab, options]);

  // Resolve back icon type: default to "close" if label is "Save", else "back"
  const resolvedBackIconType =
    backIconType || (continueLabel.toLowerCase().includes("save") ? "close" : "back");

  return (
    <div
      className={cn(
        "relative flex flex-col w-full h-full min-h-[560px] text-foreground select-none",
        className,
      )}
    >
      {/* ── TOP BAR: X/Back on Top-Left, Attribution in Middle, Save on Top-Right ── */}
      <header className="flex items-center justify-between py-2 mb-3 z-20 shrink-0">
        {/* Top Left: Back or Close circular button (no logo here) */}
        <div className="flex items-center">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={resolvedBackIconType === "close" ? "Close avatar editor" : "Go back"}
              className="size-10 rounded-full bg-neutral-800/90 hover:bg-neutral-700 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 active:scale-95"
            >
              {resolvedBackIconType === "close" ? (
                <CancelIcon className="size-5" />
              ) : (
                <BackIcon className="size-5" />
              )}
            </button>
          ) : (
            <div className="size-10" />
          )}
        </div>

        {/* Middle: Attribution between X and Save buttons, NO background pill or border */}
        <div className="flex items-center justify-center text-center px-2">
          {attribution ? (
            <span className="text-xs text-muted-foreground">
              Style by{" "}
              <a
                href={attribution.link}
                target="_blank"
                rel="noreferrer"
                className="text-foreground hover:underline font-medium"
              >
                {attribution.author}
              </a>
            </span>
          ) : null}
        </div>

        {/* Top Right: Skip & Save pill button */}
        <div className="flex items-center gap-2.5">
          {showSkip && onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-medium text-neutral-400 hover:text-white px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              Skip
            </button>
          ) : null}

          <button
            type="button"
            disabled={continueDisabled}
            onClick={handleContinue}
            className="rounded-full bg-white text-black font-semibold px-6 py-2 h-10 text-sm shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-100"
            style={{ color: "#000000", forcedColorAdjust: "none" }}
          >
            {continueLabel}
          </button>
        </div>
      </header>

      {/* ── FIXED PREVIEW AREA: Avatar centered with Randomise Icon (no label) ── */}
      <div className="relative flex-1 min-h-[220px] max-h-[360px] sm:max-h-[400px] flex items-center justify-center px-4 py-2 shrink-0">
        {/* Soft radial spotlight vignette */}
        <div className="absolute inset-0 bg-radial from-neutral-800/20 via-transparent to-transparent pointer-events-none" />

        {/* Center avatar preview */}
        <div className="relative aspect-square w-52 sm:w-64 md:w-72 max-h-[92%] flex items-center justify-center">
          <img
            src={liveAvatarUri}
            alt="Live Avatar Preview"
            className="size-full object-contain filter drop-shadow-2xl"
            style={{ forcedColorAdjust: "none" }}
          />
        </div>

        {/* Bottom-left floating Randomise button: Just icon, no label */}
        <div className="absolute bottom-3 left-2 sm:left-4 z-10">
          <button
            type="button"
            onClick={handleRandomise}
            className="size-10 sm:size-11 rounded-full bg-neutral-900/90 hover:bg-neutral-800 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer border border-white/15"
            title="Randomise features"
            aria-label="Randomise features"
          >
            <Shuffle className="size-5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* ── FEATURES SECTION: Regular section (NOT a drawer) ── */}
      <section
        aria-label="Avatar features"
        className="w-full flex-1 flex flex-col border-t border-border pt-2 shrink-0"
      >
        {/* ── HORIZONTALLY SCROLLABLE TAB ICONS ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto px-2 sm:px-4 py-2 border-b border-border/80 scrollbar-none shrink-0">
          {validFeatureGroups.map((group) => {
            const isSelected = selectedFeatureKey === group.feature;
            const Icon = group.icon;

            if (!isSelected) {
              // Inactive tab: icon only
              return (
                <button
                  key={group.feature}
                  type="button"
                  onClick={() => handleSelectFeature(group)}
                  aria-label={group.label}
                  title={group.label}
                  className="size-11 sm:size-12 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface transition-all shrink-0 cursor-pointer"
                >
                  <Icon className="size-6 sm:size-7" />
                </button>
              );
            }

            // Selected tab: show all sub-tabs of this feature, each with icon and label!
            return (
              <React.Fragment key={group.feature}>
                {group.subTabs.map((subTab) => {
                  const isActive = activeSubTabId === subTab.id;
                  const SubIcon = subTab.icon;

                  return (
                    <button
                      key={subTab.id}
                      type="button"
                      onClick={() => setActiveSubTabId(subTab.id)}
                      aria-label={subTab.label}
                      title={subTab.label}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 transition-all shrink-0 cursor-pointer",
                        isActive
                          ? "border-b-2 border-primary text-foreground font-semibold pb-2"
                          : "text-muted-foreground hover:text-foreground border-b-2 border-transparent",
                      )}
                    >
                      <SubIcon
                        className={cn(
                          "size-6 sm:size-7",
                          isActive ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <span className="text-sm font-medium tracking-tight whitespace-nowrap">
                        {subTab.label}
                      </span>
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── VERTICALLY SCROLLABLE PICKER AREA ── */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 max-h-[320px] sm:max-h-[380px] md:max-h-[420px] focus:outline-none">
          {/* Sub-view: Variant or Graphic options */}
          {currentSubTab &&
            (currentSubTab.type === "variant" || currentSubTab.type === "graphic") &&
            currentSubTab.values && (
              <div>
                {/* Optional feature / graphic: Deselect pill button */}
                {currentSubTab.isOptional && (
                  <div className="flex items-center mb-3.5">
                    <button
                      type="button"
                      onClick={handleSelectNone}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
                        isNoneSelected
                          ? "bg-foreground text-background shadow-sm"
                          : "bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground border border-border",
                      )}
                    >
                      Deselect
                    </button>
                  </div>
                )}

                {/* 4 items per row on mobile */}
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3.5">
                  {currentSubTab.values.map((val) => {
                    const isSelected = !isNoneSelected && selectedVariantVal === val;
                    const optKey = currentSubTab.variantKey!;
                    const probKey = getProbabilityKey(optKey, descriptor);

                    return (
                      <VariantCard
                        key={val}
                        style={style}
                        currentSeed={currentSeed}
                        currentOptions={options}
                        optKey={optKey}
                        val={val}
                        probKey={probKey}
                        isSelected={isSelected}
                        onSelect={handleSelectVariant}
                      />
                    );
                  })}
                </div>
              </div>
            )}

          {/* Sub-view: Colour palettes */}
          {currentSubTab &&
            currentSubTab.type === "color" &&
            activeGroup?.colorEntries.length > 0 && (
              <div className="space-y-6">
                {activeGroup.colorEntries.map(([colorKey]) => {
                  const palette = paletteFor(colorKey);
                  const selectedColor = normalizeColor(options[colorKey]);

                  return (
                    <div key={colorKey} className="space-y-2.5">
                      {activeGroup.colorEntries.length > 1 ? (
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {titleize(colorKey)}
                        </p>
                      ) : null}

                      {/* Color swatches with checkmark on selected */}
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                        {palette.map((colorHex) => {
                          const norm = normalizeColor(colorHex);
                          const isSelected = selectedColor === norm;
                          const light = isLightColor(colorHex);

                          return (
                            <button
                              key={colorHex}
                              type="button"
                              onClick={() => handleSelectColor(colorKey, colorHex)}
                              style={{ backgroundColor: colorHex, forcedColorAdjust: "none" }}
                              className={cn(
                                "aspect-square rounded-xl border-2 transition-transform cursor-pointer flex items-center justify-center active:scale-95 shadow-sm",
                                isSelected
                                  ? "border-foreground ring-2 ring-foreground/35 scale-105 shadow-md"
                                  : "border-border/60 hover:border-border",
                              )}
                              title={colorHex}
                              aria-label={`Select color ${colorHex}`}
                            >
                              {isSelected ? (
                                <CheckmarkIcon
                                  className={cn(
                                    "size-5 sm:size-6",
                                    light ? "text-neutral-950" : "text-white",
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
            )}
        </div>
      </section>
    </div>
  );
}

// ── VariantCard Component (Original card + preview box + label) ──────────────

interface VariantCardProps {
  style: string;
  currentSeed: string;
  currentOptions: AvatarOptions;
  optKey: string;
  val: string;
  probKey: string | null;
  isSelected: boolean;
  onSelect: (val: string) => void;
}

const VariantCard = React.memo(function VariantCard({
  style,
  currentSeed,
  currentOptions,
  optKey,
  val,
  probKey,
  isSelected,
  onSelect,
}: VariantCardProps) {
  const chipPreviewUri = React.useMemo(
    () =>
      renderAvatarDataUri(
        style,
        currentSeed,
        { ...currentOptions, [optKey]: [val], ...(probKey ? { [probKey]: 100 } : {}) },
        88,
      ),
    [currentOptions, currentSeed, optKey, probKey, style, val],
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(val)}
      aria-pressed={isSelected}
      className={cn(
        "group relative flex flex-col items-center justify-center p-1.5 rounded-xl border-2 shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer active:scale-95",
        isSelected
          ? "border-brand bg-brand-subtle shadow-sm"
          : "border-border bg-card hover:border-border-strong",
      )}
    >
      <div className="w-full aspect-square max-w-[72px] sm:max-w-[80px] rounded-lg overflow-hidden bg-neutral-950 border border-border/70 flex items-center justify-center p-0.5">
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
          "mt-1 text-[11px] tracking-tight font-medium truncate w-full text-center px-0.5",
          isSelected ? "text-brand font-semibold" : "text-muted-foreground",
        )}
      >
        {valueLabel(val)}
      </span>
    </button>
  );
});
