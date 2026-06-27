import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/api/backend";
import { getJwtFromSession } from "@/lib/api/jwt";

/**
 * BFF `GET /api/user/data` — proxy server-side hacia el backend.
 *
 * Spec: 009-auth-web PR4 + REQ-FN-011 (GET user-data BFF).
 *
 * Flujo:
 *  1. `getServerSession` lee la sesión NextAuth.
 *  2. Si NO hay sesión → 401 (no se llama al backend).
 *  3. Lee el backend JWT vía `getJwtFromSession` (cache BFF server-side).
 *     Si el cache está vacío (sesión inválida) → 401.
 *  4. Llama `GET /api/v1/user/data` con `Authorization: Bearer <jwt>`.
 *  5. Forward el JSON al cliente con status 200.
 *  6. 429 del backend → 429 al cliente + header `Retry-After` forward verbatim
 *     (REQ-FN-018, NFR-RATE-1). El cliente lo lee y renderiza el error.
 *  7. 5xx del backend → 502 al cliente + `console.warn` (no PII per Art. III).
 *  8. 4xx del backend → mismo status propagado (e.g. 403/404).
 *
 * PR6 agregará PUT + DELETE en el mismo archivo (`app/api/user/data/route.ts`).
 * Por ahora (PR4) solo GET.
 *
 * Path canonical: `/api/user/data` (NO `/user/data/consent` — eso es PR5).
 * Constitución Art. VI: el browser NUNCA habla directo con el backend.
 * Constitución Art. III / CR-TOK-1: NO se exponen tokens al cliente.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionWithId = { user: { id?: string } };

const BACKEND_TIMEOUT_MS = 5_000;

export async function GET(): Promise<Response> {
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(`${BACKEND_URL}/api/v1/user/data`, {
      method: "GET",
      headers: { Authorization: `Bearer ${jwtPair.jwt}` },
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
    // upstream 5xx → 502 al cliente + console.warn (NO PII per NFR-OBS-1).
    let detail = "Upstream backend failed";
    try {
      const problem = (await upstreamResponse.json()) as { detail?: string; title?: string };
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

  // Forward del body + status al cliente (200, 4xx).
  const body = await upstreamResponse.text();
  return new Response(body, {
    status: upstreamResponse.status,
    headers: { "content-type": "application/json" },
  });
}