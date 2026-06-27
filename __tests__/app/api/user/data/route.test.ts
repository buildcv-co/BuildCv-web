import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del BFF `GET /api/user/data` (route handler).
 *
 * 009-auth-web PR4 (T-PR4-003) — REQ-FN-011 + NFR-XREPO-1 + NFR-RATE-1.
 *
 * La BFF:
 *  - Lee la sesión NextAuth vía `getServerSession`.
 *  - Si NO hay sesión → 401 (sin tocar el backend).
 *  - Si hay sesión → llama al backend `GET /api/v1/user/data` con
 *    `Authorization: Bearer <backend-jwt>` y devuelve el JSON tal cual.
 *  - 429 del backend → forward `Retry-After` header verbatim + status 429.
 *  - 5xx del backend → 502 al cliente + `console.warn` (no PII).
 *
 * Path canonical: `/api/user/data` (NO `/user/data/consent`).
 * Spec: REQ-FN-011.
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadRoute() {
  return await import("@/app/api/user/data/route");
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

const USER_DATA = {
  userId: "11111111-1111-1111-1111-111111111111",
  provider: "google",
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-06-25T10:00:00Z",
  lastLoginAt: "2026-06-26T08:00:00Z",
};

describe("BFF /api/user/data GET (route handler)", () => {
  it("GET con sesión válida + backend 200 → 200 + JSON forward al cliente", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(USER_DATA), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { GET } = await loadRoute();
    const res = await GET();

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/user/data");
    // defensivo: nunca contra `/consent` ni otros paths
    expect(calledUrl).not.toContain("/consent");
    expect(calledUrl).not.toContain("/privacy");
    expect(calledUrl).not.toContain("/callback");
    const body = (await res.json()) as typeof USER_DATA;
    expect(body).toEqual(USER_DATA);
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer backend-jwt");
  });

  it("GET sin sesión NextAuth → 401 (sin tocar el backend ni el cache)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(null);

    const { GET } = await loadRoute();
    const res = await GET();

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(jwtModuleMock.getJwtFromSession).not.toHaveBeenCalled();
  });

  it("GET con sesión pero `getJwtFromSession` devuelve null → 401 (sin tocar el backend)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce(null);

    const { GET } = await loadRoute();
    const res = await GET();

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("GET + backend 429 + Retry-After: 30 → 429 al cliente + header forward verbatim", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Retry-After": "30" },
      }),
    );

    const { GET } = await loadRoute();
    const res = await GET();

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  it("GET + backend 500 → 502 al cliente + console.warn (no expone detalle al cliente)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Backend boom" }), { status: 500 }),
    );

    const { GET } = await loadRoute();
    const res = await GET();

    expect(res.status).toBe(502);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});