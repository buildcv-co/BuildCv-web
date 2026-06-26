"use client";

import { useState } from "react";
import { Analyzer } from "@/components/analyzer/analyzer";
import { EmptyState } from "@/components/common/empty-state";
import { DocumentIcon } from "@/components/common/icons";
import { copy } from "@/lib/copy/es";

/**
 * AnalizarScreen — client wrapper que decide entre el EmptyState
 * (cuando cvText y jobText están vacíos) y el Analyzer. Mantiene
 * cvText/jobText en estado de página para que el switch entre
 * 'Importar CV' CTA y el form del Analyzer no pierdan el texto
 * tipeado por el usuario.
 */
export function AnalizarScreen() {
  const [cvText, setCvText] = useState("");
  const [jobText, setJobText] = useState("");

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

  return <Analyzer cvText={cvText} jobText={jobText} onCv={setCvText} onJob={setJobText} />;
}