import type { LogEntry } from "./types";

/**
 * Dedupe window para errores idénticos. Si el mismo `dedupeKey`
 * aparece 5+ veces en los últimos 60 segundos, `shouldDedupe`
 * retorna `true` y el caller puede silenciar el log.
 *
 * Spec: 008-web-observability-web · FR-094.
 */

export const DEDUPE_WINDOW_MS = 60_000;
export const DEDUPE_MAX = 5;

export function buildDedupeKey(message: string, url: string): string {
  return `${message}::${url}`;
}

export function shouldDedupe(
  dedupeKey: string,
  recent: ReadonlyArray<LogEntry>,
  now: number = Date.now(),
): boolean {
  let count = 0;
  for (const entry of recent) {
    if (entry.dedupeKey !== dedupeKey) continue;
    const ts = Date.parse(entry.timestamp);
    if (Number.isNaN(ts)) continue;
    if (now - ts < DEDUPE_WINDOW_MS) {
      count += 1;
      if (count >= DEDUPE_MAX) return true;
    }
  }
  return false;
}
