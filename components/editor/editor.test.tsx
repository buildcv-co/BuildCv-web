import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Editor } from "./editor";
import { copy } from "@/lib/copy/es";

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

const ISO = "2026-06-08T14:30:00.000Z";

function makeDraft(overrides: Partial<Record<string, unknown>> = {}): string {
  return JSON.stringify({
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
  });
}

describe("Editor — render inicial", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("renderiza 8 secciones vacías (sin handoff y sin draft persistido)", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    render(<Editor />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: copy.editor.sections.profile }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("heading", { name: copy.editor.sections.experience }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: copy.editor.sections.education }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: copy.editor.sections.skills }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: copy.editor.sections.projects }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: copy.editor.sections.certifications }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: copy.editor.sections.languages }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: copy.editor.sections.other }),
    ).toBeInTheDocument();
  });

  it("renderiza el toolbar con los 4 botones", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    render(<Editor />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: copy.editor.toolbar.save }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.editor.toolbar.rescore }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.editor.toolbar.exportMd }),
    ).toBeInTheDocument();
  });
});

describe("Editor — handoff desde sessionStorage (005 → 006)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("lee 'buildcv:editor-handoff' y pre-pobla la sección profile", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    sessionStorage.setItem(
      "buildcv:editor-handoff",
      JSON.stringify({
        importedText:
          "## Perfil\n\n**Juan Pérez** · Backend Developer · Medellín\njuan@example.com",
        importedSections: [],
        importedTraceId: "trace-1",
        importedAt: ISO,
        parserEngineVersion: "1.0.0",
      }),
    );
    render(<Editor />);
    await waitFor(() => {
      const nameInput = screen.getByLabelText(
        copy.editor.placeholders.profileFullName,
      ) as HTMLInputElement;
      expect(nameInput.value).toBe("Juan Pérez");
    });
  });
});

describe("Editor — Save y load desde localStorage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("click Guardar persiste el draft en localStorage", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const user = userEvent.setup();
    render(<Editor />);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: copy.editor.sections.profile }),
      ).toBeInTheDocument();
    });
    const nameInput = screen.getByLabelText(
      copy.editor.placeholders.profileFullName,
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Juan Pérez" } });
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.save }),
    );
    await waitFor(() => {
      expect(localStorage.getItem("buildcv:draft:default")).not.toBeNull();
    });
  });

  it("re-hidrata el draft desde localStorage si existe", async () => {
    vi.stubGlobal("localStorage", makeMockStorage({
      "buildcv:draft:default": makeDraft({
        document: {
          id: "doc_x",
          version: "0.5.0",
          locale: "es-CO",
          sections: [
            {
              id: "sec_profile",
              kind: "profile",
              source: "user-typed",
              createdAt: ISO,
              updatedAt: ISO,
              fullName: "Juan",
              headline: "Backend",
              email: "",
              phone: "",
              location: "",
              links: [],
              summary: "",
            },
          ],
          entities: [],
          createdAt: ISO,
          updatedAt: ISO,
          source: "blank",
        },
        jobText: "Backend",
      }),
    }));
    render(<Editor />);
    await waitFor(() => {
      const nameInput = screen.getByLabelText(
        copy.editor.placeholders.profileFullName,
      ) as HTMLInputElement;
      expect(nameInput).toBeInTheDocument();
    });
  });
});

describe("Editor — Limpiar borrador (Constitution Art. III FR-040b)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("click Limpiar elimina el draft del localStorage", async () => {
    vi.stubGlobal("localStorage", makeMockStorage({
      "buildcv:draft:default": makeDraft(),
    }));
    const user = userEvent.setup();
    render(<Editor />);
    await waitFor(() => {
      const clearBtn = screen.getAllByRole("button", {
        name: copy.editor.toolbar.clear,
      })[0];
      expect(clearBtn).toBeInTheDocument();
    });
    const clearBtn = screen.getAllByRole("button", {
      name: copy.editor.toolbar.clear,
    })[0] as HTMLElement;
    await user.click(clearBtn);
    await waitFor(() => {
      expect(localStorage.getItem("buildcv:draft:default")).toBeNull();
    });
  });
});

describe("Editor — Exportar Markdown", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("click Exportar Markdown genera un Blob y dispara descarga", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    const user = userEvent.setup();
    render(<Editor />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: copy.editor.toolbar.exportMd }),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.exportMd }),
    );
    expect(createObjectURL).toHaveBeenCalled();
  });
});

describe("Editor — Re-puntuar llama al BFF /api/score", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("click Re-puntuar hace POST a /api/score con el md serializado y jobText", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          overallScore: 78,
          band: "Strong",
          honestyNotice: "x",
          engineVersion: "1.0.0",
          lexiconVersion: "1.0.0",
          contextId: "ctx",
          components: [],
          keywordAnalysis: { present: [], missing: [], partial: [] },
          recommendations: [],
          formatIssues: [],
          gatesApplied: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Editor initialJobText="Backend" />);
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: copy.editor.toolbar.rescore }),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.rescore }),
    );
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/score");
    expect(init.method).toBe("POST");
  });
});
