# Tasks: 006-web-cv-editor

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Data Model:** [./data-model.md](./data-model.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
>
> **Convención de IDs:** `T-006-NN` (NN = número correlativo, padded a 2 dígitos).
> **Estimación:** en horas de trabajo de 1 dev (1d ≈ 6h efectivas).
> **Convención de checked:** `[ ]` pendiente, `[x]` hecho, `[~]` en progreso.
> **Sin tests automatizados en v0.5**: las tareas de "Test" se reemplazan por items del checklist E2E manual descrito en `plan.md` §Test plan.

---

## Phase 1: Setup (Infraestructura)

**Purpose**: Instalar dependencias, crear estructura de directorios, configurar tipos.

- [ ] T-006-01 Crear estructura de directorios: `app/analizar/editar/`, `components/editor/`, `lib/editor/{extensions,schema,markdown}/`, `lib/storage/`.
- [ ] T-006-02 Instalar dependencias: `pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-placeholder zod idb nanoid zustand react-markdown remark-gfm` (estimate: 0.5h).
- [ ] T-006-03 Verificar `pnpm install --frozen-lockfile` pasa (no rompe el lockfile). Si rompe, ajustar versiones y documentar en `research.md`. (estimate: 0.5h).

**Checkpoint**: `pnpm install` limpio, estructura de carpetas creada.

---

## Phase 2: Foundational (Tipos, schemas, storage port)

**Purpose**: Cimientos que TODAS las user stories necesitan.

- [ ] T-006-04 [P] Crear `lib/editor/types.ts` con `CvDocument`, `CvSection` (discriminated union), `EntityRef`, `Draft`, 8 tipos de sección, y los Zod schemas correspondientes. (estimate: 3h, files: 1).
- [ ] T-006-05 [P] Crear 8 archivos de Zod schemas en `lib/editor/schema/`: `profile.ts`, `experience.ts`, `education.ts`, `skills.ts`, `projects.ts`, `certifications.ts`, `languages.ts`, `other.ts`, más `index.ts` con `CvDocumentSchema` y `DraftSchema`. (estimate: 3h, files: 9).
- [ ] T-006-06 [P] Crear `lib/editor/errors.ts` con `EntityNotAllowedError`, `SectionValidationFailedError`, `RoundTripMismatchError`, `QuotaExceededError`, `StorageUnavailableError`, `DraftNotFoundError`. (estimate: 1h, files: 1).
- [ ] T-006-07 [P] Crear `lib/storage/icv-store.ts` con la interface `ICvStore` y los tipos de error. (estimate: 1h, files: 1).
- [ ] T-006-08 [P] Crear `lib/storage/local-storage-cv-store.ts` con la implementación default (≤4 MB). (estimate: 2h, files: 1).
- [ ] T-006-09 Crear `lib/storage/indexed-db-cv-store.ts` con la implementación fallback (>4 MB) usando `idb`. (estimate: 2h, files: 1, **depends on**: T-006-08 — para compartir interfaz).
- [ ] T-006-10 Crear `lib/storage/index.ts` con la factory `getCvStore()` que elige adapter según cuota. (estimate: 1h, files: 1, **depends on**: T-006-08, T-006-09).
- [ ] T-006-11 Crear `lib/editor/markdown/remark-buildcv.ts` con el plugin remark custom que mapea headings → secciones. (estimate: 3h, files: 1).

**Checkpoint**: Tipos validados, storage funcional (probar `await getCvStore().save(draft)` en consola).

---

## Phase 3: Markdown round-trip + Tiptap extensions

**Purpose**: Editor funcional sin UI aún (probable en tests con `__editor_test.roundtrip()`).

- [ ] T-006-12 Crear `lib/editor/markdown/serialize.ts` con `serializeCvDocument(doc): string`. (estimate: 2h, files: 1, **depends on**: T-006-04, T-006-05).
- [ ] T-006-13 Crear `lib/editor/markdown/parse.ts` con `parseCvDocument(md, ctx): CvDocument` y validación de `EntityRef`. (estimate: 3h, files: 1, **depends on**: T-006-12, T-006-11).
- [ ] T-006-14 Crear `lib/editor/roundtrip.ts` con `roundtrip(doc, ctx): {ok: true, markdown} | {ok: false, error}`. (estimate: 1h, files: 1, **depends on**: T-006-12, T-006-13).
- [ ] T-006-15 [P] Crear `lib/editor/extensions/profile-node.ts` (custom node Tiptap para Profile). (estimate: 1h, files: 1).
- [ ] T-006-16 [P] Crear `lib/editor/extensions/experience-node.ts`. (estimate: 1.5h, files: 1, **largest**).
- [ ] T-006-17 [P] Crear `lib/editor/extensions/education-node.ts`. (estimate: 1h, files: 1).
- [ ] T-006-18 [P] Crear `lib/editor/extensions/skills-node.ts`. (estimate: 1.5h, files: 1).
- [ ] T-006-19 [P] Crear `lib/editor/extensions/projects-node.ts`. (estimate: 1.5h, files: 1).
- [ ] T-006-20 [P] Crear `lib/editor/extensions/certifications-node.ts`. (estimate: 1h, files: 1).
- [ ] T-006-21 [P] Crear `lib/editor/extensions/languages-node.ts`. (estimate: 0.5h, files: 1).
- [ ] T-006-22 [P] Crear `lib/editor/extensions/other-node.ts`. (estimate: 0.5h, files: 1).
- [ ] T-006-23 Crear `lib/editor/extensions/index.ts` que exporta el array `cvExtensions`. (estimate: 0.5h, files: 1, **depends on**: T-006-15..T-006-22).

**Checkpoint**: `__editor_test.roundtrip()` retorna `success: true` para un CvDocument con 3 secciones.

---

## Phase 4: User Story 1 — Editar el CV importado (Priority: P1)

**Goal**: El editor renderiza las 8 secciones y permite editarlas.

**Independent Test**: Pegar un CV en `/analizar/editar`, editar Skills, ver el cambio persistido en el `CvDocument` interno.

- [ ] T-006-24 Crear `components/editor/editor.tsx` (orquestador Tiptap con `useEditor`, sin UI aún). (estimate: 2h, files: 1, **depends on**: T-006-23).
- [ ] T-006-25 Crear `components/editor/section-node.tsx` (componente React que renderiza un custom node Tiptap). (estimate: 2h, files: 1).
- [ ] T-006-26 Crear `components/editor/entity-badge.tsx` (badge inline para `EntityRef`). (estimate: 1h, files: 1).
- [ ] T-006-27 Crear `app/analizar/editar/page.tsx` (server component). (estimate: 1h, files: 1).
- [ ] T-006-28 Crear `app/analizar/editar/layout.tsx` (layout con toolbar persistente). (estimate: 0.5h, files: 1).
- [ ] T-006-29 Crear `lib/editor/use-cv-document.ts` (hook que envuelve `useEditor` + sincroniza con Zustand store). (estimate: 2h, files: 1, **depends on**: T-006-04, T-006-24).
- [ ] T-006-30 Crear `lib/api/editor-handoff.ts` que lee `EditorHandoff` desde sessionStorage (escrito por 005). (estimate: 1h, files: 1).

**Checkpoint**: `pnpm dev`, ir a `/analizar/editar`, ver 8 secciones editables.

---

## Phase 5: User Story 2 — Guardar y restaurar el borrador (Priority: P1)

**Goal**: El borrador persiste entre recargas.

- [ ] T-006-31 Crear `lib/editor/use-draft.ts` con el hook React para `ICvStore`. (estimate: 2h, files: 1, **depends on**: T-006-10).
- [ ] T-006-32 Crear `components/editor/editor-save-indicator.tsx` ("Guardado hace X seg" / "Guardando..."). (estimate: 1h, files: 1).
- [ ] T-006-33 Implementar debounce de 1 s en `use-cv-document.ts` para auto-guardar. (estimate: 1h, files: 0 — modifica T-006-29, **depends on**: T-006-31).
- [ ] T-006-34 Crear `components/editor/restore-draft-modal.tsx` (modal "Tienes un borrador. ¿Restaurarlo?"). (estimate: 1h, files: 1, **depends on**: T-006-31).

**Checkpoint**: Editar → esperar 1 s → recargar → modal aparece → restaurar → borrador visible.

---

## Phase 6: User Story 3 — Limpiar borrador (Priority: P1) [REGLA DURA Art. III FR-040b]

**Goal**: Botón explícito "Limpiar borrador" con modal de confirmación.

- [ ] T-006-35 Crear `components/editor/limp-borrador-button.tsx` con estado disabled cuando no hay borrador. (estimate: 1h, files: 1).
- [ ] T-006-36 Crear `components/editor/limp-borrador-modal.tsx` (modal de confirmación). (estimate: 1h, files: 1, **depends on**: T-006-35).
- [ ] T-006-37 Implementar acción `clear()` en `useDraft` y conectar al botón. (estimate: 1h, files: 0 — modifica T-006-31, **depends on**: T-006-36).
- [ ] T-006-38 Añadir a `lib/copy/es.ts` el bloque `EDITOR_COPY` con todos los textos del editor en español. (estimate: 1h, files: 0 — modifica `lib/copy/es.ts`).

**Checkpoint**: Click "Limpiar borrador" → modal → confirmar → DevTools muestra localStorage/IndexedDB vacíos.

---

## Phase 7: User Story 4 — Re-puntuar (Priority: P2)

**Goal**: Re-score on demand.

- [ ] T-006-39 Extender `lib/api/types.ts` con `ScoreResponseSchema` (re-uso del de 002) si no existe. (estimate: 0.5h, files: 0 — verifica).
- [ ] T-006-40 Crear `lib/editor/use-rescore.ts` con el hook que llama `requestScore(cvText, jobText)`. (estimate: 2h, files: 1, **depends on**: T-006-39).
- [ ] T-006-41 Crear `components/editor/score-badge.tsx` (badge animado con delta "Antes → Ahora"). (estimate: 2h, files: 1, **depends on**: T-006-40).
- [ ] T-006-42 Implementar serialización del CvDocument → Markdown en el flujo de re-score. (estimate: 1h, files: 0 — extiende T-006-29, **depends on**: T-006-12, T-006-40).

**Checkpoint**: Editar → "Re-puntuar" → spinner → badge con delta visible.

---

## Phase 8: User Story 5 — Exportar Markdown (Priority: P2)

**Goal**: Botón "Exportar Markdown" descarga el CV en `.md`.

- [ ] T-006-43 Crear `lib/editor/export.ts` con la función `exportCvDocumentAsMarkdown(doc): void` (genera Blob, dispara descarga). (estimate: 1h, files: 1, **depends on**: T-006-12).
- [ ] T-006-44 Conectar el botón "Exportar" de la toolbar a `exportCvDocumentAsMarkdown`. (estimate: 0.5h, files: 0 — modifica T-006-24, **depends on**: T-006-43).

**Checkpoint**: Click "Exportar" → descarga `cv-2026-06-08.md` con 8 secciones.

---

## Phase 9: Polish & Cross-Cutting (a11y, integración, checklist E2E)

**Purpose**: Accesibilidad, integración con otras features, validación manual.

- [ ] T-006-45 [P] Auditar WCAG 2.2 AA con axe-core (DevTools extension) o Lighthouse. Corregir issues. (estimate: 2h).
- [ ] T-006-46 [P] Implementar navegación por teclado completa: `Tab`/`Shift+Tab` orden lógico, `Enter`/`Space` activan botones, `Esc` cierra modales. (estimate: 1h).
- [ ] T-006-47 [P] Anuncios ARIA: cambios de score, guardado, errores → `aria-live="polite"`. (estimate: 1h).
- [ ] T-006-48 [P] Verificar mobile (≥360 px): toolbar colapsable, scroll vertical entre secciones. (estimate: 1h).
- [ ] T-006-49 Verificar integración con 005: importar PDF → pre-poblar editor → las 8 secciones se llenan correctamente. (estimate: 1h, **depends on**: T-006-30).
- [ ] T-006-50 Verificar integración con 002 (re-score): re-puntuar el CV editado retorna score actualizado. (estimate: 0.5h, **depends on**: T-006-40..T-006-42).
- [ ] T-006-51 Verificar integración con 003 (adapt): el botón "Ver diff" de la sub-feature 006b navega correctamente. (estimate: 0.5h, **cross-feature**).
- [ ] T-006-52 Ejecutar checklist E2E manual completo (ver `plan.md` §Test plan). Documentar resultados en `specs/006-web-cv-editor/qa-checklist-results.md`. (estimate: 2h).
- [ ] T-006-53 Verificar `pnpm lint` y `pnpm build` en verde. (estimate: 0.5h, **CI gate**).
- [ ] T-006-54 Verificar `pnpm install --frozen-lockfile` (CI gate). (estimate: 0.5h).
- [ ] T-006-55 Verificar bundle size: el editor añade <100 KB al First Load JS de `/analizar/editar`. (estimate: 0.5h, command: `pnpm build` + ver output).

**Checkpoint**: Checklist E2E pasa, CI gates verdes, score Lighthouse a11y ≥95.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Sin dependencias. Empezar inmediatamente.
- **Phase 2 (Foundational)**: Depende de Phase 1. **BLOQUEA** todas las user stories.
- **Phase 3 (Round-trip + Tiptap)**: Depende de Phase 2. Puede ir en paralelo con Phase 4-8 si hay equipo.
- **Phase 4 (US-1)**: Depende de Phase 2 + Phase 3. Empieza la primera historia de usuario.
- **Phase 5 (US-2)**: Depende de Phase 4 (necesita el editor para guardar).
- **Phase 6 (US-3)**: Depende de Phase 4 (necesita el botón en la toolbar).
- **Phase 7 (US-4)**: Depende de Phase 4 (necesita el editor para serializar).
- **Phase 8 (US-5)**: Depende de Phase 3 (necesita `serializeCvDocument`).
- **Phase 9 (Polish)**: Depende de todas las user stories deseadas.

### User Story Dependencies

- **US-1 (Editar)**: empieza después de Phase 3.
- **US-2 (Guardar/restaurar)**: integra con US-1 pero testeable independientemente.
- **US-3 (Limpiar)**: REGLA DURA (Art. III FR-040b). No bloqueante para US-1, pero debe existir antes del ship.
- **US-4 (Re-puntuar)**: depende de US-1 (necesita el editor para extraer el texto).
- **US-5 (Exportar)**: depende de US-1 (necesita el editor para serializar).

### Within Each Phase

- Setup → Foundational → Round-trip → US-1 → US-2, US-3, US-4, US-5 (en paralelo) → Polish.

### Parallel Opportunities

- **T-006-04 a T-006-06**: tipos, schemas, errores — archivos distintos, [P].
- **T-006-08 a T-006-10**: storage adapters — T-006-09 depende de T-006-08, los demás [P].
- **T-006-15 a T-006-22**: 8 custom nodes Tiptap — totalmente [P], archivos distintos.
- **T-006-45 a T-006-48**: a11y tasks — [P].

---

## Implementation Strategy

### MVP First (US-1 + US-2 + US-3)

1. Phase 1 (Setup)
2. Phase 2 (Foundational)
3. Phase 3 (Round-trip + Tiptap)
4. Phase 4 (US-1 — Editar)
5. Phase 5 (US-2 — Guardar/restaurar)
6. Phase 6 (US-3 — Limpiar borrador) ← REGLA DURA, obligatorio
7. **STOP y VALIDATE**: editor básico funcional, sin re-score, sin export.
8. Demo a stakeholders.

### Incremental Delivery

1. Phase 1 + 2 + 3 + 4 + 5 + 6 → Editor MVP (v0.5-alpha)
2. Phase 7 (US-4) → Re-puntuar (v0.5-beta)
3. Phase 8 (US-5) → Exportar Markdown (v0.5-rc1)
4. Phase 9 (Polish) → v0.5-ship

---

## Estimates Summary

| Phase | Horas | Días (6h/d) |
|---|---|---|
| Phase 1 — Setup | 1.5 | 0.25 |
| Phase 2 — Foundational | 16 | 2.7 |
| Phase 3 — Round-trip + Tiptap | 13 | 2.2 |
| Phase 4 — US-1 (Editar) | 9.5 | 1.6 |
| Phase 5 — US-2 (Guardar) | 5 | 0.8 |
| Phase 6 — US-3 (Limpiar) | 4 | 0.7 |
| Phase 7 — US-4 (Re-puntuar) | 5.5 | 0.9 |
| Phase 8 — US-5 (Exportar) | 1.5 | 0.25 |
| Phase 9 — Polish | 10 | 1.7 |
| **Total** | **66** | **~11 días** |

Con 1 dev full-time: ~2 semanas (5 días/semana) hasta ship.

---

## Notes

- **[P] tasks** = archivos distintos, no dependencias. Pueden correr en paralelo si hay equipo.
- Cada user story (US-1 a US-5) es testeable independientemente. Plan: implementar y demo de cada una antes de pasar a la siguiente.
- Phase 9 (Polish) NO es opcional: el checklist E2E + WCAG AA son gates de Constitución (Art. III, Art. IV) y de ship.
- **Testing framework ya instalado en sprint 0** (Vitest 2 + RTL 16 + Playwright 1 chromium). TDD activo por Constitución Art. VIII: escribir el test de cada componente antes de la implementación. El checklist E2E manual sigue siendo **complementario** a la suite automatizada — cubre flujos que la suite aún no automatiza.

---

## Next Phase

→ Implementación por un dev frontend, siguiendo el orden de fases.
→ Sub-agente recomendado para revisión: `frontend-qa` (chequea WCAG, accesibilidad, performance, bundle size).
