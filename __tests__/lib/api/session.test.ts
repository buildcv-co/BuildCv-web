import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del helper client-side `lib/api/session.ts`.
 *
 * 009-auth-web PR2 (Session refresh + sign-out helpers).
 *
 * `getSession()` y `refreshSession()` son helpers client-callable que
 * llaman al BFF same-origin `GET /api/auth/session`. NO hablan directo
 * con el backend (Constitution Art. VI).
 *
 * Contratos:
 *  - `getSession()` → `Promise<SessionInfo | null>` (null si 401).
 *  - `refreshSession()` → `Promise<SessionInfo>` (lanza `SessionExpiredError`
 *    si 401, NO retries infinitos — NFR-RES-1).
 *  - `SessionExpiredError extends Error` con `status: 401`.
 *  - Path canonical: `/api/auth/session` (NO `/session` legacy, NO
 *    `/api/v1/auth/session` directo).
 *  - NO expone `jwt`, `refreshToken`, `accessToken` ni headers auth al
 *    llamador (Constitution Art. III / CR-TOK-1).
 */

const ORIGINAL_FETCH = global.fetch;

async function loadSession() {
  return await import("@/lib/api/session");
}

beforeEach(() => {
  vi.resetModules();
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

const SESSION_PAYLOAD = {
  user: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "ada@example.com",
    name: "Ada Lovelace",
  },
  expiresAt: "2026-06-26T22:00:00Z",
};

describe("lib/api/session (client helpers)", () => {
  describe("getSession", () => {
    it("GET /api/auth/session (canonical) cuando backend 200 → devuelve { user, expiresAt }", async () => {
      const fetchMock = vi.mocked(global.fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(SESSION_PAYLOAD), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const { getSession } = await loadSession();
      const result = await getSession();

      expect(result).toEqual(SESSION_PAYLOAD);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      expect(calledUrl).toMatch(/^\/api\/auth\/session/);
      // Path canonical explícito: NO `/session` legacy (sin prefijo `/auth/`),
      // NO `/auth/sign-out`, NO direct backend.
      expect(calledUrl).not.toMatch(/^\/session$/);
      expect(calledUrl).not.toMatch(/^\/api\/session$/);
      expect(calledUrl).not.toContain("/api/v1/auth/session");
      expect(calledUrl).not.toContain("/auth/sign-out");
    });

    it("backend 401 → devuelve null (sin lanzar) — usuario no autenticado", async () => {
      const fetchMock = vi.mocked(global.fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "No session" }), { status: 401 }),
      );

      const { getSession } = await loadSession();
      const result = await getSession();

      expect(result).toBeNull();
    });

    it("backend 5xx → lanza SessionExpiredError con status=500 (controlled failure)", async () => {
      const fetchMock = vi.mocked(global.fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Upstream failed" }), { status: 502 }),
      );

      const { getSession, SessionExpiredError } = await loadSession();

      let caught: unknown;
      try {
        await getSession();
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(SessionExpiredError);
      expect((caught as InstanceType<typeof SessionExpiredError>).status).toBe(502);
    });
  });

  describe("refreshSession", () => {
    it("fuerza un fresh fetch (no cache) a /api/auth/session → devuelve { user, expiresAt }", async () => {
      const fetchMock = vi.mocked(global.fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(SESSION_PAYLOAD), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const { refreshSession } = await loadSession();
      const result = await refreshSession();

      expect(result).toEqual(SESSION_PAYLOAD);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = fetchMock.mock.calls[0]![0] as string;
      // cache-buster `?ts=` no cuenta para el path canonical
      expect(calledUrl).toMatch(/^\/api\/auth\/session/);
      expect(calledUrl).not.toMatch(/^\/session$/);
      expect(calledUrl).not.toMatch(/^\/api\/session$/);
    });

    it("backend 401 → lanza SessionExpiredError (controlled failure, NO infinite retry)", async () => {
      const fetchMock = vi.mocked(global.fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Session expired" }), { status: 401 }),
      );

      const { refreshSession, SessionExpiredError } = await loadSession();

      let caught: unknown;
      try {
        await refreshSession();
      } catch (err) {
        caught = err;
      }

      expect(caught).toBeInstanceOf(SessionExpiredError);
      expect((caught as InstanceType<typeof SessionExpiredError>).status).toBe(401);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("non-exposure (Constitution Art. III / CR-TOK-1)", () => {
    it("el helper NO incluye tokens ni headers Authorization en la respuesta expuesta al cliente", async () => {
      const fetchMock = vi.mocked(global.fetch);
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify(SESSION_PAYLOAD), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );

      const { getSession } = await loadSession();
      const result = await getSession();

      // El shape público: solo `user` + `expiresAt`. NO `jwt`,
      // `accessToken`, `refreshToken`, etc.
      const keys = result ? Object.keys(result).sort() : [];
      expect(keys).toEqual(["expiresAt", "user"]);
    });
  });
});
