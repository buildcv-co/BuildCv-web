import type { ComponentScore } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";

const toneVar: Record<string, string> = {
  present: "var(--color-present)",
  partial: "var(--color-partial)",
  missing: "var(--color-missing)",
};

function toneKey(value: number): keyof typeof toneVar {
  if (value >= 65) return "present";
  if (value >= 40) return "partial";
  return "missing";
}

export function ComponentBars({ components }: { components: ComponentScore[] }) {
  return (
    <div className="space-y-5">
      {components.map((component, index) => {
        const color = toneVar[toneKey(component.subScore)];
        return (
          <div
            key={component.componentId}
            className="rise"
            style={{ animationDelay: `${120 + index * 80}ms` }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{component.label}</span>
              <span className="font-mono text-sm tabular-nums" style={{ color }}>
                {component.subScore}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="grow-bar h-full rounded-full"
                style={{
                  width: `${component.subScore}%`,
                  backgroundColor: color,
                  animationDelay: `${200 + index * 80}ms`,
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-faint">
              <span>
                {copy.result.weight} {Math.round(component.weight * 100)}%
              </span>
              <span aria-hidden="true">·</span>
              <span>{copy.confidence[component.confidence]}</span>
              {component.measurementCoverage < 1 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-partial">{copy.result.partial}</span>
                </>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted">{component.explanation}</p>
          </div>
        );
      })}
    </div>
  );
}
