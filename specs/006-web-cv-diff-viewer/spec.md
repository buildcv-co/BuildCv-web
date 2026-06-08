# Feature Specification: 006-web-cv-diff-viewer — Visor de diff entre CV original y CV adaptado (con IA)

> **Status:** 📋 PLANEADO · **Hito:** v0.5 (P0.5) · **Sub-feature:** 006b de las dos que componen 006-cv-editor.
> **Sister sub-feature:** [`006-web-cv-editor`](../006-web-cv-editor/spec.md).
> **Backend counterparts consumidos:** [`003-adapt-ia`](../../../BuildCv-api/specs/003-adapt-ia/) (AdaptResult con `validation.warnings[]` y `validation.inventions[]`) y [`002-score-engine`](../../../BuildCv-api/specs/002-score-engine/) (re-score sobre texto editado).
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)

---

## Resumen

Cuando el usuario solicita una adaptación con IA (feature 003), recibe un `AdaptResult` con:

- `adaptedText`: el CV adaptado.
- `validation.warnings[]`: advertencias del validador post-IA.
- `validation.inventions[]`: entidades que el cross-entity validator marcó como posibles invenciones (severidad `Soft` o `Hard`).

El diff viewer es una sub-página `/analizar/diff` que permite al usuario:

1. **Ver lado a lado** (desktop) o **unificado** (móvil) el CV original vs. el CV adaptado.
2. **Resaltar visualmente** las diferencias a nivel de palabra (adiciones, eliminaciones, modificaciones).
3. **Marcar con badge rojo** las `EntityInvention` que el backend marcó como `Soft` o `Hard` (defense in depth visual de Constitución Art. I).
4. **Editar inline** las invenciones marcadas (la edición también es Zod-validada, re-usa el editor de 006a).
5. **Aceptar la adaptación** → el CV adaptado reemplaza al actual y se puede exportar a PDF.
6. **Rechazar la adaptación** → volver al CV original y re-prompt con nuevas instrucciones.
7. **Re-puntuar** el CV adaptado (con o sin ediciones) llamando a `002-score-engine`.

**Constitución cumplimiento (resumen normativo):**

| Art. | Aplicación a esta feature |
|---|---|
| **Art. I** — Cero invención | El diff viewer **MUST** resaltar todas las `EntityInvention` del backend. El usuario **MUST** confirmar o editar cada invención antes de aceptar la adaptación. |
| **Art. II** — Determinismo | El re-score sigue siendo 100% C# determinista; el diff viewer no calcula números. |
| **Art. III** — Privacidad | Los datos del diff se pasan vía `sessionStorage` (NO URL params, para no exponer PII en query strings). Sin persistencia adicional más allá de la del editor (006a). |
| **Art. IV** — Encuadre honesto | Copy: "Revisa la adaptación", NUNCA "confirma el cambio automático" o "auto-acepta". |
| **Art. V** — Entrada como dato | El diff viewer no modifica el `adaptedText` automáticamente; cada cambio es explícito del usuario. |
| **Art. VI** — Clean Arch | El BFF `/api/score` ya existe (002); el diff viewer lo consume. Sin nuevo endpoint backend. |
| **Art. VII** — v0.5 sin fricción | Sin cuentas, sin server-side. |

---

## Stack técnico

- **Next.js 16.2.7** (App Router) + **React 19.2.4**
- **TypeScript ^5** strict
- **Tailwind CSS v4**
- **Sin librería UI externa** — diseño custom (consistente con 002/003/004/005/006a)
- **`diff` (jsdiff)** v5 (BSD-3-Clause) para word-level Myers diff
- **Tiptap v2** (re-uso de 006a) en modo read-only para la columna adaptada, con `editable: true` solo en las invenciones marcadas
- **Zod v3** (re-uso) para validar ediciones
- **Sin testing framework** en v0.5 (mismo plan que 006a)

---

## Goals

- **G-1.** El usuario ve claramente qué cambió entre el CV original y el adaptado.
- **G-2.** Las invenciones marcadas por el backend son visualmente inequívocas (color + icono + tooltip).
- **G-3.** El usuario puede aceptar, editar o rechazar cada invención antes de confirmar la adaptación.
- **G-4.** La edición de una invención actualiza el `CvDocument` y dispara un re-score on demand.
- **G-5.** WCAG 2.2 AA: navegación por teclado entre invenciones, screen reader anuncia cada flag, contraste de color suficiente.

## Non-Goals

- **NG-1.** Diff en tiempo real (colaborativo) — v1.
- **NG-2.** Diff a nivel de párrafo o sección (palabra es suficiente para 006b).
- **NG-3.** Sugerencias automáticas de cómo arreglar la invención — el usuario lo decide.
- **NG-4.** Historial de diffs (v1 con cuentas).
- **NG-5.** Export del diff como PDF/imagen (v1 si hay demanda).

---

## User Scenarios

### User Story 1 — Ver el diff lado a lado (Priority: P1)

Como usuario que acaba de recibir una adaptación, llego a `/analizar/diff` y veo el CV original y el adaptado en dos columnas, con las diferencias resaltadas (verde = añadido, rojo = eliminado, amarillo = modificado).

**Why this priority**: Es el flujo central. Sin esto, el diff viewer no entrega valor.

**Independent Test**: Adaptar un CV → click "Ver diff" → llega a `/analizar/diff` → ve dos columnas con las diferencias palabra por palabra.

**Acceptance Scenarios**:
1. **Given** un `AdaptResult` válido en `sessionStorage`, **When** el usuario navega a `/analizar/diff`, **Then** la página renderiza dos columnas (`Original` | `Adaptado`) con word-level diff.
2. **Given** el viewport es <768 px (móvil), **When** el diff se renderiza, **Then** el modo por defecto es "unificado" (una columna con `+/−` inline).
3. **Given** el viewport es ≥768 px (desktop), **When** el diff se renderiza, **Then** el modo por defecto es "lado a lado".
4. **Given** el usuario quiere cambiar de modo, **When** hace click en el toggle "Unificado / Lado a lado", **Then** la vista cambia sin recargar.

### User Story 2 — Ver invenciones marcadas (Priority: P1)

Las `EntityInvention` del backend aparecen como **badges rojos** al lado del término afectado. El usuario hace click en un badge para ver detalles (severidad, posición, término original vs.Claimed).

**Why this priority**: **REGLA DURA Constitución Art. I**. La marca visual de invenciones es la defensa principal contra aceptar contenido fabricado.

**Independent Test**: Adaptar un CV con una invención `Soft` (métrica redondeada) → ver el badge rojo al lado de "40%" con tooltip "Métrica redondeada: claimed '40%' vs. original '35%'".

**Acceptance Scenarios**:
1. **Given** un `AdaptResult` con 1 invención `Soft`, **When** el diff se renderiza, **Then** el término afectado tiene un badge rojo con icono de advertencia y el `aria-label` describe la severidad.
2. **Given** un `AdaptResult` con 1 invención `Hard` (empresa inventada), **When** el diff se renderiza, **Then** el badge es rojo oscuro con icono de "X" y el tooltip dice "Esto puede ser una invención: claimed 'FakeCorp' no aparece en tu CV original".
3. **Given** el usuario navega con `Tab` por el diff, **When** llega a un badge, **Then** el screen reader anuncia: "Advertencia: invención detectada. Severidad Hard. Término: FakeCorp."
4. **Given** el usuario hace click en un badge, **When** se abre el popover, **Then** ve la información completa (tipo, claimed, original, posición) y 2 botones: "Editar" y "Mantener".

### User Story 3 — Editar una invención inline (Priority: P2)

El usuario puede hacer click en "Editar" sobre una invención y modificar el texto in-place. La edición se valida con Zod y dispara un re-score opcional.

**Why this priority**: Es P2 porque el usuario puede aceptar la invención y editar el texto manualmente en el editor (006a) antes de exportar. Pero la edición inline reduce la fricción.

**Independent Test**: Click "Editar" sobre la invención "40%" → el badge se convierte en un input editable → cambiar a "35%" → confirmar → la invención desaparece del listado de flags.

**Acceptance Scenarios**:
1. **Given** una invención `Soft` marcada, **When** el usuario click "Editar", **Then** el badge se reemplaza por un input Tiptap con el valor actual pre-poblado.
2. **Given** el usuario edita el valor, **When** confirma (Enter o click fuera), **Then** el nuevo valor se valida con Zod; si pasa, se reemplaza en el `AdaptResult.adaptedText`.
3. **Given** la edición produce un cambio, **When** el usuario click "Re-puntuar", **Then** el editor llama a `002-score-engine` con el texto actualizado y muestra el nuevo `ScoreResult`.

### User Story 4 — Aceptar o rechazar la adaptación (Priority: P1)

Al final del diff, hay un footer con 3 acciones: **Aceptar y exportar**, **Editar en el editor** (navega a 006a), **Rechazar y re-prompt**.

**Why this priority**: Es el outcome principal del flujo de adaptación. El usuario debe poder cerrar el ciclo.

**Independent Test**: Click "Aceptar y exportar" → navega a `/analizar/exportar` (004) con el CV adaptado como contenido → PDF descargado.

**Acceptance Scenarios**:
1. **Given** el diff revisado, **When** el usuario click "Aceptar y exportar", **Then** se setea el `DiffHandoff` con `currentDocument = adaptedDocument` y se navega a `/analizar/exportar`.
2. **Given** el diff revisado, **When** el usuario click "Editar en el editor", **Then** se setea el `DiffHandoff` con `currentDocument = adaptedDocument` y se navega a `/analizar/editar`.
3. **Given** el diff revisado, **When** el usuario click "Rechazar y re-prompt", **Then** se elimina el `DiffHandoff` y se navega a `/analizar` con un toast "Adaptación rechazada. Vuelve a solicitar con nuevas instrucciones."
4. **Given** hay invenciones `Hard` sin resolver, **When** el usuario intenta "Aceptar y exportar", **Then** aparece un modal: "Tienes X invenciones Hard sin revisar. ¿Aceptar de todos modos o revisarlas primero?"

---

## Edge Cases

- **`AdaptResult` sin invenciones** (`validation.inventions = []`): el diff viewer muestra un badge verde "Sin invenciones detectadas" y el footer se simplifica a "Aceptar y exportar" / "Editar en el editor".
- **`AdaptResult.adaptedText` vacío** (error del LLM): el viewer muestra un panel rojo "La adaptación no produjo texto. Intenta de nuevo." y un botón "Reintentar".
- **Diff de un CV muy largo** (>50 KB): el word-level diff puede tardar >2 s. Mostrar skeleton durante el cálculo.
- **Cambio de orientación en móvil** (portrait ↔ landscape): el modo "unificado" se mantiene (móvil siempre unificado).
- **`AdaptResult` expirado** (más de 1 hora en sessionStorage): el viewer muestra "La adaptación expiró. Vuelve a solicitarla."
- **Invenciones que se solapan** (mismo término aparece en 2 invenciones): el viewer muestra la de mayor severidad primero; la otra se puede ver en el panel "Todas las invenciones".
- **Usuario navega atrás tras aceptar**: el `DiffHandoff` se elimina, por lo que no se re-aplica la adaptación al volver.

---

## Key Functional Requirements (FR)

| ID | Requirement |
|---|---|
| **FR-064** | El sistema **MUST** renderizar un diff a nivel de palabra entre el CV original y el CV adaptado usando `diff` (jsdiff). |
| **FR-065** | El sistema **MUST** ofrecer dos modos: "unificado" (móvil) y "lado a lado" (desktop), seleccionables por el usuario. |
| **FR-066** | El sistema **MUST** marcar visualmente con badge rojo cada `EntityInvention` del `AdaptResult.validation.inventions[]`, distinguiendo `Soft` (rojo claro) de `Hard` (rojo oscuro con icono de X). |
| **FR-067** | El sistema **MUST** permitir al usuario hacer click en una invención y ver detalles (tipo, claimed, original, posición) y 2 acciones: "Editar" y "Mantener". |
| **FR-068** | El sistema **MUST** permitir la edición inline de invenciones, validando con Zod el nuevo valor. |
| **FR-069** | El sistema **MUST** ofrecer un footer con 3 acciones: "Aceptar y exportar", "Editar en el editor", "Rechazar y re-prompt". |
| **FR-070** | El sistema **MUST** bloquear "Aceptar y exportar" si hay invenciones `Hard` sin resolver, mostrando un modal de confirmación. |
| **FR-071** | El sistema **MUST** re-puntuar el CV adaptado (con o sin ediciones) llamando a `002-score-engine` cuando el usuario click "Re-puntuar". |

---

## Non-Functional Requirements (NFR)

| ID | Requirement |
|---|---|
| **NFR-031** | El diff viewer **MUST** cumplir WCAG 2.2 AA: roles ARIA, focus visible, navegación por teclado entre invenciones, anuncios de screen reader. |
| **NFR-032** | El cálculo del diff **MUST** completar en <2 s para un CV de hasta 50 KB. |
| **NFR-033** | El contraste de color para adiciones/eliminaciones **MUST** ser ≥4.5:1 (texto normal) y ≥3:1 (texto grande). |
| **NFR-034** | El diff viewer **MUST** funcionar en móvil (≥360 px) con layout responsive. |
| **NFR-035** | El modo unificado y lado a lado **MUST** compartir el mismo árbol DOM lógico (mismas invenciones marcadas) para que el screen reader navegue idéntico. |

---

## Success Criteria

- ✅ Un usuario ve claramente las diferencias entre el CV original y el adaptado.
- ✅ Las invenciones `Soft` y `Hard` son visualmente inequívocas.
- ✅ La edición inline valida con Zod y actualiza el `CvDocument`.
- ✅ El footer bloquea "Aceptar y exportar" con invenciones `Hard` sin resolver.
- ✅ WCAG 2.2 AA: Lighthouse a11y ≥95, navegación por teclado completa.
- ✅ 0 console errors en happy path manual.
- ✅ Diff de 50 KB completa en <2 s.

---

## Assumptions

- El `AdaptResult` de 003 ya pasó su Zod schema y es estructuralmente válido.
- El usuario aceptó el rate-limit (5 adaptaciones/h, política `"ai"`) en el flujo previo.
- El navegador soporta `IndexedDB` (mismo fallback que el editor, 006a).
- La Constitución v1.1.0 está vigente.

---

## Out of Scope (v0.5)

- Diff en tiempo real colaborativo — v1.
- Sugerencias automáticas para arreglar invenciones — rompe Art. I.
- Historial de diffs — v1 con cuentas.
- Export del diff como artefacto separado (PDF/imagen) — v1 si hay demanda.
- Diff a nivel de sección o párrafo (palabra es suficiente) — v1.

---

## Open Questions

- ¿El badge de invención debe aparecer inline en el texto o en un panel lateral fijo? — Decisión propuesta: inline (más discoverable), con un panel lateral plegable "Todas las invenciones" como secondary view.
- ¿La edición inline debe ser un Tiptap completo o un simple `<input>`? — Decisión propuesta: Tiptap read-only con un nodo editable solo donde está la invención (consistencia con 006a).
- ¿Qué hacer si el usuario edita una invención y la empeora (introduce un error de Zod)? — Decisión propuesta: el editor rechaza el cambio con un toast y mantiene el valor original.

---

## Next Phase

→ [`./plan.md`](./plan.md) — arquitectura jsdiff + Tiptap read-only + componentes.
→ [`./research.md`](./research.md) — comparativa de librerías de diff.
→ [`./data-model.md`](./data-model.md) — tipos TypeScript del diff.
→ [`./contracts/frontend-internal.md`](./contracts/frontend-internal.md) — contratos con 003 y 004.
→ [`./quickstart.md`](./quickstart.md) — pasos para probar.
→ [`./tasks.md`](./tasks.md) — T-006b-01..N.
