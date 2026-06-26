import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

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

const authMock = vi.hoisted(() => ({ IS_LOCAL: false }));
vi.mock("@/lib/auth", () => authMock);

import { SiteHeader } from "./site-header";

beforeEach(() => {
  mockPathname.mockReset();
  mockPathname.mockReturnValue("/");
  authMock.IS_LOCAL = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SiteHeader", () => {
  it("renderiza un <header> con role='banner' (landmark top-level)", () => {
    const { container } = render(<SiteHeader />);
    const banner = screen.getByRole("banner");
    expect(banner).toBe(container.querySelector("header"));
  });

  it("renderiza el brand mark como <Link> a '/' con el nombre de la app", () => {
    render(<SiteHeader />);
    const brand = screen.getByTestId("brand-mark");
    expect(brand.tagName).toBe("A");
    expect(brand).toHaveAttribute("href", "/");
    expect(brand).toHaveTextContent(/buildcv/i);
  });

  it("renderiza <LandingNav> en su composición", () => {
    render(<SiteHeader />);
    expect(
      screen.getByRole("navigation", { name: /principal/i }),
    ).toBeInTheDocument();
  });

  it("renderiza el LocalModePill cuando IS_LOCAL === true", () => {
    authMock.IS_LOCAL = true;
    render(<SiteHeader />);
    expect(screen.getByTestId("local-mode-pill")).toBeInTheDocument();
  });

  it("NO renderiza el wrapper de extras cuando la prop `extras` está ausente", () => {
    const { container } = render(<SiteHeader />);
    expect(container.querySelector('[data-testid="header-extras"]')).toBeNull();
  });

  it("renderiza el wrapper de extras (con sus children) cuando la prop `extras` está presente", () => {
    render(
      <SiteHeader
        extras={<span data-testid="fake-credit-badge">42 créditos</span>}
      />,
    );
    const wrapper = screen.getByTestId("header-extras");
    expect(wrapper).toBeInTheDocument();
    expect(screen.getByTestId("fake-credit-badge")).toBeInTheDocument();
  });

  it("produce exactamente UN <header> en el DOM (anti-doble-render)", () => {
    const { container } = render(<SiteHeader />);
    expect(container.querySelectorAll("header").length).toBe(1);
  });

  it("reserva espacio para evitar CLS: el wrapper tiene min-h-16", () => {
    const { container } = render(<SiteHeader />);
    const banner = container.querySelector("header");
    expect(banner?.className ?? "").toMatch(/min-h-16/);
  });

  it("monta <MobileNav> con los mismos items que <LandingNav> consume de NAV_ITEMS", () => {
    render(<SiteHeader />);
    expect(screen.getByTestId("mobile-nav-trigger")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-dialog")).toBeInTheDocument();
  });

  it("MobileNav y LandingNav conviven en el DOM (hidden sm:flex + sm:hidden hacen el switch responsive)", () => {
    const { container } = render(<SiteHeader />);
    expect(
      container.querySelector('[data-testid="mobile-nav-trigger"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /principal/i }),
    ).toBeInTheDocument();
  });
});