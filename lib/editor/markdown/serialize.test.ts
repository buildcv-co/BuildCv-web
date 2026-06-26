import { describe, it, expect } from "vitest";
import { serializeCvDocument } from "./serialize";
import { BLANK_DOCUMENT } from "../schema";
import type { LegacyCvDocument, CvSection } from "../types";

const ISO = "2026-06-08T14:30:00.000Z";

function profile(overrides: Partial<Extract<CvSection, { kind: "profile" }>> = {}) {
  return {
    id: "sec_01",
    kind: "profile" as const,
    source: "user-typed" as const,
    createdAt: ISO,
    updatedAt: ISO,
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

function experience(
  overrides: Partial<Extract<CvSection, { kind: "experience" }>> = {},
) {
  return {
    id: "sec_02",
    kind: "experience" as const,
    source: "imported" as const,
    createdAt: ISO,
    updatedAt: ISO,
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

function emptyProfile(overrides: Partial<Extract<CvSection, { kind: "profile" }>> = {}) {
  return {
    id: "sec_01",
    kind: "profile" as const,
    source: "user-typed" as const,
    createdAt: ISO,
    updatedAt: ISO,
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    links: [],
    summary: "",
    ...overrides,
  };
}

describe("serializeCvDocument", () => {
  it("BLANK_DOCUMENT (sin sections) → string vacío", () => {
    expect(serializeCvDocument(BLANK_DOCUMENT)).toBe("");
  });

  it("documento sin sections ([]) → string vacío", () => {
    const doc: LegacyCvDocument = { ...BLANK_DOCUMENT, sections: [] };
    expect(serializeCvDocument(doc)).toBe("");
  });

  it("profile con datos genera heading '## Perfil'", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [profile()],
    };
    const md = serializeCvDocument(doc);
    expect(md).toMatch(/^## Perfil\b/);
  });

  it("incluye fullName, headline, location del profile", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [profile()],
    };
    const md = serializeCvDocument(doc);
    expect(md).toContain("Juan Pérez");
    expect(md).toContain("Backend Developer");
    expect(md).toContain("Medellín, Colombia");
  });

  it("incluye email y teléfono", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [profile()],
    };
    const md = serializeCvDocument(doc);
    expect(md).toContain("juan@example.com");
    expect(md).toContain("+57 300 123 4567");
  });

  it("profile con un link genera [label](url)", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [profile()],
    };
    const md = serializeCvDocument(doc);
    expect(md).toContain("[LinkedIn](https://linkedin.com/in/juan)");
  });

  it("profile con summary vacío omite bloque summary (no genera 'Resumen:')", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [emptyProfile()],
    };
    const md = serializeCvDocument(doc);
    expect(md.toLowerCase()).not.toMatch(/resumen\s*:/);
  });

  it("profile sin datos significativos se omite (no exporta heading vacío)", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [emptyProfile()],
    };
    const md = serializeCvDocument(doc);
    expect(md).toBe("");
  });

  it("experience con bullets genera líneas '- '", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [experience()],
    };
    const md = serializeCvDocument(doc);
    expect(md).toMatch(/- Reduje latencia en 35%\./);
  });

  it("experience sin bullets ni techStack omite la sección", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [
        experience({
          bullets: [],
          techStack: [],
          role: "",
          company: "",
        }),
      ],
    };
    const md = serializeCvDocument(doc);
    expect(md).not.toMatch(/^## Experiencia/m);
  });

  it("8 sections en orden: Profile, Experience, Education, Skills, Projects, Certifications, Languages, Other", () => {
    const allKinds: CvSection["kind"][] = [
      "profile",
      "experience",
      "education",
      "skills",
      "projects",
      "certifications",
      "languages",
      "other",
    ];
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: allKinds.map((kind, i) => {
        const base = {
          id: `sec_${i}`,
          source: "user-typed" as const,
          createdAt: ISO,
          updatedAt: ISO,
        };
        if (kind === "profile") {
          return {
            ...base,
            kind,
            fullName: "Juan",
            headline: "Backend",
            email: "j@x.com",
            phone: "",
            location: "",
            links: [],
            summary: "",
          };
        }
        if (kind === "experience") {
          return {
            ...base,
            kind,
            role: "Backend",
            company: "Acme",
            startDate: "2022-01",
            endDate: null,
            location: "",
            bullets: ["x"],
            techStack: ["Node.js"],
          };
        }
        if (kind === "education") {
          return {
            ...base,
            kind,
            degree: "Ing",
            institution: "UdeA",
            startDate: "2014",
            endDate: null,
            location: "",
            description: "",
          };
        }
        if (kind === "skills") {
          return {
            ...base,
            kind,
            groups: [{ category: "Backend", items: ["Node.js"] }],
          };
        }
        if (kind === "projects") {
          return {
            ...base,
            kind,
            items: [
              { name: "P1", description: "d", techStack: ["TS"], link: null },
            ],
          };
        }
        if (kind === "certifications") {
          return {
            ...base,
            kind,
            items: [
              { name: "C1", issuer: "I", date: "2024-01", credentialId: null },
            ],
          };
        }
        if (kind === "languages") {
          return {
            ...base,
            kind,
            items: [{ language: "Inglés", level: "B2" as const }],
          };
        }
        return {
          ...base,
          kind,
          title: "Publicaciones",
          content: "- x",
        };
      }),
    };
    const md = serializeCvDocument(doc);
    const positions: number[] = [
      ["## Perfil", md],
      ["## Experiencia", md],
      ["## Educación", md],
      ["## Habilidades", md],
      ["## Proyectos", md],
      ["## Certificaciones", md],
      ["## Idiomas", md],
      ["## Otros", md],
    ].map(([h, text]) => text.indexOf(h as string));
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];
      if (prev === undefined || curr === undefined) {
        throw new Error("missing");
      }
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it("skills con grupos genera '- **Backend**: Node.js'", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [
        {
          id: "sec_04",
          kind: "skills",
          source: "user-typed",
          createdAt: ISO,
          updatedAt: ISO,
          groups: [{ category: "Backend", items: ["Node.js", "Python"] }],
        },
      ],
    };
    const md = serializeCvDocument(doc);
    expect(md).toMatch(/- \*\*Backend\*\*:\s*Node\.js, Python/);
  });

  it("languages genera '- Español · Nativo'", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [
        {
          id: "sec_07",
          kind: "languages",
          source: "user-typed",
          createdAt: ISO,
          updatedAt: ISO,
          items: [{ language: "Español", level: "Native" }],
        },
      ],
    };
    const md = serializeCvDocument(doc);
    expect(md).toMatch(/- Español · Nativo/);
  });

  it("es determinista (mismo input → mismo output)", () => {
    const doc: LegacyCvDocument = {
      ...BLANK_DOCUMENT,
      sections: [profile()],
    };
    const a = serializeCvDocument(doc);
    const b = serializeCvDocument(doc);
    expect(a).toBe(b);
  });
});
