import type { Recommendation } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";

const typeLabel: Record<string, string> = {
  resurface: "reubicar",
  rewrite: "reescribir",
  addMetric: "añadir métrica",
  fixFormat: "formato",
  learnAdd: "brecha real",
};

export function FixList({ items }: { items: Recommendation[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ol className="space-y-3">
      {items.map((recommendation, index) => {
        const isGap = recommendation.type === "learnAdd";
        return (
          <li
            key={`${recommendation.type}-${index}`}
            className="rise flex gap-4 rounded-xl border border-line bg-surface/60 p-4"
            style={{ animationDelay: `${150 + index * 70}ms` }}
          >
            <span className="font-display text-xl tabular-nums text-faint">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="flex-1">
              <p className="text-sm text-ink">{recommendation.action}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    isGap ? "bg-missing/15 text-missing" : "bg-accent/15 text-accent"
                  }`}
                >
                  {typeLabel[recommendation.type] ?? recommendation.type}
                </span>
                <span className="font-mono text-faint">
                  +{recommendation.estimatedImpact} {copy.result.impact}
                </span>
                <span className="text-faint">· {recommendation.honestyNote}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
