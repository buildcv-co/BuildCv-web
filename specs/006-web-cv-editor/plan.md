# Implementation Plan: 006-web-cv-editor — Editor estructurado de CV (Tiptap + Zod + persistencia local)

> **Feature Branch:** `006-web-cv-editor`
> **Spec:** [./spec.md](./spec.md) · **Research:** [./research.md](./research.md) · **Data Model:** [./data-model.md](./data-model.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
> **Backend counterparts consumidos (no se modifican):** `005-cv-pdf-docx-import`, `003-adapt-ia`, `002-score-engine`.
> **Sister sub-feature:** [`../006-web-cv-diff-viewer/`](../006-web-cv-diff-viewer/) (sub-página `/analizar/diff`).
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)

---

## Summary

Construir el editor de CV en `/analizar/editar`, alimentado por un `ImportResult` (de 005) o por texto pegado. El editor usa **Tiptap v2** con **8 custom nodes** (uno por sección del CV) y validación **Zod** en el pipeline de parse/serialize. El borrador persiste localmente vía el puerto **`ICvStore`** (Art. III v1.1.0) con dos adapters: `LocalStorageCvStore` (default) y `IndexedDbCvStore` (fallback >4 MB). El editor re-puntúa el texto editado contra el backend `002-score-engine` y exporta a Markdown que `004-export-pdf` puede consumir.

**Decisiones locked** (detalle en `research.md`):

1. **Editor**: Tiptap v2 (rechazados: Slate, Lexical, Quill, ProseMirror directo).
2. **Validación**: Zod v3 (rechazados: Yup, io-ts, Valibot).
3. **Persistencia**: `ICvStore` port con `LocalStorageCvStore` (default) + `IndexedDbCvStore` (fallback) usando `idb`.
4. **Estado global**: Zustand con `persist` middleware (rechazado: Redux Toolkit, React Context puro, Jotai).
5. **Round-trip Markdown**: `remark` + plugin custom con un walker que mapea nodos Tiptap ↔ MDAST (rechazado: parser hand-rolled, `remark-parse` directo sin customización).
6. **Sin colaboración en tiempo real** (Yjs) en v0.5.

---

## Technical Context

| Aspecto | Decisión | Justificación |
|---|---|---|
| **Lenguaje/versión** | TypeScript ^5 strict (Next.js 16) | Estricto en `tsconfig.json`. |
| **Framework UI** | Next.js 16.2.7 + React 19.2.4 (App Router) | Stack locked del sub-proyecto. |
| **Editor library** | Tiptap v2 (MIT) + `@tiptap/extension-placeholder` | Headless, schema-driven, MIT, React 19 compatible. |
| **Validación runtime** | Zod v3 | Ecosistema maduro, inferencia de tipos estáticos, ~14 KB. |
| **Persistencia local** | `localStorage` (default) + `idb` (IndexedDB fallback) | Constitución Art. III v1.1.0. |
| **Markdown** | `react-markdown` + `remark-gfm` + plugin custom `remark-buildcv` | Render del preview y del export. |
| **Estado global** | Zustand v4 con `persist` middleware | ~1 KB, sin boilerplate, integración nativa con React 19. |
| **IDs** | `nanoid` v5 | 21 chars URL-safe, crypto-seguro. |
| **Testing** | Manual e2e checklist (Vitest en M3+) | Sin framework instalado en v0.5. |
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
| **Art. VI** — Clean Arch / puertos | `ICvStore` es puerto frontend declarado en `lib/storage/`. Implementaciones intercambiables. | ✅ PASS |
| **Art. VII** — v0.5 sin fricción | Sin cuentas, sin guardado server-side. Límite local: 4 MB localStorage, quota IndexedDB para más. | ✅ PASS |
| **Art. VIII** — TDD | No aplica directamente (frontend sin framework de tests en v0.5); se reemplaza por checklist E2E manual. Vitest llega en M3+. | ⚠️ N/A en v0.5, requerido en v1 |
| **Art. IX** — Habeas Data | Sin cobro, sin guardado server-side. Copy honesto sobre envío a IA (gate ZDR pendiente). | ✅ PASS |

**Compliance esperado: PASS** en v0.5. La regla de editor (FR-029a) está implementada como Zod en el pipeline, no como buena intención.

---

## Project Structure

### Documentación (esta feature)

```text
BuildCv-web/specs/006-web-cv-editor/
├── plan.md                          # Este archivo
├── research.md                      # Phase 0 — comparativa editores/validadores/storage
├── data-model.md                    # Phase 1 — tipos TypeScript
├── quickstart.md                    # Phase 1 — pasos para correr
├── tasks.md                         # Phase 2 — T-006-01..N
└── contracts/
    └── frontend-internal.md         # Phase 1 — contratos editor ↔ storage ↔ re-score ↔ export
```

### Código fuente (paths absolutos desde `BuildCv-web/`)

```text
app/
├── analizar/
│   ├── page.tsx                     # Ya existe — flujo de análisis (sin cambios)
│   └── editar/
│       ├── page.tsx                 # 🆕 Página principal del editor
│       └── layout.tsx               # 🆕 Layout con toolbar persistente

components/
├── editor/
│   ├── editor.tsx                   # 🆕 Orquestador Tiptap
│   ├── editor-toolbar.tsx           # 🆕 Toolbar con Guardar / Limpiar / Exportar / Re-puntuar
│   ├── editor-save-indicator.tsx    # 🆕 "Guardado hace X seg" / "Guardando..."
│   ├── section-node.tsx             # 🆕 Custom node wrapper para cada sección
│   ├── entity-badge.tsx             # 🆕 Badge inline para EntityRef
│   └── limp-borrador-button.tsx     # 🆕 Botón con modal de confirmación (Art. III FR-040b)
└── diff/                            # 🆕 Sub-componentes del viewer (006b)
    ├── diff-view.tsx
    ├── diff-toolbar.tsx
    ├── flagged-entity-badge.tsx
    └── action-footer.tsx

lib/
├── editor/
│   ├── extensions/                  # 🆕 8 custom nodes de Tiptap
│   │   ├── profile-node.ts
│   │   ├── experience-node.ts
│   │   ├── education-node.ts
│   │   ├── skills-node.ts
│   │   ├── projects-node.ts
│   │   ├── certifications-node.ts
│   │   ├── languages-node.ts
│   │   ├── other-node.ts
│   │   └── index.ts                 # Bundle de extensiones
│   ├── schema/                      # 🆕 Zod schemas de las 8 secciones
│   │   ├── profile.ts
│   │   ├── experience.ts
│   │   ├── education.ts
│   │   ├── skills.ts
│   │   ├── projects.ts
│   │   ├── certifications.ts
│   │   ├── languages.ts
│   │   ├── other.ts
│   │   └── index.ts
│   ├── markdown/
│   │   ├── serialize.ts             # 🆕 CvDocument → Markdown
│   │   ├── parse.ts                 # 🆕 Markdown → CvDocument
│   │   └── remark-buildcv.ts        # 🆕 Plugin remark custom
│   ├── roundtrip.ts                 # 🆕 Validación Zod del round-trip
│   ├── use-draft.ts                 # 🆕 Hook React para CvStore
│   ├── use-cv-document.ts           # 🆕 Hook que envuelve useEditor + persistencia
│   └── types.ts                     # 🆕 CvDocument, CvSection, EntityRef, Draft
├── storage/
│   ├── icv-store.ts                 # 🆕 Puerto (interface)
│   ├── local-storage-cv-store.ts    # 🆕 Adapter default
│   ├── indexed-db-cv-store.ts       # 🆕 Adapter fallback (>4 MB)
│   └── index.ts                     # 🆕 Factory: elige adapter según cuota
├── api/
│   ├── types.ts                     # ⚠️ EXTENDER — añadir Zod schemas del editor
│   ├── score.ts                     # ⚠️ EXTENDER — `requestScore(cvText, jobText)` ya existe
│   ├── import.ts                    # ⚠️ USAR — `getEditorHandoff()` de 005
│   └── editor-handoff.ts            # 🆕 Handoff desde 005 al editor
└── copy/
    └── es.ts                        # ⚠️ EXTENDER — añadir bloque `EDITOR_COPY`

app/api/                              # ⚠️ BFF ya cubre score/adapt/import; no se necesita BFF nuevo
```

**Decisión de estructura**: single web project con `components/editor/` agrupando los 8 custom nodes en `lib/editor/extensions/`. Esto evita fragmentar la feature y mantiene la convención de `kebab-case.tsx` del proyecto.

---

## Decisiones de arquitectura (locked)

### 1. Tiptap + 8 custom nodes (en `lib/editor/extensions/`)

Cada custom node es un `Node` de ProseMirror con:

- **`group`**: `'block'`.
- **`content`**: `'block+'` (al menos un bloque adentro, ej. párrafo, lista).
- **`attrs`**: `{ id: string, source: 'imported' | 'user-typed', createdAt: string }`.
- **`parseDOM`**: regla para reconocer el bloque desde HTML/Markdown.
- **`toDOM`**: emite un `<section data-cv-section="...">` con `<h2>` interno.

El bundle `lib/editor/extensions/index.ts` exporta un array de 8 nodos que se pasa a `useEditor({ extensions: [StarterKit, ...cvNodes] })`.

**Justificación**: schema-driven permite validar en el `appendTransaction` de ProseMirror (defense in depth: si el usuario inserta HTML "crudo" con `insertContent`, ProseMirror aplica el schema y rechaza nodos inválidos). Zod se aplica en el parse/serialize Markdown (segunda capa).

### 2. `ICvStore` port (en `lib/storage/`)

```typescript
// lib/storage/icv-store.ts
export interface ICvStore {
  save(draft: Draft): Promise<void>;
  load(id?: string): Promise<Draft | null>;
  list(): Promise<DraftSummary[]>;
  clear(id?: string): Promise<void>;
  onQuotaExceeded(handler: (err: QuotaExceededError) => void): () => void;
}
```

**Adapter default (`LocalStorageCvStore`)**: serializa `Draft` a JSON, lo guarda bajo la clave `buildcv:draft:default`. Si `setItem` lanza `QuotaExceededError`, el factory switchea automáticamente a `IndexedDbCvStore`.

**Adapter fallback (`IndexedDbCvStore`)**: usa `idb` para crear un object store `drafts` en la DB `buildcv-drafts`. Guarda el `Draft` completo (sin serializar, IndexedDB structured clone).

**Factory (`lib/storage/index.ts`)**: detecta cuota disponible y elige adapter. Si `localStorage` ya tiene un draft que cabe, lo lee. Si no, intenta IndexedDB. Si ambos fallan, lanza `StorageUnavailableError` que la UI atrapa y muestra como toast rojo.

### 3. Estado global con Zustand

`useCvDocumentStore` (en `lib/editor/use-cv-document.ts`) usa Zustand v4 con `persist` middleware. El `persist` middleware escribe a un `ICvStore` (no a localStorage directo) para mantener la abstracción del puerto.

**Justificación de Zustand sobre Redux Toolkit**: ~1 KB, sin boilerplate, sin providers, integración nativa con React 19. RTK sería sobre-ingeniería para 1 store. Context puro causaría re-renders innecesarios en cada keystroke. Jotai es comparable pero con modelo atómico que no aporta valor aquí (tenemos UN documento, no átomos).

### 4. Round-trip Markdown (en `lib/editor/markdown/`)

**Plugin remark custom (`remark-buildcv.ts`)**: visita el AST MDAST y:
- `heading[depth=1]`: marca el inicio de un nodo sección (lee el `data.section` del heading).
- Cualquier bloque entre dos headings pertenece a la sección anterior.
- Convierte listas `- item` en arrays de strings dentro de `EntityRef[]`.

**Serializer (`serialize.ts`)**: `CvDocument` → MDAST → Markdown. Itera sobre las 8 secciones en orden, emite heading + contenido.

**Parser (`parse.ts`)**: Markdown → MDAST → `CvDocument`. Usa `unified()` + `remark-parse` + plugin custom + `remark-stringify`.

**Round-trip validation (`roundtrip.ts`)**: `parse(serialize(doc))` debe ser estructuralmente equivalente a `doc` (mismas secciones, mismas `EntityRef` por id). Si no, lanza `RoundTripMismatchError`.

**Rechazo de entidades nuevas**: la función `parse()` recibe un `originalEntities: Set<string>` (los tokens del `ImportResult.text`). Si un nodo nuevo contiene un token que NO está en `originalEntities` Y NO fue tipeado por el usuario (trackeado por `EntityRef.source === 'user-typed'`), el parser lanza `EntityNotAllowedError`.

### 5. Re-puntuar (`lib/api/score.ts`)

`requestScore(cvText, jobText)` ya existe. Se reusa tal cual. El editor:
1. Serializa el `CvDocument` a Markdown.
2. Llama `requestScore(md, jobText)`.
3. Renderiza el `ScoreResult` en `ScoreBadge` con animación de delta.

**Rate-limit**: el backend aplica 60/h por IP (política `"score"`). Si retorna 429, la UI muestra el mensaje honesto de 002/003 ("Has alcanzado el tope…").

### 6. Export a Markdown (`lib/editor/markdown/serialize.ts`)

La misma función `serialize()` se reusa. El botón "Exportar Markdown" crea un `Blob` con `text/markdown` y dispara descarga via `URL.createObjectURL` + `<a download>`.

---

## Files a create (resumen)

| Path | Propósito |
|---|---|
| `app/analizar/editar/page.tsx` | Página principal del editor |
| `app/analizar/editar/layout.tsx` | Layout con toolbar |
| `components/editor/editor.tsx` | Orquestador Tiptap |
| `components/editor/editor-toolbar.tsx` | Toolbar (Guardar, Limpiar, Exportar, Re-puntuar) |
| `components/editor/editor-save-indicator.tsx` | Indicador "Guardado hace X seg" |
| `components/editor/section-node.tsx` | Render visual de cada sección |
| `components/editor/entity-badge.tsx` | Badge inline para `EntityRef` |
| `components/editor/limp-borrador-button.tsx` | Botón con modal de confirmación |
| `lib/editor/extensions/{8 nodos}` | Custom nodes Tiptap |
| `lib/editor/schema/{8 schemas}` | Zod schemas de las secciones |
| `lib/editor/markdown/{serialize,parse,remark-buildcv}.ts` | Round-trip Markdown |
| `lib/editor/roundtrip.ts` | Validación del round-trip |
| `lib/editor/use-draft.ts` | Hook React para `ICvStore` |
| `lib/editor/use-cv-document.ts` | Hook que envuelve `useEditor` + persistencia |
| `lib/editor/types.ts` | Tipos centrales |
| `lib/storage/icv-store.ts` | Puerto |
| `lib/storage/local-storage-cv-store.ts` | Adapter default |
| `lib/storage/indexed-db-cv-store.ts` | Adapter fallback |
| `lib/storage/index.ts` | Factory |
| `lib/api/editor-handoff.ts` | Handoff desde 005 |
| `lib/copy/es.ts` (extender) | Bloque `EDITOR_COPY` |

## Dependencias a añadir (`pnpm add`)

```bash
pnpm add @tiptap/react@^2 @tiptap/pm@^2 @tiptap/starter-kit@^2 \
         @tiptap/extension-placeholder@^2 \
         zod@^3 idb@^8 nanoid@^5 \
         zustand@^4 \
         react-markdown@^9 remark-gfm@^4
```

**Verificación previa a `pnpm add`**: `pnpm-lock.yaml` no debe romperse. Si lo hace, ajustar versiones hasta que `pnpm install --frozen-lockfile` pase en CI.

---

## Routing

- **`/analizar/editar`**: página principal del editor (server component que renderiza client component).
- **`/analizar/editar?traceId=...`**: trae el `ImportResult` desde `sessionStorage` y lo pre-pobla.
- **No se crea `/analizar/diff` en esta feature**: vive en la sub-feature 006b (diff viewer).

---

## State management

**Decisión locked: Zustand v4 con `persist` middleware custom**.

```typescript
// lib/editor/use-cv-document.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { icvStore } from "@/lib/storage";

interface CvDocumentState {
  document: CvDocument | null;
  jobText: string;
  setDocument: (doc: CvDocument) => void;
  setJobText: (text: string) => void;
  reset: () => void;
  save: () => Promise<void>;
  load: () => Promise<void>;
}

export const useCvDocumentStore = create<CvDocumentState>()(
  persist(
    (set, get) => ({
      document: null,
      jobText: "",
      setDocument: (doc) => set({ document: doc }),
      setJobText: (text) => set({ jobText: text }),
      reset: () => set({ document: null, jobText: "" }),
      save: async () => {
        const draft: Draft = {
          id: "default",
          document: get().document,
          jobText: get().jobText,
          scoreHistory: [],
          lastSavedAt: new Date().toISOString(),
          engineVersions: { editor: "0.5.0", score: "1.0.0" },
        };
        await icvStore.save(draft);
      },
      load: async () => {
        const draft = await icvStore.load("default");
        if (draft) {
          set({ document: draft.document, jobText: draft.jobText });
        }
      },
    }),
    {
      name: "buildcv:draft:default",
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const draft = await icvStore.load("default");
          return draft ? JSON.stringify({ state: draft }) : null;
        },
        setItem: async (name, value) => {
          const parsed = JSON.parse(value);
          await icvStore.save(parsed.state);
        },
        removeItem: async (name) => {
          await icvStore.clear("default");
        },
      })),
    },
  ),
);
```

**Justificación**: `persist` middleware de Zustand soporta `Storage` arbitrario (no solo `localStorage`). Inyectamos un `Storage` que envuelve `ICvStore`. El componente `Editor` llama `useCvDocumentStore.getState().save()` en cada blur del toolbar (no en cada keystroke para evitar overhead).

---

## Test plan

**Sin framework automatizado en v0.5**. Plan: **checklist E2E manual + assertions runtime via Zod**.

### Checklist E2E manual (a ejecutar antes de cerrar la feature)

- [ ] **Happy path — import + edit + save + reload + restore**
  1. `pnpm dev`, ir a `/importar`, subir un PDF de 2 páginas.
  2. Click "Usar este texto en el editor" → llega a `/analizar/editar` con el `ImportResult` pre-poblado.
  3. Editar la sección `Skills`, agregar "Kubernetes" (texto nuevo).
  4. Click "Guardar borrador" → indicador "Guardado".
  5. Recargar la página (F5) → aparece modal "Tienes un borrador sin guardar. ¿Restaurarlo?".
  6. Click "Restaurar" → el editor abre con "Kubernetes" presente.
- [ ] **Round-trip Markdown preserva entities**
  1. Con el editor abierto, abrir DevTools → Console.
  2. Ejecutar `__editor_test.roundtrip()` (helper expuesto en dev).
  3. Verificar que retorna `success: true` y que `entityCount.before === entityCount.after`.
- [ ] **Zod rechaza entidades nuevas (defense in depth)**
  1. Con el editor abierto, abrir DevTools → Console.
  2. Ejecutar `__editor_test.injectForbiddenEntity("FakeCorp")` (helper de dev que simula inyección).
  3. Verificar que lanza `EntityNotAllowedError` con el mensaje "ENTITY_NOT_ALLOWED".
- [ ] **Limpiar borrador**
  1. Con borrador persistido, click "Limpiar borrador" → modal de confirmación.
  2. Confirmar → toast "Borrador eliminado".
  3. DevTools → Application → Local Storage: `buildcv:draft:default` no existe.
  4. DevTools → Application → IndexedDB → `buildcv-drafts`: object store `drafts` vacío.
- [ ] **Re-puntuar**
  1. Con un CV editado, click "Re-puntuar".
  2. Spinner <3 s, llega `ScoreResult`.
  3. Delta visible: "Antes: 62 → Ahora: 78 (+16)".
- [ ] **Exportar Markdown**
  1. Click "Exportar Markdown" → descarga `cv-2026-06-08.md`.
  2. Abrir el `.md` → 8 secciones en orden, contenido íntegro, sin headings vacíos.
- [ ] **WCAG 2.2 AA**
  1. Navegar con `Tab` por toda la UI → focus visible, orden lógico.
  2. Activar VoiceOver (macOS) o NVDA (Windows) → anuncia cada sección, cada botón, cada cambio de estado.
  3. Lighthouse audit → score a11y ≥95.
- [ ] **Rate-limit del score**
  1. Provocar 60+ re-puntuaciones en 1 h → recibir mensaje honesto de 429.

### Tests runtime via Zod (en `lib/editor/roundtrip.ts`)

```typescript
// Esta función corre en el dev server, no en producción.
if (process.env.NODE_ENV === "development") {
  (window as any).__editor_test = {
    roundtrip: async () => {
      const doc = useCvDocumentStore.getState().document;
      if (!doc) return { success: false, reason: "no document" };
      try {
        const md = serializeCvDocument(doc);
        const parsed = parseCvDocument(md, { originalEntities: extractEntities(doc) });
        const same = deepEqual(doc, parsed);
        return { success: same, entityCount: { before: countEntities(doc), after: countEntities(parsed) } };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    injectForbiddenEntity: (token: string) => {
      const doc = useCvDocumentStore.getState().document;
      if (!doc) return;
      doc.experience.entities.push({ id: nanoid(), value: token, source: "user-typed", confidence: "high" });
      useCvDocumentStore.getState().setDocument(doc);
    },
  };
}
```

### Tests automatizados (futuro, M3+)

- Vitest + React Testing Library + `@testing-library/user-event`.
- Cobertura objetivo: ≥80% en `lib/editor/` y `lib/storage/`.
- Tests de contrato: snapshot del round-trip con CVs golden (mismos casos que 003).

---

## Risks y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Tiptap añade ~50 KB al bundle | Alta | Medio | Tree-shaking con imports nombrados. Verificar con `pnpm build --profile`. |
| Zod añade ~14 KB | Alta | Bajo | Aceptable; ya se usa en 005. |
| IndexedDB no disponible (modo privado Safari) | Media | Medio | Toast rojo con instrucciones; editor sigue funcional en memoria. |
| `idb` (~1 KB) es dependencia nueva | Baja | Bajo | Si bloquea, escribir wrapper nativo de 30 líneas. |
| Round-trip Markdown pierde entities | Media | Alto (Art. I) | Tests E2E + assertions Zod en dev. |
| Persistencia >4 MB no anticipada | Baja | Medio | `IndexedDbCvStore` cubre; quota check al save. |

---

## Next Phase

→ `tasks.md` — desglose T-006-01..N por fase (Setup, Foundational, US-1..5, Polish).
