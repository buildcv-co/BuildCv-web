import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/api/backend";
import { getJwtFromSession } from "@/lib/api/jwt";

/**
 * BFF `/api/user/data` — proxy server-side hacia el backend.
 *
 * Spec: 009-auth-web PR4 (GET) + PR6 (PUT + DELETE) +
 * REQ-FN-011 / REQ-FN-015 / REQ-FN-016 / REQ-FN-018 / REQ-FN-021.
 *
 * Métodos:
 *  - GET (PR4): access ARCO — devuelve `UserDataResponse`.
 *  - PUT (PR6): rectification ARCO — body `{name?, email?}`, devuelve
 *    `UserDataResponse`. Si el email cambia, el cliente dispara
 *    `signOutAndClear()` (REQ-FN-021).
 *  - DELETE (PR6): cancellation ARCO — sin body, devuelve `{message}`.
 *    El cliente llama `signOutAndClear()` después (REQ-FN-016).
 *
 * Flujo común:
 *  1. `getServerSession` lee la sesión NextAuth.
 *  2. Si NO hay sesión → 401 (no se llama al backend).
 *  3. Lee el backend JWT vía `getJwtFromSession` (cache BFF server-side).
 *     Si el cache está vacío (sesión inválida) → 401.
 *  4. Llama al backend con `Authorization: Bearer <jwt>` y, si aplica,
 *     body JSON.
 *  5. 200 → JSON forward al cliente.
 *  6. 429 del backend → 429 al cliente + header `Retry-After` forward verbatim
 *     (REQ-FN-018, NFR-RATE-1).
 *  7. 5xx del backend → 502 al cliente + `console.warn` (no PII per Art. III).
 *  8. 4xx del backend → mismo status propagado (e.g. 400, 403, 404).
 *
 * Path canonical: `/api/v1/user/data` (NO `/arco/*` legacy,
 * NO `/user/data/consent`).
 * Constitución Art. VI: el browser NUNCA habla directo con el backend.
 * Constitución Art. III / CR-TOK-1: NO se exponen tokens al cliente.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionWithId = { user: { id?: string } };

const BACKEND_TIMEOUT_MS = 5_000;

async function getAuthedJwtPair(): Promise<
  { jwt: string; userId: string } | Response
> {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  let jwtPair: { jwt: string; userId: string } | null = null;
  try {
    jwtPair = await getJwtFromSession();
  } catch {
    jwtPair = null;
  }
  if (!jwtPair) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  return jwtPair;
}

async function forwardToBackend(
  jwt: string,
  init: Omit<RequestInit, "headers" | "signal"> & {
    headers?: Record<string, string>;
  },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${BACKEND_URL}/api/v1/user/data`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${jwt}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const detail = err instanceof Error ? err.message : "unknown";
    console.warn("[user/data] upstream unreachable:", detail);
    return NextResponse.json(
      { error: "Upstream unavailable" },
      { status: 502 },
    );
  }
  clearTimeout(timer);

  // 429 → forward Retry-After header verbatim (REQ-FN-018, NFR-RATE-1).
  if (upstreamResponse.status === 429) {
    const retryAfter = upstreamResponse.headers.get("Retry-After");
    const headers = new Headers();
    if (retryAfter) headers.set("Retry-After", retryAfter);
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers },
    );
  }

  if (upstreamResponse.status >= 500) {
    let detail = "Upstream backend failed";
    try {
      const problem = (await upstreamResponse.json()) as {
        detail?: string;
        title?: string;
      };
      detail = problem.detail ?? problem.title ?? detail;
    } catch {
      // cuerpo no JSON; mantenemos el detail genérico
    }
    console.warn("[user/data] upstream 5xx:", upstreamResponse.status, detail);
    return NextResponse.json(
      { error: "Upstream backend failed" },
      { status: 502 },
    );
  }

  // 200 + 4xx → forward verbatim.
  const body = await upstreamResponse.text();
  return new Response(body, {
    status: upstreamResponse.status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET(): Promise<Response> {
  const auth = await getAuthedJwtPair();
  if (auth instanceof Response) return auth;
  return forwardToBackend(auth.jwt, { method: "GET" });
}

export async function PUT(request: Request): Promise<Response> {
  const auth = await getAuthedJwtPair();
  if (auth instanceof Response) return auth;

  let body: { name?: unknown; email?: unknown };
  try {
    body = (await request.json()) as { name?: unknown; email?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  return forwardToBackend(auth.jwt, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function DELETE(): Promise<Response> {
  const auth = await getAuthedJwtPair();
  if (auth instanceof Response) return auth;
  return forwardToBackend(auth.jwt, { method: "DELETE" });
}