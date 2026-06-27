import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del BFF `POST /api/auth/logout` (route handler).
 *
 * 009-auth-web PR2 (Session refresh + sign-out helpers).
 *
 * La BFF:
 *  - Lee la sesión NextAuth vía `getServerSession`.
 *  - Si NO hay sesión → 204 (idempotente: no hay nada que cerrar).
 *  - Si hay sesión → lee el cookie `next-auth.session-token`, obtiene el
 *    backend JWT vía `getJwtFromSession` (cache BFF server-side), y llama
 *    `POST /api/v1/auth/logout` con `Authorization: Bearer <backendJwt>`.
 *  - **Best-effort** (Art. VII no-friction, dev-environment caveat):
 *    si el backend retorna 4xx/5xx, igual devolvemos 200 al cliente —
 *    el NextAuth cookie será limpiado por el cliente (`signOut()` de
 *    NextAuth) y el cache BFF se limpia server-side vía `clearJwtCache()`.
 *  - 200 (backend) → 200 al cliente con `{ message }`.
 *  - 401 (backend, JWT expirado) → 200 al cliente (idempotente).
 *  - 500 (backend) → 200 al cliente (best-effort).
 *  - **Siempre** limpia el cache BFF antes de devolver.
 *
 * Path canonical: `/api/auth/logout` (NO `/auth/sign-out` legacy).
 * Spec: REQ-FN-007.
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadRoute() {
  return await import("@/app/api/auth/logout/route");
}

const sessionModuleMock = { getServerSession: vi.fn() };
const jwtModuleMock = {
  getJwtFromSession: vi.fn(),
  clearJwtCache: vi.fn(),
};

const cookieStoreMock: {
  map: Map<string, { value: string }>;
  get: (k: string) => { value: string } | undefined;
} = {
  map: new Map(),
  get(name: string) {
    return this.map.get(name);
  },
};

vi.mock("next-auth", () => sessionModuleMock);
vi.mock("next/headers", () => ({ cookies: () => cookieStoreMock }));
vi.mock("@/lib/api/jwt", () => jwtModuleMock);

function setSessionCookie(value: string): void {
  cookieStoreMock.map.clear();
  cookieStoreMock.map.set("next-auth.session-token", { value });
}

beforeEach(() => {
  vi.resetModules();
  process.env.BACKEND_URL = "http://test-backend:5080";
  process.env.NEXTAUTH_SECRET = "x".repeat(32);
  sessionModuleMock.getServerSession.mockReset();
  jwtModuleMock.getJwtFromSession.mockReset();
  jwtModuleMock.clearJwtCache.mockReset();
  setSessionCookie("mock-nextauth-jwt");
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

const VALID_SESSION = {
  user: { id: "11111111-1111-1111-1111-111111111111" },
};

describe("BFF /api/auth/logout (route handler)", () => {
  it("POST con sesión válida + backend 200 → 200 + cache limpiado (mensaje genérico del cliente)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Logged out successfully" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { POST } = await loadRoute();
    const res = await POST();

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/auth/logout");
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer backend-jwt");
    expect(jwtModuleMock.clearJwtCache).toHaveBeenCalledTimes(1);
  });

  it("POST con sesión válida + backend 401 (JWT expirado) → 200 al cliente (idempotente) + cache limpiado", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "stale-backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "JWT expired" }), { status: 401 }),
    );

    const { POST } = await loadRoute();
    const res = await POST();

    expect(res.status).toBe(200);
    expect(jwtModuleMock.clearJwtCache).toHaveBeenCalledTimes(1);
  });

  it("POST con sesión válida + backend 500 → 200 al cliente (best-effort) + cache limpiado + console.warn", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Internal error" }), { status: 500 }),
    );

    const { POST } = await loadRoute();
    const res = await POST();

    expect(res.status).toBe(200);
    expect(jwtModuleMock.clearJwtCache).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("POST sin sesión NextAuth → 204 (no se llama al backend ni al cache)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(null);

    const { POST } = await loadRoute();
    const res = await POST();

    expect(res.status).toBe(204);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(jwtModuleMock.getJwtFromSession).not.toHaveBeenCalled();
    expect(jwtModuleMock.clearJwtCache).not.toHaveBeenCalled();
  });

  it("POST con sesión pero `getJwtFromSession` devuelve null → 200 (cache limpio, sin llamada al backend)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce(null);

    const { POST } = await loadRoute();
    const res = await POST();

    expect(res.status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(jwtModuleMock.clearJwtCache).toHaveBeenCalledTimes(1);
  });
});
