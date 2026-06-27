import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthAdapterError,
  registerWithBackend,
} from "@/lib/api/auth-adapter";

/**
 * BFF `POST /api/auth/web-signup` — proxy server-side hacia el backend.
 *
 * Valida el body con Zod (provider enum + providerAccountId/email/name)
 * y delega a `registerWithBackend` (lib/api/auth-adapter) que es el
 * único módulo que conoce el contrato del backend y la credencial BFF.
 *
 * Respuesta:
 *  - 200 → `{ userId }` (forward del adapter)
 *  - 400 → body inválido / JSON malformado
 *  - 4xx (del adapter) → mismo status propagado (ej. 401 si BFF key inválida)
 *  - 5xx (del adapter) → 502 (gateway upstream failed)
 *
 * Spec: 009-auth-web §3.2 (PR1 BFF) + §3.4 (error mapping).
 * Constitución Art. VI: el browser NUNCA habla directo con el backend.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WebSignupBodySchema = z.object({
  provider: z.enum(["google", "linkedin"]),
  providerAccountId: z.string().min(1).max(255),
  email: z.string().email().max(320),
  name: z.string().min(1).max(200),
});

export type WebSignupBody = z.infer<typeof WebSignupBodySchema>;

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = WebSignupBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await registerWithBackend(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof AuthAdapterError) {
      if (err.status >= 500) {
        // upstream failed: NO silenciamos (R1-A); devolvemos 502 al cliente
        console.warn("[auth/web-signup] upstream failed:", err.detail);
        return NextResponse.json(
          { error: "Upstream auth backend failed" },
          { status: 502 },
        );
      }
      return NextResponse.json(
        { error: err.detail },
        { status: err.status },
      );
    }
    throw err;
  }
}