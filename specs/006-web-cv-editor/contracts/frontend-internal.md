# Contracts (Frontend internal): 006-web-cv-editor

> **Spec:** [../spec.md](../spec.md) · **Plan:** [../plan.md](../plan.md) · **Data Model:** [../data-model.md](../data-model.md)
> **Propósito**: Este documento es la **fuente de verdad** de los contratos internos del editor: tipos exportados, firmas de funciones puras, hooks, errores, y los contratos con las features hermanas (005 import, 002 score, 004 export, 003 adapt).
>
> Cualquier cambio a una firma aquí listada es un cambio **breaking** que requiere bump MINOR de `CvDocument.version` y migración.

---

## 1. `ICvStore` — Puerto de persistencia local

**Ubicación**: `lib/storage/icv-store.ts`

```typescript
import type { Draft, DraftSummary } from "@/lib/editor/types";
import { QuotaExceededError, StorageUnavailableError, DraftNotFoundError } from "@/lib/editor/errors";

export interface ICvStore {
  /**
   * Persiste un Draft. Sobrescribe si ya existe uno con el mismo id.
   * @throws {QuotaExceededError} si no hay espacio (localStorage) o quota del navegador (IndexedDB).
   * @throws {StorageUnavailableError} si el storage está bloqueado (modo privado Safari, cookies deshabilitadas).
   */
  save(draft: Draft): Promise<void>;

  /**
   * Carga un Draft por id.
   * @returns el Draft si existe, `null` si no existe.
   * @throws {DraftNotFoundError} si el id tiene formato inválido.
   * @throws {ZodError} si el Draft persistido no pasa validación (corrupción).
   */
  load(id: string): Promise<Draft | null>;

  /**
   * Lista summaries de todos los Drafts persistidos, ordenados por `lastSavedAt` desc.
   * En v0.5 retorna un array de máximo 1 elemento (singleton "default").
   */
  list(): Promise<ReadonlyArray<DraftSummary>>;

  /**
   * Elimina un Draft por id. No-op si no existe.
   */
  clear(id: string): Promise<void>;

  /**
   * Elimina TODOS los Drafts. Usado por el botón "Limpiar borrador" (FR-040b).
   */
  clearAll(): Promise<void>;

  /**
   * Suscribe a eventos de quota exceeded.
   * @returns función de unsubscribe.
   */
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void;
}

export { QuotaExceededError, StorageUnavailableError, DraftNotFoundError };
```

**Implementaciones** (en `lib/storage/`):

- `LocalStorageCvStore` — adapter default (≤4 MB), `key = "buildcv:draft:default"`.
- `IndexedDbCvStore` — adapter fallback (>4 MB), DB = `buildcv-drafts`, store = `drafts`.

**Factory**: `getCvStore(): Promise<ICvStore>` — elige adapter según prueba de cuota.

---

## 2. `useDraft()` — Hook React para el Draft persistido

**Ubicación**: `lib/editor/use-draft.ts`

```typescript
import type { Draft } from "@/lib/editor/types";

export interface UseDraftResult {
  /** Draft actual, o `null` si no hay borrador persistido. */
  draft: Draft | null;
  /** `true` durante la carga inicial desde `ICvStore`. */
  isLoading: boolean;
  /** `true` durante un guardado en curso. */
  isSaving: boolean;
  /** Último error capturado (puede ser QuotaExceeded, StorageUnavailable, ZodError). */
  error: Error | null;
  /** Persiste un nuevo Draft. Sobrescribe el anterior. */
  save: (draft: Draft) => Promise<void>;
  /** Elimina el Draft persistido. */
  clear: () => Promise<void>;
  /** Recarga desde `ICvStore` (útil tras import desde 005). */
  reload: () => Promise<void>;
}

export function useDraft(): UseDraftResult;
```

**Comportamiento**:

- En `useEffect` inicial, llama `getCvStore().load("default")`.
- `save` actualiza el estado local optimistamente; revierte si lanza error.
- `clear` pone `draft = null` localmente.
- `error` se setea en `save`/`clear`/`load`; el componente debe renderizar un toast.

---

## 3. `useCvDocument()` — Hook del editor Tiptap

**Ubicación**: `lib/editor/use-cv-document.ts`

```typescript
import type { Editor } from "@tiptap/react";
import type { CvDocument } from "@/lib/editor/types";

export interface UseCvDocumentResult {
  /** Instancia de Tiptap Editor. `null` hasta que monta. */
  editor: Editor | null;
  /** CvDocument actual (sincronizado con el editor). */
  document: CvDocument | null;
  /** `true` si hay cambios sin guardar. */
  isDirty: boolean;
  /** Sincroniza el editor con un CvDocument externo (ej. import desde 005). */
  setDocument: (doc: CvDocument) => void;
  /** Resetea el editor a un documento vacío. */
  reset: () => void;
}

export function useCvDocument(options?: {
  initialDocument?: CvDocument;
  onChange?: (doc: CvDocument) => void;
}): UseCvDocumentResult;
```

**Comportamiento**:

- Internamente usa Zustand (`useCvDocumentStore`) para el estado global.
- `onChange` se invoca en cada `transaction` de Tiptap (debounce de 300 ms).
- `setDocument` reemplaza el contenido del editor (cuidado: descarta `isDirty`).

---

## 4. Funciones puras — Markdown round-trip

**Ubicación**: `lib/editor/markdown/`

### 4.1 `serializeCvDocument(doc: CvDocument): string`

```typescript
/**
 * Serializa un CvDocument a Markdown (CommonMark + custom syntax para las 8 secciones).
 * @returns Markdown válido. Sección vacía se omite (no exporta heading vacío).
 * @pure
 */
export function serializeCvDocument(doc: CvDocument): string;
```

**Sintaxis del Markdown generado**:

```markdown
## Perfil

**Juan Pérez** · Backend Developer · Medellín, Colombia
juan@example.com · +57 300 123 4567 · [linkedin.com/in/juan](https://linkedin.com/in/juan)

Resumen profesional de 2-3 líneas.

## Experiencia

### Backend Developer · Acme Corp · 2022-01 → actualidad · Medellín

- Reduje latencia de API en 35% mediante caché distribuido.
- Lideré migración de monolito a microservicios (Node.js, PostgreSQL).
- Stack: Node.js, TypeScript, PostgreSQL, Redis, AWS.

### Backend Developer · BetaSoft · 2020-03 → 2021-12 · Bogotá

- Implementé pipeline de CI/CD con GitHub Actions.
- Stack: Python, Django, MySQL.

## Educación

### Ingeniería de Sistemas · Universidad de Antioquia · 2014 → 2019 · Medellín

## Habilidades

- **Backend**: Node.js, Python, PostgreSQL, Redis
- **Cloud**: AWS (EC2, S3, Lambda), Docker, Kubernetes
- **Frontend**: React, TypeScript, Tailwind CSS

## Proyectos

### BuildCv · https://buildcv.app

Asistente de CV con IA para Colombia. Stack: Next.js, .NET, Claude API.

## Certificaciones

- AWS Solutions Architect · Amazon · 2023-05 · cred-id-123

## Idiomas

- Español · Nativo
- Inglés · B2

## Otros

### Publicaciones

- "Microservicios en LATAM" · Medium · 2024-03
```

### 4.2 `parseCvDocument(md: string, ctx: ParseContext): CvDocument`

```typescript
import type { CvDocument, EntityRef } from "@/lib/editor/types";

export interface ParseContext {
  /** Set de tokens normalizados (lowercase + trim) del CV importado. */
  readonly originalEntities: ReadonlySet<string>;
  /** Set de `EntityRef.value` que el usuario tipeó explícitamente (whitelist en runtime). */
  readonly userTypedEntities: ReadonlySet<string>;
}

/**
 * Parsea Markdown a CvDocument.
 * @throws {EntityNotAllowedError} si un nodo contiene un token que no está en `originalEntities`
 *         ni en `userTypedEntities` (defense in depth, Constitución Art. I FR-029a).
 * @throws {SectionValidationFailedError} si un nodo no pasa su Zod schema.
 * @pure
 */
export function parseCvDocument(md: string, ctx: ParseContext): CvDocument;
```

### 4.3 `roundtrip(doc: CvDocument, ctx: ParseContext): RoundTripResult`

```typescript
export type RoundTripResult =
  | { readonly ok: true; readonly markdown: string }
  | {
      readonly ok: false;
      readonly error: "ENTITY_NOT_ALLOWED" | "SECTION_VALIDATION_FAILED" | "ROUNDTRIP_MISMATCH";
      readonly details: string;
    };

/**
 * Verifica que `parse(serialize(doc))` produce un CvDocument estructuralmente equivalente a `doc`.
 * @pure
 */
export function roundtrip(doc: CvDocument, ctx: ParseContext): RoundTripResult;
```

---

## 5. Contrato con feature 005 — Handoff del ImportResult

**Ubicación**: `lib/api/editor-handoff.ts`

```typescript
import type { DetectedSection, ImportResult } from "@/lib/api/types";

const HANDOFF_KEY = "buildcv:import:handoff";

export interface EditorHandoff {
  /** Texto completo extraído del PDF/DOCX. */
  readonly importedText: string;
  /** Secciones detectadas por el parser del backend. */
  readonly importedSections: ReadonlyArray<DetectedSection>;
  /** Trace ID de la request de import (para correlación con logs del backend). */
  readonly importedTraceId: string;
  /** Timestamp ISO 8601 del import. */
  readonly importedAt: string;
  /** Engine version del parser (005). */
  readonly parserEngineVersion: string;
}

export function setEditorHandoff(handoff: EditorHandoff): void;
export function getEditorHandoff(): EditorHandoff | null;
export function clearEditorHandoff(): void;
```

**Flujo**:

1. 005 (import) llama `setEditorHandoff(...)` antes de navegar a `/analizar/editar?traceId=...`.
2. 006 (editor) llama `getEditorHandoff()` en mount, parsea `importedText` con `parseCvDocument`, pre-pobla el editor.
3. El usuario edita. Los `EntityRef` heredan `source: 'imported'` y se registran en la whitelist.
4. Al guardar, el `Draft` incluye la whitelist derivada del import (no se persiste el `ImportResult` completo).

---

## 6. Contrato con feature 002 — Re-score

**Ubicación**: `lib/api/score.ts` (extendido)

```typescript
import type { ScoreResponse } from "@/lib/api/types";
import type { CvDocument } from "@/lib/editor/types";
import { serializeCvDocument } from "@/lib/editor/markdown/serialize";

/**
 * Re-puntúa el CvDocument contra el backend 002-score-engine.
 * @param doc el CvDocument actual.
 * @param jobText la vacante (del Draft.jobText).
 * @returns ScoreResponse (idéntico al de la feature 002).
 * @throws {ScoreError} si el backend retorna 4xx/5xx (incluido 429 rate-limit).
 */
export async function requestRescore(
  doc: CvDocument,
  jobText: string,
): Promise<ScoreResponse>;
```

**Comportamiento**:

- Internamente llama `serializeCvDocument(doc)` y luego `requestScore(md, jobText)`.
- Si `jobText` está vacío, retorna error `JOB_TEXT_REQUIRED` (la vacante es necesaria para re-puntuar).

---

## 7. Contrato con feature 003 — Diff viewer (sub-feature 006b)

**Ubicación**: `lib/editor/handoff-to-diff.ts`

```typescript
import type { CvDocument } from "@/lib/editor/types";
import type { AdaptResult } from "@/lib/api/types";

const DIFF_HANDOFF_KEY = "buildcv:diff:handoff";

export interface DiffHandoff {
  /** CvDocument actual (lo que el usuario editó). */
  readonly currentDocument: CvDocument;
  /** Resultado de la adaptación 003 que el diff viewer va a mostrar. */
  readonly adaptResult: AdaptResult;
  /** Texto original (de donde se partió para adaptar). */
  readonly originalText: string;
  /** Trace ID de la request de adapt. */
  readonly adaptTraceId: string;
  /** Timestamp del handoff. */
  readonly at: string;
}

export function setDiffHandoff(handoff: DiffHandoff): void;
export function getDiffHandoff(): DiffHandoff | null;
export function clearDiffHandoff(): void;
```

**Flujo**:

1. 003 retorna `AdaptResult`.
2. La UI de 003 (o un botón "Ver diff" en el editor) llama `setDiffHandoff(...)`.
3. Navega a `/analizar/diff` (sub-feature 006b).
4. 006b lee `getDiffHandoff()` y renderiza el diff viewer.

---

## 8. Contrato con feature 004 — Export PDF

**Ubicación**: `lib/editor/markdown/serialize.ts` (re-uso)

```typescript
import type { CvDocument } from "@/lib/editor/types";

/**
 * Punto de entrada para 004-export-pdf. 004 puede importar `serializeCvDocument`
 * directamente o consumir el Blob que genera `exportCvDocumentAsMarkdown`.
 *
 * Convención: el Markdown que `serializeCvDocument` produce es el MISMO que
 * `004-export-pdf` espera como input. La función es la "puerta" entre features.
 */
export function serializeCvDocument(doc: CvDocument): string;
```

**No se añade un nuevo endpoint BFF** — 004 consume el Markdown directamente (server-to-server si necesita enriquecer estilos).

---

## 9. Códigos de error (en `lib/editor/errors.ts`)

```typescript
export class EntityNotAllowedError extends Error {
  constructor(
    public readonly entityValue: string,
    public readonly sectionKind: string,
  ) {
    super(`ENTITY_NOT_ALLOWED: "${entityValue}" en sección ${sectionKind} no fue tipeado por el usuario y no está en el CV importado.`);
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

export class QuotaExceededError extends Error {
  constructor(
    public readonly bytesRequested: number,
    public readonly bytesAvailable: number,
  ) {
    super(`QUOTA_EXCEEDED: solicitados ${bytesRequested} bytes, disponibles ${bytesAvailable}.`);
    this.name = "QuotaExceededError";
  }
}

export class StorageUnavailableError extends Error {
  constructor(public readonly reason: string) {
    super(`STORAGE_UNAVAILABLE: ${reason}.`);
    this.name = "StorageUnavailableError";
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
| `EntityNotAllowedError` | Toast rojo persistente: "No pudimos guardar: <entityValue> no estaba en tu CV importado." |
| `SectionValidationFailedError` | Banner rojo arriba del editor: "La sección <kind> tiene datos inválidos. Revisa los campos marcados." |
| `RoundTripMismatchError` | Toast rojo: "Detectamos una inconsistencia al guardar. Tu borrador se restauró a la última versión válida." |
| `QuotaExceededError` | Toast amarillo: "Tu borrador es grande (>4 MB). Lo guardamos en almacenamiento extendido." + log en consola. |
| `StorageUnavailableError` | Toast rojo: "No pudimos guardar el borrador. Usa el modo normal del navegador o desactiva el modo privado." |
| `DraftNotFoundError` | Solo log en consola; la UI no debería verlo (es bug). |

---

## 10. Ejemplos de payloads

### 10.1 `Draft` ejemplo (válido, persistido en ICvStore)

```json
{
  "id": "default",
  "document": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "version": "0.5.0",
    "locale": "es-CO",
    "sections": [
      {
        "id": "sec_01",
        "kind": "profile",
        "source": "user-typed",
        "createdAt": "2026-06-08T14:30:00.000Z",
        "updatedAt": "2026-06-08T14:30:00.000Z",
        "fullName": "Juan Pérez",
        "headline": "Backend Developer",
        "email": "juan@example.com",
        "phone": "+57 300 123 4567",
        "location": "Medellín, Colombia",
        "links": [{ "label": "LinkedIn", "url": "https://linkedin.com/in/juan" }],
        "summary": "Backend developer con 4 años de experiencia en Node.js y Python."
      },
      {
        "id": "sec_02",
        "kind": "experience",
        "source": "imported",
        "createdAt": "2026-06-08T14:25:00.000Z",
        "updatedAt": "2026-06-08T14:30:00.000Z",
        "role": "Backend Developer",
        "company": "Acme Corp",
        "startDate": "2022-01",
        "endDate": null,
        "location": "Medellín",
        "bullets": [
          "Reduje latencia de API en 35% mediante caché distribuido.",
          "Lideré migración de monolito a microservicios (Node.js, PostgreSQL)."
        ],
        "techStack": ["Node.js", "TypeScript", "PostgreSQL", "Redis", "AWS"]
      }
    ],
    "entities": [
      {
        "id": "ent_01",
        "kind": "skill",
        "value": "Node.js",
        "normalized": "node.js",
        "source": "imported",
        "confidence": "high",
        "sectionId": "sec_02",
        "firstSeenAt": "2026-06-08T14:25:00.000Z"
      },
      {
        "id": "ent_02",
        "kind": "company",
        "value": "Acme Corp",
        "normalized": "acme corp",
        "source": "imported",
        "confidence": "high",
        "sectionId": "sec_02",
        "firstSeenAt": "2026-06-08T14:25:00.000Z"
      }
    ],
    "createdAt": "2026-06-08T14:25:00.000Z",
    "updatedAt": "2026-06-08T14:30:00.000Z",
    "source": "imported"
  },
  "jobText": "Buscamos backend developer con 4+ años de experiencia en Node.js, PostgreSQL y AWS. Modalidad remota desde Colombia.",
  "scoreHistory": [
    {
      "score": 78,
      "band": "Strong",
      "engineVersion": "1.0.0",
      "at": "2026-06-08T14:30:00.000Z"
    }
  ],
  "lastSavedAt": "2026-06-08T14:30:00.000Z",
  "engineVersions": {
    "editor": "0.5.0",
    "score": "1.0.0"
  }
}
```

### 10.2 `EditorHandoff` ejemplo (de 005 al editor)

```json
{
  "importedText": "Juan Pérez\nBackend Developer\nMedellín, Colombia\njuan@example.com\n\nEXPERIENCIA\n\nBackend Developer · Acme Corp · 2022 - actualidad\n- Reduje latencia de API en 35%\n- Lideré migración a microservicios\nStack: Node.js, PostgreSQL, AWS\n\nEDUCACIÓN\n\nIngeniería de Sistemas · Universidad de Antioquia · 2014 - 2019",
  "importedSections": [
    { "heading": "EXPERIENCIA", "start": 95, "end": 250, "confidence": "High" },
    { "heading": "EDUCACIÓN", "start": 252, "end": 340, "confidence": "High" }
  ],
  "importedTraceId": "0HMVD9F2E5Q2P:00000007",
  "importedAt": "2026-06-08T14:20:00.000Z",
  "parserEngineVersion": "1.0.0"
}
```

### 10.3 `DiffHandoff` ejemplo (del editor al diff viewer 006b)

```json
{
  "currentDocument": { "...": "(CvDocument actual, ver §10.1)" },
  "adaptResult": {
    "adaptedText": "...",
    "validation": {
      "isValid": true,
      "severity": "Warning",
      "inventions": [
        {
          "type": "Metric",
          "claimed": "40%",
          "original": "35%",
          "severity": "Soft",
          "position": 142
        }
      ],
      "warnings": ["Una métrica fue redondeada (40% vs 35%)."]
    },
    "engineVersion": "1.0.0",
    "aiModel": "claude-sonnet-4-20250514"
  },
  "originalText": "...",
  "adaptTraceId": "0HMVD9F2E5Q2P:00000012",
  "at": "2026-06-08T14:35:00.000Z"
}
```

### 10.4 Markdown exportado (output de `serializeCvDocument`)

```markdown
## Perfil

**Juan Pérez** · Backend Developer · Medellín, Colombia
juan@example.com · +57 300 123 4567 · [LinkedIn](https://linkedin.com/in/juan)

Backend developer con 4 años de experiencia en Node.js y Python.

## Experiencia

### Backend Developer · Acme Corp · 2022-01 → actualidad · Medellín

- Reduje latencia de API en 35% mediante caché distribuido.
- Lideré migración de monolito a microservicios (Node.js, PostgreSQL).

Stack: Node.js, TypeScript, PostgreSQL, Redis, AWS.

## Educación

### Ingeniería de Sistemas · Universidad de Antioquia · 2014 → 2019 · Medellín
```

---

## 11. Reglas de versionado y compatibilidad

- **`CvDocument.version`**: SemVer. Cambio MAYOR si se elimina o renombra un campo requerido de cualquier sección. Cambio MINOR si se añade un campo opcional. Cambio PARCHE si solo se documenta o se ajusta Zod.
- **`Draft.engineVersions.editor`**: sincronizado con `CvDocument.version` en cada `save`. Si difieren al `load`, se descarta el Draft (es de una versión vieja).
- **`Draft.engineVersions.score`**: sincronizado con `ScoreResult.engineVersion` del backend. Si el backend bumpea, se reinicia `scoreHistory` (con log informativo en consola).
- **Handoff contracts**: `EditorHandoff` y `DiffHandoff` se versionan en su TYPE (no en el JSON). Si cambia la forma, bumpear `CvDocument.version` y manejar migración en `getEditorHandoff`/`getDiffHandoff`.

---

## 12. Garantías (lo que el contrato PROMETE)

1. **`ICvStore.save` es atómico**: o persiste el Draft completo, o lanza error sin efectos colaterales.
2. **`parseCvDocument` es determinista**: para la misma entrada y el mismo `ctx`, retorna el mismo `CvDocument`.
3. **`serializeCvDocument` es determinista**: para el mismo `CvDocument`, retorna el mismo Markdown (mismo orden de secciones, mismo formato).
4. **`roundtrip` detecta cualquier inserción de entidad nueva** (Art. I FR-029a).
5. **El `Draft` NUNCA se envía al servidor** salvo en operaciones explícitas (`requestRescore`, `requestAdapt` futuro, `exportCvDocumentAsMarkdown`).
6. **El `Limpiar borrador` elimina TODA la persistencia** (localStorage + IndexedDB + sessionStorage) asociada a la feature.

---

## 13. Anti-garantías (lo que el contrato NO PROMETE)

1. **NO hay sync entre dispositivos** (v1).
2. **NO hay colaboración en tiempo real** (v1).
3. **NO hay versionado de Drafts** (v1).
4. **NO hay compresión del Draft** (v1).
5. **NO hay encryption at rest** (depende del navegador; en modo normal el localStorage es accesible por otras extensiones).
