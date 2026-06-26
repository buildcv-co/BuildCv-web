/**
 * Tipos puros para observabilidad. Cero dependencias runtime.
 * Todos los campos son readonly (inmutables). Compatible con Zod schemas
 * del BFF /api/log.
 *
 * Spec: 008-web-observability-web · data-model.md
 */

export type LogLevel = "error" | "warning" | "info";

export interface LogContext {
  readonly url: string;
  readonly userAgent: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly appVersion: string;
  readonly buildSha: string;
  readonly locale: string;
  /**
   * Tag every observability event with the scoring engine version that
   * produced the request/response (Constitution Art. II). Lets dashboards
   * segment v1 (legacy text) vs v2 (structured) score events. Optional
   * because not every log entry is a score event (e.g. web-vitals, generic
   * errors). When present, MUST be a non-empty SemVer string.
   */
  readonly engineVersion?: string;
}

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly stack?: string;
  readonly context: LogContext;
  readonly componentStack?: string;
  readonly dedupeKey?: string;
  readonly dedupeCount?: number;
  /**
   * Top-level engineVersion tag for score events (Constitution Art. II).
   * Mirrors `context.engineVersion` so dashboards can filter on a single
   * field without traversing the context. Use
   * <see cref="resolveEngineVersion"/> to compute this from a response.
   */
  readonly engineVersion?: string;
}

export type WebVitalName = "LCP" | "FID" | "CLS" | "INP" | "TTFB" | "FCP";

export type WebVitalRating = "good" | "needs-improvement" | "poor";

export type NavigationType =
  | "navigate"
  | "reload"
  | "back-forward"
  | "prerender";

export interface WebVitalsEntry
  extends Omit<LogEntry, "level" | "stack" | "componentStack"> {
  readonly level: "info";
  readonly metric: WebVitalName;
  readonly value: number;
  readonly rating: WebVitalRating;
  readonly id: string;
  readonly navigationType: NavigationType;
}
