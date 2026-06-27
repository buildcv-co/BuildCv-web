import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests del helper client-side `lib/api/sign-out.ts`.
 *
 * 009-auth-web PR2 + PR6 (T-PR6-001..012 — ARCO flow reuses signOut).
 *
 * `signOut()` ejecuta el flujo de cierre de sesión en 2 pasos:
 *  1. Llama `signOut({redirect: false})` de `next-auth/react` para
 *     limpiar la cookie NextAuth session.
 *  2. POST `/api/auth/logout` (BFF) que revoca los refresh tokens
 *     del backend y limpia el cache BFF server-side.
 *
 * **IMPORTANTE (PR6 split)**: el cache BFF (`lib/api/jwt.ts`) es server-only
 * (importa `next/headers`). El cliente NO puede importarlo directamente —
 * la limpieza del cache se hace server-side en el BFF logout handler
 * (`app/api/auth/logout/route.ts:65 + 80`). R-LOCAL-MODE-CACHE se mantiene
 * porque el BFF siempre llama `clearJwtCache()` después del revoke.
 *
 * Propiedades (Constitution Art. III, IV, VII / REQ-FN-007):
 *  - **Idempotente**: llamar dos veces es seguro (sin throw).
 *  - **Best-effort en BFF 5xx**: si el BFF falla, el cache igual se
 *    limpia server-side (no infinite retry, no silent failure).
 *  - **NO expone tokens**: ni en URL, ni en body, ni en logs.
 *  - **Path canonical**: `/api/auth/logout` (NO `/auth/sign-out`).
 */

const ORIGINAL_FETCH = global.fetch;

async function loadSignOut() {
  return await import("@/lib/api/sign-out");
}

const nextAuthMock = {
  signOut: vi.fn(),
};

vi.mock("next-auth/react", () => nextAuthMock);

beforeEach(() => {
  vi.resetModules();
  nextAuthMock.signOut.mockReset();
  global.fetch = vi.fn();
  vi.mocked(global.fetch).mockResolvedValue(
    new Response(JSON.stringify({ message: "Logged out" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("lib/api/sign-out (client helper)", () => {
  it("ejecuta los 2 pasos en orden: NextAuth signOut → BFF logout", async () => {
    const callOrder: string[] = [];
    nextAuthMock.signOut.mockImplementation(async () => {
      callOrder.push("nextauth.signOut");
    });
    vi.mocked(global.fetch).mockImplementation(async () => {
      callOrder.push("fetch.bff.logout");
      return new Response(JSON.stringify({ message: "Logged out" }), { status: 200 });
    });

    const { signOut } = await loadSignOut();
    await signOut();

    expect(callOrder).toEqual(["nextauth.signOut", "fetch.bff.logout"]);
    expect(nextAuthMock.signOut).toHaveBeenCalledTimes(1);
    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toBe("/api/auth/logout");
    expect(calledUrl).not.toContain("/auth/sign-out");
  });

  it("usa POST /api/auth/logout (canonical) — NO /auth/sign-out legacy", async () => {
    const { signOut } = await loadSignOut();
    await signOut();

    const fetchMock = vi.mocked(global.fetch);
    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    const calledInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(calledUrl).toBe("/api/auth/logout");
    expect(calledUrl).not.toMatch(/^\/auth\/sign-out/);
    expect(calledUrl).not.toMatch(/^\/sign-out/);
    expect(calledInit.method).toBe("POST");
  });

  it("BFF 500 (best-effort): NO lanza, NO infinite retry, console.warn", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Internal" }), { status: 500 }),
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { signOut } = await loadSignOut();
    let threw: unknown = null;
    try {
      await signOut();
    } catch (err) {
      threw = err;
    }

    expect(threw).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    expect(vi.mocked(global.fetch)).toHaveBeenCalledTimes(1); // no infinite retry
    warnSpy.mockRestore();
  });

  it("BFF 401 (sesión ya expiró): handled gracefully — no error UX", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "No session" }), { status: 401 }),
    );

    const { signOut } = await loadSignOut();
    let threw: unknown = null;
    try {
      await signOut();
    } catch (err) {
      threw = err;
    }

    expect(threw).toBeNull();
  });

  it("**Idempotente**: llamar dos veces seguidas es seguro, sin throw", async () => {
    const { signOut } = await loadSignOut();
    await signOut();
    await signOut();

    expect(nextAuthMock.signOut).toHaveBeenCalledTimes(2);
  });

  it("**Non-exposure** (Art. III / CR-TOK-1): no se loguean tokens ni se exponen en payload", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "Logged out" }), { status: 200 }),
    );

    const { signOut } = await loadSignOut();
    await signOut();

    expect(warnSpy).not.toHaveBeenCalled();
    const calledInit = vi.mocked(global.fetch).mock.calls[0]![1] as RequestInit;
    expect(calledInit.body ?? null).toBeNull();
    warnSpy.mockRestore();
  });
});