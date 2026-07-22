// Reproduces the client-side hash used by front/: SHA-256 of the lowercased,
// trimmed nickname, first 16 hex chars. See backend/ANALYTICS.md.

export async function hashNick(nick: string): Promise<string> {
  const normalized = nick.trim().toLowerCase();
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 16);
}
