import type { EntityInvention } from "@/lib/api/types";
import type {
  DiffChange,
  DiffSegmentWithFlags,
  FlagColor,
  FlaggedEntity,
} from "./types";

export interface FlagEntitiesResult {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  /** Invenciones que no caen en ningún segmento (segmento "removed" o posición inválida). */
  readonly orphanedFlags: ReadonlyArray<EntityInvention>;
}

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
 *
 * @pure
 */
export function flagEntitiesInDiff(
  diff: ReadonlyArray<DiffChange>,
  inventions: ReadonlyArray<EntityInvention>,
): FlagEntitiesResult {
  const segments: DiffSegmentWithFlags[] = [];
  const orphaned: EntityInvention[] = [];
  let offset = 0;

  for (const change of diff) {
    const startOffset = offset;
    const endOffset = offset + change.value.length;
    offset = endOffset;

    if (change.kind === "removed") {
      segments.push({
        ...change,
        startOffset,
        endOffset,
        flags: [],
      });
      continue;
    }

    const flags: FlaggedEntity[] = [];
    for (const entity of inventions) {
      if (entity.position < 0) {
        orphaned.push(entity);
        continue;
      }
      if (entity.position >= startOffset && entity.position < endOffset) {
        flags.push({
          entity,
          position: entity.position,
          color: severityToColor(entity.severity),
        });
      }
    }

    // Hard > Soft: si en la misma posición hay ambos, deja solo el Hard.
    const dedup = dedupeByHighestSeverity(flags);

    segments.push({
      ...change,
      startOffset,
      endOffset,
      flags: dedup,
    });
  }

  // Lo que no quedó asignado a ningún segmento queda huérfano.
  const assigned = new Set(segments.flatMap((s) => s.flags.map((f) => f.entity)));
  for (const entity of inventions) {
    if (!assigned.has(entity) && !orphaned.includes(entity)) {
      orphaned.push(entity);
    }
  }

  return { segments, orphanedFlags: orphaned };
}

function severityToColor(severity: EntityInvention["severity"]): FlagColor {
  return severity === "Hard" ? "hard" : "soft";
}

/**
 * Si dos `FlaggedEntity` comparten position, conserva solo la Hard.
 * Constitution Art. I: defensa en profundidad visual — Hard siempre gana.
 */
function dedupeByHighestSeverity(
  flags: ReadonlyArray<FlaggedEntity>,
): ReadonlyArray<FlaggedEntity> {
  if (flags.length <= 1) return flags;
  const byPosition = new Map<number, FlaggedEntity>();
  for (const flag of flags) {
    const existing = byPosition.get(flag.position);
    if (!existing) {
      byPosition.set(flag.position, flag);
      continue;
    }
    if (flag.color === "hard" && existing.color !== "hard") {
      byPosition.set(flag.position, flag);
    }
  }
  return Array.from(byPosition.values());
}
