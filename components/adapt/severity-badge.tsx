import type { Severity, ValidationReport } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

const toneBySeverity: Record<Severity, string> = {
  None: "border-present/40 bg-present/10 text-present",
  Warning: "border-partial/40 bg-partial/10 text-partial",
  Critical: "border-missing/40 bg-missing/10 text-missing",
};

const labelBySeverity: Record<Severity, string> = {
  None: "Sin invenciones",
  Warning: "Advertencia",
  Critical: "Atención",
};

const severityLabel: Record<Severity, string> = {
  None: copy.adapt.severity.none,
  Warning: copy.adapt.severity.warning,
  Critical: copy.adapt.severity.critical,
};

export function SeverityBadge({ report }: { report: ValidationReport }) {
  const { severity, inventions } = report;
  const count = inventions.length;
  const showCount = count > 0;
  return (
    <div
      role="status"
      aria-label={`${labelBySeverity[severity]}: ${severityLabel[severity]}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        toneBySeverity[severity],
      )}
    >
      <span>{labelBySeverity[severity]}</span>
      {showCount && (
        <span className="font-mono tabular-nums" aria-hidden="true">
          · {count}
        </span>
      )}
    </div>
  );
}
