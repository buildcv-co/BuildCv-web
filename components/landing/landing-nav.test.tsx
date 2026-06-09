import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LandingNav } from "./landing-nav";

// Mock next/navigation usePathname
const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

// Mock next/link to render plain anchors
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

  it("renderiza 2-3 links (Inicio, Analizar)", () => {
    mockPathname.mockReturnValue("/");
    render(<LandingNav />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.length).toBeLessThanOrEqual(3);
    expect(screen.getByRole("link", { name: /inicio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /analizar/i })).toBeInTheDocument();
  });

  it("marca aria-current='page' en 'Inicio' cuando pathname es '/'", () => {
    mockPathname.mockReturnValue("/");
    render(<LandingNav />);
    const inicio = screen.getByRole("link", { name: /inicio/i });
    expect(inicio.getAttribute("aria-current")).toBe("page");
  });

  it("marca aria-current='page' en 'Analizar' cuando pathname es '/analizar'", () => {
    mockPathname.mockReturnValue("/analizar");
    render(<LandingNav />);
    const analizar = screen.getByRole("link", { name: /analizar/i });
    expect(analizar.getAttribute("aria-current")).toBe("page");
  });

  it("NO marca aria-current en 'Inicio' cuando pathname es '/analizar'", () => {
    mockPathname.mockReturnValue("/analizar");
    render(<LandingNav />);
    const inicio = screen.getByRole("link", { name: /inicio/i });
    expect(inicio.hasAttribute("aria-current")).toBe(false);
  });

  it("marca aria-current='page' en 'Analizar' cuando pathname es '/analizar'", () => {
    mockPathname.mockReturnValue("/analizar");
    render(<LandingNav />);
    const analizar = screen.getByRole("link", { name: /analizar/i });
    expect(analizar).toHaveAttribute("aria-current", "page");
  });

  it("NO marca aria-current en 'Inicio' cuando pathname es '/analizar'", () => {
    mockPathname.mockReturnValue("/analizar");
    render(<LandingNav />);
    const inicio = screen.getByRole("link", { name: /inicio/i });
    expect(inicio).not.toHaveAttribute("aria-current", "page");
  });

  it("links son clickeables (no son botones)", async () => {
    mockPathname.mockReturnValue("/");
    const user = userEvent.setup();
    render(<LandingNav />);
    const inicio = screen.getByRole("link", { name: /inicio/i });
    expect(inicio.tagName).toBe("A");
    await user.click(inicio);
  });
});
