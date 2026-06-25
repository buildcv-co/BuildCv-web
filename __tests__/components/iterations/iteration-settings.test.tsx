import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ITERATION_COUNT_MAX,
  ITERATION_COUNT_MIN,
  IterationSettings,
} from "@/components/iterations/iteration-settings";

describe("IterationSettings", () => {
  it("renders iteration count and threshold sliders with default labels and hints", () => {
    render(
      <IterationSettings
        iterationCount={5}
        threshold={50}
        creditsAvailable={null}
        onIterationCountChange={vi.fn()}
        onThresholdChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("iteration-settings")).toBeInTheDocument();
    const sliders = screen.getAllByRole("slider");
    expect(sliders).toHaveLength(2);
    sliders.forEach((slider) => {
      expect(slider.tagName).toBe("INPUT");
      expect(slider).toHaveAttribute("type", "range");
    });

    expect(screen.getAllByText(/iteraciones/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/umbral/i)).toBeInTheDocument();
    expect(screen.getByText(/entre 1 y 20/i)).toBeInTheDocument();
    expect(screen.getByText(/porcentaje mínimo/i)).toBeInTheDocument();
  });

  it("reports the live credits-needed message based on iteration count", () => {
    render(
      <IterationSettings
        iterationCount={3}
        threshold={50}
        creditsAvailable={null}
        onIterationCountChange={vi.fn()}
        onThresholdChange={vi.fn()}
      />,
    );

    const credits = screen.getByTestId("iteration-credits-needed");
    expect(credits.textContent).toContain("3");
  });

  it("invokes onIterationCountChange with a clamped value when the slider moves past the bounds", () => {
    const onIterationCountChange = vi.fn();
    const { rerender } = render(
      <IterationSettings
        iterationCount={5}
        threshold={50}
        creditsAvailable={null}
        onIterationCountChange={onIterationCountChange}
        onThresholdChange={vi.fn()}
      />,
    );

    const slider = screen.getAllByRole("slider")[0];
    fireEvent.change(slider, { target: { value: String(ITERATION_COUNT_MAX + 50) } });
    expect(onIterationCountChange).toHaveBeenCalledWith(ITERATION_COUNT_MAX);

    onIterationCountChange.mockClear();
    rerender(
      <IterationSettings
        iterationCount={ITERATION_COUNT_MAX}
        threshold={50}
        creditsAvailable={null}
        onIterationCountChange={onIterationCountChange}
        onThresholdChange={vi.fn()}
      />,
    );
    fireEvent.change(slider, { target: { value: String(ITERATION_COUNT_MIN - 5) } });
    expect(onIterationCountChange).toHaveBeenCalledWith(ITERATION_COUNT_MIN);
  });

  it("highlights credits-needed text in red when iteration count exceeds available credits", () => {
    render(
      <IterationSettings
        iterationCount={10}
        threshold={50}
        creditsAvailable={3}
        onIterationCountChange={vi.fn()}
        onThresholdChange={vi.fn()}
      />,
    );

    const credits = screen.getByTestId("iteration-credits-needed");
    expect(credits.className).toMatch(/text-red-300/);
    expect(credits.textContent).toContain("10");
  });
});