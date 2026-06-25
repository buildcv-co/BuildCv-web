import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IterationResultCard } from "@/components/iterations/iteration-result-card";
import type { IterationResultViewModel } from "@/components/iterations/iteration-result-card";

function makeResult(
  overrides: Partial<IterationResultViewModel> = {},
): IterationResultViewModel {
  return {
    requestId: "11111111-1111-1111-1111-111111111111",
    status: "Completed",
    bestStepText: "# CV adaptado\n\n- Trabajé en RealCorp con C# y .NET.",
    bestScore: 72,
    probabilityWarning: null,
    threshold: 50,
    creditsConsumed: 5,
    ...overrides,
  };
}

describe("IterationResultCard", () => {
  it("shows the best step text and the score badge for completed results", () => {
    render(<IterationResultCard result={makeResult()} onExportPdf={vi.fn()} />);

    const card = screen.getByTestId("iteration-result-card");
    expect(card).toHaveAttribute("data-status", "Completed");
    expect(card).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(
      screen.getByText(/realcorp/i),
    ).toBeInTheDocument();
  });

  it("shows the all-failed banner when status is Failed and bestStepText is null", () => {
    render(
      <IterationResultCard
        result={makeResult({ status: "Failed", bestStepText: null, bestScore: 0 })}
      />,
    );

    expect(screen.getByTestId("iteration-all-failed-banner")).toBeInTheDocument();
    expect(
      screen.getByText(/mejores resultados requieren mayor compatibilidad/i),
    ).toBeInTheDocument();
  });

  it("renders the export-pdf button when handler is provided", () => {
    render(<IterationResultCard result={makeResult()} onExportPdf={vi.fn()} />);

    expect(screen.getByRole("button", { name: /descargar pdf/i })).toBeInTheDocument();
  });

  it("hides the export-pdf button when handler is not provided", () => {
    render(<IterationResultCard result={makeResult()} />);

    expect(screen.queryByRole("button", { name: /descargar pdf/i })).toBeNull();
  });
});