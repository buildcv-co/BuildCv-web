/**
 * JSON-LD builders for BuildCv landing page.
 *
 * Each builder is a pure function that returns a string of JSON.
 * JSON.stringify handles escaping of `"`, `\`, control characters, and
 * Unicode natively — no template literals involved.
 *
 * This is the ONLY place in the project that uses `dangerouslySetInnerHTML`,
 * and only the output of these builders (built-time, no user input) feeds
 * into `__html`. See app/page.tsx for the call site and a comment explaining
 * the documented exception.
 */

const SITE_URL = "https://buildcv.co";
const LOGO_URL = `${SITE_URL}/icon`;
const SITE_NAME = "BuildCv";
const SITE_LOCALE = "es-CO" as const;

const GITHUB_REPO_WEB = "https://github.com/buildcv-co/BuildCv-web";
const GITHUB_REPO_API = "https://github.com/buildcv-co/BuildCv-api";

const DESCRIPTION =
  "Asistente de CV con honestidad. Puntaje determinista, sin invención, sin guardado server-side.";

export interface FaqItem {
  readonly q: string;
  readonly a: string;
}

export function buildOrganizationLd(): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: LOGO_URL,
    sameAs: [GITHUB_REPO_WEB, GITHUB_REPO_API],
  };
  return JSON.stringify(schema);
}

export function buildWebSiteLd(): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: SITE_LOCALE,
  };
  return JSON.stringify(schema);
}

export function buildSoftwareApplicationLd(): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "COP",
    },
    description: DESCRIPTION,
  };
  return JSON.stringify(schema);
}

export function buildFaqPageLd(faqs: ReadonlyArray<FaqItem>): string {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
  return JSON.stringify(schema);
}

export function buildAllLdSchemas(faqs: ReadonlyArray<FaqItem>): string {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      JSON.parse(buildOrganizationLd()) as Record<string, unknown>,
      JSON.parse(buildWebSiteLd()) as Record<string, unknown>,
      JSON.parse(buildSoftwareApplicationLd()) as Record<string, unknown>,
      JSON.parse(buildFaqPageLd(faqs)) as Record<string, unknown>,
    ],
  };
  return JSON.stringify(graph);
}
