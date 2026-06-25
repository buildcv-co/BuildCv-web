"use client";

import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export type IterationStepViewModel = {
  iterationNumber: number;
  score: number;
  passedArtI: boolean;
  timestamp: string;
};

type IterationStepListProps = {
  steps: ReadonlyArray<IterationStepViewModel>;
  className?: string;
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function IterationStepList({ steps, className }: IterationStepListProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <section
      data-testid="iteration-step-list"
      className={cn("rounded-2xl border border-line bg-surface/30 p-4", className)}
    >
      <h3 className="font-display text-sm text-fg/80">
        {copy.iteration.result.otherStepsTitle}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-fg/60">
            <tr>
              <th scope="col" className="py-1 pr-3 font-normal">#</th>
              <th scope="col" className="py-1 pr-3 font-normal">
                {copy.iteration.result.scoreLabel}
              </th>
              <th scope="col" className="py-1 pr-3 font-normal">Art. I</th>
              <th scope="col" className="py-1 font-normal">Hora</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr
                key={s.iterationNumber}
                className="border-t border-line/60 text-fg/80"
              >
                <td className="py-1 pr-3">{s.iterationNumber}</td>
                <td className="py-1 pr-3 font-mono">{s.score}%</td>
                <td className="py-1 pr-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      s.passedArtI
                        ? "bg-success/15 text-success"
                        : "bg-red-500/15 text-red-300",
                    )}
                  >
                    {s.passedArtI ? "✓" : "✗"}
                  </span>
                </td>
                <td className="py-1 text-xs text-fg/60">
                  {formatTimestamp(s.timestamp)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}