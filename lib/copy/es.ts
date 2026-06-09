/**
 * Textos en español (es-CO). Centralizados para consistencia y para preparar la
 * i18n (Colombia -> LATAM) sin dispersar strings por la UI.
 */
export const copy = {
  locale: "es-CO",
  appName: "BuildCv",
  nav: {
    analyze: "Analizar mi CV",
  },
  home: {
    kicker: "Asistente de CV con IA · Colombia",
    title: "Tu CV, medido con honestidad.",
    subtitle:
      "Pega tu hoja de vida y una vacante. Te decimos qué tan bien encajan, qué palabras clave te faltan y exactamente qué arreglar — con un puntaje que puedes reproducir, no un número inventado.",
    cta: "Analizar mi CV",
    secondary: "Ver cómo funciona",
    honesty:
      "Medimos coincidencia y legibilidad para sistemas automáticos. No es un “puntaje ATS oficial” ni garantiza empleo.",
    steps: [
      { n: "01", t: "Pega tu CV y la vacante", d: "Solo texto. No guardamos nada; se procesa y se descarta." },
      { n: "02", t: "Recibe tu puntaje explicable", d: "Cinco componentes, cada uno con su porqué y su peso." },
      { n: "03", t: "Arregla lo que más suma", d: "Una lista priorizada — y la IA nunca inventa experiencia." },
    ],
  },
  analyze: {
    title: "Analiza tu CV",
    cvLabel: "Tu hoja de vida",
    cvPlaceholder: "Pega aquí el texto de tu CV…",
    jobLabel: "La vacante",
    jobPlaceholder: "Pega aquí la descripción de la vacante…",
    cvHint: "mínimo 200 caracteres",
    jobHint: "mínimo 100 caracteres",
    submit: "Analizar",
    analyzing: "Analizando…",
    tryExample: "Probar con un ejemplo",
    clear: "Limpiar",
    reset: "Analizar otro",
    privacy: "Procesamos en memoria y descartamos el texto al responder.",
  },
  result: {
    scoreLabel: "Coincidencia y legibilidad",
    componentsTitle: "Desglose",
    weight: "peso",
    partial: "medición parcial",
    keywordsTitle: "Palabras clave",
    present: "Presentes",
    partialKw: "Parciales",
    missing: "Faltantes",
    noMissing: "No detectamos requisitos faltantes. 🎯",
    fixesTitle: "Qué arreglar",
    fixesSubtitle: "Ordenado por el impacto estimado en tu puntaje.",
    realGap: "brecha real",
    noInvent: "no se inventa",
    impact: "impacto",
    sealedWith: "Sellado con",
    engine: "motor",
    lexicon: "léxico",
  },
  confidence: {
    low: "confianza baja",
    medium: "confianza media",
    high: "confianza alta",
  },
  adapt: {
    panel: {
      title: "Adaptar tu CV",
      description: "Reorganiza, reescribe y prioriza tu CV sin inventar contenido.",
      button: "Adaptar mi CV",
      buttonLoading: "Adaptando…",
      buttonHint: "versión determinista · v0",
    },
    severity: {
      none: "Sin invenciones. CV lista para descargar.",
      warning: "Advertencia: hay mejoras menores que puedes revisar.",
      critical: "Atención: se detectaron posibles invenciones. Regenera antes de exportar.",
    },
    errors: {
      rateLimit:
        "Has alcanzado el tope de adaptaciones (5/hora). El análisis determinista sigue disponible.",
      blocked:
        "El CV adaptado tiene invenciones que no estaban en el original. Regenera la adaptación.",
      unavailable:
        "La adaptación con IA no está disponible temporalmente. Intenta de nuevo en unos minutos.",
      generic: "Ocurrió un error inesperado. Intenta de nuevo.",
      network: "No pudimos conectar con el servidor. Revisa tu conexión.",
    },
    delta: {
      title: "Cambios aplicados",
      empty: "No se detectaron cambios.",
      hardLabel: "Hard",
      softLabel: "Soft",
    },
    cta: {
      regenerate: "Regenerar con prompt estricto",
    },
    exportGate: {
      title: "No podemos exportar este CV todavía",
      detail:
        "El validador detectó {count} invención(es) Hard (entidades que no estaban en tu CV original). El export a PDF está bloqueado por Constitution Art. I hasta que regeneres la adaptación.",
      regenerate: "Regenerar adaptación",
    },
  },
  export: {
    button: "Descargar PDF",
    buttonLoading: "Generando PDF…",
    filenameHint: "cv-adapted-{date}.pdf",
    success: "Descarga iniciada",
    errors: {
      rateLimit:
        "Has alcanzado el tope de exportaciones (20/hora). El análisis determinista y la adaptación siguen disponibles.",
      blocked:
        "El CV adaptado tiene invenciones que no estaban en el original. Regenera la adaptación antes de exportar.",
      unavailable:
        "La generación de PDF no está disponible temporalmente. Intenta de nuevo en unos minutos.",
      network: "No pudimos conectar con el servidor. Revisa tu conexión.",
      generic: "Ocurrió un error al generar el PDF. Intenta de nuevo.",
    },
    retry: "Reintentar",
  },
} as const;

export type Copy = typeof copy;
