/** Generate a cryptographically random authorization code. */
export function generateCode(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generate a client secret with a spun_sk_ prefix. */
export function generateClientSecret(): string {
  return `spun_sk_${generateCode()}`;
}

/** Hash a secret using SHA-256. Used to store client_secret safely. */
export async function hashSecret(secret: string): Promise<string> {
  const encoded = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compare a plaintext secret against a stored hash. */
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  const hashed = await hashSecret(secret);
  return hashed === hash;
}

/** Slugify a product name into a client_id. e.g. "D.Verse" → "dverse" */
export function slugifyClientId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
}
