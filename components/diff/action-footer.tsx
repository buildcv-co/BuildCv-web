"use client";

import { useEffect, useId, useState } from "react";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import type { EntityInvention } from "@/lib/api/types";

export interface ActionFooterProps {
  readonly inventions: ReadonlyArray<EntityInvention>;
  readonly onAcceptExport: () => void;
  readonly onEditInEditor: () => void;
  readonly onReject: () => void;
}

export function ActionFooter({
  inventions,
  onAcceptExport,
  onEditInEditor,
  onReject,
}: ActionFooterProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [modalOpen]);

  const hardCount = inventions.filter((i) => i.severity === "Hard").length;

  const onAcceptClick = () => {
    if (hardCount > 0) {
      setModalOpen(true);
      return;
    }
    onAcceptExport();
  };

  return (
    <div
      role="toolbar"
      aria-label="Acciones finales del diff"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/30 p-3"
    >
      <button
        type="button"
        onClick={onAcceptClick}
        className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink hover:brightness-110"
      >
        {copy.diff.actions.accept}
      </button>
      <button
        type="button"
        onClick={onEditInEditor}
        className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-muted"
      >
        {copy.diff.actions.edit}
      </button>
      <button
        type="button"
        onClick={onReject}
        className="rounded-full border border-missing/40 bg-missing/10 px-4 py-2 text-sm font-medium text-missing hover:border-missing/60"
      >
        {copy.diff.actions.reject}
      </button>

      {modalOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
        >
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 text-ink">
            <h2 id={titleId} className={cn("font-display text-xl")}>
              {copy.diff.modal.hardTitle}
            </h2>
            <p id={descId} className="text-sm text-muted">
              {copy.diff.modal.hardDetail.replace("{count}", String(hardCount))}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-muted"
              >
                {copy.diff.actions.reviewFirst}
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  onAcceptExport();
                }}
                className="rounded-full border border-missing/40 bg-missing/10 px-4 py-2 text-sm font-medium text-missing hover:border-missing/60"
              >
                {copy.diff.actions.acceptAnyway}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
