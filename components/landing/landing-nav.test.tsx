import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingNav } from "./landing-nav";

const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

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
  mockPathname.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LandingNav", () => {
  it("renderiza con role='navigation' y aria-label", () => {
    mockPathname.mockReturnValue("/");
    render(<LandingNav />);
    const nav = screen.getByRole("navigation", { name: /principal/i });
    expect(nav).toBeInTheDocument();
  });

  it("renderiza 5 links: Inicio, Analizar, Importar CV, Suscripciones, Iniciar sesión", () => {
    mockPathname.mockReturnValue("/");
    render(<LandingNav />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(5);
    expect(screen.getByRole("link", { name: /^inicio$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^analizar$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^importar cv$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^suscripciones$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^iniciar sesión$/i })).toBeInTheDocument();
  });

  it.each([
    ["/", "Inicio"],
    ["/analizar", "Analizar"],
    ["/importar", "Importar CV"],
    ["/suscripciones", "Suscripciones"],
    ["/auth/signin", "Iniciar sesión"],
  ] as const)(
    "marca aria-current='page' en '%s' cuando pathname es '%s'",
    (pathname, expectedActiveLabel) => {
      mockPathname.mockReturnValue(pathname);
      render(<LandingNav />);
      const link = screen.getByRole("link", { name: new RegExp(`^${expectedActiveLabel}$`, "i") });
      expect(link).toHaveAttribute("aria-current", "page");
      const nav = screen.getByRole("navigation", { name: /principal/i });
      const others = within(nav)
        .getAllByRole("link")
        .filter((l) => l !== link);
      for (const other of others) {
        expect(other).not.toHaveAttribute("aria-current", "page");
      }
    },
  );

  it.each([
    ["/analizar/iterate", "Analizar"],
    ["/analizar/diff", "Analizar"],
    ["/analizar/editar", "Analizar"],
    ["/importar/alguna-subruta", "Importar CV"],
    ["/suscripciones/planes", "Suscripciones"],
  ] as const)(
    "marca el padre como activo para nested route '%s'",
    (pathname, expectedParentLabel) => {
      mockPathname.mockReturnValue(pathname);
      render(<LandingNav />);
      const parent = screen.getByRole("link", {
        name: new RegExp(`^${expectedParentLabel}$`, "i"),
      });
      expect(parent).toHaveAttribute("aria-current", "page");
      const inicio = screen.getByRole("link", { name: /^inicio$/i });
      expect(inicio).not.toHaveAttribute("aria-current", "page");
    },
  );

  it("los items son anclas <a> reales, no botones", () => {
    mockPathname.mockReturnValue("/");
    render(<LandingNav />);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.tagName).toBe("A");
    }
  });

  it("Suscripciones e Iniciar sesión son siempre visibles en PR1 (sin filtro auth todavía)", () => {
    mockPathname.mockReturnValue("/");
    render(<LandingNav />);
    expect(screen.getByRole("link", { name: /^suscripciones$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^iniciar sesión$/i })).toBeInTheDocument();
  });

  it("expone el flag requiresAuth en el shape NavItem (sin uso todavía — reservado para 009-auth-web)", () => {
    mockPathname.mockReturnValue("/");
    render(<LandingNav />);
    const link = screen.getByRole("link", { name: /^suscripciones$/i });
    expect(link).toBeInTheDocument();
  });

  it("el link Inicio tiene href='/' y es clickeable", async () => {
    mockPathname.mockReturnValue("/");
    const user = userEvent.setup();
    render(<LandingNav />);
    const inicio = screen.getByRole("link", { name: /^inicio$/i });
    expect(inicio).toHaveAttribute("href", "/");
    expect(inicio.tagName).toBe("A");
    await user.click(inicio);
  });
});