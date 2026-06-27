import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del BFF `POST /api/auth/refresh` (route handler).
 *
 * 009-auth-web PR2 (Session refresh + sign-out helpers).
 *
 * La BFF:
 *  - Proxy server-side hacia `POST /api/v1/auth/refresh`.
 *  - Body: `{ refreshToken: string }` (el refresh token viene del cliente).
 *  - Forward el body al backend tal cual; el backend es la autoridad para
 *    rotar tokens (NFR-SEC-2: refresh-token rotation invariant).
 *  - 200 → reenvía `{ accessToken, refreshToken, user }` al cliente.
 *  - 400 (backend) → propaga (refreshToken ausente o inválido).
 *  - 401 (backend) → propaga.
 *  - 5xx (backend) → 502.
 *
 * En v0.5 el refresh token NO vive en el cliente (Constitution Art. III /
 * CR-TOK-1). El helper client-side `refreshSession()` NO llama a esta ruta;
 * usa `GET /api/auth/session` para forzar un re-exchange. Esta ruta queda
 * como puerto tipado para v0.6 (cuando se decida cómo exponer refresh
 * tokens al cliente).
 *
 * Path canonical: `/api/auth/refresh` (NO `/auth/refresh` legacy en cliente,
 * NO `/auth/sign-out`).
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadRoute() {
  return await import("@/app/api/auth/refresh/route");
}

beforeEach(() => {
  vi.resetModules();
  process.env.BACKEND_URL = "http://test-backend:5080";
  process.env.NEXTAUTH_SECRET = "x".repeat(32);
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("BFF /api/auth/refresh (route handler)", () => {
  it("POST con refreshToken en body → 200 + body forward del backend (rotación)", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: "new-backend-jwt",
          refreshToken: "new-refresh-token",
          user: {
            userId: "11111111-1111-1111-1111-111111111111",
            provider: "google",
            email: "ada@example.com",
            name: "Ada Lovelace",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const { POST } = await loadRoute();
    const res = await POST(
      makePostRequest({ refreshToken: "old-refresh-token" }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      accessToken: "new-backend-jwt",
      refreshToken: "new-refresh-token",
      user: {
        userId: "11111111-1111-1111-1111-111111111111",
        provider: "google",
        email: "ada@example.com",
        name: "Ada Lovelace",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/auth/refresh");
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(calledInit.method).toBe("POST");
    expect(calledInit.body).toBe(JSON.stringify({ refreshToken: "old-refresh-token" }));
  });

  it("POST sin refreshToken en body → 400 (no se llama al backend)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(makePostRequest({}));

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBeDefined();
  });

  it("POST con JSON malformado → 400 (no se llama al backend)", async () => {
    const { POST } = await loadRoute();
    const res = await POST(makePostRequest("{not json"));

    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("POST cuando backend retorna 401 → propaga 401 al cliente con el detail upstream", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: "https://buildcv.com/errors/auth",
          title: "AUTH/REFRESH_TOKEN_INVALID",
          status: 401,
          detail: "Refresh token is invalid or has been revoked",
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    );

    const { POST } = await loadRoute();
    const res = await POST(makePostRequest({ refreshToken: "stale-token" }));

    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      title?: string;
      detail?: string;
    };
    expect(body.detail).toBe("Refresh token is invalid or has been revoked");
    expect(body.title).toBe("AUTH/REFRESH_TOKEN_INVALID");
  });
});
