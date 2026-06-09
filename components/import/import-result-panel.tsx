import type { DetectedSection, ImportResult } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

const CONFIDENCE_TONE: Record<DetectedSection["confidence"], string> = {
  High: "text-present border-present/40 bg-present/10",
  Low: "text-partial border-partial/40 bg-partial/10",
};

const CONFIDENCE_LABEL: Record<DetectedSection["confidence"], string> = {
  High: copy.import.sections.confidenceHigh,
  Low: copy.import.sections.confidenceLow,
};

export function ImportResultPanel({
  result,
  onUseInEditor,
  editorAvailable = true,
}: {
  result: ImportResult;
  onUseInEditor: () => void;
  editorAvailable?: boolean;
}) {
  return (
    <section
      aria-live="polite"
      className="space-y-5 rounded-2xl border border-line bg-surface/30 p-6"
    >
      <header className="space-y-1">
        <h2 className="font-display text-2xl">{copy.import.states.success}</h2>
        <p className="font-mono text-xs text-faint">
          {copy.result.sealedWith} {copy.result.engine} {result.engineVersion} ·{" "}
          {result.traceId}
        </p>
      </header>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted">
          Texto extraído
        </h3>
        <pre
          data-testid="import-result-text"
          className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-surface p-4 text-sm"
        >
          {result.text}
        </pre>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted">
          {copy.import.sections.title}
        </h3>
        {result.sections.length === 0 ? (
          <p className="text-sm text-muted">{copy.import.sections.empty}</p>
        ) : (
          <ul className="space-y-2">
            {result.sections.map((section) => (
              <li
                key={`${section.heading}-${section.start}-${section.end}`}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <span className="font-medium">{section.heading}</span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs",
                    CONFIDENCE_TONE[section.confidence],
                  )}
                >
                  {CONFIDENCE_LABEL[section.confidence]}
                </span>
                <span className="font-mono text-xs text-faint">
                  [{section.start}–{section.end}]
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted">
          {copy.import.warnings.title}
        </h3>
        {result.warnings.length === 0 ? (
          <p className="text-sm text-muted">{copy.import.warnings.empty}</p>
        ) : (
          <ul
            aria-label={copy.import.warnings.title}
            className="space-y-1 text-sm text-partial"
          >
            {result.warnings.map((w) => (
              <li key={`${w.code}-${w.message}`}>
                <span className="font-mono text-xs">[{w.code}]</span>{" "}
                {w.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={onUseInEditor}
          disabled={!editorAvailable}
          aria-disabled={!editorAvailable}
          aria-label={
            editorAvailable
              ? copy.import.buttonUseInEditor
              : "Editor próximamente disponible"
          }
          className={cn(
            "rounded-full px-6 py-2.5 text-sm font-medium transition",
            editorAvailable
              ? "bg-accent text-accent-ink hover:brightness-110"
              : "cursor-not-allowed bg-surface-2 text-faint",
          )}
        >
          {editorAvailable ? copy.import.buttonUseInEditor : "Próximamente"}
        </button>
        {!editorAvailable && (
          <p className="text-xs text-faint">{copy.import.handoffHint}</p>
        )}
      </div>
    </section>
  );
}
