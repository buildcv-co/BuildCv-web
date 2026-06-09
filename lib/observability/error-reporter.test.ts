import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  reportError,
  enableBffLogging,
  __resetErrorReporterForTests,
} from "./error-reporter";
import type { LogEntry } from "./types";

const makeErr = (msg: string, stack = "Error stack"): Error => {
  const e = new Error(msg);
  e.stack = stack;
  return e;
};

const makePostResponse = (ok: boolean, status = 200): Response =>
  ({
    ok,
    status,
    headers: new Headers(),
    json: async () => ({}),
    text: async () => "",
  }) as Response;

describe("reportError", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    __resetErrorReporterForTests();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("loggea a console.error con formato estructurado", () => {
    const entry = reportError(makeErr("boom"));
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [first, ...rest] = consoleSpy.mock.calls[0]!;
    expect(typeof first).toBe("string");
    expect(first).toContain("[BuildCv error]");
    expect(first).toContain("boom");
    // El segundo argumento es un objeto con detalles
    const details = rest[0] as Record<string, unknown>;
    expect(details).toBeDefined();
    expect(details["timestamp"]).toBe(entry.timestamp);
    expect(details["context"]).toBeDefined();
    expect(entry.message).toBe("boom");
  });

  it("acepta level custom (warning)", () => {
    const entry = reportError(makeErr("warn me"), { level: "warning" });
    expect(entry.level).toBe("warning");
    const [first] = consoleSpy.mock.calls[0]!;
    expect(first).toContain("[BuildCv warning]");
  });

  it("acepta level custom (info)", () => {
    const entry = reportError(makeErr("fyi"), { level: "info" });
    expect(entry.level).toBe("info");
    const [first] = consoleSpy.mock.calls[0]!;
    expect(first).toContain("[BuildCv info]");
  });

  it("redact transforma el message", () => {
    const entry = reportError(makeErr("token=abc123"), {
      redact: (m) => m.replace(/token=\w+/g, "token=***"),
    });
    expect(entry.message).toBe("token=***");
    const [first] = consoleSpy.mock.calls[0]!;
    expect(first).toContain("token=***");
  });

  it("mergea context custom con buildContext", () => {
    const entry = reportError(makeErr("ctx"), {
      context: { url: "https://test.example/merge" },
    });
    expect(entry.context.url).toBe("https://test.example/merge");
    // El resto del context viene de buildContext (no está vacío)
    expect(entry.context.userAgent.length).toBeGreaterThan(0);
  });

  it("dedup: 5 errores idénticos → 5 console.error (con dedupeCount creciente), el 6to es silenciado", () => {
    for (let i = 0; i < 6; i += 1) {
      reportError(makeErr("spam"));
    }
    // Plan: if (recent.length >= 5) silence. So first 5 log, 6th is silent.
    expect(consoleSpy).toHaveBeenCalledTimes(5);
  });

  it("dedup: 5 calls loggean con dedupeCount creciente (1, 2, 3, 4, 5)", () => {
    const entries: LogEntry[] = [];
    for (let i = 0; i < 5; i += 1) {
      entries.push(reportError(makeErr("counted")));
    }
    expect(entries.map((e) => e.dedupeCount)).toEqual([1, 2, 3, 4, 5]);
  });

  it("dedup: el 6to NO genera console.error (silent)", () => {
    for (let i = 0; i < 5; i += 1) {
      reportError(makeErr("silence-me"));
    }
    expect(consoleSpy).toHaveBeenCalledTimes(5);
    // The 6th should be silent
    reportError(makeErr("silence-me"));
    expect(consoleSpy).toHaveBeenCalledTimes(5);
  });

  it("BFF OFF (default): NO llama fetch", async () => {
    const fetchSpy = vi.fn(async () => makePostResponse(true, 204));
    vi.stubGlobal("fetch", fetchSpy);
    reportError(makeErr("no-bff"));
    // wait a tick for any pending promise
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("BFF ON: llama fetch('/api/log') con payload correcto", async () => {
    const fetchSpy = vi.fn(
      async (): Promise<Response> => makePostResponse(true, 204),
    );
    vi.stubGlobal("fetch", fetchSpy);
    enableBffLogging();
    const entry = reportError(makeErr("to-bff"));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const args = fetchSpy.mock.calls[0] as ReadonlyArray<unknown>;
    const url = args[0] as string;
    const init = args[1] as RequestInit;
    expect(url).toBe("/api/log");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe(
      "application/json",
    );
    const body = JSON.parse(init.body as string) as LogEntry;
    expect(body.message).toBe("to-bff");
    expect(body.timestamp).toBe(entry.timestamp);
  });

  it("BFF fetch fail → NO throw (fail silently, NFR-046)", async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchSpy);
    enableBffLogging();
    expect(() => reportError(makeErr("network-fail"))).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("retorna LogEntry con timestamp, level, message, stack, context, dedupeKey, dedupeCount", () => {
    const entry = reportError(makeErr("shape", "stack@123"));
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.level).toBe("error");
    expect(entry.message).toBe("shape");
    expect(entry.stack).toBe("stack@123");
    expect(entry.context).toBeDefined();
    expect(entry.dedupeKey).toBeDefined();
    expect(entry.dedupeCount).toBe(1);
  });

  it("componenteStack se incluye cuando se pasa", () => {
    const entry = reportError(makeErr("cs"), {
      componentStack: "  at ComponentA\n  at ComponentB",
    });
    expect(entry.componentStack).toBe("  at ComponentA\n  at ComponentB");
  });

  it("dedup: errores con mismo message pero diferente url NO se deduplican", () => {
    reportError(makeErr("same"), { context: { url: "https://a/" } });
    reportError(makeErr("same"), { context: { url: "https://b/" } });
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });
});
