import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del BFF `GET /api/auth/session` (route handler).
 *
 * 009-auth-web PR2 (Session refresh + sign-out helpers).
 *
 * La BFF:
 *  - Lee la sesión NextAuth vía `getServerSession`.
 *  - Si NO hay sesión → 401 (no hay nada que devolver).
 *  - Si hay sesión → llama backend `GET /api/v1/auth/session` con
 *    `Authorization: Bearer <nextAuthJwt>` y devuelve la respuesta
 *    del backend **sin el campo `jwt`** (la JWT queda server-side vía
 *    cache BFF — Constitution Art. III / CR-TOK-1: tokens never on client).
 *  - Si el backend responde 401 → BFF propaga 401.
 *  - Si el backend responde 5xx → BFF responde 502 (gateway failure).
 *
 * Path canonical: `/api/auth/session` (NO `/session` legacy, NO
 * `/api/v1/auth/session` directo desde browser).
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadRoute() {
  return await import("@/app/api/auth/session/route");
}

const sessionModuleMock = {
  getServerSession: vi.fn(),
};

type CookieMap = Map<string, { value: string }>;

const cookieStoreMock: { map: CookieMap; get: (k: string) => { value: string } | undefined } = {
  map: new Map(),
  get(name: string) {
    return this.map.get(name);
  },
};

vi.mock("next-auth", () => sessionModuleMock);
vi.mock("next/headers", () => ({
  cookies: () => cookieStoreMock,
}));

function setSessionCookie(value: string): void {
  cookieStoreMock.map.clear();
  cookieStoreMock.map.set("next-auth.session-token", { value });
}

beforeEach(() => {
  vi.resetModules();
  process.env.BACKEND_URL = "http://test-backend:5080";
  process.env.NEXTAUTH_SECRET = "x".repeat(32);
  sessionModuleMock.getServerSession.mockReset();
  setSessionCookie("mock-nextauth-jwt");
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

const VALID_SESSION = {
  user: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "ada@example.com",
    name: "Ada Lovelace",
  },
};

describe("BFF /api/auth/session (route handler)", () => {
  it("GET con sesión válida → 200 + { user, expiresAt } (sin `jwt` en la respuesta)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);

    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          jwt: "eyJhbGciOiJIUzI1NiJ9.PAYLOAD.SIGNATURE",
          expiresAt: "2026-06-26T22:00:00Z",
          user: {
            id: "11111111-1111-1111-1111-111111111111",
            email: "ada@example.com",
            name: "Ada Lovelace",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { GET } = await loadRoute();
    const res = await GET();

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user?: { id?: string; email?: string; name?: string };
      expiresAt?: string;
      jwt?: string;
    };
    expect(body.user).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
    expect(body.expiresAt).toBe("2026-06-26T22:00:00Z");
    expect(body.jwt).toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/auth/session");
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer mock-nextauth-jwt");
    expect(headers["X-BFF-Key"]).toBeUndefined();
  });

  it("GET sin sesión NextAuth → 401 (no se llama al backend)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(null);

    const { GET } = await loadRoute();
    const res = await GET();

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("GET con sesión pero sin id de usuario → 401", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce({
      user: { email: "ada@example.com", name: "Ada" },
    });

    const { GET } = await loadRoute();
    const res = await GET();

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
