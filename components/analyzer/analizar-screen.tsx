"use client";

import { useState } from "react";
import { Analyzer } from "@/components/analyzer/analyzer";
import { EmptyState } from "@/components/common/empty-state";
import { DocumentIcon } from "@/components/common/icons";
import { copy } from "@/lib/copy/es";

const STORAGE_KEY_CV = "buildcv:analizar:cv-preseed";
const STORAGE_KEY_JOB = "buildcv:analizar:job-preseed";

function readPreseed(): { cv: string; job: string } {
  if (typeof window === "undefined") return { cv: "", job: "" };
  return {
    cv: window.localStorage.getItem(STORAGE_KEY_CV) ?? "",
    job: window.localStorage.getItem(STORAGE_KEY_JOB) ?? "",
  };
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
 * Analyzer se renderiza directamente con ese texto inicial.
 */
export function AnalizarScreen() {
  const [{ cv: cvText, job: jobText }] = useState(readPreseed);

  const bothEmpty = cvText.trim() === "" && jobText.trim() === "";

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

  return <Analyzer cvText={cvText} jobText={jobText} onCv={() => undefined} onJob={() => undefined} />;
}