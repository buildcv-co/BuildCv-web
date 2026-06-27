import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

/**
 * Tests de `<UserMenu>` modo local (009-auth-web PR7 — T-PR7-006).
 *
 * Spec: REQ-FN-017 (AC#3) + Art. VII (modo local sin auth).
 *
 * Cuando `IS_LOCAL === true`:
 *  - El componente renderiza `null` (NO un placeholder, NO un skeleton).
 *  - El usuario anónimo en modo local NO debe ver UI de auth (no hay
 *    sesión, no la habrá — el backend está in-memory sin signup).
 *  - Garantiza "no flicker": ni siquiera un frame de skeleton debe aparecer.
 *
 * Garantía constitucional:
 *  - Art. VII: el modo local es para dev local; la UI debe reflejarlo
 *    sin invocar BFFs (no hay `getSession()` que pueda fallar).
 */

const useUserMenuMock = vi.hoisted(() => ({
  useUserMenu: vi.fn(),
  state: {
    status: "loading" as "loading" | "authenticated" | "unauthenticated",
    user: null as { email: string; name: string } | null,
  },
}));

vi.mock("@/lib/use-user-menu", () => ({
  useUserMenu: useUserMenuMock.useUserMenu,
}));

const signOutMock = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/lib/api/sign-out", () => signOutMock);

const authMock = vi.hoisted(() => ({ IS_LOCAL: false }));
vi.mock("@/lib/auth", () => authMock);

const copyMock = vi.hoisted(() => ({
  copy: {
    userMenu: {
      triggerLabel: (email: string) => `Menú de usuario (${email})`,
      triggerLoading: "Cargando menú de usuario",
      signIn: "Iniciar sesión",
      myAccount: "Mi cuenta",
      signOut: "Cerrar sesión",
      dialogLabel: "Menú de usuario",
      closeLabel: "Cerrar menú",
    },
  },
}));

vi.mock("@/lib/copy/es", () => copyMock);

beforeEach(() => {
  useUserMenuMock.state = { status: "loading", user: null };
  useUserMenuMock.useUserMenu.mockReset();
  useUserMenuMock.useUserMenu.mockImplementation(() => useUserMenuMock.state);
  signOutMock.signOut.mockReset();
  authMock.IS_LOCAL = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function loadUserMenu() {
  return await import("@/components/header/user-menu");
}

describe("<UserMenu> local-mode skip — T-PR7-006", () => {
  it("[Art. VII] renderiza null cuando IS_LOCAL === true (cualquier estado interno)", async () => {
    authMock.IS_LOCAL = true;
    // Simulamos authenticated: el componente AÚN debe renderizar null.
    useUserMenuMock.state = {
      status: "authenticated",
      user: { email: "ada@example.com", name: "Ada" },
    };

    const { UserMenu } = await loadUserMenu();
    const { container } = render(<UserMenu />);

    expect(container.firstChild).toBeNull();
    // No debe invocar signOut ni intentar abrir dialog.
    expect(signOutMock.signOut).not.toHaveBeenCalled();
    expect(useUserMenuMock.useUserMenu).not.toHaveBeenCalled();
  });

  it("[Art. VII] renderiza null incluso si status=loading en local mode (sin flicker)", async () => {
    authMock.IS_LOCAL = true;
    useUserMenuMock.state = { status: "loading", user: null };

    const { UserMenu } = await loadUserMenu();
    const { container } = render(<UserMenu />);

    expect(container.firstChild).toBeNull();
    // NO debe aparecer el skeleton (Art. VII no-flicker).
    expect(container.querySelector('[data-testid="user-menu-loading"]')).toBeNull();
    expect(useUserMenuMock.useUserMenu).not.toHaveBeenCalled();
  });

  it("contraste: en modo NO-local renderiza normalmente (no skip)", async () => {
    authMock.IS_LOCAL = false;
    useUserMenuMock.state = {
      status: "authenticated",
      user: { email: "ada@example.com", name: "Ada" },
    };

    const { UserMenu } = await loadUserMenu();
    const { container } = render(<UserMenu />);

    // En modo no-local SÍ renderiza el trigger.
    expect(container.firstChild).not.toBeNull();
    expect(
      container.querySelector('[data-testid="user-menu-trigger"]'),
    ).not.toBeNull();
    expect(useUserMenuMock.useUserMenu).toHaveBeenCalledTimes(1);
  });
});
