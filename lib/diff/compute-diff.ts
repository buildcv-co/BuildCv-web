import { diffWords } from "diff";

export type DiffChangeKind = "added" | "removed" | "unchanged";

export interface DiffChange {
  readonly kind: DiffChangeKind;
  readonly value: string;
}

interface JsDiffChange {
  readonly value: string;
  readonly added?: boolean;
  readonly removed?: boolean;
}

/**
 * Calcula el diff palabra-por-palabra entre dos textos usando Myers algorithm
 * (jsdiff). Devuelve una secuencia de `DiffChange` mapeada a un tipo local
 * inmutable y agnóstico del formato de jsdiff.
 *
 * @pure
 * @example
 *   computeDiff("hello world", "hello there")
 *   // → [
 *   //   { kind: "unchanged", value: "hello " },
 *   //   { kind: "removed", value: "world" },
 *   //   { kind: "added", value: "there" },
 *   // ]
 */
export function computeDiff(
  before: string,
  after: string,
): ReadonlyArray<DiffChange> {
  return diffWords(before, after).map(toDiffChange);
}

function toDiffChange(change: JsDiffChange): DiffChange {
  const kind: DiffChangeKind = change.added
    ? "added"
    : change.removed
      ? "removed"
      : "unchanged";
  return { kind, value: change.value };
}
