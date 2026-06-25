import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const cookiesMock = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: { providers: [], session: { strategy: "jwt" } },
  IS_LOCAL: false,
  LOCAL_USER_ID: "00000000-0000-0000-0000-000000000001",
  LOCAL_USER_EMAIL: "local@buildcv.dev",
  LOCAL_USER_NAME: "Local User",
  NEXT_AUTH_ISSUER: "buildcv-web",
  NEXT_AUTH_AUDIENCE: "buildcv-api",
}));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(cookiesMock()),
}));

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_ENV = { ...process.env };

async function loadJwtModule() {
  const mod = await import("@/lib/api/jwt");
  return mod;
}

function cookieStore(entries: Record<string, string>) {
  return {
    get: (name: string) => {
      const value = entries[name];
      return value ? { value } : undefined;
    },
  };
}

function sessionWithJwt(userId: string, jwtValue: string) {
  return { user: { id: userId, email: "u@x", name: "U" }, jwt: jwtValue } as never;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.resetModules();
  getServerSessionMock.mockReset();
  cookiesMock.mockReset();
  process.env.BACKEND_URL = "http://test-backend:5080";
  process.env.JWT_CACHE_TTL_SECONDS = "300";
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("getJwtFromSession", () => {
  it("ReturnsNull_WithoutSession: sin sesión o sin user.id → null sin tocar el backend", async () => {
    getServerSessionMock.mockResolvedValueOnce(null);
    const { getJwtFromSession, clearJwtCache } = await loadJwtModule();
    clearJwtCache();

    expect(await getJwtFromSession()).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();

    getServerSessionMock.mockResolvedValueOnce({ user: { name: "U" } });
    expect(await getJwtFromSession()).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("FetchesFromBackend_OnCacheMiss: pide backend JWT con Authorization Bearer del NextAuth cookie", async () => {
    getServerSessionMock.mockResolvedValueOnce(sessionWithJwt("user-1", "nextauth.jwt.value"));
    cookiesMock.mockReturnValueOnce(cookieStore({ "next-auth.session-token": "nextauth.jwt.value" }));
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        jwt: "backend.jwt.value",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: { id: "user-1", email: "u@x", name: "U" },
      }),
    );

    const { getJwtFromSession, clearJwtCache } = await loadJwtModule();
    clearJwtCache();

    const result = await getJwtFromSession();

    expect(result).toEqual({ jwt: "backend.jwt.value", userId: "user-1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/auth/session");
    expect((calledInit as RequestInit).method).toBe("GET");
    expect((calledInit as RequestInit).cache).toBe("no-store");
    const headers = (calledInit as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer nextauth.jwt.value");
  });

  it("ReturnsCached_OnCacheHit: dentro de la TTL no vuelve a llamar al backend", async () => {
    getServerSessionMock.mockResolvedValue(sessionWithJwt("user-2", "nextauth.jwt.value"));
    cookiesMock.mockReturnValue(cookieStore({ "next-auth.session-token": "nextauth.jwt.value" }));
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        jwt: "backend.jwt.value",
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        user: { id: "user-2", email: "u@x", name: "U" },
      }),
    );

    const { getJwtFromSession, clearJwtCache } = await loadJwtModule();
    clearJwtCache();

    const first = await getJwtFromSession();
    const second = await getJwtFromSession();
    const third = await getJwtFromSession();

    expect(first?.jwt).toBe("backend.jwt.value");
    expect(second?.jwt).toBe("backend.jwt.value");
    expect(third?.jwt).toBe("backend.jwt.value");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("InvalidatesCache_OnExpiry: cuando la entrada expira, vuelve a llamar al backend", async () => {
    vi.useFakeTimers();
    try {
      const baseTime = new Date("2026-01-01T00:00:00.000Z").getTime();
      vi.setSystemTime(baseTime);

      getServerSessionMock.mockResolvedValue(sessionWithJwt("user-3", "nextauth.jwt.value"));
      cookiesMock.mockReturnValue(cookieStore({ "next-auth.session-token": "nextauth.jwt.value" }));
      const fetchMock = vi.mocked(global.fetch);
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          jwt: "backend.jwt.first",
          expiresAt: new Date(baseTime + 1000).toISOString(),
          user: { id: "user-3", email: "u@x", name: "U" },
        }),
      );
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          jwt: "backend.jwt.second",
          expiresAt: new Date(baseTime + 60_000).toISOString(),
          user: { id: "user-3", email: "u@x", name: "U" },
        }),
      );

      const { getJwtFromSession, clearJwtCache } = await loadJwtModule();
      clearJwtCache();

      const first = await getJwtFromSession();
      vi.setSystemTime(baseTime + 2000);
      const second = await getJwtFromSession();

      expect(first?.jwt).toBe("backend.jwt.first");
      expect(second?.jwt).toBe("backend.jwt.second");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("HandlesBackendFailure: 401 del backend → null y no se cachea", async () => {
    getServerSessionMock.mockResolvedValue(sessionWithJwt("user-4", "nextauth.jwt.value"));
    cookiesMock.mockReturnValue(cookieStore({ "next-auth.session-token": "nextauth.jwt.value" }));
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue(new Response("unauthorized", { status: 401 }));

    const { getJwtFromSession, clearJwtCache } = await loadJwtModule();
    clearJwtCache();

    expect(await getJwtFromSession()).toBeNull();
    expect(await getJwtFromSession()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
