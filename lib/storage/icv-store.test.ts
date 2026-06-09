import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalStorageCvStore } from "./icv-store";
import {
  QuotaExceededError,
  StorageUnavailableError,
  DraftNotFoundError,
} from "./errors";
import { DraftSchema, BLANK_DOCUMENT } from "@/lib/editor/schema";
import type { Draft } from "@/lib/editor/types";

const ISO = "2026-06-08T14:30:00.000Z";

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

describe("LocalStorageCvStore — save/load round-trip", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("save persiste y load recupera el mismo draft", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    const draft = makeDraft({ id: "abc" });
    await store.save(draft);
    const loaded = await store.load("abc");
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe("abc");
    expect(loaded?.engineVersions.editor).toBe("0.5.0");
  });

  it("save sobreescribe si ya existe", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    await store.save(makeDraft({ id: "abc", jobText: "old" }));
    await store.save(makeDraft({ id: "abc", jobText: "new" }));
    const loaded = await store.load("abc");
    expect(loaded?.jobText).toBe("new");
  });

  it("load retorna null si no existe", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    const loaded = await store.load("missing");
    expect(loaded).toBeNull();
  });

  it("save usa la clave buildcv:draft:{id}", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    await store.save(makeDraft({ id: "default" }));
    expect(storage.getItem("buildcv:draft:default")).not.toBeNull();
  });
});

describe("LocalStorageCvStore — validación de schema", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("save con draft inválido lanza error de Zod", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    const bad = {
      id: "x",
      document: { id: "x" },
    };
    await expect(
      store.save(bad as unknown as Draft),
    ).rejects.toThrow();
  });

  it("load con datos corruptos retorna null (no lanza)", async () => {
    const storage = makeMockStorage({
      "buildcv:draft:corrupt": "not valid json{{{",
    });
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    const loaded = await store.load("corrupt");
    expect(loaded).toBeNull();
  });

  it("load con JSON válido pero schema inválido retorna null", async () => {
    const storage = makeMockStorage({
      "buildcv:draft:bad": JSON.stringify({ id: "bad" }),
    });
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    const loaded = await store.load("bad");
    expect(loaded).toBeNull();
  });
});

describe("LocalStorageCvStore — QuotaExceededError", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("setItem lanza QuotaExceededError (DOMException) → store lanza QuotaExceededError", async () => {
    const storage = makeMockStorage();
    storage.setItem = (): void => {
      throw new DOMException("quota", "QuotaExceededError");
    };
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    await expect(store.save(makeDraft())).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
  });

  it("QuotaExceededError contiene bytesRequested y bytesAvailable", async () => {
    const storage = makeMockStorage();
    storage.setItem = (): void => {
      throw new DOMException("quota", "QuotaExceededError");
    };
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    try {
      await store.save(makeDraft());
    } catch (err) {
      expect(err).toBeInstanceOf(QuotaExceededError);
      if (err instanceof QuotaExceededError) {
        expect(err.bytesRequested).toBeGreaterThan(0);
        expect(typeof err.bytesAvailable).toBe("number");
      }
    }
  });
});

describe("LocalStorageCvStore — DraftNotFoundError", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("load con id con formato inválido lanza DraftNotFoundError", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    await expect(store.load("")).rejects.toBeInstanceOf(DraftNotFoundError);
    await expect(store.load("x".repeat(100))).rejects.toBeInstanceOf(
      DraftNotFoundError,
    );
  });
});

describe("LocalStorageCvStore — clear / clearAll / list", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("clear elimina un draft por id", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    await store.save(makeDraft({ id: "abc" }));
    await store.clear("abc");
    expect(await store.load("abc")).toBeNull();
  });

  it("clear con id inexistente es no-op (no lanza)", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    await expect(store.clear("missing")).resolves.toBeUndefined();
  });

  it("clearAll elimina todas las claves buildcv:draft:*", async () => {
    const storage = makeMockStorage({
      "buildcv:draft:abc": "x",
      "buildcv:draft:def": "y",
      "other:key": "preserve",
    });
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    await store.clearAll();
    expect(storage.getItem("buildcv:draft:abc")).toBeNull();
    expect(storage.getItem("buildcv:draft:def")).toBeNull();
    expect(storage.getItem("other:key")).toBe("preserve");
  });

  it("list retorna DraftSummary por cada draft persistido", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    await store.save(makeDraft({ id: "default" }));
    const summaries = await store.list();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.id).toBe("default");
    expect(summaries[0]?.lastSavedAt).toBe(ISO);
  });
});

describe("LocalStorageCvStore — onQuotaExceeded", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("suscribe handler y se invoca en quota error", async () => {
    const storage = makeMockStorage();
    storage.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    const handler = vi.fn();
    const unsub = store.onQuotaExceeded(handler);
    await expect(store.save(makeDraft())).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
    expect(handler).toHaveBeenCalledTimes(1);
    const arg = handler.mock.calls[0]?.[0];
    expect(arg).toBeInstanceOf(QuotaExceededError);
    unsub();
  });

  it("unsub desuscribe el handler", async () => {
    const storage = makeMockStorage();
    let calls = 0;
    storage.setItem = () => {
      calls++;
      throw new DOMException("quota", "QuotaExceededError");
    };
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();
    const handler = vi.fn();
    const unsub = store.onQuotaExceeded(handler);
    unsub();
    await expect(store.save(makeDraft())).rejects.toBeInstanceOf(
      QuotaExceededError,
    );
    expect(handler).not.toHaveBeenCalled();
    expect(calls).toBe(1);
  });
});

describe("Errores — jerarquía", () => {
  it("StorageUnavailableError se puede construir y tiene name", () => {
    const err = new StorageUnavailableError("test reason");
    expect(err.name).toBe("StorageUnavailableError");
    expect(err.message).toContain("test reason");
    expect(err).toBeInstanceOf(Error);
  });

  it("QuotaExceededError se puede construir", () => {
    const err = new QuotaExceededError(100, 50);
    expect(err.name).toBe("QuotaExceededError");
    expect(err.bytesRequested).toBe(100);
    expect(err.bytesAvailable).toBe(50);
  });

  it("DraftNotFoundError se puede construir", () => {
    const err = new DraftNotFoundError("abc");
    expect(err.name).toBe("DraftNotFoundError");
    expect(err.id).toBe("abc");
  });
});

describe("BLANK_DOCUMENT — integridad", () => {
  it("pasa DraftSchema como document de un draft válido", () => {
    const draft = makeDraft();
    const result = DraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
  });
});
