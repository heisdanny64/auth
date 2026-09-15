import { createSupabaseAdmin } from "../lib/supabase";
import { generateAvatarSvg } from "../lib/dicebear";
import type { Env } from "../index";

export async function handleAvatar(request: Request, env: Env, userId: string): Promise<Response> {
  if (!userId) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = createSupabaseAdmin(env);

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("handle, avatar_config")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    return new Response("Not found", { status: 404 });
  }

  const svg = await generateAvatarSvg(
    profile.avatar_config as Record<string, unknown> | null,
    profile.handle ?? userId,
  );

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
