import { describe, it, expect } from "vitest";
import { parseCvMarkdown } from "./parse-cv";

describe("parseCvMarkdown", () => {
  it("devuelve un array de bloques vacío para string vacío", () => {
    expect(parseCvMarkdown("")).toEqual([]);
  });

  it("detecta heading H1 (# Texto)", () => {
    const blocks = parseCvMarkdown("# Mi CV");
    expect(blocks).toEqual([{ type: "heading", level: 1, text: "Mi CV" }]);
  });

  it("detecta headings H2, H3", () => {
    const blocks = parseCvMarkdown("## H2\n### H3");
    expect(blocks).toEqual([
      { type: "heading", level: 2, text: "H2" },
      { type: "heading", level: 3, text: "H3" },
    ]);
  });

  it("detecta items de lista (- Texto)", () => {
    const blocks = parseCvMarkdown("- uno\n- dos");
    expect(blocks).toEqual([
      { type: "list", items: ["uno", "dos"] },
    ]);
  });

  it("detecta blockquote (> Texto)", () => {
    const blocks = parseCvMarkdown("> nota al pie");
    expect(blocks).toEqual([{ type: "blockquote", text: "nota al pie" }]);
  });

  it("agrupa items de lista consecutivos en un solo bloque list", () => {
    const blocks = parseCvMarkdown("- a\n- b\n- c");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: "list", items: ["a", "b", "c"] });
  });

  it("líneas consecutivas no-lista-no-heading-no-blockquote se unen en un solo párrafo", () => {
    const blocks = parseCvMarkdown("línea 1\nlínea 2\nlínea 3");
    expect(blocks).toEqual([{ type: "paragraph", text: "línea 1 línea 2 línea 3" }]);
  });

  it("separa párrafos por líneas en blanco", () => {
    const blocks = parseCvMarkdown("párrafo 1\n\npárrafo 2");
    expect(blocks).toEqual([
      { type: "paragraph", text: "párrafo 1" },
      { type: "paragraph", text: "párrafo 2" },
    ]);
  });

  it("ignora líneas en blanco entre bloques", () => {
    const blocks = parseCvMarkdown("# H\n\n- item\n\n## H2");
    expect(blocks).toEqual([
      { type: "heading", level: 1, text: "H" },
      { type: "list", items: ["item"] },
      { type: "heading", level: 2, text: "H2" },
    ]);
  });

  it("escape de HTML: el texto se preserva tal cual (sin interpretar entidades ni tags)", () => {
    const blocks = parseCvMarkdown("<script>alert('xss')</script>");
    expect(blocks).toEqual([{ type: "paragraph", text: "<script>alert('xss')</script>" }]);
  });

  it("markdown completo: headings, listas, blockquotes, párrafos (ejemplo del stub)", () => {
    const md = `# CV Optimizado (v0 stub — no LLM)

> Esta versión es generada por un stub determinista en v0.

## Resumen
Backend developer con experiencia en C# y .NET.

## Experiencia
- Trabajé en RealCorp como developer con C# y .NET.

## Skills
- C#, .NET
`;
    const blocks = parseCvMarkdown(md);
    expect(blocks).toEqual([
      { type: "heading", level: 1, text: "CV Optimizado (v0 stub — no LLM)" },
      { type: "blockquote", text: "Esta versión es generada por un stub determinista en v0." },
      { type: "heading", level: 2, text: "Resumen" },
      { type: "paragraph", text: "Backend developer con experiencia en C# y .NET." },
      { type: "heading", level: 2, text: "Experiencia" },
      { type: "list", items: ["Trabajé en RealCorp como developer con C# y .NET."] },
      { type: "heading", level: 2, text: "Skills" },
      { type: "list", items: ["C#, .NET"] },
    ]);
  });

  it("headings con texto vacío después de trim se tratan como paragraph (no son headings válidos)", () => {
    // Si después de trim la línea es solo "##", no es un heading — es texto literal.
    const blocks = parseCvMarkdown("##");
    expect(blocks).toEqual([{ type: "paragraph", text: "##" }]);
  });

  it("heading con # extra (#### ) se trata como paragraph (no es h4 ni mayor)", () => {
    // Decisión: solo se soportan h1-h3. h4+ caen a paragraph.
    const blocks = parseCvMarkdown("#### muy profundo");
    expect(blocks).toEqual([{ type: "paragraph", text: "#### muy profundo" }]);
  });
});
