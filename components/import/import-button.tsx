"use client";

import { useCallback, useState } from "react";
import { ImportError, requestImport } from "@/lib/api/import";
import type { ImportResult } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { FileUpload } from "./file-upload";
import { ImportErrorPanel } from "./import-error-panel";
import { ImportResultPanel } from "./import-result-panel";

type Status = "idle" | "loading" | "success" | "error";

export function ImportButton({
  editorAvailable = false,
}: {
  editorAvailable?: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorState, setErrorState] = useState<ImportError | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const run = useCallback(async (file: File) => {
    setStatus("loading");
    setErrorState(null);
    setResult(null);
    try {
      const r = await requestImport(file);
      setResult(r);
      setStatus("success");
    } catch (caught) {
      if (caught instanceof ImportError) {
        setErrorState(caught);
      } else {
        setErrorState(
          new ImportError({
            status: 0,
            code: "UNKNOWN",
            kind: "unknown",
            message: copy.import.errors.unknown,
          }),
        );
      }
      setStatus("error");
    }
  }, []);

  const onFileSelected = useCallback(
    (file: File) => {
      setPendingFile(file);
      void run(file);
    },
    [run],
  );

  const isLoading = status === "loading";

  return (
    <div className="space-y-5">
      {status !== "success" && (
        <FileUpload onFileSelected={onFileSelected} disabled={isLoading} />
      )}

      {status === "loading" && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="space-y-2 rounded-xl border border-line bg-surface/30 p-4 text-sm"
        >
          <p className="font-medium">{copy.import.states.loading}</p>
          {pendingFile && (
            <p className="font-mono text-xs text-faint">{pendingFile.name}</p>
          )}
        </div>
      )}

      {status === "success" && result && (
        <ImportResultPanel
          result={result}
          onUseInEditor={() => {
            // handoff al editor (006) — cuando esté implementado, aquí va
            // setEditorHandoff({ ... }) + router.push("/editor?traceId=...")
            // Por ahora, no-op (006 no existe).
          }}
          editorAvailable={editorAvailable}
        />
      )}

      {status === "error" && errorState && (
        <ImportErrorPanel
          error={errorState}
          onRetry={
            pendingFile ? () => void run(pendingFile) : undefined
          }
        />
      )}
    </div>
  );
}
