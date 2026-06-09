# Contracts (Frontend internal): 006-web-cv-editor

> **Spec:** [../spec.md](../spec.md) · **Plan:** [../plan.md](../plan.md) · **Data Model:** [../data-model.md](../data-model.md)
> **Propósito**: Este documento es la **fuente de verdad** de los contratos internos del editor: tipos exportados, firmas de funciones puras, hooks, errores, y los contratos con las features hermanas (005 import, 002 score, 004 export, 003 adapt).
>
> Cualquier cambio a una firma aquí listada es un cambio **breaking** que requiere bump MINOR de `CvDocument.version` y migración.
>
> **Source of truth:** el shipped code (commit 748611d). Los tipos, firmas y errores listados a continuación son los que existen en el código, no los que la spec original proponía.

---

## 1. `ICvStore` — Puerto de persistencia local

**Ubicación**: `lib/storage/icv-store.ts`

```typescript
import type { Draft, DraftSummary } from "@/lib/editor/types";
import { QuotaExceededError, DraftNotFoundError } from "./errors";

export interface ICvStore {
  /**
   * Persiste un Draft. Sobrescribe si ya existe uno con el mismo id.
   * @throws {QuotaExceededError} si `localStorage.setItem` lanza `DOMException.name === "QuotaExceededError"`.
   * @throws {Error} si el Draft no pasa `DraftSchema.safeParse`.
   */
  save(draft: Draft): Promise<void>;

  /**
   * Carga un Draft por id.
   * @returns el Draft si existe y pasa `DraftSchema.safeParse`, `null` en caso contrario.
   * @throws {DraftNotFoundError} si el id tiene formato inválido.
   */
  load(id: string): Promise<Draft | null>;

  /**
   * Lista summaries de todos los Drafts persistidos, ordenados por `lastSavedAt` desc.
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

export { QuotaExceededError, DraftNotFoundError };
```

**Implementación shipped (en `lib/storage/icv-store.ts`):**

- **`LocalStorageCvStore`** — única implementación shipped. Prefijo de clave: `buildcv:draft:`. Singleton draft: id `"default"`.

**Implementación pendiente (deuda técnica v1, NO shipped):**

- **`IndexedDbCvStore`** — diseño previsto: usar `idb` (`openDB`) con DB `buildcv-drafts`, object store `drafts`, keyPath `id`. **No existe como código** en v0.5 (verificado contra `lib/storage/`).

**Factory**: `getCvStore(): Promise<ICvStore>` (en `lib/storage/index.ts`) — devuelve `LocalStorageCvStore` si `localStorage` está disponible; lanza `Error("LocalStorage unavailable")` en caso contrario.

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
  /** Último error capturado (puede ser `QuotaExceededError` u otro). */
  error: Error | null;
  /** Persiste un nuevo Draft. Sobrescribe el anterior.
   *  @throws re-lanza errores del store (incluido `QuotaExceededError`). */
  save: (draft: Draft) => Promise<void>;
  /** Elimina el Draft persistido (`id="default"`). */
  clear: () => Promise<void>;
  /** Recarga desde `ICvStore` (útil tras import desde 005). */
  reload: () => Promise<void>;
}

export function useDraft(): UseDraftResult;
```

**Comportamiento**:

- En `useEffect` inicial (con `setTimeout(0)` para evitar SSR issues), llama `getCvStore().load("default")`.
- `save` actualiza el estado local optimistamente (`setDraft(next)`) y re-lanza errores del store.
- `clear` pone `draft = null` localmente.
- `error` se setea en `save`/`clear`/`load`; el componente debe renderizar un toast.

---

## 3. Componente `Editor` — Orquestador

**Ubicación**: `components/editor/editor.tsx`

```typescript
export interface EditorProps {
  /** Texto de la vacante (pre-poblado si viene del query string `?job=...`). */
  readonly initialJobText?: string;
}

export function Editor(props: EditorProps): JSX.Element;
```

**Comportamiento shipped** (ver `editor.tsx`):

- `useState<CvDocument>(BLANK_DOCUMENT)` para el documento.
- `useState<string>(initialJobText)` para `jobText`.
- `useState<boolean>(false)` para `isDirty`, `isRescoring`, `hydrated`.
- `useState<ScoreResponse | null>(null)` para `score`.
- `useState<string | null>(null)` para `errorMsg`.
- `useDraft()` para el ciclo de vida del draft persistido.
- `useEffect` que hidrata desde `useDraft.draft` O desde handoff de import (`sessionStorage["buildcv:editor-handoff"]`) cuando no hay draft.
- `useCallback(updateSection)` — actualiza una sección en `document.sections` y marca `isDirty = true`.
- `useMemo(orderedSections)` — ordena las secciones en `SECTION_ORDER` canónico.
- `useCallback(onSave)` — valida con `CvDocumentSchema.safeParse`, construye `Draft`, llama `useDraft.save`, maneja errores.
- `useCallback(onClear)` — llama `useDraft.clear`, resetea el documento.
- `useCallback(onRescore)` — serializa con `serializeCvDocument`, llama `requestScore`, muestra resultado.
- `useCallback(onExportMd)` — genera Blob con `text/markdown;charset=utf-8` y dispara descarga via `downloadBlob`.

**No existe `useCvDocument()`** ni `tiptapToCvDocument()` en el shipped code. El mapeo entre el doc en memoria y la UI es directo: el componente `Editor` pasa `document.sections` a `SectionNode`, que renderiza inputs/textareas nativos por `kind`.

**Constantes shipped**:

```typescript
const SECTION_ORDER: CvSectionKind[] = [
  "profile", "experience", "education", "skills",
  "projects", "certifications", "languages", "other",
];

const HANDOFF_KEY = "buildcv:editor-handoff";

interface HandoffShape {
  importedText: string;
}
```

---

## 4. Funciones puras — Markdown round-trip

**Ubicación**: `lib/editor/markdown/`

### 4.1 `serializeCvDocument(doc: CvDocument): string`

```typescript
/**
 * Serializa un CvDocument a Markdown. Itera las 8 secciones en orden canónico.
 * Sección vacía se omite (no exporta heading vacío).
 * @pure
 */
export function serializeCvDocument(doc: CvDocument): string;
```

### 4.2 `parseCvDocument(md: string, ctx?: ParseContext): CvDocument`

```typescript
import type { CvDocument } from "@/lib/editor/types";

export interface ParseContext {
  /** Set de tokens normalizados (lowercase + trim) del CV importado. */
  readonly originalEntities: ReadonlySet<string>;
  /** Set de `EntityRef.value` que el usuario tipeó explícitamente. */
  readonly userTypedEntities: ReadonlySet<string>;
}

/**
 * Parsea Markdown a CvDocument usando parser regex hand-rolled.
 * Valida con `CvDocumentSchema.safeParse`; si falla, lanza `RoundTripMismatchError`.
 * @throws {RoundTripMismatchError} si el output no pasa validación Zod.
 * @pure
 */
export function parseCvDocument(md: string, ctx?: ParseContext): CvDocument;
```

### 4.3 `roundtrip(doc: CvDocument, ctx?: ParseContext): RoundTripResult`

```typescript
export type RoundTripResult =
  | { readonly ok: true; readonly markdown: string }
  | {
      readonly ok: false;
      readonly error: "ENTITY_NOT_ALLOWED" | "ROUNDTRIP_MISMATCH";
      readonly details: string;
    };

/**
 * Verifica que `parse(serialize(doc))` produce un CvDocument estructuralmente equivalente a `doc`.
 * @pure
 */
export function roundtrip(doc: CvDocument, ctx?: ParseContext): RoundTripResult;
```

---

## 5. Contrato con feature 005 — Handoff del ImportResult

**Ubicación**: lectura inline en `components/editor/editor.tsx` (no hay módulo dedicado)

```typescript
const HANDOFF_KEY = "buildcv:editor-handoff";

interface HandoffShape {
  importedText: string;
}

function readHandoff(): HandoffShape | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(HANDOFF_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.importedText !== "string") return null;
    return { importedText: obj.importedText };
  } catch {
    return null;
  }
}
```

**Flujo**:

1. 005 (import) escribe `sessionStorage["buildcv:editor-handoff"] = JSON.stringify({ importedText: "..." })` antes de navegar a `/analizar/editar?job=...`.
2. 006 (editor) lee el handoff en el `useEffect` de hidratación cuando no hay draft persistido.
3. `parseCvDocument(importedText, { originalEntities, userTypedEntities: new Set() })` produce el `CvDocument` inicial con `source: "imported"`.
4. Si el handoff no existe, el editor crea un documento en blanco con `buildBlankSections(now)` y `source: "blank"`.

**Nota**: el handoff del shipped code es **más simple** que el propuesto en la spec original. Solo contiene `importedText`; las `importedSections` (de 005) NO se persisten en el handoff (se reconstruyen con `parseCvDocument`).

---

## 6. Contrato con feature 002 — Re-score

**Ubicación**: `lib/api/score.ts` (existente, reusado)

```typescript
import type { ScoreResponse } from "@/lib/api/types";

/**
 * Re-puntúa el texto del CV contra el backend 002-score-engine.
 * @param cvText Markdown serializado del CvDocument.
 * @param jobText la vacante.
 * @returns ScoreResponse.
 * @throws {ScoreError} si el backend retorna 4xx/5xx (incluido 429 rate-limit).
 */
export async function requestScore(
  cvText: string,
  jobText: string,
): Promise<ScoreResponse>;
```

**Uso en el editor** (`onRescore` en `editor.tsx`):

```typescript
const onRescore = useCallback(async () => {
  if (jobText.trim().length === 0) {
    setErrorMsg(copy.editor.errors.jobTextRequired);
    return;
  }
  setIsRescoring(true);
  setErrorMsg(null);
  try {
    const md = serializeCvDocument(document);
    const result = await requestScore(md, jobText);
    setScore(result);
  } catch (err) {
    const message = err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : copy.editor.errors.network;
    setErrorMsg(message);
  } finally {
    setIsRescoring(false);
  }
}, [document, jobText]);
```

---

## 7. Contrato con feature 004 — Export PDF

**Ubicación**: `lib/api/export.ts` (existente, reusado)

```typescript
/**
 * Dispara la descarga de un Blob en el navegador.
 * @param blob el Blob (ej. `new Blob([md], { type: "text/markdown;charset=utf-8" })`).
 * @param filename nombre del archivo descargado.
 */
export function downloadBlob(blob: Blob, filename: string): void;
```

**Uso en el editor** (`onExportMd` en `editor.tsx`):

```typescript
const onExportMd = useCallback(() => {
  const md = serializeCvDocument(document);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `cv-${today}.md`);
}, [document]);
```

004-export-pdf consume el mismo `serializeCvDocument` para generar el PDF server-side.

---

## 8. Códigos de error (en `lib/editor/errors.ts` y `lib/storage/errors.ts`)

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

**Nota shipped**: las clases `EntityNotAllowedError` y `SectionValidationFailedError` mencionadas en la spec original **NO existen** en el shipped code. La validación Art. I FR-029a se hace vía Zod `safeParse` en `LocalStorageCvStore.save` y `roundtrip()`, no como errores dedicados.

**Mapeo a UI** (en `components/editor/`):

| Error | UI |
|---|---|
| `RoundTripMismatchError` | Toast rojo: "Detectamos una inconsistencia al guardar. Tu borrador se restauró a la última versión válida." |
| `QuotaExceededError` | Toast rojo: "Tu borrador es grande (>5 MB). Reduce el contenido o limpia el borrador." (se surfacea vía el `EditorSaveIndicator` con `state="error"`). |
| `DraftNotFoundError` | Solo log en consola; la UI no debería verlo (es bug). |

---

## 9. Ejemplos de payloads (alineados con el shipped code)

### 9.1 `Draft` ejemplo (válido, persistido en `localStorage` bajo `buildcv:draft:default`)

```json
{
  "id": "default",
  "document": {
    "id": "doc_8f3kq2x1",
    "version": "0.5.0",
    "locale": "es-CO",
    "sections": [
      {
        "id": "sec_profile",
        "kind": "profile",
        "source": "user-typed",
        "createdAt": "2026-06-09T14:30:00.000Z",
        "updatedAt": "2026-06-09T14:30:00.000Z",
        "fullName": "Juan Pérez",
        "headline": "Backend Developer",
        "email": "juan@example.com",
        "phone": "+57 300 123 4567",
        "location": "Medellín, Colombia",
        "links": [{ "label": "LinkedIn", "url": "https://linkedin.com/in/juan" }],
        "summary": "Backend developer con 4 años de experiencia en Node.js y Python."
      },
      {
        "id": "sec_experience",
        "kind": "experience",
        "source": "imported",
        "createdAt": "2026-06-09T14:25:00.000Z",
        "updatedAt": "2026-06-09T14:30:00.000Z",
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
    "entities": [],
    "createdAt": "2026-06-09T14:25:00.000Z",
    "updatedAt": "2026-06-09T14:30:00.000Z",
    "source": "imported"
  },
  "jobText": "Buscamos backend developer con 4+ años de experiencia en Node.js, PostgreSQL y AWS. Modalidad remota desde Colombia.",
  "scoreHistory": [
    {
      "score": 78,
      "band": "Strong",
      "engineVersion": "1.0.0",
      "at": "2026-06-09T14:30:00.000Z"
    }
  ],
  "lastSavedAt": "2026-06-09T14:30:00.000Z",
  "engineVersions": {
    "editor": "0.5.0",
    "score": "1.0.0"
  }
}
```

### 9.2 Handoff desde 005 (`sessionStorage["buildcv:editor-handoff"]`)

```json
{
  "importedText": "Juan Pérez\nBackend Developer\nMedellín, Colombia\njuan@example.com\n\nEXPERIENCIA\n\nBackend Developer · Acme Corp · 2022 - actualidad\n- Reduje latencia de API en 35%\n- Lideré migración a microservicios\nStack: Node.js, PostgreSQL, AWS\n\nEDUCACIÓN\n\nIngeniería de Sistemas · Universidad de Antioquia · 2014 - 2019"
}
```

**Nota**: el handoff shipped es más simple que el propuesto en la spec original (solo `importedText`; las `importedSections` y `importTraceId` no se persisten).

### 9.3 Markdown exportado (output de `serializeCvDocument`)

```markdown
## Profile

**Juan Pérez** · Backend Developer · Medellín, Colombia
juan@example.com · +57 300 123 4567 · [LinkedIn](https://linkedin.com/in/juan)

Backend developer con 4 años de experiencia en Node.js y Python.

## Experience

### Backend Developer · Acme Corp · 2022-01 → actualidad · Medellín

- Reduje latencia de API en 35% mediante caché distribuido.
- Lideré migración de monolito a microservicios (Node.js, PostgreSQL).

Stack: Node.js, TypeScript, PostgreSQL, Redis, AWS.

## Education

### Ingeniería de Sistemas · Universidad de Antioquia · 2014 → 2019 · Medellín
```

---

## 10. Reglas de versionado y compatibilidad

- **`CvDocument.version`**: SemVer. Cambio MAYOR si se elimina o renombra un campo requerido de cualquier sección. Cambio MINOR si se añade un campo opcional. Cambio PARCHE si solo se documenta o se ajusta Zod.
- **`Draft.engineVersions.editor`**: "0.5.0" en v0.5.
- **`Draft.engineVersions.score`**: sincronizado con el backend 002-score-engine ("1.0.0" en v0.5).

---

## 11. Garantías (lo que el contrato PROMETE)

1. **`ICvStore.save` valida con Zod antes de persistir**: si `DraftSchema.safeParse` falla, lanza `Error("Draft failed schema validation")` y NO escribe a `localStorage`.
2. **`ICvStore.load` retorna `null` si el JSON está corrupto** o si no pasa `DraftSchema.safeParse`. **No lanza** errores de parseo (fail-soft).
3. **`LocalStorageCvStore.save` es atómico** desde el punto de vista del caller: o persiste el Draft completo, o lanza `QuotaExceededError` sin efectos colaterales.
4. **`parseCvDocument` es determinista**: para la misma entrada y el mismo `ctx`, retorna el mismo `CvDocument` (o lanza `RoundTripMismatchError`).
5. **`serializeCvDocument` es determinista**: para el mismo `CvDocument`, retorna el mismo Markdown (mismo orden de secciones, mismo formato).
6. **`roundtrip` detecta cualquier inserción de entidad nueva** (Art. I FR-029a) — vía validación Zod.
7. **El `Draft` NUNCA se envía al servidor** salvo en operaciones explícitas (`requestScore`, `requestAdapt` futuro, descarga local via `downloadBlob`).
8. **El "Limpiar borrador" elimina la clave `buildcv:draft:default`** de `localStorage` (verificable en DevTools).

---

## 12. Anti-garantías (lo que el contrato NO PROMETE)

1. **NO hay sync entre dispositivos** (v1).
2. **NO hay colaboración en tiempo real** (v1).
3. **NO hay versionado de Drafts** (v1).
4. **NO hay compresión del Draft** (v1).
5. **NO hay encryption at rest** (depende del navegador; en modo normal el `localStorage` es accesible por otras extensiones).
6. **NO hay fallback a IndexedDB en v0.5** (deuda técnica v1). El usuario recibe un toast rojo si se agota la cuota de `localStorage`.
7. **NO hay formato inline (bold/italic/links) en el editor** (v1 con Tiptap si hay demanda).
