# Tasks: 003-web-adapt-ui

**Status:** 🚧 EN CURSO · **Backend counterpart:** [../../../BuildCv-api/specs/003-adapt-ia/](../../../BuildCv-api/specs/003-adapt-ia/) (✅ SHIPPED) · **Hito:** v0/M1.1

> **TDD estricto (Constitution Art. VIII).** Test → rojo → impl → verde → refactor. No se commitea código de producción sin su test. No hay supresiones, no hay mocks falsos, no hay `any`.
>
> **Marco de tests:** Vitest 2 + RTL 16 + jsdom (sprint 0). Playwright 1 chromium para E2E. Co-locados: `foo.ts` + `foo.test.ts`.

## Phase 0 — Pre-flight

- [x] **T0.1** Spec leída y verificada contra código real.
- [x] **T0.2** Spec corregida: `requestAdapt` usa BFF `/api/adapt` (no `BACKEND_URL` directo). `AdaptError` es `class extends Error` con `status + code + kind + message + fields?`.
- [x] **T0.3** BFF `app/api/adapt/route.ts` verificado: proxyea `POST ${BACKEND_URL}/api/v1/adapt` con `runtime = "nodejs"` y `dynamic = "force-dynamic"`.
- [x] **T0.4** `package.json` scripts verificados: `pnpm test`, `pnpm test:e2e`, `pnpm lint`, `pnpm build`, `pnpm typecheck` (a agregar si no existe).

## Phase 1 — Types (TDD: contrato primero)

- [ ] **T1.1** [TEST] `lib/api/types.test.ts` — `AdaptationResult` shape: parsing JSON del backend, narrowing de `severity` y `inventionSeverity`, rechazo de shape inválido.
- [ ] **T1.2** [IMPL] Agregar tipos a `lib/api/types.ts`:
  - `Severity`, `InventionSeverity`, `InventionType` (union string-literal, no `enum` — más tree-shakable, mejor con `verbatimModuleSyntax`)
  - `EntityInvention`, `ValidationReport`, `AdaptationResult`, `AdaptRequest`, `AdaptErrorShape`
  - `AdaptErrorKind`, `AdaptErrorCode`

## Phase 2 — API client (TDD: `requestAdapt` + `AdaptError`)

- [ ] **T2.1** [TEST] `lib/api/adapt.test.ts`:
  - Happy path: `fetch('/api/adapt', ...)` → 200 + JSON → devuelve `AdaptationResult` tipado
  - Network error: `fetch` rechaza → `AdaptError` con `status=0`, `kind="network"`
  - 400: → `kind="validation"`, `fields` poblado
  - 422: → `kind="invention"`, `message = problem.detail`
  - 429: → `kind="rate_limit"`, mensaje honesto pre-traducido
  - 503: → `kind="unavailable"`, mensaje honesto
  - 500/otro: → `kind="unknown"`, `message = problem.detail ?? fallback`
  - Body no-JSON: → no throw, usa fallback
- [ ] **T2.2** [IMPL] Crear `lib/api/adapt.ts` con `class AdaptError extends Error` y `requestAdapt` (ver spec §"API client").
- [ ] **T2.3** [TEST] Mocking strategy: usar `vi.spyOn(globalThis, "fetch")` o `vi.stubGlobal("fetch", vi.fn())`. Sin MSW (no instalado). Sin `nock` (Node-only).
- [ ] **T2.4** [VERIFY] `pnpm test lib/api/adapt.test.ts` verde.

## Phase 3 — Copy

- [ ] **T3.1** [TEST] `lib/copy/es.test.ts` — los bloques nuevos existen y todas las keys esperadas están presentes (shape check). Sin duplicar el test existente.
- [ ] **T3.2** [IMPL] Agregar `adapt` block a `lib/copy/es.ts`:
  - `adapt.panel.{title, description, button, buttonLoading}`
  - `adapt.severity.{none, warning, critical}`
  - `adapt.errors.{rateLimit, blocked, unavailable, generic, network}`
  - `adapt.delta.{title, empty, hardLabel, softLabel}`
  - `adapt.cta.regenerate` ("Regenerar con prompt estricto")
- [ ] **T3.3** [VERIFY] No contiene "ATS oficial" ni "garantiza empleo" (Constitution Art. IV) — agregar a test si no está.

## Phase 4 — Componentes (TDD stateless primero, stateful después)

- [ ] **T4.1** [TEST] `components/adapt/severity-badge.test.tsx`:
  - `severity="None"` → clase verde (`bg-emerald-500/10` o similar — leer de analyzer para consistencia)
  - `severity="Warning"` → clase amarilla
  - `severity="Critical"` → clase roja
  - Muestra el conteo de invenciones
  - Accesibilidad: `role="status"` + `aria-label` que incluya la severidad en español
- [ ] **T4.2** [IMPL] `components/adapt/severity-badge.tsx` (stateless, sin `"use client"`).
- [ ] **T4.3** [TEST] `components/adapt/adapted-cv-viewer.test.tsx`:
  - Renderiza el `markdown` con `whitespace-pre-wrap` en `<pre>`
  - Caracteres especiales del CV se renderizan tal cual (no `dangerouslySetInnerHTML` — Constitution Art. V)
- [ ] **T4.4** [IMPL] `components/adapt/adapted-cv-viewer.tsx`.
- [ ] **T4.5** [TEST] `components/adapt/delta-improvements.test.tsx`:
  - Hard inventions aparecen primero y con label "Hard"
  - Soft inventions después con label "Soft"
  - Empty state si no hay invenciones
- [ ] **T4.6** [IMPL] `components/adapt/delta-improvements.tsx`.
- [ ] **T4.7** [TEST] `components/adapt/regenerate-button.test.tsx`:
  - Click llama `onClick`
  - `loading=true` → `disabled`, no llama `onClick`
  - `loading=true` → `aria-busy="true"`
- [ ] **T4.8** [IMPL] `components/adapt/regenerate-button.tsx`.

## Phase 5 — Orquestador (TDD: state machine)

- [ ] **T5.1** [TEST] `components/adapt/adapt-panel.test.tsx`:
  - Estado inicial `idle`: muestra botón "Adaptar con IA"
  - Click "Adaptar" → loading: spinner + `aria-busy`
  - 200: → `success`: muestra `<SeverityBadge>`, `<AdaptedCvViewer>`, `<DeltaImprovements>`
  - 422: → `error` con `<RegenerateButton>` que reintenta
  - 429: → `error` con mensaje honesto SIN botón de reintento
  - 503: → `error` con mensaje "no disponible temporalmente"
  - network: → `error` con mensaje "revisá tu conexión"
  - Props vacías (cvText/jobText sin tipear) → botón disabled
- [ ] **T5.2** [IMPL] `components/adapt/adapt-panel.tsx` con `"use client"`:
  - State: `idle | loading | success | error`
  - `useCallback` para `run()` que llama `requestAdapt`
  - Render condicional limpio
  - **`onExportClick?` prop**: lo dejo fuera del scope (004 lo agregará cuando exista el export). No inventar API.

## Phase 6 — Integración en `/analizar`

- [ ] **T6.1** [TEST E2E] `e2e/analizar-adapt.spec.ts`:
  - Pegar CV + job → click "Analizar" → ver score
  - Click "Adaptar con IA" → ver resultado (mock BFF con `vi`-style o `page.route` de Playwright)
  - Si 422 → ver botón Regenerar
- [ ] **T6.2** [IMPL] Integrar `<AdaptPanel />` en `app/analizar/page.tsx` o como sección visible cuando hay score. Decisión: **mostrar `<AdaptPanel />` debajo de `<Analyzer />`** solo cuando hay `result` (mantiene el layout actual intacto).
- [ ] **T6.3** [VERIFY] `pnpm test:e2e` verde (con BFF mockeado — el E2E no depende del backend real).

## Phase 7 — Pre-merge verification (todo en verde)

- [ ] **T7.1** `pnpm lint` → 0 errores, 0 warnings
- [ ] **T7.2** `pnpm typecheck` → 0 errores (script a agregar si no existe, usa `tsc --noEmit`)
- [ ] **T7.3** `pnpm test` → todos verdes, coverage ≥80% en `lib/api/adapt.ts` y componentes nuevos
- [ ] **T7.4** `pnpm test:e2e` → verde (1 smoke + 1 new spec)
- [ ] **T7.5** `pnpm build` → 0 errores, 0 type errors
- [ ] **T7.6** `bash scripts/constitution-check.sh` → 0 critical
- [ ] **T7.7** Revisar `git diff` completo, detectar regresiones
- [ ] **T7.8** Buscar supresiones: `rg "@ts-ignore|@ts-expect-error|eslint-disable" BuildCv-web/` → 0 matches en código nuevo

## Phase 8 — Commit + documentación

- [ ] **T8.1** Git commit con conventional message: `feat(003-web-adapt-ui): UI de adaptación con delta, severity y regenerate`.
- [ ] **T8.2** Mensaje del commit incluye: qué cambió, evidencia (counts de tests, results de pnpm), Constitution refs (Art. I/III/IV/V/VI).
- [ ] **T8.3** Push a `git@github.com:buildcv-co/BuildCv-web.git` (branch main, no PR formal por ahora — user instruyó merge directo).
- [ ] **T8.4** Engram: `mem_save` con sprint 1 close-out, topic_key `sdd/003-web-adapt-ui/state`.
- [ ] **T8.5** Resumen técnico al user: qué se hizo, evidencia, riesgos, próximos pasos.

## Critical Path

```
T0 → T1 (types+test) → T2 (client+test) → T3 (copy+test) → T4 (componentes+tests) → T5 (orquestador+test) → T6 (integración+E2E) → T7 (verify) → T8 (commit+docs)
```

## Out of Scope (este sprint)

- Streaming SSE (M1.5)
- Editor inline del CV adaptado (006)
- Comparación side-by-side (006)
- Export PDF (004)
- Botón "Exportar PDF" en el panel de adapt (lo agrega 004 con prop `onExportClick`)

## Riesgos identificados

1. **BFF no mockeado en E2E** — Playwright `page.route` mockea el response, así que el E2E no depende del backend real. Si el user corre `pnpm dev` y abre `/analizar` con el backend apagado, el botón 422 del backend se propaga al cliente. Esto es comportamiento correcto.
2. **Rate limit 5/h real** — el spec es honesto: si se acaban los 5, no se reintenta. El test verifica el mensaje, no el rate limit real (eso es e2e del backend).
3. **`as` cast en el cliente** — la spec original tenía `as ScoreError` en el catch. Voy a evitarlo con `instanceof AdaptError` en el orquestador.

## Definition of Done

- Spec leída, corregida, tasks claras
- Tests escritos ANTES de la impl (TDD real)
- Todos los tests verdes
- Lint + typecheck + build + e2e verdes
- Constitution check 0 critical
- 0 supresiones, 0 mocks falsos
- Commit con mensaje profesional
- Engram actualizado
- User informado con resumen
