import { createSupabaseAdmin } from "../lib/supabase";
import { generateCode } from "../lib/crypto";
import type { Env } from "../index";

export async function handleIssue(request: Request, env: Env): Promise<Response> {
  // Authenticated via Supabase access token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const accessToken = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseAdmin(env);

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

  const userId = userData.user.id;

  let body: {
    client_id?: string;
    redirect_uri?: string;
    state?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { client_id, redirect_uri, state } = body;
  if (!client_id || !redirect_uri) return json({ error: "missing_fields" }, 400);

  // Validate client and redirect_uri
  const { data: client, error: clientError } = await supabase
    .from("oauth_clients")
    .select("allowed_redirect_uris")
    .eq("client_id", client_id)
    .maybeSingle();

  if (clientError || !client) return json({ error: "invalid_client" }, 401);

  const allowed = Array.isArray(client.allowed_redirect_uris) ? client.allowed_redirect_uris : [];
  if (!allowed.includes(redirect_uri)) return json({ error: "redirect_uri_not_allowed" }, 403);

  // Verify the user has a completed profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return json({ error: "profile_not_found" }, 404);

  // Mint the code
  const code = generateCode();
  const { error: insertError } = await supabase.from("auth_codes").insert({
    code,
    user_id: userId,
    client_id,
    redirect_uri,
    state: state ?? null,
  });

  if (insertError) return json({ error: insertError.message }, 500);

  return json({ code });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
