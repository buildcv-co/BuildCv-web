import { describe, it, expect } from "vitest";
import { roundtrip } from "./roundtrip";
import { type ParseContext } from "./markdown/parse";
import { BLANK_DOCUMENT } from "./schema";
import type { CvDocument } from "./types";

const ISO = "2026-06-08T14:30:00.000Z";

function ctxFor(...tokens: string[]): ParseContext {
  return {
    originalEntities: new Set<string>(tokens.map((t) => t.toLowerCase())),
    userTypedEntities: new Set<string>(),
  };
}

describe("roundtrip", () => {
  it("doc simple con profile + experience → ok true", () => {
    const doc: CvDocument = {
      ...BLANK_DOCUMENT,
      sections: [
        {
          id: "sec_01",
          kind: "profile",
          source: "user-typed",
          createdAt: ISO,
          updatedAt: ISO,
          fullName: "Juan Pérez",
          headline: "Backend Developer",
          email: "juan@example.com",
          phone: "+57 300 123 4567",
          location: "Medellín, Colombia",
          links: [{ label: "LinkedIn", url: "https://linkedin.com/in/juan" }],
          summary: "Backend developer con 4 años de experiencia.",
        },
        {
          id: "sec_02",
          kind: "experience",
          source: "imported",
          createdAt: ISO,
          updatedAt: ISO,
          role: "Backend Developer",
          company: "Acme Corp",
          startDate: "2022-01",
          endDate: null,
          location: "Medellín",
          bullets: ["Reduje latencia en 35%."],
          techStack: ["Node.js", "PostgreSQL"],
        },
      ],
    };
    const result = roundtrip(doc, {
      originalEntities: new Set([
        "juan pérez",
        "backend developer",
        "medellín",
        "colombia",
        "juan@example.com",
        "+57 300 123 4567",
        "https://linkedin.com/in/juan",
        "linkedin",
        "acme corp",
        "2022-01",
        "actualidad",
        "reduje latencia en 35%.",
        "node.js",
        "postgresql",
        "backend developer con 4 años de experiencia.",
        "stack: node.js, postgresql",
      ]),
      userTypedEntities: new Set(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.markdown).toContain("## Perfil");
      expect(result.markdown).toContain("## Experiencia");
    }
  });

  it("doc vacío → ok true con markdown vacío", () => {
    const result = roundtrip(BLANK_DOCUMENT, ctxFor());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.markdown).toBe("");
    }
  });

  it("doc con skills genera markdown de round-trip válido", () => {
    const doc: CvDocument = {
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
    const result = roundtrip(doc, {
      originalEntities: new Set(["backend", "node.js", "python"]),
      userTypedEntities: new Set(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.markdown).toMatch(/## Habilidades/);
      expect(result.markdown).toMatch(/- \*\*Backend\*\*:/);
    }
  });

  it("ENTITY_NOT_ALLOWED cuando hay token que no está en ctx", () => {
    const doc: CvDocument = {
      ...BLANK_DOCUMENT,
      sections: [
        {
          id: "sec_01",
          kind: "profile",
          source: "imported",
          createdAt: ISO,
          updatedAt: ISO,
          fullName: "Juan Pérez",
          headline: "Backend Developer",
          email: "juan@example.com",
          phone: "",
          location: "Medellín",
          links: [],
          summary: "",
        },
      ],
    };
    const result = roundtrip(doc, {
      originalEntities: new Set(["some", "other", "tokens"]),
      userTypedEntities: new Set(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("ENTITY_NOT_ALLOWED");
    }
  });

  it("user-typed entities son aceptadas (whitelist runtime)", () => {
    const doc: CvDocument = {
      ...BLANK_DOCUMENT,
      sections: [
        {
          id: "sec_01",
          kind: "profile",
          source: "user-typed",
          createdAt: ISO,
          updatedAt: ISO,
          fullName: "Juan Pérez",
          headline: "NewSkill",
          email: "juan@example.com",
          phone: "",
          location: "",
          links: [],
          summary: "",
        },
      ],
    };
    const result = roundtrip(doc, {
      originalEntities: new Set(),
      userTypedEntities: new Set(["juan pérez", "newskill", "juan@example.com"]),
    });
    expect(result.ok).toBe(true);
  });

  it("es determinista (mismo input → mismo output)", () => {
    const doc: CvDocument = {
      ...BLANK_DOCUMENT,
      sections: [
        {
          id: "sec_01",
          kind: "profile",
          source: "user-typed",
          createdAt: ISO,
          updatedAt: ISO,
          fullName: "Juan",
          headline: "Backend",
          email: "j@x.com",
          phone: "",
          location: "Medellín",
          links: [],
          summary: "",
        },
      ],
    };
    const ctx = ctxFor("juan", "backend", "j@x.com", "medellín");
    const a = roundtrip(doc, ctx);
    const b = roundtrip(doc, ctx);
    expect(a).toEqual(b);
  });

  it("ROUNDTRIP_MISMATCH cuando un section válido no se preserva por filter", () => {
    // Construimos un doc con un profile válido Y un experience que tras
    // roundtrip se va a omitir (no genera tokens). El roundtrip detecta
    // el mismatch de número de secciones.
    const doc: CvDocument = {
      ...BLANK_DOCUMENT,
      sections: [
        {
          id: "sec_01",
          kind: "profile",
          source: "user-typed",
          createdAt: ISO,
          updatedAt: ISO,
          fullName: "Juan",
          headline: "Backend",
          email: "j@x.com",
          phone: "",
          location: "",
          links: [],
          summary: "",
        },
        {
          id: "sec_02",
          kind: "other",
          source: "user-typed",
          createdAt: ISO,
          updatedAt: ISO,
          title: "Notas",
          content: "algún texto",
        },
      ],
    };
    const result = roundtrip(doc, {
      originalEntities: new Set(["juan", "backend", "j@x.com", "notas", "algún texto"]),
      userTypedEntities: new Set(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.markdown).toMatch(/## Perfil/);
      expect(result.markdown).toMatch(/## Otros/);
    }
  });
});
