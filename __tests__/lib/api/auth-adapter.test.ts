import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del adapter de auth (typed port que habla con el backend).
 *
 * Contrato congelado en spec 009-auth-web §3.3:
 *   POST `${BACKEND_URL}/api/v1/auth/web-signup`
 *   Header: `X-BFF-Key: ${process.env.BFF_API_KEY}`
 *   Body:   `{ provider, providerAccountId, email, name }`
 *   200 → `{ userId }`
 *
 * Backend response failure modes (design §3.4):
 *   401 (backend) → AuthAdapterError(401, detail)
 *   5xx (backend) → AuthAdapterError(502, "Backend error")
 *   network       → AuthAdapterError(503, "Network error")
 *
 * Fail-closed: si `BFF_API_KEY` está vacío/undefined, NO se emite request.
 *   → AuthAdapterError(500, "BFF_AUTH_NOT_CONFIGURED")
 *
 * IMPORTANT: TDD strict. Estos tests se escribieron ANTES de la
 * implementación; la función `registerWithBackend` aún NO EXISTE en el
 * código de producción al momento de RED. Cada test referencia la firma
 * congelada por la spec.
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadAdapter() {
  return await import("@/lib/api/auth-adapter");
}

function setBffKey(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.BFF_API_KEY;
  } else {
    process.env.BFF_API_KEY = value;
  }
}

beforeEach(() => {
  vi.resetModules();
  process.env.BACKEND_URL = "http://test-backend:5080";
  setBffKey("test-bff-key-do-not-use-in-prod");
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("registerWithBackend (auth-adapter)", () => {
  it("POSTea a `${BACKEND_URL}/api/v1/auth/web-signup` (no al legacy `/callback`)", async () => {
    const { registerWithBackend } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await registerWithBackend({
      provider: "google",
      providerAccountId: "google-sub-1",
      email: "a@b.co",
      name: "Ada",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/auth/web-signup");
    expect(calledUrl).not.toContain("/callback");
    expect(calledUrl).not.toContain("/google/callback");
    expect(calledUrl).not.toContain("/linkedin/callback");
  });

  it("envía body { provider, providerAccountId, email, name } (no legacy `providerId`)", async () => {
    const { registerWithBackend } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: "22222222-2222-2222-2222-222222222222" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await registerWithBackend({
      provider: "google",
      providerAccountId: "google-sub-2",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });

    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse((calledInit.body as string) ?? "{}");
    expect(body).toEqual({
      provider: "google",
      providerAccountId: "google-sub-2",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
    expect(body).not.toHaveProperty("providerId");
  });

  it("envía header `X-BFF-Key: ${process.env.BFF_API_KEY}` (server-side)", async () => {
    setBffKey("super-secret-bff-key-12345");
    const { registerWithBackend } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: "33333333-3333-3333-3333-333333333333" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await registerWithBackend({
      provider: "google",
      providerAccountId: "google-sub-3",
      email: "x@y.co",
      name: "X",
    });

    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["X-BFF-Key"]).toBe("super-secret-bff-key-12345");
  });

  it("falla fail-closed si `BFF_API_KEY` no está configurado (no emite request)", async () => {
    setBffKey(undefined);
    const { registerWithBackend, AuthAdapterError } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);

    await expect(
      registerWithBackend({
        provider: "google",
        providerAccountId: "g-1",
        email: "x@y.co",
        name: "X",
      }),
    ).rejects.toMatchObject({
      name: "AuthAdapterError",
      status: 500,
      detail: "BFF_AUTH_NOT_CONFIGURED",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    // sanity: AuthAdapterError must be a real class
    expect(typeof AuthAdapterError).toBe("function");
  });

  it("falla fail-closed si `BFF_API_KEY` es string vacío (no emite request)", async () => {
    setBffKey("");
    const { registerWithBackend } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);

    await expect(
      registerWithBackend({
        provider: "linkedin",
        providerAccountId: "li-1",
        email: "x@y.co",
        name: "X",
      }),
    ).rejects.toMatchObject({ status: 500, detail: "BFF_AUTH_NOT_CONFIGURED" });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mapea 401 del backend → AuthAdapterError(status:401, detail preservado)", async () => {
    const { registerWithBackend, AuthAdapterError } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "bad bff key" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    const thrown = await registerWithBackend({
      provider: "google",
      providerAccountId: "g-1",
      email: "x@y.co",
      name: "X",
    }).then(
      () => null,
      (err: unknown) => err as InstanceType<typeof AuthAdapterError>,
    );

    expect(thrown).toBeInstanceOf(AuthAdapterError);
    expect(thrown?.status).toBe(401);
    expect(thrown?.detail).toContain("bad bff key");
  });

  it("mapea 5xx del backend → AuthAdapterError(status:502)", async () => {
    const { registerWithBackend, AuthAdapterError } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "boom" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    try {
      await registerWithBackend({
        provider: "google",
        providerAccountId: "g-1",
        email: "x@y.co",
        name: "X",
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthAdapterError);
      const e = err as InstanceType<typeof AuthAdapterError>;
      expect(e.status).toBe(502);
    }
  });

  it("mapea error de red → AuthAdapterError(status:503)", async () => {
    const { registerWithBackend } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(
      registerWithBackend({
        provider: "google",
        providerAccountId: "g-1",
        email: "x@y.co",
        name: "X",
      }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it("mapea provider=google con `providerAccountId=<google sub>` (no legacy providerId)", async () => {
    const { registerWithBackend } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: "google-uid" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await registerWithBackend({
      provider: "google",
      providerAccountId: "google-sub-xyz",
      email: "g@google.com",
      name: "G User",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body.provider).toBe("google");
    expect(body.providerAccountId).toBe("google-sub-xyz");
    expect(body).not.toHaveProperty("providerId");
  });

  it("mapea provider=linkedin con `providerAccountId=<linkedin id>` (no legacy providerId)", async () => {
    const { registerWithBackend } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: "linkedin-uid" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await registerWithBackend({
      provider: "linkedin",
      providerAccountId: "linkedin-id-abc",
      email: "l@linkedin.com",
      name: "L User",
    });

    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body.provider).toBe("linkedin");
    expect(body.providerAccountId).toBe("linkedin-id-abc");
    expect(body).not.toHaveProperty("providerId");
  });

  it("retorna `{ userId }` cuando el backend responde 200 con `{ userId }`", async () => {
    const { registerWithBackend } = await loadAdapter();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: "44444444-4444-4444-4444-444444444444" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const out = await registerWithBackend({
      provider: "google",
      providerAccountId: "g-1",
      email: "x@y.co",
      name: "X",
    });

    expect(out).toEqual({ userId: "44444444-4444-4444-4444-444444444444" });
  });
});