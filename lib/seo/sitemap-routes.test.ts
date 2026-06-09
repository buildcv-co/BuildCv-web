import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES } from "./sitemap-routes";

const VALID_FREQUENCIES: ReadonlyArray<string> = [
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
];

describe("PUBLIC_ROUTES", () => {
  it("tiene exactamente 7 rutas públicas", () => {
    expect(PUBLIC_ROUTES).toHaveLength(7);
  });

  it("incluye /, /analizar, /importar, /analizar/editar, /analizar/diff, /analizar/adapt, /analizar/export", () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/analizar");
    expect(paths).toContain("/importar");
    expect(paths).toContain("/analizar/editar");
    expect(paths).toContain("/analizar/diff");
    expect(paths).toContain("/analizar/adapt");
    expect(paths).toContain("/analizar/export");
  });

  it("no tiene paths duplicados", () => {
    const paths = PUBLIC_ROUTES.map((r) => r.path);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it("todos los paths comienzan con /", () => {
    for (const r of PUBLIC_ROUTES) {
      expect(r.path.startsWith("/")).toBe(true);
    }
  });

  it("ningún path está vacío ni es solo / repetido (//)", () => {
    for (const r of PUBLIC_ROUTES) {
      expect(r.path.length).toBeGreaterThan(0);
      expect(r.path.startsWith("//")).toBe(false);
    }
  });

  it("priority está en el rango [0, 1]", () => {
    for (const r of PUBLIC_ROUTES) {
      expect(r.priority).toBeGreaterThanOrEqual(0);
      expect(r.priority).toBeLessThanOrEqual(1);
    }
  });

  it("changeFrequency es uno de los valores válidos de sitemap.org", () => {
    for (const r of PUBLIC_ROUTES) {
      expect(VALID_FREQUENCIES).toContain(r.changeFrequency);
    }
  });

  it("la home (/) tiene priority 1.0 (máxima)", () => {
    const home = PUBLIC_ROUTES.find((r) => r.path === "/");
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1);
  });

  it("las rutas de feature (analizar/*) tienen priority menor que la home", () => {
    const home = PUBLIC_ROUTES.find((r) => r.path === "/")!;
    const features = PUBLIC_ROUTES.filter((r) => r.path.startsWith("/analizar/"));
    expect(features.length).toBeGreaterThan(0);
    for (const f of features) {
      expect(f.priority).toBeLessThan(home.priority);
    }
  });
});
