"use client";

import { useCallback, useId, useState } from "react";
import { ALLOWED_MIMES, validateFile } from "@/lib/api/import";
import type { ValidateFileResult } from "@/lib/api/import";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

const ACCEPT_ATTR = ALLOWED_MIMES.join(",");

function messageForReason(reason: string): string {
  if (reason.toLowerCase().includes("vacío")) return copy.import.errors.clientValidation;
  if (reason.includes("5 MB")) return copy.import.errors.tooLarge;
  if (reason.includes("PDF o DOCX")) return copy.import.errors.unsupportedMime;
  return reason;
}

export function FileUpload({
  onFileSelected,
  disabled = false,
}: {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const hintId = "file-upload-hint";

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      const validation: ValidateFileResult = validateFile(file);
      if (!validation.ok) {
        setError(messageForReason(validation.reason));
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer?.files?.[0];
      handleFile(file);
    },
    [disabled, handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  }, []);

  const onDragEnter = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      if (disabled) return;
      setDragActive(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        aria-describedby={hintId}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        data-testid="file-upload-dropzone"
        data-drag-active={dragActive ? "true" : "false"}
        aria-disabled={disabled || undefined}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition",
          "border-line bg-surface/30 hover:border-muted",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
          dragActive && "border-accent bg-accent/5",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span aria-hidden="true" className="font-display text-lg">
          {copy.import.page.dragHere}
        </span>
        <span aria-hidden="true" className="text-sm text-muted">
          {copy.import.page.or}
        </span>
        <span aria-hidden="true" className="text-sm text-muted">
          {copy.import.page.clickToSelect}
        </span>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <p id={hintId} className="text-xs text-faint">
        {copy.import.page.dragHereHint}
      </p>
      {error && (
        <p role="alert" className="text-sm text-missing">
          {error}
        </p>
      )}
    </div>
  );
}
