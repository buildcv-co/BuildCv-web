# Data Model: 007-web-landing-ui

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Research:** [./research.md](./research.md)

## Overview

Este sprint **no introduce tipos de dominio** nuevos. Los tipos que se crean son:

1. **Metadata helpers** (`lib/seo/metadata.ts`): funciones puras que retornan `Metadata` de Next.js. Sin estado, sin runtime.
2. **JSON-LD builders** (`lib/seo/jsonld.ts`): funciones puras que retornan strings JSON. Sin estado, sin runtime.
3. **Sitemap routes** (`lib/seo/sitemap-routes.ts`): array inmutable de rutas con metadata. `as const` para tipos literales.
4. **FAQ items** (`lib/copy/es.ts`): array de `{ q: string; a: string }`. `as const` para tipos literales.

Todo es `readonly` y se valida con Zod (NFR-040) o se construye con `JSON.stringify` (escape nativo).

---

## 1. `RouteMetadata` (en `lib/seo/sitemap-routes.ts`)

```typescript
import type { MetadataRoute } from "next";

export type RouteChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export interface RouteMetadata {
  readonly path: string;
  readonly changeFrequency: RouteChangeFrequency;
  readonly priority: number;
}

export const PUBLIC_ROUTES: ReadonlyArray<RouteMetadata> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/analizar", changeFrequency: "weekly", priority: 0.9 },
  { path: "/importar", changeFrequency: "monthly", priority: 0.7 },
  { path: "/analizar/editar", changeFrequency: "monthly", priority: 0.6 },
  { path: "/analizar/diff", changeFrequency: "monthly", priority: 0.5 },
  { path: "/analizar/adapt", changeFrequency: "monthly", priority: 0.5 },
  { path: "/analizar/export", changeFrequency: "monthly", priority: 0.5 },
] as const;
```

---

## 2. `FaqItem` (en `lib/copy/es.ts`, bloque `landing`)

```typescript
export interface FaqItem {
  readonly q: string;  // pregunta
  readonly a: string;  // respuesta (puede ser multilínea)
}

// En copy.landing:
export const landing = {
  faqs: [
    { q: "¿BuildCv guarda mi CV o la vacante?", a: "..." },
    { q: "¿La adaptación con IA puede inventar contenido?", a: "..." },
    { q: "¿Cuánto cuesta?", a: "..." },
    { q: "¿Funciona en móvil?", a: "..." },
    { q: "¿Puedo exportar mi CV a PDF?", a: "..." },
    { q: "¿Qué pasa con mis datos si el backend falla?", a: "..." },
  ] as const satisfies ReadonlyArray<FaqItem>,
  trust: {
    openSource: { label: "Código abierto", href: "https://github.com/buildcv-co/BuildCv-web" },
    constitution: { label: "Constitution v1.1.0 ratificada", href: "/constitution" },
    tests: { label: "540 tests automatizados · 0 supresiones", count: 540 },
  },
  notFound: {
    title: "Página no encontrada",
    detail: "La ruta que buscás no existe o fue movida.",
    backHome: "Volver al inicio",
    backAnalyze: "Ir a /analizar",
  },
  serverError: {
    title: "Algo se rompió",
    detail: "No es tu culpa. Estamos mirando qué pasó.",
    retry: "Reintentar",
    backHome: "Volver al inicio",
  },
  globalError: {
    title: "Error grave",
    detail: "La aplicación no pudo cargar. Probá recargar o volver al inicio.",
    reload: "Recargar",
    backHome: "Volver al inicio",
  },
} as const;
```

---

## 3. JSON-LD schema interfaces (en `lib/seo/jsonld.ts`, no exportadas, son guías)

```typescript
// Interfaces conceptuales para guiar la implementación. NO se exportan.

interface OrganizationLd {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  sameAs: ReadonlyArray<string>;  // social/repo URLs
}

interface WebSiteLd {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  inLanguage: "es-CO";
}

interface SoftwareApplicationLd {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: "BusinessApplication";
  operatingSystem: "Web";
  offers: { "@type": "Offer"; price: "0"; priceCurrency: "COP" };
  description: string;
}

interface FaqPageLd {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: ReadonlyArray<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
}
```

Los builders (`buildOrganizationLd`, `buildWebSiteLd`, etc.) son funciones puras que retornan `string` (JSON serializado).

---

## 4. Validación con Zod (NFR-040)

Para validar que el JSON-LD generado es parseable y tiene la estructura correcta:

```typescript
// lib/seo/jsonld.test.ts
import { z } from "zod";

const OrganizationLdSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("Organization"),
  name: z.string().min(1).max(200),
  url: z.string().url(),
  logo: z.string().url(),
  sameAs: z.array(z.string().url()).max(10),
});

// Test: el output de buildOrganizationLd() parsea con OrganizationLdSchema
```

Para el runtime, **NO usamos Zod en producción** (overhead innecesario). Solo en tests. La validación de producción es la de Google Rich Results Test.

---

## 5. Versionado

- **`PUBLIC_ROUTES`**: cambiar rutas requiere actualizar el array. No hay versionado (es estático).
- **`copy.landing.faqs`**: cambiar el texto no requiere versionado (es copy de UI).
- **JSON-LD schemas**: seguir schema.org vocabulary. Si schema.org deprecate un schema, bumpear a v1.1 del sprint.

## Resumen de tipos

| Tipo | Archivo | Propósito |
|---|---|---|
| `RouteMetadata` | `lib/seo/sitemap-routes.ts` | metadata por ruta pública |
| `PUBLIC_ROUTES` | `lib/seo/sitemap-routes.ts` | array inmutable |
| `FaqItem` | `lib/copy/es.ts` (interface) | pregunta/respuesta FAQ |
| `landing` (copy) | `lib/copy/es.ts` | copy completo del landing (FAQs, trust, error pages) |

Cero tipos de dominio nuevos. Cero cambios en `lib/api/types.ts`. Cero cambios en `lib/editor/types.ts` o `lib/storage/`.
