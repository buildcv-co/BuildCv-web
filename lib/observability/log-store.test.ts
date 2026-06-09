import { describe, it, expect, beforeEach } from "vitest";
import { logStore } from "./log-store";
import type { LogEntry } from "./types";

const makeEntry = (i: number): LogEntry => ({
  timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
  level: "error",
  message: `error ${i}`,
  context: {
    url: "https://buildcv.co/",
    userAgent: "Mozilla/5.0",
    viewport: { width: 1280, height: 720 },
    appVersion: "0.5.1",
    buildSha: "a312662",
    locale: "es-CO",
  },
});

describe("logStore", () => {
  beforeEach(() => {
    logStore.clear();
  });

  it("add() agrega una entrada", () => {
    logStore.add(makeEntry(1));
    expect(logStore.size()).toBe(1);
    expect(logStore.getAll()).toHaveLength(1);
  });

  it("getAll() retorna una COPIA (no la referencia interna)", () => {
    logStore.add(makeEntry(1));
    const a = logStore.getAll();
    const b = logStore.getAll();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it("size() refleja la cantidad de entradas", () => {
    expect(logStore.size()).toBe(0);
    logStore.add(makeEntry(1));
    logStore.add(makeEntry(2));
    expect(logStore.size()).toBe(2);
  });

  it("clear() vacía el store", () => {
    logStore.add(makeEntry(1));
    logStore.add(makeEntry(2));
    expect(logStore.size()).toBe(2);
    logStore.clear();
    expect(logStore.size()).toBe(0);
    expect(logStore.getAll()).toEqual([]);
  });

  it("FIFO: agregar 101 entradas descarta la primera, size permanece 100", () => {
    for (let i = 0; i < 101; i += 1) {
      logStore.add(makeEntry(i));
    }
    expect(logStore.size()).toBe(100);
    const all = logStore.getAll();
    // La entrada #0 (i=0) fue descartada; la #100 está presente
    expect(all[0]?.message).toBe("error 1");
    expect(all[99]?.message).toBe("error 100");
  });

  it("getAll() es readonly-compatible (no expone mutadores)", () => {
    logStore.add(makeEntry(1));
    const all = logStore.getAll();
    // El tipo es ReadonlyArray<LogEntry>. Verificamos que la mutación
    // no afecta al store (porque es una copia).
    (all as LogEntry[]).push(makeEntry(99));
    expect(logStore.size()).toBe(1);
  });
});
