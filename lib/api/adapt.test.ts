import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptError, requestAdapt } from "./adapt";
import type { AdaptationResult } from "./types";

const successPayload: AdaptationResult = {
  adaptedCv: "# CV\n## Experiencia\n- C#",
  validation: {
    isValid: true,
    severity: "None",
    inventions: [],
    warnings: [],
  },
  engineVersion: "1.0.0",
  aiModel: "stub",
};

function mockFetchOnce(response: Response): ReturnType<typeof vi.fn> {
  const fn = vi.fn().mockResolvedValueOnce(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

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

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestAdapt", () => {
  it("envía POST a /api/adapt (BFF same-origin, no BACKEND_URL)", async () => {
    const fetchMock = mockFetchOnce(jsonResponse(successPayload));
    await requestAdapt({ cvText: "cv", jobText: "job" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/adapt");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ cvText: "cv", jobText: "job" }));
    expect(init.cache).toBe("no-store");
  });

  it("happy path: 200 + JSON → devuelve AdaptationResult tipado", async () => {
    mockFetchOnce(jsonResponse(successPayload));
    const result = await requestAdapt({ cvText: "cv", jobText: "job" });
    expect(result).toEqual(successPayload);
    expect(result.validation.severity).toBe("None");
    expect(result.adaptedCv).toContain("Experiencia");
  });

  it("network error: fetch rechaza → AdaptError kind=network, status=0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")),
    );
    await expect(requestAdapt({ cvText: "cv", jobText: "job" })).rejects.toMatchObject({
      name: "AdaptError",
      status: 0,
      kind: "network",
      code: "ADAPT_NETWORK",
    });
  });

  it("400: kind=validation, fields poblado, mensaje honesto", async () => {
    mockFetchOnce(
      jsonResponse(
        {
          title: "Validation failed",
          errors: { cvText: ["too short"] },
        },
        400,
      ),
    );
    let err: AdaptError | undefined;
    try {
      await requestAdapt({ cvText: "x", jobText: "y" });
    } catch (caught) {
      err = caught as AdaptError;
    }
    expect(err).toBeInstanceOf(AdaptError);
    expect(err?.kind).toBe("validation");
    expect(err?.status).toBe(400);
    expect(err?.code).toBe("Validation failed");
    expect(err?.fields).toEqual({ cvText: ["too short"] });
    expect(err?.message).toMatch(/revisa|texto/i);
  });

  it("422: kind=invention, message=problem.detail", async () => {
    mockFetchOnce(
      jsonResponse(
        { title: "Hard invention", detail: "Se detectó [FakeCorp] que no existe en el CV." },
        422,
      ),
    );
    try {
      await requestAdapt({ cvText: "cv", jobText: "job" });
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as AdaptError;
      expect(err.kind).toBe("invention");
      expect(err.status).toBe(422);
      expect(err.code).toBe("Hard invention");
      expect(err.message).toBe("Se detectó [FakeCorp] que no existe en el CV.");
    }
  });

  it("429: kind=rate_limit, mensaje honesto pre-traducido (NO usa detail)", async () => {
    mockFetchOnce(
      jsonResponse({ title: "RateLimited", detail: "5/h reached" }, 429),
    );
    try {
      await requestAdapt({ cvText: "cv", jobText: "job" });
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as AdaptError;
      expect(err.kind).toBe("rate_limit");
      expect(err.status).toBe(429);
      expect(err.message).toMatch(/5\/hora|adaptaciones/i);
    }
  });

  it("503: kind=unavailable, mensaje honesto pre-traducido", async () => {
    mockFetchOnce(jsonResponse({ title: "AiOffline", detail: "stub down" }, 503));
    try {
      await requestAdapt({ cvText: "cv", jobText: "job" });
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as AdaptError;
      expect(err.kind).toBe("unavailable");
      expect(err.status).toBe(503);
      expect(err.message).toMatch(/no está disponible temporalmente/i);
    }
  });

  it("500/otro: kind=unknown, message=problem.detail ?? fallback", async () => {
    mockFetchOnce(jsonResponse({ title: "Boom", detail: "Upstream died" }, 500));
    try {
      await requestAdapt({ cvText: "cv", jobText: "job" });
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as AdaptError;
      expect(err.kind).toBe("unknown");
      expect(err.status).toBe(500);
      expect(err.code).toBe("Boom");
      expect(err.message).toBe("Upstream died");
    }
  });

  it("body no-JSON: no throwea dentro del catch, usa fallback", async () => {
    mockFetchOnce(textResponse("not json", 500));
    try {
      await requestAdapt({ cvText: "cv", jobText: "job" });
      throw new Error("should have thrown");
    } catch (caught) {
      const err = caught as AdaptError;
      expect(err.kind).toBe("unknown");
      expect(err.status).toBe(500);
      expect(err.code).toBe("ADAPT_FAILED");
      expect(err.message).toMatch(/intenta de nuevo|adaptar/i);
    }
  });

  it("AdaptError es instancia de Error y tiene name=AdaptError", () => {
    const err = new AdaptError({
      status: 0,
      code: "X",
      kind: "network",
      message: "msg",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AdaptError);
    expect(err.name).toBe("AdaptError");
    expect(err.message).toBe("msg");
  });
});
