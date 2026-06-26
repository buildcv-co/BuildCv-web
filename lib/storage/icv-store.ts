import type { CvDocument, Draft, DraftSummary } from "@/lib/editor/types";
import { DraftSchema } from "@/lib/editor/schema";
import { cvDocumentSchema } from "@/lib/editor/schema/jsonresume";
import { DraftNotFoundError, QuotaExceededError } from "./errors";

export interface ICvStore {
  save(draft: Draft): Promise<void>;
  load(id: string): Promise<Draft | null>;
  list(): Promise<ReadonlyArray<DraftSummary>>;
  clear(id: string): Promise<void>;
  clearAll(): Promise<void>;
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void;
  /**
   * Persiste un `CvDocument` JSON Resume (PR 4a+) bajo
   * `buildcv:cv:{id}`. El path paralelo a `save(draft)` — la v1 sigue
   * viva hasta PR 4e migrar el editor completamente.
   *
   * El documento se valida contra `cvDocumentSchema` antes de
   * serializar; un documento inválido rechaza con `Error` (no se
   * persiste basura). En load, la misma validación descarta entradas
   * corruptas devolviendo `null` (mismo contrato que `load(draft)`).
   */
  saveCv(id: string, document: CvDocument): Promise<void>;
  loadCv(id: string): Promise<CvDocument | null>;
}

export class LocalStorageCvStore implements ICvStore {
  private readonly prefix = "buildcv:draft:";
  private readonly cvPrefix = "buildcv:cv:";
  private readonly quotaHandlers: Array<(err: QuotaExceededError) => void> = [];

  private keyFor(id: string): string {
    return `${this.prefix}${id}`;
  }

  private cvKeyFor(id: string): string {
    return `${this.cvPrefix}${id}`;
  }

  async save(draft: Draft): Promise<void> {
    assertValidId(draft.id);
    const validated = validateDraft(draft);
    if (!validated) {
      throw new Error("Draft failed schema validation");
    }
    const serialized = JSON.stringify(validated);
    try {
      localStorage.setItem(this.keyFor(draft.id), serialized);
    } catch (err) {
      if (isQuotaError(err)) {
        const handlerErr = new QuotaExceededError(
          serialized.length,
          estimateQuota(),
        );
        for (const h of this.quotaHandlers) h(handlerErr);
        throw handlerErr;
      }
      throw err;
    }
  }

  async load(id: string): Promise<Draft | null> {
    assertValidId(id);
    const raw = localStorage.getItem(this.keyFor(id));
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    return validateDraft(parsed);
  }

  async saveCv(id: string, document: CvDocument): Promise<void> {
    assertValidId(id);
    const validated = validateCvDocument(document);
    if (validated === null) {
      throw new Error("CvDocument failed schema validation");
    }
    const serialized = JSON.stringify(validated);
    try {
      localStorage.setItem(this.cvKeyFor(id), serialized);
    } catch (err) {
      if (isQuotaError(err)) {
        const handlerErr = new QuotaExceededError(
          serialized.length,
          estimateQuota(),
        );
        for (const h of this.quotaHandlers) h(handlerErr);
        throw handlerErr;
      }
      throw err;
    }
  }

  async loadCv(id: string): Promise<CvDocument | null> {
    assertValidId(id);
    const raw = localStorage.getItem(this.cvKeyFor(id));
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    return validateCvDocument(parsed);
  }

  async list(): Promise<ReadonlyArray<DraftSummary>> {
    const summaries: DraftSummary[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(this.prefix)) continue;
      const raw = localStorage.getItem(k);
      if (raw === null) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const draft = validateDraft(parsed);
      if (!draft) continue;
      const id = k.slice(this.prefix.length);
      summaries.push({
        id,
        lastSavedAt: draft.lastSavedAt,
        sectionCount: draft.document.sections.length,
        entityCount: draft.document.entities.length,
      });
    }
    summaries.sort((a, b) => (a.lastSavedAt < b.lastSavedAt ? 1 : -1));
    return summaries;
  }

  async clear(id: string): Promise<void> {
    assertValidId(id);
    localStorage.removeItem(this.keyFor(id));
  }

  async clearAll(): Promise<void> {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(this.prefix)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  }

  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void {
    this.quotaHandlers.push(handler);
    return () => {
      const idx = this.quotaHandlers.indexOf(handler);
      if (idx >= 0) this.quotaHandlers.splice(idx, 1);
    };
  }
}

function assertValidId(id: string): void {
  if (typeof id !== "string" || id.length === 0 || id.length > 50) {
    throw new DraftNotFoundError(id);
  }
}

function validateDraft(parsed: unknown): Draft | null {
  const result = DraftSchema.safeParse(parsed);
  if (!result.success) return null;
  return result.data as Draft;
}

function validateCvDocument(parsed: unknown): CvDocument | null {
  const result = cvDocumentSchema.safeParse(parsed);
  if (!result.success) return null;
  return result.data;
}

function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException && err.name === "QuotaExceededError"
  );
}

function estimateQuota(): number {
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) used += (localStorage.getItem(k) ?? "").length + k.length;
    }
    return Math.max(0, 5 * 1024 * 1024 - used);
  } catch {
    return 0;
  }
}
