import { describe, it, expect, beforeEach, vi } from "vitest";
import { BLANK_DOCUMENT } from "./index";
import { CvDocumentSchema, DraftSchema } from "@/lib/editor/schema";
import type { Draft } from "@/lib/editor/types";

const ISO = "2026-06-08T14:30:00.000Z";

interface WritableStorage {
  length: number;
  clear: () => void;
  getItem: (key: string) => string | null;
  key: (index: number) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

function makeMockStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  const store: WritableStorage = {
    length: data.size,
    clear: (): void => {
      data.clear();
      store.length = 0;
    },
    getItem: (key: string): string | null =>
      data.has(key) ? (data.get(key) as string) : null,
    key: (i: number): string | null => Array.from(data.keys())[i] ?? null,
    removeItem: (key: string): void => {
      data.delete(key);
      store.length = data.size;
    },
    setItem: (key: string, value: string): void => {
      data.set(key, value);
      store.length = data.size;
    },
  };
  return store as unknown as Storage;
}

function makeDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: "default",
    document: BLANK_DOCUMENT,
    jobText: "",
    scoreHistory: [],
    lastSavedAt: ISO,
    engineVersions: { editor: "0.5.0", score: "1.0.0" },
    ...overrides,
  };
}

describe("getCvStore", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("retorna una instancia (no null) en jsdom con localStorage", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const { getCvStore: getCvStoreFresh } = await import("./index");
    const store = await getCvStoreFresh();
    expect(store).not.toBeNull();
    expect(typeof store.save).toBe("function");
    expect(typeof store.load).toBe("function");
  });

  it("retorna la misma instancia en llamadas repetidas (singleton)", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const { getCvStore: getCvStoreFresh } = await import("./index");
    const a = await getCvStoreFresh();
    const b = await getCvStoreFresh();
    expect(a).toBe(b);
  });

  it("save + load funciona vía factory", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const { getCvStore: getCvStoreFresh } = await import("./index");
    const store = await getCvStoreFresh();
    await store.save(makeDraft({ id: "default", jobText: "x".repeat(200) }));
    const loaded = await store.load("default");
    expect(loaded?.jobText).toBe("x".repeat(200));
  });

  it("clearAll elimina todas las claves buildcv:draft:*", async () => {
    vi.stubGlobal(
      "localStorage",
      makeMockStorage({
        "buildcv:draft:abc": "x",
        "buildcv:draft:def": "y",
        "other:key": "preserve",
      }),
    );
    const { getCvStore: getCvStoreFresh } = await import("./index");
    const store = await getCvStoreFresh();
    await store.clearAll();
    const after = await store.list();
    expect(after).toHaveLength(0);
  });
});

describe("BLANK_DOCUMENT", () => {
  it("pasa CvDocumentSchema", () => {
    const r = CvDocumentSchema.safeParse(BLANK_DOCUMENT);
    expect(r.success).toBe(true);
  });

  it("source es 'blank'", () => {
    expect(BLANK_DOCUMENT.source).toBe("blank");
  });

  it("es un CvDocument draft-válido", () => {
    const draft = makeDraft();
    const r = DraftSchema.safeParse(draft);
    expect(r.success).toBe(true);
  });
});
