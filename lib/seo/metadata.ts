import type { Metadata } from "next";

const SITE_URL = "https://buildcv.co";
const SITE_NAME = "BuildCv";
const DEFAULT_DESCRIPTION =
  "Pega tu hoja de vida y una vacante. Te decimos qué tan bien encajan, qué palabras clave te faltan y exactamente qué arreglar — con un puntaje que puedes reproducir, no un número inventado.";

export function buildLandingMetadata(): Metadata {
  return {
    title: {
      default: `${SITE_NAME} · Tu CV, medido con honestidad`,
      template: `%s · ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    keywords: [
      "analizar CV",
      "CV Colombia",
      "puntaje CV",
      "ATS Colombia",
      "hoja de vida",
      "vacante",
      "asistente de CV",
    ],
    openGraph: {
      title: `${SITE_NAME} · Tu CV, medido con honestidad`,
      description: DEFAULT_DESCRIPTION,
      url: `${SITE_URL}/`,
      siteName: SITE_NAME,
      locale: "es_CO",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} · Tu CV, medido con honestidad`,
      description: DEFAULT_DESCRIPTION,
      creator: "@buildcv_co",
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${SITE_URL}/`,
    },
  };
}
