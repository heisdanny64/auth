const COOKIE_NAME = "spun_session";
const MAX_AGE = 60 * 60 * 24 * 365; // 365 days

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((pair) => {
      const [key, ...rest] = pair.trim().split("=");
      return [key.trim(), decodeURIComponent(rest.join("="))];
    }),
  );
}

export function getSessionToken(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  return cookies[COOKIE_NAME] ?? null;
}

export function setSessionCookie(response: Response, token: string): Response {
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Domain=.byspun.xyz; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
  );
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Domain=.byspun.xyz; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
