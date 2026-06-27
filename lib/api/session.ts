/**
 * Helpers client-side para la sesión de auth (009-auth-web PR2).
 *
 * Estos helpers son invocables desde el cliente (browser) y SIEMPRE
 * hablan con el BFF same-origin `/api/auth/session`. NUNCA con el
 * backend directo (Constitution Art. VI / CR-TOK-1: tokens nunca
 * tocan el cliente).
 *
 * - `getSession()` lee la sesión actual desde el BFF (devuelve null
 *   si no hay sesión — anon viewer).
 * - `refreshSession()` fuerza un fresh fetch (sin cache) para obtener
 *   un payload actualizado. Lanza `SessionExpiredError` si el backend
 *   devuelve 401 (NO retries infinitos — NFR-RES-1).
 *
 * Path canonical: `/api/auth/session` (NO `/session` legacy).
 */

export interface SessionInfo {
  user: { id: string; email: string; name: string };
  expiresAt: string;
}

export class SessionExpiredError extends Error {
  public readonly status: number;

  constructor(status: number, detail?: string) {
    super(`Session expired (status=${status})${detail ? `: ${detail}` : ""}`);
    this.name = "SessionExpiredError";
    this.status = status;
  }
}

const SESSION_BFF_PATH = "/api/auth/session";

function isSessionInfo(value: unknown): value is SessionInfo {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.expiresAt !== "string") return false;
  if (typeof v.user !== "object" || v.user === null) return false;
  const u = v.user as Record<string, unknown>;
  if (typeof u.id !== "string") return false;
  if (typeof u.email !== "string") return false;
  if (typeof u.name !== "string") return false;
  return true;
}

export async function getSession(): Promise<SessionInfo | null> {
  const response = await fetch(SESSION_BFF_PATH, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new SessionExpiredError(response.status, `BFF ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isSessionInfo(data)) {
    throw new SessionExpiredError(502, "Malformed BFF response");
  }
  return data;
}

/**
 * Fuerza un fresh fetch a `/api/auth/session`. Usado después de un
 * 401 del BFF para invalidar el cache BFF server-side y re-exchanges
 * el NextAuth JWT por un nuevo backend JWT. NO retries infinitos
 * (NFR-RES-1): si la BFF devuelve 401, propagamos `SessionExpiredError`.
 */
export async function refreshSession(): Promise<SessionInfo> {
  const response = await fetch(`${SESSION_BFF_PATH}?ts=${Date.now()}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new SessionExpiredError(401, "Session expired");
  }
  if (!response.ok) {
    throw new SessionExpiredError(response.status, `BFF ${response.status}`);
  }

  const data: unknown = await response.json();
  if (!isSessionInfo(data)) {
    throw new SessionExpiredError(502, "Malformed BFF response");
  }
  return data;
}
