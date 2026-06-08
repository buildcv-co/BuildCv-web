# Tasks: 004-web-export-ui

**Status:** 📋 PLANEADO (frontend de 004-export-pdf del API)

## Phase 0 — Setup

- [ ] **T0.1** Verificar que `BuildCv-web/app/api/export/route.ts` ya está implementado (BFF, ✅ done en M2).
- [ ] **T0.2** Verificar que `BuildCv-web/lib/api/types.ts` ya tiene `ValidationReport` (de 003).

## Phase 1 — Types + API client

- [ ] **T1.1** [IMPL] Agregar `ExportRequest` a `lib/api/types.ts`.
- [ ] **T1.2** [IMPL] Crear `lib/api/export.ts`:
  - `class ExportError extends Error` con `status` + `code` + `message`
  - `requestExportPdf(req: ExportRequest): Promise<Blob>` que llama al BFF `/api/export`
  - `downloadBlob(blob: Blob, filename: string)` helper para descarga via blob URL
  - Mapeo de 4xx/5xx a `ExportError` con mensaje honesto (Constitution Art. IV)

## Phase 2 — Copy

- [ ] **T2.1** [IMPL] Agregar `EXPORT_COPY` a `lib/copy/es.ts`:
  - `button`, `loading`, `filenameHint`, `success`
  - `errors.rateLimit`, `errors.blocked`, `errors.unavailable`, `errors.generic`
- [ ] **T2.2** [VERIFY] Sin "ATS oficial" ni "garantiza empleo" en el copy (Constitution Art. IV).

## Phase 3 — Componentes

- [ ] **T3.1** [IMPL] `components/export/filename-hint.tsx`:
  - Stateless
  - Muestra el filename que se va a descargar (e.g., "cv-adapted-2026-06-08.pdf")
  - Pequeño texto gris debajo del botón
- [ ] **T3.2** [IMPL] `components/export/export-error-panel.tsx`:
  - Recibe `error: ExportError`
  - Render condicional según `status`:
    - 422: panel rojo con detalle + botón "Regenerar"
    - 429: panel amarillo con countdown
    - 503: panel gris con botón "Reintentar"
  - Stateless
- [ ] **T3.3** [IMPL] `components/export/export-button.tsx`:
  - `"use client"` (state machine)
  - Props: `adaptedCv`, `validation`, `candidateName`, `disabled`
  - State machine: `idle | loading | downloading | error`
  - Llama `requestExportPdf` y luego `downloadBlob` en éxito
  - Disabled mientras `loading`/`downloading`
  - Render condicional del `export-error-panel` en error

## Phase 4 — Integración

- [ ] **T4.1** [IMPL] Integrar `<ExportButton />` en `app/analizar/page.tsx` después de `<AdaptPanel />`.
- [ ] **T4.2** [VERIFY] El botón solo aparece si la adaptación fue exitosa (no en idle/loading/error).
- [ ] **T4.3** [VERIFY] Click → spinner 1-2s → descarga automática del PDF.
- [ ] **T4.4** [VERIFY] El filename del PDF descargado es `cv-adapted-2026-06-08.pdf` (no "optimized.pdf").
- [ ] **T4.5** [VERIFY] Si 422, panel rojo con detalle de invención Hard.

## Phase 5 — Pre-merge verification

- [ ] **T5.1** `pnpm lint` → 0 errores.
- [ ] **T5.2** `pnpm build` → 0 errores.
- [ ] **T5.3** `./scripts/preflight.sh` → exit 0.
- [ ] **T5.4** `./scripts/constitution-check.sh` → 0 crítico.
- [ ] **T5.5** Verificar manualmente: 21 exports → req 21 → 429.
- [ ] **T5.6** Verificar manualmente: Hard invención → 422 → panel rojo.

## Phase 6 — Commit + push

- [ ] **T6.1** Git commit: `feat(004-web-export-ui): UI de export PDF con descarga vía blob`.
- [ ] **T6.2** Push a `git@github.com:buildcv-co/BuildCv-web.git`.

## Critical Path

```
T0 → T1 (types + client) → T2 (copy) → T3 (componentes) → T4 (integración) → T5 (verify) → T6 (commit)
```

## Out of scope (este spec)

- Tests automatizados (M3+)
- Selección de template (v1)
- Watermark personalizado (v1)
- Historial de exports (v1)

## Notes

- No hay tests automatizados en el web aún. Componentes probados manualmente con `pnpm dev` + browser.
- El BFF ya está validado en e2e tests previos (PDF binario correcto, headers OK).
- 0 supresiones: no `// @ts-ignore`, no `// eslint-disable-next-line`.
- Memory leak prevention: SIEMPRE `URL.revokeObjectURL` después del click.
