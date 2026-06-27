import { describe, expect, it, vi, afterEach } from "vitest";

/**
 * Tests de utilidades compartidas por los BFFs de auth + user-data.
 *
 * 009-auth-web PR4 (T-PR4-001) — REQ-FN-018 + NFR-RATE-1.
 *
 * `parseRetryAfter` interpreta el header HTTP `Retry-After`:
 *   - delta-seconds: entero positivo (RFC 7231 §7.1.3) → devolvemos Date ahora + N segundos.
 *   - HTTP-date: RFC 1123 (ej. "Wed, 21 Oct 2026 07:28:00 GMT") → devolvemos la Date parseada.
 *   - inválido / vacío / null → devolvemos null (no propagamos basura al UI).
 *
 * `formatRetryAfter` recibe una Date (o null) y devuelve un string
 * `localeString` para mostrar en pantalla. Si la Date es null, devuelve
 * `null` para que el caller decida fallback.
 */

const ORIGINAL_FETCH = global.fetch;

async function loadUtils() {
  return await import("@/lib/api/_utils");
}

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("parseRetryAfter", () => {
  it("interpreta delta-seconds (entero positivo) → Date ahora + N segundos", async () => {
    const { parseRetryAfter } = await loadUtils();
    const before = Date.now();
    const result = parseRetryAfter("30");
    const after = Date.now();
    expect(result).toBeInstanceOf(Date);
    const ms = (result as Date).getTime();
    expect(ms).toBeGreaterThanOrEqual(before + 30_000 - 5);
    expect(ms).toBeLessThanOrEqual(after + 30_000 + 5);
  });

  it("interpreta HTTP-date RFC 1123 → Date exacta parseada", async () => {
    const { parseRetryAfter } = await loadUtils();
    const httpDate = "Wed, 21 Oct 2026 07:28:00 GMT";
    const result = parseRetryAfter(httpDate);
    expect(result).toBeInstanceOf(Date);
    const expected = new Date(httpDate).getTime();
    expect((result as Date).getTime()).toBe(expected);
  });

  it("devuelve null cuando el header es vacío / whitespace / no numérico ni fecha", async () => {
    const { parseRetryAfter } = await loadUtils();
    expect(parseRetryAfter("")).toBeNull();
    expect(parseRetryAfter("   ")).toBeNull();
    expect(parseRetryAfter("not-a-thing")).toBeNull();
    expect(parseRetryAfter("12abc")).toBeNull();
  });

  it("devuelve null cuando el header es negativo o cero (delta inválido)", async () => {
    const { parseRetryAfter } = await loadUtils();
    expect(parseRetryAfter("0")).toBeNull();
    expect(parseRetryAfter("-5")).toBeNull();
  });
});

describe("formatRetryAfter", () => {
  it("formatea una Date futura como string locale", async () => {
    const { formatRetryAfter } = await loadUtils();
    const future = new Date("2027-01-15T10:30:00Z");
    const result = formatRetryAfter(future, "es-CO");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("");
    // Sanity: contiene el año
    expect(result).toMatch(/2027/);
  });

  it("devuelve null cuando la Date es null (caller decide fallback)", async () => {
    const { formatRetryAfter } = await loadUtils();
    expect(formatRetryAfter(null, "es-CO")).toBeNull();
  });
});