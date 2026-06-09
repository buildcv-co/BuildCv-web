import { describe, it, expect } from "vitest";
import { buildLandingMetadata } from "./metadata";

describe("buildLandingMetadata", () => {
  it("retorna un objeto", () => {
    expect(typeof buildLandingMetadata()).toBe("object");
  });

  it("title es un objeto con default y template, ambos no vacíos", () => {
    const m = buildLandingMetadata();
    const title = m.title as unknown;
    expect(typeof title).toBe("object");
    if (typeof title !== "object" || title === null) {
      throw new Error("title should be an object");
    }
    const t = title as { default?: unknown; template?: unknown };
    expect(typeof t.default).toBe("string");
    expect((t.default as string).length).toBeGreaterThan(0);
    expect(typeof t.template).toBe("string");
    expect((t.template as string).length).toBeGreaterThan(0);
  });

  it("description es string entre 50 y 200 caracteres (SEO best practice)", () => {
    const m = buildLandingMetadata();
    const desc = m.description ?? "";
    expect(typeof desc).toBe("string");
    expect(desc.length).toBeGreaterThanOrEqual(50);
    expect(desc.length).toBeLessThanOrEqual(200);
  });

  it("openGraph tiene type='website' y campos requeridos", () => {
    const m = buildLandingMetadata();
    if (!m.openGraph) throw new Error("openGraph missing");
    const og = m.openGraph as Record<string, unknown>;
    expect(og.type).toBe("website");
    expect(typeof og.title).toBe("string");
    expect(typeof og.description).toBe("string");
    expect(typeof og.url).toBe("string");
    expect(typeof og.siteName).toBe("string");
  });

  it("twitter tiene card='summary_large_image'", () => {
    const m = buildLandingMetadata();
    if (!m.twitter) throw new Error("twitter missing");
    const tw = m.twitter as Record<string, unknown>;
    expect(tw.card).toBe("summary_large_image");
    expect(typeof tw.title).toBe("string");
    expect(typeof tw.description).toBe("string");
  });

  it("robots: index y follow en true", () => {
    const m = buildLandingMetadata();
    if (!m.robots) throw new Error("robots missing");
    const r = m.robots as Record<string, unknown>;
    expect(r.index).toBe(true);
    expect(r.follow).toBe(true);
  });

  it("alternates.canonical es URL absoluta y termina con /", () => {
    const m = buildLandingMetadata();
    if (!m.alternates) throw new Error("alternates missing");
    const alt = m.alternates as Record<string, unknown>;
    const canonical = alt.canonical;
    expect(typeof canonical).toBe("string");
    if (typeof canonical !== "string") throw new Error("canonical should be string");
    expect(canonical).toMatch(/^https?:\/\//);
    expect(canonical.endsWith("/")).toBe(true);
  });

  it("keywords es ReadonlyArray<string> no vacío", () => {
    const m = buildLandingMetadata();
    expect(Array.isArray(m.keywords)).toBe(true);
    if (Array.isArray(m.keywords)) {
      expect(m.keywords.length).toBeGreaterThan(0);
      for (const k of m.keywords) {
        expect(typeof k).toBe("string");
        expect(k.length).toBeGreaterThan(0);
      }
    }
  });

  it("NO contiene frases prohibidas por Art. IV (encuadre honesto)", () => {
    const m = buildLandingMetadata();
    const flat = JSON.stringify(m).toLowerCase();
    const forbidden: RegExp[] = [
      /ats\s+oficial/,
      /empleo\s+garantizado/,
      /garantiza\s+empleo/,
      /puntaje\s+oficial/,
    ];
    for (const pattern of forbidden) {
      expect(flat).not.toMatch(pattern);
    }
  });
});
