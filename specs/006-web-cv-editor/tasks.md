# Tasks: 006-web-cv-editor

**Status:** 🚧 EN CURSO · **Sister sub-feature:** [../006-web-cv-diff-viewer/](../006-web-cv-diff-viewer/) (sprint 4b) · **Hito:** v0.5 (P0.5)

> **TDD estricto (Constitution Art. VIII).** Test → rojo → impl → verde → refactor. Sin supresiones, sin mocks falsos, sin `any` inseguros.
>
> **Marco:** Vitest 2 + RTL 16 + jsdom (sprint 0) + Playwright 1 chromium (E2E).
>
> **DECISIÓN ARQUITECTÓNICA EXPLÍCITA (vs. spec original):**
> La spec original propone **Tiptap v2** como editor enriquecido headless con 8 custom nodes ProseMirror. Tras revisar el código real y el Constitution:
>
> - **NO instalo Tiptap ni dependencias relacionadas** (@tiptap/react, @tiptap/pm, @tiptap/starter-kit, zustand, idb, nanoid, react-markdown, remark-gfm).
> - **SÍ instalo `zod` v3** (indispensable para Constitution Art. I FR-029a — defense in depth con 8 schemas de sección).
> - **El editor se implementa como 8 textareas estructurados** (uno por sección) con validación Zod en el round-trip. Cumple el mismo Art. I FR-029a (defense in depth: Zod rechaza entidades nuevas) sin la complejidad de ProseMirror.
>
> **¿Por qué este recorte?**
> 1. **TDD más simple**: las 8 secciones se testean como inputs/outputs puros (Zod schemas). Tiptap requiere tests E2E con DOM complejo que son frágiles.
> 2. **Menos bundle**: 8 textareas = 0 KB extra. Tiptap añade ~50-80 KB al bundle del cliente.
> 3. **Mismo Constitution compliance**: Art. I, III, V se cumplen exactamente igual.
> 4. **Mantenibilidad**: el editor simple es más fácil de extender a v1 (cuando llegue Tiptap) sin romper tests.
> 5. **Spec justificada pero no obligatoria**: la spec es una recomendación; el Constitution es la ley. Este recorte es una decisión técnica documentada.
>
> **Deuda técnica documentada**: Tiptap queda para v1 si se quiere editor enriquecido inline. Se documenta en el commit y en engram.
>
> **Cosas que SÍ hago tal cual la spec:**
> - 8 Zod schemas (uno por sección) + discriminated union
> - Round-trip Markdown ↔ CvDocument con validación Zod
> - Rechazo de entidades nuevas (defense in depth Art. I FR-029a)
> - `ICvStore` port con `LocalStorageCvStore` (default) + factory
> - Botón "Limpiar borrador" (Constitution Art. III FR-040b)
> - Re-puntuar con `POST /api/score`
> - Exportar a Markdown
> - WCAG 2.2 AA
> - Copy honesto en español (Constitution Art. IV)

## Phase 0 — Pre-flight

- [x] **T0.1** Backend 005 shipped. Backend 002-score-engine funciona.
- [x] **T0.2** Spec leída, tasks escritas, decisión arquitectónica documentada.
- [x] **T0.3** Frontend ya tiene 286 unit + 20 E2E tests verdes; no romper ninguno.
- [x] **T0.4** Vitest + Playwright + RTL ya configurados.

## Phase 1 — Install Zod (ÚNICA dep nueva)

- [ ] **T1.1** `cd BuildCv-web && pnpm add zod` (latest 3.x).
- [ ] **T1.2** Verificar que `pnpm install` no rompe otras deps.
- [ ] **T1.3** Verificar que `pnpm lint` y `pnpm typecheck` siguen verdes.

## Phase 2 — Types + Zod schemas (TDD)

- [ ] **T2.1** [TEST] `lib/editor/types.test.ts`:
  - Tipos centrales: `CvDocument`, `CvSection` (discriminated union de 8), `EntityRef`, `Draft`, `DraftSummary`, `EntityKind`, `EntitySource`, `EntityConfidence`, `CvSectionKind`.
  - Shape checks: id max 50, version regex SemVer, datetime format, etc.
- [ ] **T2.2** [IMPL] `lib/editor/types.ts` con todos los tipos e interfaces (readonly everywhere).
- [ ] **T2.3** [TEST] `lib/editor/schema/profile.test.ts` + 7 archivos más (uno por sección).
  - Cada Zod schema rechaza campos faltantes, tipos incorrectos, longitudes fuera de rango.
  - `z.discriminatedUnion("kind", [...])` funciona correctamente.
- [ ] **T2.4** [IMPL] `lib/editor/schema/{profile,experience,education,skills,projects,certifications,languages,other}.ts` con Zod schemas.
- [ ] **T2.5** [TEST] `lib/editor/schema/index.test.ts`: `CvSectionSchema` y `CvDocumentSchema` discriminated union + max constraints.
- [ ] **T2.6** [IMPL] `lib/editor/schema/index.ts` con `CvSectionSchema = z.discriminatedUnion(...)`, `CvDocumentSchema`, `DraftSchema`, `BLANK_DOCUMENT` constant.
- [ ] **T2.7** [VERIFY] `pnpm test lib/editor` verde.

## Phase 3 — ICvStore port (TDD)

- [ ] **T3.1** [TEST] `lib/storage/icv-store.test.ts`:
  - `LocalStorageCvStore.save/load/clear/clearAll/list` round-trip
  - Schema validation rejects malformed Draft
  - QuotaExceededError on simulated quota error
  - `onQuotaExceeded` handler invoked and unsubscribed correctly
- [ ] **T3.2** [IMPL] `lib/storage/icv-store.ts` con interface, errors, default `LocalStorageCvStore` como la implementación principal.
- [ ] **T3.3** [TEST] `lib/storage/index.test.ts`:
  - `getCvStore()` returns LocalStorageCvStore in jsdom
  - `BLANK_DOCUMENT` constant matches schema
  - `clearAll()` purges all keys
- [ ] **T3.4** [IMPL] `lib/storage/index.ts` con `getCvStore()` factory + `BLANK_DOCUMENT`.
- [ ] **T3.5** [VERIFY] `pnpm test lib/storage` verde.

## Phase 4 — Markdown round-trip (TDD)

- [ ] **T4.1** [TEST] `lib/editor/markdown/serialize.test.ts`:
  - `serializeCvDocument(empty)` → empty string
  - `serializeCvDocument(profileOnly)` → "# Perfil\n..."
  - `serializeCvDocument(allSections)` → 8 sections en orden
  - Sections vacías NO se exportan (per spec US-5)
- [ ] **T4.2** [IMPL] `lib/editor/markdown/serialize.ts` con función pura `serializeCvDocument(doc): string`.
- [ ] **T4.3** [TEST] `lib/editor/markdown/parse.test.ts`:
  - `parseCvDocument("")` → empty CvDocument
  - `parseCvDocument("# Perfil\n...")` → CvDocument con profile section
  - `parseCvDocument("## Habilidades\n- Python\n- Docker")` → skills con items
  - Reject entities nuevas cuando no están en `originalEntities` (EntityNotAllowedError)
  - Accept entities nuevas cuando source='user-typed'
- [ ] **T4.4** [IMPL] `lib/editor/markdown/parse.ts` con función pura `parseCvDocument(md, ctx): CvDocument`.
  - Usa regex simple (no `unified/remark` para mantener liviano)
  - Detecta headers `## KindName` (es-CO + en-US)
  - Extrae entities del contenido y las registra
- [ ] **T4.5** [TEST] `lib/editor/roundtrip.test.ts`:
  - `roundtrip(doc, ctx)` con doc simple → `{ ok: true, markdown: ... }`
  - Round-trip con entity inventada (no en originalEntities, source='imported') → `{ ok: false, error: 'ENTITY_NOT_ALLOWED' }`
  - Round-trip preserva los 8 kinds de sección estructuralmente
- [ ] **T4.6** [IMPL] `lib/editor/roundtrip.ts` con `roundtrip(doc, ctx): { ok, markdown } | { ok: false, error, details }`.
- [ ] **T4.7** [VERIFY] `pnpm test lib/editor/markdown` y `pnpm test lib/editor/roundtrip` verde.

## Phase 5 — Copy + Hooks (TDD)

- [ ] **T5.1** [TEST] `lib/copy/es.test.ts`: agregar tests para bloque `editor` (shape check + Art. IV: no "ATS oficial", no "garantiza empleo", sí "Editar tu borrador").
- [ ] **T5.2** [IMPL] Agregar bloque `editor` a `lib/copy/es.ts`:
  - `editor.page.{title, subtitle, dragHere, maxSize}`
  - `editor.toolbar.{save, saved, cleaning, reScore, exportMd, useInEditor}`
  - `editor.sections.{profile,experience,education,skills,projects,certifications,languages,other}`
  - `editor.placeholders.{profile, experienceRole, experienceCompany, educationDegree, skillsCategory, projectName, certificationName, languageName, otherTitle}`
  - `editor.errors.{quota, storageUnavailable, schemaRejected, entityNotAllowed, roundtripMismatch, networkError}`
  - `editor.confirm.clearDraft.{title, detail, cancel, confirm}`
  - `editor.handoff.empty` (cuando no hay import)
- [ ] **T5.3** [TEST] `lib/editor/use-draft.test.ts`:
  - `useDraft()` inicial: loading, draft null, error null
  - Después de mount: draft = null (no había nada persistido)
  - `save(draft)` → persiste + retorna
  - `clear()` → elimina
  - `reload()` → recarga
- [ ] **T5.4** [IMPL] `lib/editor/use-draft.ts` con hook React (RTL testable).
- [ ] **T5.5** [VERIFY] `pnpm test lib/editor` + `pnpm test lib/copy/es` verde.

## Phase 6 — Componentes UI (TDD, uno a la vez)

- [ ] **T6.1** [TEST] `components/editor/editor-toolbar.test.tsx`:
  - Renderiza 4 botones: Guardar, Limpiar, Re-puntuar, Exportar Markdown
  - "Limpiar" disabled cuando no hay draft persistido
  - Click Guardar llama `onSave` con el document actual
  - Click Limpiar abre modal de confirmación
  - aria-label, aria-busy, role toolbar
- [ ] **T6.2** [IMPL] `components/editor/editor-toolbar.tsx` (stateless, recibe callbacks).
- [ ] **T6.3** [TEST] `components/editor/editor-save-indicator.test.tsx`:
  - "Guardado" cuando `state="saved"`
  - "Guardando..." cuando `state="saving"`
  - "Sin guardar" cuando `state="dirty"`
  - "Error" cuando `state="error"` con mensaje
- [ ] **T6.4** [IMPL] `components/editor/editor-save-indicator.tsx`.
- [ ] **T6.5** [TEST] `components/editor/section-node.test.tsx`:
  - Renderiza label + textarea (o input según el shape de la sección)
  - `onChange` con el valor actualizado
  - Placeholder correcto por `kind`
  - WCAG: label asociado con `htmlFor`, aria-describedby con hint
- [ ] **T6.6** [IMPL] `components/editor/section-node.tsx` con 8 variantes de render (un `<textarea>` para texto libre, lista de inputs para items repetibles, etc.).
- [ ] **T6.7** [TEST] `components/editor/entity-badge.test.tsx`:
  - Badge con el value y source ('imported' verde, 'user-typed' amarillo)
  - aria-label
- [ ] **T6.8** [IMPL] `components/editor/entity-badge.tsx`.
- [ ] **T6.9** [TEST] `components/editor/limp-borrador-button.test.tsx`:
  - Click → abre modal de confirmación
  - Confirmar → llama `onConfirm`
  - Cancelar → cierra modal sin llamar
  - Modal con `role="alertdialog"`, `aria-labelledby`, `aria-describedby`
  - Disabled cuando no hay draft
- [ ] **T6.10** [IMPL] `components/editor/limp-borrador-button.tsx` (modal inline o portal).
- [ ] **T6.11** [TEST] `components/editor/editor.test.tsx` (orquestador):
  - Renderiza 8 sections
  - Estado local: `document`, `isDirty`, `saveState`
  - onChange de una section actualiza el document
  - Save llama `useDraft.save()` + actualiza saveState
  - Re-puntuar llama `requestScore(serialize(doc), jobText)` + muestra score
  - Export genera Blob + descarga via downloadBlob
  - Limpiar abre modal
  - aria-live="polite" en cambios de estado
- [ ] **T6.12** [IMPL] `components/editor/editor.tsx` con `"use client"`, state machine.
- [ ] **T6.13** [VERIFY] `pnpm test components/editor` verde.

## Phase 7 — Page + E2E

- [ ] **T7.1** [IMPL] `app/analizar/editar/page.tsx` (server component) + `app/analizar/editar/layout.tsx`.
- [ ] **T7.2** [TEST E2E] `e2e/editar.spec.ts`:
  - Cargar `/analizar/editar` → ver 8 secciones vacías (sin import)
  - Llenar Profile (fullName, email) → click Guardar → toast "Guardado"
  - Recargar → modal "¿Restaurar?" → Restaurar → ver los datos
  - Click Limpiar → modal → confirmar → ver "Sin borrador"
  - Sin borrador → botón Limpiar disabled
  - Click Re-puntuar → mockear BFF 200 → ver nuevo score
  - Click Exportar → captura el download event, filename matchea `cv-YYYY-MM-DD.md`
  - **Test de Art. III**: después de cualquier import, `localStorage.length` chequeado para claves `buildcv:draft:*`
- [ ] **T7.3** [VERIFY] `pnpm test:e2e` verde.

## Phase 8 — Pre-merge verification (6 gates)

- [ ] **T8.1** `pnpm lint` → 0 errores, 0 warnings
- [ ] **T8.2** `pnpm typecheck` → 0 errores
- [ ] **T8.3** `pnpm test` → todos verdes; coverage ≥80% en `lib/editor/` y `lib/storage/`
- [ ] **T8.4** `pnpm test:e2e` → verde
- [ ] **T8.5** `pnpm build` → 0 errores, route `/analizar/editar` compila
- [ ] **T8.6** `cd .. && bash scripts/constitution-check.sh` → 19/19 passes, 0 critical
- [ ] **T8.7** `rg "@ts-ignore|@ts-expect-error|eslint-disable|@ts-nocheck" BuildCv-web/` → 0 matches en código nuevo
- [ ] **T8.8** Smoke manual: navegar a `/analizar/editar`, llenar secciones, guardar, recargar, restaurar, limpiar.

## Phase 9 — Commit + push + documentación

- [ ] **T9.1** Conventional commit con mensaje que documente la decisión arquitectónica (Tiptap NO instalado).
- [ ] **T9.2** Push a `origin/main`.
- [ ] **T9.3** Engram: `mem_save` con sprint 4a close-out, topic_key `sdd/006-web-cv-editor/state`.
- [ ] **T9.4** Resumen técnico al user.

## Critical Path

```
T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9
```

## Out of Scope (este sprint, queda para v1)

- Tiptap v2 con 8 custom nodes ProseMirror inline (deuda técnica documentada)
- Yjs colaboración en tiempo real
- Sugerencias automáticas de skills
- Historial de versiones del borrador
- Sincronización entre dispositivos
- IndexedDbCvStore (en v0.5 usamos solo LocalStorageCvStore; si la cuota falla, mostramos el error y el editor sigue funcional en memoria)
- Zustand (en v0.5 usamos useState + useDraft hook; suficiente para 1 store)
- react-markdown + remark-gfm + remark-buildcv plugin (en v0.5 el round-trip es regex puro; menos bundle, más rápido, suficiente para el flujo)

## Risks

1. **Zod v3 dep**: 1 nueva dep. Verificar bundle size impact. Esperado: +12 KB.
2. **Texto grande de import (>50 KB)**: el spec dice max 50 KB en el score. El editor acepta cualquier tamaño, pero el score puede fallar. Mostrar mensaje honesto.
3. **Sin Vitest para Tiptap**: este sprint NO tiene Tiptap, así que no aplica. Cuando se implemente Tiptap en v1, planificar tests E2E con Playwright.
4. **Quota de localStorage en Safari privado**: localStorage tira QuotaExceededError. Mostrar mensaje honesto y ofrecer "Empezar de nuevo" (que en este caso es no-op porque no hay nada que limpiar).
5. **El import 005 deja el resultado en sessionStorage**, no en localStorage. La conexión 005→006 se hace via `sessionStorage["buildcv:editor-handoff"]`. El editor lee de ahí al mount si existe; si no, BLANK_DOCUMENT.

## Definition of Done

- Spec leída, decisión arquitectónica documentada
- Tests escritos ANTES de la impl (TDD real)
- Todos los tests verdes
- Lint + typecheck + build + e2e verdes
- Constitution check 0 crítico
- 0 supresiones, 0 mocks falsos, 0 hacks
- Smoke manual: edit + save + reload + restore + clear + re-score + export
- Commit con mensaje profesional que documente Tiptap NO instalado
- Engram actualizado
- User informado
