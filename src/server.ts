import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

async function handleApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/authorize-client" && request.method === "GET") {
    const clientId = url.searchParams.get("clientId");
    const redirectUri = url.searchParams.get("redirectUri");

    if (!clientId || !redirectUri) {
      return new Response(JSON.stringify({ error: "Missing clientId or redirectUri" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    try {
      const { supabaseAdmin } = await import("./integrations/supabase/client.server");
      const { data: rawClient, error } = await supabaseAdmin
        .from("oauth_clients")
        .select("name, logo_url, allowed_redirect_uris")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error || !rawClient) {
        return new Response(JSON.stringify({ error: "Client not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }

      const allowedUris = Array.isArray(rawClient.allowed_redirect_uris)
        ? rawClient.allowed_redirect_uris
        : [];

      if (!allowedUris.includes(redirectUri)) {
        return new Response(JSON.stringify({ error: "Redirect URI not allowed" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ name: rawClient.name, logoUrl: rawClient.logo_url ?? null }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  if (url.pathname === "/api/issue-auth-code" && request.method === "POST") {
    try {
      const body = (await request.json()) as {
        code?: string;
        clientId?: string;
        redirectUri?: string;
        userId?: string;
        state?: string | null;
      };

      if (!body.clientId || !body.redirectUri || !body.userId) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      const { supabaseAdmin } = await import("./integrations/supabase/client.server");

      // Verify client and redirectUri
      const { data: rawClient, error: clientError } = await supabaseAdmin
        .from("oauth_clients")
        .select("allowed_redirect_uris")
        .eq("client_id", body.clientId)
        .maybeSingle();

      const uris = Array.isArray(rawClient?.allowed_redirect_uris)
        ? rawClient.allowed_redirect_uris
        : [];

      if (clientError || !rawClient || !uris.includes(body.redirectUri)) {
        return new Response(JSON.stringify({ error: "Invalid client or redirect URI" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }

      const code = body.code || crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin.from("auth_codes").insert({
        code,
        user_id: body.userId,
        client_id: body.clientId,
        redirect_uri: body.redirectUri,
        state: body.state ?? null,
      });

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ code }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        },
      );
    }
  }

  return null;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const apiResponse = await handleApiRequest(request);
      if (apiResponse) {
        return apiResponse;
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
