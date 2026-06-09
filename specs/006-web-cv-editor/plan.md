# Implementation Plan: 006-web-cv-editor — Editor estructurado de CV (8 inputs/textareas + Zod + LocalStorageCvStore)

> **Feature Branch:** `006-web-cv-editor`
> **Spec:** [./spec.md](./spec.md) · **Research:** [./research.md](./research.md) · **Data Model:** [./data-model.md](./data-model.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
> **Backend counterparts consumidos (no se modifican):** `005-cv-pdf-docx-import`, `003-adapt-ia`, `002-score-engine`.
> **Sister sub-feature:** [`../006-web-cv-diff-viewer/`](../006-web-cv-diff-viewer/) (sub-página `/analizar/diff`).
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)
>
> **⚠️ Plan vs. shipped deviation.** El plan original proponía Tiptap v2 + Zustand + idb + nanoid + react-markdown + remark + IndexedDB fallback. El shipped code REJECTÓ todas esas dependencias. Ver `tasks.md` líneas 9–24 para la decisión arquitectónica explícita. Este plan refleja el shipped code (commit 748611d).

---

## Summary

Construir el editor de CV en `/analizar/editar`, alimentado por un handoff de import (de 005, vía `sessionStorage["buildcv:editor-handoff"]`) o por texto pegado. El editor usa **8 inputs/textareas HTML nativos** (uno por sección del CV) con **estado local** mediante `useState` + `useCallback` en el componente `Editor`. La validación se hace con **Zod v3** (8 schemas + discriminated union) en el pipeline de parse, save y round-trip. El borrador persiste localmente vía el puerto **`ICvStore`** (Art. III FR-040a) con una única implementación shipped: **`LocalStorageCvStore`** (sin fallback a IndexedDB en v0.5; queda como deuda técnica). El editor re-puntúa el texto editado contra el backend `002-score-engine` (`POST /api/score`) y exporta a Markdown que `004-export-pdf` puede consumir.

**Decisiones locked (reflejando el shipped code):**

1. **Editor UI**: 8 inputs/textareas HTML nativos, uno por sección. Sin Tiptap, sin ProseMirror, sin librería de rich text.
2. **Estado**: `useState` + `useCallback` local en `components/editor/editor.tsx`. Sin Zustand, sin Context, sin store global.
3. **Validación**: Zod v3 — 8 schemas por sección (`lib/editor/schema/`) + `CvSectionSchema = z.discriminatedUnion("kind", [...])` + `CvDocumentSchema` + `DraftSchema`.
4. **Persistencia**: `ICvStore` port en `lib/storage/icv-store.ts` con única implementación `LocalStorageCvStore`. `IndexedDbCvStore` es **deuda técnica** (no se implementa en v0.5).
5. **Round-trip Markdown**: `serializeCvDocument` (en `lib/editor/markdown/serialize.ts`) y `parseCvDocument` (en `lib/editor/markdown/parse-cv.ts`) — funciones puras con parser regex hand-rolled. Sin `react-markdown`, sin `remark`, sin `remark-gfm`.
6. **IDs**: `Math.random().toString(36).slice(2, 10)` (sin `nanoid`).
7. **Testing**: Vitest 2 + RTL 16 + jsdom (sprint 0, ya configurado) — 35+ tests en `lib/editor/` y `components/editor/`. Playwright 1 chromium para E2E.
8. **Sin colaboración en tiempo real** (Yjs) en v0.5.
9. **Sin fallback a IndexedDB** en v0.5; `QuotaExceededError` se surfacea al usuario.

---

## Technical Context

| Aspecto | Decisión | Justificación |
|---|---|---|
| **Lenguaje/versión** | TypeScript ^5 strict (Next.js 16) | Estricto en `tsconfig.json`. |
| **Framework UI** | Next.js 16.2.7 + React 19.2.4 (App Router) | Stack locked del sub-proyecto. |
| **Editor UI** | 8 inputs/textareas HTML nativos | Sin dependencia externa; accesible por defecto. |
| **Validación runtime** | Zod v3 | Ecosistema maduro, inferencia de tipos estáticos, ~14 KB. |
| **Estado** | `useState` + `useCallback` local | Sin store global; 1 componente "inteligente" + 1 componente de formulario. |
| **Persistencia local** | `localStorage` (única) vía `LocalStorageCvStore` | Constitución Art. III FR-040a. |
| **Markdown** | Funciones puras con parser regex hand-rolled | Cero dependencias; <100 ms para 50 KB. |
| **IDs** | `Math.random().toString(36).slice(2, 10)` | Sin dependencia; suficiente para scope local. |
| **Testing** | Vitest 2 + RTL 16 + jsdom + Playwright 1 chromium | TDD activo (Constitution Art. VIII). |
| **Plataforma** | Web moderno (Chrome/Edge/Firefox/Safari ≥16), móvil ≥360 px | NFR-029. |

---

## Constitution Check

*GATE: Debe pasar antes de Phase 0 research. Re-check después de Phase 1 design.*

| Art. | Verificación | Estado |
|---|---|---|
| **Art. I** — Cero invención | Zod schema en el parse/serialize rechaza entidades nuevas en round-trip Markdown. `EntityRef.source: 'user-typed' \| 'imported'` trazable. | ✅ PASS |
| **Art. II** — Determinismo | El editor no calcula números. Re-score llama a `/api/score` (backend determinista). | ✅ PASS |
| **Art. III** — Privacidad | Persistencia local EXCLUSIVAMENTE en dispositivo (FR-040a). Botón "Limpiar borrador" (FR-040b). Sin envío del borrador salvo en operaciones explícitas. | ✅ PASS |
| **Art. IV** — Encuadre honesto | Copy: "Editar tu borrador", NUNCA "mejorar tu CV automáticamente" o "ATS oficial". | ✅ PASS |
| **Art. V** — Entrada como dato | El editor no ejecuta nada del texto del CV. Sin `dangerouslySetInnerHTML`. Validación Zod como gate de entrada. | ✅ PASS |
| **Art. VI** — Clean Arch / puertos | `ICvStore` es puerto frontend declarado en `lib/storage/icv-store.ts`. `LocalStorageCvStore` es la implementación shipped. | ✅ PASS |
| **Art. VII** — v0.5 sin fricción | Sin cuentas, sin guardado server-side. Límite local: ~5 MB (cuota típica `localStorage`). | ✅ PASS |
| **Art. VIII** — TDD | Vitest 2 + RTL 16 + jsdom configurados (sprint 0, commit 21fb83b). 35+ tests shipped. | ✅ PASS |
| **Art. IX** — Habeas Data | Sin cobro, sin guardado server-side. Copy honesto sobre envío a IA (gate ZDR pendiente). | ✅ PASS |

**Compliance esperado: PASS en v0.5.** La regla de editor (FR-029a) está implementada como Zod en el round-trip, no como buena intención.

---

## Project Structure

### Documentación (esta feature)

```text
BuildCv-web/specs/006-web-cv-editor/
├── plan.md                          # Este archivo
├── research.md                      # Phase 0 — histórico de evaluación
├── data-model.md                    # Phase 1 — tipos TypeScript
├── quickstart.md                    # Phase 1 — pasos para correr
├── tasks.md                         # Phase 2 — T-006-01..N (preserva bloque DECISIÓN)
└── contracts/
    └── frontend-internal.md         # Phase 1 — contratos editor ↔ storage ↔ re-score ↔ export
```

### Código fuente shipped (paths absolutos desde `BuildCv-web/`)

```text
app/
└── analizar/
    └── editar/
        └── page.tsx                 # ✅ SHIPPED — server component que monta <Editor>

components/
└── editor/
    ├── editor.tsx                   # ✅ SHIPPED — orquestador (useState + useCallback)
    ├── editor-toolbar.tsx           # ✅ SHIPPED — Guardar / Limpiar / Exportar / Re-puntuar
    ├── editor-save-indicator.tsx    # ✅ SHIPPED — "Guardado hace X seg" / "Guardando..."
    ├── section-node.tsx             # ✅ SHIPPED — render visual de cada sección (8 secciones)
    ├── entity-badge.tsx             # ✅ SHIPPED — badge inline para EntityRef
    └── limp-borrador-button.tsx     # ✅ SHIPPED — botón con modal de confirmación (Art. III)

lib/
├── editor/
│   ├── types.ts                     # ✅ SHIPPED — CvDocument, CvSection, EntityRef, Draft
│   ├── schema/                      # ✅ SHIPPED — 8 Zod schemas + discriminated union
│   │   ├── profile.ts
│   │   ├── experience.ts
│   │   ├── education.ts
│   │   ├── skills.ts
│   │   ├── projects.ts
│   │   ├── certifications.ts
│   │   ├── languages.ts
│   │   ├── other.ts
│   │   └── index.ts                 # CvSectionSchema (discriminatedUnion), CvDocumentSchema, DraftSchema, BLANK_DOCUMENT
│   ├── markdown/                    # ✅ SHIPPED — round-trip con parser regex
│   │   ├── serialize.ts             # CvDocument → Markdown
│   │   ├── parse.ts                 # Markdown → CvDocument (regex hand-rolled)
│   │   ├── parse-cv.ts              # parseCvDocument() (entry point público)
│   │   ├── roundtrip.ts             # validación del round-trip con Zod
│   │   ├── errors.ts                # RoundTripMismatchError
│   │   └── parse.test.ts, serialize.test.ts, roundtrip.test.ts
│   ├── use-draft.ts                 # ✅ SHIPPED — hook React para LocalStorageCvStore
│   └── errors.ts                    # ✅ SHIPPED — RoundTripMismatchError, etc.

├── storage/
│   ├── icv-store.ts                 # ✅ SHIPPED — ICvStore + LocalStorageCvStore + QuotaExceededError + DraftNotFoundError
│   ├── errors.ts                    # ✅ SHIPPED — QuotaExceededError, DraftNotFoundError
│   ├── index.ts                     # ✅ SHIPPED — getCvStore() (devuelve LocalStorageCvStore)
│   ├── icv-store.test.ts            # ✅ SHIPPED — 12+ tests del store
│   └── index.test.ts                # ✅ SHIPPED — 6+ tests del factory

├── api/
│   ├── types.ts                     # tipos compartidos (ScoreResponse, EntityInvention, etc.)
│   ├── score.ts                     # requestScore(cvText, jobText) — reusado por re-score
│   └── export.ts                    # downloadBlob() — usado por "Exportar Markdown"

└── copy/
    └── es.ts                        # copy en español (bloque editor.*)

app/api/                              # BFF ya cubre score/adapt/import; no se necesita BFF nuevo
```

**Total shipped**: ~2 000 líneas de código + 35+ tests (sin contar tests E2E que están en `e2e/`).

---

## Decisiones de arquitectura (locked — shipped)

### 1. Editor: 8 inputs/textareas nativos (en `components/editor/editor.tsx`)

El editor se implementa como un componente `"use client"` de React 19 con:

- **`useState<CvDocument>`**: el documento completo en memoria.
- **`useState<string>`**: el `jobText` (vacante).
- **`useState<boolean>`**: `isDirty`, `isRescoring`, `hydrated`.
- **`useState<ScoreResponse | null>`**: el último resultado de re-score.
- **`useState<string | null>`**: `errorMsg` para toasts.
- **`useCallback`** para handlers: `updateSection`, `onSave`, `onClear`, `onRescore`, `onExportMd`.
- **`useMemo`** para `orderedSections` (ordena las 8 secciones canónicas).
- **`useDraft`** hook (en `lib/editor/use-draft.ts`) que envuelve `LocalStorageCvStore` con su propio `useState` interno.

**Render**:

```tsx
<section>
  <EditorSaveIndicator state={...} errorMessage={...} />
  <EditorToolbar onSave={...} onClear={...} onRescore={...} onExportMd={...} />
  <fieldset>
    <legend>Vacante</legend>
    <textarea value={jobText} onChange={...} />
  </fieldset>
  <div>
    {orderedSections.map((s) => <SectionNode key={s.id} section={s} onChange={updateSection} />)}
  </div>
  {score && <output>{copy.editor.toasts.rescoreSuccess} — {score.overallScore} ({score.band})</output>}
</section>
```

`SectionNode` (en `section-node.tsx`) renderiza la UI específica de cada `kind` con inputs/textareas nativos. Las 8 secciones se ordenan canónicamente en `SECTION_ORDER` (`profile`, `experience`, `education`, `skills`, `projects`, `certifications`, `languages`, `other`).

**Justificación**: ver `tasks.md` líneas 9–24. Cero dependencias, accesible por defecto, tests simples, mismo Constitution compliance.

### 2. Puerto `ICvStore` con única implementación `LocalStorageCvStore` (en `lib/storage/icv-store.ts`)

```typescript
export interface ICvStore {
  save(draft: Draft): Promise<void>;
  load(id: string): Promise<Draft | null>;
  list(): Promise<ReadonlyArray<DraftSummary>>;
  clear(id: string): Promise<void>;
  clearAll(): Promise<void>;
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void;
}

export class LocalStorageCvStore implements ICvStore {
  private readonly prefix = "buildcv:draft:";
  // save → valida con DraftSchema, JSON.stringify, localStorage.setItem
  // load → JSON.parse, safeParse con DraftSchema, devuelve Draft | null
  // list → itera localStorage, filtra por prefix, devuelve DraftSummary[]
  // clear → localStorage.removeItem
  // onQuotaExceeded → array de handlers, invoca si DOMException.name === "QuotaExceededError"
}
```

**Factory (`lib/storage/index.ts`)**:

```typescript
export async function getCvStore(): Promise<ICvStore> {
  if (cached) return cached;
  const candidate = new LocalStorageCvStore();
  if (isLocalStorageAvailable()) {
    cached = candidate;
    return cached;
  }
  throw new Error("LocalStorage unavailable");
}
```

**`IndexedDbCvStore` queda como deuda técnica para v1** (no se implementa en v0.5). La interfaz `ICvStore` está diseñada para aceptar una segunda implementación sin cambios en `useDraft` ni en `Editor`.

### 3. Estado local con `useState` + `useCallback`

No hay store global. El componente `Editor` es el único "inteligente"; los hijos (`SectionNode`, `EditorToolbar`, etc.) son presentacionales. La comunicación es **props hacia abajo** + `onChange`/`onClick` hacia arriba.

**Justificación**: el editor tiene UN documento y UN jobText. No hay estado compartido entre múltiples árboles de componentes que justifique un store. `useDraft` ya encapsula el ciclo de vida del `Draft` persistido.

### 4. Round-trip Markdown con parser regex hand-rolled (en `lib/editor/markdown/`)

- **`serializeCvDocument(doc: CvDocument): string`** — itera las 8 secciones en orden canónico, emite heading `## <Sección>` + contenido. Se omiten secciones vacías.
- **`parseCvDocument(md: string, ctx?: ParseContext): CvDocument`** — parser regex en `parse-cv.ts` que reconoce:
  - Headings `## Perfil` / `## Experiencia` / etc. → mapea al `kind` correspondiente.
  - Bullets `- item` → arrays de strings.
  - Fechas `YYYY-MM` o `YYYY`.
  - Niveles de idioma `A1`..`C2` / `Native`.
- **`roundtrip(doc, ctx)`** — `parse(serialize(doc))` debe pasar `DraftSchema.safeParse`. Si falla, lanza `RoundTripMismatchError`.

**Validación Zod como gate** (Constitution Art. I FR-029a): después del parse, `CvDocumentSchema.safeParse` rechaza entidades nuevas (campos con `max(...)` length, enums cerrados, regex para fechas/versiones, etc.).

**Justificación del parser regex** sobre `remark`/`react-markdown`:
- Cero dependencias (Tiptap, Zustand, idb, nanoid, react-markdown, remark, remark-gfm todas rechazadas; ver `tasks.md`).
- Sintaxis del CV es limitada (8 secciones fijas) — no necesita full CommonMark.
- ~100 ms para 50 KB; suficiente para NFR-030.
- Tests deterministas: input → output conocido.

### 5. Hooks

**`useDraft()`** (en `lib/editor/use-draft.ts`):

```typescript
export function useDraft(): UseDraftResult {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => { /* getCvStore().load("default") */ }, []);
  const save = useCallback(async (next: Draft) => { /* getCvStore().save(next) */ }, []);
  const clear = useCallback(async () => { /* getCvStore().clear("default") */ }, []);

  useEffect(() => { void load(); }, [load]);

  return { draft, isLoading, isSaving, error, save, clear, reload: load };
}
```

### 6. Re-puntuar (`lib/api/score.ts`)

`requestScore(cvText, jobText)` ya existe (de la feature 002). Se reusa tal cual. El editor:

1. Serializa el `CvDocument` a Markdown (`serializeCvDocument(document)`).
2. Llama `requestScore(md, jobText)`.
3. Renderiza el `ScoreResponse` en un `<output aria-live="polite">`.

**Rate-limit**: el backend aplica 60/h por IP (política `"score"`). Si retorna 429, la UI muestra el mensaje honesto de 002/003 ("Has alcanzado el tope…").

### 7. Export a Markdown

`onExportMd` en `editor.tsx`:

```typescript
const onExportMd = useCallback(() => {
  const md = serializeCvDocument(document);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const today = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `cv-${today}.md`);
}, [document]);
```

`downloadBlob` está en `lib/api/export.ts`.

---

## Files shipped (resumen)

| Path | Líneas (aprox.) | Exports principales |
|---|---|---|
| `app/analizar/editar/page.tsx` | 20 | Server component que monta `<Editor>` |
| `components/editor/editor.tsx` | 380 | `Editor` (orquestador) |
| `components/editor/editor-toolbar.tsx` | 80 | `EditorToolbar` |
| `components/editor/editor-save-indicator.tsx` | 40 | `EditorSaveIndicator`, `EditorSaveState` |
| `components/editor/section-node.tsx` | 580 | `SectionNode` (8 ramas por `kind`) |
| `components/editor/entity-badge.tsx` | 30 | `EntityBadge` |
| `components/editor/limp-borrador-button.tsx` | 80 | `LimpBorradorButton` (modal de confirmación) |
| `lib/editor/types.ts` | 180 | `CvDocument`, `CvSection` (8), `EntityRef`, `Draft` |
| `lib/editor/schema/{8 archivos}.ts` + `index.ts` | 30 c/u | `ProfileSectionSchema`...`OtherSectionSchema` + `CvSectionSchema` + `CvDocumentSchema` + `DraftSchema` + `BLANK_DOCUMENT` |
| `lib/editor/markdown/serialize.ts` | 200 | `serializeCvDocument` |
| `lib/editor/markdown/parse-cv.ts` | 500 | `parseCvDocument` (regex hand-rolled) |
| `lib/editor/markdown/parse.ts` | 80 | helpers de parse por sección |
| `lib/editor/markdown/roundtrip.ts` | 80 | `roundtrip` (parse ∘ serialize con validación Zod) |
| `lib/editor/use-draft.ts` | 75 | `useDraft` hook |
| `lib/editor/errors.ts` | 30 | `RoundTripMismatchError` |
| `lib/storage/icv-store.ts` | 140 | `ICvStore`, `LocalStorageCvStore` |
| `lib/storage/index.ts` | 40 | `getCvStore`, `BLANK_DOCUMENT` |
| `lib/storage/errors.ts` | 30 | `QuotaExceededError`, `DraftNotFoundError` |

**Total**: ~2 500 líneas de código shipped + 35+ tests unit/integración.

---

## Dependencias añadidas (`pnpm add`)

**SÓLO UNA dep nueva** para 006a:

```bash
pnpm add zod
```

Las demás dependencias (Vitest, RTL, jsdom, Playwright) ya estaban instaladas por sprint 0 (commit 21fb83b).

**Verificación previa a `pnpm add`**: `pnpm-lock.yaml` no debe romperse. CI corre `pnpm install --frozen-lockfile`.

---

## Routing

- **`/analizar/editar`**: página principal del editor. Server component que monta el client component `Editor`.
- **`/analizar/editar?job=...`**: query param opcional con la vacante (URL-friendly, NO PII).
- **No se crea `/analizar/diff` en esta feature**: vive en la sub-feature 006b (diff viewer).

---

## State management

**Decisión shipped: `useState` + `useCallback` local en el componente `Editor`.**

No hay store global. El estado del editor se divide en:

- **Componente `Editor`** (`components/editor/editor.tsx`):
  - `document: CvDocument` — el documento completo.
  - `jobText: string` — la vacante.
  - `isDirty: boolean` — si hay cambios sin guardar.
  - `isRescoring: boolean` — durante un re-score.
  - `score: ScoreResponse | null` — último re-score.
  - `errorMsg: string | null` — mensaje de error para toast.
  - `hydrated: boolean` — si ya se cargó el draft de localStorage.
- **Hook `useDraft()`** (`lib/editor/use-draft.ts`):
  - `draft: Draft | null` — el draft persistido.
  - `isLoading: boolean`, `isSaving: boolean`, `error: Error | null`.

**Justificación**: el editor tiene UN documento y UN jobText. No hay múltiples vistas que necesiten sincronización. `useState` local es más simple, más testeable, y suficiente.

---

## Test plan (TDD activo, Constitution Art. VIII)

### Tests automatizados (35+ shipped)

- **Unit (`lib/editor/`)**:
  - `types.test.ts` — shape de los 8 tipos de sección, `CvDocument`, `EntityRef`, `Draft`.
  - `schema/{section}.test.ts` (8 archivos) — cada Zod schema rechaza campos faltantes, tipos incorrectos, longitudes fuera de rango.
  - `schema/index.test.ts` — `CvSectionSchema` y `CvDocumentSchema` discriminated union, max constraints.
  - `markdown/parse.test.ts` — parser regex, 8 secciones, edge cases.
  - `markdown/serialize.test.ts` — output determinista, omite secciones vacías.
  - `markdown/roundtrip.test.ts` — `parse ∘ serialize` preserva el documento, Zod valida.
  - `use-draft.test.ts` — hook de persistencia.
  - `storage/icv-store.test.ts` (12+ tests) — `LocalStorageCvStore.save/load/list/clear/clearAll/onQuotaExceeded`.
  - `storage/index.test.ts` (6+ tests) — `getCvStore` factory, probe de disponibilidad.
- **Component (`components/editor/`)**:
  - `editor.test.tsx` — render de 8 secciones, `onSave`/`onClear`/`onRescore`/`onExportMd` callbacks.
  - `editor-toolbar.test.tsx` — deshabilitar botones según `isSaving`/`isRescoring`/`isError`.
  - `editor-save-indicator.test.tsx` — 4 estados: `dirty`/`saving`/`saved`/`error`.
  - `section-node.test.tsx` — 8 ramas según `kind`.
  - `entity-badge.test.tsx` — badge inline con `aria-label`.
  - `limp-borrador-button.test.tsx` — modal de confirmación, `onClear` solo tras confirmar.

### Tests E2E (Playwright 1 chromium)

- `e2e/editor.spec.ts` — flujo import → editar → guardar → recargar → restaurar → limpiar (cuando se cree en sprint futuro).

### CI ground truth

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
pnpm test                       # vitest run → 710 tests passing
pnpm test:e2e                   # playwright test → si existe
```

---

## Risks y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `localStorage` >5 MB | Media | Medio | `QuotaExceededError` se surfacea al usuario con toast rojo; v1 agrega `IndexedDbCvStore`. |
| `localStorage` no disponible (modo privado Safari) | Baja | Medio | `getCvStore` lanza `Error("LocalStorage unavailable")`; el editor muestra toast y permite trabajar en memoria (no persiste). |
| Parser regex no cubre edge cases del Markdown del import | Media | Bajo | Tests con golden CVs; 005 ya normaliza el texto antes de pasarlo al editor. |
| Bundle de `serializeCvDocument` + parser regex | Baja | Bajo | ~5 KB total; aceptable. |
| 8 inputs/textareas no escalan a >8 secciones | Baja | Bajo | `SECTION_ORDER` es fijo; agregar secciones = bump MAYOR de `CvDocument.version`. |

---

## Next Phase

→ `tasks.md` — desglose T-006-01..N por fase (Setup, Foundational, US-1..5, Polish). El bloque "DECISIÓN ARQUITECTÓNICA EXPLÍCITA" (líneas 9–24) está preservado verbatim.
