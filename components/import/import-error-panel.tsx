import type { ImportError } from "@/lib/api/import";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

const SHOW_RETRY: Record<ImportError["kind"], boolean> = {
  network: false,
  client_validation: false,
  too_large: false,
  unsupported_mime: false,
  validation: false,
  engine: true,
  rate_limit: false,
  unknown: false,
};

export function ImportErrorPanel({
  error,
  onRetry,
}: {
  error: ImportError;
  onRetry?: () => void;
}) {
  const showRetry = SHOW_RETRY[error.kind] && typeof onRetry === "function";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="space-y-3 rounded-xl border border-missing/40 bg-missing/10 p-4 text-sm text-missing"
    >
      <p>{error.message}</p>
      {showRetry && onRetry && (
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
