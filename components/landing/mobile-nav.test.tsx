import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileNav } from "./mobile-nav";
import type { NavItem } from "./landing-nav";

const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

const ITEMS: ReadonlyArray<NavItem> = [
  { href: "/", label: "Inicio" },
  { href: "/analizar", label: "Analizar" },
  { href: "/importar", label: "Importar CV" },
  { href: "/suscripciones", label: "Suscripciones" },
  { href: "/auth/signin", label: "Iniciar sesión" },
];

beforeEach(() => {
  mockPathname.mockReset();
  mockPathname.mockReturnValue("/");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MobileNav", () => {
  it("renderiza el botón hamburguesa con aria-label 'Abrir menú' (REQ-NAV-003)", () => {
    render(<MobileNav items={ITEMS} />);
    const trigger = screen.getByTestId("mobile-nav-trigger");
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAccessibleName(/abrir menú/i);
  });

  it("el botón hamburguesa tiene aria-expanded='false' inicialmente", () => {
    render(<MobileNav items={ITEMS} />);
    const trigger = screen.getByTestId("mobile-nav-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("al clickear el hamburguesa, el dialog se abre y aria-expanded pasa a 'true'", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={ITEMS} />);
    const trigger = screen.getByTestId("mobile-nav-trigger");
    await user.click(trigger);
    const dialog = screen.getByTestId("mobile-nav-dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("Escape cierra el dialog y restaura foco en el hamburguesa (WCAG 2.4.3)", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={ITEMS} />);
    const trigger = screen.getByTestId("mobile-nav-trigger");
    await user.click(trigger);
    const dialog = screen.getByTestId("mobile-nav-dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    dialog.open = false;
    dialog.dispatchEvent(new Event("close"));
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("el botón Cerrar cierra el dialog y restaura foco en el hamburguesa", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={ITEMS} />);
    const trigger = screen.getByTestId("mobile-nav-trigger");
    await user.click(trigger);
    const closeBtn = screen.getByTestId("mobile-nav-close");
    await user.click(closeBtn);
    const dialog = screen.getByTestId("mobile-nav-dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("el dialog contiene los 5 items como anclas verticales", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={ITEMS} />);
    await user.click(screen.getByTestId("mobile-nav-trigger"));
    const dialog = screen.getByTestId("mobile-nav-dialog");
    const nav = within(dialog).getByRole("navigation", { name: /móvil/i });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(within(nav).getByRole("link", { name: /^inicio$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^analizar$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^importar cv$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^suscripciones$/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^iniciar sesión$/i })).toBeInTheDocument();
  });

  it("clickear un link de nav cierra el dialog", async () => {
    const user = userEvent.setup();
    render(<MobileNav items={ITEMS} />);
    await user.click(screen.getByTestId("mobile-nav-trigger"));
    const dialog = screen.getByTestId("mobile-nav-dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    const link = screen.getByTestId("mobile-nav-link-_importar");
    await user.click(link);
    expect(dialog.open).toBe(false);
  });

  it("cambio de ruta cierra el dialog (usePathname effect)", async () => {
    const user = userEvent.setup();
    mockPathname.mockReturnValue("/");
    const { rerender } = render(<MobileNav items={ITEMS} />);
    await user.click(screen.getByTestId("mobile-nav-trigger"));
    const dialog = screen.getByTestId("mobile-nav-dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    mockPathname.mockReturnValue("/analizar");
    rerender(<MobileNav items={ITEMS} />);
    expect(dialog.open).toBe(false);
  });
});