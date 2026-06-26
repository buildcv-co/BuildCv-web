# Feature 008-web-observability-web — Observabilidad del frontend sin third-party tracking

> **Status:** ✅ SHIPPED (commit 4168475, 2026-06-09) · **Hito:** v0.5.1 (P0.5.1) · **Rama:** `main` (merge directo) · **Backend counterparts:** ninguno (frontend puro; el backend 008-observability-api NO se implementa en este sprint — está documentado como deferido en INDEX)
> **Pre-requisito:** v0.5 completa (sprints 0/1/2/3a/3b/4a/4b/007 shipped en `a312662`).
> **Sister features:** 007-web-landing-ui (shipped, con error pages base), 008-observability-api (backlog, sin spec).

## Estado actual verificado (lectura del código real)

### Lo que YA existe (sprint 007)

- `app/error.tsx` (RouteError): error boundary de rutas, "use client", console.error + ErrorFallback con retry.
- `app/global-error.tsx` (GlobalError): error boundary raíz, "use client", reemplaza `<html>`+`<body>`.
- `app/not-found.tsx` (NotFound): 404 con ErrorFallback.
- `components/landing/error-fallback.tsx` (ErrorFallback): UI compartida con `role="alert"`, props configurables.
- `lib/copy/es.ts` tiene `landing.{notFound, serverError, globalError}` copy.

### Lo que FALTA (alcance de este sprint)

- **Client-side error reporting** vía `lib/observability/`: helpers puros para loggear errores con contexto (URL, userAgent, timestamp, app version) a `console.error` (NO third-party).
- **Global React error boundary** (`<ErrorBoundary>` component) que captura errores de render en componentes de cliente que NO están bajo `app/error.tsx` (ej. errores en componentes que no lanzan al framework de Next.js, sino que solo se loggean).
- **Web Vitals monitoring** vía `useReportWebVitals`: captura LCP, FID, CLS, INP, TTFB y los reporta a `console.info` estructurado (NO a third-party).
- **Dev-mode error overlay**: en dev, un panel flotante con los últimos N errores (no en prod).
- **Error reporting a `/api/log` BFF** (opcional, nuevo BFF simple): si el usuario lo desea, los errores se pueden enviar a un endpoint del propio backend (NO third-party). En este sprint: **infraestructura lista pero endpoint opcional** (configurable via env).
- **E2E test que verifica que un error en un componente se reporta correctamente**.
- **Privacy por diseño**: cero third-party scripts, cero cookies, cero fingerprinting, cero tracking. Constitution Art. III estricto.

## Resumen

Observabilidad del frontend **sin third-party tracking** (Constitution Art. III privacy). Captura errores de cliente y Web Vitals localmente, los loggea con contexto estructurado, opcionalmente los envía a un BFF propio. Privacy-first: el usuario puede ver exactamente qué se reporta y opt-out.

**NO** incluye:
- Sentry, PostHog, Mixpanel, Amplitude, Google Analytics, Plausible, Fathom, Umami, ni ningún otro servicio externo.
- Cookies de tracking.
- Fingerprinting.
- Cross-site tracking.
- Backend de observabilidad (008-api) — deferido.

**SÍ** incluye:
- `lib/observability/error-reporter.ts`: helper puro que captura `Error` + contexto (URL, userAgent, viewport, app version, build SHA, locale) y lo reporta via `console.error` (siempre) o via POST a `/api/log` (configurable).
- `components/observability/error-boundary.tsx`: `<ErrorBoundary>` component que captura errores de React no manejados (complementa `app/error.tsx` de Next.js).
- `lib/observability/use-report-web-vitals.ts`: hook que reporta Web Vitals a `console.info` estructurado.
- `components/observability/dev-error-overlay.tsx`: panel flotante en dev mode con los últimos 20 errores (NO en prod, configurado via `process.env.NODE_ENV`).
- `app/api/log/route.ts` (opcional): BFF que recibe logs y los persiste en memoria del proceso (NO disco, NO DB, se pierden al reiniciar — es solo para debugging local).
- Tests E2E que verifican que un error en un componente se reporta correctamente al console Y al BFF si está configurado.

**Constitución cumplimiento:**

| Art. | Aplicación |
|---|---|
| **Art. III** (Privacidad) | **CERO third-party scripts.** Cero cookies. Cero fingerprinting. Todo es local o BFF propio. JSON-LD de 007 ya declara "no data stored on servers" — 008 lo hace verificable (logs en memoria, no disco). |
| **Art. IV** (Encuadre honesto) | UI del dev overlay dice "Errores locales (no se envían a terceros)" prominentemente. Copy honesto. Sin claims de "AI monitoring" ni "real-time tracking". |
| **Art. V** (Entrada como dato) | El error message del usuario se trata como DATO. Se loggea verbatim, NO se interpreta como instrucción. |
| **Art. VIII** (TDD) | Tests para error-reporter, error-boundary, web-vitals, dev-overlay, BFF. |
| **Art. VI** (Clean Arch) | `lib/observability/` es una capa de infraestructura del frontend. Reusable. Testeable. |
| **Art. VII** (v0.5.1 sin fricción) | Sin cuentas, sin opt-in, sin tracking. Funciona out-of-the-box. |

## Stack técnico

- Next.js 16.2.7 (App Router) + React 19.2.4
- TypeScript ^5 strict
- Tailwind v4 (ya en uso)
- `web-vitals` (librería oficial de Google para Web Vitals) — ÚNICA dep nueva
- `react-error-boundary` (librería popular, MIT, ~3 KB) — ÚNICA dep nueva
- Sin testing framework nuevo: reuso de Vitest 2 + RTL 16 + Playwright 1
- Sin third-party: NADA de Sentry/PostHog/GA/etc.

## Goals

- **G-1.** Cualquier error de React no manejado se loggea con contexto estructurado (URL, userAgent, timestamp, app version, build SHA, viewport, locale).
- **G-2.** Web Vitals (LCP, FID, CLS, INP, TTFB) se reportan una vez por sesión en formato estructurado.
- **G-3.** Dev mode muestra un panel flotante con los últimos 20 errores en la esquina inferior derecha, dismissible.
- **G-4.** BFF `/api/log` (opcional) acepta POST con shape Zod, persiste en memoria (NO disco), sirve GET para debug.
- **G-5.** 0 third-party scripts, 0 cookies, 0 fingerprinting verificable.
- **G-6.** Tests E2E que simulan un error en un componente y verifican que se reporta correctamente.
- **G-7.** WCAG 2.2 AA preservado (dev overlay tiene `role="alert"` + `aria-label` + keyboard dismiss).

## Non-Goals

- **NG-1.** Cualquier third-party tracking service (Sentry, PostHog, GA, etc.) — Constitution Art. III.
- **NG-2.** Backend de observabilidad persistente (008-api) — deferido.
- **NG-3.** Real-time dashboards, alerting, PagerDuty integration — fuera de scope del producto.
- **NG-4.** Cross-user analytics (qué % de usuarios ven X) — sería third-party tracking.
- **NG-5.** Source maps privados en prod — Next.js ya tiene su propio manejo.

## User Scenarios

### User Story 1 — Dev ve un error en su app (Priority: P1)

Como dev, estoy probando el editor. Un componente tira una excepción. Quiero ver el error en pantalla con contexto (URL, userAgent, stack) sin tener que abrir DevTools.

**Acceptance Scenarios**:
1. **Given** dev mode activo (`process.env.NODE_ENV === "development"`), **When** un componente tira una excepción, **Then** un panel flotante aparece en la esquina inferior derecha con el error.
2. **Given** el dev overlay está visible, **When** el dev clickea "Dismiss", **Then** el panel se cierra y el error NO se vuelve a mostrar en esta sesión.
3. **Given** el dev overlay está visible, **When** el dev clickea "Copy stack", **Then** el stack trace se copia al clipboard.
4. **Given** el dev overlay está visible, **When** el dev navega a otra página, **Then** el panel persiste (no se cierra en navegación).
5. **Given** el dev overlay está visible, **When** hay 20+ errores, **Then** los más viejos se descartan (FIFO).

### User Story 2 — ErrorBoundary captura errores no manejados (Priority: P1)

Como dev, un componente de cliente tira una excepción durante el render. Quiero que la app no se rompa en blanco, sino que muestre un mensaje útil y reporte el error.

**Acceptance Scenarios**:
1. **Given** un componente cliente tira una excepción, **When** React intenta renderizarlo, **Then** el `<ErrorBoundary>` captura el error, lo reporta via `error-reporter`, y muestra un fallback UI.
2. **Given** el fallback UI se muestra, **When** el usuario clickea "Reintentar", **Then** el componente se vuelve a renderizar (reset del state del boundary).
3. **Given** un error de cliente, **When** se reporta, **Then** el log estructurado incluye: error.message, error.stack, componentStack, URL, userAgent, app version, timestamp.

### User Story 3 — Web Vitals monitoreados (Priority: P2)

Como dev, quiero ver cómo afectan los cambios de UI a las métricas Core Web Vitals, sin enviar nada a third-party.

**Acceptance Scenarios**:
1. **Given** un usuario carga una página, **When** los Web Vitals se estabilizan, **Then** se loggean una vez por sesión a `console.info` con formato estructurado.
2. **Given** LCP se mide, **When** el dev abre la consola, **Then** ve `[WebVital] name=LCP value=1234 rating=good id=...`
3. **Given** INP se mide (reemplazo de FID en 2024+), **When** el usuario interactúa, **Then** se loggea con el input delay.

### User Story 4 — BFF opcional `/api/log` (Priority: P3)

Como dev, puedo opcionalmente activar el BFF para que los logs se envíen a un endpoint propio (en vez de solo console). Esto es útil para debugging en environments donde no tengo DevTools abierto.

**Acceptance Scenarios**:
1. **Given** el BFF está configurado (env `BUILDCV_LOG_ENDPOINT=enabled`), **When** un error se reporta, **Then** se envía un POST a `/api/log` con el payload.
2. **Given** el BFF recibe el POST, **When** valida con Zod, **Then** persiste en memoria (Map) y retorna 204.
3. **Given** el dev hace GET a `/api/log`, **Then** ve los últimos 100 logs en formato JSON.
4. **Given** el BFF NO está configurado (default), **Then** los logs van solo a `console.error` (no HTTP request).
5. **Given** el proceso se reinicia, **Then** los logs en memoria se pierden (NO disco, NO DB).

## Key Functional Requirements (FR)

| ID | Requirement |
|---|---|
| **FR-084** | El sistema **MUST** tener un helper `error-reporter` que capture `Error` + contexto y los reporte via `console.error` (siempre) o via POST a `/api/log` (configurable). |
| **FR-085** | El helper **MUST** incluir en cada log: `timestamp` (ISO 8601), `error.message`, `error.stack`, `url` (window.location.href), `userAgent`, `viewport` (innerWidth × innerHeight), `appVersion` (de package.json), `buildSha` (de env), `locale` (navigator.language). |
| **FR-086** | El sistema **MUST** tener un `<ErrorBoundary>` component que capture errores de render en componentes de cliente. Complementa `app/error.tsx` (que solo captura errores de Next.js routing). |
| **FR-087** | El ErrorBoundary **MUST** tener un fallback UI con: título, detalle, botón "Reintentar" (reset), link "Volver al inicio" (opcional), `role="alert"`. |
| **FR-088** | El sistema **MUST** tener un hook `useReportWebVitals` que use la librería `web-vitals` para reportar LCP, FID, CLS, INP, TTFB a `console.info` estructurado. |
| **FR-089** | El sistema **MUST** tener un `<DevErrorOverlay>` component visible SOLO en dev mode (`process.env.NODE_ENV === "development"`), con los últimos 20 errores, dismissible, copy stack al clipboard. |
| **FR-090** | El BFF `/api/log` (opcional) **MUST** validar el payload con Zod, persistir en memoria (Map), servir GET con los últimos 100 logs. **MUST NOT** persistir en disco, **MUST NOT** enviar a third-party. |
| **FR-091** | El payload del BFF **MUST** tener shape: `{ timestamp, level: 'error' | 'warning' | 'info', message, stack?, context: { url, userAgent, viewport, appVersion, buildSha, locale } }`. |
| **FR-092** | El sistema **MUST** ser 100% offline-capable. Sin third-party scripts, sin cookies, sin fingerprinting, sin requests a dominios externos (excepto el backend del propio proyecto). |
| **FR-093** | El dev overlay **MUST** tener `role="alert"`, `aria-live="polite"`, `aria-label="Panel de errores en desarrollo"`, botón "Dismiss" con `aria-label="Cerrar panel de errores"`. |
| **FR-094** | El error reporter **MUST** deduplicar errores idénticos: si el mismo `error.message + url` ocurre 5 veces en 1 minuto, solo se reporta 1 vez (con un contador). |

## Non-Functional Requirements (NFR)

| ID | Requirement |
|---|---|
| **NFR-043** | El error reporter **MUST NOT** introducir latencia perceptible (>5ms en el path crítico del render). |
| **NFR-044** | El dev overlay **MUST NOT** aparecer en producción. Verificado con test E2E que verifica `process.env.NODE_ENV !== "development"`. |
| **NFR-045** | El BFF `/api/log` **MUST** limitar el tamaño del Map a 100 entradas (FIFO). |
| **NFR-046** | El error reporter **MUST NOT** loggear passwords, tokens, ni contenido de CV/vacante (Constitution Art. III NFR-002). El helper acepta un segundo parámetro opcional `redact?: (message: string) => string` para que el caller pueda redactor manualmente. |
| **NFR-047** | El bundle size overhead **MUST** ser <30 KB (web-vitals ~5 KB + react-error-boundary ~3 KB + código nuevo ~20 KB). |
| **NFR-048** | Tests E2E **MUST** simular un error en un componente (via test route) y verificar que se loggea + se muestra en el dev overlay. |
| **NFR-049** | WCAG 2.2 AA preservado: dev overlay accesible por teclado, screen reader anuncia errores. |
| **NFR-050** | 0 console errors en navegación normal sin errores. Los console.error/warn SOLO aparecen cuando hay errores reales. |

## Edge Cases

- **ErrorBoundary dentro de otro ErrorBoundary**: el más interno captura primero.
- **Error en Server Component**: no capturado por ErrorBoundary (es client only). Capturado por `app/error.tsx`.
- **Error en el render de Next.js routing**: no capturado por ErrorBoundary. Capturado por `app/error.tsx`.
- **BFF recibe payload inválido**: Zod rechaza, retorna 400. NO se guarda en memoria.
- **BFF recibe 100+ logs**: el Map tiene cap 100 (FIFO). El log #101 descarta el #1.
- **Web Vitals no se miden (SSR puro)**: el hook solo corre en cliente. SSR no emite métricas.
- **Dev overlay con 20+ errores**: FIFO. El más viejo se descarta.
- **Error en producción sin BFF configurado**: solo `console.error`. NO se intenta HTTP request (fail silently).
- **Error en producción con BFF configurado pero servidor caído**: el `fetch` falla silenciosamente. El error original se loggea a `console.error` de todos modos (NFR-046).
- **ErrorBoundary en Strict Mode (desarrollo)**: React monta/desmonta componentes dos veces. El boundary puede capturar errores "fantasma" durante el segundo mount. Mitigación: el `componentDidCatch` solo loggea (no side effects críticos).
- **Deduplicación de errores**: si el mismo error.message + url ocurre en ventanas de 1 minuto, solo se reporta 1 vez. Esto evita spam en consola.

## Key Functional Entities (en `lib/observability/types.ts`)

```typescript
export type LogLevel = "error" | "warning" | "info";

export interface LogContext {
  readonly url: string;
  readonly userAgent: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly appVersion: string;
  readonly buildSha: string;
  readonly locale: string;
}

export interface LogEntry {
  readonly timestamp: string;  // ISO 8601
  readonly level: LogLevel;
  readonly message: string;
  readonly stack?: string;
  readonly context: LogContext;
  readonly componentStack?: string;  // React-specific
  readonly dedupeKey?: string;  // for dedup
  readonly dedupeCount?: number;  // how many times this has been seen
}

export interface WebVitalsEntry extends LogEntry {
  readonly level: "info";
  readonly metric: "LCP" | "FID" | "CLS" | "INP" | "TTFB" | "FCP";
  readonly value: number;
  readonly rating: "good" | "needs-improvement" | "poor";
  readonly id: string;
  readonly navigationType: "navigate" | "reload" | "back-forward" | "prerender";
}
```

## Out of Scope (v0.5.1, deferred a v1+)

- Backend de observabilidad persistente (008-api) — backlog.
- Source maps privados en prod (Next.js ya tiene su propio manejo).
- Real-time dashboards / alerting / PagerDuty.
- Cross-user analytics (% de usuarios que ven X).
- Sampling de errores en producción (enviar 1 de cada N para reducir volumen) — para v1 si hay volumen alto.
- Persistencia en disco o DB — privacy first.

## Success Criteria

- ✅ Un error en cualquier componente cliente se loggea con contexto estructurado.
- ✅ El dev overlay aparece SOLO en dev mode y NO en producción.
- ✅ El BFF `/api/log` funciona opcionalmente y NO se activa por default.
- ✅ 0 third-party scripts, 0 cookies, 0 fingerprinting verificable.
- ✅ Web Vitals se reportan una vez por sesión con formato estructurado.
- ✅ Tests E2E simulan un error y verifican el reporte.
- ✅ WCAG 2.2 AA preservado.
- ✅ Bundle size overhead <30 KB.

## Next Phase

→ `plan.md` — lista de archivos a crear/modificar y orden de implementación.
→ `research.md` — comparativa de `react-error-boundary` vs custom, `web-vitals` integration.
→ `data-model.md` — tipos TypeScript de logs y web vitals.
→ `quickstart.md` — pasos para verificar el dev overlay, BFF, dedup.
→ `tasks.md` — T-008-01..N agrupadas por fase.

---

## v2.0.0 Changes (delta from change 021-structured-cv-import-and-job-input, archived 2026-06-26)

> **Adds**: `engineVersion` tag to all observability events tied to backend responses
> **Constitution**: Art. III (privacy first — no PII in logs)
> **Source delta**: [`./specs/008-observability-web/spec.md`](./specs/008-observability-web/spec.md)
> **Archive report**: [`./archive-report.md`](./archive-report.md)

### ADDED Requirements

#### Requirement: Every observability event includes engineVersion

The system MUST tag every observability event (error logs, web vitals, BFF `/api/log` payloads) that originates from a backend interaction with an `engineVersion` field. When the backend response carries `engineVersion`, the observability event MUST echo that exact value. When no backend interaction is involved, the field MUST be `"n/a"`.

#### Scenario: Score event carries engineVersion

- GIVEN a `POST /api/score` returns `engineVersion: "2.0.0"`
- WHEN the client logs a `score.success` event
- THEN the event payload includes `engineVersion: "2.0.0"`

#### Scenario: Import event carries engineVersion

- GIVEN a `POST /api/import` returns `engineVersion: "2.0.0"`
- WHEN the client logs an `import.success` event
- THEN the event payload includes `engineVersion: "2.0.0"`

#### Scenario: Non-backend event

- GIVEN a client-side error not tied to a backend call
- WHEN logged
- THEN `engineVersion: "n/a"`

#### Requirement: Version mismatch logged as warning

The system MUST log a warning (level `"warning"`) when the client requests `engineVersion: "2.0.0"` but receives a `1.0.0` response (or vice versa), tagging the event with both the requested and received versions.

#### Scenario: Requested v2, got v1

- GIVEN the client sends `engineVersion: "2.0.0"`
- WHEN the response carries `engineVersion: "1.0.0"` (server still on legacy)
- THEN a warning event is logged with `requested: "2.0.0"`, `received: "1.0.0"`, and a stable `code: "ENGINE_VERSION_DOWNGRADE"`

#### Scenario: Requested v1, got v2

- GIVEN the client sends `engineVersion: "1.0.0"`
- WHEN the response carries `engineVersion: "2.0.0"` (server upgraded)
- THEN a warning event is logged with `code: "ENGINE_VERSION_UPGRADE"`

#### Requirement: Aggregated metric per engineVersion

The system MUST expose (via the `/api/log` BFF) a per-engineVersion counter that the dev can `GET` to inspect how many events of each kind ran against each backend version.

#### Scenario: GET /api/log/metrics

- GIVEN 3 events ran against `"2.0.0"` and 7 against `"1.0.0"`
- WHEN the dev GETs `/api/log/metrics`
- THEN the response is `{ "2.0.0": { events: 3 }, "1.0.0": { events: 7 } }`

#### Scenario: Metrics survive within session

- GIVEN events are logged over the session
- WHEN the BFF is queried
- THEN the counters reflect the live totals (FIFO at 100 entries for the event log; metrics counters are unbounded for the session)

### MODIFIED Requirements

#### Requirement: FR-085 — Log context fields

The system MUST include `engineVersion` (default `"n/a"`) in every log payload's `context` object.
(Previously: the context object contained `url, userAgent, viewport, appVersion, buildSha, locale` and did NOT include `engineVersion`.)

#### Scenario: Log payload shape

- GIVEN any log event
- WHEN the payload is inspected
- THEN `context.engineVersion` is present alongside the other context fields

#### Scenario: Web vitals carry engineVersion

- GIVEN a web vitals metric is reported
- WHEN the structured log is written
- THEN `context.engineVersion` is `"n/a"` (web vitals are not tied to backend calls)

#### Requirement: FR-091 — BFF payload shape

The system MUST accept `/api/log` payloads whose `context` includes `engineVersion`.
(Previously: the payload shape did not include `engineVersion`.)

#### Scenario: Schema accepts new field

- GIVEN a payload with `context.engineVersion`
- WHEN `LogPayloadSchema.safeParse` runs (Zod)
- THEN it succeeds

#### Scenario: Schema rejects unknown fields when strict

- GIVEN a payload with `context.engineVersionX` (typo)
- WHEN strict Zod validation runs
- THEN the payload is rejected with a 400 listing the unknown field

### REMOVED Requirements

_None._

### Rollback Plan

#### Requirement: engineVersion field is additive, not breaking

The system MUST treat `engineVersion` as a strictly additive observability field. Its presence MUST NOT cause any v1 client to fail or change behavior. Existing v1 consumers that ignore the new field continue to work unchanged.

#### Scenario: v1 consumer ignores engineVersion

- GIVEN a downstream consumer that does not know about `engineVersion`
- WHEN it receives an updated log payload
- THEN it parses the legacy fields successfully and ignores the new field

#### Scenario: Rollback removes the tag, not the data

- GIVEN the owner rolls back to a build without the engineVersion tag
- WHEN logs are emitted
- THEN the tag is absent (no error, no crash) and the rest of the payload is intact
