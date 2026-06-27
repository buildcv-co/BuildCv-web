import { BACKEND_URL } from "@/lib/api/backend";

/**
 * Auth adapter — typed port que el BFF (y los hooks server-side de NextAuth)
 * usan para hablar con el backend de auth.
 *
 * Contrato (spec 009-auth-web §3.3, frozen con PR0 backend):
 *   POST `${BACKEND_URL}/api/v1/auth/web-signup`
 *   Header: `X-BFF-Key: process.env.BFF_API_KEY`
 *   Body:   `{ provider, providerAccountId, email, name }`
 *   200 → `{ userId }`
 *
 * **Server-side ONLY.** El browser nunca debe importar este módulo: usa
 * `app/api/auth/web-signup/route.ts` (BFF) como único punto de contacto.
 *
 * **Fail-closed:** si `BFF_API_KEY` no está configurado, NO se emite
 * request y se lanza `AuthAdapterError(500, "BFF_AUTH_NOT_CONFIGURED")`.
 * Esto preserva Constitution Art. VI (no secrets en cliente, no
 * requests anónimos al backend).
 */

export interface WebSignupRequest {
  provider: "google" | "linkedin";
  providerAccountId: string;
  email: string;
  name: string;
}

export interface WebSignupResponse {
  userId: string;
}

export class AuthAdapterError extends Error {
  public readonly status: number;
  public readonly detail: string;

  constructor(status: number, detail: string) {
    super(`Auth adapter error (status=${status}): ${detail}`);
    this.name = "AuthAdapterError";
    this.status = status;
    this.detail = detail;
  }
}

const DEFAULT_TIMEOUT_MS = 5_000;

export async function registerWithBackend(
  req: WebSignupRequest,
): Promise<WebSignupResponse> {
  const bffKey = process.env.BFF_API_KEY;
  if (!bffKey || bffKey.length === 0) {
    throw new AuthAdapterError(500, "BFF_AUTH_NOT_CONFIGURED");
  }

  const url = `${BACKEND_URL}/api/v1/auth/web-signup`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-BFF-Key": bffKey,
      },
      body: JSON.stringify({
        provider: req.provider,
        providerAccountId: req.providerAccountId,
        email: req.email,
        name: req.name,
      }),
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
    throw new AuthAdapterError(503, `Network error: ${reason}`);
  }
  clearTimeout(timer);

  if (response.ok) {
    const data = (await response.json()) as { userId?: string };
    if (!data.userId) {
      throw new AuthAdapterError(502, "Backend returned no userId");
    }
    return { userId: data.userId };
  }

  let detail = `Backend error status=${response.status}`;
  try {
    const problem = (await response.json()) as { detail?: string; title?: string };
    if (problem.detail ?? problem.title) {
      detail = (problem.detail ?? problem.title) as string;
    }
  } catch {
    // respuesta sin cuerpo JSON; mantenemos el detail genérico
  }

  const mappedStatus = response.status >= 500 ? 502 : response.status;
  throw new AuthAdapterError(mappedStatus, detail);
}