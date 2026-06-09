"use client";

import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import type { DiffMode } from "@/lib/diff/types";

export interface DiffToolbarProps {
  readonly mode: DiffMode;
  readonly onModeChange: (mode: DiffMode) => void;
  readonly onRescore: () => void;
  readonly isRescoring: boolean;
  readonly lastScore: number | null;
  readonly hasJobText: boolean;
}

export function DiffToolbar({
  mode,
  onModeChange,
  onRescore,
  isRescoring,
  lastScore,
  hasJobText,
}: DiffToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Acciones del visor de diff"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/30 p-3"
    >
      <div
        role="radiogroup"
        aria-label={copy.diff.modes.toggle}
        data-mode-toggle
        className="flex items-center gap-1 rounded-full border border-line bg-surface p-1"
      >
        <button
          type="button"
          role="radio"
          aria-checked={mode === "unified"}
          data-mode-value="unified"
          onClick={() => onModeChange("unified")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition",
            mode === "unified"
              ? "bg-accent text-accent-ink"
              : "text-muted hover:text-ink",
          )}
        >
          {copy.diff.modes.unified}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === "side-by-side"}
          data-mode-value="side-by-side"
          onClick={() => onModeChange("side-by-side")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition",
            mode === "side-by-side"
              ? "bg-accent text-accent-ink"
              : "text-muted hover:text-ink",
          )}
        >
          {copy.diff.modes.sideBySide}
        </button>
      </div>

      <button
        type="button"
        onClick={onRescore}
        disabled={!hasJobText || isRescoring}
        aria-busy={isRescoring}
        className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-muted disabled:opacity-50"
      >
        {isRescoring ? copy.diff.actions.rescoreLoading : copy.diff.actions.rescore}
      </button>

      {lastScore !== null && (
        <span
          aria-live="polite"
          className="ml-auto font-mono text-sm text-ink"
        >
          {copy.diff.score.lastScore}: <strong className="text-accent">{lastScore}</strong>
        </span>
      )}
    </div>
  );
}
