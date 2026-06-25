"use client";

import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

type ProbabilityWarningProps = {
  score: number;
  threshold: number;
  onImprove?: () => void;
};

function band(score: number): "red" | "amber" | "hidden" {
  if (score >= 50) return "hidden";
  if (score >= 25) return "amber";
  return "red";
}

const BAND_CLASSES: Record<"red" | "amber", string> = {
  red: "border-red-500/40 bg-red-500/10 text-red-200",
  amber: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

export function ProbabilityWarning({ score, threshold, onImprove }: ProbabilityWarningProps) {
  const tone = band(score);
  if (tone === "hidden") return null;

  return (
    <aside
      data-testid="probability-warning"
      data-tone={tone}
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-2xl border p-4",
        BAND_CLASSES[tone],
      )}
    >
      <p className="text-sm font-medium">
        {copy.iteration.warning.compatibility(score, threshold)}
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs underline-offset-2 hover:underline">
          {copy.iteration.warning.suggestionsTitle}
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          {copy.iteration.warning.suggestions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </details>
      {onImprove && (
        <button
          type="button"
          onClick={onImprove}
          className="mt-3 rounded-xl border border-current bg-transparent px-3 py-1.5 text-xs font-medium transition hover:bg-current/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          {copy.iteration.warning.improveCta}
        </button>
      )}
    </aside>
  );
}