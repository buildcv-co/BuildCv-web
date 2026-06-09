import { describe, it, expect } from "vitest";
import {
  CvDocumentSchema,
  DraftSchema,
  BLANK_DOCUMENT,
  ProfileSectionSchema,
  ExperienceSectionSchema,
  EducationSectionSchema,
  SkillsSectionSchema,
  ProjectsSectionSchema,
  CertificationsSectionSchema,
  LanguagesSectionSchema,
  OtherSectionSchema,
  CvSectionSchema,
  EntityRefSchema,
} from "./index";
import type { CvDocument, Draft, ProfileSection, ExperienceSection } from "../types";

const ISO_NOW = "2026-06-08T14:30:00.000Z";

function makeProfile(overrides: Partial<ProfileSection> = {}): ProfileSection {
  return {
    id: "sec_01",
    kind: "profile",
    source: "user-typed",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    fullName: "Juan Pérez",
    headline: "Backend Developer",
    email: "juan@example.com",
    phone: "+57 300 123 4567",
    location: "Medellín, Colombia",
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/juan" }],
    summary: "Backend developer con 4 años de experiencia.",
    ...overrides,
  };
}

function makeExperience(
  overrides: Partial<ExperienceSection> = {},
): ExperienceSection {
  return {
    id: "sec_02",
    kind: "experience",
    source: "imported",
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    role: "Backend Developer",
    company: "Acme Corp",
    startDate: "2022-01",
    endDate: null,
    location: "Medellín",
    bullets: ["Reduje latencia en 35%."],
    techStack: ["Node.js", "PostgreSQL"],
    ...overrides,
  };
}

function makeDoc(overrides: Partial<CvDocument> = {}): CvDocument {
  return {
    id: "doc_01",
    version: "0.5.0",
    locale: "es-CO",
    sections: [makeProfile()],
    entities: [],
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    source: "blank",
    ...overrides,
  };
}

describe("BLANK_DOCUMENT", () => {
  it("es un CvDocument válido (pasa CvDocumentSchema)", () => {
    const result = CvDocumentSchema.safeParse(BLANK_DOCUMENT);
    expect(result.success).toBe(true);
  });

  it("tiene id, version, locale, sections, entities, source", () => {
    expect(BLANK_DOCUMENT.id).toBeTypeOf("string");
    expect(BLANK_DOCUMENT.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(BLANK_DOCUMENT.locale).toBe("es-CO");
    expect(Array.isArray(BLANK_DOCUMENT.sections)).toBe(true);
    expect(Array.isArray(BLANK_DOCUMENT.entities)).toBe(true);
  });

  it("source es 'blank'", () => {
    expect(BLANK_DOCUMENT.source).toBe("blank");
  });
});

describe("ProfileSectionSchema", () => {
  it("acepta un profile válido", () => {
    const r = ProfileSectionSchema.safeParse(makeProfile());
    expect(r.success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const r = ProfileSectionSchema.safeParse(makeProfile({ email: "no-es-email" }));
    expect(r.success).toBe(false);
  });

  it("rechaza kind incorrecto", () => {
    const r = ProfileSectionSchema.safeParse({
      ...makeProfile(),
      kind: "experience",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza source fuera de enum", () => {
    const r = ProfileSectionSchema.safeParse({
      ...makeProfile(),
      source: "made-up",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza links con URL inválida", () => {
    const r = ProfileSectionSchema.safeParse({
      ...makeProfile(),
      links: [{ label: "x", url: "not a url" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("ExperienceSectionSchema", () => {
  it("acepta un experience válido (endDate=null permitido)", () => {
    const r = ExperienceSectionSchema.safeParse(makeExperience());
    expect(r.success).toBe(true);
  });

  it("rechaza endDate con formato incorrecto", () => {
    const r = ExperienceSectionSchema.safeParse(
      makeExperience({ endDate: "mañana" }),
    );
    expect(r.success).toBe(false);
  });

  it("rechaza bullets vacío si se envía array vacío? (sí, min 0)", () => {
    const r = ExperienceSectionSchema.safeParse(makeExperience({ bullets: [] }));
    expect(r.success).toBe(true);
  });
});

describe("EducationSectionSchema", () => {
  it("acepta education válido", () => {
    const r = EducationSectionSchema.safeParse({
      id: "sec_03",
      kind: "education",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      degree: "Ingeniería de Sistemas",
      institution: "Universidad de Antioquia",
      startDate: "2014",
      endDate: "2019",
      location: "Medellín",
      description: "Énfasis en sistemas distribuidos.",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza kind incorrecto", () => {
    const r = EducationSectionSchema.safeParse({
      id: "sec_03",
      kind: "skills",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      degree: "X",
      institution: "Y",
      startDate: "2014",
      endDate: null,
      location: "",
      description: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("SkillsSectionSchema", () => {
  it("acepta skills con grupos", () => {
    const r = SkillsSectionSchema.safeParse({
      id: "sec_04",
      kind: "skills",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      groups: [
        { category: "Backend", items: ["Node.js", "Python"] },
        { category: "Frontend", items: ["React", "TypeScript"] },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("ProjectsSectionSchema", () => {
  it("acepta projects con items", () => {
    const r = ProjectsSectionSchema.safeParse({
      id: "sec_05",
      kind: "projects",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      items: [
        {
          name: "BuildCv",
          description: "Asistente de CV.",
          techStack: ["Next.js", ".NET"],
          link: "https://buildcv.app",
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("link puede ser null", () => {
    const r = ProjectsSectionSchema.safeParse({
      id: "sec_05",
      kind: "projects",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      items: [
        {
          name: "X",
          description: "Y",
          techStack: [],
          link: null,
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("CertificationsSectionSchema", () => {
  it("acepta certifications con items", () => {
    const r = CertificationsSectionSchema.safeParse({
      id: "sec_06",
      kind: "certifications",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      items: [
        {
          name: "AWS Solutions Architect",
          issuer: "Amazon",
          date: "2023-05",
          credentialId: "cred-123",
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("credentialId puede ser null", () => {
    const r = CertificationsSectionSchema.safeParse({
      id: "sec_06",
      kind: "certifications",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      items: [
        {
          name: "X",
          issuer: "Y",
          date: "2023-05",
          credentialId: null,
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("LanguagesSectionSchema", () => {
  it("acepta languages con level A1..C2 y Native", () => {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"] as const;
    for (const level of levels) {
      const r = LanguagesSectionSchema.safeParse({
        id: "sec_07",
        kind: "languages",
        source: "user-typed",
        createdAt: ISO_NOW,
        updatedAt: ISO_NOW,
        items: [{ language: "Inglés", level }],
      });
      expect(r.success).toBe(true);
    }
  });

  it("rechaza level fuera de enum", () => {
    const r = LanguagesSectionSchema.safeParse({
      id: "sec_07",
      kind: "languages",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      items: [{ language: "Inglés", level: "Z9" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("OtherSectionSchema", () => {
  it("acepta other section", () => {
    const r = OtherSectionSchema.safeParse({
      id: "sec_08",
      kind: "other",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
      title: "Publicaciones",
      content: "- 'Microservicios en LATAM' · Medium · 2024-03",
    });
    expect(r.success).toBe(true);
  });
});

describe("CvSectionSchema (discriminated union)", () => {
  it("acepta cada uno de los 8 kinds", () => {
    const samples = [
      { ...makeProfile() },
      makeExperience(),
      {
        id: "sec_03",
        kind: "education" as const,
        source: "user-typed" as const,
        createdAt: ISO_NOW,
        updatedAt: ISO_NOW,
        degree: "X",
        institution: "Y",
        startDate: "2014",
        endDate: null,
        location: "",
        description: "",
      },
      {
        id: "sec_04",
        kind: "skills" as const,
        source: "user-typed" as const,
        createdAt: ISO_NOW,
        updatedAt: ISO_NOW,
        groups: [{ category: "X", items: ["Y"] }],
      },
      {
        id: "sec_05",
        kind: "projects" as const,
        source: "user-typed" as const,
        createdAt: ISO_NOW,
        updatedAt: ISO_NOW,
        items: [],
      },
      {
        id: "sec_06",
        kind: "certifications" as const,
        source: "user-typed" as const,
        createdAt: ISO_NOW,
        updatedAt: ISO_NOW,
        items: [],
      },
      {
        id: "sec_07",
        kind: "languages" as const,
        source: "user-typed" as const,
        createdAt: ISO_NOW,
        updatedAt: ISO_NOW,
        items: [],
      },
      {
        id: "sec_08",
        kind: "other" as const,
        source: "user-typed" as const,
        createdAt: ISO_NOW,
        updatedAt: ISO_NOW,
        title: "X",
        content: "Y",
      },
    ];
    for (const sample of samples) {
      const r = CvSectionSchema.safeParse(sample);
      expect(r.success).toBe(true);
    }
  });

  it("rechaza kind desconocido", () => {
    const r = CvSectionSchema.safeParse({
      id: "sec_xx",
      kind: "made-up",
      source: "user-typed",
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
    });
    expect(r.success).toBe(false);
  });
});

describe("EntityRefSchema", () => {
  it("acepta entity válida", () => {
    const r = EntityRefSchema.safeParse({
      id: "ent_01",
      kind: "skill",
      value: "Node.js",
      normalized: "node.js",
      source: "imported",
      confidence: "high",
      sectionId: "sec_02",
      firstSeenAt: ISO_NOW,
    });
    expect(r.success).toBe(true);
  });
});

describe("CvDocumentSchema", () => {
  it("acepta un doc con sections", () => {
    const r = CvDocumentSchema.safeParse(
      makeDoc({ sections: [makeProfile(), makeExperience()] }),
    );
    expect(r.success).toBe(true);
  });

  it("rechaza sections.length > 8", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      ...makeProfile({ id: `sec_${i}` }),
    }));
    const r = CvDocumentSchema.safeParse(makeDoc({ sections: many }));
    expect(r.success).toBe(false);
  });

  it("rechaza version fuera de SemVer", () => {
    const r = CvDocumentSchema.safeParse(makeDoc({ version: "0.5" }));
    expect(r.success).toBe(false);
  });

  it("rechaza locale fuera de enum", () => {
    const r = CvDocumentSchema.safeParse(makeDoc({ locale: "fr-FR" as never }));
    expect(r.success).toBe(false);
  });

  it("rechaza source fuera de enum", () => {
    const r = CvDocumentSchema.safeParse(makeDoc({ source: "made-up" as never }));
    expect(r.success).toBe(false);
  });
});

describe("DraftSchema", () => {
  it("acepta un draft válido", () => {
    const draft: Draft = {
      id: "default",
      document: makeDoc(),
      jobText: "Buscamos backend con Node.js.",
      scoreHistory: [
        { score: 78, band: "Strong", engineVersion: "1.0.0", at: ISO_NOW },
      ],
      lastSavedAt: ISO_NOW,
      engineVersions: { editor: "0.5.0", score: "1.0.0" },
    };
    const r = DraftSchema.safeParse(draft);
    expect(r.success).toBe(true);
  });

  it("rechaza scoreHistory con score fuera de [0,100]", () => {
    const draft = {
      id: "default",
      document: makeDoc(),
      jobText: "x".repeat(200),
      scoreHistory: [{ score: 200, band: "X", engineVersion: "1.0.0", at: ISO_NOW }],
      lastSavedAt: ISO_NOW,
      engineVersions: { editor: "0.5.0", score: "1.0.0" },
    };
    const r = DraftSchema.safeParse(draft);
    expect(r.success).toBe(false);
  });

  it("acepta jobText vacío", () => {
    const draft = {
      id: "default",
      document: makeDoc(),
      jobText: "",
      scoreHistory: [],
      lastSavedAt: ISO_NOW,
      engineVersions: { editor: "0.5.0", score: "1.0.0" },
    };
    const r = DraftSchema.safeParse(draft);
    expect(r.success).toBe(true);
  });
});
