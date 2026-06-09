import type { EntityInvention } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

function orderBySeverity(inventions: EntityInvention[]): EntityInvention[] {
  return [...inventions].sort((a, b) => {
    if (a.severity === b.severity) return 0;
    if (a.severity === "Hard") return -1;
    return 1;
  });
}

function pillTone(severity: "Soft" | "Hard"): string {
  if (severity === "Hard") return "border-missing/40 bg-missing/10 text-missing";
  return "border-partial/40 bg-partial/10 text-partial";
}

export function DeltaImprovements({ inventions }: { inventions: EntityInvention[] }) {
  if (inventions.length === 0) {
    return (
      <section
        aria-label="Cambios aplicados"
        className="rounded-xl border border-line bg-surface/40 p-5"
      >
        <h3 className="mb-2 font-display text-lg">{copy.adapt.delta.title}</h3>
        <p className="text-sm text-muted">{copy.adapt.delta.empty}</p>
      </section>
    );
  }
  const ordered = orderBySeverity(inventions);
  return (
    <section
      aria-label="Cambios aplicados"
      className="rounded-xl border border-line bg-surface/60 p-5"
    >
      <h3 className="mb-4 font-display text-lg">{copy.adapt.delta.title}</h3>
      <ol className="space-y-2.5">
        {ordered.map((inv, index) => (
          <li
            key={`${inv.type}-${inv.claimed}-${index}`}
            className="flex flex-wrap items-center gap-2 text-sm text-ink"
          >
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                pillTone(inv.severity),
              )}
            >
              {inv.severity === "Hard" ? copy.adapt.delta.hardLabel : copy.adapt.delta.softLabel}
            </span>
            <span className="font-mono text-xs text-faint">{inv.type}</span>
            <span className="flex-1">{inv.claimed}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
