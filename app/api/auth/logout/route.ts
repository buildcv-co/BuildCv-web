import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/api/backend";
import { getJwtFromSession, clearJwtCache } from "@/lib/api/jwt";

/**
 * BFF `POST /api/auth/logout` — proxy server-side hacia el backend.
 *
 * Spec: 009-auth-web PR2 + REQ-FN-007 (sign-out helpers).
 *
 * Flujo:
 *  1. `getServerSession` lee la sesión NextAuth.
 *  2. Si NO hay sesión → 204 (idempotente; el usuario ya está fuera).
 *  3. Lee el backend JWT vía `getJwtFromSession` (cache BFF server-side).
 *     Si el cache está vacío (sesión ya expiró localmente) → 200 + cache
 *     limpio sin llamar al backend.
 *  4. Llama `POST /api/v1/auth/logout` con `Authorization: Bearer
 *     <backendJwt>` y sin body (PR0 backend acepta bearer-only para
 *     revoke-all del usuario).
 *  5. **Best-effort** (Art. VII no-friction): si el backend retorna
 *     4xx/5xx, igual devolvemos 200 al cliente — el cookie NextAuth
 *     será limpiado por `signOut()` de NextAuth en el cliente, y el
 *     cache BFF se limpia aquí.
 *  6. **Siempre** limpia el cache BFF (`clearJwtCache()`) antes de
 *     devolver.
 *
 * Path canonical: `/api/auth/logout` (NO `/auth/sign-out` legacy).
 * Constitución Art. VI: el browser NUNCA habla directo con el backend.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionWithId = { user: { id?: string; email?: string | null; name?: string | null } };

export async function POST(): Promise<Response> {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 204 });
  }

  let jwtPair: { jwt: string; userId: string } | null = null;
  try {
    jwtPair = await getJwtFromSession();
  } catch {
    // Cache lookup falló: continuamos sin backend JWT y limpiamos cache.
    jwtPair = null;
  }

  if (jwtPair) {
    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(`${BACKEND_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwtPair.jwt}` },
        cache: "no-store",
      });
    } catch (err) {
      // Best-effort (R2-A, Art. VII): el cookie NextAuth será limpiado por
      // el cliente (`signOut()` de NextAuth). NO bloqueamos al usuario.
      // console.warn (NO error per NFR-OBS-1, sin PII).
      const detail = err instanceof Error ? err.message : "unknown";
      console.warn("[auth/logout] upstream unreachable:", detail);
      clearJwtCache();
      return NextResponse.json({ message: "Logged out" }, { status: 200 });
    }

    // Best-effort: cualquier status upstream != 2xx NO bloquea al cliente.
    // Pero SÍ registramos para observabilidad (NFR-OBS-1).
    if (!upstreamResponse.ok) {
      console.warn(
        `[auth/logout] upstream returned ${upstreamResponse.status} (best-effort)`,
      );
    }
  }

  // Limpieza defensiva (R-LOCAL-MODE-CACHE): el cache BFF no debe
  // sobrevivir al logout aunque el backend haya devuelto 4xx/5xx.
  clearJwtCache();

  return NextResponse.json({ message: "Logged out" }, { status: 200 });
}
