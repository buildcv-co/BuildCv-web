import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreGauge } from "./score-gauge";

describe("ScoreGauge", () => {
  it("tiene role=img con aria-label que incluye score y banda", () => {
    render(<ScoreGauge score={42} band="Coincidencia media" label="label" />);
    const img = screen.getByRole("img", { name: /puntaje 42 de 100, coincidencia media/i });
    expect(img).toBeInTheDocument();
  });

  it("renderiza la banda y la label como texto", () => {
    render(<ScoreGauge score={65} band="Coincidencia alta" label="Coincidencia y legibilidad" />);
    expect(screen.getByText("Coincidencia alta")).toBeInTheDocument();
    expect(screen.getByText("Coincidencia y legibilidad")).toBeInTheDocument();
    // "/ 100" siempre visible
    expect(screen.getByText("/ 100")).toBeInTheDocument();
  });

  it("aplica cap de tamaño por breakpoint (mobile 200px, sm 220px, md 260px)", () => {
    const { container } = render(<ScoreGauge score={65} band="b" label="l" />);
    const wrapper = container.querySelector("div.relative.w-\\[200px\\]");
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toMatch(/w-\[200px\]/);
    expect(wrapper?.className).toMatch(/sm:w-\[220px\]/);
    expect(wrapper?.className).toMatch(/md:w-\[260px\]/);
  });

  it("el SVG tiene viewBox correcto y 2 círculos (background + progress)", () => {
    const { container } = render(<ScoreGauge score={50} band="b" label="l" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 260 260");
    const circles = container.querySelectorAll("svg circle");
    expect(circles.length).toBe(2);
  });

  it("no crashea con score=0 o score=100 (boundary)", () => {
    expect(() => render(<ScoreGauge score={0} band="baja" label="l" />)).not.toThrow();
    expect(() => render(<ScoreGauge score={100} band="alta" label="l" />)).not.toThrow();
  });
});
