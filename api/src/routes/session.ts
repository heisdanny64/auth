import { createSupabaseAdmin } from "../lib/supabase";
import { getSessionToken, setSessionCookie } from "../lib/cookie";
import type { Env } from "../index";

export async function handleSession(request: Request, env: Env): Promise<Response> {
  const token = getSessionToken(request);
  if (!token) return json({ valid: false });

  const supabase = createSupabaseAdmin(env);

  // Validate the token against Supabase
  const { data, error } = await supabase.auth.admin.getUserById(token);
  if (error || !data?.user) return json({ valid: false });

  const userId = data.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) return json({ valid: false });

  // Slide the cookie expiry
  const body = json({
    valid: true,
    user: {
      user_id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      avatar_url: `https://sso.byspun.xyz/api/avatar/${profile.id}`,
    },
  });

  return setSessionCookie(body, token);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
