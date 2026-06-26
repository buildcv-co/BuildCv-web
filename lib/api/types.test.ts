import { describe, it, expect } from "vitest";
import {
  isAdaptationResult,
  isValidationReport,
  isEntityInvention,
  isDetectedSection,
  isImportWarning,
  isImportResult,
  isStructuredScoreRequest,
  isLegacyScoreRequest,
  isScoreResponseV2,
  isScoreBand,
  isPerSectionScore,
  isRedFlag,
  type AdaptationResult,
  type ValidationReport,
  type EntityInvention,
  type DetectedSection,
  type ImportWarning,
  type ImportResult,
  type ImportErrorKind,
  type ExportRequest,
  type ExportErrorKind,
  type ExportErrorCode,
  type ExportErrorShape,
  type StructuredScoreRequest,
  type LegacyScoreRequest,
  type ScoreBand,
  type PerSectionScore,
  type RedFlag,
} from "./types";

const validInvention: EntityInvention = {
  type: "Skill",
  claimed: "Kubernetes",
  original: null,
  severity: "Hard",
  position: 42,
};

const validReport: ValidationReport = {
  isValid: true,
  severity: "None",
  inventions: [],
  warnings: [],
};

const validResult: AdaptationResult = {
  adaptedCv: "# Mariana\nBackend dev",
  validation: validReport,
  engineVersion: "1.0.0",
  aiModel: "stub",
};

describe("isEntityInvention", () => {
  it("acepta una invención válida", () => {
    expect(isEntityInvention(validInvention)).toBe(true);
  });

  it("acepta invention con original string", () => {
    expect(isEntityInvention({ ...validInvention, original: "K8s" })).toBe(true);
  });

  it("rechaza invention con severity inválida", () => {
    expect(isEntityInvention({ ...validInvention, severity: "Bogus" })).toBe(false);
  });

  it("rechaza invention con type inválido", () => {
    expect(isEntityInvention({ ...validInvention, type: "Random" })).toBe(false);
  });

  it("rechaza null y primitivos", () => {
    expect(isEntityInvention(null)).toBe(false);
    expect(isEntityInvention(undefined)).toBe(false);
    expect(isEntityInvention("string")).toBe(false);
    expect(isEntityInvention(42)).toBe(false);
  });

  it("rechaza invention sin claimed", () => {
    const { claimed: _claimed, ...rest } = validInvention;
    void _claimed;
    expect(isEntityInvention(rest)).toBe(false);
  });
});

describe("isValidationReport", () => {
  it("acepta un reporte válido", () => {
    expect(isValidationReport(validReport)).toBe(true);
  });

  it("acepta reporte con severities alternativas (Warning, Critical)", () => {
    expect(isValidationReport({ ...validReport, severity: "Warning" })).toBe(true);
    expect(isValidationReport({ ...validReport, severity: "Critical" })).toBe(true);
  });

  it("rechaza severity inválida", () => {
    expect(isValidationReport({ ...validReport, severity: "Bogus" })).toBe(false);
  });

  it("rechaza reporte sin isValid", () => {
    const { isValid: _isValid, ...rest } = validReport;
    void _isValid;
    expect(isValidationReport(rest)).toBe(false);
  });

  it("rechaza reporte sin inventions array", () => {
    expect(isValidationReport({ ...validReport, inventions: "no-array" })).toBe(false);
  });
});

describe("ExportRequest", () => {
  it("ExportRequest es un objeto con adaptedCv/validation/candidateName (shape)", () => {
    const req: ExportRequest = {
      adaptedCv: "# CV",
      validation: validReport,
      candidateName: "Candidato",
    };
    expect(req.adaptedCv).toBe("# CV");
    expect(req.candidateName).toBe("Candidato");
    expect(req.validation).toBe(validReport);
  });

  it("ExportErrorKind acepta los 6 kinds del contrato", () => {
    const kinds: ExportErrorKind[] = [
      "network",
      "validation",
      "invention",
      "rate_limit",
      "unavailable",
      "unknown",
    ];
    expect(kinds).toHaveLength(6);
    expect(kinds[0]).toBe("network");
    expect(kinds[5]).toBe("unknown");
  });

  it("ExportErrorCode es string (cualquier title del backend)", () => {
    const code: ExportErrorCode = "EXPORT_RATE_LIMITED";
    expect(typeof code).toBe("string");
  });

  it("ExportErrorShape tiene status, code, kind, message y fields opcional", () => {
    const shape: ExportErrorShape = {
      status: 429,
      code: "EXPORT_RATE_LIMITED",
      kind: "rate_limit",
      message: "Has alcanzado el tope de exportaciones (20/hora).",
    };
    expect(shape.status).toBe(429);
    expect(shape.kind).toBe("rate_limit");
    expect(shape.fields).toBeUndefined();

    const withFields: ExportErrorShape = {
      status: 400,
      code: "Validation",
      kind: "validation",
      message: "datos inválidos",
      fields: { adaptedCv: ["demasiado largo"] },
    };
    expect(withFields.fields).toEqual({ adaptedCv: ["demasiado largo"] });
  });

  it("filenameHint permite interpolar fecha YYYY-MM-DD (helper de UI)", () => {
    // El test verifica que el patrón 'cv-adapted-YYYY-MM-DD.pdf' se puede construir
    // de forma determinista a partir de una fecha — no prueba la función del copy,
    // prueba la convención.
    const date = new Date("2026-06-08T12:00:00Z");
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const filename = `cv-adapted-${yyyy}-${mm}-${dd}.pdf`;
    expect(filename).toBe("cv-adapted-2026-06-08.pdf");
  });
});

describe("isAdaptationResult", () => {
  it("acepta un AdaptationResult válido", () => {
    expect(isAdaptationResult(validResult)).toBe(true);
  });

  it("acepta result con validation que tiene Hard inventions", () => {
    const r: AdaptationResult = {
      ...validResult,
      validation: { ...validReport, severity: "Critical", inventions: [validInvention] },
    };
    expect(isAdaptationResult(r)).toBe(true);
  });

  it("rechaza si falta adaptedCv", () => {
    const { adaptedCv: _adaptedCv, ...rest } = validResult;
    void _adaptedCv;
    expect(isAdaptationResult(rest)).toBe(false);
  });

  it("rechaza si falta validation", () => {
    const { validation: _validation, ...rest } = validResult;
    void _validation;
    expect(isAdaptationResult(rest)).toBe(false);
  });

  it("rechaza si validation tiene severity inválida", () => {
    expect(
      isAdaptationResult({
        ...validResult,
        validation: { ...validReport, severity: "Bogus" },
      }),
    ).toBe(false);
  });

  it("rechaza si engineVersion no es string", () => {
    expect(isAdaptationResult({ ...validResult, engineVersion: 1 })).toBe(false);
  });

  it("rechaza null y primitivos", () => {
    expect(isAdaptationResult(null)).toBe(false);
    expect(isAdaptationResult(undefined)).toBe(false);
    expect(isAdaptationResult("foo")).toBe(false);
  });
});

// =====================================================================
// 005-web-cv-import-ui — ImportResult + DetectedSection + ImportWarning
// =====================================================================

const validSection: DetectedSection = {
  heading: "EXPERIENCIA",
  start: 76,
  end: 245,
  confidence: "High",
};

const validWarning: ImportWarning = {
  code: "IMAGE_OMITTED",
  message: "Se omitieron 1 imagen(es).",
  severity: "Info",
};

const validImport: ImportResult = {
  text: "Juan Pérez\nBackend Developer con 5 años de experiencia en C# y .NET.",
  sections: [validSection],
  warnings: [],
  engineVersion: "1.0.0",
  traceId: "0HMVD9F2E5Q2P:00000001",
};

describe("isDetectedSection", () => {
  it("acepta una sección válida con High confidence", () => {
    expect(isDetectedSection(validSection)).toBe(true);
  });

  it("acepta una sección con Low confidence", () => {
    expect(isDetectedSection({ ...validSection, confidence: "Low" })).toBe(true);
  });

  it("rechaza confidence inválida (case-sensitive, no 'high' lowercase)", () => {
    expect(isDetectedSection({ ...validSection, confidence: "high" })).toBe(false);
    expect(isDetectedSection({ ...validSection, confidence: "MEDIUM" })).toBe(false);
    expect(isDetectedSection({ ...validSection, confidence: "Bogus" })).toBe(false);
  });

  it("rechaza heading vacío o no-string", () => {
    expect(isDetectedSection({ ...validSection, heading: "" })).toBe(false);
    expect(isDetectedSection({ ...validSection, heading: 42 })).toBe(false);
  });

  it("rechaza heading > 100 chars (contract limit)", () => {
    expect(isDetectedSection({ ...validSection, heading: "x".repeat(101) })).toBe(false);
  });

  it("rechaza start/end no numéricos o negativos", () => {
    expect(isDetectedSection({ ...validSection, start: -1 })).toBe(false);
    expect(isDetectedSection({ ...validSection, start: "0" })).toBe(false);
    expect(isDetectedSection({ ...validSection, end: -5 })).toBe(false);
  });

  it("rechaza null, undefined, primitivos", () => {
    expect(isDetectedSection(null)).toBe(false);
    expect(isDetectedSection(undefined)).toBe(false);
    expect(isDetectedSection("foo")).toBe(false);
    expect(isDetectedSection(42)).toBe(false);
    expect(isDetectedSection([])).toBe(false);
  });

  it("rechaza object sin heading/start/end/confidence", () => {
    expect(isDetectedSection({})).toBe(false);
    expect(isDetectedSection({ heading: "x" })).toBe(false);
  });
});

describe("isImportWarning", () => {
  it("acepta un warning válido con severity Info", () => {
    expect(isImportWarning(validWarning)).toBe(true);
  });

  it("acepta las 3 severities (Info, Warning, Error)", () => {
    expect(isImportWarning({ ...validWarning, severity: "Info" })).toBe(true);
    expect(isImportWarning({ ...validWarning, severity: "Warning" })).toBe(true);
    expect(isImportWarning({ ...validWarning, severity: "Error" })).toBe(true);
  });

  it("rechaza severity inválida", () => {
    expect(isImportWarning({ ...validWarning, severity: "info" })).toBe(false);
    expect(isImportWarning({ ...validWarning, severity: "Critical" })).toBe(false);
    expect(isImportWarning({ ...validWarning, severity: "Bogus" })).toBe(false);
  });

  it("rechaza code vacío o > 50 chars", () => {
    expect(isImportWarning({ ...validWarning, code: "" })).toBe(false);
    expect(isImportWarning({ ...validWarning, code: "x".repeat(51) })).toBe(false);
  });

  it("rechaza message > 500 chars (contract limit)", () => {
    expect(isImportWarning({ ...validWarning, message: "x".repeat(501) })).toBe(false);
  });

  it("rechaza code/message no-string", () => {
    expect(isImportWarning({ ...validWarning, code: 42 })).toBe(false);
    expect(isImportWarning({ ...validWarning, message: null })).toBe(false);
  });

  it("rechaza null, undefined, primitivos", () => {
    expect(isImportWarning(null)).toBe(false);
    expect(isImportWarning(undefined)).toBe(false);
    expect(isImportWarning(42)).toBe(false);
  });
});

describe("isImportResult", () => {
  it("acepta un ImportResult válido (happy path: PDF con 1 sección, sin warnings)", () => {
    expect(isImportResult(validImport)).toBe(true);
  });

  it("acepta un ImportResult con sections[] y warnings[] vacíos", () => {
    expect(isImportResult({ ...validImport, sections: [], warnings: [] })).toBe(true);
  });

  it("acepta un ImportResult con múltiples sections y warnings", () => {
    expect(
      isImportResult({
        ...validImport,
        sections: [
          validSection,
          { ...validSection, heading: "EDUCACIÓN", start: 247, end: 320 },
        ],
        warnings: [validWarning],
      }),
    ).toBe(true);
  });

  it("rechaza text > 50_000 chars (contract limit, defense in depth)", () => {
    expect(isImportResult({ ...validImport, text: "x".repeat(50_001) })).toBe(false);
  });

  it("rechaza sections con > 50 items (contract limit)", () => {
    const bigSections: DetectedSection[] = Array.from({ length: 51 }, (_, i) => ({
      ...validSection,
      heading: `S${i}`,
    }));
    expect(isImportResult({ ...validImport, sections: bigSections })).toBe(false);
  });

  it("rechaza warnings con > 20 items (contract limit)", () => {
    const bigWarnings: ImportWarning[] = Array.from({ length: 21 }, () => validWarning);
    expect(isImportResult({ ...validImport, warnings: bigWarnings })).toBe(false);
  });

  it("rechaza engineVersion que NO es SemVer (regex ^\\d+\\.\\d+\\.\\d+$)", () => {
    expect(isImportResult({ ...validImport, engineVersion: "1.0" })).toBe(false);
    expect(isImportResult({ ...validImport, engineVersion: "v1.0.0" })).toBe(false);
    expect(isImportResult({ ...validImport, engineVersion: "not-semver" })).toBe(false);
    expect(isImportResult({ ...validImport, engineVersion: "" })).toBe(false);
  });

  it("acepta engineVersion en formato SemVer válido", () => {
    expect(isImportResult({ ...validImport, engineVersion: "1.0.0" })).toBe(true);
    expect(isImportResult({ ...validImport, engineVersion: "10.20.30" })).toBe(true);
  });

  it("rechaza traceId vacío o > 100 chars", () => {
    expect(isImportResult({ ...validImport, traceId: "" })).toBe(false);
    expect(isImportResult({ ...validImport, traceId: "x".repeat(101) })).toBe(false);
  });

  it("rechaza si falta text", () => {
    const { text: _text, ...rest } = validImport;
    void _text;
    expect(isImportResult(rest)).toBe(false);
  });

  it("rechaza si sections contiene un item inválido", () => {
    expect(
      isImportResult({
        ...validImport,
        sections: [{ ...validSection, confidence: "Bogus" }],
      }),
    ).toBe(false);
  });

  it("rechaza si warnings contiene un item inválido", () => {
    expect(
      isImportResult({
        ...validImport,
        warnings: [{ ...validWarning, severity: "Critical" }],
      }),
    ).toBe(false);
  });

  it("rechaza null, undefined, primitivos", () => {
    expect(isImportResult(null)).toBe(false);
    expect(isImportResult(undefined)).toBe(false);
    expect(isImportResult("foo")).toBe(false);
    expect(isImportResult(42)).toBe(false);
    expect(isImportResult([])).toBe(false);
  });
});

describe("ImportErrorKind union", () => {
  it("acepta los 8 kinds del contrato (network, client_validation, too_large, unsupported_mime, validation, engine, rate_limit, unknown)", () => {
    const kinds: ImportErrorKind[] = [
      "network",
      "client_validation",
      "too_large",
      "unsupported_mime",
      "validation",
      "engine",
      "rate_limit",
      "unknown",
    ];
    expect(kinds).toHaveLength(8);
    expect(kinds[0]).toBe("network");
    expect(kinds[7]).toBe("unknown");
  });
});

// =====================================================================
// 021-structured-cv-import-and-job-input — ScoreCvRequest discriminated
// union + ScoreResponse v2 (PR1)
// =====================================================================

const validStructuredRequest: StructuredScoreRequest = {
  kind: "structured",
  // CvDocument se completa en PR2; para PR1 basta con shape estable.
  cv: {
    basics: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      profiles: [],
      confidence: {
        name: "inferred",
        email: "explicit",
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
    meta: { engineVersion: "2.0.0" },
  },
  job: {
    title: "Senior Backend Engineer",
    company: "Acme S.A.",
    description: "Buscamos ingeniero backend con .NET 10.",
    location: "Bogotá, Colombia",
    employmentType: "full_time",
    requirements: ["5 años de experiencia en C#"],
  },
  engineVersion: "2.0.0",
};

const validLegacyRequest: LegacyScoreRequest = {
  kind: "legacy",
  cvText: "Curriculum extenso con experiencia en backend y frontend...",
  jobText: "Vacante con requisitos de .NET 10, PostgreSQL y Redis.",
  engineVersion: "1.0.0",
};

describe("ScoreCvRequest — discriminada por `kind` + `engineVersion`", () => {
  it("acepta un request structured (kind='structured', engineVersion='2.0.0')", () => {
    expect(isStructuredScoreRequest(validStructuredRequest)).toBe(true);
  });

  it("acepta un request legacy (kind='legacy', engineVersion='1.0.0')", () => {
    expect(isLegacyScoreRequest(validLegacyRequest)).toBe(true);
  });

  it("rechaza structured con engineVersion distinto de '2.0.0' (parity con backend)", () => {
    const mismatch = {
      ...validStructuredRequest,
      engineVersion: "1.0.0" as const,
    };
    expect(isStructuredScoreRequest(mismatch)).toBe(false);
  });

  it("rechaza legacy con engineVersion distinto de '1.0.0' (parity con backend)", () => {
    const mismatch = {
      ...validLegacyRequest,
      engineVersion: "2.0.0" as const,
    };
    expect(isLegacyScoreRequest(mismatch)).toBe(false);
  });

  it("rechaza payloads sin `kind`", () => {
    const noKind = { ...validStructuredRequest };
    delete (noKind as { kind?: string }).kind;
    expect(isStructuredScoreRequest(noKind)).toBe(false);
    expect(isLegacyScoreRequest(noKind)).toBe(false);
  });

  it("rechaza null y primitivos", () => {
    expect(isStructuredScoreRequest(null)).toBe(false);
    expect(isStructuredScoreRequest(undefined)).toBe(false);
    expect(isStructuredScoreRequest("foo")).toBe(false);
    expect(isStructuredScoreRequest(42)).toBe(false);
    expect(isLegacyScoreRequest(null)).toBe(false);
    expect(isLegacyScoreRequest("foo")).toBe(false);
  });
});

describe("ScoreBand — bandas cualitativas (FR-010, Constitution Art. IV)", () => {
  it("acepta exactamente las 4 bandas: low, mid, high, top", () => {
    const bands: ScoreBand[] = ["low", "mid", "high", "top"];
    expect(bands).toHaveLength(4);
    expect(isScoreBand("low")).toBe(true);
    expect(isScoreBand("mid")).toBe(true);
    expect(isScoreBand("high")).toBe(true);
    expect(isScoreBand("top")).toBe(true);
  });

  it("rechaza bandas fuera del enum cerrado", () => {
    expect(isScoreBand("excelente")).toBe(false);
    expect(isScoreBand("")).toBe(false);
    expect(isScoreBand("Low")).toBe(false);
  });
});

describe("PerSectionScore — 5 secciones (FR score-section-breakdown)", () => {
  it("acepta perSection con los 5 campos requeridos (cada uno 0-100 o null)", () => {
    const perSection: PerSectionScore = {
      experience: 85,
      education: 70,
      skills: 100,
      certifications: null,
      contact: 90,
    };
    expect(isPerSectionScore(perSection)).toBe(true);
  });

  it("acepta perSection con todos null (sección ausente → renormalizado)", () => {
    const allNull: PerSectionScore = {
      experience: null,
      education: null,
      skills: null,
      certifications: null,
      contact: null,
    };
    expect(isPerSectionScore(allNull)).toBe(true);
  });

  it("rechaza perSection con score > 100", () => {
    expect(
      isPerSectionScore({ experience: 101, education: 0, skills: 0, certifications: 0, contact: 0 }),
    ).toBe(false);
  });

  it("rechaza perSection con score < 0", () => {
    expect(
      isPerSectionScore({ experience: -1, education: 0, skills: 0, certifications: 0, contact: 0 }),
    ).toBe(false);
  });

  it("rechaza perSection sin uno de los campos requeridos", () => {
    expect(
      isPerSectionScore({ experience: 50, education: 50, skills: 50, certifications: 50 }),
    ).toBe(false);
  });
});

describe("RedFlag — señal sin deducción (Art. I)", () => {
  it("acepta redFlag completo (code, severity, message)", () => {
    const flag: RedFlag = {
      code: "EMPLOYMENT_GAP_6M",
      severity: "medium",
      message: "Hueco laboral de 8 meses entre 2022-01 y 2022-09.",
    };
    expect(isRedFlag(flag)).toBe(true);
  });

  it("rechaza redFlag con severity inválida", () => {
    expect(
      isRedFlag({ code: "X", severity: "critical", message: "y" }),
    ).toBe(false);
  });

  it("rechaza redFlag con code vacío", () => {
    expect(isRedFlag({ code: "", severity: "low", message: "y" })).toBe(false);
  });

  it("rechaza redFlag con message vacío", () => {
    expect(isRedFlag({ code: "X", severity: "low", message: "" })).toBe(false);
  });
});

describe("ScoreResponseV2 — respuesta del motor 2.0.0", () => {
  it("acepta una respuesta v2 con perSection y redFlags", () => {
    const ok = isScoreResponseV2({
      overallScore: 82,
      band: "high",
      perSection: {
        experience: 80,
        education: 70,
        skills: 100,
        certifications: null,
        contact: 90,
      },
      redFlags: [
        {
          code: "EMPLOYMENT_GAP_6M",
          severity: "medium",
          message: "Hueco laboral de 8 meses.",
        },
      ],
      honestyNotice:
        "Coincidencia con la vacante + legibilidad para sistemas automáticos.",
      gatesApplied: ["score.min_words", "score.contact.present"],
      engineVersion: "2.0.0",
      lexiconVersion: "tech-co-v3",
      traceId: "0HMVD9F2E5Q2P:00000001",
    });
    expect(ok).toBe(true);
  });

  it("rechaza una respuesta sin overallScore o con band inválida", () => {
    expect(
      isScoreResponseV2({
        overallScore: "x",
        band: "excelente",
        perSection: null,
        redFlags: [],
        honestyNotice: "x",
        gatesApplied: [],
        engineVersion: "2.0.0",
        lexiconVersion: "v1",
        traceId: "t",
      }),
    ).toBe(false);
  });

  it("rechaza engineVersion distinto de '2.0.0'", () => {
    expect(
      isScoreResponseV2({
        overallScore: 50,
        band: "mid",
        perSection: null,
        redFlags: [],
        honestyNotice: "x",
        gatesApplied: [],
        engineVersion: "1.0.0",
        lexiconVersion: "v1",
        traceId: "t",
      }),
    ).toBe(false);
  });

  it("rechaza perSection inválido", () => {
    expect(
      isScoreResponseV2({
        overallScore: 50,
        band: "mid",
        perSection: { experience: 999 },
        redFlags: [],
        honestyNotice: "x",
        gatesApplied: [],
        engineVersion: "2.0.0",
        lexiconVersion: "v1",
        traceId: "t",
      }),
    ).toBe(false);
  });
});
