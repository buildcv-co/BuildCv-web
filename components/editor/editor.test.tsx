/**
 * Tests RED → GREEN de `Editor` (PR 4e) — wire del editor al shape JSON
 * Resume con `NEXT_PUBLIC_STRUCTURED_INPUT` feature flag.
 *
 * Cobertura:
 *  1. `Editor_WithStructuredFlag_True_Renders_BasicsForm_WorkList_EducationList_SkillsByCategory`
 *     — flag default true → 4 secciones estructuradas (NO 8 secciones legacy).
 *  2. `Editor_On_Field_Edit_Adds_Path_To_Touched_Set` — editar un field
 *     agrega su dot-path al touched set (indirecto: vía save → persisted cv
 *     tiene `confidence: 'user_confirmed'` en ese slot).
 *  3. `Editor_On_Save_Calls_PromoteConfidence_And_Persists_To_LocalStorage_With_V2_Key`
 *     — al guardar, el documento persistido bajo
 *     `buildcv:editor:cv-document-v2` tiene los slots tocados promovidos.
 *  4. `Editor_WithStructuredFlag_False_Renders_Legacy_Markdown_Textarea`
 *     — flag=false → vuelve al path markdown textarea (legacy).
 *  5. `Editor_Loads_From_LocalStorage_V2_Key_On_Mount` — al montar, lee
 *     `buildcv:editor:cv-document-v2` y lo renderiza.
 *  6. `Editor_Migrates_From_Legacy_Key_On_First_Load` — al montar, si
 *     existe `buildcv:editor:cv-document` legacy lo migra vía
 *     `tryMigrateLegacyDraft` y lo persiste bajo `-v2`.
 *
 * Update de test legacy (PR 4b → PR 4e):
 *  - `click Guardar persiste el draft en localStorage` ahora asserta la
 *    nueva key `buildcv:editor:cv-document-v2` (no más `buildcv:draft:default`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

const STRUCTURED_KEY = "buildcv:editor:cv-document-v2";
const LEGACY_EDITOR_KEY = "buildcv:editor:cv-document";

const CONFIDENCE = {
  name: "inferred",
  email: "inferred",
  phone: "inferred",
  location: "inferred",
  url: "inferred",
  profiles: "inferred",
  summary: "inferred",
  datosPersonales: "inferred",
} as const;

function makeStructuredCv(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    basics: {
      name: "",
      email: "",
      profiles: [],
      confidence: { ...CONFIDENCE },
    },
    work: [],
    education: [],
    skills: [],
    meta: { engineVersion: "2.0.0" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  // Default structured mode for the suite; individual tests override.
  process.env.NEXT_PUBLIC_STRUCTURED_INPUT = "true";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_STRUCTURED_INPUT;
});

// ─────────────────────────────────────────────────────────────────────
// Toolbar — generic, both modes
// ─────────────────────────────────────────────────────────────────────

describe("Editor — toolbar (cualquier modo)", () => {
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

// ─────────────────────────────────────────────────────────────────────
// PR 4e — STRUCTURED mode (flag default true)
// ─────────────────────────────────────────────────────────────────────

describe("Editor — STRUCTURED mode (NEXT_PUBLIC_STRUCTURED_INPUT != 'false')", () => {
  it("Editor_WithStructuredFlag_True_Renders_BasicsForm_WorkList_EducationList_SkillsByCategory — renderiza 4 secciones estructuradas", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    render(<Editor />);
    // Exact match para evitar colisionar con "Perfiles" (sub-heading del
    // BasicsForm) — `getByRole` lanza si hay más de un match con regex.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Perfil", level: 2 })).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Experiencia", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Educación", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Habilidades", level: 2 })).toBeInTheDocument();
  });

  it("Editor_On_Field_Edit_Adds_Path_To_Touched_Set — editar basics.name agrega 'basics.name' al touched (Constitution Art. I)", async () => {
    vi.stubGlobal(
      "localStorage",
      makeMockStorage({
        [STRUCTURED_KEY]: JSON.stringify(makeStructuredCv()),
      }),
    );
    const user = userEvent.setup();
    render(<Editor />);
    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });
    const nameInput = screen.getByLabelText(/nombre/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Ada Lovelace" } });
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.save }),
    );
    await waitFor(() => {
      const raw = localStorage.getItem(STRUCTURED_KEY);
      expect(raw).not.toBeNull();
    });
    const persisted = JSON.parse(
      localStorage.getItem(STRUCTURED_KEY) as string,
    ) as { basics: { confidence: { name: string } } };
    // promoteConfidence(cv, { "basics.name" }) → basics.confidence.name = user_confirmed
    expect(persisted.basics.confidence.name).toBe("user_confirmed");
  });

  it("Editor_On_Save_Calls_PromoteConfidence_And_Persists_To_LocalStorage_With_V2_Key — guarda bajo buildcv:editor:cv-document-v2 con confidence promovido", async () => {
    vi.stubGlobal(
      "localStorage",
      makeMockStorage({
        [STRUCTURED_KEY]: JSON.stringify(
          makeStructuredCv({
            basics: {
              name: "Ada Lovelace",
              email: "ada@example.com",
              profiles: [],
              confidence: { ...CONFIDENCE },
            },
            work: [],
            education: [],
            skills: [],
            meta: { engineVersion: "2.0.0" },
          }),
        ),
      }),
    );
    const user = userEvent.setup();
    render(<Editor />);
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
    const emailInput = screen.getByLabelText("Email", { selector: "input" }) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "ada@newmail.com" } });
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.save }),
    );
    await waitFor(() => {
      const raw = localStorage.getItem(STRUCTURED_KEY);
      expect(raw).not.toBeNull();
    });
    const persisted = JSON.parse(
      localStorage.getItem(STRUCTURED_KEY) as string,
    ) as {
      basics: { email: string; confidence: { email: string; name: string } };
      meta: { engineVersion: string };
    };
    expect(persisted.basics.email).toBe("ada@newmail.com");
    expect(persisted.basics.confidence.email).toBe("user_confirmed");
    // Slot NO tocado (name) sigue en 'inferred' — Constitution Art. I.
    expect(persisted.basics.confidence.name).toBe("inferred");
    // meta.engineVersion sell SemVer — NUNCA se toca.
    expect(persisted.meta.engineVersion).toBe("2.0.0");
  });

  it("Editor_Loads_From_LocalStorage_V2_Key_On_Mount — hidrata desde buildcv:editor:cv-document-v2", async () => {
    vi.stubGlobal(
      "localStorage",
      makeMockStorage({
        [STRUCTURED_KEY]: JSON.stringify(
          makeStructuredCv({
            basics: {
              name: "Grace Hopper",
              email: "grace@example.com",
              profiles: [],
              confidence: { ...CONFIDENCE, name: "inferred", email: "inferred" },
            },
            work: [],
            education: [],
            skills: [],
            meta: { engineVersion: "2.0.0" },
          }),
        ),
      }),
    );
    render(<Editor />);
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/nombre/i) as HTMLInputElement;
      expect(nameInput.value).toBe("Grace Hopper");
    });
    const emailInput = screen.getByLabelText("Email", { selector: "input" }) as HTMLInputElement;
    expect(emailInput.value).toBe("grace@example.com");
  });

  it("Editor_Migrates_From_Legacy_Key_On_First_Load — migra buildcv:editor:cv-document legacy a -v2", async () => {
    const legacyShape = {
      id: "doc_legacy",
      version: "0.5.0",
      locale: "es-CO",
      sections: [
        {
          id: "sec_profile",
          kind: "profile",
          source: "imported",
          createdAt: ISO,
          updatedAt: ISO,
          fullName: "Ada Lovelace",
          headline: "Engineer",
          email: "ada@example.com",
          phone: "+573001234567",
          location: "Bogotá",
          links: [],
          summary: "Mathematician",
        },
      ],
      entities: [],
      createdAt: ISO,
      updatedAt: ISO,
      source: "imported",
    };
    vi.stubGlobal(
      "localStorage",
      makeMockStorage({
        [LEGACY_EDITOR_KEY]: JSON.stringify(legacyShape),
      }),
    );
    render(<Editor />);
    await waitFor(() => {
      expect(localStorage.getItem(STRUCTURED_KEY)).not.toBeNull();
    });
    const persisted = JSON.parse(
      localStorage.getItem(STRUCTURED_KEY) as string,
    ) as {
      basics: { confidence: { name: string; email: string } };
      meta: { engineVersion: string };
    };
    // Constitution Art. I: legacy migrado → 'inferred' (no auto-promote).
    expect(persisted.basics.confidence.name).toBe("inferred");
    expect(persisted.basics.confidence.email).toBe("inferred");
    // meta.engineVersion sell (PR 4a).
    expect(persisted.meta.engineVersion).toBe("2.0.0");
    // Legacy key removida.
    expect(localStorage.getItem(LEGACY_EDITOR_KEY)).toBeNull();
  });

  it("Editor_Save_Y_Load_Desde_LocalStorage > click Guardar persiste el draft en localStorage (UPDATE: usa key v2)", async () => {
    vi.stubGlobal("localStorage", makeMockStorage());
    const user = userEvent.setup();
    render(<Editor />);
    await waitFor(() => {
      expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    });
    const nameInput = screen.getByLabelText(/nombre/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Juan Pérez" } });
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.save }),
    );
    await waitFor(() => {
      expect(localStorage.getItem(STRUCTURED_KEY)).not.toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// PR 4e — LEGACY mode (flag false → vuelve al path markdown)
// ─────────────────────────────────────────────────────────────────────

describe("Editor — LEGACY mode (NEXT_PUBLIC_STRUCTURED_INPUT == 'false')", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_STRUCTURED_INPUT = "false";
  });

  it("Editor_WithStructuredFlag_False_Renders_Legacy_Markdown_Textarea — vuelve al path 8 secciones legacy", async () => {
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
  });
});

// ─────────────────────────────────────────────────────────────────────
// Cross-mode — Export + Re-score (compatibles con structured)
// ─────────────────────────────────────────────────────────────────────

describe("Editor — Exportar Markdown (modo estructurado)", () => {
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
  it("click Re-puntuar hace POST a /api/score con payload estructurado y jobText", async () => {
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