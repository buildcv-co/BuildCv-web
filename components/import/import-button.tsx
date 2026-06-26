"use client";

import { useCallback, useRef, useState } from "react";
import { ImportError, requestImport } from "@/lib/api/import";
import type { ImportResult } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { FileUpload } from "./file-upload";
import { ImportErrorPanel } from "./import-error-panel";

const STORAGE_KEY_CV_PRESEED = "buildcv:analizar:cv-preseed";

type Status = "idle" | "loading" | "success" | "error";

export function ImportButton({
  editorAvailable = false,
}: {
  editorAvailable?: boolean;
}) {
  const manualTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorState, setErrorState] = useState<ImportError | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");

  const goToAnalyze = useCallback((text: string) => {
    if (typeof window !== "undefined" && text.trim().length > 0) {
      window.localStorage.setItem(STORAGE_KEY_CV_PRESEED, text.trim());
    }
    window.location.href = "/analizar";
  }, []);

  const run = useCallback(async (file: File) => {
    setStatus("loading");
    setErrorState(null);
    setResult(null);
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
    goToAnalyze(manualText);
  }, [goToAnalyze, manualText]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorState(null);
    setPendingFile(null);
    setManualText("");
  }, []);

  const isLoading = status === "loading";

  return (
    <div className="space-y-8">
      {status === "success" && result ? (
        <section
          aria-live="polite"
          className="space-y-5 rounded-2xl border border-line bg-surface/30 p-6"
        >
          <header className="space-y-1">
            <h2 className="font-display text-2xl">{copy.import.states.success}</h2>
            <p className="text-sm text-muted">
              {copy.import.successPreview}
            </p>
          </header>

          <pre
            data-testid="import-result-text"
            className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 text-sm"
          >
            {result.text.slice(0, 800)}
            {result.text.length > 800 ? "…" : ""}
          </pre>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => goToAnalyze(result.text)}
              className="rounded-full bg-accent px-7 py-3 text-sm font-medium text-accent-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.import.buttonAnalyze}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-full border border-line px-7 py-3 text-sm font-medium text-ink transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.import.buttonUploadAnother}
            </button>
          </div>

          {editorAvailable && (
            <p className="text-xs text-faint">{copy.import.handoffHint}</p>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-xl">{copy.import.uploadTitle}</h2>
            <p className="text-sm text-muted">{copy.import.uploadDescription}</p>
            <FileUpload onFileSelected={onFileSelected} disabled={isLoading} />
            {status === "loading" && pendingFile && (
              <div
                aria-live="polite"
                aria-busy="true"
                className="space-y-2 rounded-xl border border-line bg-surface/30 p-4 text-sm"
              >
                <p className="font-medium">{copy.import.states.loading}</p>
                <p className="font-mono text-xs text-faint">{pendingFile.name}</p>
              </div>
            )}
          </section>

          {status === "error" && errorState && (
            <ImportErrorPanel
            error={errorState}
            onRetry={pendingFile ? onRetry : undefined}
            onManualFallback={() => manualTextareaRef.current?.focus()}
          />
          )}

          <section className="space-y-3 rounded-2xl border border-line bg-surface/30 p-5">
            <h2 className="font-display text-xl">{copy.import.page.manualFallbackTitle}</h2>
            <p className="text-sm text-muted">{copy.import.page.manualFallbackDescription}</p>
            <textarea
              ref={manualTextareaRef}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={8}
              className="w-full rounded-2xl border border-line bg-surface/30 p-3 text-sm"
              placeholder={copy.analyze.cvPlaceholder}
            />
            <button
              type="button"
              disabled={manualText.trim().length === 0 || isLoading}
              onClick={onManualContinue}
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.import.page.manualFallbackContinue}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
