"use client";

import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import type { DiffMode, DiffSegmentWithFlags } from "@/lib/diff/types";
import type { EntityInvention } from "@/lib/api/types";
import { FlaggedEntityBadge } from "./flagged-entity-badge";

export interface DiffViewProps {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  readonly mode: DiffMode;
  readonly onModeChange: (mode: DiffMode) => void;
  /** Handlers de invención (pasa por el badge). */
  readonly onEditEntity?: (entity: EntityInvention) => void;
  readonly onKeepEntity?: (entity: EntityInvention) => void;
}

const SEGMENT_CLASS: Record<string, string> = {
  added: "bg-present/15 text-present",
  removed: "bg-missing/15 text-missing line-through",
  unchanged: "text-ink",
};

const NEXT_MODE: Record<DiffMode, DiffMode> = {
  unified: "side-by-side",
  "side-by-side": "unified",
};

export function DiffView({
  segments,
  mode,
  onModeChange,
  onEditEntity,
  onKeepEntity,
}: DiffViewProps) {
  return (
    <section
      role="region"
      aria-label={copy.diff.regions.view}
      aria-live="polite"
      data-mode={mode}
      className="space-y-3"
    >
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => onModeChange(NEXT_MODE[mode])}
          aria-label={copy.diff.modes.toggle}
          className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-muted"
        >
          {mode === "unified"
            ? `${copy.diff.modes.unified} ↔ ${copy.diff.modes.sideBySide}`
            : `${copy.diff.modes.sideBySide} ↔ ${copy.diff.modes.unified}`}
        </button>
      </div>

      {mode === "unified" ? (
        <UnifiedColumn
          segments={segments}
          onEditEntity={onEditEntity}
          onKeepEntity={onKeepEntity}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <SideColumn
            segments={segments}
            side="original"
            onEditEntity={onEditEntity}
            onKeepEntity={onKeepEntity}
          />
          <SideColumn
            segments={segments}
            side="adapted"
            onEditEntity={onEditEntity}
            onKeepEntity={onKeepEntity}
          />
        </div>
      )}
    </section>
  );
}

function UnifiedColumn({
  segments,
  onEditEntity,
  onKeepEntity,
}: {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  readonly onEditEntity?: (entity: EntityInvention) => void;
  readonly onKeepEntity?: (entity: EntityInvention) => void;
}) {
  return (
    <article
      aria-label={copy.diff.regions.adapted}
      className="rounded-2xl border border-line bg-surface/30 p-4 font-mono text-sm leading-relaxed"
    >
      {segments.map((seg, i) => (
        <span key={i} className="whitespace-pre-wrap">
          {seg.kind === "added" ? (
            <span data-kind="added" className={cn(SEGMENT_CLASS.added)}>
              +{seg.value}
            </span>
          ) : seg.kind === "removed" ? (
            <span data-kind="removed" className={cn(SEGMENT_CLASS.removed)}>
              −{seg.value}
            </span>
          ) : (
            <span data-kind="unchanged" className={cn(SEGMENT_CLASS.unchanged)}>
              {seg.value}
            </span>
          )}
          {seg.flags.map((f) => (
            <FlaggedEntityBadge
              key={`${f.entity.type}-${f.entity.position}`}
              flag={f}
              onEdit={onEditEntity ? () => onEditEntity(f.entity) : undefined}
              onKeep={onKeepEntity ? () => onKeepEntity(f.entity) : undefined}
            />
          ))}
        </span>
      ))}
    </article>
  );
}

function SideColumn({
  segments,
  side,
  onEditEntity,
  onKeepEntity,
}: {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  readonly side: "original" | "adapted";
  readonly onEditEntity?: (entity: EntityInvention) => void;
  readonly onKeepEntity?: (entity: EntityInvention) => void;
}) {
  const label = side === "original" ? copy.diff.regions.original : copy.diff.regions.adapted;
  const filtered = segments.filter((s) =>
    side === "original" ? s.kind !== "added" : s.kind !== "removed",
  );
  return (
    <article
      aria-label={label}
      className="rounded-2xl border border-line bg-surface/30 p-4 font-mono text-sm leading-relaxed"
    >
      {filtered.map((seg, i) => (
        <span key={i} className="whitespace-pre-wrap">
          <span data-kind={seg.kind} className={cn(SEGMENT_CLASS[seg.kind])}>
            {seg.value}
          </span>
          {seg.flags.map((f) => (
            <FlaggedEntityBadge
              key={`${f.entity.type}-${f.entity.position}`}
              flag={f}
              onEdit={onEditEntity ? () => onEditEntity(f.entity) : undefined}
              onKeep={onKeepEntity ? () => onKeepEntity(f.entity) : undefined}
            />
          ))}
        </span>
      ))}
    </article>
  );
}
