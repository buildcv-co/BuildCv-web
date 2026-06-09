import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  LogLevel,
  LogContext,
  LogEntry,
  WebVitalName,
  WebVitalRating,
  NavigationType,
  WebVitalsEntry,
} from "./types";

describe("LogLevel", () => {
  it("acepta los 3 valores literales", () => {
    const a: LogLevel = "error";
    const b: LogLevel = "warning";
    const c: LogLevel = "info";
    expect(a).toBe("error");
    expect(b).toBe("warning");
    expect(c).toBe("info");
  });

  it("es union literal (no string amplio)", () => {
    expectTypeOf<LogLevel>().toEqualTypeOf<"error" | "warning" | "info">();
  });
});

describe("LogContext", () => {
  it("shape completo con todas las keys requeridas", () => {
    const ctx: LogContext = {
      url: "https://buildcv.co/analizar",
      userAgent: "Mozilla/5.0",
      viewport: { width: 1280, height: 720 },
      appVersion: "0.5.1",
      buildSha: "a312662",
      locale: "es-CO",
    };
    expect(ctx.url).toBe("https://buildcv.co/analizar");
    expect(ctx.viewport.width).toBe(1280);
    expect(ctx.viewport.height).toBe(720);
  });

  it("viewport tiene width y height como number", () => {
    expectTypeOf<LogContext["viewport"]>().toEqualTypeOf<{
      readonly width: number;
      readonly height: number;
    }>();
  });
});

describe("LogEntry", () => {
  it("shape completo con campos requeridos y opcionales", () => {
    const entry: LogEntry = {
      timestamp: "2026-06-09T12:34:56.000Z",
      level: "error",
      message: "Test error",
      stack: "Error: Test error\n  at foo",
      context: {
        url: "https://buildcv.co/analizar",
        userAgent: "Mozilla/5.0",
        viewport: { width: 1280, height: 720 },
        appVersion: "0.5.1",
        buildSha: "a312662",
        locale: "es-CO",
      },
      componentStack: "  at Component",
      dedupeKey: "Test error::https://buildcv.co/analizar",
      dedupeCount: 1,
    };
    expect(entry.level).toBe("error");
    expect(entry.dedupeCount).toBe(1);
  });

  it("stack, componentStack, dedupeKey, dedupeCount son opcionales", () => {
    const entry: LogEntry = {
      timestamp: "2026-06-09T12:34:56.000Z",
      level: "info",
      message: "minimal",
      context: {
        url: "https://buildcv.co/",
        userAgent: "Mozilla/5.0",
        viewport: { width: 1280, height: 720 },
        appVersion: "0.5.1",
        buildSha: "a312662",
        locale: "es-CO",
      },
    };
    expect(entry.stack).toBeUndefined();
    expect(entry.componentStack).toBeUndefined();
    expect(entry.dedupeKey).toBeUndefined();
    expect(entry.dedupeCount).toBeUndefined();
  });
});

describe("WebVitalName / WebVitalRating / NavigationType", () => {
  it("WebVitalName cubre las 6 métricas oficiales", () => {
    const names: ReadonlyArray<WebVitalName> = [
      "LCP",
      "FID",
      "CLS",
      "INP",
      "TTFB",
      "FCP",
    ];
    expect(names).toHaveLength(6);
    expectTypeOf<WebVitalName>().toEqualTypeOf<
      "LCP" | "FID" | "CLS" | "INP" | "TTFB" | "FCP"
    >();
  });

  it("WebVitalRating cubre los 3 ratings", () => {
    expectTypeOf<WebVitalRating>().toEqualTypeOf<
      "good" | "needs-improvement" | "poor"
    >();
  });

  it("NavigationType cubre los 4 tipos", () => {
    expectTypeOf<NavigationType>().toEqualTypeOf<
      "navigate" | "reload" | "back-forward" | "prerender"
    >();
  });
});

describe("WebVitalsEntry", () => {
  it("extiende LogEntry omitiendo level/stack/componentStack y forzando level='info'", () => {
    const entry: WebVitalsEntry = {
      timestamp: "2026-06-09T12:34:56.000Z",
      level: "info",
      message: "WebVital LCP",
      context: {
        url: "https://buildcv.co/",
        userAgent: "Mozilla/5.0",
        viewport: { width: 1280, height: 720 },
        appVersion: "0.5.1",
        buildSha: "a312662",
        locale: "es-CO",
      },
      metric: "LCP",
      value: 1234,
      rating: "good",
      id: "v3-1234",
      navigationType: "navigate",
      dedupeKey: "LCP::https://buildcv.co/",
      dedupeCount: 1,
    };
    expect(entry.metric).toBe("LCP");
    expect(entry.value).toBe(1234);
    expect(entry.rating).toBe("good");
    expect(entry.level).toBe("info");
  });

  it("NO permite level !== 'info'", () => {
    expectTypeOf<WebVitalsEntry["level"]>().toEqualTypeOf<"info">();
  });

  it("NO permite stack ni componentStack (omitidos)", () => {
    type HasStack = "stack" extends keyof WebVitalsEntry ? true : false;
    type HasComponentStack =
      "componentStack" extends keyof WebVitalsEntry ? true : false;
    expectTypeOf<HasStack>().toEqualTypeOf<false>();
    expectTypeOf<HasComponentStack>().toEqualTypeOf<false>();
  });
});
