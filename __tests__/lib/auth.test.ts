import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests de `lib/auth.ts` (NextAuth config + events.signIn).
 *
 * PR1 cierra el contract drift original (`signIn` callback POSTeaba a
 * `/api/v1/auth/${provider}/callback` con `{providerId, email, name}`).
 * Ahora el flujo correcto es:
 *   1. NextAuth completa el OAuth dance con Google/LinkedIn.
 *   2. `events.signIn` hook llama `registerWithBackend` con
 *      `{ provider, providerAccountId, email, name }`.
 *   3. `registerWithBackend` POSTea a `/api/v1/auth/web-signup`
 *      con header `X-BFF-Key`.
 *
 * REQ-FN-020 (spec 009-auth-web): los tests obsoletos se ACTUALIZAN, no se
 * borran silenciosamente. Por eso reemplazamos la asserción original
 * ("signIn callback POSTea a /callback") por dos nuevas asserciones.
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

const adapterMock = {
  registerWithBackend: vi.fn(),
  AuthAdapterError: class AuthAdapterError extends Error {
    constructor(public readonly status: number, public readonly detail: string) {
      super(`AuthAdapterError(${status}): ${detail}`);
      this.name = "AuthAdapterError";
    }
  },
};

async function loadAuth() {
  return await import("@/lib/auth");
}

beforeEach(() => {
  vi.resetModules();
  vi.doMock("@/lib/api/auth-adapter", () => adapterMock);
  adapterMock.registerWithBackend.mockReset();
  process.env.BACKEND_URL = "http://test-backend:5080";
  process.env.BFF_API_KEY = "test-bff-key";
  process.env.GOOGLE_CLIENT_ID = "google-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";
  process.env.LINKEDIN_CLIENT_ID = "linkedin-id";
  process.env.LINKEDIN_CLIENT_SECRET = "linkedin-secret";
  process.env.NEXTAUTH_SECRET = "x".repeat(32);
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  vi.doUnmock("@/lib/api/auth-adapter");
  vi.restoreAllMocks();
});

describe("authOptions (config)", () => {
  it("registra Google y LinkedIn como providers, firma JWT de sesión por 7 días y apunta /auth/signin", async () => {
    const { authOptions } = await loadAuth();
    const providerIds = authOptions.providers.map((p) => p.id);
    expect(providerIds).toContain("google");
    expect(providerIds).toContain("linkedin");
    expect(authOptions.session?.strategy).toBe("jwt");
    expect(authOptions.session?.maxAge).toBe(7 * 24 * 60 * 60);
    expect(authOptions.pages?.signIn).toBe("/auth/signin");
  });

  // REQ-FN-020: la asserción original "signIn callback POSTea a /callback
  // con {providerId, email, name}" se reemplaza por esta nueva asserción
  // que verifica que el callback `signIn` ya NO existe (la lógica vive en
  // `events.signIn` ahora).
  it("NO expone un callback `signIn` en `authOptions.callbacks` (PR1 contract fix)", async () => {
    const { authOptions } = await loadAuth();
    expect(authOptions.callbacks?.signIn).toBeUndefined();
  });

  it("callbacks: jwt propaga backendUserId→sub en login, session expone sub como user.id", async () => {
    const { authOptions } = await loadAuth();
    const jwt = authOptions.callbacks?.jwt;
    const sessionCb = authOptions.callbacks?.session;
    expect(jwt).toBeDefined();
    expect(sessionCb).toBeDefined();

    const tokenAfterLogin = await jwt!({
      token: { sub: "old", email: "old@x", name: "old" } as never,
      user: { backendUserId: "user-1", email: "ana@example.com", name: "Ana" } as never,
    } as never);
    expect(tokenAfterLogin.sub).toBe("user-1");
    expect(tokenAfterLogin.email).toBe("ana@example.com");
    expect(tokenAfterLogin.name).toBe("Ana");

    const tokenAfterRefresh = await jwt!({
      token: { sub: "user-1", email: "a@x", name: "A" } as never,
    } as never);
    expect(tokenAfterRefresh.sub).toBe("user-1");

    const session = await sessionCb!({
      session: { user: { name: "x", email: "x@x" } } as never,
      token: { sub: "user-99" } as never,
    } as never);
    expect((session.user as { id?: string }).id).toBe("user-99");
  });
});

describe("events.signIn hook (PR1 — adapter wiring)", () => {
  it("`events.signIn` llama `registerWithBackend` con `{ provider, providerAccountId, email, name }`", async () => {
    const { authOptions } = await loadAuth();
    adapterMock.registerWithBackend.mockResolvedValueOnce({
      userId: "99999999-9999-9999-9999-999999999999",
    });

    const hook = authOptions.events?.signIn;
    expect(hook).toBeDefined();

    await hook!({
      user: { email: "ana@example.com", name: "Ana" } as never,
      account: { provider: "google", providerAccountId: "google-sub-1" } as never,
      isNewUser: true,
    } as never);

    expect(adapterMock.registerWithBackend).toHaveBeenCalledTimes(1);
    expect(adapterMock.registerWithBackend).toHaveBeenCalledWith({
      provider: "google",
      providerAccountId: "google-sub-1",
      email: "ana@example.com",
      name: "Ana",
    });

    // CRÍTICO: el `events.signIn` hook NO emite un fetch directo a ningún
    // path del backend (Constitution Art. VI — el browser y los callbacks
    // de NextAuth no deben saltarse el adapter/BFF).
    const fetchMock = vi.mocked(global.fetch);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("`events.signIn` mapea LinkedIn con `provider='linkedin'` y NO usa `providerId` legacy", async () => {
    const { authOptions } = await loadAuth();
    adapterMock.registerWithBackend.mockResolvedValueOnce({
      userId: "li-uid-1",
    });

    await authOptions.events!.signIn!({
      user: { email: "l@linkedin.com", name: "L User" } as never,
      account: { provider: "linkedin", providerAccountId: "linkedin-id-1" } as never,
    } as never);

    const callArg = adapterMock.registerWithBackend.mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(callArg["provider"]).toBe("linkedin");
    expect(callArg["providerAccountId"]).toBe("linkedin-id-1");
    expect(callArg).not.toHaveProperty("providerId");
  });

  it("`events.signIn` no-ops silenciosamente (console.warn) si el adapter falla 5xx; NO bloquea sign-in", async () => {
    const { authOptions } = await loadAuth();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { AuthAdapterError } = await import("@/lib/api/auth-adapter");
    adapterMock.registerWithBackend.mockRejectedValueOnce(
      new (AuthAdapterError as unknown as new (
        s: number,
        d: string,
      ) => Error)(502, "upstream failed"),
    );

    await expect(
      authOptions.events!.signIn!({
        user: { email: "x@y.co", name: "X" } as never,
        account: { provider: "google", providerAccountId: "g-1" } as never,
      } as never),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
  });

  // MINOR-1 (fresh review PR1): el profile OAuth puede llegar SIN `name`
  // (p.ej. cuentas de Google sin display name público). El adapter POSTearía
  // `{name: ""}` al backend, que responde 400 (`name` required per
  // `WebSignupHandler.cs:30-33`), y el hook se lo traga silenciosamente.
  // Consecuencia: el usuario queda signed-in en NextAuth pero sin registro
  // en backend → 401 en `/cuenta` en el primer GET protegido.
  //
  // Fix: el hook valida `name` no-vacío (igual que provider/email/etc.).
  // Si falta, NO se invoca el adapter (sería un 400 garantizado) y se emite
  // un `console.warn` explícito (Art. III honest-signal, sin PII). El
  // best-effort de sign-in se preserva (R1-A): no lanzamos, no bloqueamos.
  it("`events.signIn` NO llama `registerWithBackend` cuando `name` está vacío (perfil OAuth sin display name) y emite `console.warn` explícito", async () => {
    const { authOptions } = await loadAuth();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.mocked(global.fetch);

    await authOptions.events!.signIn!({
      user: { email: "anon@example.com", name: "" } as never,
      account: { provider: "google", providerAccountId: "google-anon-1" } as never,
    } as never);

    expect(adapterMock.registerWithBackend).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // El warning NO debe llevar el email del usuario (Art. III no-PII).
    const warnMessage = String(warnSpy.mock.calls[0]?.[0] ?? "");
    expect(warnMessage).not.toContain("anon@example.com");
    expect(warnMessage.toLowerCase()).toContain("name");
  });

  // Triangulación: el caso real más común (NextAuth pasa `name: undefined`
  // cuando el profile OAuth no incluye el claim). Debe disparar el mismo
  // gate que `name: ""` — son semánticamente equivalentes para la
  // validación, pero cubren dos puntos del flujo de NextAuth.
  it("`events.signIn` NO llama `registerWithBackend` cuando `name` es `undefined` (claim ausente en el profile OAuth)", async () => {
    const { authOptions } = await loadAuth();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.mocked(global.fetch);

    await authOptions.events!.signIn!({
      user: { email: "u@example.com", name: undefined } as never,
      account: { provider: "linkedin", providerAccountId: "li-no-name-1" } as never,
    } as never);

    expect(adapterMock.registerWithBackend).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});