import { describe, it, expect } from "vitest";
import { copy } from "./es";

describe("copy.adapt", () => {
  it("es un objeto con bloques panel/severity/errors/delta/cta", () => {
    expect(typeof copy.adapt).toBe("object");
    expect(copy.adapt).not.toBeNull();
  });

  it("panel: title, description, button, buttonLoading existen", () => {
    expect(typeof copy.adapt.panel.title).toBe("string");
    expect(typeof copy.adapt.panel.description).toBe("string");
    expect(typeof copy.adapt.panel.button).toBe("string");
    expect(typeof copy.adapt.panel.buttonLoading).toBe("string");
  });

  it("severity: none/warning/critical existen y son strings", () => {
    expect(typeof copy.adapt.severity.none).toBe("string");
    expect(typeof copy.adapt.severity.warning).toBe("string");
    expect(typeof copy.adapt.severity.critical).toBe("string");
  });

  it("severity.none menciona descarga lista (Art. I honest framing)", () => {
    expect(copy.adapt.severity.none.toLowerCase()).toContain("lista");
  });

  it("errors: rateLimit/blocked/unavailable/generic/network existen", () => {
    expect(typeof copy.adapt.errors.rateLimit).toBe("string");
    expect(typeof copy.adapt.errors.blocked).toBe("string");
    expect(typeof copy.adapt.errors.unavailable).toBe("string");
    expect(typeof copy.adapt.errors.generic).toBe("string");
    expect(typeof copy.adapt.errors.network).toBe("string");
  });

  it("delta: title, empty, hardLabel, softLabel existen", () => {
    expect(typeof copy.adapt.delta.title).toBe("string");
    expect(typeof copy.adapt.delta.empty).toBe("string");
    expect(typeof copy.adapt.delta.hardLabel).toBe("string");
    expect(typeof copy.adapt.delta.softLabel).toBe("string");
  });

  it("cta.regenerate existe (usado en 422)", () => {
    expect(typeof copy.adapt.cta.regenerate).toBe("string");
  });

  it("NO contiene frases prohibidas por Art. IV (encuadre honesto)", () => {
    const flat = JSON.stringify(copy.adapt).toLowerCase();
    const forbiddenPatterns: RegExp[] = [
      /ats\s+oficial/,
      /empleo\s+garantizado/,
      /garantiza\s+empleo/,
      /puntaje\s+oficial/,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(flat).not.toMatch(pattern);
    }
  });
});
