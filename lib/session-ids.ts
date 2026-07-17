/** Generic helpers for live-session features (Nuvem de Palavras, Quiz ao Vivo, ...).
 * Nothing here is specific to any one feature's domain. */

/** Short, URL-friendly id. Not a secret — only needs to avoid collisions,
 * which the caller should retry on (PRIMARY KEY conflict). */
export function generateSessionId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

/** Long random secret for host/results access tokens and participant ids. */
export function generateToken(): string {
  return crypto.randomUUID();
}

/** Matches a crypto.randomUUID() (with or without dashes stripped by callers). */
export const PARTICIPANT_ID_RE = /^[0-9a-f-]{20,40}$/i;
