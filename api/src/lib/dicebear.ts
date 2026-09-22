import { Avatar, Style } from "@dicebear/core";
import adventurer from "@dicebear/styles/adventurer.json";
import avataaars from "@dicebear/styles/avataaars.json";
import bigEars from "@dicebear/styles/big-ears.json";
import bigSmile from "@dicebear/styles/big-smile.json";
import bottts from "@dicebear/styles/bottts.json";
import croodles from "@dicebear/styles/croodles.json";
import dylan from "@dicebear/styles/dylan.json";
import initialFace from "@dicebear/styles/initial-face.json";
import initials from "@dicebear/styles/initials.json";
import lorelei from "@dicebear/styles/lorelei.json";
import micah from "@dicebear/styles/micah.json";
import miniavs from "@dicebear/styles/miniavs.json";
import notionists from "@dicebear/styles/notionists.json";
import openPeeps from "@dicebear/styles/open-peeps.json";
import personas from "@dicebear/styles/personas.json";
import pixelArt from "@dicebear/styles/pixel-art.json";
import toonHead from "@dicebear/styles/toon-head.json";

type StyleDefinition = Record<string, unknown>;

const definitions: Record<string, StyleDefinition> = {
  adventurer: adventurer as StyleDefinition,
  avataaars: avataaars as StyleDefinition,
  "big-ears": bigEars as StyleDefinition,
  "big-smile": bigSmile as StyleDefinition,
  bottts: bottts as StyleDefinition,
  croodles: croodles as StyleDefinition,
  dylan: dylan as StyleDefinition,
  "initial-face": initialFace as StyleDefinition,
  initials: initials as StyleDefinition,
  lorelei: lorelei as StyleDefinition,
  micah: micah as StyleDefinition,
  miniavs: miniavs as StyleDefinition,
  notionists: notionists as StyleDefinition,
  "open-peeps": openPeeps as StyleDefinition,
  personas: personas as StyleDefinition,
  "pixel-art": pixelArt as StyleDefinition,
  "toon-head": toonHead as StyleDefinition,
};

const styleCache = new Map<string, Style<StyleDefinition>>();

function getStyle(key: string): Style<StyleDefinition> {
  const cached = styleCache.get(key);
  if (cached) return cached;
  const definition = definitions[key] ?? definitions["initials"];
  const style = new Style(definition);
  styleCache.set(key, style);
  return style;
}

function detectStyle(config: Record<string, unknown>): string {
  if (typeof config["style"] === "string" && config["style"].trim()) {
    return config["style"].trim();
  }
  return "initials";
}

export function generateAvatarSvg(
  config: Record<string, unknown> | null,
  seed: string,
): string {
  const styleName = config ? detectStyle(config) : "initials";
  const style = getStyle(styleName);

  // Strip non-avatar keys so DiceBear's strict validator doesn't throw
  const cleaned: Record<string, unknown> = { seed };
  if (config) {
    for (const [key, value] of Object.entries(config)) {
      if (key === "style" || key === "seed" || value === null || value === undefined || value === "") {
        continue;
      }
      cleaned[key] = value;
    }
  }

  const avatar = new Avatar(style, cleaned);
  return avatar.toString();
}
