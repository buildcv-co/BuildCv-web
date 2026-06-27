import { getJwtFromSession } from "@/lib/api/jwt";
import { BACKEND_URL } from "@/lib/api/backend";
import { parseRetryAfter } from "@/lib/api/_utils";

/**
 * Typed port para los datos del usuario autenticado (009-auth-web PR4 + PR6).
 *
 * Contrato congelado en spec §3.3:
 *   GET    `${BACKEND_URL}/api/v1/user/data`  → `UserDataResponse`
 *   PUT    `${BACKEND_URL}/api/v1/user/data`  → `UserDataResponse` (rectify)
 *   DELETE `${BACKEND_URL}/api/v1/user/data`  → `{ message: string }` (cancel)
 *   Header: `Authorization: Bearer <backend-jwt>` (vía getJwtFromSession cache BFF)
 *   429 → throws `RateLimitError` con `retryAfter: Date` parseado (NFR-RATE-1)
 *   400 → throws `ValidationError` con detail del backend (PR6 T-PR6-002)
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
 * exponen con clases tipadas (`RateLimitError`, `UserDataError`,
 * `ValidationError`) y los handlers aguas arriba deciden qué loguear.
 *
 * Path canonical: `/api/v1/user/data` (NO `/user/data/consent` — eso es PR5,
 * NO `/arco/*` — eso es legacy según R-ENDPOINT-DRIFT #5-7).
 */

export interface UserDataResponse {
  userId: string;
  provider: "google" | "linkedin";
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface RectifyPayload {
  name?: string;
  email?: string;
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

export class ValidationError extends Error {
  public readonly status: 400;
  public readonly detail: string;

  constructor(detail: string) {
    super(`Validation error (status=400): ${detail}`);
    this.name = "ValidationError";
    this.status = 400;
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
  const response = await fetchWithBackendAuth(url, { method: "GET" }, session.jwt);
  await throwIfUserDataError(response);
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

export async function rectifyUserData(
  payload: RectifyPayload,
): Promise<UserDataResponse> {
  const session = await getJwtFromSession();
  if (!session) {
    throw new UserDataError(401, "No session");
  }

  const url = `${BACKEND_URL}/api/v1/user/data`;
  const response = await fetchWithBackendAuth(
    url,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
    session.jwt,
  );
  await throwIfUserDataError(response);

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

export async function deleteUserData(): Promise<{ message: string }> {
  const session = await getJwtFromSession();
  if (!session) {
    throw new UserDataError(401, "No session");
  }

  const url = `${BACKEND_URL}/api/v1/user/data`;
  const response = await fetchWithBackendAuth(url, { method: "DELETE" }, session.jwt);
  await throwIfUserDataError(response);

  const data = (await response.json()) as { message?: unknown };
  if (typeof data.message !== "string") {
    throw new UserDataError(502, "Malformed delete response");
  }
  return { message: data.message };
}

async function fetchWithBackendAuth(
  url: string,
  init: RequestInit,
  jwt: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    const reason =
      err instanceof Error && err.name === "AbortError"
        ? "Backend timeout"
        : err instanceof Error
          ? err.message
          : "Network error";
    throw new UserDataError(503, `Network error: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

async function throwIfUserDataError(response: Response): Promise<void> {
  if (response.status === 429) {
    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    const detail = await parseBackendDetail(response, "Backend error status=429");
    throw new RateLimitError(retryAfter, detail);
  }
  if (response.status === 400) {
    const detail = await parseBackendDetail(response, "Backend validation error");
    throw new ValidationError(detail);
  }
  if (!response.ok) {
    const detail = await parseBackendDetail(response, `Backend error status=${response.status}`);
    throw new UserDataError(response.status, detail);
  }
}

async function parseBackendDetail(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const problem = (await response.json()) as { detail?: string; title?: string };
    if (problem.detail ?? problem.title) {
      return (problem.detail ?? problem.title) as string;
    }
  } catch {
    // respuesta sin cuerpo JSON; usamos fallback
  }
  return fallback;
}