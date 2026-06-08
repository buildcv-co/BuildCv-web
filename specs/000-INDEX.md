# INDEX — Registro consolidado de features (BuildCv-web)

> **Entry point oficial al estado del frontend BuildCv.**
> Cualquier agente o humano que necesite saber "qué UI está hecha, qué UI está en curso, qué UI falta" debe leer esto primero.

**Última actualización:** 2026-06-09 (post-enmienda constitucional v1.0.0 → v1.1.0, v0.5 introduce import + editor + persistencia local)

## Relación con el backend

Este sub-proyecto es el **frontend** (BFF + UI) que consume el backend (`BuildCv-api`). Las features frontend **siempre tienen un ID correlativo** con su contraparte backend:

| Frontend | Backend | Relación |
|---|---|---|
| 002-web-score-ui | 002-score-engine ✅ | Consume `POST /api/v1/score` |
| 003-web-adapt-ui | 003-adapt-ia ✅ | Consume `POST /api/v1/adapt` |
| 004-web-export-ui | 004-export-pdf ✅ | Consume `POST /api/v1/export` |
| 005-web-cv-import-ui | 005-cv-pdf-docx-import 📋 | Consume `POST /api/v1/import` (NUEVO v0.5) |
| 006-web-cv-editor | (frontend only) 📋 | Editor estructurado; re-usa 002/003/004 con texto editado |
| 006-web-cv-diff-viewer | (frontend only) 📋 | Diff visual original vs adaptado |

## Constitución vigente

Misma que el backend: `../BuildCv-api/.specify/memory/constitution.md` v1.1.0.

**Cambios que afectan al frontend (v1.1.0):**
- **Art. III**: ahora se permite persistencia local EXCLUSIVAMENTE en el dispositivo del usuario para el borrador de edición. El frontend DEBE ofrecer botón "Limpiar borrador" (FR-040b).
- **Art. I FR-029a**: el editor (006) NO agrega entidades que el usuario no haya tipeado. Zod rechaza nuevas entidades en round-trip.
- **Art. VI**: el frontend tiene su propio puerto `ICvStore` (localStorage, IndexedDB).

## Estado del producto (consolidado)

| # | Feature | Hito | Status | BFF endpoint |
|---|---|---|---|---|
| 001 | `web-mvp-original` | MVP original | 🗄️ Archivado | (n/a) |
| 002 | `web-score-ui` | v0 / M0.0 | ✅ SHIPPED | `app/api/score/route.ts` |
| 003 | `web-adapt-ui` | v0 / M1.1 | 📋 SPEC'D (BFF ya implementado, UI falta) | `app/api/adapt/route.ts` |
| 004 | `web-export-ui` | v0 / M2.1 | 📋 SPEC'D (BFF ya implementado, UI falta) | `app/api/export/route.ts` |
| 005 | `web-cv-import-ui` | v0.5 / M3 | 📋 PLANEADO (specs ✅) | `app/api/import/route.ts` (NUEVO) |
| 006 | `web-cv-editor` | v0.5 / M4 | 📋 PLANEADO (specs ✅) | (re-usa 002/003/004) |
| 006b | `web-cv-diff-viewer` | v0.5 / M4 | 📋 PLANEADO (specs ✅) | (re-usa 003) |
| 007 | `landing-ui` | v0.5.1 | 📋 PLANEADO (spec NO escrita) | (n/a) |
| 008 | `observability-web` | v0.5.1 | 📋 PLANEADO (spec NO escrita) | (n/a) |
| 009 | `auth-web` | v1 | 📋 PLANEADO (spec NO escrita) | (n/a) |
| 010 | `payments-web` | v1 | 📋 PLANEADO (spec NO escrita) | (n/a) |

## Leyenda de status

- ✅ **SHIPPED** — feature cerrada, en producción
- 🚧 **EN CURSO** — implementación activa
- 📋 **PLANEADO** — los 7 artifacts están escritos; esperando ventana de implementación
- 🗄️ **ARCHIVADO** — feature antigua, conservada solo para historia

## Features SHIPPED (detalle)

### 002-web-score-ui (v0 / M0.0)

- **Spec:** [specs/002-web-score-ui/spec.md](./002-web-score-ui/spec.md)
- **Backend:** [../BuildCv-api/specs/002-score-engine/](../BuildCv-api/specs/002-score-engine/) (✅ SHIPPED)
- **Estado:** Score gauge animado + component bars + keyword cloud + fix list + honesty note.
- **Path frontend:** `app/analizar/page.tsx` + `components/analyzer/`
- **BFF:** `app/api/score/route.ts` (proxyea a `POST ${BACKEND_URL}/api/v1/score`)
- **Commit:** `ed13890` (M0 score engine original)

## Features con BFF listo, falta UI

### 003-web-adapt-ui (v0 / M1.1) — BFF ✅, UI ❌

- **Spec:** [specs/003-web-adapt-ui/spec.md](./003-web-adapt-ui/spec.md) (ya existe, 1 archivo)
- **Backend counterpart:** ✅ SHIPPED con StubAiClient (`BuildCv-api/specs/003-adapt-ia/`).
- **BFF:** `app/api/adapt/route.ts` ya implementado (`f94999f`).
- **UI faltante:** componentes `components/adapt/` (no existe el directorio), `lib/api/adapt.ts` (typed client wrapper no existe).
- **Bloqueado por:** nada. Trabajo puro de UI (~2-3 sprints estimados).
- **Prioridad:** ALTA. Cierra el flujo de valor end-to-end.

### 004-web-export-ui (v0 / M2.1) — BFF ✅, UI ❌

- **Spec:** [specs/004-web-export-ui/spec.md](./004-web-export-ui/spec.md) (ya existe, 7 artifacts)
- **Backend counterpart:** ✅ SHIPPED con QuestPDF.
- **BFF:** `app/api/export/route.ts` ya implementado (`6b6f390`).
- **UI faltante:** `components/export/` (no existe el directorio), `lib/api/export.ts` (typed client wrapper no existe).
- **Bloqueado por:** nada. Trabajo puro de UI.
- **Prioridad:** ALTA. Cierra el flujo: score → adapt → export.

## Features PLANEADAS con specs completas

### 005-web-cv-import-ui (v0.5 / M3)

- **Spec:** [specs/005-web-cv-import-ui/spec.md](./005-web-cv-import-ui/spec.md)
- **Plan:** [specs/005-web-cv-import-ui/plan.md](./005-web-cv-import-ui/plan.md)
- **Research:** [specs/005-web-cv-import-ui/research.md](./005-web-cv-import-ui/research.md)
- **Data model:** [specs/005-web-cv-import-ui/data-model.md](./005-web-cv-import-ui/data-model.md)
- **Quickstart:** [specs/005-web-cv-import-ui/quickstart.md](./005-web-cv-import-ui/quickstart.md)
- **Tasks:** [specs/005-web-cv-import-ui/tasks.md](./005-web-cv-import-ui/tasks.md)
- **Contracts:** [specs/005-web-cv-import-ui/contracts/frontend-consumes-api.md](./005-web-cv-import-ui/contracts/frontend-consumes-api.md)
- **BFF planeado:** `app/api/import/route.ts` (proxy a `POST ${BACKEND_URL}/api/v1/import`, `runtime = "nodejs"` por multipart >4 MB)
- **Componentes planeados:** `components/import/{FileUpload, ImportButton, ImportResultPanel}.tsx`
- **Typed client planeado:** `lib/api/import.ts`
- **Handoff:** el `ImportResult` se persiste en `sessionStorage` (no URL) y alimenta el editor (006).
- **Constitution compliance:** Art. III ✅ (frontend no persiste en localStorage del import; solo en sessionStorage hasta que se cargue al editor), Art. V ✅ (parsed text se trata como DATO, no se renderiza como HTML), Art. VII ✅ (5 MB client-side early reject, antes de gastar upload).
- **A11y:** WCAG 2.2 AA, drag/drop con fallback click + teclado, screen reader announcements.
- **Open questions:** 5 (backend-side, ver INDEX del API).

### 006-web-cv-editor (v0.5 / M4)

- **Spec:** [specs/006-web-cv-editor/spec.md](./006-web-cv-editor/spec.md)
- **Plan:** [specs/006-web-cv-editor/plan.md](./006-web-cv-editor/plan.md)
- **Research:** [specs/006-web-cv-editor/research.md](./006-web-cv-editor/research.md)
- **Data model:** [specs/006-web-cv-editor/data-model.md](./006-web-cv-editor/data-model.md)
- **Quickstart:** [specs/006-web-cv-editor/quickstart.md](./006-web-cv-editor/quickstart.md)
- **Tasks:** [specs/006-web-cv-editor/tasks.md](./006-web-cv-editor/tasks.md)
- **Contracts:** [specs/006-web-cv-editor/contracts/frontend-internal.md](./006-web-cv-editor/contracts/frontend-internal.md)
- **Page planeada:** `app/analizar/editar/page.tsx`
- **Engine version planeada:** `0.5.0` (sello en cada Draft, simetría con backend)
- **Stack planeado:** Tiptap v2 (MIT) + Zod v3 + Zustand v4 + `idb` (IndexedDB wrapper) + `remark` + `remark-buildcv` (plugin custom) + `nanoid`
- **Persistencia:** `ICvStore` port (Art. VI v1.1.0) con `LocalStorageCvStore` (default ≤4 MB) + `IndexedDbCvStore` (fallback >4 MB)
- **8 custom nodes Tiptap:** Profile, Experience, Education, Skills, Projects, Certifications, Languages, Other
- **Constitution compliance:** Art. I ✅ (FR-029a: Zod rechaza entidades nuevas en round-trip), Art. III ✅ (FR-040b botón "Limpiar borrador" obligatorio), Art. VI ✅ (`ICvStore` puerto oficial)
- **A11y:** WCAG 2.2 AA, keyboard nav completa, ARIA labels por sección
- **Open questions:** 7 (ver INDEX del API para detalle)

### 006-web-cv-diff-viewer (v0.5 / M4) — sub-feature del editor

- **Spec:** [specs/006-web-cv-diff-viewer/spec.md](./006-web-cv-diff-viewer/spec.md)
- **Plan:** [specs/006-web-cv-diff-viewer/plan.md](./006-web-cv-diff-viewer/plan.md)
- **Research:** [specs/006-web-cv-diff-viewer/research.md](./006-web-cv-diff-viewer/research.md)
- **Data model:** [specs/006-web-cv-diff-viewer/data-model.md](./006-web-cv-diff-viewer/data-model.md)
- **Quickstart:** [specs/006-web-cv-diff-viewer/quickstart.md](./006-web-cv-diff-viewer/quickstart.md)
- **Tasks:** [specs/006-web-cv-diff-viewer/tasks.md](./006-web-cv-diff-viewer/tasks.md)
- **Contracts:** [specs/006-web-cv-diff-viewer/contracts/frontend-internal.md](./006-web-cv-diff-viewer/contracts/frontend-internal.md)
- **Page planeada:** `app/analizar/diff/page.tsx`
- **Stack planeado:** `diff` (jsdiff v5, BSD-3) + custom React renderer (control a11y/colors) + Tiptap read-only con nodo editable para correcciones inline
- **Modos:** unified (mobile <768px default) / side-by-side (desktop ≥768px default), toggle persiste en `localStorage["buildcv:diff:mode"]`
- **Constitution compliance:** Art. I ✅ (canDirectAccept retorna `false` si hay invenciones `Hard`; modal de confirmación obligatorio), Art. V ✅ (diff no se renderiza como HTML)
- **A11y:** color contrast WCAG AA, keyboard nav entre entidades flagged, screen reader anuncia cada flag

## Features PLANEADAS sin specs

### 007-landing-ui (v0.5.1)

- **Estado:** 📋 PLANEADO. Spec aún no escrita.
- **Bloqueado por:** nada. Es trabajo puro de UI.
- **Componentes planeados:** `app/page.tsx` (landing), `components/landing/{hero,how-it-works,honesty-note,cta}.tsx`.
- **Prioridad:** media. Aumenta conversión pero no es crítico para el flujo core.

### 008-observability-web (v0.5.1)

- **Estado:** 📋 PLANEADO. Spec aún no escrita.
- **Bloqueado por:** el backend observability (008 en API) debe estar listo primero.
- **Componentes planeados:** error boundary global, Sentry integration (post Habeas Data gate).

### 009-auth-web (v1)

- **Estado:** 📋 PLANEADO. Spec aún no escrita.
- **Bloqueado por:** gate Habeas Data (Art. IX) — consentimiento expreso del usuario.

### 010-payments-web (v1)

- **Estado:** 📋 PLANEADO. Spec aún no escrita.
- **Bloqueado por:** gates Art. IX (ZDR + Habeas Data) + Wompi integration.

## Features ARCHIVADAS

### 001-web-mvp-original

- **Status:** 🗄️ Archivado. La spec original cubría score + adapt + export en una sola página.
- **Archive:** [specs/_archive/001-web-mvp-original/](./_archive/001-web-mvp-original/)
- **Razón del archivo:** scope demasiado grande, specs pequeñas son más testeables.

## Próximos pasos (recomendados, en orden de planificación simple)

1. **003-web-adapt-ui** (BFF ✅, UI falta) — Habilita el flujo de adaptación end-to-end. Backend ya funciona.
2. **004-web-export-ui** (BFF ✅, UI falta) — Habilita descarga de PDF. Backend ya funciona.
3. **005-web-cv-import-ui** (specs ✅, código NO) — Carga de PDF/DOCX como input. Backend 005 también specs-ready.
4. **006-web-cv-editor + 006-web-cv-diff-viewer** (specs ✅, código NO) — Editor estructurado + diff visual. Necesita 005 como upstream.
5. **007-landing-ui** (spec NO) — Aumenta conversión, sin dependencies técnicas.
6. **008-observability-web** (spec NO) — Decisiones data-driven.
7. **009-auth-web, 010-payments-web** (v1) — bloqueados por gates Art. IX.

## Reglas de mantenimiento

1. **Cada feature frontend DEBE referenciar su contraparte backend** en el spec. Sin excepción.
2. **El INDEX se actualiza AL COMMITEAR** el commit que cierra la feature.
3. **Las BFF routes** se documentan con el endpoint backend que proxyean.
4. **El frontend NUNCA habla directo con el backend** — siempre via BFF (`app/api/*/route.ts`).
5. **Copy en `lib/copy/es.ts`** — nunca hardcodeado en componentes (Constitution Art. IV).
6. **0 supresiones** — no `// @ts-ignore`, no `// eslint-disable-next-line`.
7. **Persistencia local SOLO vía `ICvStore`** (Constitution Art. III v1.1.0). Nunca `localStorage.setItem` directo en componentes.
8. **Botón "Limpiar borrador"** en cualquier feature que toque persistencia local (FR-040b).

## Convenciones de naming

- `NNN-web-kebab-case-name/` — NNN es el número correlativo con el backend.
- Ejemplos: `002-web-score-ui/`, `003-web-adapt-ui/`, `004-web-export-ui/`, `005-web-cv-import-ui/`, `006-web-cv-editor/`.
- `000-INDEX.md` (este archivo) es la única excepción al patrón numérico.
- Sub-features de una feature existente usan sufijo: `NNN-web-feature-name/sub-feature/`.

## Stack técnico

- **Next.js 16.2.7** (App Router) + React 19.2.4
- **TypeScript ^5 strict**
- **Tailwind CSS v4** (PostCSS via `@tailwindcss/postcss`)
- **pnpm 11** (frozen lockfile en CI)
- **Node 22+**
- **Sin librería UI externa** — diseño custom (consistente en todo el proyecto)

## Constitución cumplimiento (frontend)

- **Art. I (Cero invención)**: el editor (006) valida con Zod que toda entidad provenga de tokens del usuario (defense in depth FR-029a). El diff viewer (006b) bloquea "Aceptar y exportar" si hay invenciones Hard pendientes.
- **Art. III (Privacidad)**: BFF same-origin oculta el backend. Persistencia local SOLO en dispositivo del usuario vía `ICvStore` (v1.1.0). Botón "Limpiar borrador" obligatorio. Copy: "Tus datos no entrenan ninguna IA y no se guardan en nuestros servidores."
- **Art. IV (Encuadre honesto)**: copy en `lib/copy/es.ts` dice "coincidencia con la vacante + legibilidad", nunca "ATS oficial".
- **Art. V (Entrada como dato)**: nunca `dangerouslySetInnerHTML` con CV/vacante. Parsed text del import (005) se trata como dato, no se renderiza como HTML.
- **Art. VI (Clean Arch)**: BFF = `app/api/*` proxyea al backend. Browser NUNCA habla directo. Puertos frontend: `ICvStore`.

## Links externos

- **Backend INDEX:** [../BuildCv-api/specs/000-INDEX.md](../BuildCv-api/specs/000-INDEX.md)
- **Constitution:** [../BuildCv-api/.specify/memory/constitution.md](../BuildCv-api/.specify/memory/constitution.md) (v1.1.0, ley suprema)
- **AGENTS.md:** [../AGENTS.md](../AGENTS.md) (tarjeta de identidad del sub-proyecto)
- **Spec-kit:** [.specify/](../.specify/) (CLI, scripts bash, plantillas)
