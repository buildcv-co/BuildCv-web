import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/api/backend";

/**
 * BFF `GET /api/auth/session` — proxy server-side hacia el backend.
 *
 * Devuelve al cliente los datos públicos del usuario autenticado
 * (id, email, name) + la fecha de expiración de la sesión backend.
 * El `jwt` del backend se descarta en la respuesta: vive solo en el
 * cache BFF in-memory (Constitution Art. III / CR-TOK-1 — los tokens
 * nunca llegan al cliente).
 *
 * Flujo:
 *  1. `getServerSession` lee la sesión NextAuth desde la cookie
 *     `next-auth.session-token` (server-side, httpOnly).
 *  2. Si no hay sesión → 401.
 *  3. Lee la cookie raw (NextAuth JWT firmado) para reenviarla como
 *     `Authorization: Bearer` al backend.
 *  4. Backend `GET /api/v1/auth/session` valida el JWT con
 *     `NextAuthJwtValidator` y devuelve `{jwt, expiresAt, user}`.
 *  5. La BFF devuelve `{user, expiresAt}` al cliente — sin `jwt`.
 *
 * Spec: 009-auth-web PR2 (Session refresh + sign-out helpers).
 * Constitución Art. VI: el browser NUNCA habla directo con el backend.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
] as const;

type SessionWithId = { user: { id?: string; email?: string | null; name?: string | null } };
type BackendSessionPayload = {
  jwt?: string;
  expiresAt?: string;
  user?: { id?: string; email?: string; name?: string };
};

export async function GET(): Promise<Response> {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const cookieStore = await cookies();
  let nextAuthJwt = "";
  for (const name of SESSION_COOKIE_NAMES) {
    const entry = cookieStore.get(name);
    if (entry?.value) {
      nextAuthJwt = entry.value;
      break;
    }
  }
  if (!nextAuthJwt) {
    return NextResponse.json({ error: "Session cookie missing" }, { status: 401 });
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/v1/auth/session`, {
      method: "GET",
      headers: { Authorization: `Bearer ${nextAuthJwt}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream auth backend unreachable" },
      { status: 502 },
    );
  }

  if (response.status === 401) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "Upstream auth backend failed" },
      { status: 502 },
    );
  }

  const data = (await response.json()) as BackendSessionPayload;
  if (!data.user?.id || !data.expiresAt) {
    return NextResponse.json(
      { error: "Upstream returned malformed session" },
      { status: 502 },
    );
  }

  // Strip `jwt` from the response — it stays server-side via the BFF cache
  // (`lib/api/jwt.ts`). Constitution Art. III / CR-TOK-1.
  return NextResponse.json(
    {
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
        name: data.user.name ?? "",
      },
      expiresAt: data.expiresAt,
    },
    { status: 200 },
  );
}
