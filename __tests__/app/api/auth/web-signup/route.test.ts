import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del BFF `/api/auth/web-signup` (route handler).
 *
 * La BFF:
 *  - Valida el body con Zod (provider enum, providerAccountId/email/name).
 *  - Llama `registerWithBackend` (mockeado aquí para aislar la BFF).
 *  - Devuelve 200 con `{ userId }` cuando el adapter resuelve.
 *  - Devuelve 400 si Zod rechaza (missing email).
 *  - Devuelve 502 si el adapter tira AuthAdapterError(>=500).
 *  - Devuelve 401 si el adapter tira AuthAdapterError(401).
 *  - NO se ejecuta en runtime `edge`: usa runtime `nodejs`.
 */

const ORIGINAL_ENV = { ...process.env };

async function loadRoute() {
  return await import("@/app/api/auth/web-signup/route");
}

async function loadAdapterMock() {
  return await import("@/lib/api/auth-adapter");
}

const adapterMock = {
  registerWithBackend: vi.fn(),
  AuthAdapterError: class AuthAdapterError extends Error {
    constructor(public readonly status: number, public readonly detail: string) {
      super(`AuthAdapterError(${status}): ${detail}`);
      this.name = "AuthAdapterError";
    }
  },
};

beforeEach(() => {
  vi.resetModules();
  process.env.BACKEND_URL = "http://test-backend:5080";
  process.env.BFF_API_KEY = "test-bff-key";
  vi.doMock("@/lib/api/auth-adapter", () => adapterMock);
  adapterMock.registerWithBackend.mockReset();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.doUnmock("@/lib/api/auth-adapter");
  vi.restoreAllMocks();
});

const VALID_BODY = {
  provider: "google",
  providerAccountId: "google-sub-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
};

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/web-signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("BFF /api/auth/web-signup (route handler)", () => {
  it("POST con body válido → 200 + `{ userId }` cuando el adapter resuelve", async () => {
    const { POST } = await loadRoute();
    adapterMock.registerWithBackend.mockResolvedValueOnce({
      userId: "55555555-5555-5555-5555-555555555555",
    });

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId?: string };
    expect(body).toEqual({ userId: "55555555-5555-5555-5555-555555555555" });
    expect(adapterMock.registerWithBackend).toHaveBeenCalledTimes(1);
    expect(adapterMock.registerWithBackend).toHaveBeenCalledWith({
      provider: "google",
      providerAccountId: "google-sub-1",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
  });

  it("POST con body inválido (falta `email`) → 400 con details de Zod", async () => {
    const { POST } = await loadRoute();
    const sinEmail: Partial<typeof VALID_BODY> = { ...VALID_BODY };
    delete sinEmail.email;

    const res = await POST(makeRequest(sinEmail));

    expect(res.status).toBe(400);
    expect(adapterMock.registerWithBackend).not.toHaveBeenCalled();
    const body = (await res.json()) as { error?: string; details?: unknown };
    expect(body.error).toBe("Invalid payload");
    expect(body.details).toBeDefined();
  });

  it("POST con JSON malformado → 400 `Invalid JSON`", async () => {
    const { POST } = await loadRoute();

    const res = await POST(makeRequest("{not json"));

    expect(res.status).toBe(400);
    expect(adapterMock.registerWithBackend).not.toHaveBeenCalled();
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("Invalid JSON");
  });

  it("POST con provider inválido (`facebook`) → 400 Zod", async () => {
    const { POST } = await loadRoute();

    const res = await POST(makeRequest({ ...VALID_BODY, provider: "facebook" }));

    expect(res.status).toBe(400);
    expect(adapterMock.registerWithBackend).not.toHaveBeenCalled();
  });

  it("POST cuando el adapter tira 502 → BFF responde 502 (no absorbe el error)", async () => {
    const { POST } = await loadRoute();
    const { AuthAdapterError } = await loadAdapterMock();
    adapterMock.registerWithBackend.mockRejectedValueOnce(
      new (AuthAdapterError as unknown as new (
        s: number,
        d: string,
      ) => Error)(502, "Backend error status=500"),
    );

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(502);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeDefined();
  });

  it("POST cuando el adapter tira 401 (BFF key inválido) → BFF responde 401", async () => {
    const { POST } = await loadRoute();
    const { AuthAdapterError } = await loadAdapterMock();
    adapterMock.registerWithBackend.mockRejectedValueOnce(
      new (AuthAdapterError as unknown as new (
        s: number,
        d: string,
      ) => Error)(401, "bad bff key"),
    );

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(401);
  });

  it("forwardea el provider LinkedIn al adapter sin transformación", async () => {
    const { POST } = await loadRoute();
    adapterMock.registerWithBackend.mockResolvedValueOnce({
      userId: "li-uid-1",
    });

    const res = await POST(
      makeRequest({
        provider: "linkedin",
        providerAccountId: "linkedin-id-1",
        email: "l@linkedin.com",
        name: "L User",
      }),
    );

    expect(res.status).toBe(200);
    expect(adapterMock.registerWithBackend).toHaveBeenCalledWith({
      provider: "linkedin",
      providerAccountId: "linkedin-id-1",
      email: "l@linkedin.com",
      name: "L User",
    });
  });
});