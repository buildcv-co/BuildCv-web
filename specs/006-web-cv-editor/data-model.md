# Data Model: 006-web-cv-editor

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Research:** [./research.md](./research.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
> **Convención del proyecto:** TypeScript strict, snake_case prohibido, kebab-case en archivos, tipos en inglés, copy en español (en `lib/copy/es.ts`).

---

## Overview

Este documento define los tipos TypeScript centrales de la feature. Todos son **inmutables** (frozen objects / `Readonly<>`) y se validan en runtime con **Zod v3**.

```
CvDocument (in-memory, lo que edita el usuario)
    ↓ save
Draft (en ICvStore: localStorage o IndexedDB)
    ↓ export
Markdown (lo que 004-export-pdf consume)
```

---

## Tipos centrales (en `lib/editor/types.ts`)

### `CvDocument`

El documento completo que edita el usuario. Equivale al Tiptap doc serializado.

```typescript
export interface CvDocument {
  readonly id: string;                  // nanoid
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
  readonly id: string;                  // nanoid
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
  readonly links: ReadonlyArray<{ label: string; url: string }>;
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
  readonly id: string;                  // nanoid
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

Lo que persiste `ICvStore`. Contiene el `CvDocument` + metadata.

```typescript
export interface Draft {
  readonly id: string;                  // "default" en v0.5 (single-borrador)
  readonly document: CvDocument;
  readonly jobText: string;             // la vacante (para re-puntuar sin pedirla de nuevo)
  readonly scoreHistory: ReadonlyArray<{
    readonly score: number;
    readonly band: string;
    readonly engineVersion: string;
    readonly at: string;                // ISO 8601
  }>;
  readonly lastSavedAt: string;
  readonly engineVersions: {
    readonly editor: string;            // "0.5.0"
    readonly score: string;             // sincronizado con backend
  };
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

Cada sección tiene un Zod schema en su propio archivo. Aquí el patrón:

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
  email: z.string().email().max(200),
  phone: z.string().max(50),
  location: z.string().max(200),
  links: z.array(
    z.object({
      label: z.string().min(1).max(50),
      url: z.string().url().max(500),
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

export const DraftSchema = z.object({
  id: z.string().min(1).max(50),
  document: CvDocumentSchema,
  jobText: z.string().max(20_000),
  scoreHistory: z.array(z.object({
    score: z.number().int().min(0).max(100),
    band: z.string(),
    engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    at: z.string().datetime(),
  })).max(20),
  lastSavedAt: z.string().datetime(),
  engineVersions: z.object({
    editor: z.string().regex(/^\d+\.\d+\.\d+$/),
    score: z.string().regex(/^\d+\.\d+\.\d+$/),
  }),
});
```

---

## `ICvStore` port (en `lib/storage/icv-store.ts`)

Puerto frontend (NO backend) declarado en la Constitución Art. VI v1.1.0.

```typescript
export class QuotaExceededError extends Error {
  constructor(public readonly bytesRequested: number, public readonly bytesAvailable: number) {
    super(`Storage quota exceeded: requested ${bytesRequested} bytes, available ${bytesAvailable} bytes.`);
    this.name = "QuotaExceededError";
  }
}

export class StorageUnavailableError extends Error {
  constructor(public readonly reason: string) {
    super(`Storage unavailable: ${reason}`);
    this.name = "StorageUnavailableError";
  }
}

export class DraftNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Draft not found: ${id}`);
    this.name = "DraftNotFoundError";
  }
}

export interface ICvStore {
  /** Persiste un Draft. Lanza QuotaExceededError si no hay espacio. */
  save(draft: Draft): Promise<void>;
  /** Carga un Draft por id. Retorna null si no existe. Lanza DraftNotFoundError si el id es inválido. */
  load(id: string): Promise<Draft | null>;
  /** Lista summaries de todos los drafts persistidos. */
  list(): Promise<ReadonlyArray<DraftSummary>>;
  /** Elimina un Draft por id. No-op si no existe. */
  clear(id: string): Promise<void>;
  /** Elimina TODOS los drafts. Usado por "Limpiar borrador". */
  clearAll(): Promise<void>;
  /** Suscribe a eventos de quota exceeded. Retorna función de unsubscribe. */
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void;
}
```

### `LocalStorageCvStore`

```typescript
// lib/storage/local-storage-cv-store.ts
export class LocalStorageCvStore implements ICvStore {
  private readonly key = "buildcv:draft:default";
  private readonly indexKey = "buildcv:drafts:index";
  private quotaHandlers: Array<(err: QuotaExceededError) => void> = [];

  async save(draft: Draft): Promise<void> {
    const validated = DraftSchema.parse(draft);
    const serialized = JSON.stringify(validated);
    try {
      localStorage.setItem(this.key, serialized);
    } catch (err) {
      if (err instanceof DOMException && err.name === "QuotaExceededError") {
        const handlerErr = new QuotaExceededError(serialized.length, this.estimateQuota());
        this.quotaHandlers.forEach((h) => h(handlerErr));
        throw handlerErr;
      }
      throw err;
    }
  }

  async load(id: string): Promise<Draft | null> {
    const key = `buildcv:draft:${id}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return DraftSchema.parse(parsed);
    } catch {
      return null;
    }
  }

  async list(): Promise<ReadonlyArray<DraftSummary>> { /* ... */ }
  async clear(id: string): Promise<void> { /* ... */ }
  async clearAll(): Promise<void> { /* ... */ }
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void { /* ... */ }

  private estimateQuota(): number {
    // Heurística: medir cuánto espacio queda
    try {
      const probe = "x".repeat(1024);
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) used += (localStorage.getItem(k) ?? "").length + k.length;
      }
      return 5 * 1024 * 1024 - used; // ~5 MB típico
    } catch {
      return 0;
    }
  }
}
```

### `IndexedDbCvStore`

```typescript
// lib/storage/indexed-db-cv-store.ts
import { openDB, type IDBPDatabase } from "idb";

export class IndexedDbCvStore implements ICvStore {
  private readonly dbName = "buildcv-drafts";
  private readonly storeName = "drafts";
  private readonly version = 1;

  private async openDb(): Promise<IDBPDatabase> {
    return openDB(this.dbName, this.version, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("drafts")) {
          db.createObjectStore("drafts", { keyPath: "id" });
        }
      },
    });
  }

  async save(draft: Draft): Promise<void> {
    const validated = DraftSchema.parse(draft);
    const db = await this.openDb();
    await db.put(this.storeName, validated);
    db.close();
  }

  async load(id: string): Promise<Draft | null> {
    const db = await this.openDb();
    const result = await db.get(this.storeName, id);
    db.close();
    if (!result) return null;
    try {
      return DraftSchema.parse(result);
    } catch {
      return null;
    }
  }

  async list(): Promise<ReadonlyArray<DraftSummary>> { /* ... */ }
  async clear(id: string): Promise<void> { /* ... */ }
  async clearAll(): Promise<void> { /* ... */ }
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void {
    // IndexedDB rara vez lanza quota exceeded; manejo básico
    return () => {};
  }
}
```

### Factory (`lib/storage/index.ts`)

```typescript
// lib/storage/index.ts
import { LocalStorageCvStore } from "./local-storage-cv-store";
import { IndexedDbCvStore } from "./indexed-db-cv-store";
import type { ICvStore } from "./icv-store";

let cachedStore: ICvStore | null = null;

export async function getCvStore(): Promise<ICvStore> {
  if (cachedStore) return cachedStore;
  const local = new LocalStorageCvStore();
  try {
    // Probe: intenta guardar y eliminar un Draft dummy
    await local.save({
      id: "__probe__",
      document: BLANK_DOCUMENT,
      jobText: "",
      scoreHistory: [],
      lastSavedAt: new Date().toISOString(),
      engineVersions: { editor: "0.5.0", score: "1.0.0" },
    });
    await local.clear("__probe__");
    cachedStore = local;
    return local;
  } catch {
    // localStorage no disponible, fallback a IndexedDB
    cachedStore = new IndexedDbCvStore();
    return cachedStore;
  }
}

export const BLANK_DOCUMENT: CvDocument = {
  id: "blank",
  version: "0.5.0",
  locale: "es-CO",
  sections: [],
  entities: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  source: "blank",
};
```

---

## Hooks (en `lib/editor/`)

### `useDraft()`

```typescript
// lib/editor/use-draft.ts
export function useDraft() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const store = await getCvStore();
      const result = await store.load("default");
      setDraft(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const save = useCallback(async (newDraft: Draft) => {
    setIsSaving(true);
    try {
      const store = await getCvStore();
      await store.save(newDraft);
      setDraft(newDraft);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const clear = useCallback(async () => {
    const store = await getCvStore();
    await store.clear("default");
    setDraft(null);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { draft, isLoading, isSaving, error, save, clear, reload: load };
}
```

### `useCvDocument()`

```typescript
// lib/editor/use-cv-document.ts
export function useCvDocument() {
  const editor = useEditor({
    extensions: [StarterKit, ...cvExtensions],
    content: BLANK_DOCUMENT,
    onUpdate: ({ editor }) => {
      // Sincroniza el CvDocument con el store
      const doc = tiptapToCvDocument(editor);
      useCvDocumentStore.getState().setDocument(doc);
    },
  });

  // ... load from ICvStore on mount, save on debounce
  return { editor, document: useCvDocumentStore((s) => s.document) };
}
```

---

## Funciones puras (en `lib/editor/markdown/`)

### `serializeCvDocument`

```typescript
// lib/editor/markdown/serialize.ts
export function serializeCvDocument(doc: CvDocument): string {
  const lines: string[] = [];
  for (const section of doc.sections) {
    lines.push(`## ${sectionHeading(section)}`);
    lines.push("");
    lines.push(serializeSection(section));
    lines.push("");
  }
  return lines.join("\n").trim();
}
```

### `parseCvDocument`

```typescript
// lib/editor/markdown/parse.ts
export function parseCvDocument(
  markdown: string,
  ctx: { originalEntities: ReadonlySet<string> },
): CvDocument {
  const tree = unified().use(remarkParse).use(remarkBuildcv).parse(markdown);
  const sections: CvSection[] = [];
  const entities: EntityRef[] = [];
  // ... visita AST y construye CvDocument
  // Verifica que cada EntityRef.value esté en ctx.originalEntities o source='user-typed'
  return { id: nanoid(), version: "0.5.0", locale: "es-CO", sections, entities, createdAt: now, updatedAt: now, source: "pasted" };
}
```

### `roundtrip()`

```typescript
// lib/editor/roundtrip.ts
export function roundtrip(doc: CvDocument, ctx: { originalEntities: ReadonlySet<string> }): {
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

## Resumen de archivos a crear

| Path | Líneas (aprox.) | Exports principales |
|---|---|---|
| `lib/editor/types.ts` | 200 | `CvDocument`, `CvSection`, `EntityRef`, `Draft`, 8 tipos de sección |
| `lib/editor/schema/index.ts` | 100 | `CvDocumentSchema`, `DraftSchema` |
| `lib/editor/schema/profile.ts` | 30 | `ProfileSectionSchema` |
| `lib/editor/schema/experience.ts` | 40 | `ExperienceSectionSchema` |
| `lib/editor/schema/education.ts` | 30 | `EducationSectionSchema` |
| `lib/editor/schema/skills.ts` | 30 | `SkillsSectionSchema` |
| `lib/editor/schema/projects.ts` | 30 | `ProjectsSectionSchema` |
| `lib/editor/schema/certifications.ts` | 30 | `CertificationsSectionSchema` |
| `lib/editor/schema/languages.ts` | 25 | `LanguagesSectionSchema` |
| `lib/editor/schema/other.ts` | 20 | `OtherSectionSchema` |
| `lib/storage/icv-store.ts` | 60 | `ICvStore`, `QuotaExceededError`, `StorageUnavailableError` |
| `lib/storage/local-storage-cv-store.ts` | 100 | `LocalStorageCvStore` |
| `lib/storage/indexed-db-cv-store.ts` | 80 | `IndexedDbCvStore` |
| `lib/storage/index.ts` | 50 | `getCvStore`, `BLANK_DOCUMENT` |
| `lib/editor/use-draft.ts` | 60 | `useDraft` |
| `lib/editor/use-cv-document.ts` | 80 | `useCvDocument` |
| `lib/editor/markdown/serialize.ts` | 60 | `serializeCvDocument` |
| `lib/editor/markdown/parse.ts` | 80 | `parseCvDocument` |
| `lib/editor/markdown/remark-buildcv.ts` | 100 | `remarkBuildcv` plugin |
| `lib/editor/roundtrip.ts` | 40 | `roundtrip` |

**Total**: ~1 250 líneas de tipos y contratos (sin contar los custom nodes Tiptap ni los componentes).

---

## Errores tipados (en `lib/editor/errors.ts`)

```typescript
export class EntityNotAllowedError extends Error {
  constructor(
    public readonly entityValue: string,
    public readonly sectionKind: string,
  ) {
    super(`ENTITY_NOT_ALLOWED: "${entityValue}" no fue tipeado por el usuario y no está en el CV importado.`);
    this.name = "EntityNotAllowedError";
  }
}

export class SectionValidationFailedError extends Error {
  constructor(
    public readonly sectionKind: string,
    public readonly issues: ReadonlyArray<{ path: string; message: string }>,
  ) {
    super(`SECTION_VALIDATION_FAILED: ${sectionKind} no pasó validación Zod.`);
    this.name = "SectionValidationFailedError";
  }
}

export class RoundTripMismatchError extends Error {
  constructor(public readonly details: string) {
    super(`ROUNDTRIP_MISMATCH: ${details}`);
    this.name = "RoundTripMismatchError";
  }
}
```

---

## Versionado

- **`CvDocument.version`**: "0.5.0" en v0.5. Bumpear según SemVer cuando cambie la estructura.
- **`Draft.engineVersions.editor`**: sincronizado con la versión del editor.
- **`Draft.engineVersions.score`**: sincronizado con `ScoreResult.engineVersion` del backend (002-score-engine).

Cuando un schema Zod cambie (ej. añadir un campo opcional), bumpear MINOR. Si cambia un campo requerido, bumpear MAYOR (con migración).
