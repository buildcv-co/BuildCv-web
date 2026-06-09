import type { LogEntry } from "./types";

/**
 * In-memory store para el BFF `/api/log`. NO persiste en disco,
 * NO usa DB. FIFO con cap de 100 entradas. Process restart =
 * store vacío (privacy by design: nada de CV/job persiste).
 *
 * Spec: 008-web-observability-web · NFR-045, FR-090.
 */

const MAX_ENTRIES = 100;

const STORE: LogEntry[] = [];

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
