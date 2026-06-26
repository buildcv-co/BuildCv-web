/**
 * PR 6c — Round-trip tests for `CvDocument` JSON Resume via
 * `LocalStorageCvStore`.
 *
 * El editor (PR 4e) ya escribe un `CvDocument` JSON Resume bajo
 * `buildcv:editor:cv-document-v2`, pero lo hace con `localStorage.*`
 * directos. Estos tests anclan el contrato formal del store: dado un
 * `CvDocument` válido (con `meta.engineVersion === "2.0.0"`,
 * `ConfidenceMarker` por slot, y opcional `datosPersonales` colombiano),
 * el round-trip save→load DEBE preservar el documento byte-identical
 * (Zod re-valida en load; cualquier campo faltante o tipo mal serializado
 * hace que `loadCv` retorne `null`).
 *
 * Constitution Art. I: los `ConfidenceMarker` DEBEN sobrevivir el
 * round-trip — si el serializer los dropea, los `inferred`/`user_confirmed`
 * se pierden y el contrato del usuario con el editor se rompe.
 * Constitution Art. III: nada sale del browser — todo local.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LocalStorageCvStore } from "@/lib/storage/icv-store";
import type { CvDocument } from "@/lib/editor/types";
import basicCv from "../../fixtures/json-resume/basic-cv.json";
import fullCv from "../../fixtures/json-resume/full-cv.json";
import colombianCv from "../../fixtures/json-resume/colombian-cv.json";

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

/**
 * Cada fixture se trata como `CvDocument` para que TS verifique que la
 * shape completa (incluyendo TODOS los confidence slots requeridos por
 * Zod) está presente. Si una fixture se rompe, este cast falla en
 * compilación.
 */
const basic: CvDocument = basicCv as CvDocument;
const full: CvDocument = fullCv as CvDocument;
const colombian: CvDocument = colombianCv as CvDocument;

describe("LocalStorageCvStore — CvDocument round-trip", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("LocalStorageCvStore_Save_And_Load_CvDocument_Returns_Equal_Document", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();

    await store.saveCv("basic", basic);
    const loaded = await store.loadCv("basic");

    expect(loaded).not.toBeNull();
    expect(loaded).toEqual(basic);
  });

  it("LocalStorageCvStore_Load_After_Save_Preserves_Confidence_Markers", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();

    await store.saveCv("full", full);
    const loaded = await store.loadCv("full");

    expect(loaded).not.toBeNull();
    // basics — 8 slots de confidence
    expect(loaded?.basics.confidence).toEqual(full.basics.confidence);
    // work — cada entry tiene 6 slots de confidence
    expect(loaded?.work).toHaveLength(full.work.length);
    for (let i = 0; i < (loaded?.work.length ?? 0); i++) {
      expect(loaded?.work[i]?.confidence).toEqual(full.work[i]?.confidence);
    }
    // skills — cada entry tiene 3 slots
    expect(loaded?.skills).toHaveLength(full.skills.length);
    for (let i = 0; i < (loaded?.skills.length ?? 0); i++) {
      expect(loaded?.skills[i]?.confidence).toEqual(
        full.skills[i]?.confidence,
      );
    }
    // projects / certificates / languages / awards / interests / references
    // (todos opcionales en el schema, pero presentes en `full-cv.json`)
    expect(loaded?.projects?.[0]?.confidence).toEqual(
      full.projects?.[0]?.confidence,
    );
    expect(loaded?.certificates?.[0]?.confidence).toEqual(
      full.certificates?.[0]?.confidence,
    );
    expect(loaded?.languages?.[0]?.confidence).toEqual(
      full.languages?.[0]?.confidence,
    );
    expect(loaded?.awards?.[0]?.confidence).toEqual(
      full.awards?.[0]?.confidence,
    );
    expect(loaded?.interests?.[0]?.confidence).toEqual(
      full.interests?.[0]?.confidence,
    );
    expect(loaded?.references?.[0]?.confidence).toEqual(
      full.references?.[0]?.confidence,
    );
  });

  it("LocalStorageCvStore_Load_After_Save_Preserves_Colombian_DatosPersonales", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();

    await store.saveCv("co", colombian);
    const loaded = await store.loadCv("co");

    expect(loaded).not.toBeNull();
    expect(loaded?.basics.datosPersonales).toEqual(
      colombian.basics.datosPersonales,
    );
    // Drill into each Colombian field to make the failure obvious if the
    // serializer drops one (Constitution Art. I — no field may be lost).
    expect(loaded?.basics.datosPersonales?.cedula).toBe("1234567890");
    expect(loaded?.basics.datosPersonales?.nacionalidad).toBe("CO");
    expect(loaded?.basics.datosPersonales?.estadoCivil).toBe("casado");
    expect(loaded?.basics.datosPersonales?.libretaMilitar).toBe("no_aplica");
    expect(loaded?.basics.datosPersonales?.rh).toBe("O+");
    expect(loaded?.basics.confidence.datosPersonales).toBe("user_confirmed");
  });

  it("LocalStorageCvStore_Load_After_Save_Preserves_EngineVersion_In_Meta", async () => {
    const storage = makeMockStorage();
    vi.stubGlobal("localStorage", storage);
    const store = new LocalStorageCvStore();

    await store.saveCv("full", full);
    const loaded = await store.loadCv("full");

    expect(loaded).not.toBeNull();
    expect(loaded?.meta.engineVersion).toBe("2.0.0");
    // Round-trip a basic fixture too — meta must be preserved across
    // different document sizes.
    await store.saveCv("basic", basic);
    const basicLoaded = await store.loadCv("basic");
    expect(basicLoaded?.meta.engineVersion).toBe("2.0.0");
  });
});