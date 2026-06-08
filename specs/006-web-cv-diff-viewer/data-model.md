# Data Model: 006-web-cv-diff-viewer

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Research:** [./research.md](./research.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
> **Convención**: TypeScript strict, tipos en inglés, copy en español.

---

## Overview

Este documento define los tipos TypeScript del diff viewer. La mayoría son **inmutables** y se calculan en runtime mediante funciones puras (ver `lib/diff/compute-diff.ts` y `lib/diff/flag-entities.ts`).

```
AdaptResult (de 003, ya validado por Zod en 003)
    ↓ parse
DiffInput { originalText, adaptedText, inventions[], warnings[] }
    ↓ computeWordDiff + mapFlagsToSegments
DiffResult { segments[], flaggedEntities[], summary }
    ↓ render
React tree con <DiffView>, <FlaggedEntityBadge>, etc.
```

---

## Tipos centrales (en `lib/diff/types.ts`)

### `DiffSegment`

Unidad básica del diff. Representa una palabra o frase que se añadió, eliminó o quedó igual.

```typescript
export type DiffSegmentType = "added" | "removed" | "unchanged";

export interface DiffSegment {
  readonly type: DiffSegmentType;
  readonly value: string;
}
```

### `DiffSegmentWithFlags`

Extiende `DiffSegment` con offsets absolutos y las invenciones que caen dentro del segmento.

```typescript
import type { EntityInvention } from "@/lib/api/types";

export interface DiffSegmentWithFlags extends DiffSegment {
  /** Offset absoluto de inicio en el texto adaptado. */
  readonly startOffset: number;
  /** Offset absoluto de fin en el texto adaptado. */
  readonly endOffset: number;
  /** EntityInvention[] que caen dentro de este segmento. */
  readonly flags: ReadonlyArray<EntityInvention>;
}
```

### `EntityInvention` (re-uso de 003)

```typescript
// Re-uso de BuildCv-api/specs/003-adapt-ia/data-model.md EntityInventionDto
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

### `AdaptResult` (re-uso de 003, ya validado por Zod)

```typescript
// Re-uso de BuildCv-api/specs/003-adapt-ia/contracts/adapt-api.md
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

### `DiffInput`

Entrada del diff viewer. Se construye a partir del `AdaptResult` + el texto original.

```typescript
export interface DiffInput {
  /** Texto del CV original (antes de adaptar). */
  readonly originalText: string;
  /** Texto del CV adaptado (después de adaptar). */
  readonly adaptedText: string;
  /** Invenciones detectadas por el validador post-IA. */
  readonly inventions: ReadonlyArray<EntityInvention>;
  /** Warnings del validador (puede incluir advertencias no-invención). */
  readonly warnings: ReadonlyArray<string>;
  /** Versión del motor de adaptación (para reproducibilidad). */
  readonly engineVersion: string;
  /** Trace ID de la request de adapt (para correlación con logs del backend). */
  readonly adaptTraceId: string;
  /** Timestamp del adapt (para detectar "expirado"). */
  readonly adaptedAt: string;
}
```

### `DiffResult`

Salida del cómputo del diff. Lo que renderiza la UI.

```typescript
export interface DiffResult {
  /** Segmentos del diff palabra-por-palabra con flags inyectados. */
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  /** Resumen del diff (totales, sin computar de nuevo). */
  readonly summary: DiffSummary;
  /** Invenciones que NO pudieron mapearse a un segmento (caen en "removed" o posición inválida). */
  readonly orphanedFlags: ReadonlyArray<EntityInvention>;
}

export interface DiffSummary {
  /** Total de palabras añadidas. */
  readonly addedWords: number;
  /** Total de palabras eliminadas. */
  readonly removedWords: number;
  /** Total de palabras sin cambios. */
  readonly unchangedWords: number;
  /** Total de invenciones (Soft + Hard). */
  readonly totalFlags: number;
  /** Total de Hard pendientes. */
  readonly hardFlags: number;
  /** Total de Soft pendientes. */
  readonly softFlags: number;
}
```

### `DiffMode`

Modo de visualización del diff.

```typescript
export type DiffMode = "unified" | "side-by-side";

export const DEFAULT_DIFF_MODE_BY_BREAKPOINT: ReadonlyArray<{
  readonly maxWidth: number;
  readonly mode: DiffMode;
}> = [
  { maxWidth: 767, mode: "unified" },     // móvil
  { maxWidth: Infinity, mode: "side-by-side" }, // desktop
];
```

### `DiffHandoff`

Handoff desde el diff viewer al editor (006a) o al export (004).

```typescript
// Re-uso de BuildCv-web/specs/006-web-cv-editor/contracts/frontend-internal.md §7
export interface DiffHandoff {
  /** CvDocument actual (lo que el usuario editó). */
  readonly currentDocument: CvDocument;
  /** Resultado de la adaptación que se está revisando. */
  readonly adaptResult: AdaptResult;
  /** Texto original (de donde se partió para adaptar). */
  readonly originalText: string;
  /** Trace ID de la request de adapt. */
  readonly adaptTraceId: string;
  /** Timestamp del handoff. */
  readonly at: string;
}
```

---

## Zod schemas (en `lib/diff/schema.ts`)

```typescript
import { z } from "zod";

// Re-uso de los schemas de 003 + 006a, con validación adicional para DiffInput
export const EntityInventionSchema = z.object({
  type: z.enum(["Skill", "Certification", "Company", "Date", "Metric", "Title", "Other"]),
  claimed: z.string().min(1).max(200),
  original: z.string().max(200).nullable(),
  severity: z.enum(["Soft", "Hard"]),
  position: z.number().int().min(0),
});

export const ValidationReportSchema = z.object({
  isValid: z.boolean(),
  severity: z.enum(["None", "Warning", "Critical"]),
  inventions: z.array(EntityInventionSchema).max(50),
  warnings: z.array(z.string().max(500)).max(20),
});

export const AdaptResultSchema = z.object({
  adaptedText: z.string().max(50_000),
  validation: ValidationReportSchema,
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  aiModel: z.string().min(1).max(100),
});

export const DiffInputSchema = z.object({
  originalText: z.string().max(50_000),
  adaptedText: z.string().max(50_000),
  inventions: z.array(EntityInventionSchema).max(50),
  warnings: z.array(z.string().max(500)).max(20),
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  adaptTraceId: z.string().min(1).max(100),
  adaptedAt: z.string().datetime(),
});
```

---

## Funciones puras (en `lib/diff/`)

### `computeWordDiff`

```typescript
// lib/diff/compute-diff.ts
import { diffWords } from "diff";

/**
 * Calcula el diff palabra-por-palabra entre dos textos.
 * @pure
 */
export function computeWordDiff(
  original: string,
  adapted: string,
): ReadonlyArray<DiffSegment>;
```

### `mapFlagsToSegments`

```typescript
// lib/diff/flag-entities.ts

/**
 * Mapea cada EntityInvention al segmento del diff que la contiene.
 * @pure
 */
export function mapFlagsToSegments(
  segments: ReadonlyArray<DiffSegment>,
  inventions: ReadonlyArray<EntityInvention>,
): {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  readonly orphanedFlags: ReadonlyArray<EntityInvention>;
};
```

### `buildDiffResult`

```typescript
// lib/diff/compute-diff.ts

/**
 * Compone el DiffResult completo a partir del DiffInput.
 * @pure
 */
export function buildDiffResult(input: DiffInput): DiffResult;
```

### `canDirectAccept`

```typescript
// lib/diff/can-direct-accept.ts

/**
 * Determina si el usuario puede "Aceptar y exportar" sin modal de confirmación.
 * @pure
 */
export function canDirectAccept(inventions: ReadonlyArray<EntityInvention>): {
  readonly allowed: boolean;
  readonly hardCount: number;
  readonly softCount: number;
};
```

---

## Hooks (en `lib/diff/use-diff.ts`)

### `useDiff(input: DiffInput): UseDiffResult`

```typescript
export interface UseDiffResult {
  readonly result: DiffResult | null;
  readonly isComputing: boolean;
  readonly error: Error | null;
  readonly mode: DiffMode;
  readonly setMode: (mode: DiffMode) => void;
  readonly editedAdaptedText: string;
  readonly applyEdit: (position: number, newValue: string) => void;
}

export function useDiff(input: DiffInput): UseDiffResult;
```

**Comportamiento**:

- `result` se computa en `useMemo` (evita recálculo en cada render).
- `mode` persiste en `localStorage["buildcv:diff:mode"]`.
- `applyEdit` actualiza el texto adaptado, elimina la invención correspondiente del array de flags, y re-computa el diff (en `useMemo`).

---

## Errores (en `lib/diff/errors.ts`)

```typescript
export class DiffComputationError extends Error {
  constructor(public readonly reason: string) {
    super(`DIFF_COMPUTATION_FAILED: ${reason}`);
    this.name = "DiffComputationError";
  }
}

export class AdaptationExpiredError extends Error {
  constructor(public readonly ageMs: number) {
    super(`ADAPTATION_EXPIRED: la adaptación tiene ${ageMs} ms (máx 1h).`);
    this.name = "AdaptationExpiredError";
  }
}

export class HardInventionPendingError extends Error {
  constructor(public readonly count: number) {
    super(`HARD_INVENTION_PENDING: ${count} invenciones Hard sin resolver.`);
    this.name = "HardInventionPendingError";
  }
}
```

---

## Resumen de archivos a crear

| Path | Líneas (aprox.) | Exports principales |
|---|---|---|
| `lib/diff/types.ts` | 80 | `DiffSegment`, `DiffSegmentWithFlags`, `DiffInput`, `DiffResult`, `DiffSummary` |
| `lib/diff/schema.ts` | 50 | `DiffInputSchema`, `AdaptResultSchema` (re-uso) |
| `lib/diff/compute-diff.ts` | 80 | `computeWordDiff`, `buildDiffResult` |
| `lib/diff/flag-entities.ts` | 50 | `mapFlagsToSegments` |
| `lib/diff/can-direct-accept.ts` | 30 | `canDirectAccept` |
| `lib/diff/render-diff.tsx` | 100 | `renderDiffSegment` |
| `lib/diff/use-diff.ts` | 100 | `useDiff` |
| `lib/diff/errors.ts` | 30 | `DiffComputationError`, `AdaptationExpiredError`, `HardInventionPendingError` |

**Total**: ~520 líneas de tipos y contratos.

---

## Versionado

- **`DiffInput` y `DiffResult` NO tienen campo `version`**: son outputs de cómputo, no se persisten.
- **`DiffHandoff.at`**: timestamp ISO 8601; se valida que tenga <1 h al cargar.
- **`AdaptResult.engineVersion`**: sincronizado con el backend (003). Si bumpea, el frontend acepta el nuevo formato automáticamente (defensa con Zod).
