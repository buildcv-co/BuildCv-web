/**
 * Tests RED → GREEN de `promoteConfidence` (PR 4d).
 *
 * Constitution Art. I: parser nunca emite `user_confirmed`. Solo el editor
 * al guardar promueve los campos que el usuario tocó activamente. Esta
 * función pura es el corazón de esa invariante.
 *
 * Cobertura de los 7 escenarios del spec:
 *  1. Sin campos tocados → cv idéntico (pureza + early-return).
 *  2. Tocar `basics.email` promueve SOLO ese slot — `work` intacto.
 *  3. Tocar `work.0.position` promueve SOLO ese field (granularidad leaf).
 *  4. Tocar `work.<idx>.position` para varios idx → todos esos campos
 *     promovidos, los demás slots quedan como estaban.
 *  5. Parser nunca sube `explicit` a `user_confirmed` aunque otros slots
 *     se promuevan — el `explicit` es del parser, no del usuario.
 *  6. CV vacío + campos básicos tocados → CV vacío con esos slots
 *     promovidos + `meta.engineVersion === "2.0.0"` (SemVer seal intacto).
 *  7. Los data fields (name, email, dates, highlights) NO se modifican —
 *     solo cambia `confidence`.
 *
 * Patrón de naming: `promoteConfidence_<Behavior>_<Expected>` (consistente
 * con `BasicsForm_<Behavior>_<Expected>` de PR 4c).
 */
import { describe, expect, it } from "vitest";
import { promoteConfidence } from "@/lib/editor/confidence-promotion";
import type { CvDocument, Basics, Work } from "@/lib/editor/types";

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

const BASICS_CONF_INFERRED = {
  name: "inferred",
  email: "inferred",
  phone: "inferred",
  location: "inferred",
  url: "inferred",
  profiles: "inferred",
  summary: "inferred",
  datosPersonales: "inferred",
} as const;

const WORK_CONF_INFERRED = {
  name: "inferred",
  position: "inferred",
  startDate: "inferred",
  endDate: "inferred",
  summary: "inferred",
  highlights: "inferred",
} as const;

function makeBasics(overrides: Partial<Basics> = {}): Basics {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    profiles: [],
    confidence: { ...BASICS_CONF_INFERRED },
    ...overrides,
  } as Basics;
}

function makeWork(overrides: Partial<Work> = {}): Work {
  return {
    name: "Acme",
    position: "Engineer",
    startDate: "2024-01",
    endDate: "Present",
    summary: "Did things",
    highlights: ["Built X", "Shipped Y"],
    confidence: { ...WORK_CONF_INFERRED },
    ...overrides,
  } as Work;
}

function makeCv(overrides: Partial<CvDocument> = {}): CvDocument {
  return {
    basics: makeBasics(),
    work: [],
    education: [],
    skills: [],
    meta: { engineVersion: "2.0.0" },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Pureza: touched vacío → cv idéntico
// ─────────────────────────────────────────────────────────────────────

describe("promoteConfidence_NoTouchedFields_Returns_CvDocument_Unchanged", () => {
  it("con touched set vacío, el cv retornado es deep-equal al input", () => {
    const cv = makeCv({
      basics: makeBasics(),
      work: [makeWork()],
    });
    const result = promoteConfidence(cv, new Set());
    expect(result).toEqual(cv);
  });

  it("con touched set vacío, no muta el cv de entrada (pureza)", () => {
    const cv = makeCv({
      basics: makeBasics(),
      work: [makeWork()],
    });
    const snapshot = JSON.parse(JSON.stringify(cv));
    promoteConfidence(cv, new Set());
    expect(cv).toEqual(snapshot);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. basics.email tocado → solo ese slot promovido; work intacto
// ─────────────────────────────────────────────────────────────────────

describe("promoteConfidence_TouchedField_Basics_Email_Sets_Basics_Confidence_UserConfirmed_Leaves_Work_Confidence_Inferred", () => {
  it("tocar basics.email promueve solo basics.confidence.email; work no cambia", () => {
    const cv = makeCv({
      basics: makeBasics(),
      work: [makeWork()],
    });
    const result = promoteConfidence(cv, new Set(["basics.email"]));
    expect(result.basics.confidence.email).toBe("user_confirmed");
    // Otros slots de basics NO se promueven automáticamente
    expect(result.basics.confidence.name).toBe("inferred");
    expect(result.basics.confidence.phone).toBe("inferred");
    // work NO se toca
    expect(result.work[0]?.confidence.position).toBe("inferred");
    expect(result.work[0]?.confidence.name).toBe("inferred");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. work.0.position tocado → solo work[0].confidence.position promovido
// ─────────────────────────────────────────────────────────────────────

describe("promoteConfidence_TouchedField_Work_0_Position_Sets_Only_Work_0_Confidence_UserConfirmed", () => {
  it("tocar work.0.position promueve SOLO work[0].confidence.position", () => {
    const cv = makeCv({
      work: [
        makeWork({ position: "Engineer A" }),
        makeWork({ position: "Engineer B" }),
      ],
    });
    const result = promoteConfidence(cv, new Set(["work.0.position"]));
    // work[0].position promovido
    expect(result.work[0]?.confidence.position).toBe("user_confirmed");
    // work[1] intacto
    expect(result.work[1]?.confidence.position).toBe("inferred");
    // Otros slots de work[0] intactos (granularidad leaf)
    expect(result.work[0]?.confidence.name).toBe("inferred");
    expect(result.work[0]?.confidence.startDate).toBe("inferred");
    expect(result.work[0]?.confidence.endDate).toBe("inferred");
    expect(result.work[0]?.confidence.summary).toBe("inferred");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Varios work.<idx>.position tocados → todos promovidos, otros slots no
// ─────────────────────────────────────────────────────────────────────

describe("promoteConfidence_TouchedField_Work_All_Positions_Sets_All_Work_Items_Confidence_UserConfirmed", () => {
  it("tocar position de cada work item promueve todos los position; otros slots quedan inferred", () => {
    const cv = makeCv({
      work: [
        makeWork({ position: "Engineer A" }),
        makeWork({ position: "Engineer B" }),
        makeWork({ position: "Engineer C" }),
      ],
    });
    const result = promoteConfidence(
      cv,
      new Set(["work.0.position", "work.1.position", "work.2.position"]),
    );
    for (let i = 0; i < result.work.length; i += 1) {
      expect(result.work[i]?.confidence.position).toBe("user_confirmed");
      // Otros slots del mismo item NO se promueven automáticamente
      expect(result.work[i]?.confidence.name).toBe("inferred");
      expect(result.work[i]?.confidence.startDate).toBe("inferred");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Parser nunca sube 'explicit' a 'user_confirmed' (ni siquiera parcialmente)
// ─────────────────────────────────────────────────────────────────────

describe("promoteConfidence_Parser_Never_Sets_UserConfirmed_Even_When_Confidence_Is_Explicit", () => {
  it("con touched vacío, los slots 'explicit' del parser NO se promueven", () => {
    const cv = makeCv({
      basics: makeBasics({
        confidence: {
          ...BASICS_CONF_INFERRED,
          name: "explicit",
          email: "explicit",
        },
      }),
      work: [
        makeWork({
          confidence: { ...WORK_CONF_INFERRED, position: "explicit" },
        }),
      ],
    });
    const result = promoteConfidence(cv, new Set());
    // explicit se queda como explicit — Constitution Art. I
    expect(result.basics.confidence.name).toBe("explicit");
    expect(result.basics.confidence.email).toBe("explicit");
    expect(result.work[0]?.confidence.position).toBe("explicit");
  });

  it("tocar basics.email promueve email pero name (que era explicit) NO se sube a user_confirmed", () => {
    const cv = makeCv({
      basics: makeBasics({
        confidence: {
          ...BASICS_CONF_INFERRED,
          name: "explicit",
          email: "explicit",
        },
      }),
    });
    const result = promoteConfidence(cv, new Set(["basics.email"]));
    expect(result.basics.confidence.email).toBe("user_confirmed");
    // name era explicit → se mantiene explicit (parser emitió; usuario no lo tocó)
    expect(result.basics.confidence.name).toBe("explicit");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6. CV vacío + basics tocado → CV vacío + slots promovidos + meta sellado
// ─────────────────────────────────────────────────────────────────────

describe("promoteConfidence_Empty_CvDocument_Returns_Empty_CvDocument_With_UserConfirmed_Meta", () => {
  it("CV mínimo con basics/name,email tocados → mismas secciones vacías + slots promovidos + meta.engineVersion intacto", () => {
    const cv: CvDocument = {
      basics: {
        name: "",
        email: "",
        profiles: [],
        confidence: { ...BASICS_CONF_INFERRED },
      },
      work: [],
      education: [],
      skills: [],
      meta: { engineVersion: "2.0.0" },
    };
    const result = promoteConfidence(
      cv,
      new Set(["basics.email", "basics.name"]),
    );
    // Data preserved (sigue vacío)
    expect(result.basics.name).toBe("");
    expect(result.basics.email).toBe("");
    expect(result.work).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.skills).toEqual([]);
    // Slots tocados promovidos
    expect(result.basics.confidence.email).toBe("user_confirmed");
    expect(result.basics.confidence.name).toBe("user_confirmed");
    // Slots no tocados siguen inferred
    expect(result.basics.confidence.phone).toBe("inferred");
    expect(result.basics.confidence.summary).toBe("inferred");
    // Meta sellada — SemVer seal NO se rompe
    expect(result.meta.engineVersion).toBe("2.0.0");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 7. Solo cambia confidence; los data fields se preservan exactamente
// ─────────────────────────────────────────────────────────────────────

describe("promoteConfidence_Preserves_All_Fields_Only_Changes_Confidence", () => {
  it("data fields preservados; solo cambian los confidence slots tocados", () => {
    const cv = makeCv({
      basics: makeBasics({
        name: "Ada Lovelace",
        email: "ada@example.com",
        location: "London",
      }),
      work: [
        makeWork({
          name: "Acme",
          position: "Engineer",
          startDate: "2024-01",
          endDate: "Present",
          summary: "Built things",
          highlights: ["X", "Y"],
        }),
      ],
    });
    const result = promoteConfidence(
      cv,
      new Set(["basics.email", "work.0.position"]),
    );

    // Data preserved exactamente
    expect(result.basics.name).toBe("Ada Lovelace");
    expect(result.basics.email).toBe("ada@example.com");
    expect(result.basics.location).toBe("London");
    expect(result.work[0]?.name).toBe("Acme");
    expect(result.work[0]?.position).toBe("Engineer");
    expect(result.work[0]?.startDate).toBe("2024-01");
    expect(result.work[0]?.endDate).toBe("Present");
    expect(result.work[0]?.summary).toBe("Built things");
    expect(result.work[0]?.highlights).toEqual(["X", "Y"]);

    // Confidence slots tocados promovidos
    expect(result.basics.confidence.email).toBe("user_confirmed");
    expect(result.work[0]?.confidence.position).toBe("user_confirmed");
    // Confidence slots no tocados quedan como estaban
    expect(result.basics.confidence.name).toBe("inferred");
    expect(result.work[0]?.confidence.name).toBe("inferred");
  });
});
