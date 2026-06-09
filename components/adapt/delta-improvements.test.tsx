import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DeltaImprovements } from "./delta-improvements";
import type { EntityInvention } from "@/lib/api/types";

function inv(
  severity: "Soft" | "Hard",
  claimed: string,
  type: EntityInvention["type"] = "Skill",
  original: string | null = null,
  position = 0,
): EntityInvention {
  return { type, claimed, original, severity, position };
}

describe("DeltaImprovements", () => {
  it("muestra el título de la sección", () => {
    render(<DeltaImprovements inventions={[]} />);
    expect(screen.getByText(/cambios aplicados/i)).toBeInTheDocument();
  });

  it("estado vacío: muestra el copy 'No se detectaron cambios.'", () => {
    render(<DeltaImprovements inventions={[]} />);
    expect(screen.getByText(/no se detectaron cambios/i)).toBeInTheDocument();
  });

  it("Hard inventions aparecen ANTES que las Soft", () => {
    const soft: EntityInvention = inv("Soft", "MongoDB", "Skill", null, 10);
    const hard: EntityInvention = inv("Hard", "FakeCorp", "Company", null, 20);
    const inventions = [soft, hard];
    render(<DeltaImprovements inventions={inventions} />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(2);
    expect(within(items[0]).getByText(/FakeCorp/)).toBeInTheDocument();
    expect(within(items[1]).getByText(/MongoDB/)).toBeInTheDocument();
  });

  it("Hard inventions se renderizan con label 'Hard'", () => {
    const hard: EntityInvention = inv("Hard", "Kubernetes", "Skill", null, 5);
    render(<DeltaImprovements inventions={[hard]} />);
    expect(screen.getByText(/^Hard$/)).toBeInTheDocument();
  });

  it("Soft inventions se renderizan con label 'Soft'", () => {
    const soft: EntityInvention = inv("Soft", "MongoDB", "Skill", null, 5);
    render(<DeltaImprovements inventions={[soft]} />);
    expect(screen.getByText(/^Soft$/)).toBeInTheDocument();
  });

  it("muestra el nombre claimed de la invención", () => {
    const i: EntityInvention = inv("Hard", "AWS Certified", "Certification", null, 5);
    render(<DeltaImprovements inventions={[i]} />);
    expect(screen.getByText(/AWS Certified/)).toBeInTheDocument();
  });
});
