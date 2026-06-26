import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * Unit tests para el BFF /api/log (route handler).
 *
 * Cubren el contrato de la feature 008-web-observability-web:
 * - BFF OFF por default: 503 (Constitution Art. III, privacy by design)
 * - BFF ON con env BUILDCV_LOG_ENDPOINT=enabled: 204
 * - Validación Zod: payload inválido → 400
 * - JSON malformado: 400
 * - GET lee el log store
 *
 * Importante: el route.ts lee process.env al momento de la request (no
 * al module load), así que vi.stubEnv funciona aunque el módulo ya
 * esté importado.
 */

const VALID_BODY = {
  timestamp: "2026-06-09T12:34:56.000Z",
  level: "error",
  message: "unit-test-valid",
  stack: "Error: unit-test-valid\n  at foo",
  context: {
    url: "https://buildcv.co/analizar",
    userAgent: "Mozilla/5.0",
    viewport: { width: 1280, height: 720 },
    appVersion: "0.5.1",
    buildSha: "abc123",
    locale: "es-CO",
  },
} as const;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("BFF /api/log (route handler)", () => {
  it("POST retorna 503 en producción cuando BUILDCV_LOG_ENDPOINT !== 'enabled'", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BUILDCV_LOG_ENDPOINT", "");
    vi.resetModules();
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it("POST retorna 204 cuando BUILDCV_LOG_ENDPOINT === 'enabled'", async () => {
    vi.stubEnv("BUILDCV_LOG_ENDPOINT", "enabled");
    vi.resetModules();
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(204);
  });

  it("POST con JSON inválido retorna 400", async () => {
    vi.stubEnv("BUILDCV_LOG_ENDPOINT", "enabled");
    vi.resetModules();
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not valid json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Invalid JSON");
  });

  it("POST con payload Zod-inválido (falta context) retorna 400 con details", async () => {
    vi.stubEnv("BUILDCV_LOG_ENDPOINT", "enabled");
    vi.resetModules();
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        timestamp: "2026-06-09T12:34:56.000Z",
        level: "error",
        message: "no context",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string; details?: unknown };
    expect(body.error).toBe("Invalid payload");
    expect(body.details).toBeDefined();
  });

  it("GET retorna 503 en producción cuando BFF está OFF", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BUILDCV_LOG_ENDPOINT", "");
    vi.resetModules();
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("GET retorna 200 + array cuando BFF está ON", async () => {
    vi.stubEnv("BUILDCV_LOG_ENDPOINT", "enabled");
    vi.resetModules();
    const { GET, POST } = await import("./route");
    // Poblar el store
    const post = new Request("http://localhost/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(VALID_BODY),
    });
    await POST(post);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as ReadonlyArray<unknown>;
    expect(Array.isArray(body)).toBe(true);
  });
});
