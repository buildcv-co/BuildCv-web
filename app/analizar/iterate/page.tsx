"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy/es";
import {
  IterationResultCard,
  type IterationResultStatus,
  type IterationResultViewModel,
} from "@/components/iterations/iteration-result-card";
import { IterationProgress } from "@/components/iterations/iteration-progress";
import { IterationSettings } from "@/components/iterations/iteration-settings";
import {
  IterationStepList,
  type IterationStepViewModel,
} from "@/components/iterations/iteration-step-list";

type IterationStepDto = {
  iterationNumber: number;
  adaptedCvText: string;
  score: number;
  passedArtI: boolean;
  timestamp: string;
};

type IterationResultDto = {
  requestId: string;
  status: string;
  bestStep: IterationStepDto | null;
  allSteps: IterationStepDto[];
  probabilityWarning: string | null;
  creditsConsumed: number;
  partial: boolean;
  completedAt: string;
};

const BFF_ITERATE_PATH = "/api/adapt/iterate";

async function postIteration(body: {
  cvText: string;
  vacancyText: string;
  iterationCount: number;
  probabilityThreshold: number;
}): Promise<IterationResultDto> {
  const response = await fetch(BFF_ITERATE_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(problem.error ?? `HTTP ${response.status}`);
  }

  return (await response.json()) as IterationResultDto;
}

function toResultViewModel(dto: IterationResultDto): IterationResultViewModel {
  return {
    requestId: dto.requestId,
    status: dto.status as IterationResultStatus,
    bestStepText: dto.bestStep?.adaptedCvText ?? null,
    bestScore: dto.bestStep?.score ?? null,
    probabilityWarning: dto.probabilityWarning,
    threshold: 50,
    creditsConsumed: dto.creditsConsumed,
  };
}

function toStepViewModel(step: IterationStepDto): IterationStepViewModel {
  return {
    iterationNumber: step.iterationNumber,
    score: step.score,
    passedArtI: step.passedArtI,
    timestamp: step.timestamp,
  };
}

export default function IteratePage() {
  const router = useRouter();
  const [cvText, setCvText] = useState("");
  const [vacancyText, setVacancyText] = useState("");
  const [iterationCount, setIterationCount] = useState(5);
  const [threshold, setThreshold] = useState(50);
  const [result, setResult] = useState<IterationResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onImprove = useCallback(() => {
    router.push("/editar");
  }, [router]);

  const onExportPdf = useCallback(() => {
    if (!result?.bestStep) return;
    void fetch("/api/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        adaptedCv: result.bestStep.adaptedCvText,
        validation: { isValid: true, severity: "None", inventions: [], warnings: [] },
        candidateName: "",
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cv-adaptado.pdf";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => undefined);
  }, [result]);

  const onSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = await postIteration({
        cvText,
        vacancyText,
        iterationCount,
        probabilityThreshold: threshold,
      });
      setResult(dto);
    } catch (caught) {
      const e = caught as { message?: string };
      setError(e.message ?? copy.iteration.errors.generic);
    } finally {
      setLoading(false);
    }
  }, [cvText, vacancyText, iterationCount, threshold]);

  const cvEmpty = cvText.trim().length === 0;
  const jobEmpty = vacancyText.trim().length === 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <main id="contenido" className="space-y-6">
        <section aria-labelledby="iterate-heading" className="space-y-2">
          <h1 id="iterate-heading" className="font-display text-3xl sm:text-4xl">
            {copy.iteration.title}
          </h1>
          <p className="max-w-2xl text-sm italic text-muted">
            {copy.iteration.subtitle}
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-sm font-medium text-fg">
              CV (texto plano)
            </span>
            <textarea
              data-testid="iterate-cv-input"
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              maxLength={50_000}
              rows={10}
              className="w-full rounded-2xl border border-line bg-surface/30 p-3 text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="block text-sm font-medium text-fg">
              Vacante (texto plano)
            </span>
            <textarea
              data-testid="iterate-vacancy-input"
              value={vacancyText}
              onChange={(e) => setVacancyText(e.target.value)}
              maxLength={20_000}
              rows={10}
              className="w-full rounded-2xl border border-line bg-surface/30 p-3 text-sm"
            />
          </label>
        </section>

        <IterationSettings
          iterationCount={iterationCount}
          threshold={threshold}
          creditsAvailable={null}
          onIterationCountChange={setIterationCount}
          onThresholdChange={setThreshold}
        />

        <button
          type="button"
          data-testid="iterate-submit"
          onClick={() => void onSubmit()}
          disabled={loading || cvEmpty || jobEmpty}
          className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-bg transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.iteration.confirm.confirm}
        </button>

        {loading && (
          <IterationProgress
            current={Math.min(iterationCount, 1)}
            total={iterationCount}
          />
        )}

        {error && (
          <p
            data-testid="iterate-error"
            role="alert"
            className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        {result && (
          <>
            <IterationResultCard
              result={toResultViewModel(result)}
              onExportPdf={result.bestStep ? onExportPdf : undefined}
              onImprove={onImprove}
            />
            <IterationStepList
              steps={result.allSteps.map(toStepViewModel)}
            />
          </>
        )}
      </main>
    </div>
  );
}