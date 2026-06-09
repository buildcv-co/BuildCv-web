import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "./severity-badge";
import type { EntityInvention, ValidationReport } from "@/lib/api/types";

function report(severity: "None" | "Warning" | "Critical", inventions: EntityInvention[] = []): ValidationReport {
  return { isValid: severity !== "Critical", severity, inventions, warnings: [] };
}

describe("SeverityBadge", () => {
  it("renderiza label de severidad None (verde/present)", () => {
    render(<SeverityBadge report={report("None")} />);
    expect(screen.getByText(/sin invenciones/i)).toBeInTheDocument();
  });

  it("renderiza label de severidad Warning (amarillo/partial)", () => {
    render(<SeverityBadge report={report("Warning")} />);
    expect(screen.getByText(/advertencia/i)).toBeInTheDocument();
  });

  it("renderiza label de severidad Critical (rojo/missing)", () => {
    render(<SeverityBadge report={report("Critical")} />);
    expect(screen.getByText(/atenci[óo]n/i)).toBeInTheDocument();
  });

  it("muestra el conteo de invenciones", () => {
    const inventions: EntityInvention[] = [
      { type: "Skill", claimed: "X", original: null, severity: "Hard", position: 1 },
      { type: "Company", claimed: "Y", original: null, severity: "Hard", position: 2 },
    ];
    render(<SeverityBadge report={report("Critical", inventions)} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it("oculta el conteo cuando severity es None y no hay invenciones", () => {
    const { container } = render(<SeverityBadge report={report("None")} />);
    expect(container.textContent).not.toMatch(/\b1\b/);
  });

  it("accesibilidad: role=status y aria-label con la severidad en español", () => {
    render(<SeverityBadge report={report("Warning")} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label");
    expect(status.getAttribute("aria-label")?.toLowerCase()).toContain("advertencia");
  });
});
