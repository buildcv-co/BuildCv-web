# Data Model: 006-web-cv-diff-viewer

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Research:** [./research.md](./research.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
> **Convención**: TypeScript strict, tipos en inglés, copy en español.
>
> **Source of truth:** `lib/diff/types.ts`, `lib/diff/compute-diff.ts`, `lib/diff/flag-entities.ts`, `lib/diff/handoff.ts`, `components/diff/diff-page.tsx`. Verificado contra el shipped code (commit 4bf92b7).

---

## Overview

Este documento define los tipos TypeScript del diff viewer. La mayoría son **inmutables** (`Readonly<>`) y se calculan en runtime mediante funciones puras (ver `lib/diff/compute-diff.ts` y `lib/diff/flag-entities.ts`).

```
AdaptResult (de 003, ya validado por Zod en 003)
    ↓ readDiffHandoff
DiffHandoff (en sessionStorage["buildcv:diff-handoff"])
    ↓ parse → originalText, adaptedText, validation.inventions[]
DiffInput
    ↓ computeDiff + flagEntitiesInDiff
DiffResult { segments[], orphanedFlags[] }
    ↓ render
React tree con <DiffView>, <FlaggedEntityBadge>, etc.
```

---

## Tipos centrales (en `lib/diff/types.ts`)

### `DiffChange`

Unidad básica del diff. Representa una palabra o frase que se añadió, eliminó o quedó igual.

```typescript
export type DiffChangeKind = "added" | "removed" | "unchanged";

export interface DiffChange {
  readonly kind: DiffChangeKind;
  readonly value: string;
}
```

**Nota shipped**: el campo se llama `kind` (no `type` como proponía la spec original). Es consistente con el resto del codebase (006a usa `kind` en `CvSection`).

### `DiffSegmentWithFlags`

Extiende `DiffChange` con offsets absolutos y las invenciones que caen dentro del segmento.

```typescript
import type { EntityInvention } from "@/lib/api/types";

export interface DiffSegmentWithFlags {
  readonly kind: DiffChangeKind;
  readonly value: string;
  /** Offset absoluto de inicio en el texto adaptado. */
  readonly startOffset: number;
  /** Offset absoluto de fin en el texto adaptado. */
  readonly endOffset: number;
  /** FlaggedEntity[] que caen dentro de este segmento. */
  readonly flags: ReadonlyArray<FlaggedEntity>;
}
```

### `FlaggedEntity`

```typescript
export type FlagColor = "soft" | "hard";

export interface FlaggedEntity {
  readonly entity: EntityInvention;
  /** Posición (offset en caracteres) en el texto adaptado. */
  readonly position: number;
  /** Color derivado de la severidad (Hard > Soft). */
  readonly color: FlagColor;
}
```

### `FlagEntitiesResult`

```typescript
export interface FlagEntitiesResult {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  /** Invenciones que no caen en ningún segmento (segmento "removed" o posición inválida). */
  readonly orphanedFlags: ReadonlyArray<EntityInvention>;
}
```

### `EntityInvention` (re-uso de 003, en `lib/api/types.ts`)

```typescript
// Re-uso de BuildCv-api/specs/003-adapt-ia/contracts/adapt-api.md EntityInventionDto
export type EntityInventionType =
  | "Skill"
  | "Certification"
  | "Company"
  | "Date"
  | "Metric"
  | "Title"
  | "Other";

export type EntityInventionSeverity = "Soft" | "Hard";

export interface EntityInvention {
  readonly type: EntityInventionType;
  /** Término que aparece en el CV adaptado. */
  readonly claimed: string;
  /** Término más cercano en el CV original (puede ser null si no hay match). */
  readonly original: string | null;
  readonly severity: EntityInventionSeverity;
  /** Posición (offset en caracteres) en el adaptedText. */
  readonly position: number;
}
```

### `AdaptResult` (re-uso de 003, en `lib/api/types.ts`)

```typescript
export interface ValidationReport {
  readonly isValid: boolean;
  readonly severity: "None" | "Warning" | "Critical";
  readonly inventions: ReadonlyArray<EntityInvention>;
  readonly warnings: ReadonlyArray<string>;
}

export interface AdaptResult {
  readonly adaptedText: string;
  readonly validation: ValidationReport;
  readonly engineVersion: string;
  readonly aiModel: string;
}
```

### `DiffMode`

```typescript
export type DiffMode = "unified" | "side-by-side";
```

**Decisión shipped**: el modo se inicializa con `matchMedia("(min-width: 768px)")` y se mantiene en `useState`. **NO persiste** entre sesiones (decisión v0.5; v1 con `localStorage["buildcv:diff:mode"]`).

### `DiffHandoff`

Handoff desde el flujo de adaptación (003) al diff viewer. Se serializa a JSON en `sessionStorage["buildcv:diff-handoff"]`.

```typescript
/**
 * Privacy: Constitution Art. III — el handoff vive solo en sessionStorage
 * (no URL, no localStorage). El viewer lo lee y lo limpia al aceptar/rechazar.
 */
export interface DiffHandoff {
  /** Texto del CV original (antes de adaptar). */
  readonly originalText: string;
  /** Texto del CV adaptado (después de adaptar). */
  readonly adaptedText: string;
  /** ValidationReport del AdaptResult (severity, inventions, warnings). */
  readonly validation: ValidationReport;
  /** Trace ID de la request de adapt (correlación con logs del backend). */
  readonly adaptTraceId: string;
  /** Timestamp ISO 8601 del handoff. Se valida <1 h de antigüedad. */
  readonly timestamp: string;
}
```

**Diferencia shipped vs. spec original**: la spec original proponía que el handoff incluyera un `currentDocument: CvDocument` (referencia al doc del editor 006a). El shipped code solo contiene `originalText` + `adaptedText` + `validation` + `adaptTraceId` + `timestamp`. **No hay `currentDocument`** porque el flujo 003 → 006b no requiere que el editor haya participado; el diff viewer es standalone una vez que se carga el handoff.

---

## Constantes (en `lib/diff/handoff.ts`)

```typescript
export const DIFF_HANDOFF_KEY = "buildcv:diff-handoff";
export const MAX_DIFF_HANDOFF_AGE_MS = 60 * 60 * 1000; // 1 hora
```

---

## Errores (en `lib/diff/handoff.ts`)

```typescript
export class AdaptationExpiredError extends Error {
  readonly ageMs: number;
  constructor(ageMs: number) {
    super(`ADAPTATION_EXPIRED: la adaptación tiene ${Math.round(ageMs / 60_000)} minutos (máx 60).`);
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
```

**Nota shipped**: `DiffComputationError` y `HardInventionPendingError` mencionadas en la spec original **NO existen** como clases. Los errores se manejan con `instanceof AdaptationExpiredError` / `instanceof AdaptationStorageError` en `getClientSnapshot`, y el bloqueo de Hard se hace por conteo en el componente (no como excepción).

---

## Funciones puras (en `lib/diff/`)

### `computeDiff(before: string, after: string): ReadonlyArray<DiffChange>`

```typescript
// lib/diff/compute-diff.ts
import { diffWords } from "diff";

/**
 * Calcula el diff palabra-por-palabra entre dos textos usando Myers algorithm (jsdiff).
 * Devuelve una secuencia de `DiffChange` mapeada a un tipo local inmutable.
 * @pure
 */
export function computeDiff(
  before: string,
  after: string,
): ReadonlyArray<DiffChange>;
```

### `flagEntitiesInDiff(diff, inventions): FlagEntitiesResult`

```typescript
// lib/diff/flag-entities.ts
import type { EntityInvention } from "@/lib/api/types";
import type { DiffChange, DiffSegmentWithFlags, FlagColor, FlaggedEntity } from "./types";

/**
 * Mapea cada `EntityInvention` al segmento del diff que la contiene.
 *
 * Reglas:
 * - Solo se asigna flags a segmentos `added` o `unchanged` (los `removed` no
 *   forman parte del texto adaptado y sus flags van a `orphanedFlags`).
 * - Si dos invenciones caen en la misma posición, gana la de mayor severidad
 *   (Hard > Soft) — Constitution Art. I.
 * - `startOffset`/`endOffset` se calculan acumulando `value.length` desde 0.
 * - Posiciones negativas o más allá del texto → `orphanedFlags`.
 * @pure
 */
export function flagEntitiesInDiff(
  diff: ReadonlyArray<DiffChange>,
  inventions: ReadonlyArray<EntityInvention>,
): FlagEntitiesResult;
```

### `readDiffHandoff()`, `readValidDiffHandoff()`, `writeDiffHandoff()`, `clearDiffHandoff()`

```typescript
// lib/diff/handoff.ts
export function readDiffHandoff(): DiffHandoff | null;          // sin validar expiración
export function readValidDiffHandoff(): DiffHandoff;             // lanza AdaptationExpiredError si >1h
export function writeDiffHandoff(handoff: DiffHandoff): void;
export function clearDiffHandoff(): void;
```

**Reglas**:

- `readDiffHandoff` retorna `null` si no hay handoff, si el JSON está corrupto, o si no pasa `isDiffHandoffShape` (validador manual de shape, no Zod).
- `readValidDiffHandoff` lanza `AdaptationStorageError("no handoff found")` si no hay handoff, `AdaptationStorageError("invalid timestamp")` si el timestamp no parsea, y `AdaptationExpiredError` si tiene >1 h.
- Reloj del cliente desincronizado hacia el futuro (más de 1 minuto en el futuro) se acepta sin error.

---

## Hook React: `DiffPage` (en `components/diff/diff-page.tsx`)

**No existe un hook `useDiff()`** en el shipped code. Toda la lógica de estado vive en el componente `DiffPage` (467 líneas):

```typescript
export interface DiffPageProps {
  /** Texto de la vacante, necesario para re-puntuar. */
  readonly jobText: string;
}

export function DiffPage({ jobText }: DiffPageProps): JSX.Element;
```

**Estado interno**:

```typescript
const hydration = useSyncExternalStore(
  subscribeHandoff, getClientSnapshot, getServerSnapshot,
);
const [editedText, setEditedText] = useState<string | null>(null);
const [inventions, setInventions] = useState<ReadonlyArray<EntityInvention>>([]);
const [mode, setMode] = useState<DiffMode>(() => /* matchMedia */);
const [isRescoring, setIsRescoring] = useState(false);
const [lastScore, setLastScore] = useState<number | null>(null);
const [errorMsg, setErrorMsg] = useState<string | null>(null);
const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);
const [toastMsg, setToastMsg] = useState<string | null>(null);
```

**Computación del diff** (con `useMemo` para evitar recálculo):

```typescript
const result = useMemo(() => {
  if (hydration.status !== "ready") return null;
  const diff = computeDiff(hydration.originalText, adaptedText);
  return flagEntitiesInDiff(diff, inventions);
}, [hydration.status, hydration.originalText, adaptedText, inventions]);
```

**Handlers principales**:

- `onRescore` — `requestScore(adaptedText, jobText)` con manejo de `ScoreError`.
- `onEditEntity(entity)` — `setInlineEdit({ entity, value: entity.claimed })`.
- `onConfirmEdit` — valida con `InlineValueSchema` (Zod), reemplaza en `adaptedText` en el offset, elimina la invención de la lista.
- `onCancelEdit` — `setInlineEdit(null)`.
- `onAcceptExport` — escribe el handoff actualizado, navega a `/analizar/exportar`, notifica listeners.
- `onEditInEditor` — escribe el handoff actualizado, navega a `/analizar/editar`, notifica listeners.
- `onReject` — limpia el handoff, guarda contexto de re-prompt, navega a `/analizar` con delay 300ms.

---

## Validación Zod para edición inline (en `components/diff/diff-page.tsx`)

```typescript
const InlineValueSchema = z
  .string()
  .min(1, "vacío")
  .max(200, "demasiado largo");
```

**Aplicación**: el nuevo valor de la invención debe ser un string no vacío de máximo 200 caracteres. Si falla, se muestra `copy.diff.errors.validationFailed` y se cancela la edición.

---

## Resumen de archivos shipped

| Path | Líneas (aprox.) | Exports principales |
|---|---|---|
| `lib/diff/types.ts` | 61 | `DiffChange`, `DiffChangeKind`, `DiffSegmentWithFlags`, `FlagColor`, `FlaggedEntity`, `DiffMode`, `DiffHandoff` |
| `lib/diff/compute-diff.ts` | 44 | `computeDiff` |
| `lib/diff/flag-entities.ts` | 112 | `flagEntitiesInDiff`, `FlagEntitiesResult` |
| `lib/diff/handoff.ts` | 84 | `readDiffHandoff`, `readValidDiffHandoff`, `writeDiffHandoff`, `clearDiffHandoff`, `AdaptationExpiredError`, `AdaptationStorageError`, `DIFF_HANDOFF_KEY`, `MAX_DIFF_HANDOFF_AGE_MS` |
| `components/diff/diff-page.tsx` | 467 | `DiffPage`, `DiffPageProps` |
| `components/diff/diff-view.tsx` | 163 | `DiffView`, `DiffViewProps` |
| `components/diff/diff-toolbar.tsx` | 88 | `DiffToolbar`, `DiffToolbarProps` |
| `components/diff/flagged-entity-badge.tsx` | 129 | `FlaggedEntityBadge`, `FlaggedEntityBadgeProps` |
| `components/diff/action-footer.tsx` | 113 | `ActionFooter`, `ActionFooterProps` |

**Total**: ~1 300 líneas de tipos y código shipped + 5 archivos de test (~20+ tests).

---

## Versionado

- **`DiffHandoff.timestamp`**: timestamp ISO 8601; se valida que tenga <1 h al cargar (`MAX_DIFF_HANDOFF_AGE_MS`).
- **`AdaptResult.engineVersion`**: sincronizado con el backend (003). Si bumpea, el frontend acepta el nuevo formato automáticamente (defensa con Zod en el backend 003).
- **`DiffHandoff` NO tiene campo `version`**: se versiona por la forma del JSON. Si cambia, bumpear `MAX_DIFF_HANDOFF_AGE_MS` o ajustar el shape validator (`isDiffHandoffShape` en `handoff.ts`).
