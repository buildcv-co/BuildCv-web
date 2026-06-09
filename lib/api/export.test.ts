import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExportError, downloadBlob, requestExportPdf } from "./export";
import type { ValidationReport } from "./types";

const validValidation: ValidationReport = {
  isValid: true,
  severity: "None",
  inventions: [],
  warnings: [],
};

const baseReq = {
  adaptedCv: "# CV\n- C#",
  validation: validValidation,
  candidateName: "Candidato",
};

function pdfBlobResponse(): Response {
  return new Response(new Blob(["%PDF-1.4 mock pdf bytes"], { type: "application/pdf" }), {
    status: 200,
    headers: { "content-type": "application/pdf" },
  });
}

function jsonResponse(body: unknown, status: number): Response {
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

function mockFetchOnce(response: Response): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("requestExportPdf", () => {
  it("envía POST a /api/export (BFF same-origin, NUNCA a BACKEND_URL)", async () => {
    const fetchMock = mockFetchOnce(pdfBlobResponse());
    await requestExportPdf(baseReq);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/export");
    expect(url).not.toContain("localhost:5080");
    expect(url).not.toContain("BACKEND_URL");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify(baseReq));
    expect(init.cache).toBe("no-store");
  });

  it("happy path: 200 + application/pdf → devuelve Blob con type pdf", async () => {
    mockFetchOnce(pdfBlobResponse());
    const result = await requestExportPdf(baseReq);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe("application/pdf");
    expect(result.size).toBeGreaterThan(0);
  });

  it("network error: fetch rechaza → ExportError status=0, kind=network", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    try {
      await requestExportPdf(baseReq);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ExportError;
      expect(err).toBeInstanceOf(ExportError);
      expect(err.status).toBe(0);
      expect(err.kind).toBe("network");
      expect(err.code).toBe("EXPORT_NETWORK");
      expect(err.message).toMatch(/conectar|conexión/i);
    }
  });

  it("400: kind=validation, fields poblado, mensaje honesto", async () => {
    mockFetchOnce(
      jsonResponse(
        {
          title: "Validation",
          detail: "el CV es demasiado largo",
          errors: { adaptedCv: ["demasiado largo"] },
        },
        400,
      ),
    );
    try {
      await requestExportPdf(baseReq);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ExportError;
      expect(err.kind).toBe("validation");
      expect(err.status).toBe(400);
      expect(err.code).toBe("Validation");
      expect(err.fields).toEqual({ adaptedCv: ["demasiado largo"] });
      expect(err.message).toMatch(/revisa|adaptado|nombre/i);
    }
  });

  it("422: kind=invention, message=problem.detail", async () => {
    mockFetchOnce(
      jsonResponse(
        { title: "HardInvention", detail: "Se detectó [FakeCorp] que no existe en el CV." },
        422,
      ),
    );
    try {
      await requestExportPdf(baseReq);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ExportError;
      expect(err.kind).toBe("invention");
      expect(err.status).toBe(422);
      expect(err.code).toBe("HardInvention");
      expect(err.message).toBe("Se detectó [FakeCorp] que no existe en el CV.");
    }
  });

  it("429: kind=rate_limit, mensaje honesto pre-traducido (NO usa detail)", async () => {
    mockFetchOnce(
      jsonResponse({ title: "RateLimited", detail: "20/h reached" }, 429),
    );
    try {
      await requestExportPdf(baseReq);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ExportError;
      expect(err.kind).toBe("rate_limit");
      expect(err.status).toBe(429);
      expect(err.message).toMatch(/20\/hora|exportaciones/i);
    }
  });

  it("503: kind=unavailable, mensaje honesto pre-traducido", async () => {
    mockFetchOnce(jsonResponse({ title: "PdfOffline", detail: "QuestPDF down" }, 503));
    try {
      await requestExportPdf(baseReq);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ExportError;
      expect(err.kind).toBe("unavailable");
      expect(err.status).toBe(503);
      expect(err.message).toMatch(/PDF.*no está disponible temporalmente/i);
    }
  });

  it("500/otro: kind=unknown, message=problem.detail ?? fallback", async () => {
    mockFetchOnce(jsonResponse({ title: "Boom", detail: "Upstream died" }, 500));
    try {
      await requestExportPdf(baseReq);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ExportError;
      expect(err.kind).toBe("unknown");
      expect(err.status).toBe(500);
      expect(err.code).toBe("Boom");
      expect(err.message).toBe("Upstream died");
    }
  });

  it("body no-JSON: no throwea dentro del catch, usa fallback", async () => {
    mockFetchOnce(textResponse("not json", 500));
    try {
      await requestExportPdf(baseReq);
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as ExportError;
      expect(err.kind).toBe("unknown");
      expect(err.status).toBe(500);
      expect(err.code).toBe("EXPORT_FAILED");
      expect(err.message).toMatch(/PDF|intenta/i);
    }
  });

  it("ExportError es instancia de Error y name=ExportError", () => {
    const err = new ExportError({
      status: 0,
      code: "X",
      kind: "network",
      message: "msg",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ExportError);
    expect(err.name).toBe("ExportError");
    expect(err.message).toBe("msg");
  });

  it("ExportError expone fields cuando se pasan", () => {
    const err = new ExportError({
      status: 400,
      code: "V",
      kind: "validation",
      message: "m",
      fields: { candidateName: ["requerido"] },
    });
    expect(err.fields).toEqual({ candidateName: ["requerido"] });
  });
});

describe("downloadBlob", () => {
  it("crea blob URL, ancla <a>, click, remove y revokeObjectURL", () => {
    const createObjectURL = vi.fn(() => "blob:mock-uuid");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL,
      revokeObjectURL,
    } as unknown as typeof URL);

    const blob = new Blob(["%PDF-1.4 mock"], { type: "application/pdf" });
    const filename = "cv-adapted-2026-06-08.pdf";

    // Spy en createElement para inspeccionar el <a>
    const realCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) => {
        const el = realCreateElement(tag);
        if (tag === "a") {
          (el as HTMLAnchorElement).click = vi.fn();
        }
        return el;
      });

    const body = document.body;
    const appendChildSpy = vi.spyOn(body, "appendChild");
    const removeChildSpy = vi.spyOn(body, "removeChild");

    downloadBlob(blob, filename);

    // 1) createObjectURL se llamó con el blob
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledWith(blob);

    // 2) Se creó un <a>
    expect(createElementSpy).toHaveBeenCalledWith("a");
    const anchor = createElementSpy.mock.results[0]?.value as HTMLAnchorElement;
    expect(anchor).toBeDefined();
    expect(anchor.href).toBe("blob:mock-uuid");
    expect(anchor.download).toBe(filename);

    // 3) Se hizo click en el <a>
    expect(anchor.click).toHaveBeenCalledTimes(1);

    // 4) El <a> se añadió y removió del body
    expect(appendChildSpy).toHaveBeenCalledWith(anchor);
    expect(removeChildSpy).toHaveBeenCalledWith(anchor);

    // 5) revokeObjectURL se llamó (prevención de memory leak)
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-uuid");
  });
});
