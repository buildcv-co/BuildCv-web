"use client";

import { useId, useRef, useState } from "react";
import { copy } from "@/lib/copy/es";

/**
 * Modal ARCO Cancel (PR6b — T-PR6-009..011).
 * Spec: REQ-FN-016 + Art. V (double-confirmation).
 * Native `<dialog open>` + type-email-to-confirm (case-insensitive).
 * NO loguea email (Art. III / NFR-OBS-1).
 */
export interface ArcoCancelModalProps {
  userEmail: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

function emailsMatch(input: string, expected: string): boolean {
  return input.trim().toLowerCase() === expected.trim().toLowerCase();
}

export function ArcoCancelModal({
  userEmail,
  onConfirm,
  onCancel,
}: ArcoCancelModalProps): React.ReactElement {
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputId = useId();

  const canConfirm = emailsMatch(confirmEmail, userEmail) && !isSubmitting;

  const handleConfirm = async (): Promise<void> => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    dialogRef.current?.close();
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      open
      aria-labelledby="arco-cancel-title"
      aria-describedby="arco-cancel-desc"
      data-testid="arco-cancel-modal"
      className="rounded-lg border border-line bg-surface p-6 text-foreground shadow-lg"
    >
      <h2
        id="arco-cancel-title"
        className="font-display text-xl"
        data-testid="arco-cancel-title"
      >
        {copy.account.arco.cancel.modalTitle}
      </h2>
      <p
        id="arco-cancel-desc"
        className="mt-3 text-sm"
        data-testid="arco-cancel-body"
      >
        {copy.account.arco.cancel.modalBody}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm">
          {copy.account.arco.cancel.emailHelp(userEmail)}
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="off"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          disabled={isSubmitting}
          data-testid="arco-confirm-email"
          className="rounded border border-line bg-background px-3 py-2 text-sm"
        />
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {isSubmitting ? copy.account.arco.cancel.confirm : ""}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSubmitting}
          data-testid="arco-cancel-button"
          className="rounded border border-line bg-surface px-4 py-2 text-sm hover:bg-background"
        >
          {copy.account.arco.cancel.cancel}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleConfirm();
          }}
          disabled={!canConfirm}
          data-testid="arco-confirm-button"
          className="rounded bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800 disabled:opacity-50"
        >
          {copy.account.arco.cancel.confirm}
        </button>
      </div>
    </dialog>
  );
}