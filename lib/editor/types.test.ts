import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  CvDocument,
  CvSection,
  EntityRef,
  Draft,
  DraftSummary,
  ProfileSection,
  ExperienceSection,
  EducationSection,
  SkillsSection,
  ProjectsSection,
  CertificationsSection,
  LanguagesSection,
  OtherSection,
  CvSectionKind,
  EntityKind,
  EntitySource,
  EntityConfidence,
  ScoreHistoryEntry,
  EngineVersions,
} from "./types";

const ISO = "2026-06-08T14:30:00.000Z";

describe("types — CvSectionKind", () => {
  it("incluye los 8 kinds", () => {
    const expected: CvSectionKind[] = [
      "profile",
      "experience",
      "education",
      "skills",
      "projects",
      "certifications",
      "languages",
      "other",
    ];
    for (const k of expected) {
      const sample: CvSectionKind = k;
      expect(sample).toBe(k);
    }
    expect(expected).toHaveLength(8);
  });
});

describe("types — EntityKind", () => {
  it("incluye skill, certification, company, role, date, metric, other", () => {
    const expected: EntityKind[] = [
      "skill",
      "certification",
      "company",
      "role",
      "date",
      "metric",
      "other",
    ];
    for (const k of expected) {
      const sample: EntityKind = k;
      expect(sample).toBe(k);
    }
  });
});

describe("types — EntitySource y EntityConfidence", () => {
  it("EntitySource es 'imported' | 'user-typed'", () => {
    const a: EntitySource = "imported";
    const b: EntitySource = "user-typed";
    expect([a, b]).toHaveLength(2);
  });

  it("EntityConfidence es 'high' | 'low'", () => {
    const a: EntityConfidence = "high";
    const b: EntityConfidence = "low";
    expect([a, b]).toHaveLength(2);
  });
});

describe("types — ProfileSection", () => {
  it("se puede construir con shape correcto", () => {
    const s: ProfileSection = {
      id: "sec_01",
      kind: "profile",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      fullName: "Juan",
      headline: "Backend",
      email: "j@x.com",
      phone: "+57 1",
      location: "Bogotá",
      links: [],
      summary: "...",
    };
    expect(s.kind).toBe("profile");
  });

  it("links es ReadonlyArray", () => {
    const s: ProfileSection = {
      id: "sec_01",
      kind: "profile",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      fullName: "Juan",
      headline: "Backend",
      email: "j@x.com",
      phone: "+57 1",
      location: "Bogotá",
      links: [{ label: "L", url: "https://x.com" }],
      summary: "...",
    };
    expectTypeOf(s.links).toMatchTypeOf<ReadonlyArray<{ label: string; url: string }>>();
  });
});

describe("types — ExperienceSection", () => {
  it("endDate puede ser null (actualidad)", () => {
    const s: ExperienceSection = {
      id: "sec_02",
      kind: "experience",
      source: "imported",
      createdAt: ISO,
      updatedAt: ISO,
      role: "Backend",
      company: "Acme",
      startDate: "2022-01",
      endDate: null,
      location: "Medellín",
      bullets: [],
      techStack: [],
    };
    expect(s.endDate).toBeNull();
  });
});

describe("types — EducationSection", () => {
  it("endDate puede ser null (en curso)", () => {
    const s: EducationSection = {
      id: "sec_03",
      kind: "education",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      degree: "Ing",
      institution: "UdeA",
      startDate: "2014",
      endDate: null,
      location: "Medellín",
      description: "...",
    };
    expect(s.endDate).toBeNull();
  });
});

describe("types — SkillsSection", () => {
  it("groups es ReadonlyArray de {category, items}", () => {
    const s: SkillsSection = {
      id: "sec_04",
      kind: "skills",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      groups: [{ category: "Backend", items: ["Node.js"] }],
    };
    expect(s.groups[0]?.category).toBe("Backend");
  });
});

describe("types — ProjectsSection", () => {
  it("link puede ser null", () => {
    const s: ProjectsSection = {
      id: "sec_05",
      kind: "projects",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      items: [
        { name: "X", description: "Y", techStack: [], link: null },
      ],
    };
    expect(s.items[0]?.link).toBeNull();
  });
});

describe("types — CertificationsSection", () => {
  it("credentialId puede ser null", () => {
    const s: CertificationsSection = {
      id: "sec_06",
      kind: "certifications",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      items: [
        { name: "X", issuer: "Y", date: "2024-01", credentialId: null },
      ],
    };
    expect(s.items[0]?.credentialId).toBeNull();
  });
});

describe("types — LanguagesSection", () => {
  it("level incluye A1..C2 y Native", () => {
    const s: LanguagesSection = {
      id: "sec_07",
      kind: "languages",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      items: [
        { language: "Español", level: "Native" },
        { language: "Inglés", level: "B2" },
      ],
    };
    expect(s.items[0]?.level).toBe("Native");
  });
});

describe("types — OtherSection", () => {
  it("title + content (markdown libre)", () => {
    const s: OtherSection = {
      id: "sec_08",
      kind: "other",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      title: "Publicaciones",
      content: "- 'X' · Medium · 2024-03",
    };
    expect(s.title).toBe("Publicaciones");
  });
});

describe("types — CvSection discriminated union", () => {
  it("8 tipos, discriminados por kind", () => {
    const profile: CvSection = {
      id: "a",
      kind: "profile",
      source: "user-typed",
      createdAt: ISO,
      updatedAt: ISO,
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      links: [],
      summary: "",
    };
    const exp: CvSection = {
      id: "b",
      kind: "experience",
      source: "imported",
      createdAt: ISO,
      updatedAt: ISO,
      role: "",
      company: "",
      startDate: "",
      endDate: null,
      location: "",
      bullets: [],
      techStack: [],
    };
    expect(profile.kind).toBe("profile");
    expect(exp.kind).toBe("experience");
  });
});

describe("types — EntityRef", () => {
  it("shape correcto", () => {
    const e: EntityRef = {
      id: "ent_01",
      kind: "skill",
      value: "Node.js",
      normalized: "node.js",
      source: "imported",
      confidence: "high",
      sectionId: "sec_02",
      firstSeenAt: ISO,
    };
    expect(e.kind).toBe("skill");
  });
});

describe("types — ScoreHistoryEntry y EngineVersions", () => {
  it("ScoreHistoryEntry: score num 0-100, band, engineVersion, at", () => {
    const e: ScoreHistoryEntry = {
      score: 78,
      band: "Strong",
      engineVersion: "1.0.0",
      at: ISO,
    };
    expect(e.score).toBe(78);
  });

  it("EngineVersions: editor + score", () => {
    const v: EngineVersions = { editor: "0.5.0", score: "1.0.0" };
    expect(v.editor).toBe("0.5.0");
  });
});

describe("types — CvDocument", () => {
  it("shape completo readonly", () => {
    const d: CvDocument = {
      id: "doc_01",
      version: "0.5.0",
      locale: "es-CO",
      sections: [],
      entities: [],
      createdAt: ISO,
      updatedAt: ISO,
      source: "blank",
    };
    expectTypeOf(d).toMatchTypeOf<CvDocument>();
  });
});

describe("types — Draft", () => {
  it("envuelve CvDocument + metadata", () => {
    const d: Draft = {
      id: "default",
      document: {
        id: "doc_01",
        version: "0.5.0",
        locale: "es-CO",
        sections: [],
        entities: [],
        createdAt: ISO,
        updatedAt: ISO,
        source: "blank",
      },
      jobText: "",
      scoreHistory: [],
      lastSavedAt: ISO,
      engineVersions: { editor: "0.5.0", score: "1.0.0" },
    };
    expect(d.id).toBe("default");
  });
});

describe("types — DraftSummary", () => {
  it("summary liviano para list()", () => {
    const s: DraftSummary = {
      id: "default",
      lastSavedAt: ISO,
      sectionCount: 0,
      entityCount: 0,
    };
    expect(s.sectionCount).toBe(0);
  });
});
