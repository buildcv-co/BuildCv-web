import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  IterationStepList,
  type IterationStepViewModel,
} from "@/components/iterations/iteration-step-list";

const steps: IterationStepViewModel[] = [
  { iterationNumber: 1, score: 75, passedArtI: true, timestamp: "2026-06-25T15:04:05.000Z" },
  { iterationNumber: 2, score: 60, passedArtI: true, timestamp: "2026-06-25T15:04:10.000Z" },
  { iterationNumber: 3, score: 0, passedArtI: false, timestamp: "2026-06-25T15:04:15.000Z" },
];

describe("IterationStepList", () => {
  it("renders nothing when there are no steps", () => {
    const { container } = render(<IterationStepList steps={[]} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId("iteration-step-list")).toBeNull();
  });

  it("renders a table with one row per step and a header for Art. I column", () => {
    render(<IterationStepList steps={steps} />);

    expect(screen.getByTestId("iteration-step-list")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Art. I")).toBeInTheDocument();
    expect(screen.getByText(/compatibilidad/i)).toBeInTheDocument();

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows the passed-Art-I indicator (✓ vs ✗) for each row", () => {
    render(<IterationStepList steps={steps} />);

    const checkmarks = screen.getAllByText("✓");
    const crosses = screen.getAllByText("✗");
    expect(checkmarks).toHaveLength(2);
    expect(crosses).toHaveLength(1);
  });

  it("formats each timestamp as a localized time string containing HH:MM:SS", () => {
    render(<IterationStepList steps={steps} />);

    const timeCells = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeCells.length).toBe(steps.length);
    timeCells.forEach((cell) => {
      expect(cell.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });
});