import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useReportWebVitals,
  __resetWebVitalsStateForTests,
} from "./use-report-web-vitals";

const mockOnLCP = vi.fn();
const mockOnINP = vi.fn();
const mockOnCLS = vi.fn();
const mockOnTTFB = vi.fn();
const mockOnFCP = vi.fn();

vi.mock("web-vitals", () => ({
  onLCP: (cb: (m: unknown) => void) => {
    mockOnLCP(cb);
  },
  onINP: (cb: (m: unknown) => void) => {
    mockOnINP(cb);
  },
  onCLS: (cb: (m: unknown) => void) => {
    mockOnCLS(cb);
  },
  onTTFB: (cb: (m: unknown) => void) => {
    mockOnTTFB(cb);
  },
  onFCP: (cb: (m: unknown) => void) => {
    mockOnFCP(cb);
  },
}));

const makeMetric = (
  name: "LCP" | "INP" | "CLS" | "TTFB" | "FCP",
  value: number,
  rating: "good" | "needs-improvement" | "poor" = "good",
  navigationType:
    | "navigate"
    | "reload"
    | "back-forward"
    | "back-forward-cache"
    | "prerender"
    | "restore" = "navigate",
  id = "v1-1",
) => ({
  name,
  value,
  rating,
  delta: value,
  id,
  navigationType,
  entries: [] as PerformanceEntry[],
});

describe("useReportWebVitals", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetWebVitalsStateForTests();
    mockOnLCP.mockClear();
    mockOnINP.mockClear();
    mockOnCLS.mockClear();
    mockOnTTFB.mockClear();
    mockOnFCP.mockClear();
    consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("llama onLCP, onINP, onCLS, onTTFB, onFCP en mount", () => {
    renderHook(() => useReportWebVitals());
    expect(mockOnLCP).toHaveBeenCalledTimes(1);
    expect(mockOnINP).toHaveBeenCalledTimes(1);
    expect(mockOnCLS).toHaveBeenCalledTimes(1);
    expect(mockOnTTFB).toHaveBeenCalledTimes(1);
    expect(mockOnFCP).toHaveBeenCalledTimes(1);
  });

  it("loggea LCP a console.info con formato [BuildCv WebVital] name=LCP value=... rating=good id=...", () => {
    renderHook(() => useReportWebVitals());
    // Capturar el callback de LCP y dispararlo
    const lcpCb = mockOnLCP.mock.calls[0]?.[0] as (m: unknown) => void;
    expect(lcpCb).toBeTypeOf("function");
    lcpCb(makeMetric("LCP", 1234, "good", "navigate", "v1-lcp"));
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const first = consoleSpy.mock.calls[0]?.[0];
    expect(typeof first).toBe("string");
    expect(first).toBe(
      "[BuildCv WebVital] name=LCP value=1234 rating=good id=v1-lcp",
    );
  });

  it("loggea INP, CLS, TTFB, FCP con el mismo formato", () => {
    renderHook(() => useReportWebVitals());
    const handlers: ReadonlyArray<{
      mock: ReturnType<typeof vi.fn>;
      name: "LCP" | "INP" | "CLS" | "TTFB" | "FCP";
      value: number;
      rating: "good" | "needs-improvement" | "poor";
      id: string;
    }> = [
      { mock: mockOnINP, name: "INP", value: 50, rating: "good", id: "v-inp" },
      { mock: mockOnCLS, name: "CLS", value: 0.1, rating: "good", id: "v-cls" },
      { mock: mockOnTTFB, name: "TTFB", value: 200, rating: "good", id: "v-ttfb" },
      {
        mock: mockOnFCP,
        name: "FCP",
        value: 800,
        rating: "needs-improvement",
        id: "v-fcp",
      },
    ];
    for (const h of handlers) {
      const cb = h.mock.mock.calls[0]?.[0] as (m: unknown) => void;
      cb(makeMetric(h.name, h.value, h.rating, "navigate", h.id));
    }
    expect(consoleSpy).toHaveBeenCalledTimes(4);
    expect(consoleSpy.mock.calls[0]?.[0]).toBe(
      "[BuildCv WebVital] name=INP value=50 rating=good id=v-inp",
    );
    expect(consoleSpy.mock.calls[3]?.[0]).toBe(
      "[BuildCv WebVital] name=FCP value=800 rating=needs-improvement id=v-fcp",
    );
  });

  it("dedupe: el mismo metric con el mismo id solo se loggea 1 vez por sesión", () => {
    renderHook(() => useReportWebVitals());
    const lcpCb = mockOnLCP.mock.calls[0]?.[0] as (m: unknown) => void;
    lcpCb(makeMetric("LCP", 1234, "good", "navigate", "same-id"));
    lcpCb(makeMetric("LCP", 1235, "good", "navigate", "same-id"));
    lcpCb(makeMetric("LCP", 1240, "good", "navigate", "same-id"));
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("NO llama a fetch ni a reportError (es info, no error)", () => {
    const consoleErr = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const fetchSpy = vi.fn(async () => ({}));
    vi.stubGlobal("fetch", fetchSpy);
    renderHook(() => useReportWebVitals());
    const lcpCb = mockOnLCP.mock.calls[0]?.[0] as (m: unknown) => void;
    lcpCb(makeMetric("LCP", 1000, "good", "navigate", "v-clean"));
    expect(consoleErr).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});
