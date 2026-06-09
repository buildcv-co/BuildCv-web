# Research: 007-web-landing-ui

## 1. JSON-LD schemas para SaaS

**Investigado**: schema.org vocabulary + Google Search Central guidelines (2025).

### Schemas requeridos para una SaaS B2C como BuildCv

| Schema | Propósito | Requerrido? |
|---|---|---|
| `Organization` | Identifica la entidad que publica el sitio. Logo, name, url, sameAs (social). | ✅ Sí |
| `WebSite` | Identifica el sitio. url, name, inLanguage, potentialAction (SearchAction). | ✅ Sí |
| `SoftwareApplication` | Identifica la app. name, description, applicationCategory, offers (precio). | ✅ Sí |
| `FAQPage` | Marca la sección de FAQ para rich results. mainEntity con Question/Answer. | ✅ Sí (tenemos FAQ) |
| `BreadcrumbList` | Navegación estructurada. | Opcional (no tenemos breadcrumbs profundos) |

### Mejores prácticas

- **Usar `next/script` con `type="application/ld+json"` y `strategy="afterInteractive"`** (no bloquea el render inicial, se inyecta al final).
- **`JSON.stringify(schema)`** (no template literals, escape nativo).
- **NO usar `dangerouslySetInnerHTML` con strings hardcoded** — el riesgo es zero porque el JSON se genera en build time con `JSON.stringify`. Aún así, es la **única excepción** en el proyecto a la regla "no dangerouslySetInnerHTML". Documentado en el código.
- **Validar con Google Rich Results Test** antes de mergear.

### Ejemplo de schema (Organization + WebSite + SoftwareApplication + FAQPage)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "BuildCv",
      "url": "https://buildcv.co",
      "logo": "https://buildcv.co/logo.png",
      "sameAs": [
        "https://github.com/buildcv-co/BuildCv-web",
        "https://github.com/buildcv-co/BuildCv-api"
      ]
    },
    {
      "@type": "WebSite",
      "name": "BuildCv",
      "url": "https://buildcv.co",
      "inLanguage": "es-CO"
    },
    {
      "@type": "SoftwareApplication",
      "name": "BuildCv",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "COP" },
      "description": "Asistente de CV con honestidad. Puntaje determinista, sin invención, sin guardado server-side."
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "¿BuildCv guarda mi CV?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. En v0 el CV se procesa en memoria y se descarta al responder. La persistence local (borrador) es opcional y solo en tu dispositivo."
          }
        }
      ]
    }
  ]
}
```

## 2. Next.js 16 SEO conventions

**Investigado**: Next.js docs 2025.

### Sitemap

```typescript
// app/sitemap.ts
import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://buildcv.co", lastModified: new Date() }];
}
```

Genera `/sitemap.xml` automáticamente. `lastModified` se puede omitir o ser `Date` o string ISO.

### Robots

```typescript
// app/robots.ts
import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: "https://buildcv.co/sitemap.xml" };
}
```

Genera `/robots.txt` automáticamente.

### 404 / 500 / error pages

| Archivo | Cuándo se renderiza | Notas |
|---|---|---|
| `app/not-found.tsx` | `notFound()` thrown o ruta no existe | Server component, sin state |
| `app/error.tsx` | Error no manejado en ruta | **"use client"** porque recibe `reset` callback |
| `app/global-error.tsx` | Error en root layout | **"use client"**, **requiere `<html>` y `<body>`** |

### Metadata API

```typescript
// app/page.tsx
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "...",
  description: "...",
  openGraph: { ... },
  twitter: { ... },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://buildcv.co/" },
};
```

Next.js 16 genera automáticamente `<title>`, `<meta name="description">`, OG tags, Twitter cards, etc.

## 3. WCAG 2.2 AA para landing

**Investigado**: W3C WAI, ARIA Authoring Practices Guide.

### Skip link

Ya existe en `app/layout.tsx`:
```tsx
<a href="#contenido" className="sr-only ...">Saltar al contenido</a>
```

### aria-current en nav

```tsx
<Link href="/" aria-current={isActive("/") ? "page" : undefined}>Inicio</Link>
```

### focus-visible consistente

Tailwind v4 tiene `focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2` en interactive elements.

### prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 4. Comparativa de approaches para FAQ

| Approach | Pros | Contras | Decisión |
|---|---|---|---|
| `<details>`/`<summary>` nativo | Cero JS, accesible por default, semántico | Estilización limitada sin librería | ✅ **Adoptado** |
| HeadlessUI Disclosure | Más control de estilo | Dependencia extra | ❌ |
| Radix UI Accordion | Más control de estilo, accesible | Dependencia extra | ❌ |
| react-accessible-accordion | Dependencia extra | Overkill para v0.5 | ❌ |

## 5. Lighthouse: optimizaciones clave

| Categoría | Optimización | Esfuerzo | Impacto |
|---|---|---|---|
| Performance | Preload de fuentes (next/font) | Bajo (ya hay) | Alto |
| Performance | Lazy load de imágenes (next/image) | Bajo (no hay imágenes) | N/A |
| Performance | Code splitting (Next.js default) | Ya está | Alto |
| SEO | Meta description | Bajo | Alto |
| SEO | Sitemap.xml | Bajo | Alto |
| SEO | JSON-LD | Bajo | Alto |
| Accessibility | ARIA labels | Bajo | Alto |
| Accessibility | Color contrast | Bajo (ya está) | Alto |
| Best Practices | HTTPS (producción) | Alto (config) | Alto |
| Best Practices | Sin console errors | Medio (testing) | Alto |

## 6. Decisión final: bundle size

| Asset | Size estimado | Justificación |
|---|---|---|
| JSON-LD inline (3-4 schemas) | ~2 KB | Inline, sin request extra |
| sitemap.xml | ~1 KB | Generado en build |
| robots.txt | <0.5 KB | Generado en build |
| 404 / error pages | 0 KB extra (reutiliza globals.css) | Server component |

**Total**: ~3-4 KB de overhead. Cero impacto en performance.

## 7. Alternatives descartadas

| Alternativa | Razón del descarte |
|---|---|
| `next-sitemap` (librería) | Overkill para 7 rutas. Next.js 16 lo soporta nativo. |
| `@next/og` (imagen Open Graph dinámica) | Requiere servidor Edge. Para v0.5 no necesario; Open Graph con texto es suficiente. Queda para v1. |
| Analytics (Plausible, Fathom, Umami) | Constitution Art. III privacy. v0.5 sin tracking. v1 si hay demanda. |
| i18n con `next-intl` | v0.5 es es-CO only. Estructura para v1. |
| Sitemap dinámico desde el filesystem | No aplica: rutas son estáticas conocidas. |

## 8. Referencias

- [Google Search Central - Structured Data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Schema.org SoftwareApplication](https://schema.org/SoftwareApplication)
- [Next.js 16 Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js 16 sitemap.ts](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js 16 robots.ts](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next.js 16 error.tsx](https://nextjs.org/docs/app/api-reference/file-conventions/error)
- [W3C WAI - WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [Lighthouse scoring guide](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
