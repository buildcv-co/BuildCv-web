import { BACKEND_URL } from "@/lib/api/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_PATH = "/api/v1/llm/feedback";

export async function POST(request: Request): Promise<Response> {
  let body: string;
  try {
    body = await request.text();
    JSON.parse(body);
  } catch {
    return json({ state: "error", error: { kind: "validationError", detail: "Invalid JSON" } }, 400);
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${BACKEND_URL}${BACKEND_PATH}`, {
      method: "POST",
      headers: buildBackendHeaders(),
      body,
      cache: "no-store",
    });
  } catch {
    return json({ state: "unavailable", error: { kind: "unavailable", detail: "LLM backend unavailable" } }, 502);
  }

  if (backendResponse.ok) {
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" },
    });
  }

  const status = mapStatus(backendResponse.status);
  const headers = sanitizedResponseHeaders(backendResponse);
  return json(
    {
      state: stateFromBackendStatus(backendResponse.status),
      error: {
        kind: kindFromBackendStatus(backendResponse.status),
        detail: sanitizedDetail(backendResponse.status),
      },
    },
    status,
    headers,
  );
}

function buildBackendHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const bffKey = process.env.BFF_API_KEY;
  if (bffKey) headers["X-BFF-Key"] = bffKey;
  return headers;
}

function mapStatus(status: number): number {
  if (status >= 500 && status !== 504) return 502;
  return status;
}

function stateFromBackendStatus(status: number): string {
  if (status === 403) return "disabled";
  if (status === 429) return "rate_limited";
  if (status === 504) return "timeout";
  if (status >= 500) return "unavailable";
  return "error";
}

function kindFromBackendStatus(status: number): string {
  if (status === 400) return "validationError";
  if (status === 403) return "disabled";
  if (status === 429) return "rate_limited";
  if (status === 504) return "timeout";
  if (status >= 500) return "serverError";
  return "unknown";
}

function sanitizedDetail(status: number): string {
  if (status === 400) return "Invalid LLM feedback request";
  if (status === 403) return "LLM feedback disabled";
  if (status === 429) return "LLM feedback rate limit exceeded";
  if (status === 504) return "LLM feedback timeout";
  return "LLM feedback unavailable";
}

function sanitizedResponseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) headers["Retry-After"] = retryAfter;
  return headers;
}

function json(body: unknown, status: number, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
  });
}
