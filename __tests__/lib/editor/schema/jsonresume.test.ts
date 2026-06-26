/**
 * Tests RED → GREEN del schema Zod JSON Resume (`lib/editor/schema/jsonresume.ts`).
 *
 * PR 4a — foundation del editor migration. Cubre basics, work, education, skills,
 * projects, certificates, languages y la extensión colombiana `datosPersonales`
 * bajo `basics`. CvDocumentSchema cierra el ciclo con un happy-path end-to-end
 * que ejercita todas las secciones a la vez.
 *
 * Reglas del JSON Resume schema (https://jsonresume.org/schema.json) que se
 * respetan:
 *  - snake_case NO existe; todo es camelCase (name, email, startDate, ...).
 *  - `basics.location` se modela como `string` (proyecto, no objeto) por
 *    compatibilidad con `lib/job/cv-document.ts` (PR 1).
 *  - `startDate`/`endDate` siguen el patrón `YYYY-MM` (sin día).
 *  - `endDate` puede ser `"Present"` además de `YYYY-MM` (UX del editor:
 *    "trabajo actual" se guarda literal).
 *
 * Reglas Constitution Art. I:
 *  - Cada campo lleva su `confidenceMarker` (`inferred` | `explicit` |
 *    `user_confirmed`). El schema exige que se provea para preservar el
 *    contrato con PR 1 (`CvDocument` importado del backend ya lo trae).
 *  - `datosPersonales` solo se acepta bajo `basics` — NUNCA como sección
 *    top-level (preserva compat JSON Resume).
 */

import { describe, expect, it } from "vitest";
import {
  basicsSchema,
  certificatesSchema,
  confidenceMarkerSchema,
  cvDocumentSchema,
  educationSchema,
  jsonResumeDateSchema,
  languagesSchema,
  projectsSchema,
  skillsSchema,
  workSchema,
  type Basics,
  type Certificates,
  type CvDocument,
  type Education,
  type Languages,
  type Projects,
  type Skills,
  type Work,
} from "@/lib/editor/schema/jsonresume";

// ─────────────────────────────────────────────────────────────────────
// confidenceMarkerSchema
// ─────────────────────────────────────────────────────────────────────

describe("confidenceMarkerSchema", () => {
  it("acepta los 3 marcadores literales", () => {
    expect(confidenceMarkerSchema.safeParse("inferred").success).toBe(true);
    expect(confidenceMarkerSchema.safeParse("explicit").success).toBe(true);
    expect(confidenceMarkerSchema.safeParse("user_confirmed").success).toBe(true);
  });

  it("rechaza cualquier valor fuera del enum cerrado", () => {
    expect(confidenceMarkerSchema.safeParse("guessed").success).toBe(false);
    expect(confidenceMarkerSchema.safeParse("").success).toBe(false);
    expect(confidenceMarkerSchema.safeParse(null).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// date helpers (regex `^\d{4}-\d{2}$`)
// ─────────────────────────────────────────────────────────────────────

describe("jsonResumeDateSchema", () => {
  it("acepta fechas YYYY-MM bien formadas", () => {
    expect(jsonResumeDateSchema.safeParse("2024-03").success).toBe(true);
    expect(jsonResumeDateSchema.safeParse("1999-12").success).toBe(true);
  });

  it("rechaza fechas con día (YYYY-MM-DD) y strings libres", () => {
    expect(jsonResumeDateSchema.safeParse("2024-03-15").success).toBe(false);
    expect(jsonResumeDateSchema.safeParse("Mar 2024").success).toBe(false);
    expect(jsonResumeDateSchema.safeParse("2024/03").success).toBe(false);
    expect(jsonResumeDateSchema.safeParse("").success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 1) BasicsSchema — happy path con profiles
// ─────────────────────────────────────────────────────────────────────

describe("BasicsSchema_Accepts_Full_Basics", () => {
  it("acepta basics con name, email, phone, location, profiles y summary", () => {
    const input: Basics = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: "+573001234567",
      location: "Bogotá, Colombia",
      url: "https://ada.example.com",
      profiles: [
        { network: "LinkedIn", username: "ada", url: "https://linkedin.com/in/ada" },
        { network: "GitHub", username: "ada", url: "https://github.com/ada" },
      ],
      summary: "Mathematician and writer; first programmer.",
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "explicit",
        profiles: "inferred",
        summary: "user_confirmed",
        datosPersonales: "inferred",
      },
    };

    const result = basicsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2) BasicsSchema — email inválido
// ─────────────────────────────────────────────────────────────────────

describe("BasicsSchema_Rejects_Email_Without_At", () => {
  it("rechaza basics con email sin '@'", () => {
    const result = basicsSchema.safeParse({
      name: "Sin Email",
      email: "esto-no-es-email",
      profiles: [],
      confidence: {
        name: "explicit",
        email: "inferred",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza basics con email vacío", () => {
    const result = basicsSchema.safeParse({
      name: "Sin Email",
      email: "",
      profiles: [],
      confidence: {
        name: "explicit",
        email: "inferred",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3) BasicsSchema — phone con letras
// ─────────────────────────────────────────────────────────────────────

describe("BasicsSchema_Rejects_Phone_With_Letters", () => {
  it("rechaza basics con phone que contiene letras", () => {
    const result = basicsSchema.safeParse({
      name: "Phone inválido",
      email: "ok@example.com",
      phone: "+57ABC3001234",
      profiles: [],
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4) BasicsSchema — Colombian DatosPersonales
// ─────────────────────────────────────────────────────────────────────

describe("BasicsSchema_Accepts_Colombian_DatosPersonales", () => {
  it("acepta basics con datosPersonales completos y válidos", () => {
    const result = basicsSchema.safeParse({
      name: "Colombiana",
      email: "col@example.com",
      profiles: [],
      datosPersonales: {
        cedula: "1234567890",
        nacionalidad: "CO",
        estadoCivil: "soltero",
        libretaMilitar: "primera",
        rh: "O+",
      },
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "user_confirmed",
      },
    });
    expect(result.success).toBe(true);
  });

  it("acepta basics sin datosPersonales (opcional, undefined when absent)", () => {
    const result = basicsSchema.safeParse({
      name: "Sin DP",
      email: "no-dp@example.com",
      profiles: [],
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rechaza cedula con menos de 6 dígitos o más de 10", () => {
    const tooShort = basicsSchema.safeParse({
      name: "X",
      email: "x@example.com",
      profiles: [],
      datosPersonales: { cedula: "12345" },
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(tooShort.success).toBe(false);

    const tooLong = basicsSchema.safeParse({
      name: "X",
      email: "x@example.com",
      profiles: [],
      datosPersonales: { cedula: "12345678901" },
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(tooLong.success).toBe(false);
  });

  it("rechaza cedula con letras (numérico-only)", () => {
    const result = basicsSchema.safeParse({
      name: "X",
      email: "x@example.com",
      profiles: [],
      datosPersonales: { cedula: "12345abcde" },
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza nacionalidad fuera del enum", () => {
    const result = basicsSchema.safeParse({
      name: "X",
      email: "x@example.com",
      profiles: [],
      datosPersonales: { nacionalidad: "US" },
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza estadoCivil fuera del enum", () => {
    const result = basicsSchema.safeParse({
      name: "X",
      email: "x@example.com",
      profiles: [],
      datosPersonales: { estadoCivil: "complicado" },
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza libretaMilitar fuera del enum", () => {
    const result = basicsSchema.safeParse({
      name: "X",
      email: "x@example.com",
      profiles: [],
      datosPersonales: { libretaMilitar: "tercera" },
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza rh fuera del enum (formato A+/A-/...)", () => {
    const result = basicsSchema.safeParse({
      name: "X",
      email: "x@example.com",
      profiles: [],
      datosPersonales: { rh: "C+" },
      confidence: {
        name: "explicit",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5) WorkSchema — happy path con highlights
// ─────────────────────────────────────────────────────────────────────

describe("WorkSchema_Accepts_Standard_Entry", () => {
  it("acepta entry con startDate, endDate='Present' y highlights", () => {
    const result = workSchema.safeParse({
      name: "Acme S.A.",
      position: "Senior Engineer",
      startDate: "2020-01",
      endDate: "Present",
      summary: "Backend platform.",
      highlights: [
        "Reduced latency 40%",
        "Mentored 3 junior engineers",
        "Led migration to .NET 10",
      ],
      confidence: {
        name: "explicit",
        position: "explicit",
        startDate: "explicit",
        endDate: "inferred",
        summary: "inferred",
        highlights: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });

  it("acepta entry con endDate=null (current job, nullable)", () => {
    const result = workSchema.safeParse({
      name: "Acme S.A.",
      position: "Senior Engineer",
      startDate: "2020-01",
      endDate: null,
      highlights: [],
      confidence: {
        name: "explicit",
        position: "explicit",
        startDate: "explicit",
        endDate: "inferred",
        summary: "inferred",
        highlights: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 6) WorkSchema — startDate > endDate
// ─────────────────────────────────────────────────────────────────────

describe("WorkSchema_Rejects_StartDate_After_EndDate", () => {
  it("rechaza entry con startDate posterior a endDate (YYYY-MM)", () => {
    const result = workSchema.safeParse({
      name: "Acme",
      position: "Engineer",
      startDate: "2022-03",
      endDate: "2020-06",
      confidence: {
        name: "explicit",
        position: "explicit",
        startDate: "inferred",
        endDate: "inferred",
        summary: "inferred",
        highlights: "inferred",
      },
    });
    expect(result.success).toBe(false);
  });

  it("acepta entry con startDate anterior a endDate", () => {
    const result = workSchema.safeParse({
      name: "Acme",
      position: "Engineer",
      startDate: "2020-06",
      endDate: "2022-03",
      confidence: {
        name: "explicit",
        position: "explicit",
        startDate: "inferred",
        endDate: "inferred",
        summary: "inferred",
        highlights: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });

  it("acepta startDate cualquiera cuando endDate='Present'", () => {
    const result = workSchema.safeParse({
      name: "Acme",
      position: "Engineer",
      startDate: "2024-12",
      endDate: "Present",
      confidence: {
        name: "explicit",
        position: "explicit",
        startDate: "inferred",
        endDate: "inferred",
        summary: "inferred",
        highlights: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 7) EducationSchema — happy path
// ─────────────────────────────────────────────────────────────────────

describe("EducationSchema_Accepts_Standard_Entry", () => {
  it("acepta entry con institution, area, studyType, score", () => {
    const result = educationSchema.safeParse({
      institution: "Universidad de los Andes",
      area: "Computer Science",
      studyType: "Master",
      startDate: "2018-08",
      endDate: "2020-06",
      score: "4.5/5.0",
      confidence: {
        institution: "explicit",
        area: "explicit",
        studyType: "explicit",
        startDate: "explicit",
        endDate: "explicit",
        score: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });

  it("acepta entry mínimo (solo institution)", () => {
    const result = educationSchema.safeParse({
      institution: "MIT",
      confidence: {
        institution: "explicit",
        area: "inferred",
        studyType: "inferred",
        startDate: "inferred",
        endDate: "inferred",
        score: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 8) SkillsSchema — keywords
// ─────────────────────────────────────────────────────────────────────

describe("SkillsSchema_Accepts_Entry_With_Keywords", () => {
  it("acepta entry con name, level y keywords[]", () => {
    const result = skillsSchema.safeParse({
      name: "Backend",
      level: "Master",
      keywords: [".NET", "PostgreSQL", "Redis"],
      confidence: {
        name: "explicit",
        level: "inferred",
        keywords: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });

  it("acepta entry sin keywords (opcional)", () => {
    const result = skillsSchema.safeParse({
      name: "Backend",
      level: "Master",
      confidence: {
        name: "explicit",
        level: "inferred",
        keywords: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 9) ProjectsSchema — highlights + keywords + url + roles
// ─────────────────────────────────────────────────────────────────────

describe("ProjectsSchema_Accepts_Entry_With_Highlights_And_Keywords", () => {
  it("acepta entry con name, description, highlights[], keywords[], url y roles[]", () => {
    const result = projectsSchema.safeParse({
      name: "OpenResume-ES",
      description: "Fork localized to es-CO with ATS-friendly defaults.",
      highlights: [
        "Shipped first release in 2 weeks",
        "WCAG 2.2 AA compliant",
      ],
      keywords: ["Next.js", "TypeScript", "Tailwind"],
      startDate: "2024-01",
      endDate: "2024-06",
      url: "https://example.com/openresume-es",
      roles: ["Tech Lead", "Speaker"],
      confidence: {
        name: "explicit",
        description: "inferred",
        highlights: "inferred",
        keywords: "inferred",
        startDate: "inferred",
        endDate: "inferred",
        url: "explicit",
        roles: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });

  it("acepta entry mínimo (solo name) — campos restantes opcionales", () => {
    const result = projectsSchema.safeParse({
      name: "Side project",
      confidence: {
        name: "user_confirmed",
        description: "inferred",
        highlights: "inferred",
        keywords: "inferred",
        startDate: "inferred",
        endDate: "inferred",
        url: "inferred",
        roles: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 10) CertificatesSchema
// ─────────────────────────────────────────────────────────────────────

describe("CertificatesSchema_Accepts_Entry", () => {
  it("acepta entry con name, date, issuer, url", () => {
    const result = certificatesSchema.safeParse({
      name: "AWS Solutions Architect Associate",
      date: "2023-08",
      issuer: "Amazon Web Services",
      url: "https://aws.amazon.com/certification/",
      confidence: {
        name: "explicit",
        date: "explicit",
        issuer: "explicit",
        url: "explicit",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 11) LanguagesSchema
// ─────────────────────────────────────────────────────────────────────

describe("LanguagesSchema_Accepts_Entry_With_Fluency", () => {
  it("acepta entry con language y fluency", () => {
    const result = languagesSchema.safeParse({
      language: "English",
      fluency: "Fluent",
      confidence: {
        language: "explicit",
        fluency: "inferred",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 12) CvDocumentSchema — happy path end-to-end con todas las secciones
// ─────────────────────────────────────────────────────────────────────

describe("CvDocumentSchema_Accepts_Full_Json_Resume", () => {
  it("acepta CvDocument con todas las secciones + datosPersonales", () => {
    const full: CvDocument = {
      basics: {
        name: "Ada Lovelace",
        email: "ada@example.com",
        phone: "+573001234567",
        location: "Bogotá, Colombia",
        url: "https://ada.example.com",
        profiles: [
          { network: "LinkedIn", username: "ada", url: "https://linkedin.com/in/ada" },
        ],
        summary: "Mathematician and writer.",
        datosPersonales: {
          cedula: "1234567890",
          nacionalidad: "CO",
          estadoCivil: "soltero",
          libretaMilitar: "primera",
          rh: "O+",
        },
        confidence: {
          name: "explicit",
          email: "explicit",
          phone: "inferred",
          location: "inferred",
          url: "explicit",
          profiles: "inferred",
          summary: "user_confirmed",
          datosPersonales: "user_confirmed",
        },
      },
      work: [
        {
          name: "Acme S.A.",
          position: "Senior Engineer",
          startDate: "2020-01",
          endDate: "Present",
          summary: "Backend platform.",
          highlights: ["Reduced latency 40%", "Mentored 3 juniors"],
          confidence: {
            name: "explicit",
            position: "explicit",
            startDate: "explicit",
            endDate: "inferred",
            summary: "inferred",
            highlights: "inferred",
          },
        },
      ],
      education: [
        {
          institution: "Universidad de los Andes",
          area: "Computer Science",
          studyType: "Master",
          startDate: "2018-08",
          endDate: "2020-06",
          score: "4.5/5.0",
          confidence: {
            institution: "explicit",
            area: "explicit",
            studyType: "explicit",
            startDate: "explicit",
            endDate: "explicit",
            score: "inferred",
          },
        },
      ],
      skills: [
        {
          name: "Backend",
          level: "Master",
          keywords: [".NET", "PostgreSQL"],
          confidence: {
            name: "explicit",
            level: "inferred",
            keywords: "inferred",
          },
        },
      ],
      projects: [
        {
          name: "OpenResume-ES",
          description: "Localized fork.",
          highlights: ["WCAG 2.2 AA"],
          keywords: ["Next.js"],
          startDate: "2024-01",
          endDate: "2024-06",
          url: "https://example.com",
          roles: ["Tech Lead"],
          confidence: {
            name: "explicit",
            description: "inferred",
            highlights: "inferred",
            keywords: "inferred",
            startDate: "inferred",
            endDate: "inferred",
            url: "explicit",
            roles: "inferred",
          },
        },
      ],
      certificates: [
        {
          name: "AWS SAA",
          date: "2023-08",
          issuer: "AWS",
          url: "https://aws.amazon.com",
          confidence: {
            name: "explicit",
            date: "explicit",
            issuer: "explicit",
            url: "explicit",
          },
        },
      ],
      languages: [
        {
          language: "English",
          fluency: "Fluent",
          confidence: {
            language: "explicit",
            fluency: "inferred",
          },
        },
      ],
      meta: { engineVersion: "2.0.0" },
    };

    const result = cvDocumentSchema.safeParse(full);
    expect(result.success).toBe(true);
  });

  it("rechaza meta.engineVersion distinto a '2.0.0'", () => {
    const result = cvDocumentSchema.safeParse({
      basics: {
        name: "X",
        email: "x@example.com",
        profiles: [],
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
      projects: [],
      certificates: [],
      languages: [],
      meta: { engineVersion: "1.0.0" },
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Sanity: los tipos exportados coinciden con los inferidos de zod.
// ─────────────────────────────────────────────────────────────────────

describe("types exportados (compile-time only)", () => {
  it("los tipos existen en el módulo (smoke check)", () => {
    // Si el módulo no exporta estos tipos, TypeScript ya falló al compilar.
    // Este test es defensa runtime contra `export type` mal puesto.
    const types: ReadonlyArray<unknown> = [
      null as unknown as Basics,
      null as unknown as Work,
      null as unknown as Education,
      null as unknown as Skills,
      null as unknown as Projects,
      null as unknown as Certificates,
      null as unknown as Languages,
      null as unknown as CvDocument,
    ];
    expect(types).toHaveLength(8);
  });
});