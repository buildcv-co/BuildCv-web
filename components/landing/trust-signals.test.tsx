import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrustSignals } from "./trust-signals";

vi.mock("@/lib/copy/es", () => ({
  copy: {
    landing: {
      trust: {
        openSource: {
          label: "Código abierto",
          href: "https://github.com/buildcv-co/BuildCv-web",
        },
        constitution: {
          label: "Constitution v1.1.0 ratificada",
          href: "/constitution",
        },
        tests: {
          label: "1150 tests automatizados · 0 supresiones",
          count: 1150,
        },
      },
    },
  },
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

describe("TrustSignals", () => {
  it("renderiza 3 badges visibles", () => {
    render(<TrustSignals />);
    expect(screen.getByText("Código abierto")).toBeInTheDocument();
    expect(screen.getByText("Constitution v1.1.0 ratificada")).toBeInTheDocument();
    expect(screen.getByText("1150 tests automatizados · 0 supresiones")).toBeInTheDocument();
  });

  it("el badge 'Código abierto' es un link externo al repo de GitHub", () => {
    render(<TrustSignals />);
    const link = screen.getByRole("link", { name: /código abierto/i });
    expect(link).toHaveAttribute("href", "https://github.com/buildcv-co/BuildCv-web");
  });

  it("el link externo tiene target='_blank' y rel='noopener noreferrer'", () => {
    render(<TrustSignals />);
    const link = screen.getByRole("link", { name: /código abierto/i });
    expect(link).toHaveAttribute("target", "_blank");
    const rel = link.getAttribute("rel") ?? "";
    expect(rel).toMatch(/noopener/);
    expect(rel).toMatch(/noreferrer/);
  });

  it("el badge de Constitution es un link interno (sin target/rel externos)", () => {
    render(<TrustSignals />);
    const link = screen.getByRole("link", { name: /constitution/i });
    expect(link).toHaveAttribute("href", "/constitution");
    // No target ni rel externos (link interno)
    expect(link).not.toHaveAttribute("target", "_blank");
    expect(link).not.toHaveAttribute("rel");
  });

  it("el badge de tests es solo texto (no es link)", () => {
    render(<TrustSignals />);
    // No debe haber un link que apunte a algo de 'tests'
    const allLinks = screen.queryAllByRole("link");
    for (const link of allLinks) {
      expect(link.textContent).not.toMatch(/1150 tests/i);
    }
  });
});
