import { signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Helper client-side para cerrar sesión (009-auth-web PR2 + REQ-FN-007).
 *
 * Ejecuta el flujo de cierre en 2 pasos (orden estricto):
 *  1. `signOut({redirect: false})` de NextAuth — limpia la cookie
 *     `next-auth.session-token` (httpOnly, server-side).
 *  2. POST `/api/auth/logout` (BFF same-origin) — el backend revoca
 *     los refresh tokens del usuario (PR0 backend, bearer-only) y
 *     la BFF limpia su cache server-side (`lib/api/jwt.ts`).
 *
 * **Nota**: el cache BFF vive en el módulo server-only `lib/api/jwt.ts`
 * (NO accesible desde el browser). La BFF `app/api/auth/logout/route.ts`
 * llama `clearJwtCache()` server-side después del revoke — esto cumple
 * la garantía de R-LOCAL-MODE-CACHE sin necesidad de exponer el cache
 * al cliente.
 *
 * **Idempotente**: llamar dos veces es seguro (Art. VII no-friction).
 *
 * **Best-effort** (Art. VII): si el BFF devuelve 4xx/5xx, NO lanzamos
 * error al caller (el usuario ya está fuera desde el punto de vista UX).
 * Logs via `console.warn` (no PII per NFR-OBS-1).
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
      console.warn(
        `[auth/sign-out] BFF returned ${response.status} (best-effort)`,
      );
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown";
    console.warn(`[auth/sign-out] BFF unreachable: ${detail}`);
  }
}
