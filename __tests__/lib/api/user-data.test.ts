import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del typed port `getUserData` (009-auth-web PR4 — T-PR4-002).
 *
 * Contrato congelado en spec §3.3:
 *   GET `${BACKEND_URL}/api/v1/user/data`
 *   Header: `Authorization: Bearer <backend-jwt>` (vía getJwtFromSession)
 *   200 → `UserDataResponse { userId, provider, email, name, createdAt, lastLoginAt }`
 *   429 → throws RateLimitError(retryAfter: Date) — NFR-RATE-1
 *
 * Path canonical: `/api/v1/user/data` (NO `/user/data/consent` — eso es PR5).
 *
 * IMPORTANTE: TDD strict. La función `getUserData` aún NO EXISTE en el
 * código de producción al momento de RED. Cada test referencia la firma
 * congelada por la spec.
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadPort() {
  return await import("@/lib/api/user-data");
}

const sessionModuleMock = {
  getJwtFromSession: vi.fn(),
  clearJwtCache: vi.fn(),
};

beforeEach(() => {
  vi.resetModules();
  process.env.BACKEND_URL = "http://test-backend:5080";
  vi.doMock("@/lib/api/jwt", () => sessionModuleMock);
  sessionModuleMock.getJwtFromSession.mockReset();
  sessionModuleMock.clearJwtCache.mockReset();
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
  vi.doUnmock("@/lib/api/jwt");
});

describe("getUserData (typed port)", () => {
  it("GET contra `${BACKEND_URL}/api/v1/user/data` (NO contra legacy `/user/data/consent`)", async () => {
    const { getUserData } = await loadPort();
    sessionModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt-token",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          userId: "11111111-1111-1111-1111-111111111111",
          provider: "google",
          email: "ada@example.com",
          name: "Ada Lovelace",
          createdAt: "2026-06-25T10:00:00Z",
          lastLoginAt: "2026-06-26T08:00:00Z",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await getUserData();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/user/data");
    // defensivo: nunca debemos pegarle al endpoint de consent (PR5)
    expect(calledUrl).not.toContain("/consent");
    expect(calledUrl).not.toContain("/privacy/policies");
    expect(calledUrl).not.toContain("/callback");
    expect(result.userId).toBe("11111111-1111-1111-1111-111111111111");
    expect(result.email).toBe("ada@example.com");
    expect(result.provider).toBe("google");
    expect(result.name).toBe("Ada Lovelace");
  });

  it("envía `Authorization: Bearer <backend-jwt>` (NUNCA tokens al cliente)", async () => {
    const { getUserData } = await loadPort();
    sessionModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt-secret",
      userId: "user-1",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          userId: "user-1",
          provider: "linkedin",
          email: "a@b.co",
          name: "x",
          createdAt: "2026-01-01T00:00:00Z",
          lastLoginAt: "2026-06-01T00:00:00Z",
        }),
        { status: 200 },
      ),
    );

    await getUserData();

    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer backend-jwt-secret");
    expect(headers["Authorization"]).not.toBe("Bearer undefined");
    expect(headers["Authorization"]).not.toBe("Bearer null");
  });

  it("retorna UserDataResponse con shape { userId, provider, email, name, createdAt, lastLoginAt }", async () => {
    const { getUserData } = await loadPort();
    sessionModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "jwt",
      userId: "u",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          userId: "11111111-1111-1111-1111-111111111111",
          provider: "google",
          email: "ada@example.com",
          name: "Ada Lovelace",
          createdAt: "2026-06-25T10:00:00Z",
          lastLoginAt: "2026-06-26T08:00:00Z",
        }),
        { status: 200 },
      ),
    );

    const result = await getUserData();

    // Triangulación: cada propiedad es la que PR6 necesita (userId, email).
    expect(result).toEqual({
      userId: "11111111-1111-1111-1111-111111111111",
      provider: "google",
      email: "ada@example.com",
      name: "Ada Lovelace",
      createdAt: "2026-06-25T10:00:00Z",
      lastLoginAt: "2026-06-26T08:00:00Z",
    });
  });

  it("lanza `RateLimitError` con `retryAfter` parseado cuando el backend devuelve 429 + `Retry-After: 30`", async () => {
    const { getUserData, RateLimitError } = await loadPort();
    sessionModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "jwt",
      userId: "u",
    });
    const fetchMock = vi.mocked(global.fetch);
    const before = Date.now();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Too many" }), {
        status: 429,
        headers: { "Retry-After": "30" },
      }),
    );

    let thrown: unknown;
    try {
      await getUserData();
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(RateLimitError);
    const rl = thrown as InstanceType<typeof RateLimitError>;
    expect(rl.retryAfter).toBeInstanceOf(Date);
    const ms = rl.retryAfter!.getTime();
    expect(ms).toBeGreaterThanOrEqual(before + 30_000 - 100);
    expect(ms).toBeLessThanOrEqual(Date.now() + 30_000 + 100);
  });
});