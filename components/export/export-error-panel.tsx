import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import type { ExportError } from "@/lib/api/export";

export function ExportErrorPanel({
  error,
  onRegenerate,
  onRetry,
}: {
  error: ExportError;
  onRegenerate: () => void;
  onRetry: () => void;
}) {
  const showRegenerate = error.kind === "invention";
  const showRetry = error.kind === "unavailable";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="space-y-3 rounded-xl border border-missing/40 bg-missing/10 p-4 text-sm text-missing"
    >
      <p>{error.message}</p>
      {showRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className={cn(
            "rounded-full px-5 py-2 text-sm font-medium transition",
            "border border-partial/40 bg-partial/10 text-partial hover:border-partial/60 hover:bg-partial/15",
          )}
        >
          {copy.adapt.cta.regenerate}
        </button>
      )}
      {showRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "rounded-full px-5 py-2 text-sm font-medium transition",
            "border border-missing/40 bg-missing/10 text-missing hover:border-missing/60 hover:bg-missing/15",
          )}
        >
          {copy.export.retry}
        </button>
      )}
    </div>
  );
}
