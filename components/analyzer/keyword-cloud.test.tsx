import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeywordCloud } from "./keyword-cloud";
import type { KeywordAnalysis } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";

const SAMPLE: KeywordAnalysis = {
  present: [
    { canonicalTerm: "C#", category: "hardSkill", sourceSection: "x", weight: 1, matchLevel: "exact", location: "prominent", creditAwarded: 1, note: "x" },
    { canonicalTerm: ".NET", category: "tool", sourceSection: "x", weight: 1, matchLevel: "exact", location: "prominent", creditAwarded: 1, note: "x" },
  ],
  partial: [],
  missing: [
    { canonicalTerm: "Rust", category: "hardSkill", sourceSection: "x", weight: 1, matchLevel: "exact", location: "prominent", creditAwarded: 1, note: "x" },
  ],
};

describe("KeywordCloud", () => {
  it("renderiza los tres grupos (present, partial, missing)", () => {
    render(<KeywordCloud analysis={SAMPLE} />);
    // los headings concatenan título + " · N", uso matcher de función
    expect(
      screen.getByRole("heading", { level: 3, name: (n) => n.startsWith("Presentes") }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: (n) => n.startsWith("Parciales") }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: (n) => n.startsWith("Faltantes") }),
    ).toBeInTheDocument();
  });

  it("muestra el conteo de cada grupo en el heading", () => {
    render(<KeywordCloud analysis={SAMPLE} />);
    // 2 presentes, 0 parciales, 1 faltante
    expect(
      screen.getByRole("heading", { level: 3, name: (n) => /Presentes\s*·\s*2/.test(n) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: (n) => /Parciales\s*·\s*0/.test(n) }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: (n) => /Faltantes\s*·\s*1/.test(n) }),
    ).toBeInTheDocument();
  });

  it("renderiza los términos como <li> dentro de <ul>", () => {
    render(<KeywordCloud analysis={SAMPLE} />);
    const csharp = screen.getByText("C#");
    const dotnet = screen.getByText(".NET");
    const rust = screen.getByText("Rust");
    expect(csharp.tagName).toBe("LI");
    expect(dotnet.tagName).toBe("LI");
    expect(rust.tagName).toBe("LI");
  });

  it("heading de cada grupo es <h3> (jerarquía correcta bajo <h2> de 'Palabras clave')", () => {
    render(<KeywordCloud analysis={SAMPLE} />);
    const heading = screen.getByText(/Presentes/i);
    expect(heading.tagName).toBe("H3");
    // los tres headings son h3
    const allHeadings = screen.getAllByRole("heading", { level: 3 });
    expect(allHeadings.length).toBe(3);
  });

  it("grupo vacío muestra mensaje por tono (missing con noMissing, partial con —)", () => {
    const empty: KeywordAnalysis = { present: [], partial: [], missing: [] };
    render(<KeywordCloud analysis={empty} />);
    expect(screen.getByText(copy.result.noMissing)).toBeInTheDocument();
    // partial y present con cero items muestran el em-dash
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });
});
