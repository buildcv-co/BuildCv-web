import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const validRequest = {
  cv: { basics: { name: "Ada" }, work: [], education: [], skills: [] },
  job: { title: "Backend Engineer", requirements: ["C#"] },
  scoreContext: { score: 82, components: [], version: "2.0.0" },
  markers: { "basics.name": "user_confirmed" },
  sessionToggleState: true,
};

const successPayload = {
  summary: "Offline feedback generated.",
  strengths: ["C#"],
  risks: [],
  suggestions: [{ category: "skills", text: "Add .NET", severity: "low" }],
  missingKeywords: [],
  questions: [],
  provider: "fake",
  model: "fake-local-v1",
  generatedAt: "2026-06-28T00:00:00.000Z",
  degraded: false,
};

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
  });
}

function routeRequest(body: unknown): Request {
  return new Request("http://localhost/api/llm/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function captureBackendFetch(response: Response) {
  const calls: Array<[string, RequestInit]> = [];
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push([String(input), init ?? {}]);
    return response;
  };
  return calls;
}

beforeEach(() => {
  vi.stubEnv("BACKEND_URL", "http://backend.test");
  vi.stubEnv("BFF_API_KEY", "unit-bff-key");
  vi.resetModules();
});

afterEach(() => {
  delete (globalThis as { fetch?: typeof fetch }).fetch;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("POST /api/llm/feedback", () => {
  it("exports nodejs runtime and force-dynamic route config", async () => {
    const route = await import("./route");
    expect(route.runtime).toBe("nodejs");
    expect(route.dynamic).toBe("force-dynamic");
  });

  it("forwards cv/job/markers/scoreContext to backend /api/v1/llm/feedback with server-side BFF key", async () => {
    const calls = captureBackendFetch(jsonResponse(successPayload));
    const { POST } = await import("./route");
    await POST(routeRequest(validRequest));
    expect(calls).toHaveLength(1);
    const [url, init] = calls[0];
    expect(url).toBe("http://backend.test/api/v1/llm/feedback");
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.body).toBe(JSON.stringify(validRequest));
    expect(init.headers).toMatchObject({
      "content-type": "application/json",
      "X-BFF-Key": "unit-bff-key",
    });
  });

  it("returns 200 + LlmFeedbackResponse v2 on backend success", async () => {
    captureBackendFetch(jsonResponse(successPayload));
    const { POST } = await import("./route");
    const response = await POST(routeRequest(validRequest));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(successPayload);
  });

  it("returns 502 + unavailable state on backend 5xx without exposing stack traces", async () => {
    captureBackendFetch(jsonResponse({ error: "Boom", detail: "System.StackTrace at Secret.Provider" }, 500));
    const { POST } = await import("./route");
    const response = await POST(routeRequest(validRequest));
    expect(response.status).toBe(502);
    const body = (await response.json()) as { state?: string; error?: { detail?: string } };
    expect(body.state).toBe("unavailable");
    expect(JSON.stringify(body)).not.toContain("StackTrace");
    expect(JSON.stringify(body)).not.toContain("Secret.Provider");
  });

  it("preserves Retry-After on backend 429 and uses rate_limited state", async () => {
    captureBackendFetch(jsonResponse({ error: "rate_limited", detail: "limit" }, 429, { "Retry-After": "45" }));
    const { POST } = await import("./route");
    const response = await POST(routeRequest(validRequest));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("45");
    const body = (await response.json()) as { state?: string };
    expect(body.state).toBe("rate_limited");
  });

  it("never exposes Authorization, X-BFF-Key, backend-only headers, or backend raw errors", async () => {
    captureBackendFetch(
      new Response(JSON.stringify({ error: "raw", detail: "Authorization: Bearer backend-token X-BFF-Key=unit-bff-key" }), {
        status: 502,
        headers: {
          "content-type": "application/json",
          Authorization: "Bearer backend-token",
          "X-BFF-Key": "unit-bff-key",
          "X-Backend-Trace": "trace-secret",
        },
      }),
    );
    const { POST } = await import("./route");
    const response = await POST(routeRequest(validRequest));
    expect(response.headers.get("Authorization")).toBeNull();
    expect(response.headers.get("X-BFF-Key")).toBeNull();
    expect(response.headers.get("X-Backend-Trace")).toBeNull();
    const bodyText = JSON.stringify(await response.json());
    expect(bodyText).not.toContain("backend-token");
    expect(bodyText).not.toContain("unit-bff-key");
    expect(bodyText).not.toContain("Authorization");
  });

  it("does not define public LLM configuration in route sources", async () => {
    const publicLlmPrefix = ["NEXT", "PUBLIC", "LLM"].join("_");
    const route = await import("./route");
    expect(JSON.stringify(Object.keys(route))).not.toContain(publicLlmPrefix);
    expect(process.env[`${publicLlmPrefix}_ENABLED`]).toBeUndefined();
  });
});
