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
