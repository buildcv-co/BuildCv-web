/**
 * Utilidades compartidas por los BFFs de 009-auth-web.
 *
 * Específicamente, helpers para interpretar y formatear el header HTTP
 * `Retry-After` (RFC 7231 §7.1.3) cuando el backend devuelve 429.
 *
 * Usado por:
 *   - PR4 `lib/api/user-data.ts` (RateLimitError.retryAfter)
 *   - PR4 `app/api/user/data/route.ts` (forwarding del header)
 *   - PR5/PR6 extenderán para `lib/api/consent.ts` y ARCO BFFs.
 *
 * Por qué existe este módulo (en vez de inline en cada port):
 *   - **DRY**: 4+ BFFs necesitan la misma lógica de parsing.
 *   - **Tipado**: la regla `delta-seconds | HTTP-date` no es trivial
 *     (regex para detectar delta vs Date.parse para HTTP-date) y es
 *     propensa a bugs. Centralizar + testear es Constitution Art. VI.
 *   - **NFR-RATE-1**: el test de Vitest debe poder importar la lógica
 *     sin levantar Next.js (los BFFs viven en `app/api/*`).
 *
 * **Cero PII**: este módulo NO recibe ni loguea user data — solo el
 * header. Verificado por la ausencia de imports de session/user.
 */

export function parseRetryAfter(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // RFC 7231 §7.1.3: delta-seconds = 1*DIGIT
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    return new Date(Date.now() + seconds * 1000);
  }

  // HTTP-date (RFC 1123 / RFC 7231): "Wed, 21 Oct 2026 07:28:00 GMT"
  // Requerimos la coma + día + mes textual para evitar que strings como
  // "-5" caigan al parser de Date (Node/ECMAScript trata "-5" como año -5).
  if (!/^[A-Za-z]{3},\s\d{2}\s[A-Za-z]{3}\s\d{4}\s\d{2}:\d{2}:\d{2}\sGMT$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatRetryAfter(date: Date | null, locale: string): string | null {
  if (!date) return null;
  // toLocaleString() requiere ICU en Node; cae al locale del OS si el locale no está disponible.
  try {
    return date.toLocaleString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date.toLocaleString();
  }
}