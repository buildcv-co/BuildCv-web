# Tasks: 007-web-landing-ui

> **TDD estricto (Constitution Art. VIII).** Test → rojo → impl → verde → refactor. Sin supresiones, sin mocks falsos, sin `any` inseguros.
>
> **Marco:** Vitest 2 + RTL 16 + jsdom (sprint 0) + Playwright 1 chromium (E2E).
>
> **Spec ya escrita y validada** contra `app/page.tsx` real. Ver `spec.md` para el alcance.

## Phase 0 — Pre-flight

- [x] **T0.1** Spec.md, plan.md, research.md, data-model.md, quickstart.md escritas.
- [x] **T0.2** `app/page.tsx` actual inspeccionado: tiene hero + 3 steps + footer, sin metadata, sin JSON-LD, sin sitemap, sin 404 custom, sin FAQ, sin trust signals.
- [x] **T0.3** v0.5 completa (6 features shipped, 540 unit + 29 E2E verdes).
- [x] **T0.4** Sin nuevas deps necesarias. Todo es built-in Next.js 16.

## Phase 1 — SEO primitives (TDD)

- [ ] **T1.1** [TEST] `lib/seo/sitemap-routes.test.ts`:
  - 7 rutas en `PUBLIC_ROUTES`
  - Sin paths duplicados
  - Cada path comienza con `/`
  - Priority entre 0 y 1
  - changeFrequency es uno de los valores válidos
- [ ] **T1.2** [IMPL] `lib/seo/sitemap-routes.ts` con `RouteMetadata` interface + `PUBLIC_ROUTES` const.
- [ ] **T1.3** [TEST] `lib/seo/metadata.test.ts`:
  - `buildLandingMetadata()` retorna shape correcto (title, description, openGraph, twitter, robots, alternates)
  - title es string no vacío
  - description 50-200 chars
  - openGraph.type es "website"
  - alternates.canonical termina con `/`
- [ ] **T1.4** [IMPL] `lib/seo/metadata.ts` con `buildLandingMetadata()`.
- [ ] **T1.5** [TEST] `lib/seo/jsonld.test.ts`:
  - Cada builder retorna JSON parseable
  - `buildOrganizationLd()` tiene @type "Organization", name, url, logo, sameAs
  - `buildWebSiteLd()` tiene @type "WebSite", url, inLanguage "es-CO"
  - `buildSoftwareApplicationLd()` tiene @type "SoftwareApplication", offers.price "0", priceCurrency "COP"
  - `buildFaqPageLd(faqs)` tiene @type "FAQPage", mainEntity array
  - `buildAllLdSchemas()` retorna string con @graph conteniendo los 4 schemas
  - **Zod parsea el output de cada builder** (defense in depth)
- [ ] **T1.6** [IMPL] `lib/seo/jsonld.ts` con 5 builders + Zod schemas para testing.
- [ ] **T1.7** [VERIFY] `pnpm test lib/seo` verde.

## Phase 2 — Copy (TDD)

- [ ] **T2.1** [TEST] `lib/copy/es.test.ts` — agregar tests para bloque `landing`:
  - `landing.faqs` tiene 5-7 items, cada uno con q y a no vacíos
  - `landing.trust.openSource.href` es URL válida
  - `landing.trust.constitution.label` incluye "v1.1.0"
  - `landing.trust.tests.count > 500` (refleja realidad)
  - `landing.notFound.title` no contiene "404" (UX: "Página no encontrada")
  - `landing.serverError.title` no contiene "500"
  - Art. IV: no "ATS oficial", no "garantiza empleo"
- [ ] **T2.2** [IMPL] Agregar bloque `landing` a `lib/copy/es.ts`. NO modificar otros bloques.
- [ ] **T2.3** [VERIFY] `pnpm test lib/copy/es` verde.

## Phase 3 — Next.js metadata files (TDD)

- [ ] **T3.1** [TEST] E2E para sitemap.xml:
  - `GET /sitemap.xml` retorna 200
  - Content-Type: `application/xml`
  - Contiene las 7 URLs
  - XML válido (parsea con `new DOMParser().parseFromString(xml, "text/xml")`)
- [ ] **T3.2** [IMPL] `app/sitemap.ts` con función `sitemap(): MetadataRoute.Sitemap`.
- [ ] **T3.3** [TEST] E2E para robots.txt:
  - `GET /robots.txt` retorna 200
  - Content-Type: `text/plain`
  - Contiene `User-agent: *` y `Allow: /`
  - Contiene `Sitemap: https://buildcv.co/sitemap.xml`
- [ ] **T3.4** [IMPL] `app/robots.ts` con función `robots(): MetadataRoute.Robots`.
- [ ] **T3.5** [VERIFY] `pnpm test:e2e` para sitemap + robots verde.

## Phase 4 — Error pages (TDD)

- [ ] **T4.1** [TEST] `components/landing/error-fallback.test.tsx`:
  - Renderiza con role="alert" o aria-live
  - Muestra title y detail
  - Muestra botón de retry si se pasa onRetry
  - Muestra link a "/" si se pasa showHomeLink
  - Lang es "es-CO" implícito (en <html>)
- [ ] **T4.2** [IMPL] `components/landing/error-fallback.tsx` (componente compartido, recibe props).
- [ ] **T4.3** [IMPL] `app/not-found.tsx` (server component) que usa `error-fallback` con title="Página no encontrada" + 2 links.
- [ ] **T4.4** [IMPL] `app/error.tsx` ("use client") con `useEffect` que console.error + error-fallback con onRetry.
- [ ] **T4.5** [IMPL] `app/global-error.tsx` ("use client") con su propio `<html>` y `<body>` + error-fallback.
- [ ] **T4.6** [TEST] E2E para 404:
  - `GET /ruta-inexistente` retorna 404
  - HTML contiene "Página no encontrada"
  - HTML contiene 2 links funcionales (`/` y `/analizar`)
- [ ] **T4.7** [TEST] E2E para error boundary (forzando error):
  - Mock un componente que throw
  - Verificar que la UI de error se renderiza
- [ ] **T4.8** [VERIFY] `pnpm test:e2e` verde.

## Phase 5 — UI components (TDD, uno a la vez)

- [ ] **T5.1** [TEST] `components/landing/landing-nav.test.tsx`:
  - Renderiza 2-3 links
  - Link a `/` tiene `aria-current="page"` cuando pathname es `/`
  - Link a `/analizar` tiene `aria-current="page"` cuando pathname es `/analizar`
  - Link activo tiene estilo visual diferente
  - Role="navigation", aria-label
- [ ] **T5.2** [IMPL] `components/landing/landing-nav.tsx` con `usePathname` (client component).
- [ ] **T5.3** [TEST] `components/landing/faq-section.test.tsx`:
  - Renderiza N `<details>` con `<summary>` correspondientes
  - Click expande/colapsa
  - Summary tiene cursor-pointer y focus-visible
  - Renderiza un heading (h2) antes de la lista
  - WCAG: cada `<details>` tiene un id único y el summary tiene `aria-controls` correspondiente
- [ ] **T5.4** [IMPL] `components/landing/faq-section.tsx` (server component, sin state).
- [ ] **T5.5** [TEST] `components/landing/trust-signals.test.tsx`:
  - Renderiza 3-4 badges
  - Cada badge tiene label y opcionalmente href
  - Links externos tienen `rel="noopener noreferrer"` y `target="_blank"`
  - Links internos no tienen esos attrs
- [ ] **T5.6** [IMPL] `components/landing/trust-signals.tsx` (server component).
- [ ] **T5.7** [VERIFY] `pnpm test components/landing` verde.

## Phase 6 — Integración en `app/page.tsx`

- [ ] **T6.1** [IMPL] Modificar `app/page.tsx`:
  - Exportar `metadata` con `buildLandingMetadata()`
  - Reemplazar el header inline con `<LandingNav />`
  - Agregar `<FaqSection />` después de los 3 steps
  - Agregar `<TrustSignals />` antes del footer
  - Agregar `<script type="application/ld+json">` con `dangerouslySetInnerHTML={{ __html: buildAllLdSchemas() }}` (única excepción, documentada)
  - Footer extendido con link a GitHub (trust.openSource.href)
- [ ] **T6.2** [VERIFY] `pnpm build` verde.
- [ ] **T6.3** [VERIFY] `curl -sS http://localhost:3000/ | grep -A 5 application/ld+json` muestra JSON-LD válido.

## Phase 7 — prefers-reduced-motion (CSS)

- [ ] **T7.1** [IMPL] Agregar a `app/globals.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- [ ] **T7.2** [TEST] E2E con `page.emulateMedia({ reducedMotion: 'reduce' })`:
  - Carga el landing
  - Verifica que no hay animaciones de scroll (puede ser difícil de testear, opcional)
- [ ] **T7.3** [VERIFY] `pnpm test:e2e` verde.

## Phase 8 — Pre-merge verification (6 gates)

- [ ] **T8.1** `pnpm lint` → 0 errores, 0 warnings
- [ ] **T8.2** `pnpm typecheck` → 0 errores
- [ ] **T8.3** `pnpm test` → todos verdes; coverage ≥80% en nuevos
- [ ] **T8.4** `pnpm test:e2e` → verde (incluye new landing.spec.ts)
- [ ] **T8.5** `pnpm build` → 0 errores
- [ ] **T8.6** `cd .. && bash scripts/constitution-check.sh` → 20/20 passes, 0 crítico
- [ ] **T8.7** `rg "@ts-ignore|@ts-expect-error|eslint-disable|@ts-nocheck" BuildCv-web/` → 0 matches en código nuevo

## Phase 9 — Manual verification (Lighthouse + Rich Results)

- [ ] **T9.1** Lighthouse en producción (`pnpm build && pnpm start`):
  - Performance ≥ 90
  - Accessibility ≥ 95
  - Best Practices ≥ 95
  - SEO ≥ 95
- [ ] **T9.2** Google Rich Results Test: 0 errors, 0 warnings, 4 schemas detectados.
- [ ] **T9.3** Validar sitemap.xml con herramienta online.
- [ ] **T9.4** Validar robots.txt manualmente.
- [ ] **T9.5** Smoke del flujo: landing → /analizar → score → adapt → diff → back to landing. aria-current funciona en cada paso.

## Phase 10 — Commit + push + documentación

- [ ] **T10.1** Conventional commit con mensaje detallado.
- [ ] **T10.2** Push a `origin/main`.
- [ ] **T10.3** Engram: `mem_save` con sprint 007 close-out, topic_key `sdd/007-web-landing-ui/state`.
- [ ] **T10.4** Resumen técnico al user con métricas de Lighthouse.

## Critical Path

```
T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10
```

## Out of Scope (este sprint, deferred a v1)

- Analytics o tracking
- Newsletter signup
- Blog o content marketing
- i18n (es-CO only)
- PWA / Service Worker
- Open Graph dinámico con `@next/og` (imagen)
- Más allá de las 7 rutas en sitemap

## Risks

1. **`dangerouslySetInnerHTML` para JSON-LD**: única excepción en el proyecto. RIESGO si el JSON no es built-time. Mitigación: el JSON se genera con `JSON.stringify` en build time, no hay input de usuario. Test verifica que el string es JSON parseable.
2. **Lighthouse en dev mode es bajo**: HMR + DevTools bajan el score. Mitigación: documentar en quickstart que se debe correr en producción.
3. **global-error.tsx requiere `<html>` y `<body>` completos**: error común en Next.js 16. Mitigación: test verifica la estructura del HTML.
4. **sitemap.xml no se actualiza automáticamente en runtime**: el `lastModified: new Date()` se computa en build time. En v0.5 es OK (contenido estático). Para v1 con contenido dinámico, hay que revalidar manualmente.
5. **Search engine crawling**: en v0.5 el sitio no está en producción pública. Validar manualmente con curl + Google Search Console cuando se despliegue.
6. **JSON.stringify con caracteres especiales**: el escape nativo de JSON.stringify maneja `"`, `\`, `\b`, `\f`, `\n`, `\r`, `\t`, caracteres Unicode. Test verifica con strings que tengan estos chars.

## Definition of Done

- Spec leída y validada contra `app/page.tsx` real
- Tests escritos ANTES de la impl (TDD real)
- Todos los tests verdes
- Lint + typecheck + build + e2e verdes
- Constitution check 0 crítico
- 0 supresiones, 0 mocks falsos, 0 hacks
- Smoke manual: SEO metadata visible, JSON-LD parseable, sitemap válido, robots OK, 404 custom, FAQ funcional, trust signals clickeables, aria-current activo
- Lighthouse: 4 categorías ≥90 (mobile)
- Google Rich Results: 0 errors
- Commit con mensaje profesional
- Engram actualizado
- User informado con métricas
