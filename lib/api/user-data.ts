import { getJwtFromSession } from "@/lib/api/jwt";
import { BACKEND_URL } from "@/lib/api/backend";
import { parseRetryAfter } from "@/lib/api/_utils";

/**
 * Typed port para los datos del usuario autenticado (009-auth-web PR4).
 *
 * Contrato congelado en spec §3.3:
 *   GET `${BACKEND_URL}/api/v1/user/data`
 *   Header: `Authorization: Bearer <backend-jwt>` (vía getJwtFromSession cache BFF)
 *   200 → `UserDataResponse`
 *   429 → throws `RateLimitError` con `retryAfter: Date` parseado (NFR-RATE-1)
 *
 * **Server-side ONLY.** El browser nunca debe importar este módulo:
 * usa `app/api/user/data/route.ts` (BFF) como único punto de contacto.
 *
 * **NO expone tokens al cliente** (Constitution Art. VI + CR-TOK-1):
 * el header `Authorization: Bearer` se agrega server-side desde el cache
 * BFF (`lib/api/jwt.ts`); el cuerpo de respuesta solo trae los datos
 * del usuario, no el JWT backend ni el refresh token.
 *
 * **NO loguea PII** (Constitution Art. III / NFR-OBS-1): los errores se
 * exponen con clases tipadas (`RateLimitError`, `UserDataError`) y los
 * handlers aguas arriba deciden qué loguear.
 *
 * Path canonical: `/api/v1/user/data` (NO `/user/data/consent` — eso es PR5).
 */

export interface UserDataResponse {
  userId: string;
  provider: "google" | "linkedin";
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
}

export class RateLimitError extends Error {
  public readonly retryAfter: Date | null;
  public readonly detail: string;

  constructor(retryAfter: Date | null, detail: string) {
    super(`Rate limit exceeded (retryAfter=${retryAfter?.toISOString() ?? "unknown"}): ${detail}`);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.detail = detail;
  }
}

export class UserDataError extends Error {
  public readonly status: number;
  public readonly detail: string;

  constructor(status: number, detail: string) {
    super(`User data error (status=${status}): ${detail}`);
    this.name = "UserDataError";
    this.status = status;
    this.detail = detail;
  }
}

const DEFAULT_TIMEOUT_MS = 5_000;

export async function getUserData(): Promise<UserDataResponse> {
  const session = await getJwtFromSession();
  if (!session) {
    throw new UserDataError(401, "No session");
  }

  const url = `${BACKEND_URL}/api/v1/user/data`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${session.jwt}` },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? "Backend timeout"
        : err instanceof Error
          ? err.message
          : "Network error";
    throw new UserDataError(503, `Network error: ${reason}`);
  }
  clearTimeout(timer);

  if (response.status === 429) {
    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    let detail = `Backend error status=429`;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      if (problem.detail ?? problem.title) {
        detail = (problem.detail ?? problem.title) as string;
      }
    } catch {
      // respuesta sin cuerpo JSON; mantenemos el detail genérico
    }
    throw new RateLimitError(retryAfter, detail);
  }

  if (!response.ok) {
    let detail = `Backend error status=${response.status}`;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      if (problem.detail ?? problem.title) {
        detail = (problem.detail ?? problem.title) as string;
      }
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw new UserDataError(response.status, detail);
  }

  const data = (await response.json()) as Partial<UserDataResponse>;
  if (
    typeof data.userId !== "string" ||
    typeof data.provider !== "string" ||
    typeof data.email !== "string" ||
    typeof data.name !== "string" ||
    typeof data.createdAt !== "string" ||
    typeof data.lastLoginAt !== "string"
  ) {
    throw new UserDataError(502, "Malformed UserDataResponse");
  }
  if (data.provider !== "google" && data.provider !== "linkedin") {
    throw new UserDataError(502, `Unexpected provider: ${data.provider}`);
  }
  return {
    userId: data.userId,
    provider: data.provider,
    email: data.email,
    name: data.name,
    createdAt: data.createdAt,
    lastLoginAt: data.lastLoginAt,
  };
}