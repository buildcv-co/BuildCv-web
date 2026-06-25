"use client";

import { useId } from "react";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export const ITERATION_COUNT_MIN = 1;
export const ITERATION_COUNT_MAX = 20;
export const ITERATION_COUNT_DEFAULT = 5;
export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 100;
export const THRESHOLD_DEFAULT = 50;

type IterationSettingsProps = {
  iterationCount: number;
  threshold: number;
  creditsAvailable: number | null;
  onIterationCountChange: (next: number) => void;
  onThresholdChange: (next: number) => void;
  className?: string;
};

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return Math.round(value);
}

export function IterationSettings({
  iterationCount,
  threshold,
  creditsAvailable,
  onIterationCountChange,
  onThresholdChange,
  className,
}: IterationSettingsProps) {
  const iterationId = useId();
  const thresholdId = useId();
  const notEnoughCredits =
    creditsAvailable !== null && creditsAvailable < iterationCount;

  return (
    <section
      data-testid="iteration-settings"
      className={cn("rounded-2xl border border-line bg-surface/30 p-4", className)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={iterationId}
            className="block text-sm font-medium text-fg"
          >
            {copy.iteration.controls.iterationsLabel}
            <span className="ml-2 font-mono text-fg/70">{iterationCount}</span>
          </label>
          <input
            id={iterationId}
            type="range"
            min={ITERATION_COUNT_MIN}
            max={ITERATION_COUNT_MAX}
            step={1}
            value={iterationCount}
            onChange={(e) => onIterationCountChange(clamp(Number(e.target.value), ITERATION_COUNT_MIN, ITERATION_COUNT_MAX))}
            className="mt-2 w-full accent-accent"
            aria-describedby={`${iterationId}-hint`}
          />
          <p id={`${iterationId}-hint`} className="mt-1 text-xs text-fg/60">
            {copy.iteration.controls.iterationsHint}
          </p>
        </div>

        <div>
          <label
            htmlFor={thresholdId}
            className="block text-sm font-medium text-fg"
          >
            {copy.iteration.controls.thresholdLabel}
            <span className="ml-2 font-mono text-fg/70">{threshold}%</span>
          </label>
          <input
            id={thresholdId}
            type="range"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            step={1}
            value={threshold}
            onChange={(e) => onThresholdChange(clamp(Number(e.target.value), THRESHOLD_MIN, THRESHOLD_MAX))}
            className="mt-2 w-full accent-accent"
            aria-describedby={`${thresholdId}-hint`}
          />
          <p id={`${thresholdId}-hint`} className="mt-1 text-xs text-fg/60">
            {copy.iteration.controls.thresholdHint}
          </p>
        </div>
      </div>

      <p
        data-testid="iteration-credits-needed"
        className={cn(
          "mt-4 text-sm",
          notEnoughCredits ? "text-red-300" : "text-fg/80",
        )}
      >
        {copy.iteration.controls.creditsNeeded(iterationCount)}
      </p>
    </section>
  );
}