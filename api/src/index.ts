import { handleToken } from "./routes/token";
import { handleIssue } from "./routes/issue";
import { handleSession } from "./routes/session";
import { handleComplete } from "./routes/complete";
import { handleAuthorize } from "./routes/authorize";
import { handleUser } from "./routes/user";
import { handleAvatar } from "./routes/avatar";
import {
  handleCreateClient,
  handleListClients,
  handleGetClient,
  handleUpdateClient,
  handleDeleteClient,
  handleRotateSecret,
} from "./routes/clients";

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_API_KEY: string;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://sso.byspun.xyz",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Spun-Admin-Key",
  "Access-Control-Allow-Credentials": "true",
};

function cors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

function notFound(): Response {
  return new Response(JSON.stringify({ error: "not_found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    let response: Response;

    // POST /api/issue — SPA mints an auth code after user clicks Continue
    if (pathname === "/api/issue" && method === "POST") {
      response = await handleIssue(request, env);
    }
    // POST /api/token
    else if (pathname === "/api/token" && method === "POST") {
      response = await handleToken(request, env);
    }
    // POST /api/session
    else if (pathname === "/api/session" && method === "POST") {
      response = await handleSession(request, env);
    }
    // POST /api/complete
    else if (pathname === "/api/complete" && method === "POST") {
      response = await handleComplete(request, env);
    }
    // GET /api/authorize
    else if (pathname === "/api/authorize" && method === "GET") {
      response = await handleAuthorize(request, env);
    }
    // GET /api/user
    else if (pathname === "/api/user" && method === "GET") {
      response = await handleUser(request, env);
    }
    // GET /api/avatar/:user_id
    else if (pathname.startsWith("/api/avatar/") && method === "GET") {
      const userId = pathname.replace("/api/avatar/", "");
      response = await handleAvatar(request, env, userId);
    }
    // POST /api/clients — create
    else if (pathname === "/api/clients" && method === "POST") {
      response = await handleCreateClient(request, env);
    }
    // GET /api/clients — list
    else if (pathname === "/api/clients" && method === "GET") {
      response = await handleListClients(request, env);
    }
    // POST /api/clients/:id/rotate-secret
    else if (pathname.match(/^\/api\/clients\/[^/]+\/rotate-secret$/) && method === "POST") {
      const clientId = pathname.split("/")[3];
      response = await handleRotateSecret(request, env, clientId);
    }
    // GET /api/clients/:id
    else if (pathname.match(/^\/api\/clients\/[^/]+$/) && method === "GET") {
      const clientId = pathname.split("/")[3];
      response = await handleGetClient(request, env, clientId);
    }
    // PATCH /api/clients/:id
    else if (pathname.match(/^\/api\/clients\/[^/]+$/) && method === "PATCH") {
      const clientId = pathname.split("/")[3];
      response = await handleUpdateClient(request, env, clientId);
    }
    // DELETE /api/clients/:id
    else if (pathname.match(/^\/api\/clients\/[^/]+$/) && method === "DELETE") {
      const clientId = pathname.split("/")[3];
      response = await handleDeleteClient(request, env, clientId);
    }
    else {
      response = notFound();
    }

    return cors(response);
  },
};
