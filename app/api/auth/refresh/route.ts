import { NextResponse } from "next/server";
import { z } from "zod";
import { BACKEND_URL } from "@/lib/api/backend";

/**
 * BFF `POST /api/auth/refresh` — proxy server-side hacia el backend.
 *
 * Forward de `POST /api/v1/auth/refresh` con body `{ refreshToken }`.
 * La BFF NO manipula tokens: el cliente envía el refresh token que ya
 * tiene, el backend lo rota (NFR-SEC-2), y la respuesta (con el nuevo
 * par access+refresh) se devuelve al cliente.
 *
 * En v0.5 el refresh token NO vive en el cliente (Constitution Art. III
 * / CR-TOK-1). El helper client-side `refreshSession()` NO usa esta
 * ruta — usa `GET /api/auth/session` para forzar un re-exchange y
 * obtener un backend JWT fresco sin tocar refresh tokens. Esta ruta
 * queda como puerto tipado para v0.6 cuando se decida cómo exponer
 * refresh tokens (p.ej. cookie httpOnly de sesión, postMessage).
 *
 * Spec: 009-auth-web PR2 (Session refresh + sign-out helpers).
 * Constitución Art. VI: el browser NUNCA habla directo con el backend.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RefreshBodySchema = z.object({
  refreshToken: z.string().min(1).max(2048),
});

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RefreshBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: parsed.data.refreshToken }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Upstream auth backend unreachable" },
      { status: 502 },
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status >= 500) {
    return NextResponse.json(
      { error: "Upstream auth backend failed" },
      { status: 502 },
    );
  }

  return NextResponse.json(body ?? {}, { status: response.status });
}
