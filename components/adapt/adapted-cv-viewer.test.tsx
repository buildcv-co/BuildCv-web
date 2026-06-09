import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdaptedCvViewer } from "./adapted-cv-viewer";

describe("AdaptedCvViewer", () => {
  it("renderiza el texto del CV en un <pre> con whitespace-pre-wrap", () => {
    const { container } = render(<AdaptedCvViewer adaptedCv="# Mariana\nBackend dev" />);
    const pre = container.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre).toHaveClass("whitespace-pre-wrap");
  });

  it("preserva saltos de línea y caracteres especiales tal cual (texto plano, sin inyección HTML)", () => {
    const markdown = "# CV\n\n- *Asteriscos* y _guiones_ y `backticks`\n- <script>alert('xss')</script>";
    const { container } = render(<AdaptedCvViewer adaptedCv={markdown} />);
    const pre = container.querySelector("pre");
    expect(pre?.textContent).toBe(markdown);
    // los < > se renderizan como texto literal (no se interpretan como HTML)
    expect(pre?.innerHTML).toContain("&lt;script&gt;");
  });

  it("renderiza el texto como nodo de texto (no como HTML interpretado)", () => {
    const { container } = render(<AdaptedCvViewer adaptedCv="hello" />);
    expect(container.querySelectorAll("*").length).toBeGreaterThan(0);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("tiene etiqueta accesible (region o article) con aria-label", () => {
    render(<AdaptedCvViewer adaptedCv="x" />);
    const region = screen.getByRole("region", { name: /cv adaptado/i });
    expect(region).toBeInTheDocument();
  });
});
