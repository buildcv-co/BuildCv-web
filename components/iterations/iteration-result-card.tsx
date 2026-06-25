"use client";

import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import { ProbabilityWarning } from "./probability-warning";

export type IterationResultStatus = "Running" | "Completed" | "Failed" | "TimedOut";

export type IterationResultViewModel = {
  requestId: string;
  status: IterationResultStatus;
  bestStepText: string | null;
  bestScore: number | null;
  probabilityWarning: string | null;
  threshold: number;
  creditsConsumed: number;
};

type IterationResultCardProps = {
  result: IterationResultViewModel;
  onExportPdf?: () => void;
  onImprove?: () => void;
  className?: string;
};

const STATUS_BADGE: Record<IterationResultStatus, string> = {
  Running: "bg-accent/15 text-accent",
  Completed: "bg-success/15 text-success",
  Failed: "bg-red-500/15 text-red-300",
  TimedOut: "bg-amber-500/15 text-amber-300",
};

const ALL_FAILED_BADGE = "bg-red-500/15 text-red-300";

export function IterationResultCard({
  result,
  onExportPdf,
  onImprove,
  className,
}: IterationResultCardProps) {
  const isAllFailed = result.status === "Failed" || result.bestStepText === null;
  const score = result.bestScore ?? 0;

  return (
    <section
      data-testid="iteration-result-card"
      data-status={result.status}
      aria-live="polite"
      className={cn(
        "rounded-2xl border border-line bg-surface/40 p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-fg">
          {copy.iteration.result.bestStepTitle}
        </h2>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            STATUS_BADGE[result.status],
          )}
        >
          {result.status}
        </span>
      </div>

      {isAllFailed ? (
        <p
          data-testid="iteration-all-failed-banner"
          className={cn(
            "mt-4 rounded-xl border px-3 py-2 text-sm",
            ALL_FAILED_BADGE,
          )}
        >
          {copy.iteration.result.allFailed}
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-display text-fg">{score}%</span>
            <span className="text-xs text-fg/60">
              {copy.iteration.result.scoreLabel}
            </span>
          </div>

          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-line/60 bg-bg/40 p-3 text-sm text-fg/80">
            {result.bestStepText}
          </pre>

          {result.probabilityWarning !== null && score < result.threshold && (
            <div className="mt-4">
              <ProbabilityWarning
                score={score}
                threshold={result.threshold}
                onImprove={onImprove}
              />
            </div>
          )}

          {onExportPdf && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onExportPdf}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-bg transition hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {copy.iteration.result.exportPdf}
              </button>
            </div>
          )}
        </>
      )}

      <p className="mt-4 text-xs text-fg/50">
        {copy.iteration.controls.creditsNeeded(result.creditsConsumed)}
      </p>
    </section>
  );
}