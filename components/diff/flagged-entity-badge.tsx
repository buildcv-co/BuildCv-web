"use client";

import { useEffect, useId, useState } from "react";
import type { FlaggedEntity } from "@/lib/diff/types";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export interface FlaggedEntityBadgeProps {
  readonly flag: FlaggedEntity;
  readonly onEdit?: () => void;
  readonly onKeep?: () => void;
}

export function FlaggedEntityBadge({
  flag,
  onEdit,
  onKeep,
}: FlaggedEntityBadgeProps) {
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

  const isHard = flag.color === "hard";
  const label = `${copy.diff.invention.badgeLabel}. Severidad ${flag.entity.severity}. Término: ${flag.entity.claimed}.`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={isHard ? copy.diff.invention.hardTooltip : copy.diff.invention.softTooltip}
        data-color={flag.color}
        className={cn(
          "mx-0.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 align-baseline text-xs font-medium",
          isHard
            ? "border-red-800 bg-red-950 text-red-50"
            : "border-red-700 bg-red-900/30 text-red-100",
        )}
      >
        {isHard && (
          <span data-icon="x" aria-hidden="true">
            ×
          </span>
        )}
        <span aria-hidden="true">{flag.entity.claimed}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 text-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={titleId} className="font-display text-lg">
              {flag.entity.claimed}
            </h3>
            <dl id={descId} className="space-y-1 text-sm text-muted">
              <div>
                <dt className="inline font-medium">Tipo: </dt>
                <dd className="inline">{flag.entity.type}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Severidad: </dt>
                <dd className="inline">{flag.entity.severity}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Reclamado: </dt>
                <dd className="inline">{flag.entity.claimed}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Original: </dt>
                <dd className="inline">{flag.entity.original ?? "—"}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Posición: </dt>
                <dd className="inline">{flag.entity.position}</dd>
              </div>
            </dl>
            <div className="flex justify-end gap-2 pt-2">
              {onKeep && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onKeep();
                  }}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-muted"
                >
                  {copy.diff.invention.keep}
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onEdit();
                  }}
                  className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:brightness-110"
                >
                  {copy.diff.invention.edit}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
