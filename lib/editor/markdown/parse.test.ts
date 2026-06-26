import { describe, it, expect } from "vitest";
import { parseCvDocument, type ParseContext } from "./parse";
import { serializeCvDocument } from "./serialize";
import { CvDocumentSchema } from "../schema";
import { EntityNotAllowedError } from "../errors";
import type { LegacyCvDocument } from "../types";

const EMPTY_CTX: ParseContext = {
  originalEntities: new Set<string>(),
  userTypedEntities: new Set<string>(),
};

function ctxFor(...tokens: string[]): ParseContext {
  return {
    originalEntities: new Set<string>(),
    userTypedEntities: new Set<string>(tokens.map((t) => t.toLowerCase())),
  };
}

describe("parseCvDocument — basics", () => {
  it("string vacío → CvDocument vacío válido", () => {
    const doc = parseCvDocument("", EMPTY_CTX);
    const r = CvDocumentSchema.safeParse(doc);
    expect(r.success).toBe(true);
    expect(doc.sections).toEqual([]);
  });

  it("string con solo whitespace → CvDocument vacío válido", () => {
    const doc = parseCvDocument("\n\n  \n\n", EMPTY_CTX);
    expect(doc.sections).toEqual([]);
  });
});

describe("parseCvDocument — single section", () => {
  it("'## Perfil' con nombre crea ProfileSection", () => {
    const doc = parseCvDocument(
      "## Perfil\n\n**Juan Pérez** · Backend · Medellín\njuan@example.com",
      ctxFor("juan pérez", "backend", "medellín", "juan@example.com"),
    );
    expect(doc.sections).toHaveLength(1);
    const s = doc.sections[0];
    expect(s?.kind).toBe("profile");
    if (s?.kind === "profile") {
      expect(s.fullName).toBe("Juan Pérez");
      expect(s.headline).toBe("Backend");
      expect(s.location).toBe("Medellín");
      expect(s.email).toBe("juan@example.com");
    }
  });

  it("'## Experiencia' con bullets crea ExperienceSection", () => {
    const doc = parseCvDocument(
      "## Experiencia\n\n### Backend Developer · Acme Corp · 2022-01 → actualidad\n\n- Reduje latencia en 35%.\n- Lideré migración.",
      ctxFor(
        "backend developer",
        "acme corp",
        "2022-01",
        "actualidad",
        "reduje latencia en 35%.",
        "lideré migración.",
      ),
    );
    expect(doc.sections).toHaveLength(1);
    const s = doc.sections[0];
    expect(s?.kind).toBe("experience");
    if (s?.kind === "experience") {
      expect(s.role).toBe("Backend Developer");
      expect(s.company).toBe("Acme Corp");
      expect(s.startDate).toBe("2022-01");
      expect(s.endDate).toBeNull();
      expect(s.bullets).toEqual([
        "Reduje latencia en 35%.",
        "Lideré migración.",
      ]);
    }
  });

  it("'## Habilidades' con '- **Backend**: Node.js' crea SkillsSection", () => {
    const doc = parseCvDocument(
      "## Habilidades\n\n- **Backend**: Node.js, Python\n- **Cloud**: AWS, Docker",
      ctxFor("backend", "node.js", "python", "cloud", "aws", "docker"),
    );
    expect(doc.sections).toHaveLength(1);
    const s = doc.sections[0];
    expect(s?.kind).toBe("skills");
    if (s?.kind === "skills") {
      expect(s.groups).toEqual([
        { category: "Backend", items: ["Node.js", "Python"] },
        { category: "Cloud", items: ["AWS", "Docker"] },
      ]);
    }
  });
});

describe("parseCvDocument — multiple sections", () => {
  it("dos '## ' crean dos sections en orden", () => {
    const md = "## Perfil\n\n**Juan**\n\n## Habilidades\n\n- **Backend**: Node.js";
    const doc = parseCvDocument(
      md,
      ctxFor("juan", "backend", "node.js"),
    );
    expect(doc.sections.map((s) => s.kind)).toEqual(["profile", "skills"]);
  });
});

describe("parseCvDocument — entity rejection (defense in depth Art. I FR-029a)", () => {
  it("lanza EntityNotAllowedError si la sección tiene un token NO en originalEntities y NO user-typed", () => {
    const md = "## Perfil\n\n**Juan Pérez** · FakeSkill · Ciudad";
    const ctx: ParseContext = {
      originalEntities: new Set<string>(["juan pérez", "ciudad"]),
      userTypedEntities: new Set<string>(),
    };
    expect(() => parseCvDocument(md, ctx)).toThrow(EntityNotAllowedError);
  });

  it("NO lanza si el token está en originalEntities", () => {
    const md = "## Perfil\n\n**Juan Pérez** · Backend · Medellín";
    const ctx: ParseContext = {
      originalEntities: new Set<string>(["juan pérez", "backend", "medellín"]),
      userTypedEntities: new Set<string>(),
    };
    expect(() => parseCvDocument(md, ctx)).not.toThrow();
  });

  it("NO lanza si el token está en userTypedEntities", () => {
    const md = "## Perfil\n\n**Juan** · NewSkill · City";
    const ctx: ParseContext = {
      originalEntities: new Set<string>(),
      userTypedEntities: new Set<string>(["juan", "newskill", "city"]),
    };
    expect(() => parseCvDocument(md, ctx)).not.toThrow();
  });

  it("EntityNotAllowedError tiene entityValue y sectionKind", () => {
    const md = "## Perfil\n\n**Juan** · InventedToken · X";
    const ctx: ParseContext = {
      originalEntities: new Set<string>(["juan", "x"]),
      userTypedEntities: new Set<string>(),
    };
    try {
      parseCvDocument(md, ctx);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(EntityNotAllowedError);
      if (err instanceof EntityNotAllowedError) {
        expect(err.entityValue.toLowerCase()).toBe("inventedtoken");
        expect(err.sectionKind).toBe("profile");
      }
    }
  });
});

describe("parseCvDocument — round-trip", () => {
  it("document serializado por serialize() se parsea al mismo CvDocument estructuralmente", () => {
    const doc: LegacyCvDocument = {
      id: "doc_01",
      version: "0.5.0",
      locale: "es-CO",
      sections: [
        {
          id: "sec_01",
          kind: "profile",
          source: "user-typed",
          createdAt: "2026-06-08T14:30:00.000Z",
          updatedAt: "2026-06-08T14:30:00.000Z",
          fullName: "Juan Pérez",
          headline: "Backend Developer",
          email: "juan@example.com",
          phone: "+57 300 123 4567",
          location: "Medellín, Colombia",
          links: [
            { label: "LinkedIn", url: "https://linkedin.com/in/juan" },
          ],
          summary: "Backend developer con 4 años de experiencia.",
        },
        {
          id: "sec_02",
          kind: "experience",
          source: "imported",
          createdAt: "2026-06-08T14:30:00.000Z",
          updatedAt: "2026-06-08T14:30:00.000Z",
          role: "Backend Developer",
          company: "Acme Corp",
          startDate: "2022-01",
          endDate: null,
          location: "Medellín",
          bullets: ["Reduje latencia en 35%."],
          techStack: ["Node.js", "PostgreSQL"],
        },
        {
          id: "sec_04",
          kind: "skills",
          source: "user-typed",
          createdAt: "2026-06-08T14:30:00.000Z",
          updatedAt: "2026-06-08T14:30:00.000Z",
          groups: [{ category: "Backend", items: ["Node.js", "Python"] }],
        },
      ],
      entities: [],
      createdAt: "2026-06-08T14:30:00.000Z",
      updatedAt: "2026-06-08T14:30:00.000Z",
      source: "blank",
    };
    const ctx: ParseContext = {
      originalEntities: new Set<string>([
        "juan pérez",
        "backend developer",
        "medellín",
        "colombia",
        "juan@example.com",
        "+57 300 123 4567",
        "https://linkedin.com/in/juan",
        "linkedin",
        "acme corp",
        "medellín",
        "2022-01",
        "actualidad",
        "reduje latencia en 35%.",
        "node.js",
        "postgresql",
        "backend",
        "python",
        "backend developer con 4 años de experiencia.",
        "stack: node.js, postgresql",
      ]),
      userTypedEntities: new Set<string>(),
    };
    const md = serializeCvDocument(doc);
    const reparsed = parseCvDocument(md, ctx);
    expect(reparsed.sections).toHaveLength(doc.sections.length);
    expect(reparsed.sections[0]?.kind).toBe("profile");
    expect(reparsed.sections[1]?.kind).toBe("experience");
    expect(reparsed.sections[2]?.kind).toBe("skills");
  });
});
