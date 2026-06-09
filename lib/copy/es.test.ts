import { describe, it, expect } from "vitest";
import { copy } from "./es";

describe("copy.export", () => {
  it("es un objeto con button/buttonLoading/filenameHint/success/errors/retry", () => {
    expect(typeof copy.export).toBe("object");
    expect(copy.export).not.toBeNull();
  });

  it("button y buttonLoading existen", () => {
    expect(typeof copy.export.button).toBe("string");
    expect(typeof copy.export.buttonLoading).toBe("string");
  });

  it("filenameHint usa el patrón cv-adapted-{date}.pdf", () => {
    expect(typeof copy.export.filenameHint).toBe("string");
    expect(copy.export.filenameHint).toMatch(/^cv-adapted-\{date\}\.pdf$/);
  });

  it("success existe (post-click feedback)", () => {
    expect(typeof copy.export.success).toBe("string");
  });

  it("errors: rateLimit/blocked/unavailable/network/generic existen", () => {
    expect(typeof copy.export.errors.rateLimit).toBe("string");
    expect(typeof copy.export.errors.blocked).toBe("string");
    expect(typeof copy.export.errors.unavailable).toBe("string");
    expect(typeof copy.export.errors.network).toBe("string");
    expect(typeof copy.export.errors.generic).toBe("string");
  });

  it("rateLimit es honesto y menciona el tope '20/hora' (Constitution Art. VII)", () => {
    expect(copy.export.errors.rateLimit).toMatch(/20\/hora/);
    expect(copy.export.errors.rateLimit.toLowerCase()).toContain("exportaciones");
  });

  it("blocked menciona 'invenciones' y 'regenerar' (Art. I, hard inventions)", () => {
    expect(copy.export.errors.blocked.toLowerCase()).toContain("invenciones");
    expect(copy.export.errors.blocked.toLowerCase()).toContain("regenera");
  });

  it("retry existe (usado en 503)", () => {
    expect(typeof copy.export.retry).toBe("string");
  });

  it("NO contiene frases prohibidas por Art. IV (encuadre honesto)", () => {
    const flat = JSON.stringify(copy.export).toLowerCase();
    const forbiddenPatterns: RegExp[] = [
      /ats\s+oficial/,
      /empleo\s+garantizado/,
      /garantiza\s+empleo/,
      /puntaje\s+oficial/,
      /cv\s+optimizado/,
    ];
    for (const pattern of forbiddenPatterns) {
      expect(flat).not.toMatch(pattern);
    }
  });
});

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
