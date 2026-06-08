# Tasks: 006-web-cv-diff-viewer

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Data Model:** [./data-model.md](./data-model.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
>
> **Convención**: `T-006b-NN` (NN correlativo, padded).
> **Estimación**: horas de 1 dev (1d ≈ 6h).
> **Sin tests automatizados en v0.5**: checklist E2E manual (ver `plan.md` §Test plan).

---

## Phase 1: Setup (Infraestructura mínima)

**Purpose**: Dependencias, estructura de directorios, tipos.

- [ ] T-006b-01 Crear estructura: `app/analizar/diff/`, `components/diff/`, `lib/diff/`. (estimate: 0.25h).
- [ ] T-006b-02 Instalar `pnpm add diff@^5`. Verificar `pnpm install --frozen-lockfile` pasa. (estimate: 0.25h).
- [ ] T-006b-03 [P] Crear `lib/diff/types.ts` con `DiffSegment`, `DiffSegmentWithFlags`, `DiffInput`, `DiffResult`, `DiffSummary`, `DiffMode`. (estimate: 1.5h, files: 1).
- [ ] T-006b-04 [P] Crear `lib/diff/schema.ts` con Zod schemas (`DiffInputSchema`, etc.). (estimate: 0.5h, files: 1).
- [ ] T-006b-05 [P] Crear `lib/diff/errors.ts` con `DiffComputationError`, `AdaptationExpiredError`, `HardInventionPendingError`. (estimate: 0.5h, files: 1).

**Checkpoint**: Tipos compilan, `pnpm install` limpio.

---

## Phase 2: Foundational (Funciones puras + handoff)

**Purpose**: Cimientos de cómputo y handoff.

- [ ] T-006b-06 [P] Crear `lib/diff/compute-diff.ts` con `computeWordDiff` (jsdiff wrapper) y `buildDiffResult`. (estimate: 2h, files: 1, **depends on**: T-006b-03).
- [ ] T-006b-07 [P] Crear `lib/diff/flag-entities.ts` con `mapFlagsToSegments`. (estimate: 1.5h, files: 1, **depends on**: T-006b-03).
- [ ] T-006b-08 [P] Crear `lib/diff/can-direct-accept.ts` con `canDirectAccept`. (estimate: 0.5h, files: 1, **depends on**: T-006b-03).
- [ ] T-006b-09 Crear `lib/diff/handoff.ts` con `getDiffHandoff`, `setDiffHandoff`, `clearDiffHandoff`, y validación de expiración (1 h). (estimate: 1h, files: 1, **depends on**: T-006b-04).
- [ ] T-006b-10 Crear `lib/diff/use-diff.ts` con el hook `useDiff` (memoiza el resultado, gestiona `mode`, `applyEdit`). (estimate: 2h, files: 1, **depends on**: T-006b-06, T-006b-07).

**Checkpoint**: En consola del navegador: `__diff_test.computeDiff("hello world", "hello there")` retorna segments.

---

## Phase 3: User Story 1 — Ver el diff (Priority: P1)

**Goal**: Renderizar el diff en dos modos (unified | side-by-side).

**Independent Test**: Adaptar un CV → llegar a `/analizar/diff` → ver el diff.

- [ ] T-006b-11 Crear `app/analizar/diff/page.tsx` (server component que carga el handoff y renderiza el client component). (estimate: 1h, files: 1, **depends on**: T-006b-09).
- [ ] T-006b-12 Crear `app/analizar/diff/layout.tsx` (layout con DiffToolbar persistente). (estimate: 0.5h, files: 1).
- [ ] T-006b-13 Crear `components/diff/diff-view.tsx` (orquestador: elige modo según viewport). (estimate: 2h, files: 1, **depends on**: T-006b-10).
- [ ] T-006b-14 Crear `components/diff/diff-column.tsx` (una columna del diff). (estimate: 1.5h, files: 1, **depends on**: T-006b-13).
- [ ] T-006b-15 Crear `lib/diff/render-diff.tsx` con la función pura `renderDiffSegment` y `renderDiffColumn`. (estimate: 1.5h, files: 1, **depends on**: T-006b-03).
- [ ] T-006b-16 Crear `components/diff/diff-toolbar.tsx` con toggle de modo y botón "Re-puntuar". (estimate: 1.5h, files: 1, **depends on**: T-006b-13).

**Checkpoint**: `pnpm dev`, ir a `/analizar/diff`, ver el diff con toggle funcional.

---

## Phase 4: User Story 2 — Ver invenciones marcadas (Priority: P1) [REGLA DURA Art. I]

**Goal**: Badges rojos sobre cada EntityInvention, popover con detalles.

**Independent Test**: Adaptar un CV con invención → ver badge rojo → click → popover con detalles.

- [ ] T-006b-17 Crear `components/diff/flagged-entity-badge.tsx` con variantes Soft/Hard, icono, aria-label. (estimate: 2h, files: 1, **depends on**: T-006b-07).
- [ ] T-006b-18 Crear `components/diff/flagged-entity-popover.tsx` con detalles + acciones "Editar" / "Mantener". (estimate: 2h, files: 1, **depends on**: T-006b-17).
- [ ] T-006b-19 Integrar los badges en `diff-column.tsx` (cuando el segmento tiene flags). (estimate: 1h, files: 0 — modifica T-006b-14, **depends on**: T-006b-17).

**Checkpoint**: Las invenciones aparecen como badges rojos con popover funcional.

---

## Phase 5: User Story 3 — Editar invención inline (Priority: P2)

**Goal**: Edición inline con Tiptap read-only + validación Zod.

**Independent Test**: Click "Editar" sobre invención → input Tiptap → cambiar valor → invención desaparece.

- [ ] T-006b-20 Crear `components/diff/inline-entity-editor.tsx` con Tiptap read-only + nodo editable + validación Zod. (estimate: 3h, files: 1, **depends on**: T-006b-18).
- [ ] T-006b-21 Implementar `applyEdit` en `use-diff.ts` que actualiza el `adaptedText` y elimina la invención. (estimate: 1h, files: 0 — modifica T-006b-10, **depends on**: T-006b-20).

**Checkpoint**: Edición inline funciona, re-puntuar muestra el score actualizado.

---

## Phase 6: User Story 4 — Aceptar / rechazar (Priority: P1) [REGLA DURA Art. I FR-070]

**Goal**: Footer con 3 acciones + modal de bloqueo para Hard.

**Independent Test**: Click "Aceptar y exportar" con Hard pendiente → modal obligatorio.

- [ ] T-006b-22 Crear `components/diff/action-footer.tsx` con 3 botones. (estimate: 1.5h, files: 1, **depends on**: T-006b-08).
- [ ] T-006b-23 Crear `components/diff/hard-invention-modal.tsx` (modal de confirmación). (estimate: 1h, files: 1, **depends on**: T-006b-22).
- [ ] T-006b-24 Implementar la lógica de "Aceptar y exportar" en `action-footer`: setea `DiffHandoff` y navega a `/analizar/exportar`. (estimate: 1h, files: 0 — modifica T-006b-22, **depends on**: T-006b-09).
- [ ] T-006b-25 Implementar "Editar en el editor": navega a `/analizar/editar` con el CV adaptado pre-poblado. (estimate: 0.5h, files: 0 — modifica T-006b-22).
- [ ] T-006b-26 Implementar "Rechazar y re-prompt": limpia `DiffHandoff`, navega a `/analizar`, toast. (estimate: 0.5h, files: 0 — modifica T-006b-22).

**Checkpoint**: Footer funcional, modal bloquea Hard, navegación correcta.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Copy en español, a11y, integración con 003, checklist E2E.

- [ ] T-006b-27 [P] Añadir a `lib/copy/es.ts` el bloque `DIFF_COPY` con todos los textos en español. (estimate: 1h, files: 0 — modifica `lib/copy/es.ts`).
- [ ] T-006b-28 [P] Auditar WCAG 2.2 AA con axe-core / Lighthouse. Corregir issues. (estimate: 1.5h).
- [ ] T-006b-29 [P] Navegación por teclado: `Tab` entre badges, `Enter` abre popover, `Esc` cierra. (estimate: 1h).
- [ ] T-006b-30 [P] Anuncios ARIA: cambios de score, invenciones, errores → `aria-live="polite"`. (estimate: 1h).
- [ ] T-006b-31 [P] Mobile: verificar ≥360 px, default unificado, toggle funciona. (estimate: 0.5h).
- [ ] T-006b-32 Verificar integración con 003: el botón "Ver diff" de `003-web-adapt-ui` navega correctamente. (estimate: 0.5h, **cross-feature**).
- [ ] T-006b-33 Verificar integración con 002: "Re-puntuar" llama a `requestScore` con el texto actualizado. (estimate: 0.5h, **depends on**: T-006b-16).
- [ ] T-006b-34 Verificar integración con 004: "Aceptar y exportar" navega a `/analizar/exportar` con el CV adaptado. (estimate: 0.5h).
- [ ] T-006b-35 Ejecutar checklist E2E manual completo (ver `plan.md` §Test plan). Documentar resultados. (estimate: 1.5h).
- [ ] T-006b-36 Verificar `pnpm lint` y `pnpm build` en verde. (estimate: 0.5h, **CI gate**).
- [ ] T-006b-37 Verificar bundle size: el diff viewer añade <15 KB al First Load JS de `/analizar/diff`. (estimate: 0.5h, command: `pnpm build` + ver output).

**Checkpoint**: Checklist E2E pasa, CI gates verdes, score Lighthouse a11y ≥95.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias.
- **Phase 2 (Foundational)**: Depende de Phase 1. **BLOQUEA** todas las user stories.
- **Phase 3 (US-1)**: Depende de Phase 2.
- **Phase 4 (US-2)**: Depende de Phase 3 (necesita el render del diff).
- **Phase 5 (US-3)**: Depende de Phase 4 (necesita los badges para editarlos).
- **Phase 6 (US-4)**: Depende de Phase 2 (necesita `canDirectAccept`) + Phase 4 (necesita saber el conteo de Hard).
- **Phase 7 (Polish)**: Depende de todas las US deseadas.

### User Story Dependencies

- **US-1 (Ver diff)**: empieza después de Phase 2.
- **US-2 (Badges)**: integra con US-1, testeable independientemente.
- **US-3 (Editar)**: depende de US-2 (necesita el popover).
- **US-4 (Aceptar/rechazar)**: depende de US-2 (necesita contar Hard pendientes).

### Within Each Phase

- Setup → Foundational → US-1 → US-2 → US-3, US-4 (US-3 y US-4 pueden ir en paralelo si hay equipo) → Polish.

### Parallel Opportunities

- **T-006b-03, T-006b-04, T-006b-05**: tipos, schemas, errores — archivos distintos, [P].
- **T-006b-06, T-006b-07, T-006b-08**: funciones puras — archivos distintos, [P].
- **T-006b-17, T-006b-18**: badge y popover — pueden ir en paralelo (distintos archivos).
- **T-006b-28, T-006b-29, T-006b-30, T-006b-31**: tareas a11y — [P].

---

## Implementation Strategy

### MVP First (US-1 + US-2 + US-4)

1. Phase 1 (Setup)
2. Phase 2 (Foundational)
3. Phase 3 (US-1 — Ver diff)
4. Phase 4 (US-2 — Badges)
5. Phase 6 (US-4 — Aceptar/rechazar) ← REGLA DURA, obligatorio
6. **STOP y VALIDATE**: diff viewer básico funcional, sin edición inline.
7. Demo a stakeholders.

### Incremental Delivery

1. Phase 1 + 2 + 3 + 4 + 6 → Diff viewer MVP (v0.5-alpha)
2. Phase 5 (US-3) → Edición inline (v0.5-beta)
3. Phase 7 (Polish) → v0.5-ship

---

## Estimates Summary

| Phase | Horas | Días (6h/d) |
|---|---|---|
| Phase 1 — Setup | 2.75 | 0.5 |
| Phase 2 — Foundational | 7 | 1.2 |
| Phase 3 — US-1 (Ver diff) | 8 | 1.3 |
| Phase 4 — US-2 (Badges) | 5 | 0.8 |
| Phase 5 — US-3 (Editar) | 4 | 0.7 |
| Phase 6 — US-4 (Aceptar/rechazar) | 5 | 0.8 |
| Phase 7 — Polish | 9.5 | 1.6 |
| **Total** | **~41** | **~7 días** |

Con 1 dev full-time: ~1.5 semanas hasta ship.

---

## Notes

- **[P] tasks** = archivos distintos, no dependencias. Pueden correr en paralelo.
- US-3 (edición inline) NO es bloqueante para el ship; se puede hacer post-MVP.
- Phase 7 (Polish) NO es opcional: WCAG AA es gate de Constitución.
- Vitest + RTL llegan en M3+ (no en v0.5).

---

## Next Phase

→ Implementación por un dev frontend.
→ Sub-agente recomendado para revisión: `frontend-qa` (a11y, performance, bundle size).
