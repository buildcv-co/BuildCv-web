"use client";

import { useState } from "react";
import { requestScore, type ScoreError } from "@/lib/api/score";
import type { ScoreResponse } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { demoCv, demoJob } from "@/lib/utils/demo-data";
import { AdaptPanel } from "@/components/adapt/adapt-panel";
import { ComponentBars } from "./component-bars";
import { FixList } from "./fix-list";
import { HonestyNote } from "./honesty-note";
import { InputPanel } from "./input-panel";
import { KeywordCloud } from "./keyword-cloud";
import { ScoreGauge } from "./score-gauge";

const ghostButton =
  "w-full rounded-full border border-line px-5 py-3 text-sm text-ink transition hover:border-muted hover:bg-surface";

export function Analyzer() {
  const [cvText, setCvText] = useState("");
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResponse | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      setResult(await requestScore(cvText, jobText));
    } catch (caught) {
      setError((caught as ScoreError).message ?? "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

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
                gates={result.gatesApplied}
                engineVersion={result.engineVersion}
                lexiconVersion={result.lexiconVersion}
              />
              <button type="button" onClick={() => setResult(null)} className={ghostButton}>
                {copy.analyze.reset}
              </button>
            </aside>

            <div className="space-y-12">
              <section>
                <h2 className="mb-5 font-display text-2xl">{copy.result.componentsTitle}</h2>
                <ComponentBars components={result.components} />
              </section>

              <section>
                <h2 className="mb-5 font-display text-2xl">{copy.result.keywordsTitle}</h2>
                <KeywordCloud analysis={result.keywordAnalysis} />
              </section>

              {result.recommendations.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl">{copy.result.fixesTitle}</h2>
                  <p className="mb-5 mt-1 text-sm text-muted">{copy.result.fixesSubtitle}</p>
                  <FixList items={result.recommendations} />
                </section>
              )}
            </div>
          </div>
          <AdaptPanel cvText={cvText} jobText={jobText} />
        </div>
      ) : (
        <InputPanel
          cvText={cvText}
          jobText={jobText}
          onCv={setCvText}
          onJob={setJobText}
          onSubmit={analyze}
          onExample={() => {
            setCvText(demoCv);
            setJobText(demoJob);
          }}
          onClear={() => {
            setCvText("");
            setJobText("");
            setError(null);
          }}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
