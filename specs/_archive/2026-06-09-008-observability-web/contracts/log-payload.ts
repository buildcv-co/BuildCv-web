// Contracts: 008-web-observability-web
// Tipos puros. NO son runtime exports; son guías de implementación.

// lib/observability/types.ts
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
export type NavigationType = "navigate" | "reload" | "back-forward" | "prerender";

export interface WebVitalsEntry extends Omit<LogEntry, "level" | "stack" | "componentStack"> {
  readonly level: "info";
  readonly metric: WebVitalName;
  readonly value: number;
  readonly rating: WebVitalRating;
  readonly id: string;
  readonly navigationType: NavigationType;
}

// app/api/log/route.ts (Zod schemas)
export type LogContextZ = {
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  appVersion: string;
  buildSha: string;
  locale: string;
};

export type LogEntryZ = {
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  stack?: string;
  context: LogContextZ;
  componentStack?: string;
  dedupeKey?: string;
  dedupeCount?: number;
};
