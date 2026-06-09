# Tasks: 008-web-observability-web

> **TDD estricto (Constitution Art. VIII).** Test → rojo → impl → verde → refactor. Sin supresiones, sin mocks falsos, sin `any` inseguros.
>
> **Marco:** Vitest 2 + RTL 16 + jsdom (sprint 0) + Playwright 1 chromium (E2E).
>
> **Spec ya escrita y validada.** Ver `spec.md` para el alcance.
>
> **2 nuevas deps:** `web-vitals@^4` (oficial de Google, MIT) + `react-error-boundary@^5` (MIT).
>
> **Cero third-party tracking.** Privacy by design.

## Phase 0 — Pre-flight

- [x] **T0.1** Spec.md, plan.md, research.md, data-model.md, quickstart.md escritas.
- [x] **T0.2** `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `components/landing/error-fallback.tsx` ya existen (sprint 007). 008 los REUSA sin duplicar.
- [x] **T0.3** v0.5 + 007 shipped. 622 unit + 54 E2E verdes.
- [x] **T0.4** Constitution Art. III privacy: cero third-party scripts. Validar con `rg` post-impl.

## Phase 1 — Install deps

- [ ] **T1.1** `cd BuildCv-web && pnpm add web-vitals@^4 react-error-boundary@^5`.
- [ ] **T1.2** Verificar que `pnpm install` no rompe otras deps.
- [ ] **T1.3** Verificar que `pnpm lint` y `pnpm typecheck` siguen verdes (introducir nuevas deps puede requerir ajustes de tipos).

## Phase 2 — Types + Helpers (TDD puro)

- [ ] **T2.1** [TEST] `lib/observability/types.test.ts`:
  - `LogLevel`: union literal acepta los 3 valores, rechaza otros
  - `LogContext`: shape completo (todas las keys requeridas)
  - `LogEntry`: shape completo, todos los campos opcionales correctamente tipados
  - `WebVitalName`: union literal con las 6 métricas
  - `WebVitalRating`: union literal con los 3 ratings
  - `WebVitalsEntry extends Omit<LogEntry, ...>`: el Omit funciona
- [ ] **T2.2** [IMPL] `lib/observability/types.ts` con todos los tipos como `readonly`.
- [ ] **T2.3** [TEST] `lib/observability/context.test.ts`:
  - `buildContext()` retorna shape completo en jsdom (window.location, navigator.userAgent, navigator.language, window.innerWidth/Height)
  - Maneja `window === undefined` (SSR safe) → retorna valores por defecto seguros
  - Maneja `navigator === undefined` → mismo fallback
- [ ] **T2.4** [IMPL] `lib/observability/context.ts` con `buildContext(): LogContext` SSR-safe.
- [ ] **T2.5** [TEST] `lib/observability/dedupe.test.ts`:
  - `shouldDedupe(entry, recent)` con 0 recientes → false
  - 1-4 recientes en ventana → false
  - 5+ recientes en ventana → true
  - Recientes fuera de ventana (>60s) → false
  - Mismo `dedupeKey` → cuentan
  - Diferente `dedupeKey` → no cuentan
- [ ] **T2.6** [IMPL] `lib/observability/dedupe.ts` con `shouldDedupe(entry, recent): boolean`.
- [ ] **T2.7** [TEST] `lib/observability/log-store.test.ts`:
  - `logStore.add(entry)` agrega al array
  - `logStore.getAll()` retorna copia (no referencia)
  - `logStore.size()` retorna count
  - `logStore.clear()` vacía
  - FIFO: agregar 101 entradas → la primera se descarta, size permanece 100
- [ ] **T2.8** [IMPL] `lib/observability/log-store.ts` con `logStore` singleton.
- [ ] **T2.9** [VERIFY] `pnpm test lib/observability` verde.

## Phase 3 — Error reporter (TDD)

- [ ] **T3.1** [TEST] `lib/observability/error-reporter.test.ts`:
  - `reportError(error)` loggea a console.error con formato estructurado
  - `reportError(error, { level: 'warning' })` loggea con level correcto
  - `reportError(error, { redact: m => m.replace(/token=\w+/g, 'token=***') })` redacta el mensaje
  - `reportError(error, { context: { url: 'https://test' } })` usa el context custom (merge con buildContext)
  - Dedupe: 5 errores idénticos → solo 1 console.error
  - BFF OFF (default): no se llama `fetch`
  - `enableBffLogging()` + error → se llama `fetch('/api/log', ...)` con payload correcto
  - BFF fetch faila → no throw (fail silently, NFR-046)
  - Retorna LogEntry con timestamp, level, message, stack, context, dedupeKey, dedupeCount
- [ ] **T3.2** [IMPL] `lib/observability/error-reporter.ts` con `reportError` + `enableBffLogging`.
- [ ] **T3.3** [VERIFY] `pnpm test lib/observability/error-reporter` verde.

## Phase 4 — Web Vitals (TDD)

- [ ] **T4.1** [TEST] `lib/observability/use-report-web-vitals.test.ts`:
  - El hook llama `onLCP`, `onINP`, `onCLS`, `onTTFB`, `onFCP` en mount
  - El callback loggea a `console.info` con formato `[BuildCv WebVital] name=LCP value=...`
  - El callback incluye dedupeKey (metric:url)
  - No llama a `fetch` ni a `reportError` (es info, no error)
- [ ] **T4.2** [IMPL] `lib/observability/use-report-web-vitals.ts` con `useEffect` que monta los callbacks de `web-vitals`.
- [ ] **T4.3** [VERIFY] `pnpm test lib/observability/use-report-web-vitals` verde.

## Phase 5 — Copy (TDD)

- [ ] **T5.1** [TEST] `lib/copy/es.test.ts` — agregar tests para bloque `observability`:
  - `observability.devOverlay.title` no vacío
  - `observability.devOverlay.dismissLabel` es acción clara
  - `observability.devOverlay.copyStackLabel` es acción clara
  - `observability.devOverlay.disclaimer` menciona "terceros" explícitamente (Constitution Art. III)
  - `observability.errorBoundary.title` y `detail` en español
  - `observability.errorBoundary.retryLabel` es "Reintentar" (sin jerga)
  - Art. IV: no "ATS oficial", no "garantiza empleo"
- [ ] **T5.2** [IMPL] Agregar bloque `observability` a `lib/copy/es.ts`. NO modificar otros bloques.
- [ ] **T5.3** [VERIFY] `pnpm test lib/copy/es` verde.

## Phase 6 — Componentes UI (TDD, uno a la vez)

- [ ] **T6.1** [TEST] `components/observability/error-boundary.test.tsx`:
  - Renderiza children sin error
  - Captura error en children y muestra fallback
  - `onError` callback se llama con el error
  - Fallback tiene `role="alert"`
  - Click "Reintentar" llama `onReset`
  - WCAG: focus visible, navegación por teclado
- [ ] **T6.2** [IMPL] `components/observability/error-boundary.tsx` con `react-error-boundary` wrapper.
- [ ] **T6.3** [TEST] `components/observability/dev-error-overlay.test.tsx`:
  - En dev mode (`process.env.NODE_ENV === "development"`): renderiza
  - En prod mode: retorna null
  - Muestra los últimos 20 errores
  - Click "Dismiss" oculta el panel
  - Click "Copy stack" copia al clipboard (mock `navigator.clipboard.writeText`)
  - FIFO: agregar 21 errores → el más viejo se descarta
  - `role="alert"`, `aria-label`, `aria-live="polite"`
- [ ] **T6.4** [IMPL] `components/observability/dev-error-overlay.tsx` con `useEffect` que escucha `window.__buildcv_errors`.
- [ ] **T6.5** [TEST] `components/observability/web-vitals-reporter.test.tsx`:
  - Renderiza (solo un componente vacío con un useEffect)
  - El useEffect llama `useReportWebVitals`
- [ ] **T6.6** [IMPL] `components/observability/web-vitals-reporter.tsx` ("use client") que monta el hook.
- [ ] **T6.7** [VERIFY] `pnpm test components/observability` verde.

## Phase 7 — BFF `/api/log` (TDD)

- [ ] **T7.1** [TEST] E2E para BFF:
  - `POST /api/log` con payload válido → 204
  - `POST /api/log` con payload inválido → 400
  - `GET /api/log` → 200 con array de logs
  - FIFO: POST 101 → la #1 se descarta, GET retorna 100
- [ ] **T7.2** [IMPL] `app/api/log/route.ts` con POST (Zod validation) y GET (return all).
- [ ] **T7.3** [VERIFY] `pnpm test:e2e e2e/observability.spec.ts` verde.

## Phase 8 — Integración en `app/layout.tsx`

- [ ] **T8.1** [IMPL] Modificar `app/layout.tsx`:
  - Agregar `<WebVitalsReporter />` (client component que monta el hook)
  - Agregar `<DevErrorOverlay />` (condicional a NODE_ENV, retorna null en prod)
  - NO agregar `<ErrorBoundary>` aquí todavía (eso es decisión de cada page; ver T8.2)
- [ ] **T8.2** [IMPL] Decidir dónde envolver con `<ErrorBoundary>`:
  - **Decisión propuesta**: agregar `<ErrorBoundary>` SOLO en páginas que renderizan datos externos (import, editor, diff). NO en landing (es estática).
  - Implementar en `app/importar/page.tsx`, `app/analizar/editar/page.tsx`, `app/analizar/diff/page.tsx`.
- [ ] **T8.3** [VERIFY] `pnpm build` verde.

## Phase 9 — E2E completo

- [ ] **T9.1** [TEST] `e2e/observability.spec.ts`:
  - **Test 1**: dev mode, navegar a `/test-error` (test fixture component que throw), ver dev overlay visible
  - **Test 2**: prod mode (forzar `process.env.NODE_ENV=production` via test env), mismo flow, dev overlay NO visible
  - **Test 3**: 0 third-party requests (filtrar dominios externos en page.on("request"))
  - **Test 4**: web vitals se reportan a console (page.on("console"))
  - **Test 5**: dedupe funciona (5 errores idénticos → 1 console.error)
  - **Test 6**: BFF OFF (default) → 0 POSTs a /api/log tras error
  - **Test 7**: BFF ON (`BUILDCV_LOG_ENDPOINT=enabled` via test env) → POST a /api/log con payload correcto
  - **Test 8**: navegación normal (landing → /analizar → /importar) → 0 console errors
  - **Test 9**: Constitution Art. III → 0 cookies creados durante navegación
- [ ] **T9.2** [VERIFY] `pnpm test:e2e` verde.

## Phase 10 — Pre-merge verification (6 gates)

- [ ] **T10.1** `pnpm lint` → 0 errores, 0 warnings
- [ ] **T10.2** `pnpm typecheck` → 0 errores
- [ ] **T10.3** `pnpm test` → todos verdes; coverage ≥80% en `lib/observability/` y `components/observability/`
- [ ] **T10.4** `pnpm test:e2e` → verde
- [ ] **T10.5** `pnpm build` → 0 errores
- [ ] **T10.6** `cd .. && bash scripts/constitution-check.sh` → 20/20 passes, 0 crítico
- [ ] **T10.7** `rg "sentry|posthog|mixpanel|amplitude|hotjar|fullstory|logrocket|datadog|newrelic" BuildCv-web/` → 0 matches
- [ ] **T10.8** `rg "@ts-ignore|@ts-expect-error|eslint-disable|@ts-nocheck" BuildCv-web/` → 0 matches en código nuevo

## Phase 11 — Manual verification

- [ ] **T11.1** Bundle size: `pnpm build` y verificar chunks de web-vitals (~5 KB) + react-error-boundary (~3 KB) + código nuevo (~20-25 KB). Total <30 KB.
- [ ] **T11.2** Smoke manual del dev overlay: ver aparece con error, dismiss funciona, copy stack funciona.
- [ ] **T11.3** Smoke manual de Web Vitals: ver líneas en console con formato correcto.
- [ ] **T11.4** Smoke manual del BFF: curl POST/GET con payload válido e inválido.
- [ ] **T11.5** Smoke manual de 0 third-party: DevTools → Network filter, recargar páginas, 0 externos.

## Phase 12 — Commit + push + documentación

- [ ] **T12.1** Conventional commit con mensaje detallado.
- [ ] **T12.2** Push a `origin/main`.
- [ ] **T12.3** Engram: `mem_save` con sprint 008 close-out, topic_key `sdd/008-observability-web/state`.
- [ ] **T12.4** Resumen técnico al user con bundle size, métricas, validaciones.

## Critical Path

```
T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12
```

## Out of Scope (este sprint, deferred a v1+)

- Backend de observabilidad persistente (008-api) — backlog.
- Source maps privados en prod (Next.js ya tiene su propio manejo).
- Real-time dashboards, alerting, PagerDuty.
- Cross-user analytics.
- Sampling de errores en producción.
- Persistencia en disco o DB.

## Risks

1. **Bundle size >30 KB**: web-vitals + react-error-boundary + código nuevo. Mitigación: tree-shaking con imports nombrados. Si excede, documentar y aceptar (prioridad: privacy > bundle size).
2. **Dev overlay visible en prod**: doble check con `process.env.NODE_ENV` + test E2E. Si falla, es bug crítico.
3. **BFF endpoint expuesto en prod sin querer**: default OFF. Solo se activa con env var.
4. **Dedupe window incorrecta**: 60 segundos puede ser muy poco/mucho. Test verifica el comportamiento.
5. **Web Vitals no se miden en SSR**: esperado. Hook solo en cliente.
6. **ErrorBoundary captura errores "fantasma" en Strict Mode**: solo loggea (no side effects).
7. **Web-vitals callback se llama múltiples veces**: la librería deduplica internamente (solo primer valor estable).

## Definition of Done

- Spec leída y validada contra código real
- Tests escritos ANTES de la impl (TDD real)
- Todos los tests verdes
- Lint + typecheck + build + e2e verdes
- Constitution check 0 crítico
- 0 supresiones, 0 mocks falsos, 0 hacks
- 0 third-party scripts (verificado con rg + test E2E)
- Bundle size <30 KB
- Dev overlay funciona en dev, NO aparece en prod
- Web Vitals se reportan
- BFF opcional funciona
- Dedupe funciona
- Smoke manual: dev overlay aparece con error, Web Vitals en console, 0 third-party
- Commit con mensaje profesional
- Engram actualizado
- User informado
