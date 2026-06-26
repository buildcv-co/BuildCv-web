import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentIcon, UserIcon } from "./icons";

describe("Icons", () => {
  it("DocumentIcon renderiza un <svg> con aria-hidden y stroke currentColor", () => {
    render(<DocumentIcon />);
    const svg = screen.getByTestId("icon-document");
    expect(svg.tagName).toBe("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("stroke", "currentColor");
  });

  it("UserIcon renderiza un <svg> con aria-hidden y stroke currentColor", () => {
    render(<UserIcon />);
    const svg = screen.getByTestId("icon-user");
    expect(svg.tagName).toBe("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("stroke", "currentColor");
  });
});