import type { EntityInvention, ValidationReport } from "@/lib/api/types";

/**
 * Tipos del diff viewer (006-web-cv-diff-viewer).
 *
 * Convenciones:
 * - Todos los tipos son `readonly` (inmutables).
 * - `position` en EntityInvention es un offset en caracteres sobre `adaptedText`.
 * - `DiffChange` y `FlaggedEntity` se calculan en runtime mediante funciones puras
 *   en `lib/diff/compute-diff.ts` y `lib/diff/flag-entities.ts`.
 */

export type DiffChangeKind = "added" | "removed" | "unchanged";

export interface DiffChange {
  readonly kind: DiffChangeKind;
  readonly value: string;
}

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

export type FlagColor = "soft" | "hard";

export interface FlaggedEntity {
  readonly entity: EntityInvention;
  /** Posición (offset en caracteres) en el texto adaptado. */
  readonly position: number;
  /** Color derivado de la severidad (Hard > Soft). */
  readonly color: FlagColor;
}

export type DiffMode = "unified" | "side-by-side";

/**
 * Handoff desde el flujo de adaptación (003) al diff viewer.
 * Se serializa a JSON en `sessionStorage["buildcv:diff-handoff"]`.
 *
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
