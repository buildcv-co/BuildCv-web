"use client";

import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

const CV_MIN = 200;
const JOB_MIN = 100;

const textareaClasses =
  "w-full resize-y rounded-xl border border-line bg-surface/50 p-4 text-sm leading-relaxed text-ink outline-none transition placeholder:text-faint focus:border-accent/60 focus:bg-surface";

const ghostButton =
  "rounded-full border border-line px-5 py-3 text-sm text-ink transition hover:border-muted hover:bg-surface";

export function InputPanel({
  cvText,
  jobText,
  onCv,
  onJob,
  onSubmit,
  onExample,
  onClear,
  loading,
  error,
}: {
  cvText: string;
  jobText: string;
  onCv: (value: string) => void;
  onJob: (value: string) => void;
  onSubmit: () => void;
  onExample: () => void;
  onClear: () => void;
  loading: boolean;
  error: string | null;
}) {
  const cvLen = cvText.trim().length;
  const jobLen = jobText.trim().length;
  const cvOk = cvLen >= CV_MIN;
  const jobOk = jobLen >= JOB_MIN;
  const canSubmit = cvOk && jobOk && !loading;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="rise space-y-6"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-medium">{copy.analyze.cvLabel}</span>
            <span className={cn("font-mono text-xs", cvOk ? "text-present" : "text-faint")}>
              {cvLen} / mín {CV_MIN}
            </span>
          </div>
          <textarea
            value={cvText}
            onChange={(event) => onCv(event.target.value)}
            placeholder={copy.analyze.cvPlaceholder}
            rows={15}
            className={textareaClasses}
            aria-label={copy.analyze.cvLabel}
          />
        </label>

        <label className="block">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-medium">{copy.analyze.jobLabel}</span>
            <span className={cn("font-mono text-xs", jobOk ? "text-present" : "text-faint")}>
              {jobLen} / mín {JOB_MIN}
            </span>
          </div>
          <textarea
            value={jobText}
            onChange={(event) => onJob(event.target.value)}
            placeholder={copy.analyze.jobPlaceholder}
            rows={15}
            className={textareaClasses}
            aria-label={copy.analyze.jobLabel}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-missing/40 bg-missing/10 px-4 py-3 text-sm text-missing">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
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
    </form>
  );
}
