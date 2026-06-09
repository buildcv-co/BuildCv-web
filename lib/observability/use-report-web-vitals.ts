"use client";

import { useEffect } from "react";
import { onLCP, onINP, onCLS, onTTFB, onFCP } from "web-vitals";
import type { Metric } from "web-vitals";
import type { WebVitalName, WebVitalRating } from "./types";

/**
 * useReportWebVitals — hook que monta los reporters de web-vitals
 * (LCP, INP, CLS, TTFB, FCP) y loggea a `console.info` con formato
 * estructurado. Privacy by design: nada sale del navegador.
 *
 * Spec: 008-web-observability-web · FR-088, NFR-050.
 */

const SEEN_IDS = new Set<string>();

export function __resetWebVitalsStateForTests(): void {
  SEEN_IDS.clear();
}

const KNOWN_NAMES: ReadonlySet<WebVitalName> = new Set([
  "LCP",
  "FID",
  "CLS",
  "INP",
  "TTFB",
  "FCP",
]);

function isWebVitalName(name: string): name is WebVitalName {
  return KNOWN_NAMES.has(name as WebVitalName);
}

function handleMetric(metric: Metric): void {
  if (!isWebVitalName(metric.name)) return;
  if (SEEN_IDS.has(metric.id)) return;
  SEEN_IDS.add(metric.id);

  const rating: WebVitalRating = metric.rating;
  // Format: [BuildCv WebVital] name=LCP value=1234 rating=good id=...
  const line =
    `[BuildCv WebVital] name=${metric.name}` +
    ` value=${formatValue(metric.value)}` +
    ` rating=${rating}` +
    ` id=${metric.id}`;
  console.info(line);
}

function formatValue(v: number): string {
  if (Number.isInteger(v)) return String(v);
  // Truncar a 4 decimales para legibilidad (CLS puede ser 0.0123)
  return v.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function useReportWebVitals(): void {
  useEffect(() => {
    onLCP(handleMetric);
    onINP(handleMetric);
    onCLS(handleMetric);
    onTTFB(handleMetric);
    onFCP(handleMetric);
  }, []);
}
