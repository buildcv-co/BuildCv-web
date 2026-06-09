import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { shouldDedupe, buildDedupeKey } from "./dedupe";
import type { LogEntry, LogContext } from "./types";

const FIXED_NOW = new Date("2026-06-09T12:34:56.000Z").getTime();

const makeCtx = (overrides: Partial<LogContext> = {}): LogContext => ({
  url: "https://buildcv.co/analizar",
  userAgent: "Mozilla/5.0",
  viewport: { width: 1280, height: 720 },
  appVersion: "0.5.1",
  buildSha: "a312662",
  locale: "es-CO",
  ...overrides,
});

const makeEntry = (
  message: string,
  url: string,
  timestamp: string,
  dedupeKey?: string,
): LogEntry => ({
  timestamp,
  level: "error",
  message,
  context: makeCtx({ url }),
  dedupeKey: dedupeKey ?? buildDedupeKey(message, url),
});

describe("buildDedupeKey", () => {
  it("combina message y url con '::'", () => {
    expect(buildDedupeKey("oops", "https://x")).toBe("oops::https://x");
  });
});

describe("shouldDedupe", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("con 0 recientes retorna false", () => {
    expect(shouldDedupe("k", [])).toBe(false);
  });

  it("con 1-4 recientes en ventana retorna false", () => {
    const recent = [
      makeEntry("oops", "https://x", new Date(FIXED_NOW - 1000).toISOString(), "k"),
      makeEntry("oops", "https://x", new Date(FIXED_NOW - 2000).toISOString(), "k"),
      makeEntry("oops", "https://x", new Date(FIXED_NOW - 3000).toISOString(), "k"),
    ];
    expect(shouldDedupe("k", recent)).toBe(false);
  });

  it("con 5+ recientes en ventana retorna true (silenciar)", () => {
    const recent = Array.from({ length: 5 }, (_, i) =>
      makeEntry(
        "oops",
        "https://x",
        new Date(FIXED_NOW - (i + 1) * 1000).toISOString(),
        "k",
      ),
    );
    expect(shouldDedupe("k", recent)).toBe(true);
  });

  it("recientes fuera de ventana (>60s) NO cuentan", () => {
    const recent = [
      makeEntry(
        "oops",
        "https://x",
        new Date(FIXED_NOW - 61_000).toISOString(),
        "k",
      ),
      makeEntry(
        "oops",
        "https://x",
        new Date(FIXED_NOW - 120_000).toISOString(),
        "k",
      ),
    ];
    expect(shouldDedupe("k", recent)).toBe(false);
  });

  it("mezcla: 3 viejos (fuera) + 2 recientes (dentro) = false (2 dentro < 5)", () => {
    const recent = [
      makeEntry(
        "oops",
        "https://x",
        new Date(FIXED_NOW - 90_000).toISOString(),
        "k",
      ),
      makeEntry(
        "oops",
        "https://x",
        new Date(FIXED_NOW - 70_000).toISOString(),
        "k",
      ),
      makeEntry(
        "oops",
        "https://x",
        new Date(FIXED_NOW - 30_000).toISOString(),
        "k",
      ),
      makeEntry(
        "oops",
        "https://x",
        new Date(FIXED_NOW - 1000).toISOString(),
        "k",
      ),
    ];
    expect(shouldDedupe("k", recent)).toBe(false);
  });

  it("diferente dedupeKey no cuentan entre sí", () => {
    const recent = [
      makeEntry(
        "a",
        "https://x",
        new Date(FIXED_NOW - 1000).toISOString(),
        "a::https://x",
      ),
      makeEntry(
        "b",
        "https://x",
        new Date(FIXED_NOW - 1000).toISOString(),
        "b::https://x",
      ),
      makeEntry(
        "c",
        "https://x",
        new Date(FIXED_NOW - 1000).toISOString(),
        "c::https://x",
      ),
    ];
    expect(shouldDedupe("a::https://x", recent)).toBe(false);
  });

  it("5 recientes con el MISMO key dentro de la ventana retorna true", () => {
    const recent = Array.from({ length: 5 }, (_, i) =>
      makeEntry(
        "oops",
        "https://x",
        new Date(FIXED_NOW - (i + 1) * 1000).toISOString(),
        "oops::https://x",
      ),
    );
    expect(shouldDedupe("oops::https://x", recent)).toBe(true);
  });
});
