import { signOut as nextAuthSignOut } from "next-auth/react";
import { clearJwtCache } from "@/lib/api/jwt";

/**
 * Helper client-side para cerrar sesión (009-auth-web PR2 + REQ-FN-007).
 *
 * Ejecuta el flujo de cierre en 3 pasos (orden estricto):
 *  1. `signOut({redirect: false})` de NextAuth — limpia la cookie
 *     `next-auth.session-token` (httpOnly, server-side).
 *  2. POST `/api/auth/logout` (BFF same-origin) — el backend revoca
 *     los refresh tokens del usuario (PR0 backend, bearer-only) y
 *     la BFF limpia su cache server-side (`lib/api/jwt.ts`).
 *  3. `clearJwtCache()` — defensa adicional (R-LOCAL-MODE-CACHE):
 *     garantiza que el cache BFF no sobreviva al logout aunque el
 *     backend haya devuelto 4xx/5xx o el step 2 haya fallado.
 *
 * **Idempotente**: llamar dos veces es seguro (Art. VII no-friction).
 *
 * **Best-effort** (Art. VII): si el BFF devuelve 4xx/5xx, igual
 * continuamos con `clearJwtCache()` y NO lanzamos error al caller
 * (el usuario ya está fuera desde el punto de vista UX). Logs via
 * `console.warn` (no PII per NFR-OBS-1).
 *
 * Path canonical: `/api/auth/logout` (NO `/auth/sign-out` legacy).
 * Constitución Art. VI: el browser NUNCA habla directo con el backend.
 * Constitución Art. III / CR-TOK-1: NO se exponen tokens en URL,
 * body, headers ni logs.
 */

export async function signOut(): Promise<void> {
  // Paso 1 — NextAuth: limpia la cookie httpOnly del browser.
  await nextAuthSignOut({ redirect: false });

  // Paso 2 — BFF logout (best-effort): llama al backend para revocar
  // refresh tokens y limpia el cache BFF server-side.
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) {
      // 4xx/5xx NO bloquea al usuario. console.warn (no error, no PII).
      console.warn(
        `[auth/sign-out] BFF returned ${response.status} (best-effort)`,
      );
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown";
    console.warn(`[auth/sign-out] BFF unreachable: ${detail}`);
  }

  // Paso 3 — Defensa (R-LOCAL-MODE-CACHE): el cache BFF no debe
  // sobrevivir al logout. Se ejecuta SIEMPRE, incluso si step 2 falló.
  clearJwtCache();
}
