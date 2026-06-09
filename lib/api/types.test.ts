import { describe, it, expect } from "vitest";
import {
  isAdaptationResult,
  isValidationReport,
  isEntityInvention,
  type AdaptationResult,
  type ValidationReport,
  type EntityInvention,
  type ExportRequest,
  type ExportErrorKind,
  type ExportErrorCode,
  type ExportErrorShape,
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
