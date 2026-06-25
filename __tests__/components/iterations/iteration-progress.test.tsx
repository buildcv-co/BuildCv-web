import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IterationProgress } from "@/components/iterations/iteration-progress";

describe("IterationProgress", () => {
  it("renders current and total iteration labels", () => {
    render(<IterationProgress current={2} total={5} />);

    expect(screen.getByTestId("iteration-progress")).toBeInTheDocument();
    expect(screen.getByText(/iteración 2 de 5/i)).toBeInTheDocument();
  });

  it("exposes aria-valuenow on the progressbar role", () => {
    render(<IterationProgress current={3} total={6} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "6");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuetext", "Iteración 3 de 6");
  });

  it("clamps current to the total when overshoot happens", () => {
    render(<IterationProgress current={99} total={4} />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "4");
    expect(screen.getByText(/iteración 4 de 4/i)).toBeInTheDocument();
  });

  it("has aria-live=polite so screen readers announce progress", () => {
    render(<IterationProgress current={1} total={5} />);

    expect(screen.getByTestId("iteration-progress")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });
});