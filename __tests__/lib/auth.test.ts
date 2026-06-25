import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadAuth() {
  return await import("@/lib/auth");
}

beforeEach(() => {
  vi.resetModules();
  process.env.BACKEND_URL = "http://test-backend:5080";
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
  vi.restoreAllMocks();
});

describe("authOptions", () => {
  it("registra Google y LinkedIn como providers, firma JWT de sesión por 7 días y apunta /auth/signin", async () => {
    const { authOptions } = await loadAuth();
    const providerIds = authOptions.providers.map((p) => p.id);
    expect(providerIds).toContain("google");
    expect(providerIds).toContain("linkedin");
    expect(authOptions.session?.strategy).toBe("jwt");
    expect(authOptions.session?.maxAge).toBe(7 * 24 * 60 * 60);
    expect(authOptions.pages?.signIn).toBe("/auth/signin");
  });

  it("signIn: llama al backend con provider/providerId/email/name y guarda backendUserId en user", async () => {
    const { authOptions } = await loadAuth();
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ userId: "11111111-1111-1111-1111-111111111111" }), {
        status: 200,
      }),
    );

    const signIn = authOptions.callbacks?.signIn;
    expect(signIn).toBeDefined();
    const user = { email: "ana@example.com", name: "Ana" } as { email?: string | null; name?: string | null; backendUserId?: string };
    const result = await signIn!({
      user: user as never,
      account: { provider: "google", providerAccountId: "google-sub-123" } as never,
    } as never);

    expect(result).toBe(true);
    expect(user.backendUserId).toBe("11111111-1111-1111-1111-111111111111");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe("http://test-backend:5080/api/v1/auth/google/callback");
    expect((calledInit as RequestInit).method).toBe("POST");
    const body = JSON.parse(((calledInit as RequestInit).body as string) ?? "{}");
    expect(body).toEqual({ providerId: "google-sub-123", email: "ana@example.com", name: "Ana" });
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
