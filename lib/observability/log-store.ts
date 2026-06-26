import type { LogEntry } from "./types";

/**
 * In-memory store para el BFF `/api/log`. NO persiste en disco,
 * NO usa DB. FIFO con cap de 100 entradas. Process restart =
 * store vacío (privacy by design: nada de CV/job persiste).
 *
 * Spec: 008-web-observability-web · NFR-045, FR-090.
 * Engine-version tagging: 021-structured-cv-import-and-job-input · PR 5d
 * (Constitution Art. II seal).
 */

const MAX_ENTRIES = 100;

/** Default engine version when the response omits the field (legacy v1 clients). */
export const LEGACY_ENGINE_VERSION = "1.0.0";

const STORE: LogEntry[] = [];

/**
 * Pure helper: resolves the `engineVersion` string for a score response so
 * observability events never carry `undefined`. v2 responses declare
 * `"2.0.0"`; legacy v1 responses (no `engineVersion` field) fall back to
 * `"1.0.0"` so dashboards can segment by engine version.
 */
export function resolveEngineVersion(response: {
  readonly engineVersion?: string;
}): string {
  return response.engineVersion ?? LEGACY_ENGINE_VERSION;
}

export const logStore = {
  add(entry: LogEntry): void {
    STORE.push(entry);
    if (STORE.length > MAX_ENTRIES) {
      STORE.shift();
    }
  },

  getAll(): ReadonlyArray<LogEntry> {
    return [...STORE];
  },

  size(): number {
    return STORE.length;
  },

  clear(): void {
    STORE.length = 0;
  },
} as const;
