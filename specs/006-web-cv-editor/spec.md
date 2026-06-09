# Feature Specification: 006-web-cv-editor — Editor estructurado de CV (Zod + persistencia local)

> **Status:** ✅ SHIPPED (commit 748611d, 2026-06-09) · **Hito:** v0.5 (P0.5) · **Sub-feature:** 006a de las dos que componen 006-cv-editor.
> **Backend counterparts consumidos:** [`005-cv-pdf-docx-import`](../../../BuildCv-api/specs/005-cv-pdf-docx-import/) (semilla) y [`003-adapt-ia`](../../../BuildCv-api/specs/003-adapt-ia/) (re-scoring sobre texto editado).
> **Sister sub-feature:** [`006-web-cv-diff-viewer`](../006-web-cv-diff-viewer/spec.md).
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)
>
> **⚠️ Spec vs. shipped deviation (audited 2026-06-09).** La spec original proponía Tiptap v2 con 8 custom nodes, Zustand con `persist` middleware, IndexedDB fallback con `idb`, `nanoid` para IDs, `react-markdown` + `remark-gfm` para render/export, y testing manual en v0.5. El shipped code REJECTED todas esas dependencias. El editor se implementa como **8 textareas/inputs estructurados** con **Zod v3** para validación, **`useState` + `useCallback`** para estado local, **`LocalStorageCvStore`** como única implementación del puerto `ICvStore`, **`Math.random()`** para IDs, y un **parser Markdown regex hand-rolled** en `lib/editor/markdown/parse-cv.ts`. Ver `tasks.md` líneas 9–24 para la decisión arquitectónica explícita y la justificación.

---

## Resumen

El usuario llega al editor con un `ImportResult` (proveniente de la feature 005) o con un CV pegado manualmente. El editor le permite:

1. Editar el texto del CV en una **estructura de 8 secciones** (`Profile`, `Experience`, `Education`, `Skills`, `Projects`, `Certifications`, `Languages`, `Other`) usando **inputs y textareas HTML nativos**, uno por sección.
2. Cada sección se valida con un **Zod schema** dedicado en el pipeline de parse, edición y serialización (defense in depth, Constitución Art. I FR-029a).
3. **Guardar el borrador** localmente mediante el puerto `ICvStore` (única implementación shipped: `LocalStorageCvStore` en `lib/storage/icv-store.ts`) — Constitución Art. III (FR-040a).
4. **Limpiar el borrador** con un botón explícito "Limpiar borrador" (Constitución Art. III FR-040b).
5. **Re-puntuar en caliente** el CV editado con el endpoint `POST /api/score` (Constitución Art. II — el número es determinista).
6. **Exportar a Markdown** que 004-export-pdf consumirá para generar PDF.

**Constitución cumplimiento (resumen normativo):**

| Art. | Aplicación a esta feature |
|---|---|
| **Art. I** — Cero invención | **REGLA DURA FR-029a**: el editor **MUST NOT** agregar entidades nuevas (skills, certificaciones, experiencia, empresas, cargos, fechas, métricas) que el usuario no haya tipeado explícitamente. La validación Zod del round-trip Markdown rechaza entidades nuevas (defense in depth). |
| **Art. II** — Determinismo | El re-score es 100% C# determinista. El editor no calcula números; solo produce texto que el backend puntúa. |
| **Art. III** — Privacidad | Persistencia local EXCLUSIVAMENTE en `localStorage` (FR-040a). Botón "Limpiar borrador" obligatorio (FR-040b). Sin envío del borrador al servidor salvo en operaciones explícitas (re-score, adapt, export). |
| **Art. IV** — Encuadre honesto | Copy en `lib/copy/es.ts`: "Editar tu borrador", NUNCA "mejorar tu CV automáticamente". |
| **Art. V** — Entrada como dato | El texto del CV es dato; el editor no obedece instrucciones incrustadas. No `dangerouslySetInnerHTML` con CV importado. Validación Zod como gate. |
| **Art. VI** — Clean Arch / puertos | `ICvStore` es un puerto frontend (NO backend) declarado en `lib/storage/icv-store.ts`. Implementación shipped: `LocalStorageCvStore` (única). |
| **Art. VII** — v0.5 sin fricción | Sin cuentas, sin guardado server-side. Límite de borrador local: ~5 MB (cuota típica de `localStorage`). |

---

## Stack técnico

- **Next.js 16.2.7** (App Router) + **React 19.2.4**
- **TypeScript ^5** strict
- **Tailwind CSS v4**
- **Sin librería UI externa** — diseño custom (consistente con 002/003/004/005)
- **Sin editor enriquecido** — inputs y textareas HTML nativos
- **Zod v3** (validación runtime + tipos estáticos)
- **`diff` (jsdiff) v5** — agregado por la sub-feature 006b, presente en lockfile compartido
- **Vitest 2** + **React Testing Library 16** + **jsdom** (unit + integración; sprint 0, commit 21fb83b)
- **Playwright 1 chromium** (E2E; opcional, configurado en `playwright.config.ts`)

**NO incluido** (rechazado durante implementación, ver `tasks.md` líneas 9–24):
- ~~Tiptap / @tiptap/* / ProseMirror~~
- ~~Zustand / `persist` middleware~~
- ~~idb / IndexedDB fallback~~ (`LocalStorageCvStore` es la única implementación shipped; `IndexedDbCvStore` queda como **deuda técnica** para v1)
- ~~nanoid~~ (se usa `Math.random().toString(36).slice(2, 10)`)
- ~~react-markdown / remark / remark-gfm~~ (se usa un parser regex hand-rolled en `lib/editor/markdown/parse-cv.ts`)

---

## Goals

- **G-1.** El usuario puede editar las 8 secciones del CV con inputs/textareas nativos, sin perder la estructura.
- **G-2.** El borrador persiste entre recargas (localStorage) y se puede limpiar explícitamente.
- **G-3.** El editor **NO** introduce entidades nuevas (Art. I FR-029a). El round-trip Markdown ↔ CvDocument valida con Zod.
- **G-4.** El usuario puede re-puntuar el texto editado con un click y ver el nuevo `ScoreResponse` (Art. II).
- **G-5.** El editor exporta Markdown limpio que 004-export-pdf puede consumir sin transformaciones adicionales.

## Non-Goals

- **NG-1.** Colaboración en tiempo real (Yjs/CRDT). Reservado para v1.
- **NG-2.** Sugerencias automáticas de skills o frases (romperían Art. I FR-029a).
- **NG-3.** Historial de versiones del borrador (v1 con cuentas).
- **NG-4.** Sincronización entre dispositivos (v1).
- **NG-5.** Comentarios o anotaciones del reclutador (out of scope del producto).
- **NG-6.** Editor enriquecido con formato inline (bold/italic/links). El round-trip es texto plano a secciones; v1 con Tiptap si hay demanda.

---

## User Scenarios

### User Story 1 — Editar el CV importado (Priority: P1)

Como usuario que acaba de importar su CV en PDF o DOCX, llega al editor y ve el texto estructurado en las 8 secciones. Puede editar cualquier sección mediante inputs y textareas nativos.

**Why this priority**: Es el flujo central de la v0.5. Sin esto, el editor no entrega valor.

**Independent Test**: Importar un PDF de 2 páginas (de la feature 005) → llegar al editor con el texto pre-poblado → editar la sección `Skills` (agregar "Kubernetes" tipeándolo manualmente) → el editor lo acepta.

**Acceptance Scenarios**:
1. **Given** un handoff de import válido en `sessionStorage` con 8 secciones detectadas, **When** el usuario navega a `/analizar/editar`, **Then** el editor pre-pobla cada sección con el texto correspondiente y enfoca el primer campo editable.
2. **Given** el editor cargó el CV, **When** el usuario tipea "Kubernetes" en la sección `Skills`, **Then** el editor acepta la inserción, y la sección pasa validación Zod.
3. **Given** el editor tiene el CV cargado, **When** el usuario presiona el botón "Guardar borrador", **Then** el `Draft` se persiste en `LocalStorageCvStore` y el indicador "Guardado" aparece en el toolbar.

### User Story 2 — Guardar y restaurar el borrador (Priority: P1)

Como usuario que editó su CV y necesita cerrar la pestaña, espera que su trabajo esté disponible al volver.

**Why this priority**: Sin esto, perder trabajo destruye confianza. Es P1 porque es la promesa básica de la v0.5.

**Independent Test**: Editar 3 secciones → "Guardar borrador" → recargar la página → el editor abre con las 3 secciones editadas, no con el original.

**Acceptance Scenarios**:
1. **Given** un editor con cambios sin guardar, **When** el usuario recarga la página (F5), **Then** el editor hidrata automáticamente desde `LocalStorageCvStore` (no hay modal en v0.5; el `useDraft` hook lee el singleton `"default"`).
2. **Given** un borrador persistido, **When** el editor monta, **Then** el `useDraft` hook carga el `Draft` desde localStorage y las secciones se hidratan con los valores guardados.
3. **Given** NO hay borrador persistido, **When** el editor monta, **Then** las 8 secciones se inicializan vacías con `buildBlankSections(now)` y el `CvDocument` se crea con un ID aleatorio `doc_xxxxxxxx`.

### User Story 3 — Limpiar borrador explícitamente (Priority: P1)

Como usuario consciente de su privacidad, quiero un botón visible y explícito "Limpiar borrador" que purge toda persistencia local relacionada con mi CV.

**Why this priority**: **REGLA DURA Constitución Art. III FR-040b**. Es obligatorio en v0.5.

**Independent Test**: Editar → guardar → click "Limpiar borrador" → confirmar en modal → verificar DevTools → Application → Local Storage que la clave `buildcv:draft:default` no existe.

**Acceptance Scenarios**:
1. **Given** un borrador persistido, **When** el usuario click "Limpiar borrador", **Then** aparece un modal de confirmación: "¿Borrar todo tu borrador local? Esta acción no se puede deshacer." con botones "Cancelar" y "Sí, limpiar".
2. **Given** el usuario confirma, **When** la acción se ejecuta, **Then** `LocalStorageCvStore.clear("default")` elimina la clave `buildcv:draft:default` y la UI muestra un toast "Borrador eliminado".
3. **Given** NO hay borrador persistido, **When** el usuario abre el toolbar, **Then** el botón "Limpiar borrador" está deshabilitado.

### User Story 4 — Re-puntuar el texto editado (Priority: P2)

Como usuario que editó su CV, quiero ver cómo afectan sus cambios al puntaje sin tener que ir a `/analizar`.

**Why this priority**: Es P2 porque sin esto el usuario puede re-puntuar copiando-pegando; el editor solo mejora la fricción. Pero reduce la fricción lo suficiente para que valga la pena.

**Independent Test**: Editar la sección `Skills` agregando "Kubernetes" → click "Re-puntuar" → spinner 1-2s → nuevo `ScoreResponse` reemplaza al anterior.

**Acceptance Scenarios**:
1. **Given** un CV editado con `jobText` no vacío, **When** el usuario click "Re-puntuar", **Then** el editor serializa el `CvDocument` a Markdown (`serializeCvDocument`) y llama `POST /api/score` con `{ cvText: md, jobText }`.
2. **Given** el endpoint retorna 200, **When** el `ScoreResponse` llega, **Then** el `<output aria-live="polite">` muestra el `overallScore` y la `band`.
3. **Given** el endpoint retorna 429 (rate-limit), **When** el usuario ve la respuesta, **Then** el editor muestra el mensaje honesto de 002/003: "Has alcanzado el tope de puntajes (60/hora). El editor sigue disponible."
4. **Given** el `jobText` está vacío, **When** el usuario click "Re-puntuar", **Then** el editor muestra `copy.editor.errors.jobTextRequired` y NO llama al backend.

### User Story 5 — Exportar a Markdown (Priority: P2)

Como usuario que terminó de editar, quiere copiar o descargar el Markdown del CV para usarlo en 004-export-pdf o en otra herramienta.

**Why this priority**: Es P2 porque 004-export-pdf puede re-llamar al editor; pero descargar/copiar es útil para el usuario que quiere backup.

**Independent Test**: Editar → "Exportar Markdown" → descarga `cv-2026-06-08.md` con las 8 secciones en orden.

**Acceptance Scenarios**:
1. **Given** un CV editado, **When** el usuario click "Exportar Markdown", **Then** el navegador descarga `cv-YYYY-MM-DD.md` con el contenido serializado.
2. **Given** el CV tiene 5 secciones pobladas y 3 vacías, **When** se exporta, **Then** las secciones vacías se omiten (no se exportan como headings vacíos).
3. **Given** el round-trip Markdown→Document→Markdown, **When** se valida con Zod (`DraftSchema`), **Then** el documento es estructuralmente equivalente (mismas secciones) y el round-trip no introduce ni pierde entidades.

---

## Edge Cases

- **CV importado con encoding dañado** (caracteres ilegibles): el editor los muestra literales y un toast amarillo "Detectamos caracteres ilegibles al importar. Revísalos antes de re-puntuar."
- **Sección no detectada en el import**: el editor crea un nodo `Other` con todo el texto residual.
- **Borrador >5 MB** (CV muy largo): `LocalStorageCvStore` lanza `QuotaExceededError` → se invoca el handler registrado en `onQuotaExceeded` → la UI muestra un toast rojo indicando cuota agotada (NO fallback silencioso a IndexedDB; eso es v1).
- **`localStorage` no disponible** (modo privado Safari, cuotas agotadas): `getCvStore` lanza `Error("LocalStorage unavailable")`; el editor muestra un toast rojo "No pudimos guardar el borrador. Usa el modo normal del navegador o desactiva el modo privado."
- **Usuario pega un CV de 200 KB en el editor vacío**: el parseo regex a `CvDocument` puede tomar <500 ms; no requiere skeleton dedicado.
- **Doble click rápido en "Guardar borrador"**: el segundo click es un no-op (el estado `isSaving` deshabilita el botón en `EditorToolbar`).
- **Recarga durante un parseo**: el editor detecta parseo interrumpido, vuelve al estado vacío y muestra toast "El parseo se interrumpió. Vuelve a intentarlo."

---

## Key Functional Requirements (FR)

| ID | Requirement |
|---|---|
| **FR-056** | El sistema **MUST** renderizar el CV en **8 inputs/textareas nativos**, uno por sección (Profile, Experience, Education, Skills, Projects, Certifications, Languages, Other). |
| **FR-057** | El sistema **MUST** validar cada sección contra un Zod schema dedicado en `lib/editor/schema/*.ts` (8 schemas + discriminated union), en el pipeline de parse, edición, save y export. |
| **FR-058** | El sistema **MUST NOT** permitir la inserción de entidades nuevas (skills, certificaciones, experiencia, empresas, cargos, fechas, métricas) que el usuario no haya tipeado explícitamente. La validación Zod en el round-trip Markdown actúa como gate (defense in depth). |
| **FR-059** | El sistema **MUST** persistir el borrador en `localStorage` mediante el puerto `ICvStore` (Art. III FR-040a). Implementación shipped: `LocalStorageCvStore` (única, ~5 MB). `IndexedDbCvStore` queda como **deuda técnica** para v1 (no se implementa en v0.5). |
| **FR-060** | El sistema **MUST** ofrecer un botón "Limpiar borrador" visible que elimine la clave `buildcv:draft:default` de `localStorage` tras confirmación explícita (Art. III FR-040b). |
| **FR-061** | El sistema **MUST** serializar el `CvDocument` a Markdown y deserializar Markdown a `CvDocument` mediante funciones puras (`serializeCvDocument` y `parseCvDocument` en `lib/editor/markdown/`). |
| **FR-062** | El sistema **MUST** re-puntuar el texto editado llamando a `POST /api/score` con `{ cvText, jobText }` y mostrar el `ScoreResponse` actualizado. |
| **FR-063** | El sistema **MUST** permitir exportar el `CvDocument` a Markdown descargable con un click (genera un `Blob` con `text/markdown;charset=utf-8` y dispara descarga via `downloadBlob`). |

---

## Non-Functional Requirements (NFR)

| ID | Requirement |
|---|---|
| **NFR-026** | El editor **MUST** cumplir WCAG 2.2 AA: roles ARIA correctos, focus visible, navegación por teclado entre secciones, anuncios de screen reader para cambios de estado (`aria-live="polite"` en el indicador de guardado y en el output del re-score). |
| **NFR-027** | El editor **MUST NOT** registrar errores en la consola del navegador durante uso normal (happy path). |
| **NFR-028** | El editor **MUST** responder a interacciones de edición en <50 ms (latencia local perceptible). |
| **NFR-029** | El editor **MUST** funcionar en móvil (≥360 px de ancho) con layout responsive (toolbar colapsable, scroll vertical entre secciones). |
| **NFR-030** | El parseo Markdown→Document **MUST** completar en <2 s para un CV de hasta 50 KB (regex hand-rolled es lineal; medido en ~100 ms para 50 KB). |

---

## Success Criteria

- ✅ Un usuario con un CV importado puede editar y guardar las 8 secciones sin perder datos.
- ✅ El round-trip Markdown→Document→Markdown preserva el 100% de las entities (validado con `DraftSchema.safeParse`).
- ✅ El botón "Limpiar borrador" elimina la clave `buildcv:draft:default` (verificable en DevTools).
- ✅ WCAG 2.2 AA: navegación por teclado completa, contraste ≥4.5:1, screen reader anuncia cambios.
- ✅ 0 console errors en happy path (verificado por 35+ tests unit + integración).
- ✅ Re-puntuar tarda <3 s con un CV de 5 KB y una vacante de 2 KB.
- ✅ Zod rechaza el round-trip si se introducen entidades nuevas (test de regresión: `lib/editor/roundtrip.test.ts`).

---

## Assumptions

- El `ImportResult` de la feature 005 ya pasó su Zod schema y es estructuralmente válido.
- El `ScoreResponse` de la feature 002 tiene la misma forma que en 003 (no cambia el contrato del backend).
- El usuario tiene al menos 5 MB de cuota en `localStorage` (caso normal en navegadores modernos).
- La Constitución v1.1.0 (con FR-029a del editor) está vigente y no se esperan cambios antes del ship.

---

## Out of Scope (v0.5)

- Colaboración en tiempo real (Yjs/CRDT) — v1.
- Sugerencias automáticas de skills o frases — rompe Art. I.
- Historial de versiones del borrador — v1 con cuentas.
- Sincronización entre dispositivos — v1.
- Comentarios o anotaciones — out of scope del producto.
- Editor enriquecido con formato inline (Tiptap) — v1 si hay demanda (deuda técnica documentada en `tasks.md` línea 23).
- `IndexedDbCvStore` (fallback para borradores >5 MB) — v1; en v0.5, `QuotaExceededError` se surfacea al usuario.
- Reemplazo de `003-web-adapt-ui` o `005-web-cv-import-ui` — el editor los CONSUME, no los reemplaza.

---

## Resolved Decisions

- **(R1) `ICvStore` singleton vs. multi-borrador.** Singleton en v0.5 (un solo borrador activo con id `"default"`); multi-borrador en v1.
- **(R2) `ImportResult.sections` highlight vs. auto-fuse.** Fusión automática; las secciones detectadas se parsean con `parseCvDocument` y se renderizan en los 8 inputs/textareas.
- **(R3) `ImportResult` con <8 secciones.** El editor crea secciones vacías para las faltantes (8 secciones en orden canónico, ver `SECTION_ORDER` en `editor.tsx`).
- **(R4) Persistencia de `EntityRef` lista.** Se reconstruyen en cada `load` desde el `CvDocument`; no se persisten por separado.
- **(R5) Editor library.** **REJECTED Tiptap v2** durante implementación. Se usan inputs/textareas nativos + Zod (justificación en `tasks.md` líneas 9–24).
- **(R6) Estado global.** **REJECTED Zustand v4 + persist middleware.** Se usa `useState` + `useCallback` local al componente `Editor` y el hook `useDraft` para persistencia.
- **(R7) IDs.** **REJECTED nanoid.** Se usa `Math.random().toString(36).slice(2, 10)` (ej. `doc_8f3kq2x1`).
- **(R8) Markdown round-trip.** **REJECTED `remark` + plugin custom.** Se usa un parser regex hand-rolled en `lib/editor/markdown/parse-cv.ts`.
- **(R9) Persistencia fallback.** **REJECTED `IndexedDbCvStore` con `idb` para v0.5.** El usuario recibe un toast cuando se agota la cuota de `localStorage`; v1 agrega el fallback.
- **(R10) Testing framework.** **REJECTED "manual-only en v0.5"**. Vitest 2 + RTL 16 + jsdom YA están configurados (sprint 0, commit 21fb83b) y se usan activamente: 35+ tests en `lib/editor/`, `components/editor/`.

---

## Next Phase

→ `plan.md` — arquitectura de componentes, hooks, Zod schemas y round-trip.
→ `research.md` — histórico de evaluación Tiptap/Zustand/idb/remark y la decisión final.
→ `data-model.md` — tipos TypeScript del `CvDocument`, `EntityRef`, `Draft`, `ICvStore`.
→ `contracts/frontend-internal.md` — contratos entre editor, storage, re-score, export.
→ `quickstart.md` — pasos para correr la feature localmente.
→ `tasks.md` — T-006-01..N (preserva el bloque "DECISIÓN ARQUITECTÓNICA EXPLÍCITA" intacto).
