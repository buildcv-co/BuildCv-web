# Feature Specification: 006-web-cv-editor — Editor estructurado de CV (Tiptap + Zod + persistencia local)

> **Status:** 📋 PLANEADO · **Hito:** v0.5 (P0.5) · **Sub-feature:** 006a de las dos que componen 006-cv-editor.
> **Backend counterparts consumidos:** [`005-cv-pdf-docx-import`](../../../BuildCv-api/specs/005-cv-pdf-docx-import/) (semilla) y [`003-adapt-ia`](../../../BuildCv-api/specs/003-adapt-ia/) (re-scoring sobre texto editado).
> **Sister sub-feature:** [`006-web-cv-diff-viewer`](../006-web-cv-diff-viewer/spec.md).
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)

---

## Resumen

El usuario llega al editor con un `ImportResult` (proveniente de la feature 005) o con un CV pegado manualmente. El editor le permite:

1. Editar el texto del CV en una **estructura de 8 secciones** (`Profile`, `Experience`, `Education`, `Skills`, `Projects`, `Certifications`, `Languages`, `Other`) con un editor enriquecido **Tiptap** headless.
2. Cada sección es un **custom node de Tiptap** con atributos Zod-validados en el pipeline de parse y serialización (defense in depth, Constitución Art. I FR-029a).
3. **Guardar el borrador** localmente (`ICvStore` port) en `localStorage` (default, ≤4 MB) o `IndexedDB` (fallback, >4 MB) — Constitución Art. III v1.1.0 (FR-040a).
4. **Limpiar el borrador** con un botón explícito "Limpiar borrador" (Constitución Art. III FR-040b).
5. **Re-puntuar en caliente** el CV editado con el endpoint `POST /api/v1/score` (Constitución Art. II — el número es determinista).
6. **Exportar a Markdown** (formato canónico) que 004-export-pdf consumirá para generar PDF.

**Constitución cumplimiento (resumen normativo):**

| Art. | Aplicación a esta feature |
|---|---|
| **Art. I** — Cero invención | **REGLA DURA FR-029a**: el editor **MUST NOT** agregar entidades nuevas (skills, certificaciones, experiencia, empresas, cargos, fechas, métricas) que el usuario no haya tipeado explícitamente. La validación Zod del round-trip Markdown rechaza entidades nuevas (defense in depth). |
| **Art. II** — Determinismo | El re-score es 100% C# determinista. El editor no calcula números; solo produce texto que el backend puntúa. |
| **Art. III** — Privacidad | Persistencia local EXCLUSIVAMENTE en dispositivo del usuario (FR-040a). Botón "Limpiar borrador" obligatorio (FR-040b). Sin envío del borrador al servidor salvo en operaciones explícitas (re-score, adapt, export). |
| **Art. IV** — Encuadre honesto | Copy en `lib/copy/es.ts`: "Editar tu borrador", NUNCA "mejorar tu CV automáticamente". |
| **Art. V** — Entrada como dato | El texto del CV es dato; el editor no obedece instrucciones incrustadas. No `dangerouslySetInnerHTML` con CV importado. Validación Zod como gate. |
| **Art. VI** — Clean Arch / puertos | `ICvStore` es un puerto frontend (NO backend) declarado en `lib/storage/`. Implementaciones: `LocalStorageCvStore` y `IndexedDbCvStore` intercambiables. |
| **Art. VII** — v0.5 sin fricción | Sin cuentas, sin guardado server-side. Límite de borrador local: 4 MB (localStorage) o quota de IndexedDB (>4 MB). |

---

## Stack técnico

- **Next.js 16.2.7** (App Router) + **React 19.2.4**
- **TypeScript ^5** strict
- **Tailwind CSS v4**
- **Sin librería UI externa** — diseño custom (consistente con 002/003/004/005)
- **Tiptap v2** (MIT, headless, schema-driven) + **ProseMirror** (peer)
- **Zod v3** (validación runtime + tipos estáticos)
- **`idb`** (wrapper minimalista de IndexedDB, ~1 KB)
- **`nanoid`** (IDs únicos para `EntityRef`)
- **`react-markdown` + `remark-gfm`** (render del preview y del export)
- **Sin testing framework** en v0.5 (Vitest llegará en M3+). Plan: checklist E2E manual.

---

## Goals

- **G-1.** El usuario puede editar las 8 secciones del CV con un editor enriquecido, sin perder la estructura.
- **G-2.** El borrador persiste entre recargas (localStorage/IndexedDB) y se puede limpiar explícitamente.
- **G-3.** El editor **NO** introduce entidades nuevas (Art. I FR-029a). Cualquier token nuevo se rechaza en el round-trip.
- **G-4.** El usuario puede re-puntuar el texto editado con un click y ver el nuevo `ScoreResult` (Art. II).
- **G-5.** El editor exporta Markdown limpio que 004-export-pdf puede consumir sin transformaciones adicionales.

## Non-Goals

- **NG-1.** Colaboración en tiempo real (Yjs/CRDT). Reservado para v1.
- **NG-2.** Sugerencias automáticas de skills o frases (romperían Art. I FR-029a).
- **NG-3.** Historial de versiones del borrador (v1 con cuentas).
- **NG-4.** Sincronización entre dispositivos (v1).
- **NG-5.** Comentarios o anotaciones del reclutador (out of scope del producto).

---

## User Scenarios

### User Story 1 — Editar el CV importado (Priority: P1)

Como usuario que acaba de importar su CV en PDF o DOCX, llega al editor y ve el texto estructurado en las 8 secciones. Puede editar cualquier sección, agregar contenido nuevo (pero **NO** entidades nuevas que el backend no haya visto), y ver el preview en tiempo real.

**Why this priority**: Es el flujo central de la v0.5. Sin esto, el editor no entrega valor.

**Independent Test**: Importar un PDF de 2 páginas (de la feature 005) → llegar al editor con el texto pre-poblado → editar la sección `Skills` (agregar "Kubernetes" tipeándolo manualmente) → el editor lo acepta porque coincide con un token del `ImportResult.text` o el usuario lo tipeó explícitamente → el badge de entidad muestra "Agregado por ti".

**Acceptance Scenarios**:
1. **Given** un `ImportResult` válido en `sessionStorage` con 8 secciones detectadas, **When** el usuario navega a `/analizar/editar`, **Then** el editor pre-pobla cada sección con el texto correspondiente, marca los `EntityRef` como `source: 'imported'`, y enfoca el primer campo editable.
2. **Given** el editor cargó el CV, **When** el usuario tipea "Kubernetes" en la sección `Skills`, **Then** el editor acepta la inserción, la marca como `source: 'user-typed'`, y la sección pasa validación Zod.
3. **Given** el editor tiene el CV cargado, **When** el usuario presiona `Cmd/Ctrl+S` o hace click en "Guardar borrador", **Then** el `Draft` se persiste en `ICvStore` y el indicador "Guardado" aparece en el toolbar.

### User Story 2 — Guardar y restaurar el borrador (Priority: P1)

Como usuario que editó su CV y necesita cerrar la pestaña, espera que su trabajo esté disponible al volver.

**Why this priority**: Sin esto, perder trabajo destruye confianza. Es P1 porque es la promesa básica de la v0.5.

**Independent Test**: Editar 3 secciones → "Guardar borrador" → recargar la página → el editor abre con las 3 secciones editadas, no con el original.

**Acceptance Scenarios**:
1. **Given** un editor con cambios sin guardar, **When** el usuario recarga la página (F5), **Then** el editor detecta un borrador existente en `ICvStore` y pregunta "Tienes un borrador sin guardar. ¿Restaurarlo o empezar de nuevo?".
2. **Given** un borrador persistido, **When** el usuario elige "Restaurar", **Then** el editor hidrata el `CvDocument` desde `ICvStore` y el indicador muestra "Último guardado: hace 5 minutos".
3. **Given** un borrador persistido, **When** el usuario elige "Empezar de nuevo", **Then** el editor descarta el borrador, lo elimina de `ICvStore` y carga el `ImportResult` original (o el textarea vacío si no hay import).

### User Story 3 — Limpiar borrador explícitamente (Priority: P1)

Como usuario consciente de su privacidad, quiero un botón visible y explícito "Limpiar borrador" que purge toda persistencia local relacionada con mi CV.

**Why this priority**: **REGLA DURA Constitución Art. III FR-040b**. Es obligatorio en v0.5.

**Independent Test**: Editar → guardar → click "Limpiar borrador" → confirmar en modal → verificar DevTools → Application → Local Storage que la clave `buildcv:draft:default` no existe; IndexedDB `buildcv-drafts` está vacío.

**Acceptance Scenarios**:
1. **Given** un borrador persistido, **When** el usuario click "Limpiar borrador", **Then** aparece un modal de confirmación: "¿Borrar todo tu borrador local? Esta acción no se puede deshacer." con botones "Cancelar" y "Sí, limpiar".
2. **Given** el usuario confirma, **When** la acción se ejecuta, **Then** `ICvStore.clear()` elimina toda la persistencia (localStorage + IndexedDB + sessionStorage) y la UI muestra un toast "Borrador eliminado".
3. **Given** NO hay borrador persistido, **When** el usuario navega a la página, **Then** el botón "Limpiar borrador" está deshabilitado con `aria-disabled="true"` y texto "Sin borrador que limpiar".

### User Story 4 — Re-puntuar el texto editado (Priority: P2)

Como usuario que editó su CV, quiero ver cómo afectan sus cambios al puntaje sin tener que ir a `/analizar`.

**Why this priority**: Es P2 porque sin esto el usuario puede re-puntuar copiando-pegando; el editor solo mejora la fricción. Pero reduce la fricción lo suficiente para que valga la pena.

**Independent Test**: Editar la sección `Skills` agregando "Kubernetes" → click "Re-puntuar" → spinner 1-2s → nuevo `ScoreResult` reemplaza al anterior, con animación de "antes/después" opcional.

**Acceptance Scenarios**:
1. **Given** un CV editado, **When** el usuario click "Re-puntuar", **Then** el editor serializa el `CvDocument` a Markdown y llama `POST /api/score` con `{ cvText, jobText }`.
2. **Given** el endpoint retorna 200, **When** el `ScoreResult` llega, **Then** el componente `ScoreBadge` actualiza el número y el desglose de componentes; el delta vs. el score anterior se muestra como "Antes: 62 → Ahora: 78 (+16)".
3. **Given** el endpoint retorna 429 (rate-limit), **When** el usuario ve la respuesta, **Then** el editor muestra el mensaje honesto de 003/002: "Has alcanzado el tope de puntajes (60/hora). El editor sigue disponible."

### User Story 5 — Exportar a Markdown (Priority: P2)

Como usuario que terminó de editar, quiere copiar o descargar el Markdown del CV para usarlo en 004-export-pdf o en otra herramienta.

**Why this priority**: Es P2 porque 004-export-pdf puede re-llamar al editor; pero descargar/copiar es útil para el usuario que quiere backup.

**Independent Test**: Editar → "Exportar Markdown" → descarga `cv-2026-06-08.md` con las 8 secciones en orden y entities preservadas.

**Acceptance Scenarios**:
1. **Given** un CV editado, **When** el usuario click "Exportar Markdown", **Then** el navegador descarga `cv-YYYY-MM-DD.md` con el contenido serializado y un header `# CV — editado con BuildCv`.
2. **Given** el CV tiene 5 secciones pobladas y 3 vacías, **When** se exporta, **Then** las secciones vacías se omiten (no se exportan como headings vacíos).
3. **Given** el round-trip Markdown→Document→Markdown, **When** se valida con Zod, **Then** el documento es estructuralmente equivalente (mismas secciones, mismas entities) y el round-trip no introduce ni pierde entidades.

---

## Edge Cases

- **CV importado con encoding dañado** (caracteres ilegibles): el editor los muestra como `?` y un toast amarillo "Detectamos caracteres ilegibles al importar. Revísalos antes de re-puntuar."
- **Sección no detectada en el import**: el editor crea un nodo `Other` con todo el texto residual; el usuario puede reasignarlo a otra sección desde el menú contextual.
- **Borrador >4 MB** (CV muy largo): `LocalStorageCvStore` lanza `DRAFT_QUOTA_EXCEEDED` → fallback automático a `IndexedDbCvStore` (silencioso, con log informativo en consola).
- **IndexedDB bloqueado** (modo privado Safari, cuotas agotadas): el editor muestra un toast rojo "No pudimos guardar el borrador. Usa el modo normal del navegador o desactiva el modo privado."
- **Usuario pega un CV de 200 KB en el editor vacío**: el parseo a `CvDocument` puede tomar >1 s; mostrar skeleton durante el parseo.
- **Doble click rápido en "Guardar borrador"**: el segundo click es un no-op (debounce de 300 ms en el botón).
- **Recarga durante un parseo**: el editor detecta parseo interrumpido, vuelve al estado vacío y muestra toast "El parseo se interrumpió. Vuelve a intentarlo."

---

## Key Functional Requirements (FR)

| ID | Requirement |
|---|---|
| **FR-056** | El sistema **MUST** renderizar el CV en un editor Tiptap con 8 custom nodes (Profile, Experience, Education, Skills, Projects, Certifications, Languages, Other). |
| **FR-057** | El sistema **MUST** validar cada custom node contra un schema Zod en el pipeline de parse y serialización (defense in depth, Constitución Art. I FR-029a). |
| **FR-058** | El sistema **MUST NOT** permitir la inserción de entidades nuevas (skills, certificaciones, experiencia, empresas, cargos, fechas, métricas) que el usuario no haya tipeado explícitamente. Cada `EntityRef` se etiqueta con `source: 'imported' \| 'user-typed'`. |
| **FR-059** | El sistema **MUST** persistir el borrador en el dispositivo del usuario mediante el puerto `ICvStore` (Art. III v1.1.0, FR-040a). Implementación default: `LocalStorageCvStore` (≤4 MB). Fallback: `IndexedDbCvStore` (>4 MB). |
| **FR-060** | El sistema **MUST** ofrecer un botón "Limpiar borrador" visible que purge toda persistencia local (localStorage + IndexedDB + sessionStorage) tras confirmación explícita (Art. III FR-040b). |
| **FR-061** | El sistema **MUST** serializar el `CvDocument` a Markdown (CommonMark + custom syntax para las 8 secciones) y deserializar Markdown a `CvDocument` mediante funciones puras. |
| **FR-062** | El sistema **MUST** re-puntuar el texto editado llamando a `POST /api/score` con `{ cvText, jobText }` y mostrar el `ScoreResult` actualizado. |
| **FR-063** | El sistema **MUST** permitir exportar el `CvDocument` a Markdown descargable con un click. |

---

## Non-Functional Requirements (NFR)

| ID | Requirement |
|---|---|
| **NFR-026** | El editor **MUST** cumplir WCAG 2.2 AA: roles ARIA correctos, focus visible, navegación por teclado entre secciones, anuncios de screen reader para cambios de estado. |
| **NFR-027** | El editor **MUST NOT** registrar errores en la consola del navegador durante uso normal (happy path). |
| **NFR-028** | El editor **MUST** responder a interacciones de edición en <50 ms (latencia local perceptible). |
| **NFR-029** | El editor **MUST** funcionar en móvil (≥360 px de ancho) con layout responsive (toolbar colapsable, scroll vertical entre secciones). |
| **NFR-030** | El parseo Markdown→Document **MUST** completar en <2 s para un CV de hasta 50 KB. |

---

## Success Criteria

- ✅ Un usuario con un CV importado puede editar y guardar las 8 secciones sin perder datos.
- ✅ El round-trip Markdown→Document→Markdown preserva el 100% de las entities (idénticas por `EntityRef.id`).
- ✅ El botón "Limpiar borrador" elimina TODA la persistencia local (verificable en DevTools).
- ✅ WCAG 2.2 AA: navegación por teclado completa, contraste ≥4.5:1, screen reader anuncia cambios.
- ✅ 0 console errors en happy path manual.
- ✅ Re-puntuar tarda <3 s con un CV de 5 KB y una vacante de 2 KB.
- ✅ Zod rechaza el round-trip si se introducen entidades nuevas (test de regresión manual con trampa intencional).

---

## Assumptions

- El `ImportResult` de la feature 005 ya pasó su Zod schema y es estructuralmente válido.
- El `ScoreResult` de la feature 002 tiene la misma forma que en 003 (no cambia el contrato del backend).
- El usuario tiene al menos 5 MB de cuota en localStorage o IndexedDB (caso normal en navegadores modernos).
- La Constitución v1.1.0 (con FR-029a del editor) está vigente y no se esperan cambios antes del ship.

---

## Out of Scope (v0.5)

- Colaboración en tiempo real (Yjs/CRDT) — v1.
- Sugerencias automáticas de skills o frases — rompe Art. I.
- Historial de versiones del borrador — v1 con cuentas.
- Sincronización entre dispositivos — v1.
- Comentarios o anotaciones — out of scope del producto.
- Tests automatizados (Vitest) — M3+.
- Reemplazo de `003-web-adapt-ui` o `005-web-cv-import-ui` — el editor los CONSUME, no los reemplaza.

---

## Open Questions (a resolver en `/speckit.clarify`)

- ¿El `ICvStore` debe ser singleton (un solo borrador por dispositivo) o multi-borrador (varios CVs guardados con `id` distinto)? — Decisión propuesta: singleton en v0.5 (un solo borrador activo), multi-borrador en v1.
- ¿El editor debe mostrar el `ImportResult.sections` como sugerencias visuales (highlight de las secciones detectadas) o debe fusionarlas en el `CvDocument` automáticamente? — Decisión propuesta: highlight visual + fusión automática con confirmación del usuario.
- ¿Qué hacer si el `ImportResult` no tiene 8 secciones detectadas? — Decisión propuesta: el editor crea nodos vacíos para las secciones faltantes con un placeholder "Agregar contenido aquí".
- ¿La lista de `EntityRef` se persiste junto al `CvDocument` o se reconstruye en cada load? — Decisión propuesta: persistir para evitar drift entre sesiones.

---

## Next Phase

→ `plan.md` — arquitectura Tiptap + Zod + IndexedDB + archivos a crear + dependencias a añadir.
→ `research.md` — comparativa de editores (Tiptap vs Slate vs Lexical vs Quill vs ProseMirror) y librerías de validación.
→ `data-model.md` — tipos TypeScript del `CvDocument`, `EntityRef`, `Draft`, `ICvStore`.
→ `contracts/frontend-internal.md` — contratos entre editor, storage, re-score, export.
→ `quickstart.md` — pasos para correr la feature localmente.
→ `tasks.md` — T-006-01..N agrupadas por fase (Setup, Foundational, US-1..5, Polish).
