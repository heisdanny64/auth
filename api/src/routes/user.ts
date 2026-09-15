import { createSupabaseAdmin } from "../lib/supabase";
import type { Env } from "../index";

export async function handleUser(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const token = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseAdmin(env);

  // Validate the token as a Supabase JWT
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

  const userId = userData.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) return json({ error: "user_not_found" }, 404);

  return json({
    user_id: profile.id,
    handle: profile.handle,
    display_name: profile.display_name,
    avatar_url: `https://sso.byspun.xyz/api/avatar/${profile.id}`,
    email: userData.user.email ?? null,
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
