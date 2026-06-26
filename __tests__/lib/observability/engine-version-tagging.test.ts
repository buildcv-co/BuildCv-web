import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { __resetErrorReporterForTests, reportError } from "@/lib/observability/error-reporter";
import { logStore, resolveEngineVersion } from "@/lib/observability/log-store";
import type { LogContext, LogEntry } from "@/lib/observability/types";

const makeBaseContext = () => ({
  url: "https://buildcv.co/analizar",
  userAgent: "Mozilla/5.0",
  viewport: { width: 1280, height: 720 },
  appVersion: "0.5.1",
  buildSha: "a312662",
  locale: "es-CO",
});

describe("engineVersion observability tagging (021/5d — Constitution Art. II seal)", () => {
  beforeEach(() => {
    logStore.clear();
    __resetErrorReporterForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: v2 response carries engineVersion "2.0.0" → logStore preserves it.
  it("LogStore_RecordsEngineVersion_When_ScoreResponseV2_Has_It", () => {
    const v2Response = { engineVersion: "2.0.0" } as const;
    const tagged: LogEntry = {
      timestamp: "2026-06-26T14:00:00.000Z",
      level: "info",
      message: "score v2 received",
      context: makeBaseContext(),
      engineVersion: resolveEngineVersion(v2Response),
    };

    logStore.add(tagged);

    const stored = logStore.getAll();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.engineVersion).toBe("2.0.0");
  });

  // Test 2: legacy v1 response has no engineVersion field → default to "1.0.0"
  // (NOT undefined, NOT null — Constitution Art. II requires every score event
  // to carry a non-empty engineVersion string for dashboard segmentation).
  it("LogStore_DefaultsToUnknown_When_ScoreResponseV1_Has_No_EngineVersion", () => {
    const v1Response: { engineVersion?: string } = {}; // legacy v1 omits the field
    const tagged: LogEntry = {
      timestamp: "2026-06-26T14:00:01.000Z",
      level: "info",
      message: "score v1 received",
      context: makeBaseContext(),
      engineVersion: resolveEngineVersion(v1Response),
    };

    logStore.add(tagged);

    const stored = logStore.getAll();
    expect(stored).toHaveLength(1);
    // Real default value is "1.0.0" (legacy engine version). The test name
    // calls it "Unknown" because the response didn't declare one — the helper
    // fills in the legacy default so dashboards never see `undefined`.
    expect(stored[0]?.engineVersion).toBe("1.0.0");
  });

  // Test 3: ErrorReporter threads engineVersion through the LogContext so a
  // failed score attempt can be filtered by version on the dashboard.
  it("ErrorReporter_IncludesEngineVersion_InContext_When_ScoreError", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = new Error("score failed");
    const entry = reportError(err, {
      context: { engineVersion: "2.0.0" },
    });

    expect(entry.context.engineVersion).toBe("2.0.0");
    // Type-level guarantee: engineVersion is part of the LogContext contract,
    // not a runtime side effect of permissive object spread. Without this,
    // someone could remove the field and the runtime assertion above would
    // still pass (the spread `...options.context` would just carry it).
    expectTypeOf<LogContext["engineVersion"]>().toEqualTypeOf<string | undefined>();
    // Sanity: the rest of the context is still populated from buildContext().
    expect(entry.context.url).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  // Test 4: After tagging, the LogEntry.engineVersion is always a string
  // (never undefined, never null). This is the structural contract that
  // dashboards rely on.
  it("LogStore_EngineVersion_IsString_NotNull_OrUndefined", () => {
    const tagged: LogEntry = {
      timestamp: "2026-06-26T14:00:02.000Z",
      level: "info",
      message: "score tagged",
      context: makeBaseContext(),
      engineVersion: resolveEngineVersion({ engineVersion: "2.0.0" }),
    };

    logStore.add(tagged);

    const stored = logStore.getAll();
    expect(stored).toHaveLength(1);
    const ev = stored[0]?.engineVersion;
    expect(typeof ev).toBe("string");
    expect(ev).not.toBeNull();
    expect(ev).not.toBeUndefined();
    expect((ev as unknown as string).length).toBeGreaterThan(0);
  });
});
