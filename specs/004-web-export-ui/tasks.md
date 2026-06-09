# Tasks: 004-web-export-ui

**Status:** 🚧 EN CURSO · **Backend counterpart:** [../../../BuildCv-api/specs/004-export-pdf/](../../../BuildCv-api/specs/004-export-pdf/) (✅ SHIPPED con QuestPDF) · **Hito:** v0/M2.1

> **TDD estricto (Constitution Art. VIII).** Test → rojo → impl → verde → refactor.
> **Marco:** Vitest 2 + RTL 16 + jsdom + Playwright 1 chromium. Co-locados.
> **0 supresiones, 0 mocks falsos, 0 any inseguros.** El helper `downloadBlob` se testea con `URL.createObjectURL` mockeado a `vi.fn()` (que retorna string), no con `as any`.

## Phase 0 — Pre-flight

- [x] **T0.1** Spec leída y verificada contra código real.
- [x] **T0.2** Spec corregida: `requestExportPdf` usa BFF `/api/export` (no `BACKEND_URL` directo). `ExportError` es `class extends Error` con `status + code + kind + message + fields?`. Copy va en `copy.export` (no `EXPORT_COPY` separado, mismo patrón que 003).
- [x] **T0.3** BFF `app/api/export/route.ts` verificado: proxyea `POST ${BACKEND_URL}/api/v1/export`, propaga `Content-Type` y `Content-Disposition` del upstream. `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- [x] **T0.4** Tipos previos: `ValidationReport`, `EntityInvention`, `Severity` ya viven en `lib/api/types.ts` desde el sprint 1. Se reusan.

## Phase 1 — Types (TDD)

- [ ] **T1.1** [TEST] Extender `lib/api/types.test.ts` con shape checks para `ExportRequest`, `ExportErrorShape`. Test que la fecha del `filenameHint` se pueda interpolar.
- [ ] **T1.2** [IMPL] Agregar a `lib/api/types.ts`:
  - `ExportRequest` (adaptedCv, validation, candidateName)
  - `ExportErrorKind` union
  - `ExportErrorCode` (string)
  - `ExportErrorShape` (status, code, kind, message, fields?)
- [ ] **T1.3** [VERIFY] `pnpm test lib/api/types.test.ts` verde.

## Phase 2 — API client (TDD)

- [ ] **T2.1** [TEST] `lib/api/export.test.ts`:
  - Happy path: `fetch('/api/export', ...)` → 200 + blob → `requestExportPdf` retorna `Blob` con `type: 'application/pdf'`
  - Network error: `fetch` rechaza → `ExportError` con `status=0`, `kind="network"`
  - 400: → `kind="validation"`, `fields` poblado
  - 422: → `kind="invention"`, `message = problem.detail`
  - 429: → `kind="rate_limit"`, mensaje honesto pre-traducido
  - 503: → `kind="unavailable"`, mensaje honesto
  - 500/otro: → `kind="unknown"`, `message = problem.detail ?? fallback`
  - Body no-JSON: → no throw, usa fallback
  - **Test de URL**: `expect(fetch).toHaveBeenCalledWith('/api/export', ...)` — NUNCA a `BACKEND_URL`
  - **Test de `downloadBlob`**:
    - Llama `URL.createObjectURL` con el blob → retorna string
    - Crea `<a>`, setea `href` + `download` + `click()`
    - Append + remove del DOM
    - Llama `URL.revokeObjectURL`
    - Mockear con `vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })`
    - Verificar que NO se filtra memory (revokeObjectURL se llamó)
- [ ] **T2.2** [IMPL] Crear `lib/api/export.ts` con `class ExportError extends Error`, `requestExportPdf`, `downloadBlob` (ver spec).
- [ ] **T2.3** [VERIFY] `pnpm test lib/api/export.test.ts` verde.

## Phase 3 — Copy

- [ ] **T3.1** [TEST] `lib/copy/es.test.ts` — agregar tests para `copy.export` (shape check + Art. IV: no "ATS oficial", no "garantiza empleo").
- [ ] **T3.2** [IMPL] Agregar `export` block a `lib/copy/es.ts` (NO tocar otros bloques). Estructura según spec.
- [ ] **T3.3** [VERIFY] `pnpm test lib/copy/es.test.ts` verde.

## Phase 4 — Componentes (TDD, uno a la vez)

- [ ] **T4.1** [TEST] `components/export/filename-hint.test.tsx`:
  - Renderiza `cv-adapted-2026-06-08.pdf` con la fecha interpolada
  - aria-label accesible
  - Stateless (no `"use client"`)
- [ ] **T4.2** [IMPL] `components/export/filename-hint.tsx`.
- [ ] **T4.3** [TEST] `components/export/export-error-panel.test.tsx`:
  - 422: muestra mensaje + botón "Regenerar" (props.onRegenerate se llama)
  - 429: muestra mensaje honesto, SIN botón retry
  - 503: muestra mensaje + botón "Reintentar" (props.onRetry se llama)
  - 0/network: mensaje genérico
  - role="alert" o aria-live="assertive" para accesibilidad
- [ ] **T4.4** [IMPL] `components/export/export-error-panel.tsx` (stateless).
- [ ] **T4.5** [TEST] `components/export/export-button.test.tsx`:
  - Estado inicial: muestra "Descargar PDF"
  - Click: loading + `aria-busy="true"`, llama `requestExportPdf`, en success llama `downloadBlob` con filename correcto
  - 422: muestra `export-error-panel` con onRegenerate callback
  - 429: muestra panel sin retry
  - 503: muestra panel con retry
  - Disabled cuando `disabled=true` (prop externa, p.ej. si la adaptación está en loading)
  - **Mock `downloadBlob`** con `vi.spyOn(module, 'downloadBlob')` o mock a nivel de módulo con `vi.mock`
- [ ] **T4.6** [IMPL] `components/export/export-button.tsx` con `"use client"`, state machine `idle | loading | downloading | success | error`, `useCallback`.

## Phase 5 — Integración en `/analizar`

- [ ] **T5.1** [TEST E2E] `e2e/analizar-export.spec.ts`:
  - Mock `/api/adapt` (200) y `/api/export` (200 con PDF binario) con `page.route`
  - Pegar CV+job → click "Analizar" → score → click "Adaptar" → adapted text → click "Descargar PDF" → verificar que la descarga se disparó (Playwright `page.on('download', ...)` o verificar que el blob URL se creó via `page.evaluate`)
  - Test del 422: mockear `/api/export` con 422 → verificar panel rojo con "Regenerar"
- [ ] **T5.2** [IMPL] Integrar `<ExportButton />` en `components/adapt/adapt-panel.tsx` o `components/analyzer/analyzer.tsx`. **Decisión**: el `<ExportButton />` se renderiza DENTRO de `<AdaptPanel />` cuando `state === "success"`, con prop `onRegenerate` que dispara la regeneración (reutiliza el `run()` del panel). Mantiene cohesión: el botón de export solo aparece si ya hay adaptación exitosa.
  - AdaptPanel gana una prop opcional `onExportClick?: () => void` que el padre puede usar (lo dejo fuera del scope del sprint 2, es para sprint futuro).
  - Dentro de AdaptPanel, después del viewer, renderiza `<ExportButton />` con `adaptedCv={result.adaptedCv}`, `validation={result.validation}`, `candidateName="Candidato"`, `onRegenerate={run}`.
- [ ] **T5.3** [VERIFY] `pnpm test:e2e` verde (con BFF mockeado).
- [ ] **T5.4** [VERIFY] `pnpm dev` + smoke manual: pegar CV/job, adaptar, descargar, abrir el PDF (verificar magic bytes %PDF-1.x en los primeros 8 bytes con `head -c 8`).

## Phase 6 — Pre-merge verification (todo en verde)

- [ ] **T6.1** `pnpm lint` → 0 errores, 0 warnings
- [ ] **T6.2** `pnpm typecheck` → 0 errores
- [ ] **T6.3** `pnpm test` → todos verdes; coverage ≥80% en `lib/api/export.ts` y componentes nuevos
- [ ] **T6.4** `pnpm test:e2e` → verde
- [ ] **T6.5** `pnpm build` → 0 errores
- [ ] **T6.6** `bash scripts/constitution-check.sh` → 0 critical
- [ ] **T6.7** `rg "@ts-ignore|@ts-expect-error|eslint-disable|@ts-nocheck" BuildCv-web/` → 0 matches en código nuevo

## Phase 7 — Commit + push + memoria

- [ ] **T7.1** Conventional commit: `feat(004-web-export-ui): UI de export PDF con descarga vía blob`.
- [ ] **T7.2** Mensaje incluye: cambios, evidencia (counts + coverage), Constitution refs.
- [ ] **T7.3** Push a `origin/main`.
- [ ] **T7.4** Engram: `mem_save` con sprint 2 close-out, topic_key `sdd/004-web-export-ui/state`.
- [ ] **T7.5** Resumen técnico al user.

## Critical Path

```
T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7
```

## Out of Scope

- Historial de exports (v1)
- Selección de template (v1)
- Watermark personalizado (v1)
- Bulk export de múltiples versiones (v1)

## Definition of Done

- Spec leída, corregida, tasks claras
- Tests escritos ANTES de la impl (TDD real)
- Todos los tests verdes
- Lint + typecheck + build + e2e verdes
- Constitution check 0 critical
- 0 supresiones, 0 mocks falsos
- PDF descargado abre correctamente (verificación manual con `head -c 8`)
- Memory leak prevention verificado en el test (revokeObjectURL se llamó)
- Commit con mensaje profesional
- Engram actualizado
- User informado
