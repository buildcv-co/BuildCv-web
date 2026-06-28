import type { CvDocument, ConfidenceMarker } from "@/lib/job/cv-document";
import type { JobSpec } from "@/lib/job/job-spec";
import type { ComponentScore } from "@/lib/api/types";

export type LlmFeedbackState =
  | "idle"
  | "loading"
  | "success"
  | "degraded"
  | "disabled"
  | "unavailable"
  | "rate_limited"
  | "timeout"
  | "error";

export interface LlmFeedbackSuggestion {
  category: string;
  text: string;
  severity: "low" | "medium" | "high";
}

export interface LlmFeedbackResponse {
  summary: string;
  strengths: string[];
  risks: string[];
  suggestions: LlmFeedbackSuggestion[];
  missingKeywords: string[];
  questions: string[];
  provider: "fake";
  model: "fake-local-v1";
  generatedAt: string;
  degraded: boolean;
}

export interface LlmFeedbackScoreContext {
  score: number;
  components: ComponentScore[];
  version: "2.0.0";
}

export interface LlmFeedbackRequest {
  cv: CvDocument;
  job: JobSpec;
  scoreContext?: LlmFeedbackScoreContext;
  markers?: Record<string, ConfidenceMarker>;
  sessionToggleState?: boolean;
}

export type LlmFeedbackErrorKind =
  | "disabled"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "validationError"
  | "serverError"
  | "network"
  | "malformedResponse"
  | "unknown";

export interface NormalizedLlmFeedbackError {
  status: number;
  kind: LlmFeedbackErrorKind;
  message: string;
  retryAfter?: string;
}

export type LlmFeedbackResult =
  | { state: "success"; data: LlmFeedbackResponse }
  | { state: "degraded"; data: LlmFeedbackResponse; error?: NormalizedLlmFeedbackError }
  | { state: Exclude<LlmFeedbackState, "success" | "degraded" | "idle" | "loading">; error: NormalizedLlmFeedbackError };

export function buildLlmFeedbackRequestBody(request: LlmFeedbackRequest): LlmFeedbackRequest {
  return {
    cv: request.cv,
    job: request.job,
    scoreContext: request.scoreContext,
    markers: request.markers,
    sessionToggleState: request.sessionToggleState,
  };
}

export async function fetchLlmFeedback(
  request: LlmFeedbackRequest,
  options?: { signal?: AbortSignal },
): Promise<LlmFeedbackResult> {
  let response: Response;
  try {
    response = await fetch("/api/llm/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildLlmFeedbackRequestBody(request)),
      cache: "no-store",
      signal: options?.signal,
    });
  } catch {
    return {
      state: "unavailable",
      error: { status: 0, kind: "network", message: "LLM feedback is unavailable." },
    };
  }

  if (response.ok) {
    const data = (await response.json()) as LlmFeedbackResponse;
    return data.degraded ? { state: "degraded", data } : { state: "success", data };
  }

  const error = await normalizeLlmFeedbackError(response);
  return { state: stateFromError(error), error };
}

async function normalizeLlmFeedbackError(response: Response): Promise<NormalizedLlmFeedbackError> {
  const backend = await readBackendError(response);
  const kind = errorKindFromStatus(response.status);
  return {
    status: response.status,
    kind,
    message: backend.detail ?? backend.error ?? defaultMessage(kind),
    retryAfter: response.headers.get("Retry-After") ?? undefined,
  };
}

async function readBackendError(response: Response): Promise<{ error?: string; detail?: string }> {
  try {
    const body = (await response.json()) as { error?: unknown; detail?: unknown; title?: unknown };
    return {
      error: typeof body.error === "string" ? body.error : undefined,
      detail: typeof body.detail === "string" ? body.detail : typeof body.title === "string" ? body.title : undefined,
    };
  } catch {
    return {};
  }
}

function errorKindFromStatus(status: number): LlmFeedbackErrorKind {
  if (status === 400) return "validationError";
  if (status === 403) return "disabled";
  if (status === 429) return "rate_limited";
  if (status === 504) return "timeout";
  if (status === 502 || status === 503) return "unavailable";
  if (status >= 500) return "serverError";
  return "unknown";
}

function stateFromError(
  error: NormalizedLlmFeedbackError,
): Exclude<LlmFeedbackState, "idle" | "loading" | "success" | "degraded"> {
  if (error.kind === "disabled") return "disabled";
  if (error.kind === "rate_limited") return "rate_limited";
  if (error.kind === "timeout") return "timeout";
  if (error.kind === "unavailable" || error.kind === "serverError" || error.kind === "network") return "unavailable";
  return "error";
}

function defaultMessage(kind: LlmFeedbackErrorKind): string {
  if (kind === "disabled") return "LLM feedback is disabled.";
  if (kind === "rate_limited") return "Too many LLM feedback requests.";
  if (kind === "timeout") return "LLM feedback timed out.";
  if (kind === "validationError") return "Invalid LLM feedback request.";
  return "LLM feedback is unavailable.";
}
