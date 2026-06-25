import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProbabilityWarning } from "@/components/iterations/probability-warning";

describe("ProbabilityWarning", () => {
  it("renders amber tone for scores between 25 and 49", () => {
    render(<ProbabilityWarning score={30} threshold={50} onImprove={vi.fn()} />);

    const warning = screen.getByTestId("probability-warning");
    expect(warning).toHaveAttribute("data-tone", "amber");
    expect(warning).toHaveAttribute("role", "alert");
    expect(warning).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText(/compatibility|compatibilidad/i)).toBeInTheDocument();
  });

  it("renders red tone for scores below 25", () => {
    render(<ProbabilityWarning score={10} threshold={50} onImprove={vi.fn()} />);

    const warning = screen.getByTestId("probability-warning");
    expect(warning).toHaveAttribute("data-tone", "red");
    expect(screen.getByText(/10% \(umbral/)).toBeInTheDocument();
  });

  it("does not render when score is at or above 50", () => {
    const { container } = render(<ProbabilityWarning score={75} threshold={50} />);

    expect(screen.queryByTestId("probability-warning")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("does not render when score equals 50 exactly (boundary)", () => {
    const { container } = render(<ProbabilityWarning score={50} threshold={50} />);

    expect(screen.queryByTestId("probability-warning")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders red when score is below 25 (boundary)", () => {
    render(<ProbabilityWarning score={24} threshold={50} />);

    expect(screen.getByTestId("probability-warning")).toHaveAttribute(
      "data-tone",
      "red",
    );
  });
});