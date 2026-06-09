"use client";

import { useCallback, useState } from "react";
import { AdaptError, requestAdapt } from "@/lib/api/adapt";
import type { AdaptationResult } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import { AdaptedCvViewer } from "./adapted-cv-viewer";
import { DeltaImprovements } from "./delta-improvements";
import { RegenerateButton } from "./regenerate-button";
import { SeverityBadge } from "./severity-badge";

type Status = "idle" | "loading" | "success" | "error";

interface ErrorState {
  kind: AdaptError["kind"];
  message: string;
  showRegenerate: boolean;
}

const REGENERATE_STATUSES = new Set<number>([422]);

export function AdaptPanel({ cvText, jobText }: { cvText: string; jobText: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AdaptationResult | null>(null);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  const canRun = cvText.trim().length > 0 && jobText.trim().length > 0;

  const run = useCallback(async () => {
    setStatus("loading");
    setErrorState(null);
    try {
      const r = await requestAdapt({ cvText, jobText });
      setResult(r);
      setStatus("success");
    } catch (caught) {
      if (caught instanceof AdaptError) {
        const showRegenerate = REGENERATE_STATUSES.has(caught.status);
        setErrorState({
          kind: caught.kind,
          message: caught.message,
          showRegenerate,
        });
      } else {
        setErrorState({
          kind: "unknown",
          message: copy.adapt.errors.generic,
          showRegenerate: false,
        });
      }
      setStatus("error");
    }
  }, [cvText, jobText]);

  const isLoading = status === "loading";

  return (
    <section
      aria-label={copy.adapt.panel.title}
      className="space-y-5 rounded-2xl border border-line bg-surface/30 p-6"
    >
      <header className="space-y-1">
        <h2 className="font-display text-2xl">{copy.adapt.panel.title}</h2>
        <p className="text-sm text-muted">{copy.adapt.panel.description}</p>
      </header>

      {status === "success" && result && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <SeverityBadge report={result.validation} />
            <span className="font-mono text-xs text-faint">
              {copy.result.sealedWith} {copy.result.engine} {result.engineVersion}
            </span>
          </div>
          <AdaptedCvViewer adaptedCv={result.adaptedCv} />
          <DeltaImprovements inventions={result.validation.inventions} />
        </div>
      )}

      {status === "error" && errorState && (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-missing/40 bg-missing/10 p-4 text-sm text-missing"
        >
          <p>{errorState.message}</p>
          {errorState.showRegenerate && (
            <RegenerateButton onClick={run} loading={isLoading} />
          )}
        </div>
      )}

      {status !== "success" && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={!canRun || isLoading}
            aria-busy={isLoading}
            className={cn(
              "rounded-full px-6 py-2.5 text-sm font-medium transition",
              canRun && !isLoading
                ? "bg-accent text-accent-ink hover:brightness-110"
                : "cursor-not-allowed bg-surface-2 text-faint",
            )}
          >
            {isLoading ? copy.adapt.panel.buttonLoading : copy.adapt.panel.button}
          </button>
        </div>
      )}
    </section>
  );
}
