import { createSupabaseAdmin } from "../lib/supabase";
import type { Env } from "../index";

export async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");

  if (!clientId || !redirectUri) {
    return json({ error: "missing_params" }, 400);
  }

  // Validate redirect_uri is a well-formed URL
  try {
    new URL(redirectUri);
  } catch {
    return json({ error: "invalid_redirect_uri" }, 400);
  }

  const supabase = createSupabaseAdmin(env);

  const { data: client, error } = await supabase
    .from("oauth_clients")
    .select("name, logo_url, allowed_redirect_uris")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !client) return json({ error: "client_not_found" }, 404);

  const allowedUris = Array.isArray(client.allowed_redirect_uris)
    ? client.allowed_redirect_uris
    : [];

  if (!allowedUris.includes(redirectUri)) {
    return json({ error: "redirect_uri_not_allowed" }, 403);
  }

  return json({ name: client.name, logoUrl: client.logo_url ?? null });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
