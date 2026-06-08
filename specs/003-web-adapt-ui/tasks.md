# Tasks: 003-web-adapt-ui

**Status:** 📋 PLANEADO (frontend de 003-adapt-ia del API)

## Phase 0 — Setup

- [ ] **T0.1** Verificar que `BuildCv-web/components/` ya tiene el patrón de 002-web-score-ui (organizer + components).
- [ ] **T0.2** Verificar que `BuildCv-web/lib/api/types.ts` ya tiene tipos de Score (M0).
- [ ] **T0.3** Verificar que `BuildCv-web/app/api/adapt/route.ts` ya está implementado (BFF, ✅ done en M1).

## Phase 1 — Types + API client

- [ ] **T1.1** [IMPL] Agregar tipos a `lib/api/types.ts`:
  - `Severity`, `InventionSeverity`, `InventionType` (enums)
  - `EntityInvention`, `ValidationReport`, `AdaptationResult` (interfaces)
  - `AdaptRequest` (input)
  - `AdaptError` (output)
- [ ] **T1.2** [IMPL] Crear `lib/api/adapt.ts`:
  - `class AdaptError extends Error` con `status` + `code` + `message`
  - `requestAdapt(req: AdaptRequest): Promise<AdaptationResult>` que llama al BFF `/api/adapt`
  - Mapeo de 4xx/5xx a `AdaptError` con mensaje honesto (Constitution Art. IV)

## Phase 2 — Copy

- [ ] **T2.1** [IMPL] Agregar `ADAPT_COPY` a `lib/copy/es.ts`:
  - `panel.title`, `panel.description`, `panel.button`, `panel.loading`
  - `severity.None`, `severity.Warning`, `severity.Critical`
  - `errors.rateLimit`, `errors.blocked`, `errors.unavailable`, `errors.generic`
  - `delta.title`, `delta.empty`
- [ ] **T2.2** [VERIFY] Sin "ATS oficial" ni "garantiza empleo" en el copy (Constitution Art. IV).

## Phase 3 — Componentes

- [ ] **T3.1** [IMPL] `components/adapt/severity-badge.tsx`:
  - Verde/Amarillo/Rojo según `Severity`
  - Muestra conteo de invenciones
  - `"use client"` (necesita `useState`? no, stateless)
- [ ] **T3.2** [IMPL] `components/adapt/adapted-cv-viewer.tsx`:
  - Recibe `markdown: string`
  - Renderiza en `<pre>` con `whitespace-pre-wrap`
  - Estado: stateless
- [ ] **T3.3** [IMPL] `components/adapt/delta-improvements.tsx`:
  - Recibe `report: ValidationReport`
  - Lista invenciones Hard primero (rojo), luego Soft (amarillo)
  - Empty state si no hay invenciones
  - Stateless
- [ ] **T3.4** [IMPL] `components/adapt/regenerate-button.tsx`:
  - Recibe `onClick`, `loading`
  - Botón rojo "Regenerar con prompt estricto"
  - Disabled mientras `loading`
- [ ] **T3.5** [IMPL] `components/adapt/adapt-panel.tsx`:
  - `"use client"` (state machine)
  - Props: `cvText: string`, `jobText: string`, `onExportClick?: () => void`
  - State machine: `idle | loading | success | error`
  - Render condicional según state
  - Llama `requestAdapt` y maneja 4 casos de error

## Phase 4 — Integración

- [ ] **T4.1** [IMPL] Integrar `<AdaptPanel />` en `app/analizar/page.tsx` (donde está el analyzer M0).
- [ ] **T4.2** [VERIFY] Click "Adaptar" → spinner → render del resultado → sin demoras perceptibles.
- [ ] **T4.3** [VERIFY] Si `severity=Critical`, el botón "Regenerar" aparece y funciona.
- [ ] **T4.4** [VERIFY] Si 429, mensaje honesto (no retry agresivo).

## Phase 5 — Pre-merge verification

- [ ] **T5.1** `pnpm lint` → 0 errores.
- [ ] **T5.2** `pnpm build` → 0 errores.
- [ ] **T5.3** `./scripts/preflight.sh` → exit 0.
- [ ] **T5.4** `./scripts/constitution-check.sh` → 0 critical.
- [ ] **T5.5** Verificar manualmente: 6 requests → req 6 → 429 con mensaje honesto.
- [ ] **T5.6** Verificar manualmente: severity=Critical con "FakeCorp" → botón Regenerar funciona.

## Phase 6 — Commit + push

- [ ] **T6.1** Git commit con conventional message: `feat(003-web-adapt-ui): UI de adaptación con delta y severity`.
- [ ] **T6.2** Push a `git@github.com:buildcv-co/BuildCv-web.git`.

## Critical Path

```
T0 → T1 (types + client) → T2 (copy) → T3 (componentes) → T4 (integración) → T5 (verify) → T6 (commit)
```

## Out of Scope (este spec)

- Streaming SSE (M1.5)
- Tests automatizados con Vitest (M3+)
- Editor inline del CV adaptado (v1)
- Side-by-side diff (v1)

## Notes

- No hay tests automatizados aún en el web (v0). Los componentes se prueban manualmente con `pnpm dev` + browser.
- El BFF (`app/api/adapt/route.ts`) ya está implementado y validado en e2e tests previos.
- Todos los componentes deben pasar `pnpm lint` (ESLint flat config).
- 0 supresiones: no `// @ts-ignore`, no `// eslint-disable-next-line`.
