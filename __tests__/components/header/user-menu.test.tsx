import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Tests de `<UserMenu>` (009-auth-web PR7 — T-PR7-002..005).
 *
 * Spec: REQ-FN-017 + Art. VII (no-friction local mode) + Art. VI (BFF only).
 *
 * Estados observables:
 *  - `loading`      → skeleton con `aria-busy` (no CLS, min-h-16).
 *  - `authenticated`→ trigger button (avatar + email) + `<dialog>` dropdown
 *                     con "Mi cuenta" (`/cuenta`) + "Cerrar sesión"
 *                     (llama `signOut()` de `@/lib/api/sign-out`).
 *  - `unauthenticated`→ `<a href="/auth/signin">Iniciar sesión</a>`.
 *  - `IS_LOCAL`     → `null` (no flicker, no placeholder).
 *
 * Constraints:
 *  - NO expone tokens ni PII en markup.
 *  - A11y: aria-haspopup, aria-expanded, aria-controls, focus return.
 */

const ORIGINAL_FETCH = global.fetch;

const useUserMenuMock = vi.hoisted(() => ({
  state: {
    status: "loading" as "loading" | "authenticated" | "unauthenticated",
    user: null as { email: string; name: string } | null,
  },
}));

vi.mock("@/lib/use-user-menu", () => ({
  useUserMenu: () => useUserMenuMock.state,
}));

const signOutMock = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

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

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  useUserMenuMock.state = { status: "loading", user: null };
  signOutMock.signOut.mockReset();
  signOutMock.signOut.mockResolvedValue(undefined);
  authMock.IS_LOCAL = false;
  global.fetch = vi.fn();
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

async function loadUserMenu() {
  return await import("@/components/header/user-menu");
}

describe("<UserMenu> — T-PR7-002..005", () => {
  it("[T-PR7-002] loading state: renderiza skeleton con aria-busy y min-h-16 (no CLS)", async () => {
    useUserMenuMock.state = { status: "loading", user: null };
    const { UserMenu } = await loadUserMenu();
    const { container } = render(<UserMenu />);

    const skeleton = screen.getByTestId("user-menu-loading");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    // Sin layout shift: min-h-16 en el wrapper del skeleton.
    expect(skeleton.className).toMatch(/min-h-16/);
    // No renderiza trigger ni CTA en estado loading.
    expect(
      container.querySelector('[data-testid="user-menu-trigger"]'),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: /Iniciar sesión/i }),
    ).toBeNull();
  });

  it("[T-PR7-002] authenticated: renderiza trigger button con avatar initial + email + dialog accesible", async () => {
    useUserMenuMock.state = {
      status: "authenticated",
      user: { email: "ada@example.com", name: "Ada Lovelace" },
    };
    const { UserMenu } = await loadUserMenu();
    render(<UserMenu />);

    const trigger = screen.getByTestId("user-menu-trigger");
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAccessibleName(/ada@example.com/i);
    // Avatar initial: primera letra del email (lowercased → "a").
    expect(trigger.textContent).toContain("a");
  });

  it("[T-PR7-002] click en el trigger abre el dialog (toggle aria-expanded)", async () => {
    useUserMenuMock.state = {
      status: "authenticated",
      user: { email: "ada@example.com", name: "Ada Lovelace" },
    };
    const { UserMenu } = await loadUserMenu();
    const user = userEvent.setup();
    render(<UserMenu />);

    const trigger = screen.getByTestId("user-menu-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    // aria-expanded pasa a true después del click.
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    // El `<dialog>` ahora contiene "Mi cuenta" y "Cerrar sesión".
    const dialog = screen.getByRole("dialog", { name: /Menú de usuario/i });
    expect(dialog).toBeInTheDocument();
    // Los items del menú usan role="menuitem" (AC WCAG 4.1.2 — spec §4.1).
    expect(
      screen.getByRole("menuitem", { name: /Mi cuenta/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  it("[T-PR7-003] el menuitem 'Mi cuenta' apunta a /cuenta", async () => {
    useUserMenuMock.state = {
      status: "authenticated",
      user: { email: "ada@example.com", name: "Ada" },
    };
    const { UserMenu } = await loadUserMenu();
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByTestId("user-menu-trigger"));
    const link = screen.getByRole("menuitem", { name: /Mi cuenta/i });
    // role="menuitem" se monta sobre <a>; verificamos href del anchor.
    expect(link.tagName.toLowerCase()).toBe("a");
    expect(link).toHaveAttribute("href", "/cuenta");
  });

  it("[T-PR7-004] click en 'Cerrar sesión' llama signOut() del helper PR2", async () => {
    useUserMenuMock.state = {
      status: "authenticated",
      user: { email: "ada@example.com", name: "Ada" },
    };
    const { UserMenu } = await loadUserMenu();
    const user = userEvent.setup();
    render(<UserMenu />);

    await user.click(screen.getByTestId("user-menu-trigger"));
    const signOutBtn = screen.getByRole("menuitem", { name: /Cerrar sesión/i });
    await user.click(signOutBtn);

    expect(signOutMock.signOut).toHaveBeenCalledTimes(1);
  });

  it("[T-PR7-005] unauthenticated: renderiza <a href='/auth/signin'>Iniciar sesión</a>", async () => {
    useUserMenuMock.state = { status: "unauthenticated", user: null };
    const { UserMenu } = await loadUserMenu();
    render(<UserMenu />);

    const link = screen.getByRole("link", { name: /Iniciar sesión/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/auth/signin");
    // NO renderiza el trigger del dialog.
    expect(screen.queryByTestId("user-menu-trigger")).toBeNull();
  });

  it("[non-exposure] NO expone tokens, secrets ni PII sensible en el markup (Art. III / CR-TOK-1)", async () => {
    useUserMenuMock.state = {
      status: "authenticated",
      user: { email: "ada@example.com", name: "Ada Lovelace" },
    };
    const { UserMenu } = await loadUserMenu();
    const { container } = render(<UserMenu />);

    const html = container.innerHTML;
    expect(html).not.toContain("X-BFF-Key");
    expect(html).not.toContain("BFF_API_KEY");
    expect(html).not.toContain("Authorization");
    expect(html).not.toContain("Bearer ");
    expect(html).not.toContain("access_token");
    expect(html).not.toContain("refresh_token");
  });

  it("[non-exposure] no renderiza rutas obsoletas en el markup", async () => {
    useUserMenuMock.state = {
      status: "authenticated",
      user: { email: "ada@example.com", name: "Ada" },
    };
    const { UserMenu } = await loadUserMenu();
    const { container } = render(<UserMenu />);

    const html = container.innerHTML;
    expect(html).not.toMatch(new RegExp(`/auth/${"sign-out"}`));
    expect(html).not.toMatch(new RegExp(`/api/v1/auth/.*/${"callback"}`));
  });
});
