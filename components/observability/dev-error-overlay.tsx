"use client";

import { useEffect, useState, type ReactNode } from "react";
import { copy } from "@/lib/copy/es";

/**
 * DevErrorOverlay — panel flotante que muestra los últimos 20 errores
 * capturados por `reportError`. SOLO visible en dev mode
 * (`process.env.NODE_ENV === "development"`), doble-checked con un
 * test-only override.
 *
 * Privacy by design: los errores se mantienen en `window.__buildcv_errors`
 * (memoria del cliente). NO se envían a third-party. El BFF `/api/log`
 * es opcional.
 *
 * Spec: 008-web-observability-web · FR-089, FR-093, NFR-044, NFR-049.
 */

const MAX_ENTRIES = 20;
const GLOBAL_KEY = "__buildcv_errors";

export interface DevErrorEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly message: string;
  readonly stack?: string;
  readonly level: "error" | "warning" | "info";
}

type Listener = (entries: ReadonlyArray<DevErrorEntry>) => void;
const LISTENERS = new Set<Listener>();
let envOverride: string | null = null;

export function __setDevOverlayEnvForTests(value: string): void {
  envOverride = value;
}

function getDevEnv(): string {
  if (envOverride !== null) return envOverride;
  if (typeof process !== "undefined" && process.env) {
    return process.env["NODE_ENV"] ?? "";
  }
  return "";
}

function readStore(): DevErrorEntry[] {
  if (typeof window === "undefined") return [];
  const w = window as unknown as { [GLOBAL_KEY]?: DevErrorEntry[] };
  if (!Array.isArray(w[GLOBAL_KEY])) return [];
  return w[GLOBAL_KEY]!;
}

function writeStore(entries: ReadonlyArray<DevErrorEntry>): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { [GLOBAL_KEY]?: DevErrorEntry[] };
  w[GLOBAL_KEY] = [...entries];
}

function emit(entries: ReadonlyArray<DevErrorEntry>): void {
  for (const fn of LISTENERS) {
    fn(entries);
  }
}

export function onDevError(fn: Listener): () => void {
  LISTENERS.add(fn);
  return () => {
    LISTENERS.delete(fn);
  };
}

export function pushDevError(entry: DevErrorEntry): void {
  if (typeof window === "undefined") return;
  const current = readStore();
  const next = [...current, entry];
  while (next.length > MAX_ENTRIES) {
    next.shift();
  }
  writeStore(next);
  emit(next);
}

export function clearDevErrors(): void {
  writeStore([]);
  emit([]);
}

export function getDevErrors(): ReadonlyArray<DevErrorEntry> {
  return readStore();
}

export function DevErrorOverlay(): ReactNode {
  const isDev = getDevEnv() === "development";

  const [entries, setEntries] = useState<ReadonlyArray<DevErrorEntry>>(() =>
    readStore(),
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isDev) return;
    const unsubscribe = onDevError((next) => {
      setEntries(next);
    });
    return unsubscribe;
  }, [isDev]);

  if (!isDev) return null;
  if (dismissed) return null;

  const handleCopy = async (entry: DevErrorEntry): Promise<void> => {
    if (typeof navigator === "undefined") return;
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(entry.stack ?? entry.message);
    } catch {
      // Silenciar: el copy no es crítico
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-label={copy.observability.devOverlay.title}
      className="fixed bottom-4 right-4 z-50 max-h-[80vh] w-96 overflow-auto rounded-lg border border-line bg-surface/95 p-3 font-mono text-xs text-ink shadow-lg backdrop-blur"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <strong className="block text-sm">
          {copy.observability.devOverlay.title}
        </strong>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={copy.observability.devOverlay.dismissLabel}
          className="rounded px-2 py-1 text-faint hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copy.observability.devOverlay.dismissLabel}
        </button>
      </div>
      <p className="mb-3 text-[10px] text-faint">
        {copy.observability.devOverlay.disclaimer}
      </p>
      {entries.length === 0 ? (
        <p className="text-faint">{copy.observability.devOverlay.emptyHint}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="rounded border border-line/50 bg-bg/40 p-2"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-medium">{e.message}</span>
                <button
                  type="button"
                  onClick={() => void handleCopy(e)}
                  className="rounded px-2 py-0.5 text-[10px] text-faint hover:bg-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {copy.observability.devOverlay.copyStackLabel}
                </button>
              </div>
              <p className="text-[10px] text-faint">{e.timestamp}</p>
              {e.stack ? (
                <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-faint">
                  {e.stack}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
