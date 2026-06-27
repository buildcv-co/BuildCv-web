import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImportError, MAX_FILE_SIZE_BYTES, requestImport, validateFile } from "./import";
import { isImportResult } from "./types";
import type { ImportResult, ImportResultV2 } from "./types";

const successPayload: ImportResult = {
  text: "Juan Pérez\nBackend Developer con 5 años de experiencia en C# y .NET.",
  sections: [
    { heading: "EXPERIENCIA", start: 76, end: 245, confidence: "High" },
    { heading: "EDUCACIÓN", start: 247, end: 320, confidence: "High" },
  ],
  warnings: [
    { code: "IMAGE_OMITTED", message: "Se omitieron 1 imagen(es).", severity: "Info" },
  ],
  engineVersion: "1.0.0",
  traceId: "0HMVD9F2E5Q2P:00000001",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain" },
  });
}

function makeFile(name: string, type: string, sizeBytes: number, content = "x"): File {
  const blob = new Blob([content.repeat(Math.max(1, sizeBytes))], { type });
  // Truncar o expandir a sizeBytes exactos para que el test sea determinístico.
  const finalBlob = blob.slice(0, sizeBytes, type);
  return new File([finalBlob], name, { type });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// =====================================================================
// validateFile — validación client-side (defense in depth, Art. I)
// =====================================================================

describe("validateFile", () => {
  it("archivo vacío (size=0) → {ok:false, reason mencionando 'vacío'}", () => {
    const file = makeFile("empty.pdf", "application/pdf", 0);
    const result = validateFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.toLowerCase()).toContain("vacío");
  });

  it("archivo > 5MB → {ok:false, reason mencionando '5 MB'}", () => {
    const file = makeFile("big.pdf", "application/pdf", MAX_FILE_SIZE_BYTES + 1);
    const result = validateFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("5 MB");
  });

  it("archivo exactamente 5MB → {ok:true} (límite inclusivo)", () => {
    const file = makeFile("edge.pdf", "application/pdf", MAX_FILE_SIZE_BYTES);
    expect(validateFile(file).ok).toBe(true);
  });

  it("MIME text/plain → {ok:false, reason mencionando 'PDF o DOCX'}", () => {
    const file = makeFile("fake.pdf", "text/plain", 1024);
    const result = validateFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/PDF o DOCX/);
  });

  it("MIME image/png → rechazado", () => {
    const file = makeFile("screenshot.png", "image/png", 1024);
    expect(validateFile(file).ok).toBe(false);
  });

  it("MIME application/pdf → aceptado", () => {
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    expect(validateFile(file).ok).toBe(true);
  });

  it("MIME DOCX oficial → aceptado", () => {
    const file = makeFile(
      "cv.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      1024,
    );
    expect(validateFile(file).ok).toBe(true);
  });
});

// =====================================================================
// requestImport — BFF same-origin
// =====================================================================

describe("requestImport", () => {
  it("envía POST a /api/import (BFF same-origin, NUNCA BACKEND_URL)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(successPayload));
    vi.stubGlobal("fetch", fetchMock);

    const file = makeFile("cv.pdf", "application/pdf", 1024);
    await requestImport(file);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/import");
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.body).toBeInstanceOf(FormData);
    // CRÍTICO: el navegador NUNCA habla con BACKEND_URL
    expect(url).not.toContain("localhost:5080");
    expect(url).not.toContain("http://");
  });

  it("happy path: 200 + JSON → devuelve ImportResult validado por type-guard", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successPayload)));
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    const result = await requestImport(file);
    expect(result).toEqual(successPayload);
    expect(isImportResult(result)).toBe(true);
    if (!isImportResult(result)) throw new Error("Expected legacy import result");
    expect(result.text).toContain("Juan Pérez");
    expect(result.sections).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
  });

  it("happy path: response con payload que NO cumple el schema → ImportError kind=validation", async () => {
    const invalidPayload = {
      text: "ok",
      // falta 'sections' — falla el type-guard
      warnings: [],
      engineVersion: "1.0.0",
      traceId: "x",
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(invalidPayload)));
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    await expect(requestImport(file)).rejects.toMatchObject({
      name: "ImportError",
      kind: "validation",
      status: 200,
    });
  });

  it("network error: fetch rechaza → ImportError kind=network, status=0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    await expect(requestImport(file)).rejects.toMatchObject({
      name: "ImportError",
      status: 0,
      kind: "network",
      code: "NETWORK_ERROR",
    });
  });

  it("validateFile falla → ImportError kind=client_validation, status=0, SIN hacer fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const file = makeFile("big.pdf", "application/pdf", MAX_FILE_SIZE_BYTES + 1);
    await expect(requestImport(file)).rejects.toMatchObject({
      name: "ImportError",
      kind: "client_validation",
      status: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("413 too_large: ImportError kind=too_large, status=413, mensaje honesto", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            type: "...",
            title: "Archivo demasiado grande",
            status: 413,
            detail: "El archivo supera el límite de 5 MB.",
            code: "IMPORT_TOO_LARGE",
            sizeBytes: 6291456,
            maxBytes: 5242880,
          },
          413,
        ),
      ),
    );
    const file = makeFile("big.pdf", "application/pdf", 1024);
    try {
      await requestImport(file);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ImportError;
      expect(err.kind).toBe("too_large");
      expect(err.status).toBe(413);
      expect(err.code).toBe("IMPORT_TOO_LARGE");
      expect(err.message).toContain("5 MB");
      expect(err.details).toMatchObject({ sizeBytes: 6291456, maxBytes: 5242880 });
    }
  });

  it("415 unsupported_mime: ImportError kind=unsupported_mime", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            title: "Tipo de archivo no soportado",
            status: 415,
            detail: "Tipo de archivo no soportado. Sube un PDF o DOCX.",
            code: "IMPORT_UNSUPPORTED_MEDIA",
            mimeDeclared: "text/plain",
          },
          415,
        ),
      ),
    );
    const file = makeFile("fake.pdf", "application/pdf", 1024);
    try {
      await requestImport(file);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ImportError;
      expect(err.kind).toBe("unsupported_mime");
      expect(err.status).toBe(415);
      expect(err.code).toBe("IMPORT_UNSUPPORTED_MEDIA");
      expect(err.message).toMatch(/PDF o DOCX/);
    }
  });

  it("422 validation: ImportError kind=validation, message=problem.detail (mensaje del backend)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            title: "PDF escaneado",
            status: 422,
            detail:
              "Este PDF parece un escaneo. No podemos extraer texto. Pega el contenido manualmente o usa un PDF con texto seleccionable.",
            code: "IMPORT_SCANNED_PDF",
          },
          422,
        ),
      ),
    );
    const file = makeFile("scan.pdf", "application/pdf", 1024);
    try {
      await requestImport(file);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ImportError;
      expect(err.kind).toBe("validation");
      expect(err.status).toBe(422);
      expect(err.code).toBe("IMPORT_SCANNED_PDF");
      expect(err.message).toContain("escaneo");
    }
  });

  it("429 rate_limit: ImportError kind=rate_limit, mensaje pre-traducido honesto (30/hora)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            title: "Too Many Requests",
            status: 429,
            detail: "Has alcanzado el tope de importaciones (30/hora).",
            code: "IMPORT_RATE_LIMIT_EXCEEDED",
          },
          429,
        ),
      ),
    );
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    try {
      await requestImport(file);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ImportError;
      expect(err.kind).toBe("rate_limit");
      expect(err.status).toBe(429);
      expect(err.message).toMatch(/30\/hora|importaciones/i);
    }
  });

  it("503 engine: ImportError kind=engine, mensaje pre-traducido 'no está disponible'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            title: "Motor de import no disponible",
            status: 503,
            detail: "down",
            code: "IMPORT_ENGINE_ERROR",
          },
          503,
        ),
      ),
    );
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    try {
      await requestImport(file);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ImportError;
      expect(err.kind).toBe("engine");
      expect(err.status).toBe(503);
      expect(err.message).toMatch(/no está disponible temporalmente/i);
    }
  });

  it("500/otro: ImportError kind=unknown, message=problem.detail ?? fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          { title: "Boom", status: 500, detail: "Upstream died", code: "INTERNAL_ERROR" },
          500,
        ),
      ),
    );
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    try {
      await requestImport(file);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ImportError;
      expect(err.kind).toBe("unknown");
      expect(err.status).toBe(500);
      expect(err.code).toBe("INTERNAL_ERROR");
      expect(err.message).toBe("Upstream died");
    }
  });

  it("400 bad request: ImportError kind=validation, message=problem.detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          { title: "Validation", status: 400, detail: "Falta el campo file." },
          400,
        ),
      ),
    );
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    try {
      await requestImport(file);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ImportError;
      expect(err.kind).toBe("validation");
      expect(err.status).toBe(400);
      expect(err.message).toBe("Falta el campo file.");
    }
  });

  it("response no-JSON: ImportError kind=unknown, code=IMPORT_FAILED, fallback message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(textResponse("not json", 500)));
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    try {
      await requestImport(file);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ImportError;
      expect(err.kind).toBe("unknown");
      expect(err.status).toBe(500);
      expect(err.code).toBe("IMPORT_FAILED");
      expect(err.message).toMatch(/intenta de nuevo|procesar/i);
    }
  });

  it("ImportError es instancia de Error y name=ImportError", () => {
    const err = new ImportError({
      status: 0,
      code: "X",
      kind: "network",
      message: "msg",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ImportError);
    expect(err.name).toBe("ImportError");
    expect(err.message).toBe("msg");
  });

  it("ImportError.details es opcional (puede ser undefined)", () => {
    const err = new ImportError({
      status: 0,
      code: "X",
      kind: "client_validation",
      message: "msg",
    });
    expect(err.details).toBeUndefined();
  });
});

// =====================================================================
// 021-structured-cv-import-and-job-input — PR 2e: v2 path
// (engineVersion=2.0.0 → ImportResultV2 con CvDocument)
// =====================================================================

const successPayloadV2: ImportResultV2 = {
  cv: {
    basics: {
      name: "Ada Lovelace",
      email: "ada@example.com",
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
    meta: { engineVersion: "2.0.0" },
  },
  warnings: [
    { code: "IMAGE_OMITTED", message: "Se omitieron 1 imagen(es).", severity: "Info" },
  ],
  engineVersion: "2.0.0",
  traceId: "0HMVD9F2E5Q2P:00000100",
};

describe("requestImport — v2 path (PR 2e)", () => {
  it("envía POST a /api/import con header X-Engine-Version: 2.0.0 (negocia v2 con el backend)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(successPayloadV2));
    vi.stubGlobal("fetch", fetchMock);

    const file = makeFile("cv.pdf", "application/pdf", 1024);
    await requestImport(file);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/import");
    expect(init.method).toBe("POST");
    const headers = (init.headers ?? {}) as Record<string, string>;
    expect(headers["X-Engine-Version"]).toBe("2.0.0");
  });

  it("happy path v2: 200 + ImportResultV2 → devuelve CvDocument estructurado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successPayloadV2)));
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    const result = await requestImport(file);
    // Discriminador engineVersion=2.0.0 garantiza shape ImportResultV2
    expect(result).toEqual(successPayloadV2);
    if ("cv" in result) {
      expect(result.cv.basics.name).toBe("Ada Lovelace");
      expect(result.cv.meta.engineVersion).toBe("2.0.0");
      expect(result.engineVersion).toBe("2.0.0");
      expect(result.warnings).toHaveLength(1);
    } else {
      throw new Error("Se esperaba ImportResultV2 con `cv: CvDocument`");
    }
  });

  it("discriminación: respuesta v1 (legacy text/sections) se sigue aceptando (back-compat)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(successPayload)));
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    const result = await requestImport(file);
    expect(result).toEqual(successPayload);
    expect("text" in result).toBe(true);
    expect("cv" in result).toBe(false);
  });

  it("payload NO conforme a ningún shape (ni v1 ni v2) → ImportError kind=validation", async () => {
    const invalidPayload = {
      foo: "bar",
      baz: 42,
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(invalidPayload)));
    const file = makeFile("cv.pdf", "application/pdf", 1024);
    await expect(requestImport(file)).rejects.toMatchObject({
      name: "ImportError",
      kind: "validation",
      code: "INVALID_RESPONSE",
    });
  });
});
