import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildLlmFeedbackRequestBody,
  fetchLlmFeedback,
  type LlmFeedbackRequest,
  type LlmFeedbackState,
} from "./llm";

const baseRequest: LlmFeedbackRequest = {
  cv: {
    basics: {
      name: "Ada Lovelace",
      email: "ada@example.com",
      profiles: [],
      confidence: {
        name: "user_confirmed",
        email: "explicit",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "explicit",
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
    title: "Backend Engineer",
    company: "BuildCv",
    description: "Build deterministic C# services",
    location: "Remote",
    employmentType: "full_time",
    requirements: ["C#", ".NET"],
  },
  scoreContext: {
    score: 82,
    components: [
      {
        componentId: "match",
        label: "Match",
        subScore: 86,
        weight: 0.4,
        measurementCoverage: 1,
        confidence: "high",
        explanation: "Strong match",
      },
    ],
    version: "2.0.0",
  },
  markers: { "basics.name": "user_confirmed" },
  sessionToggleState: true,
};

const successPayload = {
  summary: "Strong deterministic fit with optional feedback.",
  strengths: ["C# experience"],
  risks: ["Some inferred fields"],
  suggestions: [{ category: "skills", text: "Add .NET evidence", severity: "medium" }],
  missingKeywords: ["Kubernetes"],
  questions: ["Can you quantify impact?"],
  provider: "fake",
  model: "fake-local-v1",
  generatedAt: "2026-06-28T00:00:00.000Z",
  degraded: false,
} as const;

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
  });
}

function captureFetch(response: Response) {
  const calls: Array<[string, RequestInit]> = [];
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    calls.push([String(input), init ?? {}]);
    return response;
  };
  return calls;
}

beforeEach(() => {
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

afterEach(() => {
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe("fetchLlmFeedback", () => {
  it("returns success state with a 10-field LlmFeedbackResponse", async () => {
    captureFetch(jsonResponse(successPayload));
    const result = await fetchLlmFeedback(baseRequest);
    expect(result).toEqual({ state: "success", data: successPayload });
    if (result.state !== "success") throw new Error("Expected success state");
    expect(Object.keys(result.data)).toHaveLength(10);
  });

  it("maps degraded=true success responses to degraded state", async () => {
    captureFetch(jsonResponse({ ...successPayload, degraded: true }));
    const result = await fetchLlmFeedback(baseRequest);
    expect(result.state).toBe("degraded");
    if (result.state !== "degraded") throw new Error("Expected degraded state");
    expect(result.data?.degraded).toBe(true);
  });

  it.each([
    { status: 403, state: "disabled", kind: "disabled" },
    { status: 429, state: "rate_limited", kind: "rate_limited" },
    { status: 504, state: "timeout", kind: "timeout" },
    { status: 502, state: "unavailable", kind: "unavailable" },
    { status: 500, state: "unavailable", kind: "serverError" },
    { status: 400, state: "error", kind: "validationError" },
  ] as const)("normalizes HTTP $status to $state/$kind", async ({ status, state, kind }) => {
    captureFetch(jsonResponse({ error: kind, detail: "Backend detail" }, status, { "Retry-After": "60" }));
    const result = await fetchLlmFeedback(baseRequest);
    expect(result.state).toBe(state);
    if (result.state === "success" || result.state === "degraded") {
      throw new Error("Expected error state");
    }
    expect(result.error?.kind).toBe(kind);
    if (status === 429) expect(result.error?.retryAfter).toBe("60");
  });

  it("exposes the full discriminated state union", () => {
    const states: LlmFeedbackState[] = [
      "idle",
      "loading",
      "success",
      "degraded",
      "disabled",
      "unavailable",
      "rate_limited",
      "timeout",
      "error",
    ];
    expect(states).toEqual([
      "idle",
      "loading",
      "success",
      "degraded",
      "disabled",
      "unavailable",
      "rate_limited",
      "timeout",
      "error",
    ]);
  });

  it("sends the exact LlmFeedbackRequest body to the same-origin BFF", async () => {
    const calls = captureFetch(jsonResponse(successPayload));
    await fetchLlmFeedback(baseRequest);
    expect(calls).toHaveLength(1);
    const [url, init] = calls[0];
    expect(url).toBe("/api/llm/feedback");
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init.body).toBe(JSON.stringify(buildLlmFeedbackRequestBody(baseRequest)));
    expect(JSON.parse(String(init.body))).toEqual({
      cv: baseRequest.cv,
      job: baseRequest.job,
      scoreContext: baseRequest.scoreContext,
      markers: baseRequest.markers,
      sessionToggleState: true,
    });
  });
});
