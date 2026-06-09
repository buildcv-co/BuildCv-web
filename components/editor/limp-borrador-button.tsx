"use client";

import { useEffect, useId, useState } from "react";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export function LimpBorradorButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-disabled={disabled}
        className={cn(
          "rounded-full border px-4 py-2 text-sm font-medium transition",
          disabled
            ? "cursor-not-allowed border-line bg-surface-2 text-faint"
            : "border-missing/40 bg-missing/10 text-missing hover:border-missing/60",
        )}
      >
        {copy.editor.toolbar.clear}
      </button>

      {open && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
        >
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 text-ink">
            <h2 id={titleId} className="font-display text-xl">
              {copy.editor.confirm.clearDraft.title}
            </h2>
            <p id={descId} className="text-sm text-muted">
              {copy.editor.confirm.clearDraft.detail}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-muted"
              >
                {copy.editor.confirm.clearDraft.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onConfirm();
                }}
                className="rounded-full border border-missing/40 bg-missing/10 px-4 py-2 text-sm font-medium text-missing hover:border-missing/60"
              >
                {copy.editor.confirm.clearDraft.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
