import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import apiWorker, { type Env } from "../../../api/src/index";

export function spunApiPlugin(): Plugin {
  const handleRequest = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || "";
    if (!url.startsWith("/api/")) {
      return next();
    }

    try {
      const host = req.headers.host || "localhost:3000";
      const protocol = (req.headers["x-forwarded-proto"] as string) || "http";
      const fullUrl = `${protocol}://${host}${url}`;

      let body: Buffer | undefined = undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        body = Buffer.concat(chunks);
      }

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue;
        if (Array.isArray(v)) {
          v.forEach((val) => headers.append(k, val));
        } else {
          headers.set(k, v);
        }
      }

      const request = new Request(fullUrl, {
        method: req.method,
        headers,
        body,
      });

      const env: Env = {
        SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        ADMIN_API_KEY: process.env.ADMIN_API_KEY || "spun-admin-secret",
      };

      const response = await apiWorker.fetch(request, env);

      res.statusCode = response.status;
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      const arrayBuffer = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("[Spun API Middleware Error]:", err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "internal_server_error" }));
    }
  };

  return {
    name: "spun-api-middleware",
    configureServer(server) {
      server.middlewares.use(handleRequest);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleRequest);
    },
  };
}
