import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { buildContext } from "./context";

describe("buildContext", () => {
  beforeEach(() => {
    // Reset a known jsdom window/navigator between tests
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 720,
      writable: true,
    });
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "https://buildcv.co/analizar" },
      writable: true,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (X11; Linux) Test",
      writable: true,
    });
    Object.defineProperty(navigator, "language", {
      configurable: true,
      value: "es-CO",
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna shape completo en jsdom", () => {
    const ctx = buildContext();
    expect(ctx.url).toBe("https://buildcv.co/analizar");
    expect(ctx.userAgent).toBe("Mozilla/5.0 (X11; Linux) Test");
    expect(ctx.viewport).toEqual({ width: 1280, height: 720 });
    expect(ctx.locale).toBe("es-CO");
    expect(typeof ctx.appVersion).toBe("string");
    expect(typeof ctx.buildSha).toBe("string");
  });

  it("appVersion y buildSha son strings no vacíos (incluso si son 'unknown')", () => {
    const ctx = buildContext();
    expect(ctx.appVersion.length).toBeGreaterThan(0);
    expect(ctx.buildSha.length).toBeGreaterThan(0);
  });

  it("viewport lee window.innerWidth e innerHeight en tiempo de llamada", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 800,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
      writable: true,
    });
    const ctx = buildContext();
    expect(ctx.viewport).toEqual({ width: 800, height: 600 });
  });

  it("es SSR-safe: retorna defaults seguros si window es undefined", () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    try {
      const ctx = buildContext();
      expect(typeof ctx.url).toBe("string");
      expect(typeof ctx.userAgent).toBe("string");
      expect(ctx.viewport).toEqual({ width: 0, height: 0 });
      expect(typeof ctx.locale).toBe("string");
      expect(typeof ctx.appVersion).toBe("string");
      expect(typeof ctx.buildSha).toBe("string");
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
        writable: true,
      });
    }
  });

  it("es SSR-safe: si navigator es undefined, locale cae a 'es-CO' y userAgent a ''", () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    try {
      const ctx = buildContext();
      expect(ctx.userAgent).toBe("");
      expect(ctx.locale).toBe("es-CO");
    } finally {
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: originalNavigator,
        writable: true,
      });
    }
  });
});
