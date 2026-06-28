"use client";

import { useState } from "react";
import { requestScoreV2, type ScoreError, type ScoreOutcome } from "@/lib/api/score";
import {
  isScoreResponseV2,
  type ScoreResponse,
} from "@/lib/api/types";
import type { CvDocument } from "@/lib/job/cv-document";
import type { JobSpec } from "@/lib/job/job-spec";
import { copy } from "@/lib/copy/es";
import { demoCv, demoJobSpec } from "@/lib/utils/demo-data";
import { AdaptPanel } from "@/components/adapt/adapt-panel";
import { ComponentBars } from "./component-bars";
import { FixList } from "./fix-list";
import { HonestyNote } from "./honesty-note";
import { InputPanel } from "./input-panel";
import { KeywordCloud } from "./keyword-cloud";
import { LlmFeedbackPanel } from "./llm-feedback-panel";
import { ScoreGauge } from "./score-gauge";
import { SectionBreakdown } from "./section-breakdown";

const ghostButton =
  "w-full rounded-full border border-line px-5 py-3 text-sm text-ink transition hover:border-muted hover:bg-surface";

/**
 * Construye un `CvDocument` vacío del wire format (`lib/job/cv-document.ts`,
 * el que negocia el BFF con el backend .NET en `kind: "structured"`).
 *
 * Estado transitorio: el analyzer aún no cablea el editor estructurado
 * (PR 4), por lo que no tiene una `CvDocument` real que mandar — solo
 * `cvText`. Hasta que ese cableado exista, enviamos un CvDocument vacío
 * con todos los `confidence: 'inferred'` (Constitution Art. I: cero
 * invención). El backend entonces calculará `perSection` mayormente
 * `null` y `overallScore` cercano a 0; el PR que cablea el editor
 * elimina este helper.
 */
function createEmptyWireCvDocument(): CvDocument {
  return {
    basics: {
      name: "",
      email: "",
      profiles: [],
      confidence: {
        name: "inferred",
        email: "inferred",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    certificates: [],
    languages: [],
    meta: {
      engineVersion: "2.0.0",
    },
  };
}

/**
 * Serializa un `JobSpec` al formato "texto de vacante" que espera
 * `AdaptPanel` (que aún consume `{ cvText, jobText }` legacy mientras
 * PR 5b migra el flujo principal al ScoreCvRequest v2).
 *
 * Estado transitorio — cuando AdaptPanel migre a consumir `JobSpec`
 * directamente (futuro PR), esta función se retira. Se mantiene acá
 * (no en `lib/job/`) para no contaminar el dominio con un formato
 * heredado que AdaptPanel aún no negocia.
 */
function jobSpecToLegacyText(job: JobSpec): string {
  const header = `${job.title} — ${job.company} (${job.location})`;
  const type = `Tipo de empleo: ${job.employmentType}`;
  const reqs = job.requirements.map((r) => `- ${r}`).join("\n");
  return `${header}\n\n${job.description}\n\nRequisitos:\n${reqs}\n\n${type}`;
}

interface AnalyzerProps {
  readonly cvText: string;
  readonly job: JobSpec | null;
  readonly onCv: (next: string) => void;
  readonly onJob: (next: JobSpec) => void;
}

/**
 * Analyzer — orquestador del flujo "pegar CV → pegar vacante → analizar"
 * (PR 5b + PR 5c).
 *
 * Migración PR 5b:
 *  - `jobText: string` → `job: JobSpec | null` (typed, validado por Zod en
 *    el `JobSpecForm` de PR 5a). Constitution Art. V: input as data.
 *  - `requestScore(cvText, jobText)` legacy → `requestScoreV2({ kind:
 *    "structured", cv, job, engineVersion: "2.0.0" })`. El CV wire-format
 *    se construye con `createEmptyWireCvDocument()` (estado transitorio
 *    — la migración plena del CV al editor v2 es un PR posterior; hasta
 *    entonces, los `perSection` del response vendrán mayormente `null`).
 *  - El response ahora se discrimina por `engineVersion` (`isScoreResponseV2`)
 *    para leer `perSection` + `redFlags` (v2) además del shape legacy (v1).
 *
 * Migración PR 5c:
 *  - Cuando el response es v2, se renderiza `<SectionBreakdown>` (barras
 *    por sección 0–100 + lista de red flags con badge de severidad) en
 *    lugar del render inline anterior (`V2ResultSections` se retira).
 *    El componente vive en `components/analyzer/section-breakdown.tsx` y
 *    tiene su propio coverage de tests RTL.
 *
 * `AdaptPanel` sigue consumiendo `{ cvText, jobText }` legacy — la
 * serialización JobSpec → text es transitoria (helper local arriba).
 */
export function Analyzer({ cvText, job, onCv, onJob }: AnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreOutcome | null>(null);

  async function analyze(payload: { cvText: string; job: JobSpec }) {
    setLoading(true);
    setError(null);
    try {
      // Estado transitorio: el analyzer aún recibe `cvText` del textarea
      // (el editor v2 con `CvDocument` JSON Resume no está cableado
      // todavía). Para emitir `kind: "structured"` (PR 1 contrato con el
      // backend .NET), construimos un `CvDocument` mínimo del wire format
      // (`lib/job/cv-document.ts`, no el del editor) con todas las
      // secciones vacías y `confidence: 'inferred'` (Constitution Art. I:
// cero invención). PR futuro cablea el editor estructurado al analyzer
      // y elimina esta ruta.
      const cv: CvDocument = createEmptyWireCvDocument();
      const response = await requestScoreV2({
        kind: "structured",
        cv,
        job: payload.job,
        engineVersion: "2.0.0",
      });
      setResult(response);
    } catch (caught) {
      setError((caught as ScoreError).message ?? "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  // Helper de discriminación con narrowing local. El type guard viene de
  // `lib/api/types.ts` (PR 2e); acá solo lo aplicamos al resultado.
  // Las dos branches son mutuamente excluyentes — `result` existe → o v2
  // o v1 (legacy). El motor v2 (PR 3) ya no emite el shape `Gate[]` rico
  // (solo `gatesApplied: string[]`), por eso HonestyNote recibe `[]` en
  // el caso v2 — PR 5c refina el render de las gates con severidad.
  const v2 = result && isScoreResponseV2(result) ? result : null;
  const legacy: ScoreResponse | null =
    result && !isScoreResponseV2(result) ? result : null;

  return (
    <div aria-live="polite">
      {result ? (
        <div className="space-y-12">
          <div className="rise grid gap-10 lg:grid-cols-[300px_1fr]">
            <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              <ScoreGauge
                score={result.overallScore}
                band={result.band}
                label={copy.result.scoreLabel}
              />
              <HonestyNote
                notice={result.honestyNotice}
                gates={legacy?.gatesApplied ?? []}
                engineVersion={result.engineVersion}
                lexiconVersion={
                  v2 ? v2.lexiconVersion : legacy?.lexiconVersion ?? ""
                }
              />
              <button type="button" onClick={() => setResult(null)} className={ghostButton}>
                {copy.analyze.reset}
              </button>
            </aside>

            <div className="space-y-12">
              {legacy && (
                <>
                  <section>
                    <h2 className="mb-5 font-display text-2xl">
                      {copy.result.componentsTitle}
                    </h2>
                    <ComponentBars components={legacy.components} />
                  </section>

                  <section>
                    <h2 className="mb-5 font-display text-2xl">
                      {copy.result.keywordsTitle}
                    </h2>
                    <KeywordCloud analysis={legacy.keywordAnalysis} />
                  </section>

                  {legacy.recommendations.length > 0 && (
                    <section>
                      <h2 className="font-display text-2xl">
                        {copy.result.fixesTitle}
                      </h2>
                      <p className="mb-5 mt-1 text-sm text-muted">
                        {copy.result.fixesSubtitle}
                      </p>
                      <FixList items={legacy.recommendations} />
                    </section>
                  )}
                </>
              )}

              {v2 && (
                <>
                  <SectionBreakdown
                    perSection={v2.perSection}
                    redFlags={v2.redFlags}
                  />
                  {job && (
                    <LlmFeedbackPanel
                      request={{
                        cv: createEmptyWireCvDocument(),
                        job,
                        scoreContext: {
                          score: v2.overallScore,
                          components: [],
                          version: "2.0.0",
                        },
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </div>
          {job && (
            <AdaptPanel cvText={cvText} jobText={jobSpecToLegacyText(job)} />
          )}
        </div>
      ) : (
        <InputPanel
          cvText={cvText}
          job={job}
          onCv={onCv}
          onJob={onJob}
          onSubmit={analyze}
          onExample={() => {
            onCv(demoCv);
            onJob(demoJobSpec);
          }}
          onClear={() => {
            onCv("");
            // El analyzer no maneja `JobSpec` vacío (el JobSpecForm exige
            // 6 campos válidos). Reseteamos a un demo en lugar de un JobSpec
            // vacío para que el usuario pueda seguir explorando con un click.
            onJob(demoJobSpec);
            setError(null);
          }}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
