import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EntityBadge } from "./entity-badge";
import { copy } from "@/lib/copy/es";

describe("EntityBadge", () => {
  it("source='imported' tiene tono verde (text-present)", () => {
    render(<EntityBadge value="Node.js" source="imported" />);
    const badge = screen.getByText("Node.js");
    expect(badge.className).toContain("text-present");
  });

  it("source='user-typed' tiene tono amarillo (text-partial)", () => {
    render(<EntityBadge value="Kubernetes" source="user-typed" />);
    const badge = screen.getByText("Kubernetes");
    expect(badge.className).toContain("text-partial");
  });

  it("tiene aria-label descriptivo (imported)", () => {
    render(<EntityBadge value="TypeScript" source="imported" />);
    expect(
      screen.getByLabelText(`${copy.editor.entityBadge.importedLabel}: TypeScript`),
    ).toBeInTheDocument();
  });

  it("tiene aria-label descriptivo (user-typed)", () => {
    render(<EntityBadge value="Docker" source="user-typed" />);
    expect(
      screen.getByLabelText(`${copy.editor.entityBadge.userTypedLabel}: Docker`),
    ).toBeInTheDocument();
  });
});
