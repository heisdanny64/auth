import { Avatar, OptionsDescriptor, Style } from "@dicebear/core";
import adventurer from "@dicebear/styles/adventurer.json";
import avataaars from "@dicebear/styles/avataaars.json";
import bigEars from "@dicebear/styles/big-ears.json";
import bigSmile from "@dicebear/styles/big-smile.json";
import bottts from "@dicebear/styles/bottts.json";
import croodles from "@dicebear/styles/croodles.json";
import dylan from "@dicebear/styles/dylan.json";
import initials from "@dicebear/styles/initials.json";
import lorelei from "@dicebear/styles/lorelei.json";
import micah from "@dicebear/styles/micah.json";
import miniavs from "@dicebear/styles/miniavs.json";
import notionists from "@dicebear/styles/notionists.json";
import openPeeps from "@dicebear/styles/open-peeps.json";
import personas from "@dicebear/styles/personas.json";
import pixelArt from "@dicebear/styles/pixel-art.json";
import toonHead from "@dicebear/styles/toon-head.json";
import initialFace from "@dicebear/styles/initial-face.json";
export type FieldDescriptor =
  | { type: "string"; list?: true }
  | { type: "number"; min?: number; max?: number; list?: true }
  | { type: "boolean" }
  | { type: "enum"; values: readonly string[]; list?: true; weighted?: true; open?: true }
  | { type: "color"; list?: true; contrastTo?: string; notEqualTo?: readonly string[] }
  | { type: "range"; min?: number; max?: number };
export type Descriptor = Record<string, FieldDescriptor>;

type StyleDefinition = Record<string, unknown>;
export type AvatarOptions = Record<string, unknown>;

const definitions: Record<string, StyleDefinition> = {
  adventurer: adventurer as StyleDefinition,
  avataaars: avataaars as StyleDefinition,
  "big-ears": bigEars as StyleDefinition,
  "big-smile": bigSmile as StyleDefinition,
  bottts: bottts as StyleDefinition,
  croodles: croodles as StyleDefinition,
  dylan: dylan as StyleDefinition,
  initials: initials as StyleDefinition,
  lorelei: lorelei as StyleDefinition,
  micah: micah as StyleDefinition,
  miniavs: miniavs as StyleDefinition,
  notionists: notionists as StyleDefinition,
  "open-peeps": openPeeps as StyleDefinition,
  personas: personas as StyleDefinition,
  "pixel-art": pixelArt as StyleDefinition,
  "toon-head": toonHead as StyleDefinition,
  "initial-face": initialFace as StyleDefinition,
};

const styleCache = new Map<string, Style<StyleDefinition>>();

const attributionMap: Record<
  string,
  { author: string; link: string; license: string; licenseLink: string }
> = {
  adventurer: {
    author: "Lisa Wischofsky",
    link: "https://www.instagram.com/lischi_art/",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
  "big-ears": {
    author: "The Visual Team",
    link: "https://thevisual.team/",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
  "big-smile": {
    author: "Ashley Seo",
    link: "http://www.ashleyseo.com/",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
  croodles: {
    author: "vijay verma",
    link: "https://vjy.me/",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
  dylan: {
    author: "Natalia Spivak",
    link: "https://nataspvk.tilda.ws/",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
  micah: {
    author: "Micah Lanier",
    link: "https://dribbble.com/micahlanier",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
  miniavs: {
    author: "Webpixels",
    link: "https://webpixels.io/",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
  personas: {
    author: "Draftbit",
    link: "https://draftbit.com/",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
  "toon-head": {
    author: "Johan Melin",
    link: "https://www.johanmelin.com/",
    license: "CC BY 4.0",
    licenseLink: "https://creativecommons.org/licenses/by/4.0/",
  },
};

export const AVATAR_STYLES = [
  "adventurer",
  "avataaars",
  "big-ears",
  "big-smile",
  "bottts",
  "croodles",
  "dylan",
  "initials",
  "lorelei",
  "micah",
  "miniavs",
  "notionists",
  "open-peeps",
  "personas",
  "pixel-art",
  "toon-head",
  "initial-face",
].map((key) => ({ key, label: titleize(key), attribution: getAttribution(key) !== null }));

export function titleize(key: string) {
  const lower = key.toLowerCase();
  if (lower === "rearhair") return "Rear Hair";
  if (lower === "facialhair") return "Facial Hair";
  if (lower === "gesture" || lower === "gestures") return "Gestures";
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getStyleLabel(key: string) {
  return titleize(key);
}

export function getAttribution(key: string) {
  return attributionMap[key] ?? null;
}

function getStyle(key: string) {
  const definition = definitions[key];
  if (!definition) throw new Error(`Unknown avatar style: ${key}`);
  const cached = styleCache.get(key);
  if (cached) return cached;
  const style = new Style(definition);
  styleCache.set(key, style);
  return style;
}

export function renderAvatarDataUri(
  key: string,
  seed: string,
  options: AvatarOptions = {},
  size = 128,
) {
  // Extract valid schema options for this specific style.
  // CRITICAL: DiceBear's OptionsValidator has additionalProperties: false.
  // If unrecognized properties (especially "style", or arbitrary DB metadata)
  // are passed to new Avatar(), it throws OptionsValidationError and fails to render.
  let validKeys: Set<string> | null = null;
  try {
    const desc = getOptionDescriptor(key);
    validKeys = new Set(Object.keys(desc));
  } catch {
    // Fallback if descriptor lookup fails
  }

  const cleaned: Record<string, unknown> = { seed, size };
  for (const [propKey, value] of Object.entries(options)) {
    if (
      propKey === "style" ||
      propKey === "seed" ||
      propKey === "size" ||
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }
    // If descriptor keys are available, only pass valid keys
    if (validKeys && !validKeys.has(propKey)) {
      continue;
    }
    cleaned[propKey] = value;
  }

  const avatar = new Avatar(getStyle(key), cleaned);
  let svg = avatar.toString();
  // Ensure the SVG explicitly instructs browsers never to invert colors in auto-dark modes
  if (!svg.includes("forced-color-adjust")) {
    svg = svg.replace("<svg ", '<svg style="forced-color-adjust: none; color-scheme: normal;" ');
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function detectAvatarStyle(config: Record<string, unknown>): string | null {
  if (typeof config["style"] === "string" && config["style"].trim()) {
    return config["style"].trim();
  }

  const configKeys = Object.keys(config).filter(
    (k) => k !== "seed" && k !== "size" && k !== "style",
  );
  if (configKeys.length === 0) return null;

  let bestStyle: string | null = null;
  let maxMatches = 0;

  for (const item of AVATAR_STYLES) {
    try {
      const desc = getOptionDescriptor(item.key);
      const descKeys = new Set(Object.keys(desc));
      let matches = 0;
      for (const k of configKeys) {
        if (descKeys.has(k)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestStyle = item.key;
      }
    } catch {
      continue;
    }
  }

  return maxMatches > 0 ? bestStyle : null;
}

export function resolveProfileAvatarDataUri(
  config: unknown,
  seedFallback: string,
  size = 128,
): string | null {
  if (!config) return null;

  // Direct image URL or data URI support (e.g. Google profile picture, uploaded avatar)
  if (typeof config === "string") {
    const trimmed = config.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:image/") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("/")
    ) {
      return trimmed;
    }
  }

  let parsedConfig: Record<string, unknown>;
  if (typeof config === "string") {
    try {
      parsedConfig = JSON.parse(config) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof config === "object" && config !== null) {
    parsedConfig = config as Record<string, unknown>;
  } else {
    return null;
  }

  // Check if parsedConfig contains a direct image URL property
  for (const urlKey of ["avatar_url", "avatarUrl", "picture", "url", "src", "image"]) {
    const val = parsedConfig[urlKey];
    if (
      typeof val === "string" &&
      (val.startsWith("http://") ||
        val.startsWith("https://") ||
        val.startsWith("data:image/") ||
        val.startsWith("blob:") ||
        val.startsWith("/"))
    ) {
      return val;
    }
  }

  const style = detectAvatarStyle(parsedConfig);
  if (!style) return null;
  const seed =
    typeof parsedConfig["seed"] === "string" && parsedConfig["seed"]
      ? parsedConfig["seed"]
      : seedFallback;
  try {
    return renderAvatarDataUri(style, seed, parsedConfig, size);
  } catch (err) {
    console.error("Failed to render avatar data URI:", err);
    return null;
  }
}

export function getOptionDescriptor(key: string): Descriptor {
  return new OptionsDescriptor(getStyle(key)).toJSON();
}

const stylePreviewCache = new Map<string, string>();

export function getStylePreview(key: string): string {
  const cached = stylePreviewCache.get(key);
  if (cached) return cached;
  const uri = renderAvatarDataUri(key, "spun-default", {}, 128);
  stylePreviewCache.set(key, uri);
  return uri;
}

// Pre-warm the cache for all 17 styles
try {
  for (const item of AVATAR_STYLES) {
    if (!stylePreviewCache.has(item.key)) {
      stylePreviewCache.set(item.key, renderAvatarDataUri(item.key, "spun-default", {}, 128));
    }
  }
} catch {
  // Ignored in SSR or test runs
}

const excludedKeys = new Set([
  // Core DiceBear transform options — never user-facing
  "seed",
  "size",
  "flip",
  "scale",
  "borderRadius",
  "rotate",
  "translateX",
  "translateY",
  "idRandomization",
  "title",
  "fontFamily",
  "fontWeight",
  "tags",
  // Anatomy internals — natural colours, not user-editable
  "scleraColor",
  "toothColor",
  "teethColor",
  "tongueColor",
  "throatColor",
  "uvulaColor",
  "eyeWhitesColor",
  "eyeballColor",
  "lipColor",
  "nailColor",
  "gumColor",
]);

export function visibleOptionEntries(descriptor: Descriptor): Array<[string, FieldDescriptor]> {
  return Object.entries(descriptor).filter(([key]) => {
    if (excludedKeys.has(key)) return false;
    if (/Fill$|FillStops$|Angle$|Probability$|Order$/.test(key)) return false;
    return true;
  });
}

/** Turn an internal option value into a human-readable label.
 *  "variant01" → "1", "short01" → "Short 1", "longHair" → "Long Hair" */
export function valueLabel(value: string): string {
  // Pure variant index: variant01, variant23 etc.
  if (/^variant\d+$/i.test(value)) {
    return String(parseInt(value.replace(/^variant/i, ""), 10));
  }
  // Split camelCase and digits, then titleize
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d+)/g, "$1 $2")
    .replace(/(\d+)([a-zA-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// Skin tones — light to deep, 12 steps
export const SKIN_PALETTE = [
  "#FDDBB4",
  "#F5C99A",
  "#EDB98A",
  "#D4A574",
  "#C68642",
  "#A0522D",
  "#8B6343",
  "#6B3A2A",
  "#4A2511",
  "#3B1A0A",
  "#2D1208",
  "#1A0A05",
];

// Hair colours — dark to light, with fantasy accents
export const HAIR_PALETTE = [
  "#000000",
  "#1A1A1A",
  "#2C1A0E",
  "#4A2F1C",
  "#6B3A2A",
  "#8B6343",
  "#A0522D",
  "#C68642",
  "#D4A574",
  "#E8D5B0",
  "#FFFFFF",
  "#F59E0B",
  "#9B59B6",
  "#1ABC9C",
];

// General palette — true black, pure white, Spün amber anchor, neutrals, semantic accents
export const GENERAL_PALETTE = [
  "#000000",
  "#FFFFFF",
  "#333333",
  "#F59E0B",
  "#F7AE32",
  "#C98209",
  "#4ADE80",
  "#60A5FA",
  "#9B59B6",
  "#E24945",
  "#1ABC9C",
  "#E8D5B0",
];

// Background palette — rich, varied, Spün-aesthetic
export const BACKGROUND_PALETTE = [
  "#030303",
  "#000000",
  "#FFFFFF",
  "#0F0F0F",
  "#1A1A1A",
  "#291E0D",
  "#3D2B0A",
  "#4A3B32",
  "#1A2A1A",
  "#0A1A2A",
  "#1A0A2A",
  "#2A1A0A",
  "#F59E0B",
  "#C98209",
  "#4ADE80",
  "#60A5FA",
];

export const OPTIONAL_FEATURES = new Set([
  "rearhair",
  "rear_hair",
  "beard",
  "facialhair",
  "facial",
  "moustache",
  "mustache",
  "glasses",
  "sunglasses",
  "hat",
  "cap",
  "accessories",
  "accessory",
  "earrings",
  "necklace",
  "piercing",
  "tattoo",
  "mask",
  "gesture",
  "gestures",
]);

export const CORE_FEATURES = new Set([
  "head",
  "hair",
  "eyes",
  "eye",
  "nose",
  "mouth",
  "lips",
  "ears",
  "ear",
  "eyebrows",
  "eyebrow",
  "body",
  "face",
  "skin",
  "background",
  "clothing",
  "shirt",
]);

export function isOptionalFeature(feature: string): boolean {
  return OPTIONAL_FEATURES.has(feature.toLowerCase());
}

export const FEATURE_ORDER = [
  "skin",
  "head",
  "hair",
  "rearhair",
  "ears",
  "ear",
  "eyebrows",
  "eyebrow",
  "eyes",
  "eye",
  "nose",
  "mouth",
  "lips",
  "beard",
  "facialhair",
  "facial",
  "moustache",
  "mustache",
  "glasses",
  "sunglasses",
  "hat",
  "cap",
  "accessories",
  "accessory",
  "earrings",
  "necklace",
  "body",
  "clothing",
  "shirt",
  "gesture",
  "gestures",
  "background",
];

export function featureNameFromOption(optionKey: string): string {
  const clean = optionKey.replace(/(Variant|Color|Probability)$/, "").toLowerCase();
  if (clean === "base") return "skin";
  if (clean === "clothes") return "clothing";
  if (clean === "shirt") return "clothing";
  return clean;
}

export function getProbabilityKey(optionKey: string, descriptor: Descriptor): string | null {
  const prefix = optionKey.replace(/Variant$/, "");
  const candidate = `${prefix}Probability`;
  if (descriptor[candidate]) return candidate;
  for (const k of Object.keys(descriptor)) {
    if (k.toLowerCase() === candidate.toLowerCase()) return k;
  }
  return null;
}

export function paletteFor(key: string): string[] {
  const lower = key.toLowerCase();
  if (lower.includes("skin") || lower === "basecolor" || lower.startsWith("base"))
    return SKIN_PALETTE;
  if (lower.includes("hair")) return HAIR_PALETTE;
  if (lower.includes("background")) return BACKGROUND_PALETTE;
  return GENERAL_PALETTE;
}
