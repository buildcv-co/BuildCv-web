"use client";

import { useCallback, useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
      }
    },
    [disabled, openPicker],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer?.files?.[0];
      handleFile(file);
    },
    [disabled, handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const onDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      setDragActive(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const hintId = "file-upload-hint";

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Cargar CV en PDF o DOCX"
        aria-describedby={hintId}
        onClick={openPicker}
        onKeyDown={onKeyDown}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        data-testid="file-upload-dropzone"
        data-drag-active={dragActive ? "true" : "false"}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition",
          "border-line bg-surface/30 hover:border-muted",
          dragActive && "border-accent bg-accent/5",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <p aria-hidden="true" className="font-display text-lg">
          {copy.import.page.dragHere}
        </p>
        <p aria-hidden="true" className="text-sm text-muted">
          {copy.import.page.or}
        </p>
        <p aria-hidden="true" className="text-sm text-muted">
          {copy.import.page.clickToSelect}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
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
