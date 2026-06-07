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
} as const;

export type Copy = typeof copy;
