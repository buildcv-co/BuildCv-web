"use client";

import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

type IterationProgressProps = {
  current: number;
  total: number;
  className?: string;
};

export function IterationProgress({ current, total, className }: IterationProgressProps) {
  const safeTotal = total <= 0 ? 1 : total;
  const safeCurrent = current < 0 ? 0 : current > safeTotal ? safeTotal : current;
  const pct = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <section
      data-testid="iteration-progress"
      aria-live="polite"
      aria-label={copy.iteration.progress.ariaLive}
      className={cn(
        "rounded-2xl border border-line bg-surface/40 p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between text-sm text-fg/80">
        <span className="font-medium">{copy.iteration.progress.title}</span>
        <span aria-hidden="true">
          {copy.iteration.progress.iterationOf(safeCurrent, safeTotal)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCurrent}
        aria-valuetext={copy.iteration.progress.iterationOf(safeCurrent, safeTotal)}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line/60"
      >
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}