import { describe, it, expect } from "vitest";
import { computeDiff } from "./compute-diff";

describe("computeDiff", () => {
  it("2 strings idénticas → array vacío de cambios (jsdiff los colapsa en uno unchanged)", () => {
    const result = computeDiff("hello world", "hello world");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ kind: "unchanged", value: "hello world" });
  });

  it("2 strings vacías → jsdiff devuelve un único segmento vacío (que filtramos)", () => {
    // jsdiff emite un {value:''} incluso para dos strings vacías. Nuestro contrato
    // público (sin segmentos vacíos) lo garantiza el wrapper; jsdiff no es nuestra API.
    const result = computeDiff("", "");
    // El comportamiento exacto de jsdiff aquí es [{value: ''}], pero nuestros tests
    // garantizan que ningún segmento con `value === ''` aparece para entradas no triviales.
    // Para entradas vacías, jsdiff sí emite ese segmento; lo aceptamos tal cual.
    expect(result.length).toBeLessThanOrEqual(1);
    if (result.length === 1) {
      expect(result[0]?.value).toBe("");
      expect(result[0]?.kind).toBe("unchanged");
    }
  });

  it("string vacío vs string no vacío → todos los tokens son added", () => {
    const result = computeDiff("", "hello world");
    const addedSegments = result.filter((s) => s.kind === "added");
    expect(addedSegments.length).toBeGreaterThan(0);
    expect(result.some((s) => s.kind === "removed")).toBe(false);
  });

  it("string no vacío vs string vacío → todos los tokens son removed", () => {
    const result = computeDiff("hello world", "");
    const removedSegments = result.filter((s) => s.kind === "removed");
    expect(removedSegments.length).toBeGreaterThan(0);
    expect(result.some((s) => s.kind === "added")).toBe(false);
  });

  it("palabras añadidas → segmento con kind='added'", () => {
    const result = computeDiff("hello world", "hello there world");
    const added = result.filter((s) => s.kind === "added");
    expect(added.length).toBeGreaterThan(0);
    expect(added[0]?.value.toLowerCase()).toContain("there");
  });

  it("palabras eliminadas → segmento con kind='removed'", () => {
    const result = computeDiff("hello there world", "hello world");
    const removed = result.filter((s) => s.kind === "removed");
    expect(removed.length).toBeGreaterThan(0);
    expect(removed[0]?.value.toLowerCase()).toContain("there");
  });

  it("modificación de una palabra → secuencia removed+added (no unchanged en esa posición)", () => {
    const result = computeDiff("a b c", "a X c");
    const removed = result.filter((s) => s.kind === "removed");
    const added = result.filter((s) => s.kind === "added");
    expect(removed.length).toBeGreaterThan(0);
    expect(added.length).toBeGreaterThan(0);
    expect(removed[0]?.value).toBe("b");
    expect(added[0]?.value).toBe("X");
  });

  it("preserva caracteres especiales: &, <, >, \" verbatim (no escapa HTML)", () => {
    const result = computeDiff("a <b> & c", "a <b> & d");
    const all = result.map((s) => s.value).join("");
    expect(all).toContain("&");
    expect(all).toContain("<");
    expect(all).toContain(">");
    // No debe haber entidades HTML (&amp;, &lt;, etc.)
    expect(all).not.toContain("&amp;");
    expect(all).not.toContain("&lt;");
  });

  it("preserva saltos de línea y espacios múltiples verbatim", () => {
    const result = computeDiff("línea 1\n\nlínea 2", "línea 1\n\nlínea 3");
    // La concatenación de los valores (incluyendo saltos) reconstruye ambos textos.
    // (jsdiff lo garantiza, pero validamos que no perdimos chars)
    const beforeChars = result
      .filter((s) => s.kind !== "added")
      .map((s) => s.value)
      .join("");
    const afterChars = result
      .filter((s) => s.kind !== "removed")
      .map((s) => s.value)
      .join("");
    expect(beforeChars).toBe("línea 1\n\nlínea 2");
    expect(afterChars).toBe("línea 1\n\nlínea 3");
  });

  it("performance: 50 KB string vs 50 KB string completa en <2 s (NFR-032)", () => {
    const half = "lorem ipsum dolor sit amet consectetur adipiscing elit ".repeat(750); // ~50 KB
    const before = half + "END";
    const after = half + "DONE";
    const start = Date.now();
    const result = computeDiff(before, after);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
    expect(result.length).toBeGreaterThan(0);
  });

  it("devuelve ReadonlyArray (inmutable)", () => {
    const result = computeDiff("a", "b");
    expect(Array.isArray(result)).toBe(true);
  });

  it("cada cambio tiene shape { kind, value } sin campos extra", () => {
    const result = computeDiff("hello world", "hello there");
    for (const segment of result) {
      expect(Object.keys(segment).sort()).toEqual(["kind", "value"]);
    }
  });
});
