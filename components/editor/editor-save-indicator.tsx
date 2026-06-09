import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export type EditorSaveState = "saved" | "saving" | "dirty" | "error";

const STATE_LABEL: Record<EditorSaveState, string> = {
  saved: copy.editor.toolbar.saved,
  saving: copy.editor.toolbar.saving,
  dirty: copy.editor.toolbar.dirty,
  error: "",
};

const STATE_TONE: Record<EditorSaveState, string> = {
  saved: "text-present",
  saving: "text-muted",
  dirty: "text-partial",
  error: "text-missing",
};

export function EditorSaveIndicator({
  state,
  errorMessage,
}: {
  state: EditorSaveState;
  errorMessage?: string;
}) {
  const label = state === "error" ? errorMessage ?? "" : STATE_LABEL[state];
  return (
    <div
      aria-live="polite"
      data-state={state}
      className={cn(
        "inline-flex items-center gap-2 text-xs font-medium",
        STATE_TONE[state],
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      <span>{label}</span>
    </div>
  );
}
