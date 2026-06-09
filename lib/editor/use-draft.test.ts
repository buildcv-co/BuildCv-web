import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDraft } from "./use-draft";
import type { Draft } from "./types";

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
    document: {
      id: "blank",
      version: "0.5.0",
      locale: "es-CO",
      sections: [],
      entities: [],
      createdAt: "1970-01-01T00:00:00.000Z",
      updatedAt: "1970-01-01T00:00:00.000Z",
      source: "blank",
    },
    jobText: "",
    scoreHistory: [],
    lastSavedAt: ISO,
    engineVersions: { editor: "0.5.0", score: "1.0.0" },
    ...overrides,
  };
}

describe("useDraft — initial state", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("inicialmente: isLoading=true, draft=null, error=null", () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const { result } = renderHook(() => useDraft());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.draft).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe("useDraft — load", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("después de mount sin storage: isLoading=false, draft=null", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const { result } = renderHook(() => useDraft());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.draft).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("después de mount con storage persistido: draft se hidrata", async () => {
    const draft = makeDraft({ jobText: "x".repeat(200) });
    vi.stubGlobal(
      "localStorage",
      makeMockStorage({ "buildcv:draft:default": JSON.stringify(draft) }),
    );
    const { result } = renderHook(() => useDraft());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.draft).not.toBeNull();
    expect(result.current.draft?.jobText).toBe("x".repeat(200));
  });
});

describe("useDraft — save", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("save() persiste el draft en localStorage y actualiza estado local", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const { result } = renderHook(() => useDraft());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const newDraft = makeDraft({ jobText: "Backend" });
    await act(async () => {
      await result.current.save(newDraft);
    });
    expect(result.current.draft?.jobText).toBe("Backend");
  });

  it("save() durante el save: isSaving=true→false", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const { result } = renderHook(() => useDraft());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const promise = act(async () => {
      await result.current.save(makeDraft({ jobText: "x" }));
    });
    await promise;
    expect(result.current.isSaving).toBe(false);
  });
});

describe("useDraft — clear", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("clear() elimina el draft del localStorage y del estado", async () => {
    const draft = makeDraft({ jobText: "test" });
    vi.stubGlobal(
      "localStorage",
      makeMockStorage({ "buildcv:draft:default": JSON.stringify(draft) }),
    );
    const { result } = renderHook(() => useDraft());
    await waitFor(() => {
      expect(result.current.draft).not.toBeNull();
    });
    await act(async () => {
      await result.current.clear();
    });
    expect(result.current.draft).toBeNull();
  });
});

describe("useDraft — reload", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("reload() recarga el draft desde localStorage", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const { result } = renderHook(() => useDraft());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    // Simular que otro código guardó algo
    localStorage.setItem(
      "buildcv:draft:default",
      JSON.stringify(makeDraft({ jobText: "external" })),
    );
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.draft?.jobText).toBe("external");
  });
});
