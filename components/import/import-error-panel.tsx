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

function isScannedPdf(error: ImportError): boolean {
  return error.code === "IMPORT_SCANNED_PDF";
}

export function ImportErrorPanel({
  error,
  onRetry,
  onManualFallback,
}: {
  error: ImportError;
  onRetry?: () => void;
  onManualFallback?: () => void;
}) {
  const showRetry = SHOW_RETRY[error.kind] && typeof onRetry === "function";
  const showManualFallback =
    (error.kind === "engine" || isScannedPdf(error)) &&
    typeof onManualFallback === "function";
  const message = isScannedPdf(error)
    ? copy.import.errors.scannedPdfDetailed
    : error.message;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="space-y-3 rounded-xl border border-missing/40 bg-missing/10 p-4 text-sm text-missing"
    >
      <p>{message}</p>
      <div className="flex flex-wrap gap-3">
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
        {showManualFallback && onManualFallback && (
          <button
            type="button"
            onClick={onManualFallback}
            className="rounded-full px-5 py-2 text-sm font-medium text-missing underline-offset-4 transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copy.import.page.manualFallbackCta}
          </button>
        )}
      </div>
    </div>
  );
}
