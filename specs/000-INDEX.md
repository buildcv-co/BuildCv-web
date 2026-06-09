# INDEX — Registro consolidado de features (BuildCv-web)

> **Entry point oficial al estado del frontend BuildCv.**
> Cualquier agente o humano que necesite saber "qué UI está hecha, qué UI está en curso, qué UI falta" debe leer esto primero.

**Última actualización:** 2026-06-09 (v0.5.1: import + editor + diff-viewer + landing + observability shipped; pendiente v1 con auth y payments)

## Relación con el backend

Este sub-proyecto es el **frontend** (BFF + UI) que consume el backend (`BuildCv-api`). Las features frontend **siempre tienen un ID correlativo** con su contraparte backend:

| Frontend | Backend | Relación |
|---|---|---|
| 002-web-score-ui | 002-score-engine ✅ | Consume `POST /api/v1/score` |
| 003-web-adapt-ui | 003-adapt-ia ✅ | Consume `POST /api/v1/adapt` |
| 004-web-export-ui | 004-export-pdf ✅ | Consume `POST /api/v1/export` |
| 005-web-cv-import-ui | 005-cv-pdf-docx-import ✅ | Consume `POST /api/v1/import` (NUEVO v0.5) |
| 006-web-cv-editor | (frontend only) ✅ | Editor estructurado; re-usa 002/003/004 con texto editado |
| 006-web-cv-diff-viewer | (frontend only) ✅ | Diff visual original vs adaptado |

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
| 003 | `web-adapt-ui` | v0 / M1.1 | ✅ SHIPPED | `app/api/adapt/route.ts` |
| 004 | `web-export-ui` | v0 / M2.1 | ✅ SHIPPED | `app/api/export/route.ts` |
| 005 | `web-cv-import-ui` | v0.5 / M3 | ✅ SHIPPED | `app/api/import/route.ts` |
| 006 | `web-cv-editor` | v0.5 / M4 | ✅ SHIPPED | (re-usa 002/003/004) |
| 006b | `web-cv-diff-viewer` | v0.5 / M4 | ✅ SHIPPED | (re-usa 003) |
| 007 | `landing-ui` | v0.5.1 | ✅ SHIPPED | (n/a) |
| 008 | `observability-web` | v0.5.1 | ✅ SHIPPED | (n/a) |
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

### 003-web-adapt-ui (v0 / M1.1)

- **Spec:** [specs/003-web-adapt-ui/spec.md](./003-web-adapt-ui/spec.md)
- **Backend counterpart:** ✅ SHIPPED con StubAiClient (`BuildCv-api/specs/003-adapt-ia/`).
- **Estado:** Panel de adaptación con severity indicator (verde/amarillo/rojo), delta de mejora, export gate, rate-limit handling.
- **Path frontend:** `components/adapt/` + `lib/api/adapt.ts`
- **BFF:** `app/api/adapt/route.ts` (proxyea a `POST ${BACKEND_URL}/api/v1/adapt`)
- **Commit:** `19577ab` (2026-06-09)
- **Tests:** unit + E2E verdes al cierre.

### 004-web-export-ui (v0 / M2.1)

- **Spec:** [specs/004-web-export-ui/spec.md](./004-web-export-ui/spec.md)
- **Backend counterpart:** ✅ SHIPPED con QuestPDF.
- **Estado:** Botón "Descargar PDF" con spinner, rate-limit y blocked-invention handling.
- **Path frontend:** `components/export/` + `lib/api/export.ts`
- **BFF:** `app/api/export/route.ts` (proxyea a `POST ${BACKEND_URL}/api/v1/export`)
- **Commit:** `45ec05d` (2026-06-09)

### 005-web-cv-import-ui (v0.5 / M3)

- **Spec:** [specs/005-web-cv-import-ui/spec.md](./005-web-cv-import-ui/spec.md)
- **Plan:** [specs/005-web-cv-import-ui/plan.md](./005-web-cv-import-ui/plan.md)
- **Research:** [specs/005-web-cv-import-ui/research.md](./005-web-cv-import-ui/research.md)
- **Data model:** [specs/005-web-cv-import-ui/data-model.md](./005-web-cv-import-ui/data-model.md)
- **Quickstart:** [specs/005-web-cv-import-ui/quickstart.md](./005-web-cv-import-ui/quickstart.md)
- **Tasks:** [specs/005-web-cv-import-ui/tasks.md](./005-web-cv-import-ui/tasks.md)
- **Contracts:** [specs/005-web-cv-import-ui/contracts/frontend-consumes-api.md](./005-web-cv-import-ui/contracts/frontend-consumes-api.md)
- **Estado:** Drag/drop PDF/DOCX, extracción de texto, secciones detectadas con confidence, handoff al editor.
- **Path frontend:** `app/importar/page.tsx` + `components/import/{FileUpload, ImportButton, ImportResultPanel}.tsx` + `lib/api/import.ts`
- **BFF:** `app/api/import/route.ts` (proxy a `POST ${BACKEND_URL}/api/v1/import`, `runtime = "nodejs"` por multipart >4 MB)
- **Commits:** web `318a1c0` + backend `c61bdf4` (2026-06-09)

### 006-web-cv-editor (v0.5 / M4)

- **Spec:** [specs/006-web-cv-editor/spec.md](./006-web-cv-editor/spec.md)
- **Plan:** [specs/006-web-cv-editor/plan.md](./006-web-cv-editor/plan.md)
- **Research:** [specs/006-web-cv-editor/research.md](./006-web-cv-editor/research.md)
- **Data model:** [specs/006-web-cv-editor/data-model.md](./006-web-cv-editor/data-model.md)
- **Quickstart:** [specs/006-web-cv-editor/quickstart.md](./006-web-cv-editor/quickstart.md)
- **Tasks:** [specs/006-web-cv-editor/tasks.md](./006-web-cv-editor/tasks.md)
- **Contracts:** [specs/006-web-cv-editor/contracts/frontend-internal.md](./006-web-cv-editor/contracts/frontend-internal.md)
- **Estado:** 8 secciones estructuradas con Zod round-trip, persistencia local con `ICvStore` (LocalStorage + IndexedDB fallback), botón "Limpiar borrador", re-score en caliente, export a Markdown.
- **Path frontend:** `app/analizar/editar/page.tsx` + `components/editor/`
- **Stack shipped:** `zod` v3 (Tiptap/Zustand/idb/nanoid/remark NO instalados — decisión técnica documentada en `tasks.md` L9-24, deuda para v1)
- **Persistencia:** `ICvStore` port (Art. VI v1.1.0) con `LocalStorageCvStore` (default). `IndexedDbCvStore` deferred a v1 (deuda técnica — quota overflow se surfacea al usuario vía `error-reporter`/`EditorSaveIndicator`).
- **Engine version:** `0.5.0` (sello en cada Draft, simetría con backend)
- **Constitution compliance:** Art. I ✅ (FR-029a: Zod rechaza entidades nuevas en round-trip), Art. III ✅ (FR-040b botón "Limpiar borrador" obligatorio), Art. VI ✅ (`ICvStore` puerto oficial)
- **A11y:** WCAG 2.2 AA, keyboard nav completa, ARIA labels por sección
- **Commit:** `748611d` (2026-06-09)

### 006-web-cv-diff-viewer (v0.5 / M4) — sub-feature del editor

- **Spec:** [specs/006-web-cv-diff-viewer/spec.md](./006-web-cv-diff-viewer/spec.md)
- **Plan:** [specs/006-web-cv-diff-viewer/plan.md](./006-web-cv-diff-viewer/plan.md)
- **Research:** [specs/006-web-cv-diff-viewer/research.md](./006-web-cv-diff-viewer/research.md)
- **Data model:** [specs/006-web-cv-diff-viewer/data-model.md](./006-web-cv-diff-viewer/data-model.md)
- **Quickstart:** [specs/006-web-cv-diff-viewer/quickstart.md](./006-web-cv-diff-viewer/quickstart.md)
- **Tasks:** [specs/006-web-cv-diff-viewer/tasks.md](./006-web-cv-diff-viewer/tasks.md)
- **Contracts:** [specs/006-web-cv-diff-viewer/contracts/frontend-internal.md](./006-web-cv-diff-viewer/contracts/frontend-internal.md)
- **Estado:** Visor unified / side-by-side con word-level diff, badges rojo para invenciones Soft/Hard, modal de confirmación para Hard sin revisar, edición inline con Zod.
- **Path frontend:** `app/analizar/diff/page.tsx` + `components/diff/`
- **Stack shipped:** `diff` (jsdiff v5, BSD-3-Clause) + custom React renderer (edición inline con `<input>` controlado, no Tiptap)
- **Modos:** unified (mobile <768px default) / side-by-side (desktop ≥768px default), toggle persiste en `localStorage["buildcv:diff:mode"]`
- **Constitution compliance:** Art. I ✅ (canDirectAccept retorna `false` si hay invenciones `Hard`; modal de confirmación obligatorio), Art. V ✅ (diff no se renderiza como HTML)
- **A11y:** color contrast WCAG AA, keyboard nav entre entidades flagged, screen reader anuncia cada flag
- **Commit:** `4bf92b7` (2026-06-09)

### 007-landing-ui (v0.5.1)

- **Spec:** [specs/007-landing-ui/spec.md](./007-landing-ui/spec.md)
- **Estado:** Hero + steps + trust signals + FAQ + metadata completa (OpenGraph, Twitter, canonical, robots, sitemap, JSON-LD) + error pages (404, 500, global-error).
- **Path frontend:** `app/page.tsx` + `components/landing/{hero, how-it-works, honesty-note, cta, faq, trust-signals, error-fallback}.tsx` + `app/{error,not-found,global-error}.tsx`
- **Commit:** `a312662` (2026-06-09)

### 008-observability-web (v0.5.1)

- **Spec:** [specs/008-observability-web/spec.md](./008-observability-web/spec.md)
- **Estado:** Client-side error reporting puro (NO third-party), global React error boundary (`<ErrorBoundary>` con `react-error-boundary`), dev overlay de errores, helpers en `lib/observability/`.
- **Path frontend:** `components/observability/` + `lib/observability/`
- **Commit:** `4168475` (2026-06-09)

## Features PLANEADAS (v1 backlog)

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

## Próximos pasos (v1 backlog, en orden de desbloqueo)

1. **009-auth-web** — bloqueado por gate Habeas Data (Art. IX). Habilita cuentas, historial, sync entre devices.
2. **010-payments-web** — bloqueado por gates Art. IX (ZDR + Habeas Data) + Wompi integration. Monetización.
3. **v1 polish sprints** (opcional) — agregar Tiptap al editor (deuda documentada en `006-web-cv-editor/tasks.md`), i18n (en/pt), 008-observability-api (backend), accessibility audit WCAG 2.2 AAA.

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
- **Helpers de observabilidad/diff/parsing** (no son librería UI): `web-vitals@^4` (Core Web Vitals en dev overlay), `react-error-boundary@^5` (error boundary global), `diff@^5` (jsdiff, word-level Myers diff para 006b), `zod@^3` (schemas de validación para 006)

## Constitución cumplimiento (frontend)

- **Art. I (Cero invención)**: el editor (006) valida con Zod que toda entidad provenga de tokens del usuario (defense in depth FR-029a). El diff viewer (006b) bloquea "Aceptar y exportar" si hay invenciones Hard pendientes.
- **Art. III (Privacidad)**: BFF same-origin oculta el backend. Persistencia local SOLO en dispositivo del usuario vía `ICvStore` (v1.1.0). Botón "Limpiar borrador" obligatorio. Copy: "Tus datos no entrenan ninguna IA y no se guardan en nuestros servidores."
- **Art. IV (Encuadre honesto)**: copy en `lib/copy/es.ts` dice "coincidencia con la vacante + legibilidad", nunca "ATS oficial".
- **Art. V (Entrada como dato)**: nunca `dangerouslySetInnerHTML` con CV/vacante. Parsed text del import (005) se trata como dato, no se renderiza como HTML.
- **Art. VI (Clean Arch)**: BFF = `app/api/*` proxyea al backend. Browser NUNCA habla directo. Puertos frontend: `ICvStore` (storage local del editor 006), `ICvParser` (puerto backend del import 005 — `PdfCvParser` / `DocxCvParser`).

## Links externos

- **Backend INDEX:** [../BuildCv-api/specs/000-INDEX.md](../BuildCv-api/specs/000-INDEX.md)
- **Constitution:** [../BuildCv-api/.specify/memory/constitution.md](../BuildCv-api/.specify/memory/constitution.md) (v1.1.0, ley suprema)
- **AGENTS.md:** [../AGENTS.md](../AGENTS.md) (tarjeta de identidad del sub-proyecto)
- **Spec-kit:** [.specify/](../.specify/) (CLI, scripts bash, plantillas)
