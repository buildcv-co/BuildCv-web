import type { DiffHandoff } from "./types";

export const DIFF_HANDOFF_KEY = "buildcv:diff-handoff";
export const MAX_DIFF_HANDOFF_AGE_MS = 60 * 60 * 1000; // 1 hora

export class AdaptationExpiredError extends Error {
  readonly ageMs: number;
  constructor(ageMs: number) {
    super(
      `ADAPTATION_EXPIRED: la adaptación tiene ${Math.round(ageMs / 60_000)} minutos (máx 60).`,
    );
    this.name = "AdaptationExpiredError";
    this.ageMs = ageMs;
  }
}

export class AdaptationStorageError extends Error {
  constructor(message: string) {
    super(`ADAPTATION_STORAGE_ERROR: ${message}`);
    this.name = "AdaptationStorageError";
  }
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDiffHandoffShape(value: unknown): value is DiffHandoff {
  if (!isStringRecord(value)) return false;
  if (typeof value.originalText !== "string") return false;
  if (typeof value.adaptedText !== "string") return false;
  if (typeof value.adaptTraceId !== "string") return false;
  if (typeof value.timestamp !== "string") return false;
  // validation se valida con isAdaptationResult del backend; aquí solo requerimos shape básico
  if (!isStringRecord(value.validation)) return false;
  return true;
}

/** Lee el handoff crudo (sin validar expiración). Devuelve null si no hay. */
export function readDiffHandoff(): DiffHandoff | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(DIFF_HANDOFF_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDiffHandoffShape(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Lee el handoff y lanza `AdaptationExpiredError` si tiene >1 h. */
export function readValidDiffHandoff(): DiffHandoff {
  const handoff = readDiffHandoff();
  if (handoff === null) {
    throw new AdaptationStorageError("no handoff found");
  }
  const atMs = Date.parse(handoff.timestamp);
  if (Number.isNaN(atMs)) {
    throw new AdaptationStorageError("invalid timestamp");
  }
  const ageMs = Date.now() - atMs;
  if (ageMs > MAX_DIFF_HANDOFF_AGE_MS) {
    throw new AdaptationExpiredError(ageMs);
  }
  if (ageMs < -60_000) {
    // reloj del cliente desincronizado hacia el futuro; aceptamos igual
    return handoff;
  }
  return handoff;
}

/** Escribe el handoff en sessionStorage. */
export function writeDiffHandoff(handoff: DiffHandoff): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DIFF_HANDOFF_KEY, JSON.stringify(handoff));
}

/** Elimina el handoff de sessionStorage. */
export function clearDiffHandoff(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DIFF_HANDOFF_KEY);
}
