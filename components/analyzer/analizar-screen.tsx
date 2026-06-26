"use client";

import { useState, useSyncExternalStore } from "react";
import { Analyzer } from "@/components/analyzer/analyzer";
import { EmptyState } from "@/components/common/empty-state";
import { DocumentIcon } from "@/components/common/icons";
import { copy } from "@/lib/copy/es";
import type { JobSpec } from "@/lib/job/job-spec";

const STORAGE_KEY_CV = "buildcv:analizar:cv-preseed";
const STORAGE_KEY_JOB = "buildcv:analizar:job-preseed";

type Preseed = { cv: string; job: string };

const emptyPreseed: Preseed = { cv: "", job: "" };

let cachedPreseed: Preseed | null = null;

function readPreseed(): Preseed {
  if (typeof window === "undefined") return emptyPreseed;
  const cv = window.localStorage.getItem(STORAGE_KEY_CV) ?? "";
  const job = window.localStorage.getItem(STORAGE_KEY_JOB) ?? "";
  if (cachedPreseed && cachedPreseed.cv === cv && cachedPreseed.job === job) {
    return cachedPreseed;
  }
  cachedPreseed = { cv, job };
  return cachedPreseed;
}

function subscribe() {
  return () => undefined;
}

/**
 * AnalizarScreen — client wrapper que decide entre el EmptyState
 * (cuando cvText y jobText están vacíos) y el Analyzer.
 *
 * En uso normal (localStorage vacío): muestra el EmptyState con CTA
 * 'Ver cómo importar un CV' cuando ambos inputs están vacíos.
 *
 * Si localStorage tiene 'buildcv:analizar:cv-preseed' o
 * 'buildcv:analizar:job-preseed' pre-poblado (e.g., por un e2e test
 * o por el flujo de import que escribe el texto extraído), el
 * Analyzer se renderiza con ese texto inicial.
 *
 * El `JobSpec` validado por el `JobSpecForm` (PR 5a) se levanta a este
 * nivel vía `useState` para que el `Analyzer` pueda pasar el job al
 * `AdaptPanel` después del análisis. Sin este lift, el AdaptPanel
 * nunca se renderizaría en el flujo de preseed (Bug 021/5b).
 *
 * useSyncExternalStore garantiza que el snapshot server-side coincida
 * con el primer render del cliente (getServerSnapshot), evitando
 * hydration mismatch al leer localStorage.
 */
export function AnalizarScreen() {
  const preseed = useSyncExternalStore<Preseed>(subscribe, readPreseed, () => emptyPreseed);
  const [job, setJob] = useState<JobSpec | null>(null);

  const bothEmpty = preseed.cv.trim() === "" && preseed.job.trim() === "";

  if (bothEmpty) {
    return (
      <EmptyState
        icon={<DocumentIcon />}
        title={copy.emptyStates.analyze.title}
        description={copy.emptyStates.analyze.description}
        ctaLabel={copy.emptyStates.analyze.primaryCta}
        ctaHref="/importar"
      />
    );
  }

  return <Analyzer cvText={preseed.cv} job={job} onCv={() => undefined} onJob={setJob} />;
}