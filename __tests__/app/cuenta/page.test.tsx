import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * Tests de la página `/cuenta` (009-auth-web PR4 — T-PR4-004..006).
 *
 * Comportamiento (REQ-FN-010 + REQ-FN-011):
 *  - Sin sesión NextAuth → `redirect('/auth/signin?callbackUrl=/cuenta')`.
 *  - Con sesión + GET user-data OK → 3 secciones visibles con ids estables
 *    (`#datos-personales`, `#consent`, `#arco`).
 *  - Con sesión + GET user-data lanza `RateLimitError` → banner inline con
 *    copy rate-limit (REQ-FN-018).
 *  - Con sesión + GET user-data lanza otro error → banner genérico.
 *
 * Constitution: la página NUNCA loguea PII (Art. III / NFR-OBS-1) y NO
 * expone tokens al cliente (Art. III / CR-TOK-1).
 */

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = global.fetch;

async function loadPage() {
  return await import("@/app/cuenta/page");
}

const nextServerModuleMock = {
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
};

const sessionModuleMock = { getServerSession: vi.fn() };
const userDataModuleMock = {
  getUserData: vi.fn(),
  RateLimitError: class RateLimitError extends Error {
    public readonly retryAfter: Date | null;
    constructor(retryAfter: Date | null, detail: string) {
      super(`RateLimitError: ${detail}`);
      this.name = "RateLimitError";
      this.retryAfter = retryAfter;
    }
  },
  UserDataError: class UserDataError extends Error {
    public readonly status: number;
    constructor(status: number, detail: string) {
      super(`UserDataError(${status}): ${detail}`);
      this.name = "UserDataError";
      this.status = status;
    }
  },
};

vi.mock("next/navigation", () => nextServerModuleMock);
vi.mock("next-auth", () => sessionModuleMock);
vi.doMock("@/lib/api/user-data", () => userDataModuleMock);

const VALID_SESSION = {
  user: { id: "11111111-1111-1111-1111-111111111111" },
};

const SAMPLE_USER_DATA = {
  userId: "11111111-1111-1111-1111-111111111111",
  provider: "google" as const,
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-06-25T10:00:00Z",
  lastLoginAt: "2026-06-26T08:00:00Z",
};

beforeEach(() => {
  vi.resetModules();
  process.env.BACKEND_URL = "http://test-backend:5080";
  vi.doMock("@/lib/api/user-data", () => userDataModuleMock);
  nextServerModuleMock.redirect.mockClear();
  sessionModuleMock.getServerSession.mockReset();
  userDataModuleMock.getUserData.mockReset();
  global.fetch = vi.fn();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("Página /cuenta (server component)", () => {
  it("redirige a `/auth/signin?callbackUrl=/cuenta` cuando NO hay sesión NextAuth", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(null);

    const Page = await loadPage();

    await expect(Page.default()).rejects.toThrow(
      "NEXT_REDIRECT:/auth/signin?callbackUrl=/cuenta",
    );
    expect(nextServerModuleMock.redirect).toHaveBeenCalledWith(
      "/auth/signin?callbackUrl=/cuenta",
    );
    // Defensivo: nunca contra paths legacy (defensive greps coverage).
    expect(userDataModuleMock.getUserData).not.toHaveBeenCalled();
  });

  it("renderiza 3 secciones con ids estables cuando hay sesión + GET user-data OK", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    userDataModuleMock.getUserData.mockResolvedValueOnce(SAMPLE_USER_DATA);

    const Page = await loadPage();
    const tree = await Page.default();
    const html = renderToStaticMarkup(tree);

    // Verificamos los ids estables (anclas para <UserMenu> PR7 + e2e PR8).
    expect(html).toContain('id="datos-personales"');
    expect(html).toContain('id="consent"');
    expect(html).toContain('id="arco"');
    // Datos personales: email + provider visible.
    expect(html).toContain("ada@example.com");
    expect(html).toContain("Google");
    // Slots son placeholders (PR5/PR6 los llenan).
    expect(html).toContain('data-slot="consent"');
    expect(html).toContain('data-slot="arco"');
  });

  it("renderiza banner inline de rate-limit cuando GET user-data lanza `RateLimitError`", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    const future = new Date(Date.now() + 30_000);
    userDataModuleMock.getUserData.mockImplementationOnce(async () => {
      throw new userDataModuleMock.RateLimitError(future, "Too many");
    });

    const Page = await loadPage();
    const tree = await Page.default();
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('data-error-kind="rate-limit"');
    expect(html).toContain("Demasiadas solicitudes");
    // No propagamos el error (REQ-FN-018 + NFR-RES-1: error controlado).
  });

  it("renderiza banner genérico cuando GET user-data lanza otro error (no PII en HTML)", async () => {
    sessionModuleMock.getServerSession.mockResolvedValueOnce(VALID_SESSION);
    userDataModuleMock.getUserData.mockImplementationOnce(async () => {
      throw new Error("network boom");
    });

    const Page = await loadPage();
    const tree = await Page.default();
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('data-state="error"');
    expect(html).toContain("No pudimos cargar tus datos");
    // El mensaje crudo NO debe aparecer (Art. IV honesto, Art. III sin PII).
    expect(html).not.toContain("network boom");
  });
});