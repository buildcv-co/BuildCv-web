# Feature 007-web-landing-ui — Polish de landing para v0.5.1

> **Status:** 🚧 EN CURSO · **Hito:** v0.5.1 (P0.5.1) · **Rama:** `main` (merge directo) · **Backend counterparts:** ninguno (frontend puro)
> **Pre-requisito:** v0.5 completa (sprints 0/1/2/3a/3b/4a/4b shipped en `4bf92b7`).
> **Sister features:** 008-observability-web (siguiente, sin spec aún) · v1 features (009/010/011) bloqueadas por Constitution Art. IX.

## Estado actual verificado (lectura de `app/page.tsx`)

El landing existe y es funcional pero **no es production-ready**:
- ✅ Hero (kicker + h1 + subtitle + 2 CTAs + honesty note)
- ✅ Steps "cómo funciona" (3 pasos numerados)
- ✅ Footer con privacy disclosure (Constitution Art. III)
- ✅ Copy honesto en español (Constitution Art. IV)
- ❌ Sin `<head>` metadata completa (OpenGraph, Twitter, canonical, robots)
- ❌ Sin structured data (JSON-LD)
- ❌ Sin sitemap.xml ni robots.txt
- ❌ Sin ErrorBoundary global
- ❌ Sin páginas de error custom (404, 500)
- ❌ Sin trust signals (repo, constitution, badges de tests)
- ❌ Sin FAQ section (SEO + objection handling)
- ❌ Sin aria-current en nav
- ❌ Sin "Probar con ejemplo" directo desde el landing

## Resumen

Polish del landing `/` para llevarlo de "funciona" a "production-ready":

1. **SEO técnico**: metadata completa, canonical, OpenGraph, Twitter Cards, JSON-LD (Organization, WebSite, FAQPage, SoftwareApplication), sitemap.xml, robots.txt.
2. **Páginas de error custom**: 404, 500, error boundary global con UI en español.
3. **Trust signals**: badges de "100% open source", "Constitution v1.1.0", "189 tests backend + 540 tests frontend", link al repo.
4. **FAQ section**: 5-7 preguntas frecuentes para SEO + objection handling.
5. **Accesibilidad ampliada**: aria-current en nav, focus visible consistente, prefers-reduced-motion.
6. **Performance**: preload de fuentes, Image (next/image) si hay imágenes, lazy load.
7. **Privacy/contact**: link a privacy policy (estática, no nueva feature), contact link.

**NO nuevas features de producto**. Esto es polish puro.

**Constitución cumplimiento:**

| Art. | Aplicación |
|---|---|
| **Art. III** (Privacidad) | Privacy disclosure prominente. Sin tracking, sin analytics, sin cookies. JSON-LD declara "no data stored on servers". |
| **Art. IV** (Encuadre honesto) | Trust signals honestos: "189 tests" no "100% accurate", "open source" no "AI-powered", "Constitution v1.1.0 ratified" no "promise" de features futuras. |
| **Art. V** (Entrada como dato) | Sin `dangerouslySetInnerHTML` con input de usuario. JSON-LD se construye con `next/script` `strategy="afterInteractive"`. |
| **Art. VIII** (TDD) | Tests para metadata, structured data, error pages, FAQ. |

## Stack técnico

- Next.js 16.2.7 (App Router) + React 19.2.4
- TypeScript ^5 strict
- Tailwind v4 (ya en uso)
- `next/script` para JSON-LD
- `next/image` si hay imágenes (no en este sprint, queda para v1)
- `next/font` con display swap (preload implícito)
- Sin librería UI externa (diseño custom consistente)
- Sin testing framework nuevo: reuso de Vitest 2 + RTL 16 + Playwright 1

## Goals

- **G-1.** Lighthouse SEO score ≥95.
- **G-2.** Lighthouse Performance score ≥90 (mobile).
- **G-3.** Lighthouse Accessibility score ≥95.
- **G-4.** Lighthouse Best Practices score ≥95.
- **G-5.** 0 console errors en navegación normal.
- **G-6.** JSON-LD valida con [Google Rich Results Test](https://search.google.com/test/rich-results).
- **G-7.** sitemap.xml accesible en `/sitemap.xml`.
- **G-8.** robots.txt accesible en `/robots.txt`.
- **G-9.** Error pages custom para 404 y 500 (en español, con CTA de retorno).
- **G-10.** Global ErrorBoundary que captura errores no manejados (en español, con link a /).

## Non-Goals

- **NG-1.** Analytics o tracking de cualquier tipo (Constitution Art. III privacy).
- **NG-2.** Newsletter signup o lead capture (v1 con Habeas Data).
- **NG-3.** Blog o content marketing (fuera de scope).
- **NG-4.** PWA / Service Worker (v1 si hay demanda).
- **NG-5.** i18n (es-CO es el único locale soportado en v0.5; estructura para v1).

## User Scenarios

### User Story 1 — Descubrir el producto vía SEO (Priority: P1)
Como usuario que busca "como analizar mi CV" en Google, llego al landing vía resultado de búsqueda, veo claramente qué hace el producto, y hago click en "Analizar mi CV".

**Acceptance Scenarios**:
1. **Given** Google indexa el sitio, **When** el usuario busca "analizar CV Colombia", **Then** el snippet muestra title + description + FAQ rich results.
2. **Given** el usuario clickea el resultado, **When** llega a `/`, **Then** ve el hero, los 3 steps, y la CTA principal.
3. **Given** el JSON-LD, **When** Google lo procesa, **Then** la página aparece como "SoftwareApplication" con FAQ rich results.

### User Story 2 — Resolver objeciones vía FAQ (Priority: P1)
Como usuario escéptico, quiero ver respuestas a "¿mis datos se guardan?", "¿la IA inventa contenido?", "¿cuánto cuesta?" antes de comprometerme.

**Acceptance Scenarios**:
1. **Given** el landing tiene FAQ, **When** el usuario scroll-ea, **Then** ve 5-7 preguntas con respuestas en español honestas.
2. **Given** el usuario abre la FAQ, **When** lee, **Then** las respuestas coinciden con la Constitution (Art. III no guardar datos, Art. I no invención, v0 gratis).
3. **Given** el usuario clickea una pregunta, **Then** se expande/colapsa (`<details>`/`<summary>` por accesibilidad, sin librería).

### User Story 3 — Error 404 o 500 (Priority: P2)
Como usuario que sigue un link roto, llego a una página 404 custom en español con CTA "Volver al inicio".

**Acceptance Scenarios**:
1. **Given** el usuario navega a `/ruta-que-no-existe`, **Then** ve la página 404 custom con copy en español, link a `/` y link a `/analizar`.
2. **Given** el backend tira 500, **Then** ve la página 500 custom con copy honesto ("Ocurrió un error inesperado, no es tu culpa") y link a `/`.
3. **Given** un componente React tira una excepción no manejada, **Then** el ErrorBoundary global captura y muestra la UI de error, no una pantalla blanca.

### User Story 4 — Verificar confianza vía trust signals (Priority: P2)
Como usuario técnico, quiero ver evidencia objetiva de que el proyecto es real (tests, constitution, open source) antes de confiarle mi CV.

**Acceptance Scenarios**:
1. **Given** el landing tiene trust signals, **When** el usuario scroll-ea al footer o una sección dedicada, **Then** ve: "Código abierto en GitHub", "Constitution v1.1.0 ratificada", "540 tests automatizados", "0 supresiones", "Stack: Next.js 16, .NET 10, Zod, Tiptap deferred".
2. **Given** el usuario clickea "Código abierto", **Then** abre `github.com/buildcv-co/BuildCv-web` en nueva pestaña.

## Key Functional Requirements (FR)

| ID | Requirement |
|---|---|
| **FR-072** | El landing **MUST** tener metadata completa en `metadata` export: title, description, keywords, openGraph (title, description, url, siteName, locale, type), twitter (card, title, description, creator), robots, alternates (canonical). |
| **FR-073** | El landing **MUST** tener JSON-LD con `@context: "https://schema.org"` y al menos 3 schemas: Organization, WebSite, SoftwareApplication. Adicional: FAQPage si hay FAQ. |
| **FR-074** | El proyecto **MUST** tener `app/sitemap.ts` que genera sitemap.xml dinámico con las rutas públicas. |
| **FR-075** | El proyecto **MUST** tener `app/robots.ts` que genera robots.txt: allow all, apuntar al sitemap. |
| **FR-076** | El proyecto **MUST** tener `app/not-found.tsx` para 404 con copy en español, CTA a `/` y `/analizar`. |
| **FR-077** | El proyecto **MUST** tener `app/error.tsx` (error boundary de Next.js para rutas) con copy en español, CTA a `/`. |
| **FR-078** | El proyecto **MUST** tener `app/global-error.tsx` (error boundary raíz) con HTML + body completos (es un reemplazo de `<html>`), copy en español. |
| **FR-079** | El landing **MUST** tener una sección FAQ con 5-7 preguntas usando `<details>`/`<summary>` (nativo, accesible). JSON-LD con FAQPage schema. |
| **FR-080** | El landing **MUST** tener trust signals: "Open source", "Constitution v1.1.0", "X tests", link a `github.com/buildcv-co`. |
| **FR-081** | El nav (header del landing) **MUST** marcar la ruta activa con `aria-current="page"`. |
| **FR-082** | Todos los links externos **MUST** tener `rel="noopener noreferrer"` y `target="_blank"`. |
| **FR-083** | El landing **MUST** respetar `prefers-reduced-motion` (sin animaciones de scroll, sin transiciones largas). |

## Non-Functional Requirements (NFR)

| ID | Requirement |
|---|---|
| **NFR-036** | Lighthouse Performance ≥90 en mobile. |
| **NFR-037** | Lighthouse SEO ≥95. |
| **NFR-038** | Lighthouse Accessibility ≥95. |
| **NFR-039** | Lighthouse Best Practices ≥95. |
| **NFR-040** | JSON-LD valida con Google Rich Results Test. |
| **NFR-041** | 0 console errors en navegación normal (landing, /analizar, /importar, /analizar/editar, /analizar/diff). |
| **NFR-042** | sitemap.xml incluye TODAS las rutas públicas: `/`, `/analizar`, `/importar`, `/analizar/editar`, `/analizar/diff`, `/analizar/adapt`, `/analizar/export`. |

## Edge Cases

- **JSON-LD con strings que contienen comillas o `<`**: usar `JSON.stringify` con escape nativo, no template strings.
- **sitemap.xml con muchas rutas**: en v0.5 son ~7 rutas. No escala problema.
- **ErrorBoundary en SSR**: `app/error.tsx` solo captura errores de cliente. `app/global-error.tsx` captura errores de root layout. Ambos son `"use client"`.
- **Error en JSON.parse del JSON-LD**: no debería pasar porque se genera con `JSON.stringify` y luego se inyecta via `dangerouslySetInnerHTML` (única excepción en todo el proyecto, y es seguro porque el JSON se genera en build time).
- **robots.txt para staging vs prod**: el mismo archivo es OK; staging debe tener `noindex` pero como no hay staging público, no aplica.

## Out of Scope (v0.5.1, deferred a v1)

- Blog o content marketing
- Newsletter signup
- i18n (es-CO only)
- PWA / Service Worker
- A/B testing
- Analytics o tracking
- Dark/light mode toggle (ya es dark only)
- Cookie banner (no usamos cookies)

## Success Criteria

- ✅ Lighthouse mobile: Performance ≥90, SEO ≥95, Accessibility ≥95, Best Practices ≥95.
- ✅ JSON-LD valida con Google Rich Results Test sin warnings.
- ✅ sitemap.xml incluye las 7 rutas públicas.
- ✅ robots.txt permite todo y apunta al sitemap.
- ✅ 404 page en español con CTAs funcionales.
- ✅ 500 page en español con CTA a `/`.
- ✅ Global error boundary captura excepciones no manejadas.
- ✅ FAQ con 5-7 preguntas usando `<details>`/`<summary>`.
- ✅ Trust signals: open source, Constitution v1.1.0, tests count, link al repo.
- ✅ aria-current en nav.
- ✅ WCAG 2.2 AA preservado (no romper el estándar existente).

## Next Phase

→ `plan.md` — lista de archivos a crear/modificar y orden de implementación.
→ `research.md` — comparativa de JSON-LD schemas y best practices de SEO para SaaS en español.
→ `data-model.md` — tipos TypeScript de los nuevos componentes.
→ `quickstart.md` — pasos para verificar Lighthouse, Rich Results, sitemap, robots.
→ `tasks.md` — T-007-01..N agrupadas por fase.
