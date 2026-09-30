/**
 * Set at build time (see server/README.md). Without them the app runs as the free version and the Lesen page says
 * activation is not available yet; nothing is guessed and no key is shipped by default.
 */
function parseKey(text: string | undefined): JsonWebKey | null {
  if (!text) return null;
  try {
    const k = JSON.parse(text) as JsonWebKey;
    return k && k.kty === 'EC' && k.crv === 'P-256' && k.d === undefined ? k : null;
  } catch {
    return null;
  }
}

export const LICENSE_PUBLIC_KEY: JsonWebKey | null = parseKey(import.meta.env.VITE_LICENSE_PUBLIC_KEY);
export const LICENSE_API_URL: string | null = import.meta.env.VITE_LICENSE_API_URL || null;
export const BUY_URL: string | null = import.meta.env.VITE_BUY_URL || null;
