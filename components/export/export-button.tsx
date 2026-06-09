"use client";

import { useCallback, useState } from "react";
import { ExportError, downloadBlob, requestExportPdf } from "@/lib/api/export";
import type { ExportErrorKind, ExportRequest } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import { ExportErrorPanel } from "./export-error-panel";
import { FilenameHint } from "./filename-hint";

type Status = "idle" | "loading" | "downloading" | "success" | "error";

interface ErrorState {
  kind: ExportErrorKind;
  message: string;
}

function buildFilename(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return copy.export.filenameHint.replace("{date}", `${yyyy}-${mm}-${dd}`);
}

const STATUS_FROM_KIND: Record<ExportErrorKind, number> = {
  network: 0,
  validation: 400,
  invention: 422,
  rate_limit: 429,
  unavailable: 503,
  unknown: 500,
};

export function ExportButton({
  request,
  onRegenerate,
  disabled = false,
}: {
  request: ExportRequest;
  onRegenerate: () => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  const run = useCallback(async () => {
    setStatus("loading");
    setErrorState(null);
    try {
      const blob = await requestExportPdf(request);
      setStatus("downloading");
      downloadBlob(blob, buildFilename(new Date()));
      setStatus("success");
    } catch (caught) {
      if (caught instanceof ExportError) {
        setErrorState({ kind: caught.kind, message: caught.message });
      } else {
        setErrorState({
          kind: "unknown",
          message: copy.export.errors.generic,
        });
      }
      setStatus("error");
    }
  }, [request]);

  const isLoading = status === "loading" || status === "downloading";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={disabled || isLoading}
          aria-busy={isLoading}
          className={cn(
            "rounded-full px-6 py-2.5 text-sm font-medium transition",
            disabled || isLoading
              ? "cursor-not-allowed bg-surface-2 text-faint"
              : "bg-accent text-accent-ink hover:brightness-110",
          )}
        >
          {isLoading ? copy.export.buttonLoading : copy.export.button}
        </button>
        <FilenameHint date={new Date()} />
      </div>

      {status === "success" && (
        <p
          role="status"
          className="text-xs text-present"
          data-testid="export-success"
        >
          {copy.export.success}
        </p>
      )}

      {status === "error" && errorState && (
        <ExportErrorPanel
          error={
            new ExportError({
              status: STATUS_FROM_KIND[errorState.kind],
              code: "EXPORT",
              kind: errorState.kind,
              message: errorState.message,
            })
          }
          onRegenerate={() => {
            setStatus("idle");
            setErrorState(null);
            onRegenerate();
          }}
          onRetry={run}
        />
      )}
    </div>
  );
}
