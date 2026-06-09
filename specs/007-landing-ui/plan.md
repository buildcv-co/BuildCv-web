# Implementation Plan: 007-web-landing-ui

> **Spec:** [./spec.md](./spec.md) · **Research:** [./research.md](./research.md) · **Data Model:** [./data-model.md](./data-model.md) · **Contracts:** [./contracts/metadata.ts](./contracts/metadata.ts)

## Summary

Polish de `/` (landing) para llevarlo de "funciona" a "production-ready": metadata completa, JSON-LD, sitemap, robots, error pages, FAQ, trust signals, a11y. **No nuevas features de producto.**

## Decisiones arquitectónicas (locked)

1. **JSON-LD via `next/script` con `strategy="afterInteractive"`**: Next.js 16 lo soporta nativo. El schema se construye con `JSON.stringify` (no template strings, evita inyección de `"` o `<`).
2. **Sitemap via `app/sitemap.ts`**: Next.js 16 genera sitemap.xml automáticamente desde la convención `app/sitemap.ts`. La función exportada devuelve array de `MetadataRoute.Sitemap`. NO usamos `next-sitemap` (librería extra innecesaria).
3. **Robots via `app/robots.ts`**: misma convención que sitemap. Función exportada retorna `MetadataRoute.Robots`.
4. **404 via `app/not-found.tsx`**: convención Next.js 16 para 404. "use client" porque tiene CTA interactivo.
5. **Error boundary via `app/error.tsx`** (rutas) + **`app/global-error.tsx`** (root). Ambos "use client" porque usan React.useState/useEffect.
6. **FAQ con `<details>`/`<summary>`** nativo HTML, sin librería. Accesible, cero JS.
7. **Trust signals con componentes server** (sin state, sin eventos). Pueden ser functions normales en TSX.
8. **Sin nuevas deps**. Todo es built-in de Next.js 16.

## Project Structure

### Archivos a crear

```
app/
├── not-found.tsx                       # 🆕 404 custom en español
├── error.tsx                           # 🆕 Error boundary de rutas
├── global-error.tsx                    # 🆕 Error boundary raíz (reemplaza <html>)
├── sitemap.ts                          # 🆕 Genera sitemap.xml
├── robots.ts                           # 🆕 Genera robots.txt
├── page.tsx                            # ⚠️ MODIFICAR — agregar metadata + JSON-LD + FAQ + trust signals

components/
├── landing/
│   ├── faq-section.tsx                 # 🆕 <details>/<summary> FAQ
│   ├── faq-section.test.tsx            # 🆕 Test
│   ├── trust-signals.tsx               # 🆕 Badges de confianza
│   ├── trust-signals.test.tsx          # 🆕 Test
│   ├── landing-nav.tsx                 # 🆕 Nav con aria-current
│   ├── landing-nav.test.tsx            # 🆕 Test
│   ├── error-fallback.tsx              # 🆕 UI compartida para error boundaries
│   └── error-fallback.test.tsx         # 🆕 Test

lib/
├── seo/
│   ├── metadata.ts                     # 🆕 Helpers para construir metadata
│   ├── metadata.test.ts                # 🆕 Test
│   ├── jsonld.ts                       # 🆕 Builders de JSON-LD schemas
│   ├── jsonld.test.ts                  # 🆕 Test
│   ├── sitemap-routes.ts               # 🆕 Lista de rutas públicas
│   └── sitemap-routes.test.ts          # 🆕 Test

e2e/
└── landing.spec.ts                     # 🆕 E2E del landing + sitemap + robots + 404 + error

app/globals.css                        # ⚠️ POSIBLE — agregar prefers-reduced-motion overrides
```

### Archivos modificados

- `app/layout.tsx`: ya tiene skip link y metadata base. Sin cambios.
- `app/page.tsx`: integrar nuevos componentes (FAQ, trust signals, nav con aria-current).
- `lib/copy/es.ts`: agregar bloque `landing` con las preguntas FAQ y trust signals copy.

## Tipos (en `lib/seo/metadata.ts`)

```typescript
// Helpers puros para construir Next.js Metadata
export function buildLandingMetadata(): Metadata {
  return {
    title: { default: "BuildCv · Tu CV, medido con honestidad", template: "%s · BuildCv" },
    description: "...",
    keywords: ["..."],
    openGraph: { ... },
    twitter: { ... },
    robots: { index: true, follow: true },
    alternates: { canonical: "https://buildcv.co/" },
  };
}
```

## Tipos (en `lib/seo/jsonld.ts`)

```typescript
// Builders puros para JSON-LD schemas
export function buildOrganizationLd(): string { ... }
export function buildWebSiteLd(): string { ... }
export function buildSoftwareApplicationLd(): string { ... }
export function buildFaqPageLd(items: ReadonlyArray<{ q: string; a: string }>): string { ... }
```

## Routes (en `lib/seo/sitemap-routes.ts`)

```typescript
// Lista inmutable de rutas públicas con su metadata de SEO
export const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1.0 },
  { path: "/analizar", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/importar", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/analizar/editar", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/analizar/diff", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/analizar/adapt", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/analizar/export", changeFrequency: "monthly" as const, priority: 0.5 },
] as const;
```

## Detalles de implementación

### `app/sitemap.ts`

```typescript
import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES } from "@/lib/seo/sitemap-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://buildcv.co";
  return PUBLIC_ROUTES.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
```

### `app/robots.ts`

```typescript
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://buildcv.co/sitemap.xml",
  };
}
```

### `app/not-found.tsx`

Server component con copy en español, CTA a `/` y `/analizar`. No requiere `"use client"`.

### `app/error.tsx` y `app/global-error.tsx`

```typescript
"use client";
// app/error.tsx
import { useEffect } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy/es";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="...">
      <h1>Algo se rompió</h1>
      <p>No es tu culpa. Estamos mirando qué pasó.</p>
      <button onClick={reset}>Reintentar</button>
      <Link href="/">Volver al inicio</Link>
    </div>
  );
}
```

`app/global-error.tsx` es similar pero reemplaza `<html>` y `<body>` (porque es el root layout que falló).

### `<details>`/`<summary>` FAQ

```tsx
<>
  {faqs.map((faq) => (
    <details key={faq.q} className="border-b border-line py-4">
      <summary className="cursor-pointer font-medium focus-visible:outline-accent">
        {faq.q}
      </summary>
      <p className="mt-3 text-muted">{faq.a}</p>
    </details>
  ))}
</>
```

Nativo HTML, sin JS, accesible, focus-visible con Tailwind.

## Test plan

### Unit (Vitest + RTL)

- `lib/seo/metadata.test.ts`: shape correcto, keys esperadas
- `lib/seo/jsonld.test.ts`: JSON válido, schemas correctos, FAQPage con 5-7 items
- `lib/seo/sitemap-routes.test.ts`: 7 rutas, sin duplicados, paths válidos
- `lib/copy/es.test.ts`: bloque `landing` (FAQ + trust signals copy)
- `components/landing/{faq-section,trust-signals,landing-nav,error-fallback}.test.tsx`: render, ARIA, edge cases

### E2E (Playwright)

- `e2e/landing.spec.ts`:
  - Carga `/` → ve hero, 3 steps, FAQ, trust signals, footer
  - JSON-LD presente en `<script type="application/ld+json">`
  - sitemap.xml accesible en `/sitemap.xml`, contiene 7 URLs
  - robots.txt accesible en `/robots.txt`, permite todo y apunta al sitemap
  - Navega a `/ruta-inexistente` → ve 404 custom con link a `/`
  - Toggle aria-current en nav: navega a `/analizar`, el nav marca el item activo
  - prefers-reduced-motion: navega con reduced-motion, no hay animaciones de scroll
  - Privacy: `<head>` tiene `<meta name="robots" content="index, follow">`
  - **Test Art. III**: landing NO escribe cookies ni localStorage (N/A: el landing es server-rendered)

## Constitution Check

| Art. | Verificación | Estado |
|---|---|---|
| **Art. III** | Sin tracking, sin cookies, sin localStorage, sin third-party scripts. JSON-LD declara "no data stored on servers". | ✅ PASS |
| **Art. IV** | Trust signals honestos: "540 tests automatizados" (verdad), "Open source" (verdad), "Constitution v1.1.0 ratificada" (verdad). Cero promesas de features futuras. | ✅ PASS |
| **Art. V** | JSON-LD con `dangerouslySetInnerHTML` SOLO para output de `JSON.stringify` (built-time, seguro). Componentes: texto plano, sin dangerously. | ✅ PASS |
| **Art. VIII** | TDD: tests para metadata, JSON-LD, error pages, FAQ. | ✅ PASS |
| **Art. VI** | Sin nuevos endpoints backend. | ✅ PASS |
| **Art. VII** | Sin cuentas, sin server-side, sin guardado. | ✅ PASS |
| **Art. I, II, IX** | No aplicables a landing estático. | N/A |

## Risks

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| JSON.stringify de strings con caracteres especiales | Baja | Bajo | Usar `JSON.stringify` (escape nativo). Test con strings que tengan `"`, `<`, `>`, `&`. |
| Lighthouse score bajo en dev | Media | Bajo | Correr Lighthouse en producción (`pnpm build && pnpm start`). El dev mode tiene HMR y React DevTools que bajan el score. |
| sitemap.xml no se actualiza automáticamente | Baja | Bajo | `lastModified: new Date()` en cada build. En v0.5 no es problema (contenido estático). |
| 404 page rompe el layout del landing | Baja | Medio | Usar el mismo header/footer que el landing (no un layout completamente distinto). Mantener consistencia visual. |
| Error boundary captura errores esperados de Next (ej. de hydration) | Media | Bajo | console.error en el boundary para diagnóstico. La UI muestra el error pero permite continuar. |
| `app/global-error.tsx` requiere su propio `<html>` y `<body>` | Alta (error común) | Alto | Documentado en comentarios. Test que verifica que el HTML tiene los tags correctos. |

## Next Phase

→ `tasks.md` — desglose T-007-01..N por fase.
