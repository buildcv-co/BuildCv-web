"use client";

import { useState } from "react";
import { JobSpecForm } from "@/components/analyzer/job-spec-form";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import type { JobSpec } from "@/lib/job/job-spec";

const CV_MIN = 200;

const textareaClasses =
  "w-full resize-y rounded-xl border border-line bg-surface/50 p-4 text-sm leading-relaxed text-ink outline-none transition placeholder:text-faint focus:border-accent/60 focus:bg-surface";

const ghostButton =
  "rounded-full border border-line px-5 py-3 text-sm text-ink transition hover:border-muted hover:bg-surface";

/**
 * InputPanel — punto de entrada del analyzer (PR 5b).
 *
 * Compone el form del CV (textarea libre, mientras el editor v2 no esté
 * cableado al analyzer) con el `JobSpecForm` obligatorio (PR 5a) para la
 * vacante. El submit del analyzer se habilita cuando el `cvText` cumple
 * `CV_MIN` (200 chars) Y el `job: JobSpec` es válido (delegación al
 * JobSpecForm + su schema Zod).
 *
 * Estructura:
 *  - NO usamos un `<form>` envolvente. El `JobSpecForm` ya tiene su propio
 *    `<form>` con submit interno; anidarlos genera HTML inválido (los
 *    browsers auto-cierran el form externo). El submit del analyzer es un
 *    botón `type="button"` con `onClick` que valida `canSubmit` y dispara
 *    `onSubmit({ cvText, job })` — patrón equivalente al form submit
 *    pero sin nesting inválido.
 *
 * Flujo UX:
 *  1. Usuario llena los campos del `JobSpecForm` + el textarea del CV.
 *  2. Click en el "Analizar" interno del `JobSpecForm` → valida con Zod
 *     → llama `onJob(job)` → InputPanel guarda el `JobSpec`.
 *  3. El "Analizar" del analyzer se habilita.
 *  4. Click en el "Analizar" del analyzer → `onSubmit({ cvText, job })`
 *     con el `JobSpec` tipado (no `jobText: string` legacy).
 */
export function InputPanel({
  cvText,
  job,
  onCv,
  onJob,
  onSubmit,
  onExample,
  onClear,
  loading,
  error,
}: {
  cvText: string;
  job: JobSpec | null;
  onCv: (value: string) => void;
  onJob: (value: JobSpec) => void;
  onSubmit: (payload: { cvText: string; job: JobSpec }) => void;
  onExample: () => void;
  onClear: () => void;
  loading: boolean;
  error: string | null;
}) {
  const [pendingJob, setPendingJob] = useState<JobSpec | null>(job);

  const cvLen = cvText.trim().length;
  const cvOk = cvLen >= CV_MIN;
  // El submit del analyzer exige CV mínimo + JobSpec pre-cargado (el
  // JobSpecForm tiene su propio submit interno que llama `onJob(...)`
  // solo cuando el schema valida — `pendingJob` siempre será válido
  // cuando llegue acá).
  const canSubmit = cvOk && pendingJob !== null && !loading;

  const handleAnalyze = () => {
    if (canSubmit && pendingJob) {
      onSubmit({ cvText, job: pendingJob });
    }
  };

  return (
    <div className="rise space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-medium">{copy.analyze.cvLabel}</span>
            <span className={cn("font-mono text-xs", cvOk ? "text-present" : "text-faint")}>
              {cvLen} / mín {CV_MIN}
            </span>
          </div>
          <textarea
            data-testid="analyzer-cv-textarea"
            value={cvText}
            onChange={(event) => onCv(event.target.value)}
            placeholder={copy.analyze.cvPlaceholder}
            rows={15}
            className={textareaClasses}
            aria-label={copy.analyze.cvLabel}
          />
        </label>

        <div className="block">
          <JobSpecForm
            initial={pendingJob ?? undefined}
            onSubmit={(submitted) => {
              setPendingJob(submitted);
              onJob(submitted);
            }}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-missing/40 bg-missing/10 px-4 py-3 text-sm text-missing">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="analyzer-submit"
            disabled={!canSubmit}
            onClick={handleAnalyze}
            className={cn(
              "rounded-full px-7 py-3 font-medium transition",
              canSubmit
                ? "bg-accent text-accent-ink hover:brightness-110"
                : "cursor-not-allowed bg-surface-2 text-faint",
            )}
          >
            {loading ? copy.analyze.analyzing : copy.analyze.submit}
          </button>
          <button type="button" onClick={onExample} className={ghostButton}>
            {copy.analyze.tryExample}
          </button>
          <button type="button" onClick={onClear} className={ghostButton}>
            {copy.analyze.clear}
          </button>
        </div>
        <p className="text-xs text-faint sm:ml-auto">{copy.analyze.privacy}</p>
      </div>
    </div>
  );
}