# Tasks: 006-web-cv-diff-viewer

**Status:** 🚧 EN CURSO · **Sister sub-feature:** [../006-web-cv-editor/](../006-web-cv-editor/) (shipped, commit 748611d) · **Hito:** v0.5 (P0.5)

> **TDD estricto (Constitution Art. VIII).** Test → rojo → impl → verde → refactor. Sin supresiones, sin mocks falsos, sin `any` inseguros.
>
> **Marco:** Vitest 2 + RTL 16 + jsdom (sprint 0) + Playwright 1 chromium (E2E).
>
> **DECISIÓN ARQUITECTÓNICA EXPLÍCITA (consistente con sprint 4a):**
> La spec original propone **Tiptap v2 read-only** para edición inline de invenciones. **NO instalo Tiptap**. La edición inline se implementa con un simple `<input>` controlado por React. Esto cumple el mismo FR-068 (validación Zod) sin la complejidad de ProseMirror.
>
> **ÚNICA dep nueva**: `diff` (jsdiff v5, BSD-3-Clause, ~15 KB). Para word-level Myers diff.
>
> **Cosas que SÍ hago tal cual la spec:**
> - 2 modos: unificado (móvil, default <768px) y lado a lado (desktop, default ≥768px)
> - Word-level diff con `diff` (jsdiff)
> - Badges rojos para invenciones: Soft (rojo claro) y Hard (rojo oscuro + icono X)
> - Edición inline con `<input>` + Zod validation
> - Footer con 3 acciones: Aceptar y exportar, Editar en el editor, Rechazar y re-prompt
> - Bloqueo de "Aceptar y exportar" con invenciones Hard sin resolver (modal de confirmación, FR-070)
> - Re-puntuar con `requestScore` (existente del sprint 002)
> - WCAG 2.2 AA
> - Copy honesto en español (Constitution Art. IV)

## Phase 0 — Pre-flight

- [x] **T0.1** Sprint 4a (006 editor) shipped en `748611d`. 454 unit + 20 E2E verdes.
- [x] **T0.2** Zod v3 ya instalado (sprint 4a).
- [x] **T0.3** `lib/api/adapt.ts` y `lib/api/score.ts` (requestAdapt, requestScore) ya existen.
- [x] **T0.4** `components/adapt/` ya tiene patrones para estados de error y adapt.

## Phase 1 — Install jsdiff

- [ ] **T1.1** `cd BuildCv-web && pnpm add diff` (latest 5.x).
- [ ] **T1.2** Verificar que `pnpm install` no rompe otras deps.
- [ ] **T1.3** Verificar que `pnpm lint` y `pnpm typecheck` siguen verdes.

## Phase 2 — Diff engine (TDD puro)

- [ ] **T2.1** [TEST] `lib/diff/compute-diff.test.ts`:
  - 2 strings idénticas → array vacío de cambios
  - 2 strings con palabras añadidas → cambios con `added: true`
  - 2 strings con palabras eliminadas → cambios con `removed: true`
  - 2 strings con palabras modificadas → secuencia de cambios (no added+removed+added en la misma palabra, sino Myers diff)
  - String vacío vs string → todos los tokens son added o todos removed
  - Caracteres especiales: `&`, `<`, `>`, `"` se preservan verbatim (NO escape HTML — el renderer lo hace)
  - Performance: 50 KB string vs 50 KB string completa en <2 s (NFR-032)
- [ ] **T2.2** [IMPL] `lib/diff/compute-diff.ts`:
  - Pure function `computeDiff(before: string, after: string): DiffChange[]`
  - Usa `diffWords` de jsdiff
  - Mapea a un tipo local `DiffChange` (added | removed | unchanged + value)
  - Sin dependencias de DOM (puro, testeable)
- [ ] **T2.3** [VERIFY] `pnpm test lib/diff` verde.

## Phase 3 — Types + Helpers (TDD)

- [ ] **T3.1** [TEST] `lib/diff/types.test.ts`:
  - Shape de `DiffChange`: `{ kind: 'added' | 'removed' | 'unchanged', value: string }`
  - Shape de `FlaggedEntity`: `{ entity, position: number, color: 'soft' | 'hard' }`
  - Shape de `DiffHandoff`: `{ originalText, adaptedText, validation, timestamp }`
- [ ] **T3.2** [IMPL] `lib/diff/types.ts` con los tipos.
- [ ] **T3.3** [TEST] `lib/diff/flag-entities.test.ts`:
  - `flagEntitiesInDiff(diff, inventions)` marca las posiciones de las invenciones en el diff
  - Una invención Hard sobrescribe a una Soft en la misma posición
  - Invenciones que no matchean ningún cambio → no se marcan (visible en el panel "Todas las invenciones")
- [ ] **T3.4** [IMPL] `lib/diff/flag-entities.ts` con pure function.
- [ ] **T3.5** [VERIFY] `pnpm test lib/diff` verde.

## Phase 4 — Copy (TDD)

- [ ] **T4.1** [TEST] `lib/copy/es.test.ts` — agregar tests para bloque `diff` (shape + Art. IV: "Revisa la adaptación", no "confirma el cambio automático").
- [ ] **T4.2** [IMPL] Agregar bloque `diff` a `lib/copy/es.ts`:
  - `diff.page.{title, subtitle, noInventions, expired, emptyAdapted}`
  - `diff.modes.{unified, sideBySide, toggle}`
  - `diff.invention.{soft, hard, badgeLabel, softTooltip, hardTooltip}`
  - `diff.actions.{accept, edit, reject, rescore, acceptAnyway, reviewFirst}`
  - `diff.errors.{network, rateLimit, validationFailed, storage}`
- [ ] **T4.3** [VERIFY] `pnpm test lib/copy/es` verde.

## Phase 5 — Components (TDD, uno a la vez)

- [ ] **T5.1** [TEST] `components/diff/diff-view.test.tsx`:
  - Renderiza con `role="region"`, `aria-label="Diff entre CV original y adaptado"`
  - Modo "unificado" (default móvil <768px): una columna con `+`/`−` inline
  - Modo "lado a lado" (default desktop ≥768px): dos columnas (Original | Adaptado)
  - Toggle entre modos via prop `mode` y `onModeChange`
  - Aria-live="polite" cuando cambia el modo
- [ ] **T5.2** [IMPL] `components/diff/diff-view.tsx` (stateless, recibe `DiffChange[]` y `mode`).
- [ ] **T5.3** [TEST] `components/diff/flagged-entity-badge.test.tsx`:
  - Renderiza badge rojo para Soft, rojo oscuro + icono X para Hard
  - aria-label: "Advertencia: invención detectada. Severidad Hard. Término: FakeCorp."
  - Click abre popover con detalles
  - Popover tiene 2 botones: "Editar" y "Mantener"
- [ ] **T5.4** [IMPL] `components/diff/flagged-entity-badge.tsx` (stateless).
- [ ] **T5.5** [TEST] `components/diff/diff-toolbar.test.tsx`:
  - Toggle "Unificado / Lado a lado" (radio buttons o similar)
  - Botón "Re-puntuar" con `aria-busy` durante loading
  - Estado del último score visible (e.g., "Último puntaje: 78")
- [ ] **T5.6** [IMPL] `components/diff/diff-toolbar.tsx`.
- [ ] **T5.7** [TEST] `components/diff/action-footer.test.tsx`:
  - 3 botones: "Aceptar y exportar", "Editar en el editor", "Rechazar y re-prompt"
  - Si hay Hard sin resolver, "Aceptar y exportar" abre modal (FR-070)
  - Modal con 2 opciones: "Aceptar de todos modos" y "Revisar primero"
  - "Editar" navega a `/analizar/editar`
  - "Rechazar" navega a `/analizar` con toast
- [ ] **T5.8** [IMPL] `components/diff/action-footer.tsx` con modal integrado.
- [ ] **T5.9** [TEST] `components/diff/diff-page.test.tsx` (orquestador):
  - Lee `sessionStorage["buildcv:diff-handoff"]` al mount
  - Si no hay handoff → muestra "La adaptación expiró" + botón "Volver a analizar"
  - Si handoff expiró (>1h) → mismo mensaje
  - Renderiza `<DiffView>` + `<DiffToolbar>` + `<FlaggedEntityBadge>` por invención + `<ActionFooter>`
  - Click "Editar" invención: convierte el badge en `<input>` con el valor actual
  - Confirmar edición: valida con Zod, actualiza el adaptedText, dispara re-score opcional
  - Click "Re-puntuar" llama `requestScore(adaptedText, jobText)` y muestra el score
  - aria-live="polite" en cambios de score
- [ ] **T5.10** [IMPL] `components/diff/diff-page.tsx` con `"use client"`, state machine.
- [ ] **T5.11** [VERIFY] `pnpm test components/diff` verde.

## Phase 6 — Page + E2E

- [ ] **T6.1** [IMPL] `app/analizar/diff/page.tsx` (server component que renderiza `<DiffPage>` client component).
- [ ] **T6.2** [TEST E2E] `e2e/diff.spec.ts`:
  - Setup: `page.addInitScript` setea `sessionStorage["buildcv:diff-handoff"]` con un mock AdaptResult (1 inv Hard, 1 inv Soft)
  - Navegar a `/analizar/diff` → ver dos columnas + 2 badges rojos
  - Click "Aceptar y exportar" con Hard pendiente → ver modal "Revisar primero"
  - Confirmar modal → ver navegación a `/analizar/exportar` (mock el destino)
  - Click "Editar" en el badge Soft → ver input editable → cambiar valor → Enter → ver badge desaparece
  - Click "Re-puntuar" → mockear `/api/score` 200 → ver nuevo score
  - Side-by-side: verificar que ambos textos se ven
  - Toggle a "Unificado" → verificar que cambia la vista sin recargar
  - **Test Art. III**: sessionStorage puede contener el handoff (NO en localStorage)
- [ ] **T6.3** [VERIFY] `pnpm test:e2e` verde.

## Phase 7 — Pre-merge verification (6 gates)

- [ ] **T7.1** `pnpm lint` → 0 errores, 0 warnings
- [ ] **T7.2** `pnpm typecheck` → 0 errores
- [ ] **T7.3** `pnpm test` → todos verdes; coverage ≥80% en `lib/diff/` y `components/diff/`
- [ ] **T7.4** `pnpm test:e2e` → verde
- [ ] **T7.5** `pnpm build` → 0 errores, route `/analizar/diff` compila
- [ ] **T7.6** `cd .. && bash scripts/constitution-check.sh` → 20/20 passes, 0 crítico
- [ ] **T7.7** `rg "@ts-ignore|@ts-expect-error|eslint-disable|@ts-nocheck" BuildCv-web/` → 0 matches en código nuevo

## Phase 8 — Commit + push + docs

- [ ] **T8.1** Conventional commit con mensaje que documente la decisión arquitectónica (NO Tiptap, jsdiff sí).
- [ ] **T8.2** Push a `origin/main`.
- [ ] **T8.3** Engram: `mem_save` con sprint 4b close-out.
- [ ] **T8.4** Resumen técnico al user.

## Critical Path

```
T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

## Out of Scope (este sprint, deferred a v1)

- Tiptap v2 read-only inline editor
- Diff a nivel de párrafo o sección
- Historial de diffs
- Sugerencias automáticas de cómo arreglar la invención
- Export del diff como artefacto separado (PDF/imagen)
- Diff en tiempo real colaborativo

## Risks

1. **jsdiff v5 dep**: 1 nueva dep (~15 KB). Verificar bundle impact.
2. **Performance de word-diff**: 50 KB vs 50 KB puede tardar >2 s en máquinas lentas. Skeleton durante el cálculo.
3. **Invenciones que se solapan**: la spec menciona "se muestra la de mayor severidad primero". Implementar como single-pass que sobrescribe en posición.
4. **sessionStorage quota (~5 MB)**: el handoff (JSON del AdaptResult) puede ser 10-50 KB. OK.
5. **Sin tests de Tiptap**: este sprint NO tiene Tiptap, así que no aplica. Cuando se implemente Tiptap en v1, planificar tests E2E con Playwright.

## Definition of Done

- Spec leída, decisión arquitectónica documentada
- Tests escritos ANTES de la impl (TDD real)
- Todos los tests verdes
- Lint + typecheck + build + e2e verdes
- Constitution check 0 crítico
- 0 supresiones, 0 mocks falsos
- Smoke manual: simulate AdaptResult en sessionStorage, navegar a `/analizar/diff`, revisar badges, editar, re-puntuar, aceptar
- Commit con mensaje profesional
- Engram actualizado
