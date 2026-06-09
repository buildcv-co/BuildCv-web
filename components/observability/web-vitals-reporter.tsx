"use client";

import { useReportWebVitals } from "@/lib/observability/use-report-web-vitals";

/**
 * WebVitalsReporter — client component vacío que monta el hook
 * `useReportWebVitals`. Se coloca una sola vez en `app/layout.tsx`.
 *
 * Spec: 008-web-observability-web · FR-088, NFR-050.
 */
export function __resetWebVitalsReporterStateForTests(): void {
  // No state, pero exponemos el hook para simetría con otros componentes.
}

export function WebVitalsReporter(): null {
  useReportWebVitals();
  return null;
}
