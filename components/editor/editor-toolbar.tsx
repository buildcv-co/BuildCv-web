import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export type EditorSaveState = "saved" | "saving" | "dirty" | "error";

export function EditorToolbar({
  onSave,
  onClear,
  onRescore,
  onExportMd,
  hasDraft,
  isSaving = false,
  isRescoring = false,
  isError = false,
}: {
  onSave: () => void;
  onClear: () => void;
  onRescore: () => void;
  onExportMd: () => void;
  hasDraft: boolean;
  isSaving?: boolean;
  isRescoring?: boolean;
  isError?: boolean;
}) {
  const clearDisabled = !hasDraft;
  const allDisabled = isSaving || isRescoring;

  return (
    <div
      role="toolbar"
      aria-label="Acciones del editor"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/30 p-3"
    >
      <button
        type="button"
        onClick={onSave}
        disabled={allDisabled}
        aria-busy={isSaving}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-medium transition",
          isSaving
            ? "bg-surface-2 text-faint"
            : "bg-accent text-accent-ink hover:brightness-110",
        )}
      >
        {isSaving ? copy.editor.toolbar.saving : copy.editor.toolbar.save}
      </button>

      <button
        type="button"
        onClick={onRescore}
        disabled={allDisabled || isError}
        className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-muted disabled:opacity-50"
      >
        {isRescoring
          ? copy.editor.toolbar.rescoreLoading
          : copy.editor.toolbar.rescore}
      </button>

      <button
        type="button"
        onClick={onExportMd}
        disabled={allDisabled}
        className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-muted disabled:opacity-50"
      >
        {copy.editor.toolbar.exportMd}
      </button>

      <button
        type="button"
        onClick={onClear}
        disabled={clearDisabled || allDisabled}
        aria-disabled={clearDisabled}
        className={cn(
          "rounded-full border px-4 py-2 text-sm font-medium transition",
          clearDisabled
            ? "cursor-not-allowed border-line bg-surface-2 text-faint"
            : "border-missing/40 bg-missing/10 text-missing hover:border-missing/60",
        )}
      >
        {copy.editor.toolbar.clear}
      </button>
    </div>
  );
}
