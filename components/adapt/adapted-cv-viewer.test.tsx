import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdaptedCvViewer } from "./adapted-cv-viewer";

describe("AdaptedCvViewer", () => {
  it("tiene etiqueta accesible (region) con aria-label", () => {
    render(<AdaptedCvViewer adaptedCv="x" />);
    const region = screen.getByRole("region", { name: /cv adaptado/i });
    expect(region).toBeInTheDocument();
  });

  it("envuelve el contenido en <article> para semántica", () => {
    const { container } = render(<AdaptedCvViewer adaptedCv={"# Mi CV"} />);
    expect(container.querySelector("article")).not.toBeNull();
  });

  it("renderiza headings del CV como h2 (mapeo: h1→h2 para no chocar con jerarquía de página)", () => {
    render(<AdaptedCvViewer adaptedCv={"# Mi CV"} />);
    const h = screen.getByRole("heading", { level: 2, name: "Mi CV" });
    expect(h).toBeInTheDocument();
  });

  it("renderiza headings h2 del CV como h3 (mapeo h2→h3)", () => {
    render(<AdaptedCvViewer adaptedCv={"## Resumen"} />);
    const h = screen.getByRole("heading", { level: 3, name: "Resumen" });
    expect(h).toBeInTheDocument();
  });

  it("renderiza headings h3 del CV como h4 (mapeo h3→h4)", () => {
    render(<AdaptedCvViewer adaptedCv={"### Detalle"} />);
    const h = screen.getByRole("heading", { level: 4, name: "Detalle" });
    expect(h).toBeInTheDocument();
  });

  it("renderiza listas como <ul> con <li> items", () => {
    const input = "- item uno\n- item dos";
    render(<AdaptedCvViewer adaptedCv={input} />);
    expect(screen.getByText("item uno").tagName).toBe("LI");
    expect(screen.getByText("item dos").tagName).toBe("LI");
    const ul = screen.getByText("item uno").parentElement;
    expect(ul?.tagName).toBe("UL");
  });

  it("renderiza blockquote como <blockquote>", () => {
    const { container } = render(<AdaptedCvViewer adaptedCv={"> nota"} />);
    expect(container.querySelector("blockquote")).not.toBeNull();
    expect(screen.getByText("nota")).toBeInTheDocument();
  });

  it("renderiza párrafos como <p>", () => {
    render(<AdaptedCvViewer adaptedCv={"Texto plano"} />);
    expect(screen.getByText("Texto plano").tagName).toBe("P");
  });

  it("escape de HTML: el texto se preserva tal cual (nunca dangerouslySetInnerHTML)", () => {
    const input = "- <script>alert('xss')</script>";
    const { container } = render(<AdaptedCvViewer adaptedCv={input} />);
    const scriptNode = container.querySelector("script");
    expect(scriptNode).toBeNull();
    expect(screen.getByText(/<script>/)).toBeInTheDocument();
  });

  it("markdown completo del stub: h1, blockquote, h2, paragraph, list, h2, list", () => {
    const md = [
      "# CV Optimizado",
      "",
      "> Esta versión es generada por un stub determinista en v0.",
      "",
      "## Resumen",
      "Backend developer con experiencia en C# y .NET.",
      "",
      "## Experiencia",
      "- Trabajé en RealCorp como developer con C# y .NET.",
      "",
      "## Skills",
      "- C#, .NET",
    ].join("\n");
    render(<AdaptedCvViewer adaptedCv={md} />);
    expect(
      screen.getByRole("heading", { level: 2, name: /CV Optimizado/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Resumen" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Experiencia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Skills" })).toBeInTheDocument();
    expect(screen.getByText(/Esta versión es generada/)).toBeInTheDocument();
    expect(screen.getByText(/Trabajé en RealCorp/)).toBeInTheDocument();
    expect(screen.getByText(/^C#,\s*\.NET$/)).toBeInTheDocument();
  });

  it("input vacío: muestra mensaje 'Sin contenido' (no crashea, no muestra article vacío)", () => {
    render(<AdaptedCvViewer adaptedCv={""} />);
    expect(screen.getByText(/sin contenido/i)).toBeInTheDocument();
  });

  it("input sin estructura (solo párrafos): renderiza correctamente con <p>", () => {
    render(<AdaptedCvViewer adaptedCv={"Solo texto sin formato"} />);
    expect(screen.getByText("Solo texto sin formato").tagName).toBe("P");
  });
});
