import { buildContext } from "./context";
import { buildDedupeKey, shouldDedupe } from "./dedupe";
import type { LogContext, LogEntry, LogLevel } from "./types";

/**
 * error-reporter — captura `Error` + contexto y los reporta via
 * `console.error` (siempre) o via POST a `/api/log` (solo si el
 * caller invoca `enableBffLogging()`). Privacy by design: nada
 * sale del navegador sin consentimiento explícito.
 *
 * Spec: 008-web-observability-web · FR-084/085/091/092/094,
 * NFR-046.
 */

const RECENT_CAP = 100;
const RECENT_ENTRIES: LogEntry[] = [];

/** Listeners que reciben cada LogEntry (usado por el dev overlay). */
type ErrorListener = (entry: LogEntry) => void;
const LISTENERS = new Set<ErrorListener>();

export function onErrorReport(fn: ErrorListener): () => void {
  LISTENERS.add(fn);
  return () => {
    LISTENERS.delete(fn);
  };
}

let bffEnabled = false;

export function enableBffLogging(): void {
  bffEnabled = true;
}

export function isBffLoggingEnabled(): boolean {
  return bffEnabled;
}

/**
 * Test-only reset hook. Exportado para que los tests puedan aislar
 * estado entre casos (BFF flag + RECENT_ENTRIES).
 * NO usar en código de producción.
 */
export function __resetErrorReporterForTests(): void {
  bffEnabled = false;
  RECENT_ENTRIES.length = 0;
  LISTENERS.clear();
}

export interface ReportErrorOptions {
  readonly level?: LogLevel;
  readonly context?: Partial<LogContext>;
  readonly componentStack?: string;
  readonly redact?: (message: string) => string;
}

export function reportError(
  error: Error,
  options: ReportErrorOptions = {},
): LogEntry {
  const now = Date.now();
  const baseCtx = buildContext();
  const ctx: LogContext = { ...baseCtx, ...options.context };
  const message = options.redact ? options.redact(error.message) : error.message;
  const dedupeKey = buildDedupeKey(message, ctx.url);

  if (shouldDedupe(dedupeKey, RECENT_ENTRIES, now)) {
    // Silenciar: no re-loggear, no re-POST. Retornamos un entry
    // marcador para que el caller sepa que el error fue visto.
    return {
      timestamp: new Date(now).toISOString(),
      level: options.level ?? "error",
      message,
      context: ctx,
      dedupeKey,
      dedupeCount: 0,
    };
  }

  const entry: LogEntry = {
    timestamp: new Date(now).toISOString(),
    level: options.level ?? "error",
    message,
    stack: error.stack,
    context: ctx,
    componentStack: options.componentStack,
    dedupeKey,
    dedupeCount: countRecentInWindow(dedupeKey, RECENT_ENTRIES, now) + 1,
  };

  RECENT_ENTRIES.push(entry);
  if (RECENT_ENTRIES.length > RECENT_CAP) {
    RECENT_ENTRIES.shift();
  }

  // Notificar a los listeners (usado por el dev overlay).
  for (const fn of LISTENERS) {
    try {
      fn(entry);
    } catch {
      // Listener errors are non-fatal
    }
  }

  // Console — siempre, formato estructurado.
  console.error(`[BuildCv ${entry.level}] ${entry.message}`, {
    timestamp: entry.timestamp,
    context: entry.context,
    stack: entry.stack,
    componentStack: entry.componentStack,
    dedupeCount: entry.dedupeCount,
  });

  // BFF — solo si el caller lo activó. Fetch silencioso (no romper app).
  if (bffEnabled && typeof fetch !== "undefined") {
    void fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {
      // Fail silently. El console.error de arriba ya quedó.
    });
  }

  return entry;
}

function countRecentInWindow(
  dedupeKey: string,
  recent: ReadonlyArray<LogEntry>,
  now: number,
): number {
  let count = 0;
  for (const entry of recent) {
    if (entry.dedupeKey !== dedupeKey) continue;
    const ts = Date.parse(entry.timestamp);
    if (Number.isNaN(ts)) continue;
    if (now - ts < 60_000) count += 1;
  }
  return count;
}
