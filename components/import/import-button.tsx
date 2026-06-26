"use client";

import { useCallback, useRef, useState } from "react";
import { ImportError, requestImport } from "@/lib/api/import";
import { isImportResultV2, type ImportResult, type ImportResultV2 } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { FileUpload } from "./file-upload";
import { ImportErrorPanel } from "./import-error-panel";

const STORAGE_KEY_CV_PRESEED = "buildcv:analizar:cv-preseed";

/**
 * LocalStorage key para el CvDocument estructurado (PR 2e de 021). Lo escribe
 * el import button cuando el backend devuelve `engineVersion: "2.0.0"`; el
 * editor (006 / PR 4 de 021) lo leerá en lugar de re-parsear el texto plano
 * con `parseCvDocument`. La rama legacy (1.0.0) NO escribe esta key.
 */
const STORAGE_KEY_CV_DOCUMENT = "buildcv:editor:cv-document";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Serializa un CvDocument (JSON Resume) a texto plano determinista para
 * `localStorage["buildcv:analizar:cv-preseed"]`. La ruta /analizar lee ese
 * texto como `cvText` y se lo pasa al `Analyzer` (gate 005). Función pura —
 * Constitution Art. II (mismo CvDocument ⇒ mismo texto).
 *
 * Solo se usa cuando el import devuelve `ImportResult` v1 (legacy
 * `text` + `sections`) O como representación serializada que viaja junto al
 * CvDocument estructurado para no romper el contrato del gate /analizar.
 * Los marcadores de confianza NO se traducen — los preserva el editor en su
 * propio state (PR 4 de 021).
 */
function renderCvDocumentAsText(cv: ImportResultV2["cv"]): string {
  const lines: string[] = [];
  lines.push(cv.basics.name);
  if (cv.basics.email) lines.push(cv.basics.email);
  if (cv.basics.phone) lines.push(cv.basics.phone);
  if (cv.basics.location) lines.push(cv.basics.location);

  for (const work of cv.work) {
    const w = work.entry;
    lines.push("");
    lines.push(`${w.name} — ${w.position} (${w.startDate} – ${w.endDate ?? "actualidad"})`);
    if (w.summary) lines.push(w.summary);
    for (const h of w.highlights ?? []) lines.push(`  • ${h}`);
  }

  for (const edu of cv.education) {
    const e = edu.entry;
    lines.push("");
    lines.push(`${e.institution} — ${e.area ?? e.studyType ?? ""}`);
  }

  if (cv.skills.length > 0) {
    lines.push("");
    lines.push("HABILIDADES");
    lines.push(cv.skills.map((s) => s.entry.name).join(", "));
  }

  return lines.join("\n").trim();
}

function preseedCv(result: ImportResult | ImportResultV2): string {
  return isImportResultV2(result) ? renderCvDocumentAsText(result.cv) : result.text;
}

export function ImportButton({
  editorAvailable = false,
}: {
  editorAvailable?: boolean;
}) {
  const manualTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | ImportResultV2 | null>(null);
  const [errorState, setErrorState] = useState<ImportError | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState("");

  const goToAnalyze = useCallback((text: string) => {
    if (typeof window !== "undefined" && text.trim().length > 0) {
      window.localStorage.setItem(STORAGE_KEY_CV_PRESEED, text.trim());
    }
    window.location.href = "/analizar";
  }, []);

  const persistStructuredPreseed = useCallback((cv: ImportResultV2["cv"]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY_CV_DOCUMENT, JSON.stringify(cv));
    } catch {
      // localStorage quota / serialization error — no rompe el flujo legacy
      // (la key `cv-preseed` ya está escrita con la versión serializada).
    }
  }, []);

  const run = useCallback(async (file: File) => {
    setStatus("loading");
    setErrorState(null);
    setResult(null);
    try {
      const r = await requestImport(file);
      setResult(r);
      if (isImportResultV2(r)) {
        persistStructuredPreseed(r.cv);
      }
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
  }, [persistStructuredPreseed]);

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

  const onAnalyzeClick = useCallback(() => {
    if (!result) return;
    goToAnalyze(preseedCv(result));
  }, [goToAnalyze, result]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setErrorState(null);
    setPendingFile(null);
    setManualText("");
  }, []);

  const isLoading = status === "loading";
  const previewText =
    result && !isImportResultV2(result) ? result.text : null;

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

          {previewText !== null ? (
            <pre
              data-testid="import-result-text"
              className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 text-sm"
            >
              {previewText.slice(0, 800)}
              {previewText.length > 800 ? "…" : ""}
            </pre>
          ) : (
            <div
              data-testid="import-result-structured"
              className="space-y-2 rounded-xl border border-line bg-surface p-4 text-sm"
            >
              <p className="font-medium">
                {isImportResultV2(result) ? result.cv.basics.name : "(sin nombre)"}
              </p>
              <p className="text-muted">
                {isImportResultV2(result) ? result.cv.basics.email : ""}
              </p>
              {isImportResultV2(result) && result.warnings.length > 0 && (
                <ul className="text-xs text-faint">
                  {result.warnings.map((w, i) => (
                    <li key={`${w.code}-${i}`}>
                      {w.severity}: {w.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onAnalyzeClick}
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
