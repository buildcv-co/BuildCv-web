"use client";

import { useCallback, useState } from "react";
import { ImportError, requestImport } from "@/lib/api/import";
import type { ImportResult } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { FileUpload } from "./file-upload";
import { ImportErrorPanel } from "./import-error-panel";
import { ImportResultPanel } from "./import-result-panel";

const STORAGE_KEY_CV_PRESEED = "buildcv:analizar:cv-preseed";

type Status = "idle" | "loading" | "success" | "error";

export function ImportButton({
  editorAvailable = false,
}: {
  editorAvailable?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorState, setErrorState] = useState<ImportError | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualText, setManualText] = useState("");

  const run = useCallback(async (file: File) => {
    setStatus("loading");
    setErrorState(null);
    setResult(null);
    setShowManualFallback(false);
    try {
      const r = await requestImport(file);
      setResult(r);
      setStatus("success");
    } catch (caught) {
      if (caught instanceof ImportError) {
        setErrorState(caught);
      } else {
        setErrorState(
          new ImportError({
            status: 0,
            code: "UNKNOWN",
            kind: "unknown",
            message: copy.import.errors.unknown,
          }),
        );
      }
      setStatus("error");
    }
  }, []);

  const onFileSelected = useCallback(
    (file: File) => {
      setPendingFile(file);
      void run(file);
    },
    [run],
  );

  const onRetry = useCallback(() => {
    if (pendingFile) {
      void run(pendingFile);
    }
  }, [pendingFile, run]);

  const onManualContinue = useCallback(() => {
    const trimmed = manualText.trim();
    if (trimmed.length === 0) return;
    window.localStorage.setItem(STORAGE_KEY_CV_PRESEED, trimmed);
    window.location.href = "/analizar";
  }, [manualText]);

  const isLoading = status === "loading";
  const canShowFallback = status !== "success" && status !== "loading";

  return (
    <div className="space-y-5">
      {status !== "success" && (
        <FileUpload onFileSelected={onFileSelected} disabled={isLoading} />
      )}

      {canShowFallback && !showManualFallback && (
        <button
          type="button"
          onClick={() => setShowManualFallback(true)}
          className="text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copy.import.page.manualFallbackCta}
        </button>
      )}

      {canShowFallback && showManualFallback && (
        <div className="space-y-3 rounded-2xl border border-line bg-surface/30 p-5">
          <h2 className="font-display text-xl">
            {copy.import.page.manualFallbackTitle}
          </h2>
          <p className="text-sm text-muted">
            {copy.import.page.manualFallbackDescription}
          </p>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={10}
            className="w-full rounded-2xl border border-line bg-surface/30 p-3 text-sm"
            placeholder={copy.analyze.cvPlaceholder}
          />
          <button
            type="button"
            disabled={manualText.trim().length === 0}
            onClick={onManualContinue}
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.import.page.manualFallbackContinue}
          </button>
        </div>
      )}

      {status === "loading" && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="space-y-2 rounded-xl border border-line bg-surface/30 p-4 text-sm"
        >
          <p className="font-medium">{copy.import.states.loading}</p>
          {pendingFile && (
            <p className="font-mono text-xs text-faint">{pendingFile.name}</p>
          )}
        </div>
      )}

      {status === "success" && result && (
        <ImportResultPanel
          result={result}
          onUseInEditor={() => {
            // handoff al editor (006) — cuando esté implementado, aquí va
            // setEditorHandoff({ ... }) + router.push("/editor?traceId=...")
            // Por ahora, no-op (006 no existe).
          }}
          editorAvailable={editorAvailable}
        />
      )}

      {status === "error" && errorState && (
        <ImportErrorPanel
          error={errorState}
          onRetry={pendingFile ? onRetry : undefined}
          onManualFallback={() => setShowManualFallback(true)}
        />
      )}
    </div>
  );
}
