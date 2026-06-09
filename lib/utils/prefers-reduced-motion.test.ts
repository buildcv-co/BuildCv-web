import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion } from "./prefers-reduced-motion";

describe("prefersReducedMotion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve false si window es undefined (SSR)", () => {
    const saved = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = undefined;
    expect(prefersReducedMotion()).toBe(false);
    (globalThis as { window?: unknown }).window = saved;
  });

  it("devuelve false si matchMedia no existe (jsdom default)", () => {
    (globalThis as { window: unknown }).window = { matchMedia: undefined } as unknown as Window;
    expect(prefersReducedMotion()).toBe(false);
  });

  it("devuelve true si matchMedia.matches es true", () => {
    (globalThis as { window: unknown }).window = {
      matchMedia: vi.fn().mockReturnValue({ matches: true }),
    } as unknown as Window;
    expect(prefersReducedMotion()).toBe(true);
  });

  it("devuelve false si matchMedia.matches es false", () => {
    (globalThis as { window: unknown }).window = {
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    } as unknown as Window;
    expect(prefersReducedMotion()).toBe(false);
  });

  it("devuelve false si matchMedia lanza (try/catch defensivo)", () => {
    (globalThis as { window: unknown }).window = {
      matchMedia: vi.fn().mockImplementation(() => {
        throw new Error("nope");
      }),
    } as unknown as Window;
    expect(prefersReducedMotion()).toBe(false);
  });
});
