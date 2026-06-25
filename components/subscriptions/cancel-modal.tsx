"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

type CancelModalProps = {
  open: boolean;
  accessUntil: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function CancelModal({ open, accessUntil, onClose, onConfirm }: CancelModalProps) {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const headingId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm();
    } catch {
      setErrorMessage(copy.subscription.errorCancel);
    } finally {
      setSubmitting(false);
    }
  }, [onConfirm]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      data-testid="cancel-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl border border-line bg-bg p-6 shadow-2xl focus:outline-none"
      >
        <h2 id={headingId} className="font-display text-2xl text-fg">
          {copy.subscription.confirmCancelTitle}
        </h2>
        <p className="mt-2 text-sm text-fg/80">{copy.subscription.confirmCancelBody}</p>

        {accessUntil && (
          <p className="mt-3 rounded-xl border border-line bg-surface/40 px-3 py-2 text-sm text-fg/80">
            {copy.subscription.accessUntil.replace("{date}", accessUntil)}
          </p>
        )}

        <p className="mt-3 text-xs text-warning">{copy.subscription.noRefund}</p>

        {errorMessage && (
          <p
            id={errorId}
            role="alert"
            aria-live="assertive"
            className={cn(
              "mt-3 rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-sm text-error",
            )}
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium text-fg transition hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {copy.subscription.confirmCancelKeep}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-xl bg-error px-4 py-2 text-sm font-medium text-bg transition hover:bg-error/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-60"
          >
            {submitting ? "…" : copy.subscription.confirmCancelConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}