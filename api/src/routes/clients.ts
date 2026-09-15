import { createSupabaseAdmin } from "../lib/supabase";
import { generateClientSecret, hashSecret, slugifyClientId } from "../lib/crypto";
import type { Env } from "../index";

function requireAdmin(request: Request, env: Env): boolean {
  return request.headers.get("x-spun-admin-key") === env.ADMIN_API_KEY;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// POST /api/clients — register a new OAuth client
export async function handleCreateClient(request: Request, env: Env): Promise<Response> {
  if (!requireAdmin(request, env)) return json({ error: "unauthorized" }, 401);

  let body: {
    name?: string;
    allowed_redirect_uris?: string[];
    logo_url?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { name, allowed_redirect_uris, logo_url } = body;
  if (!name || !allowed_redirect_uris?.length) {
    return json({ error: "missing_fields" }, 400);
  }

  const clientId = slugifyClientId(name);
  const plainSecret = generateClientSecret();
  const hashedSecret = await hashSecret(plainSecret);

  const supabase = createSupabaseAdmin(env);
  const { error } = await supabase.from("oauth_clients").insert({
    client_id: clientId,
    client_secret: hashedSecret,
    name,
    allowed_redirect_uris,
    logo_url: logo_url ?? null,
  });

  if (error) return json({ error: error.message }, 500);

  // client_secret returned once only
  return json({ client_id: clientId, client_secret: plainSecret, name });
}

// GET /api/clients — list all clients (never returns client_secret)
export async function handleListClients(request: Request, env: Env): Promise<Response> {
  if (!requireAdmin(request, env)) return json({ error: "unauthorized" }, 401);

  const supabase = createSupabaseAdmin(env);
  const { data, error } = await supabase
    .from("oauth_clients")
    .select("id, client_id, name, allowed_redirect_uris, logo_url, created_at")
    .order("created_at", { ascending: false });

  if (error) return json({ error: error.message }, 500);
  return json(data);
}

// GET /api/clients/:id — get single client
export async function handleGetClient(request: Request, env: Env, clientId: string): Promise<Response> {
  if (!requireAdmin(request, env)) return json({ error: "unauthorized" }, 401);

  const supabase = createSupabaseAdmin(env);
  const { data, error } = await supabase
    .from("oauth_clients")
    .select("id, client_id, name, allowed_redirect_uris, logo_url, created_at")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !data) return json({ error: "not_found" }, 404);
  return json(data);
}

// PATCH /api/clients/:id — update client
export async function handleUpdateClient(request: Request, env: Env, clientId: string): Promise<Response> {
  if (!requireAdmin(request, env)) return json({ error: "unauthorized" }, 401);

  let body: {
    name?: string;
    allowed_redirect_uris?: string[];
    logo_url?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates["name"] = body.name;
  if (body.allowed_redirect_uris !== undefined) updates["allowed_redirect_uris"] = body.allowed_redirect_uris;
  if (body.logo_url !== undefined) updates["logo_url"] = body.logo_url;

  if (Object.keys(updates).length === 0) return json({ error: "no_fields" }, 400);

  const supabase = createSupabaseAdmin(env);
  const { error } = await supabase
    .from("oauth_clients")
    .update(updates)
    .eq("client_id", clientId);

  if (error) return json({ error: error.message }, 500);
  return json({ success: true });
}

// DELETE /api/clients/:id — remove client
export async function handleDeleteClient(request: Request, env: Env, clientId: string): Promise<Response> {
  if (!requireAdmin(request, env)) return json({ error: "unauthorized" }, 401);

  const supabase = createSupabaseAdmin(env);
  const { error } = await supabase
    .from("oauth_clients")
    .delete()
    .eq("client_id", clientId);

  if (error) return json({ error: error.message }, 500);
  return json({ success: true });
}

// POST /api/clients/:id/rotate-secret — rotate client secret
export async function handleRotateSecret(request: Request, env: Env, clientId: string): Promise<Response> {
  if (!requireAdmin(request, env)) return json({ error: "unauthorized" }, 401);

  const plainSecret = generateClientSecret();
  const hashedSecret = await hashSecret(plainSecret);

  const supabase = createSupabaseAdmin(env);
  const { error } = await supabase
    .from("oauth_clients")
    .update({ client_secret: hashedSecret })
    .eq("client_id", clientId);

  if (error) return json({ error: error.message }, 500);
  return json({ client_secret: plainSecret });
}
