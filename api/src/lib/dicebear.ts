// Server-side DiceBear SVG generation for GET /api/avatar/:user_id.
// Dynamically imports styles to keep the Worker bundle lean — only the
// requested style is loaded per request.

type AvatarConfig = {
  style: string;
  seed?: string;
  options?: Record<string, unknown>;
};

const STYLE_MODULES: Record<string, () => Promise<{ default: unknown }>> = {
  adventurer: () => import("@dicebear/styles/adventurer.json"),
  avataaars: () => import("@dicebear/styles/avataaars.json"),
  "big-ears": () => import("@dicebear/styles/big-ears.json"),
  "big-smile": () => import("@dicebear/styles/big-smile.json"),
  bottts: () => import("@dicebear/styles/bottts.json"),
  croodles: () => import("@dicebear/styles/croodles.json"),
  dylan: () => import("@dicebear/styles/dylan.json"),
  "initial-face": () => import("@dicebear/styles/initial-face.json"),
  initials: () => import("@dicebear/styles/initials.json"),
  lorelei: () => import("@dicebear/styles/lorelei.json"),
  micah: () => import("@dicebear/styles/micah.json"),
  miniavs: () => import("@dicebear/styles/miniavs.json"),
  notionists: () => import("@dicebear/styles/notionists.json"),
  "open-peeps": () => import("@dicebear/styles/open-peeps.json"),
  personas: () => import("@dicebear/styles/personas.json"),
  "pixel-art": () => import("@dicebear/styles/pixel-art.json"),
  "toon-head": () => import("@dicebear/styles/toon-head.json"),
};

export async function generateAvatarSvg(config: AvatarConfig | null, seed: string): Promise<string> {
  const { createAvatar, Style } = await import("@dicebear/core");

  const styleName = config?.style ?? "initials";
  const loader = STYLE_MODULES[styleName] ?? STYLE_MODULES["initials"];
  const styleModule = await loader();

  const avatar = createAvatar(styleModule.default as Style<Record<string, unknown>>, {
    seed: config?.seed ?? seed,
    ...(config?.options ?? {}),
  });

  return avatar.toString();
}
