"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AdaptError, requestAdapt } from "@/lib/api/adapt";
import { fetchBalance } from "@/lib/api/credits";
import type { AdaptationResult } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import { ExportButton } from "@/components/export/export-button";
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

function hasHardInvention(
  inventions: ReadonlyArray<{ severity: "Soft" | "Hard" }>,
): boolean {
  return inventions.some((i) => i.severity === "Hard");
}

export function AdaptPanel({ cvText, jobText }: { cvText: string; jobText: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AdaptationResult | null>(null);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const canRun = cvText.trim().length > 0 && jobText.trim().length > 0;

  const run = useCallback(async () => {
    setStatus("loading");
    setErrorState(null);
    setShowPaymentModal(false);
    try {
      const r = await requestAdapt({ cvText, jobText });
      setResult(r);
      setStatus("success");
      try {
        await fetchBalance();
      } catch {
        // ignore badge refresh failure — adaptation succeeded
      }
    } catch (caught) {
      if (caught instanceof AdaptError) {
        const showRegenerate = REGENERATE_STATUSES.has(caught.status);
        setErrorState({
          kind: caught.kind,
          message: caught.message,
          showRegenerate,
        });
        if (caught.kind === "payment_required") {
          setShowPaymentModal(true);
        }
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

  const dismissPaymentModal = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

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
          {hasHardInvention(result.validation.inventions) ? (
            <div
              role="alert"
              className="space-y-3 rounded-xl border border-missing/40 bg-missing/10 p-4 text-sm text-missing"
            >
              <p className="font-medium">{copy.adapt.exportGate.title}</p>
              <p className="text-missing/90">
                {copy.adapt.exportGate.detail.replace(
                  "{count}",
                  String(
                    result.validation.inventions.filter((i) => i.severity === "Hard").length,
                  ),
                )}
              </p>
              <RegenerateButton
                onClick={run}
                loading={isLoading}
                label={copy.adapt.exportGate.regenerate}
              />
            </div>
          ) : (
            <ExportButton
              request={{
                adaptedCv: result.adaptedCv,
                validation: result.validation,
                candidateName: "Candidato",
              }}
              onRegenerate={run}
            />
          )}
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

      {showPaymentModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-required-title"
          data-testid="payment-required-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div
            className={cn(
              "w-full max-w-md space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl",
            )}
          >
            <h3 id="payment-required-title" className="font-display text-xl">
              {copy.adapt.paymentRequired.title}
            </h3>
            <p className="text-sm text-muted">{copy.adapt.paymentRequired.detail}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/pricing"
                data-testid="payment-required-buy-link"
                className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink hover:brightness-110"
              >
                {copy.adapt.paymentRequired.buy}
              </Link>
              <button
                type="button"
                onClick={dismissPaymentModal}
                data-testid="payment-required-cancel"
                className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-medium text-muted hover:bg-surface-2"
              >
                {copy.adapt.paymentRequired.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {status !== "success" && (
        <div className="space-y-2">
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
            <span className="font-mono text-xs text-faint">
              {copy.adapt.panel.buttonHint}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
