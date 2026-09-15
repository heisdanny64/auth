import { createSupabaseAdmin } from "../lib/supabase";
import { setSessionCookie } from "../lib/cookie";
import type { Env } from "../index";

export async function handleComplete(request: Request, env: Env): Promise<Response> {
  // The SPA sends the Supabase access token in the Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const accessToken = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseAdmin(env);

  // Verify the Supabase session
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);

  const userId = userData.user.id;

  let body: {
    handle?: string;
    display_name?: string;
    avatar_config?: Record<string, unknown> | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const { handle, display_name, avatar_config } = body;
  if (!handle || !display_name) return json({ error: "missing_fields" }, 400);

  // Validate handle format
  if (!/^[a-z0-9_]{4,}$/.test(handle)) {
    return json({ error: "invalid_handle" }, 400);
  }

  // Upsert profile
  const { error: upsertError } = await supabase.from("profiles").upsert({
    id: userId,
    handle,
    display_name,
    avatar_config: avatar_config ?? null,
  });

  if (upsertError) return json({ error: upsertError.message }, 500);

  // Set the .byspun.xyz session cookie using the user ID as the session token
  const response = json({ success: true });
  return setSessionCookie(response, userId);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
