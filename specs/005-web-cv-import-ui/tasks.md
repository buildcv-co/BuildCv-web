# Tasks: 005-web-cv-import-ui

**Status:** 🚧 EN CURSO · **Backend counterpart:** [../../../BuildCv-api/specs/005-cv-pdf-docx-import/](../../../BuildCv-api/specs/005-cv-pdf-docx-import/) (✅ SHIPPED, commit `c61bdf4`) · **Hito:** v0.5 (P0.5)

> **TDD estricto (Constitution Art. VIII).** Test → rojo → impl → verde → refactor. Sin supresiones, sin mocks falsos, sin `any` inseguros.
>
> **Marco de tests:** Vitest 2 + RTL 16 + jsdom (sprint 0) + Playwright 1 chromium (E2E).
>
> **Spec ya corregida:** requestImport usa BFF `/api/import` (no BACKEND_URL). ImportError es class con `status + code + kind + message + details?`. Misma convención que adapt/export.

## Phase 0 — Pre-flight

- [x] **T0.1** Backend 005 está shipped (`c61bdf4`).
- [x] **T0.2** Spec corregida: BFF same-origin, ImportError class con kind enum.
- [x] **T0.3** Backend tiene `runtime = "nodejs"` en BFF existente (adapt, export) — usar el mismo patrón.
- [x] **T0.4** Curl real: backend retorna 422 con code `IMPORT_SCANNED_PDF` para PDFs sin texto. Validado.

## Phase 1 — Types + Zod schemas (TDD)

- [ ] **T1.1** [TEST] `lib/api/types.test.ts`: agregar shape checks para `ImportResult`, `DetectedSection`, `ImportWarning` (engineVersion regex `^\d+\.\d+\.\d+$`, text max 50_000, sections max 50, warnings max 20).
- [ ] **T1.2** [IMPL] Agregar a `lib/api/types.ts`:
  - Zod schemas: `DetectedSectionSchema`, `ImportWarningSchema`, `ImportResultSchema`
  - Tipos inferidos
  - ImportErrorKind union
  - Nota: Zod ya está usado en el proyecto (006 specs), pero NO instalado en el web todavía. **Decisión:** instalo `zod` como dep nueva o uso un type-guard simple. Recomendación: instalar zod (1 dep, ~12KB) para mantener consistencia con Constitution Art. I FR-029a. Si no querés nueva dep, usar type-guard simple con `unknown` narrowing.

## Phase 2 — API client (TDD)

- [ ] **T2.1** [TEST] `lib/api/import.test.ts`:
  - `validateFile`: empty file → `{ok:false, reason: 'vacío'}`; >5MB → `{ok:false, reason: '5MB'}`; wrong mime (.txt) → `{ok:false, reason: 'PDF o DOCX'}`; valid PDF/DOCX → `{ok:true}`
  - `requestImport` happy path: mock fetch a 200 con JSON válido → devuelve `ImportResult` validado por Zod
  - 413 → `ImportError` con `kind: "too_large"`
  - 415 → `kind: "unsupported_mime"`
  - 422 → `kind: "validation"` con message del backend
  - 429 → `kind: "rate_limit"`
  - 503 → `kind: "engine"`
  - 500/otro → `kind: "unknown"`
  - network failure → `kind: "network"`, `status: 0`
  - response sin JSON → fallback message
  - **Test de URL**: `expect(fetch).toHaveBeenCalledWith("/api/import", ...)` — NUNCA BACKEND_URL
  - **Test de client validation**: validateFile falla → throw sin hacer fetch
- [ ] **T2.2** [IMPL] `lib/api/import.ts` con `validateFile`, `requestImport`, class `ImportError`.
- [ ] **T2.3** [VERIFY] `pnpm test lib/api/import.test.ts` verde.

## Phase 3 — Copy (es-CO neutral, Constitution Art. IV)

- [ ] **T3.1** [TEST] `lib/copy/es.test.ts` — agregar tests para `copy.import` (shape check + Art. IV: no "ATS oficial", no "garantiza empleo").
- [ ] **T3.2** [IMPL] Agregar bloque `import` a `lib/copy/es.ts`:
  - `import.page.{title, subtitle, maxSize, dragHere, or, clickToSelect}`
  - `import.states.{idle, loading, success, error}`
  - `import.sections.{title, confidenceHigh, confidenceLow}`
  - `import.warnings.{title, close}`
  - `import.buttonUseInEditor` (label del handoff al 006)
  - `import.errors.{...}` con mensajes en español para cada kind
  - `import.handoffHint` (cuando 006 no está: "Próximamente")
- [ ] **T3.3** [VERIFY] `pnpm test lib/copy/es.test.ts` verde.

## Phase 4 — Componentes (TDD, uno a la vez)

- [ ] **T4.1** [TEST] `components/import/file-upload.test.tsx`:
  - Renderiza con `role="button"`, `aria-label`, `aria-describedby`
  - Click → abre file picker (mock `input.click()`)
  - Keyboard: Enter o Space abre el picker
  - onFile callback con el File seleccionado
  - Estado: estado vacío vs archivo seleccionado (muestra nombre + tamaño)
  - Validación client-side: archivo >5MB → muestra error, NO llama onFile
  - Validación client-side: tipo no soportado → muestra error
  - Drop event: handle drop con File → llama onFile
  - Visual: el "drop zone" se resalta al hacer dragover (`aria-pressed` o class state)
- [ ] **T4.2** [IMPL] `components/import/file-upload.tsx` con `"use client"` (necesita state de drag-over).
- [ ] **T4.3** [TEST] `components/import/import-error-panel.test.tsx`:
  - Por cada `ImportErrorKind` (network, too_large, unsupported_mime, validation, rate_limit, engine, unknown), renderiza el mensaje correcto
  - `role="alert"` para screen readers
- [ ] **T4.4** [IMPL] `components/import/import-error-panel.tsx` (stateless).
- [ ] **T4.5** [TEST] `components/import/import-result-panel.test.tsx`:
  - Renderiza el text extraído en `<pre>` con escape HTML (Constitution Art. V)
  - Lista las sections con su confidence (High = verde, Low = amarillo)
  - Empty sections array → "No se detectaron secciones"
  - Warnings como `<ul>` con `aria-label="Avisos del parseo"`
  - Botón "Usar en editor" con callback `onUseInEditor`
  - `aria-live="polite"` para cambios de estado
- [ ] **T4.6** [IMPL] `components/import/import-result-panel.tsx` (stateless).
- [ ] **T4.7** [TEST] `components/import/import-button.test.tsx`:
  - State machine: idle | loading | success | error
  - Click → loading, llama `requestImport` con el File
  - Success → muestra `ImportResultPanel` con el resultado
  - 422/415/429/503 → muestra `ImportErrorPanel` con mensaje
  - Network error → mensaje honesto
  - Disabled mientras loading
  - `aria-busy` durante loading
- [ ] **T4.8** [IMPL] `components/import/import-button.tsx` con `"use client"`, `useState`, `useCallback`.

## Phase 5 — Page + BFF

- [ ] **T5.1** [IMPL] `app/api/import/route.ts` (BFF, ya en la spec):
  - `runtime = "nodejs"` (necesario para multipart >4MB)
  - `dynamic = "force-dynamic"`
  - POST: lee `request.formData()`, forward a `${BACKEND_URL}/api/v1/import` con `body: formData`
  - Propaga status + content-type
- [ ] **T5.2** [IMPL] `app/importar/page.tsx` (server component):
  - metadata
  - Header consistente con `/analizar`
  - `<ImportButton />` (client component)
- [ ] **T5.3** [TEST E2E] `e2e/importar.spec.ts`:
  - Mock BFF con 200 + JSON válido (text + sections + warnings) → verifica ImportResultPanel visible
  - Mock BFF con 422 → verifica ImportErrorPanel con "Parece un escaneo"
  - Mock BFF con 429 → verifica mensaje rate-limit
  - Mock BFF con 415 → verifica "Tipo no soportado"
  - Test: el archivo NO se guarda en localStorage (verifica via `page.evaluate(() => localStorage.length === 0)` después del import)
- [ ] **T5.4** [VERIFY] `pnpm test:e2e` verde.

## Phase 6 — Pre-merge verification (todo en verde)

- [ ] **T6.1** `pnpm lint` → 0 errores, 0 warnings
- [ ] **T6.2** `pnpm typecheck` → 0 errores
- [ ] **T6.3** `pnpm test` → todos verdes; coverage ≥80% en `lib/api/import.ts` y components/import/
- [ ] **T6.4** `pnpm test:e2e` → verde
- [ ] **T6.5** `pnpm build` → 0 errores
- [ ] **T6.6** `bash scripts/constitution-check.sh` → 0 critical (19/19 passes)
- [ ] **T6.7** `rg "@ts-ignore|@ts-expect-error|eslint-disable|@ts-nocheck" BuildCv-web/` → 0 matches en código nuevo
- [ ] **T6.8** Smoke real: levantar stack (web + API), navegar a `/importar`, subir un PDF real, ver respuesta.

## Phase 7 — Commit + push + documentación

- [ ] **T7.1** Conventional commit: `feat(005-web-cv-import-ui): UI de import PDF/DOCX con drag/drop y validación client-side`.
- [ ] **T7.2** Push a `origin/main`.
- [ ] **T7.3** Engram: `mem_save` con sprint 3b close-out, topic_key `sdd/005-web-cv-import-ui/state`.
- [ ] **T7.4** Resumen técnico al user.

## Critical Path

```
T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7
```

## Out of Scope (este sprint)

- Tests automatizados: **incluidos** (Vitest + RTL + E2E con page.route)
- Drag/drop de múltiples archivos simultáneos: 1 a la vez
- Previsualización del PDF en la UI: no en v0.5
- Soporte para .rtf, .odt, .pages, .txt: v1
- Historial de imports: v1
- Integración real con 006 editor: el botón "Usar en editor" navega a `/editor` pero el editor 006 todavía no existe. Por eso: cuando 006 no esté, el botón está disabled con label "Próximamente". Cuando 006 esté (sprint 4a), wire el onUseInEditor para que setee el localStorage/draft.

## Risks / Gotchas

1. **JSX attribute strings y `\n`**: en JSX, `<Component prop="texto\ncon\nsaltos">` NO procesa `\n`. Usar siempre variable JS: `const x = "..."; <Component prop={x} />`. Ya documentado en tests previos.
2. **Zod no instalado**: necesito decidir. Recomendación: instalar. Si no, type-guard simple.
3. **multipart >4MB en Edge**: el BFF DEBE ser `runtime = "nodejs"`. Edge tiene cap de 4MB.
4. **FormData + fetch**: el navegador lo soporta nativamente. El BFF usa `request.formData()` (Next.js lo expone).
5. **A11y del FileUpload**: drag/drop + click + keyboard. Importante: usar `aria-describedby` para el hint de 5MB.

## Definition of Done

- Spec leída, corregida, tasks claras
- Tests escritos ANTES de la impl (TDD real)
- Todos los tests verdes
- Lint + typecheck + build + e2e verdes
- Constitution check 0 critical
- 0 supresiones, 0 mocks falsos
- Smoke E2E real con PDF y DOCX funciona
- Commit con mensaje profesional
- Engram actualizado
- User informado
