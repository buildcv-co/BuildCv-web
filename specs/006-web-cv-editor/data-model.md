# Data Model: 006-web-cv-editor

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Research:** [./research.md](./research.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
> **Convención del proyecto:** TypeScript strict, snake_case prohibido, kebab-case en archivos, tipos en inglés, copy en español (en `lib/copy/es.ts`).
>
> **Source of truth:** `lib/editor/types.ts`, `lib/editor/schema/index.ts`, `lib/storage/icv-store.ts`, `lib/storage/index.ts`. Verificado contra el shipped code (commit 748611d).

---

## Overview

Este documento define los tipos TypeScript centrales de la feature. Todos son **inmutables** (frozen objects / `Readonly<>`) y se validan en runtime con **Zod v3**.

```
CvDocument (in-memory, lo que edita el usuario)
    ↓ save
Draft (en LocalStorageCvStore: localStorage)
    ↓ export
Markdown (lo que 004-export-pdf consume)
```

---

## Tipos centrales (en `lib/editor/types.ts`)

### `CvDocument`

El documento completo que edita el usuario. NO es un doc Tiptap; es un objeto estructurado con 8 secciones.

```typescript
export interface CvDocument {
  readonly id: string;                  // `doc_` + 8 chars random (Math.random().toString(36).slice(2, 10))
  readonly version: string;             // "0.5.0"
  readonly locale: "es-CO" | "en-US";   // default "es-CO"
  readonly sections: ReadonlyArray<CvSection>;
  readonly entities: ReadonlyArray<EntityRef>;
  readonly createdAt: string;           // ISO 8601
  readonly updatedAt: string;           // ISO 8601
  readonly source: "imported" | "blank" | "pasted";
}
```

### `CvSection` (discriminated union de 8 tipos)

```typescript
export type CvSection =
  | ProfileSection
  | ExperienceSection
  | EducationSection
  | SkillsSection
  | ProjectsSection
  | CertificationsSection
  | LanguagesSection
  | OtherSection;
```

Cada sección implementa:

```typescript
interface CvSectionBase {
  readonly id: string;                  // ej. "sec_profile"
  readonly kind: CvSectionKind;
  readonly source: "imported" | "user-typed";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type CvSectionKind =
  | "profile"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "other";
```

#### `ProfileSection`

```typescript
export interface ProfileSection extends CvSectionBase {
  readonly kind: "profile";
  readonly fullName: string;
  readonly headline: string;            // ej. "Backend Developer"
  readonly email: string;
  readonly phone: string;
  readonly location: string;
  readonly links: ReadonlyArray<{ readonly label: string; readonly url: string }>;
  readonly summary: string;             // párrafo libre
}
```

#### `ExperienceSection`

```typescript
export interface ExperienceSection extends CvSectionBase {
  readonly kind: "experience";
  readonly role: string;                // ej. "Backend Developer"
  readonly company: string;
  readonly startDate: string;           // "YYYY-MM" | "YYYY"
  readonly endDate: string | null;      // null = "actualidad"
  readonly location: string;
  readonly bullets: ReadonlyArray<string>;
  readonly techStack: ReadonlyArray<string>;
}
```

#### `EducationSection`

```typescript
export interface EducationSection extends CvSectionBase {
  readonly kind: "education";
  readonly degree: string;
  readonly institution: string;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly location: string;
  readonly description: string;
}
```

#### `SkillsSection`

```typescript
export interface SkillsSection extends CvSectionBase {
  readonly kind: "skills";
  readonly groups: ReadonlyArray<{
    readonly category: string;          // ej. "Backend", "Frontend", "Cloud"
    readonly items: ReadonlyArray<string>;
  }>;
}
```

#### `ProjectsSection`

```typescript
export interface ProjectsSection extends CvSectionBase {
  readonly kind: "projects";
  readonly items: ReadonlyArray<{
    readonly name: string;
    readonly description: string;
    readonly techStack: ReadonlyArray<string>;
    readonly link: string | null;
  }>;
}
```

#### `CertificationsSection`

```typescript
export interface CertificationsSection extends CvSectionBase {
  readonly kind: "certifications";
  readonly items: ReadonlyArray<{
    readonly name: string;              // ej. "AWS Solutions Architect"
    readonly issuer: string;
    readonly date: string;              // "YYYY-MM"
    readonly credentialId: string | null;
  }>;
}
```

#### `LanguagesSection`

```typescript
export interface LanguagesSection extends CvSectionBase {
  readonly kind: "languages";
  readonly items: ReadonlyArray<{
    readonly language: string;
    readonly level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";
  }>;
}
```

#### `OtherSection`

Catch-all para secciones no clasificadas (ej. "Publicaciones", "Voluntariado", "Intereses").

```typescript
export interface OtherSection extends CvSectionBase {
  readonly kind: "other";
  readonly title: string;               // ej. "Publicaciones"
  readonly content: string;             // markdown libre
}
```

### `EntityRef`

Una entidad rastreable en el documento (skill, certificación, empresa, cargo, fecha, métrica).

```typescript
export type EntityKind =
  | "skill"
  | "certification"
  | "company"
  | "role"
  | "date"
  | "metric"
  | "other";

export type EntitySource = "imported" | "user-typed";
export type EntityConfidence = "high" | "low";

export interface EntityRef {
  readonly id: string;                  // `ent_` + 8 chars random
  readonly kind: EntityKind;
  readonly value: string;               // el token tal como aparece
  readonly normalized: string;          // lowercase + trim (para matching)
  readonly source: EntitySource;
  readonly confidence: EntityConfidence;
  readonly sectionId: string;           // id de la CvSection que la contiene
  readonly firstSeenAt: string;         // ISO 8601
}
```

### `Draft`

Lo que persiste `LocalStorageCvStore`. Contiene el `CvDocument` + metadata.

```typescript
export interface Draft {
  readonly id: string;                  // "default" en v0.5 (single-borrador)
  readonly document: CvDocument;
  readonly jobText: string;             // la vacante (para re-puntuar sin pedirla de nuevo)
  readonly scoreHistory: ReadonlyArray<ScoreHistoryEntry>;
  readonly lastSavedAt: string;
  readonly engineVersions: EngineVersions;
}

export interface ScoreHistoryEntry {
  readonly score: number;               // 0-100
  readonly band: string;                // ej. "Strong"
  readonly engineVersion: string;       // SemVer
  readonly at: string;                  // ISO 8601
}

export interface EngineVersions {
  readonly editor: string;              // "0.5.0"
  readonly score: string;               // "1.0.0"
}

export interface DraftSummary {
  readonly id: string;
  readonly lastSavedAt: string;
  readonly sectionCount: number;
  readonly entityCount: number;
}
```

---

## Zod schemas (en `lib/editor/schema/`)

Cada sección tiene un Zod schema en su propio archivo. Patrón:

```typescript
// lib/editor/schema/profile.ts
import { z } from "zod";

export const ProfileSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("profile"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  fullName: z.string().min(1).max(200),
  headline: z.string().max(200),
  email: z.string().max(200),     // NOT .email() — el editor no obliga formato, el backend valida
  phone: z.string().max(50),
  location: z.string().max(200),
  links: z.array(
    z.object({
      label: z.string().min(1).max(50),
      url: z.string().max(500),
    }),
  ).max(10),
  summary: z.string().max(2000),
});
```

Las 8 secciones siguen el mismo patrón. `CvDocumentSchema` (en `lib/editor/schema/index.ts`):

```typescript
export const CvSectionSchema = z.discriminatedUnion("kind", [
  ProfileSectionSchema,
  ExperienceSectionSchema,
  EducationSectionSchema,
  SkillsSectionSchema,
  ProjectsSectionSchema,
  CertificationsSectionSchema,
  LanguagesSectionSchema,
  OtherSectionSchema,
]);

export const EntityRefSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.enum(["skill", "certification", "company", "role", "date", "metric", "other"]),
  value: z.string().min(1).max(200),
  normalized: z.string().min(1).max(200),
  source: z.enum(["imported", "user-typed"]),
  confidence: z.enum(["high", "low"]),
  sectionId: z.string().min(1).max(50),
  firstSeenAt: z.string().datetime(),
});

export const CvDocumentSchema = z.object({
  id: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  locale: z.enum(["es-CO", "en-US"]),
  sections: z.array(CvSectionSchema).max(8),
  entities: z.array(EntityRefSchema).max(500),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  source: z.enum(["imported", "blank", "pasted"]),
});

export const ScoreHistoryEntrySchema = z.object({
  score: z.number().int().min(0).max(100),
  band: z.string().min(1).max(50),
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  at: z.string().datetime(),
});

export const EngineVersionsSchema = z.object({
  editor: z.string().regex(/^\d+\.\d+\.\d+$/),
  score: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const DraftSchema = z.object({
  id: z.string().min(1).max(50),
  document: CvDocumentSchema,
  jobText: z.string().max(20_000),
  scoreHistory: z.array(ScoreHistoryEntrySchema).max(20),
  lastSavedAt: z.string().datetime(),
  engineVersions: EngineVersionsSchema,
});

const ISO_EPOCH = new Date(0).toISOString();

export const BLANK_DOCUMENT: CvDocument = Object.freeze({
  id: "blank",
  version: "0.5.0",
  locale: "es-CO",
  sections: [],
  entities: [],
  createdAt: ISO_EPOCH,
  updatedAt: ISO_EPOCH,
  source: "blank",
}) as CvDocument;
```

---

## `ICvStore` port (en `lib/storage/icv-store.ts`)

Puerto frontend (NO backend) declarado en la Constitución Art. VI v1.1.0.

```typescript
export class QuotaExceededError extends Error {
  constructor(public readonly bytesRequested: number, public readonly bytesAvailable: number) {
    super(`QUOTA_EXCEEDED: solicitados ${bytesRequested} bytes, disponibles ${bytesAvailable}.`);
    this.name = "QuotaExceededError";
  }
}

export class DraftNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`DRAFT_NOT_FOUND: id "${id}" con formato inválido.`);
    this.name = "DraftNotFoundError";
  }
}

export interface ICvStore {
  /** Persiste un Draft. Sobrescribe si ya existe uno con el mismo id.
   *  @throws {QuotaExceededError} si `localStorage.setItem` lanza `DOMException.name === "QuotaExceededError"`.
   *  @throws {Error} si el Draft no pasa `DraftSchema.safeParse`. */
  save(draft: Draft): Promise<void>;

  /** Carga un Draft por id. Retorna null si no existe.
   *  @throws {DraftNotFoundError} si el id tiene formato inválido.
   *  Retorna null si el JSON.parse falla o si el Draft no pasa `DraftSchema.safeParse`. */
  load(id: string): Promise<Draft | null>;

  /** Lista summaries de todos los Drafts persistidos, ordenados por `lastSavedAt` desc. */
  list(): Promise<ReadonlyArray<DraftSummary>>;

  /** Elimina un Draft por id. No-op si no existe. */
  clear(id: string): Promise<void>;

  /** Elimina TODOS los Drafts. Usado por "Limpiar borrador" (FR-040b). */
  clearAll(): Promise<void>;

  /** Suscribe a eventos de quota exceeded.
   *  @returns función de unsubscribe. */
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void;
}
```

### `LocalStorageCvStore` (única implementación shipped)

```typescript
// lib/storage/icv-store.ts
export class LocalStorageCvStore implements ICvStore {
  private readonly prefix = "buildcv:draft:";
  private readonly quotaHandlers: Array<(err: QuotaExceededError) => void> = [];

  private keyFor(id: string): string { return `${this.prefix}${id}`; }

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
    try { parsed = JSON.parse(raw); } catch { return null; }
    return validateDraft(parsed);
  }

  async list(): Promise<ReadonlyArray<DraftSummary>> { /* itera localStorage, filtra por prefix, devuelve summaries ordenados por lastSavedAt desc */ }
  async clear(id: string): Promise<void> { assertValidId(id); localStorage.removeItem(this.keyFor(id)); }
  async clearAll(): Promise<void> { /* itera localStorage, elimina todos los del prefix */ }
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void { /* push handler, retorna unsubscribe */ }
}
```

### Factory (`lib/storage/index.ts`)

```typescript
import { LocalStorageCvStore, type ICvStore } from "./icv-store";

let cached: ICvStore | null = null;

export async function getCvStore(): Promise<ICvStore> {
  if (cached) return cached;
  const candidate = new LocalStorageCvStore();
  if (isLocalStorageAvailable()) {
    cached = candidate;
    return cached;
  }
  throw new Error("LocalStorage unavailable");
}

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const probe = "__buildcv_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
```

### `IndexedDbCvStore` — DEUDA TÉCNICA (no shipped en v0.5)

`IndexedDbCvStore` queda como **deuda técnica** para v1. La interfaz `ICvStore` está diseñada para aceptar una segunda implementación sin cambios en `useDraft` ni en `Editor`. **No existe como código shipped** (verificado: `lib/storage/` contiene solo `icv-store.ts` con `LocalStorageCvStore`).

Cuando se implemente en v1, seguirá el patrón:

```typescript
// PSEUDO-CODE para v1 — NO SHIPPED en v0.5
import { openDB, type IDBPDatabase } from "idb";

export class IndexedDbCvStore implements ICvStore {
  private readonly dbName = "buildcv-drafts";
  private readonly storeName = "drafts";
  private readonly version = 1;

  private async openDb(): Promise<IDBPDatabase> { /* openDB con upgrade */ }
  async save(draft: Draft): Promise<void> { /* validated = DraftSchema.parse(draft); db.put(...) */ }
  async load(id: string): Promise<Draft | null> { /* db.get(...) + validateDraft */ }
  async list(): Promise<ReadonlyArray<DraftSummary>> { /* cursor en object store */ }
  async clear(id: string): Promise<void> { /* db.delete(...) */ }
  async clearAll(): Promise<void> { /* db.clear() */ }
  onQuotaExceeded(handler) { /* IndexedDB rara vez lanza quota; no-op */ }
}
```

El factory podría entonces elegir adapter según prueba de cuota.

---

## Hooks (en `lib/editor/`)

### `useDraft()`

```typescript
// lib/editor/use-draft.ts
export function useDraft(): UseDraftResult {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const store = await getCvStore();
      const result = await store.load("default");
      setDraft(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (next: Draft) => {
    setIsSaving(true);
    setError(null);
    try {
      const store = await getCvStore();
      await store.save(next);
      setDraft(next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const clear = useCallback(async () => {
    setError(null);
    try {
      const store = await getCvStore();
      await store.clear("default");
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => { void load(); }, 0);
    return () => { clearTimeout(handle); };
  }, [load]);

  return { draft, isLoading, isSaving, error, save, clear, reload: load };
}
```

**No existe `useCvDocument()`** con Tiptap en v0.5. La sincronización entre el `CvDocument` en memoria y el editor de UI se hace directamente en el componente `Editor` mediante `useState<CvDocument>` + `useCallback(updateSection)`.

---

## Funciones puras (en `lib/editor/markdown/`)

### `serializeCvDocument`

```typescript
// lib/editor/markdown/serialize.ts
export function serializeCvDocument(doc: CvDocument): string {
  // Itera las 8 secciones en orden canónico.
  // Emite heading `## <Sección>` + contenido específico por kind.
  // Omite secciones vacías (no exporta headings vacíos).
  // Output determinista: mismo input → mismo string.
}
```

### `parseCvDocument`

```typescript
// lib/editor/markdown/parse-cv.ts
export interface ParseContext {
  /** Set de tokens normalizados (lowercase + trim) del CV importado. */
  readonly originalEntities: ReadonlySet<string>;
  /** Set de `EntityRef.value` que el usuario tipeó explícitamente. */
  readonly userTypedEntities: ReadonlySet<string>;
}

export function parseCvDocument(
  md: string,
  ctx?: ParseContext,
): CvDocument {
  // Parser regex hand-rolled:
  //   - Reconoce headings `## Perfil`, `## Experiencia`, etc.
  //   - Mapea a CvSectionKind.
  //   - Extrae bullets, fechas, niveles de idioma.
  //   - Genera un CvDocument con id random, version "0.5.0", sections[], entities[].
  //   - Valida con CvDocumentSchema.safeParse; si falla, lanza RoundTripMismatchError.
}
```

### `roundtrip()`

```typescript
// lib/editor/markdown/roundtrip.ts
export function roundtrip(doc: CvDocument, ctx?: ParseContext): {
  ok: true; markdown: string;
} | {
  ok: false; error: "ENTITY_NOT_ALLOWED" | "ROUNDTRIP_MISMATCH"; details: string;
} {
  const md = serializeCvDocument(doc);
  const reparsed = parseCvDocument(md, ctx);
  if (!deepEqual(doc, reparsed)) {
    return { ok: false, error: "ROUNDTRIP_MISMATCH", details: "..." };
  }
  return { ok: true, markdown: md };
}
```

---

## Resumen de archivos shipped

| Path | Líneas (aprox.) | Exports principales |
|---|---|---|
| `lib/editor/types.ts` | 180 | `CvDocument`, `CvSection` (8), `EntityRef`, `Draft`, `DraftSummary` |
| `lib/editor/schema/index.ts` | 90 | `CvSectionSchema`, `CvDocumentSchema`, `DraftSchema`, `BLANK_DOCUMENT` |
| `lib/editor/schema/{8 archivos}.ts` | 25-50 c/u | `ProfileSectionSchema`...`OtherSectionSchema` |
| `lib/storage/icv-store.ts` | 140 | `ICvStore`, `LocalStorageCvStore`, `QuotaExceededError`, `DraftNotFoundError` |
| `lib/storage/index.ts` | 40 | `getCvStore`, `BLANK_DOCUMENT` (re-export) |
| `lib/editor/use-draft.ts` | 75 | `useDraft`, `UseDraftResult` |
| `lib/editor/markdown/serialize.ts` | 200 | `serializeCvDocument` |
| `lib/editor/markdown/parse-cv.ts` | 500 | `parseCvDocument` |
| `lib/editor/markdown/parse.ts` | 80 | helpers de parse por sección |
| `lib/editor/markdown/roundtrip.ts` | 80 | `roundtrip` |
| `lib/editor/errors.ts` | 30 | `RoundTripMismatchError` |

**Total shipped**: ~1 700 líneas de tipos y código de soporte (sin contar los 8 `SectionNode` UI ni los tests).

---

## Errores tipados (en `lib/editor/errors.ts` y `lib/storage/errors.ts`)

```typescript
// lib/editor/errors.ts
export class RoundTripMismatchError extends Error {
  constructor(public readonly details: string) {
    super(`ROUNDTRIP_MISMATCH: ${details}`);
    this.name = "RoundTripMismatchError";
  }
}

// lib/storage/errors.ts
export class QuotaExceededError extends Error {
  constructor(
    public readonly bytesRequested: number,
    public readonly bytesAvailable: number,
  ) {
    super(`QUOTA_EXCEEDED: solicitados ${bytesRequested} bytes, disponibles ${bytesAvailable}.`);
    this.name = "QuotaExceededError";
  }
}

export class DraftNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`DRAFT_NOT_FOUND: id "${id}" con formato inválido.`);
    this.name = "DraftNotFoundError";
  }
}
```

**Mapeo a UI** (en `components/editor/`):

| Error | UI |
|---|---|
| `QuotaExceededError` | Toast rojo: "Tu borrador es grande (>4 MB). Reduce el contenido o limpia el borrador." + log en consola. |
| `DraftNotFoundError` | Solo log en consola; la UI no debería verlo (es bug). |
| `RoundTripMismatchError` | Toast rojo: "Detectamos una inconsistencia al guardar. Tu borrador se restauró a la última versión válida." |

**Nota**: `EntityNotAllowedError` y `SectionValidationFailedError` mencionadas en la spec original **NO existen** en el shipped code. La validación Art. I FR-029a se hace vía Zod `safeParse` en `LocalStorageCvStore.save` y `roundtrip()`, no como errores dedicados.

---

## Versionado

- **`CvDocument.version`**: "0.5.0" en v0.5. Bumpear según SemVer cuando cambie la estructura.
- **`Draft.engineVersions.editor`**: "0.5.0" en v0.5.
- **`Draft.engineVersions.score`**: "1.0.0" (sincronizado con el backend 002-score-engine).

Cuando un schema Zod cambie (ej. añadir un campo opcional), bumpear MINOR. Si cambia un campo requerido, bumpear MAYOR (con migración).
