/**
 * Tests RED → GREEN de la migración de tipos del editor (PR 4b).
 *
 * El archivo `lib/editor/types.ts` se migra de un shape "8 secciones tipadas"
 * (ProfileSection / ExperienceSection / … / OtherSection) hacia JSON Resume
 * (basics / work / education / skills / projects / certificates / languages
 * + Colombian `datosPersonales` + `confidence` markers). El shape viejo
 * sobrevive como `LegacyCvDocument` para que `parseCvDocument()` (markdown
 * parser) y los payloads viejos de localStorage sigan funcionando hasta PR 4e.
 *
 * Reglas Constitution Art. I:
 *  - `migrateLegacyToJsonResume` siempre marca los campos como
 *    `confidence: 'inferred'` — la fuente (markdown plain-text) nunca es
 *    confirmación del usuario. Promote a `'user_confirmed'` solo en blur del
 *    editor (PR 4d).
 *  - `meta.engineVersion === "2.0.0"` — SemVer seal del schema JSON Resume
 *    (PR 4a).
 */

import { describe, expect, it } from "vitest";
import {
  CvDocument,
  LegacyCvDocument,
  migrateLegacyToJsonResume,
  type Basics,
  type ConfidenceMarker,
  type DatosPersonales,
  type Education,
  type Projects,
  type Skills,
  type Work,
  type Certificates,
  type Languages,
} from "@/lib/editor/types";

// ─────────────────────────────────────────────────────────────────────
// 1) CvDocument primario es JSON Resume compatible
// ─────────────────────────────────────────────────────────────────────

describe("types_CvDocument_IsJsonResumeCompatible_Has_Basics_Work_Education_Skills_Projects_Certificates_Languages", () => {
  it("acepta un CvDocument con basics + work + education + skills + projects + certificates + languages", () => {
    const basics: Basics = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      profiles: [{ network: "LinkedIn", username: "ada", url: "" }],
      confidence: {
        name: "inferred",
        email: "inferred",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    };
    const work: Work = {
      name: "Acme",
      position: "Engineer",
      startDate: "2024-01",
      endDate: "Present",
      confidence: {
        name: "inferred",
        position: "inferred",
        startDate: "inferred",
        endDate: "inferred",
        summary: "inferred",
        highlights: "inferred",
      },
    };
    const education: Education = {
      institution: "UdeA",
      confidence: {
        institution: "inferred",
        area: "inferred",
        studyType: "inferred",
        startDate: "inferred",
        endDate: "inferred",
        score: "inferred",
      },
    };
    const skills: Skills = {
      name: "Backend",
      confidence: {
        name: "inferred",
        level: "inferred",
        keywords: "inferred",
      },
    };
    const projects: Projects = {
      name: "X",
      confidence: {
        name: "inferred",
        description: "inferred",
        highlights: "inferred",
        keywords: "inferred",
        startDate: "inferred",
        endDate: "inferred",
        url: "inferred",
        roles: "inferred",
      },
    };
    const certificates: Certificates = {
      name: "AWS SAA",
      confidence: {
        name: "inferred",
        date: "inferred",
        issuer: "inferred",
        url: "inferred",
      },
    };
    const languages: Languages = {
      language: "Español",
      confidence: {
        language: "inferred",
        fluency: "inferred",
      },
    };

    const cv: CvDocument = {
      basics,
      work: [work],
      education: [education],
      skills: [skills],
      projects: [projects],
      certificates: [certificates],
      languages: [languages],
      meta: { engineVersion: "2.0.0" },
    };

    // Type-level sanity — runtime access a todas las secciones
    expect(cv.basics.name).toBe("Ada Lovelace");
    expect(cv.work).toHaveLength(1);
    expect(cv.education).toHaveLength(1);
    expect(cv.skills).toHaveLength(1);
    expect(cv.projects).toHaveLength(1);
    expect(cv.certificates).toHaveLength(1);
    expect(cv.languages).toHaveLength(1);
    expect(cv.meta.engineVersion).toBe("2.0.0");
  });

  it("basics soporta datosPersonales colombianos sin salirse del shape JSON Resume", () => {
    const datosPersonales: DatosPersonales = {
      cedula: "1234567890",
      nacionalidad: "CO",
      estadoCivil: "soltero",
      libretaMilitar: "no_aplica",
      rh: "O+",
    };
    const cv: CvDocument = {
      basics: {
        name: "Ada",
        email: "ada@example.com",
        profiles: [],
        datosPersonales,
        confidence: {
          name: "inferred",
          email: "inferred",
          phone: "inferred",
          location: "inferred",
          url: "inferred",
          profiles: "inferred",
          summary: "inferred",
          datosPersonales: "inferred",
        },
      },
      work: [],
      education: [],
      skills: [],
      meta: { engineVersion: "2.0.0" },
    };

    expect(cv.basics.datosPersonales?.nacionalidad).toBe("CO");
    expect(cv.basics.datosPersonales?.rh).toBe("O+");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2) LegacyCvDocument alias sobrevive para backward-compat
// ─────────────────────────────────────────────────────────────────────

describe("types_LegacyCvDocument_Alias_Still_Exists_For_BackwardCompat", () => {
  it("acepta el shape viejo de 8 secciones con sections[] + entities[] + meta.engineVersion", () => {
    const legacy: LegacyCvDocument = {
      id: "doc_legacy_01",
      version: "0.5.0",
      locale: "es-CO",
      sections: [
        {
          id: "sec_profile",
          kind: "profile",
          source: "imported",
          createdAt: "2026-06-08T14:30:00.000Z",
          updatedAt: "2026-06-08T14:30:00.000Z",
          fullName: "Ada",
          headline: "Engineer",
          email: "ada@example.com",
          phone: "+573001234567",
          location: "Bogotá",
          links: [],
          summary: "",
        },
      ],
      entities: [],
      createdAt: "2026-06-08T14:30:00.000Z",
      updatedAt: "2026-06-08T14:30:00.000Z",
      source: "imported",
    };

    // Type-level: secciones tipadas siguen vivas
    expect(legacy.sections[0]?.kind).toBe("profile");
    expect(legacy.locale).toBe("es-CO");
    expect(legacy.entities).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3) migrateLegacyToJsonResume convierte secciones plain-text a basics
// ─────────────────────────────────────────────────────────────────────

describe("migrateLegacyToJsonResume_Converts_PlainTextSection_To_Basics_Inferred_Confidence", () => {
  it("section plain-text de tipo profile con heading/text → basics con confidence inferred", () => {
    const legacy: LegacyCvDocument = {
      sections: [
        {
          heading: "profile",
          text: "Ada Lovelace — Engineer — ada@example.com",
        },
      ],
    };

    const migrated = migrateLegacyToJsonResume(legacy);

    // El campo basics existe y todos sus confidence markers son 'inferred'
    const expectedMarkers: ConfidenceMarker[] = [
      migrated.basics.confidence.name,
      migrated.basics.confidence.email,
      migrated.basics.confidence.phone,
      migrated.basics.confidence.location,
      migrated.basics.confidence.url,
      migrated.basics.confidence.profiles,
      migrated.basics.confidence.summary,
      migrated.basics.confidence.datosPersonales,
    ];
    for (const marker of expectedMarkers) {
      expect(marker).toBe("inferred");
    }

    // work/education/skills/etc arrancan vacíos — el texto plain no se
    // reconstruye, el usuario lo re-ingresa en el editor (PR 4e)
    expect(migrated.work).toEqual([]);
    expect(migrated.education).toEqual([]);
    expect(migrated.skills).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4) migrateLegacyToJsonResume sella meta.engineVersion = "2.0.0"
// ─────────────────────────────────────────────────────────────────────

describe("migrateLegacyToJsonResume_Adds_EngineVersion_2_0_0_Meta", () => {
  it("sella meta.engineVersion a literal '2.0.0' (SemVer seal, Constitution Art. II)", () => {
    const legacy: LegacyCvDocument = { sections: [] };

    const migrated = migrateLegacyToJsonResume(legacy);

    expect(migrated.meta.engineVersion).toBe("2.0.0");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5) migrateLegacyToJsonResume con legacy vacío devuelve CvDocument mínimo
// ─────────────────────────────────────────────────────────────────────

describe("migrateLegacyToJsonResume_Empty_Legacy_Returns_Minimal_Valid_CvDocument", () => {
  it("sections vacío → basics vacío + work/education/skills arrays vacíos + meta sellada", () => {
    const legacy: LegacyCvDocument = { sections: [] };

    const migrated = migrateLegacyToJsonResume(legacy);

    expect(migrated.basics.name).toBe("");
    expect(migrated.basics.email).toBe("");
    expect(migrated.basics.profiles).toEqual([]);
    expect(migrated.work).toEqual([]);
    expect(migrated.education).toEqual([]);
    expect(migrated.skills).toEqual([]);
    expect(migrated.meta.engineVersion).toBe("2.0.0");
  });

  it("legacy sin sections (undefined) → igual produce CvDocument mínimo", () => {
    const migrated = migrateLegacyToJsonResume({} as LegacyCvDocument);

    expect(migrated.basics.name).toBe("");
    expect(migrated.work).toEqual([]);
    expect(migrated.meta.engineVersion).toBe("2.0.0");
  });
});
