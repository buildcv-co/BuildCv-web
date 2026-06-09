// Contracts: 007-web-landing-ui
// Tipos de los helpers puros. NO son runtime exports; son guías de implementación.

// lib/seo/metadata.ts
export type LandingMetadata = {
  title: { default: string; template: string };
  description: string;
  keywords: ReadonlyArray<string>;
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    locale: "es_CO";
    type: "website";
  };
  twitter: {
    card: "summary_large_image";
    title: string;
    description: string;
    creator: string;
  };
  robots: { index: true; follow: true };
  alternates: { canonical: string };
};

// lib/seo/sitemap-routes.ts
export type RouteChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type RouteMetadata = {
  readonly path: string;
  readonly changeFrequency: RouteChangeFrequency;
  readonly priority: number;
};

// lib/seo/jsonld.ts
export type OrganizationLd = {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  sameAs: ReadonlyArray<string>;
};

export type WebSiteLd = {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  inLanguage: "es-CO";
};

export type SoftwareApplicationLd = {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: "BusinessApplication";
  operatingSystem: "Web";
  offers: { "@type": "Offer"; price: "0"; priceCurrency: "COP" };
  description: string;
};

export type FaqItem = { q: string; a: string };

export type FaqPageLd = {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: ReadonlyArray<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
};

export type GraphLd = {
  "@context": "https://schema.org";
  "@graph:": ReadonlyArray<OrganizationLd | WebSiteLd | SoftwareApplicationLd | FaqPageLd>;
};
