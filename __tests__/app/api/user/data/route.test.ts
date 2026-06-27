import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del BFF `/api/user/data` (route handler — GET + PUT + DELETE).
 *
 * 009-auth-web PR4 (T-PR4-003) + PR6 (T-PR6-003) — REQ-FN-011 / REQ-FN-015 /
 * REQ-FN-016 + NFR-XREPO-1 + NFR-RATE-1.
 *
 * La BFF:
 *  - Lee la sesión NextAuth vía `getServerSession`.
 *  - Si NO hay sesión → 401 (sin tocar el backend).
 *  - Si hay sesión → llama al backend con `Authorization: Bearer <backend-jwt>`.
 *    - GET → `/api/v1/user/data` (PR4).
 *    - PUT → `/api/v1/user/data` con body JSON (PR6, REQ-FN-015).
 *    - DELETE → `/api/v1/user/data` (PR6, REQ-FN-016).
 *  - 200 → JSON forward al cliente.
 *  - 400 → 400 con detail del backend (PR6, T-PR6-003).
 *  - 429 del backend → forward `Retry-After` header verbatim + status 429.
 *  - 5xx del backend → 502 al cliente + `console.warn` (no PII).
 *
 * Path canonical: `/api/user/data` (NO `/arco/*`, NO `/user/data/consent`).
 * Spec: REQ-FN-011, REQ-FN-015, REQ-FN-016.
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

describe("BFF /api/user/data PUT (route handler — T-PR6-003)", () => {
  it("PUT con body { name } + backend 200 → 200 + JSON forward (header Bearer)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    const updated = {
      ...USER_DATA,
      name: "Ada Lovelace v2",
      email: "new@example.com",
    };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(updated), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { PUT } = await loadRoute();
    const res = await PUT(
      new Request("http://test/api/user/data", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ada Lovelace v2", email: "new@example.com" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/user/data");
    // defensivo: nunca contra `/arco/*` ni `/user/data/consent`
    expect(calledUrl).not.toContain("/arco");
    expect(calledUrl).not.toContain("/consent");
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(calledInit.method).toBe("PUT");
    expect(calledInit.body).toBe(
      JSON.stringify({ name: "Ada Lovelace v2", email: "new@example.com" }),
    );
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer backend-jwt");
    const body = (await res.json()) as typeof updated;
    expect(body.name).toBe("Ada Lovelace v2");
    expect(body.email).toBe("new@example.com");
  });

  it("PUT + backend 400 → 400 al cliente con detail del backend", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: "https://tools.ietf.org/html/rfc9110",
          title: "One or more validation errors occurred.",
          status: 400,
          detail: "email: invalid format",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    );

    const { PUT } = await loadRoute();
    const res = await PUT(
      new Request("http://test/api/user/data", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { detail?: string };
    expect(body.detail).toBe("email: invalid format");
  });

  it("PUT + backend 429 + Retry-After: 60 → 429 al cliente + header forward verbatim", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Too many" }), {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    );

    const { PUT } = await loadRoute();
    const res = await PUT(
      new Request("http://test/api/user/data", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      }),
    );

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});

describe("BFF /api/user/data DELETE (route handler — T-PR6-003)", () => {
  it("DELETE sin body + backend 200 → 200 + JSON forward (NO llama a `/arco/cancel`)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    jwtModuleMock.getJwtFromSession.mockResolvedValueOnce({
      jwt: "backend-jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "User data deleted" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { DELETE } = await loadRoute();
    const res = await DELETE();

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/user/data");
    // defensivo: nunca contra legacy `/arco/cancel` ni `/user/data/consent`
    expect(calledUrl).not.toContain("/arco");
    expect(calledUrl).not.toContain("/consent");
    expect(calledUrl).not.toContain("/callback");
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(calledInit.method).toBe("DELETE");
    const headers = calledInit.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer backend-jwt");
    const body = (await res.json()) as { message?: string };
    expect(body.message).toBe("User data deleted");
  });

  it("DELETE sin sesión NextAuth → 401 (sin tocar el backend)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(null);

    const { DELETE } = await loadRoute();
    const res = await DELETE();

    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});