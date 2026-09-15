import { createSupabaseAdmin } from "../lib/supabase";
import { verifySecret } from "../lib/crypto";
import type { Env } from "../index";

export async function handleToken(request: Request, env: Env): Promise<Response> {
  let body: { code?: string; client_id?: string; client_secret?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { code, client_id, client_secret } = body;
  if (!code || !client_id || !client_secret) {
    return json({ error: "invalid_request" }, 400);
  }

  const supabase = createSupabaseAdmin(env);

  // Look up the auth code
  const { data: authCode, error: codeError } = await supabase
    .from("auth_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (codeError || !authCode) return json({ error: "invalid_code" }, 400);
  if (authCode.used) return json({ error: "code_used" }, 400);
  if (new Date(authCode.expires_at) < new Date()) return json({ error: "code_expired" }, 400);
  if (authCode.client_id !== client_id) return json({ error: "client_mismatch" }, 401);

  // Verify client secret
  const { data: client, error: clientError } = await supabase
    .from("oauth_clients")
    .select("client_secret, name")
    .eq("client_id", client_id)
    .maybeSingle();

  if (clientError || !client) return json({ error: "invalid_client" }, 401);

  const secretValid = await verifySecret(client_secret, client.client_secret);
  if (!secretValid) return json({ error: "invalid_client" }, 401);

  // Burn the code immediately
  await supabase.from("auth_codes").update({ used: true }).eq("code", code);

  // Fetch the user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, handle, display_name")
    .eq("id", authCode.user_id)
    .maybeSingle();

  if (profileError || !profile) return json({ error: "user_not_found" }, 404);

  // Fetch email from auth.users via admin API
  const { data: userData } = await supabase.auth.admin.getUserById(authCode.user_id);

  return json({
    user_id: profile.id,
    handle: profile.handle,
    display_name: profile.display_name,
    avatar_url: `https://sso.byspun.xyz/api/avatar/${profile.id}`,
    email: userData?.user?.email ?? null,
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
