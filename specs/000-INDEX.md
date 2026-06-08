# INDEX — Registro consolidado de features (BuildCv-web)

> **Entry point oficial al estado del frontend BuildCv.**
> Cualquier agente o humano que necesite saber "qué UI está hecha, qué UI está en curso, qué UI falta" debe leer esto primero.

**Última actualización:** 2026-06-08

## Relación con el backend

Este sub-proyecto es el **frontend** (BFF + UI) que consume el backend (`BuildCv-api`). Las features frontend **siempre tienen un ID correlativo** con su contraparte backend:

| Frontend | Backend | Relación |
|---|---|---|
| 002-web-score-ui | 002-score-engine | Consume `POST /api/v1/score` |
| 003-web-adapt-ui | 003-adapt-ia | Consume `POST /api/v1/adapt` |
| 004-web-export-ui | 004-export-pdf | Consume `POST /api/v1/export` |

## Estado del producto (consolidado)

| # | Feature | Hito | Status | BFF endpoint |
|---|---|---|---|---|
| 001 | `web-mvp-original` | MVP original | 🗄️ Archivado | (n/a) |
| 002 | `web-score-ui` | M0.0 | ✅ SHIPPED | `app/api/score/route.ts` |
| 003 | `web-adapt-ui` | M1.1 | 📋 PLANEADO | `app/api/adapt/route.ts` |
| 004 | `web-export-ui` | M2.1 | 📋 PLANEADO | `app/api/export/route.ts` |
| 005 | `landing-ui` | M0.1 | 📋 PLANEADO | (n/a) |
| 006 | `observability-web` | M3 | 📋 PLANEADO | (n/a) |
| 007 | `auth-web` | v1 | 📋 PLANEADO | (n/a) |
| 008 | `payments-web` | v1 | 📋 PLANEADO | (n/a) |

## Leyenda de status

- ✅ **SHIPPED** — feature cerrada, en producción
- 🚧 **EN CURSO** — implementación activa
- 📋 **PLANEADO** — spec/plan/tasks escritos, esperando para implementar
- 🗄️ **ARCHIVADO** — feature antigua, conservada solo para historia

## Features SHIPPED (detalle)

### 002-web-score-ui (M0.0)

- **Spec:** [specs/002-web-score-ui/spec.md](./002-web-score-ui/spec.md)
- **Backend:** [../../BuildCv-api/specs/002-score-engine/](../../BuildCv-api/specs/002-score-engine/) (✅ SHIPPED)
- **Estado:** Score gauge animado + component bars + keyword cloud + fix list + honesty note.
- **Path frontend:** `app/analizar/page.tsx` + `components/analyzer/`
- **BFF:** `app/api/score/route.ts` (proxyea a `POST ${BACKEND_URL}/api/v1/score`)
- **Commit:** `ed13890` (M0 score engine original)

## Features PLANEADAS (sin implementar)

### 003-web-adapt-ui (M1.1)

- **Spec:** [specs/003-web-adapt-ui/spec.md](./003-web-adapt-ui/spec.md)
- **Backend counterpart:** ✅ SHIPPED con StubAiClient.
- **Componentes planeados:** `adapt-panel.tsx`, `adapted-cv-viewer.tsx`, `delta-improvements.tsx`, `severity-badge.tsx`, `regenerate-button.tsx`.
- **BFF:** ya implementado (`f94999f`).
- **Bloqueado por:** nada. Trabajo puro de UI.
- **Prioridad:** alta (cierra el flujo de valor end-to-end).

### 004-web-export-ui (M2.1)

- **Spec:** [specs/004-web-export-ui/spec.md](./004-web-export-ui/spec.md)
- **Backend counterpart:** ✅ SHIPPED con QuestPDF.
- **Componentes planeados:** `export-button.tsx`, `export-error-panel.tsx`, `filename-hint.tsx`.
- **BFF:** ya implementado (`6b6f390`).
- **Bloqueado por:** nada. Trabajo puro de UI.
- **Prioridad:** alta (cierra el flujo: score → adapt → export).

### 005-landing-ui (M0.1)

- **Estado:** 📋 PLANEADO. Spec aún no escrito.
- **Bloqueado por:** nada. Es trabajo puro de UI.
- **Componentes planeados:** `app/page.tsx` (landing), `components/landing/{hero,how-it-works,honesty-note,cta}.tsx`.
- **Prioridad:** media. Aumenta conversión pero no es crítico para el flujo core.

### 006-observability-web (M3)

- **Estado:** 📋 PLANEADO. Spec aún no escrito.
- **Bloqueado por:** el backend 005-observability debe estar listo primero.
- **Componentes planeados:** error boundary global, Sentry integration (post Habeas Data gate).

### 007-auth-web (v1)

- **Estado:** 📋 PLANEADO. Spec aún no escrito.
- **Bloqueado por:** gate Habeas Data (Art. IX) — consentimiento expreso del usuario.

### 008-payments-web (v1)

- **Estado:** 📋 PLANEADO. Spec aún no escrito.
- **Bloqueado por:** gates Art. IX (ZDR + Habeas Data) + Wompi integration.

## Features ARCHIVADAS

### 001-web-mvp-original

- **Status:** 🗄️ Archivado. La spec original cubría score + adapt + export en una sola página.
- **Archive:** [specs/_archive/001-web-mvp-original/](./_archive/001-web-mvp-original/)
- **Razón del archivo:** scope demasiado grande, specs pequeñas son más testeables.

## Próximos pasos (recomendados)

1. **003-web-adapt-ui** (M1.1) — Habilita el flujo de adaptación end-to-end. Sin esto, el backend 003 está subutilizado.
2. **004-web-export-ui** (M2.1) — Habilita descarga de PDF. Sin esto, los usuarios no pueden usar el output.
3. **005-landing-ui** (M0.1) — Aumenta conversión, sin dependencies técnicas.
4. **006-observability-web** (M3) — Decisiones data-driven.

## Reglas de mantenimiento

1. **Cada feature frontend DEBE referenciar su contraparte backend** en el spec. Sin excepción.
2. **El INDEX se actualiza AL COMMITEAR** el commit que cierra la feature.
3. **Las BFF routes** se documentan con el endpoint backend que proxyean.
4. **El frontend NUNCA habla directo con el backend** — siempre via BFF (`app/api/*/route.ts`).
5. **Copy en `lib/copy/es.ts`** — nunca hardcodeado en componentes (Constitution Art. IV).
6. **0 supresiones** — no `// @ts-ignore`, no `// eslint-disable-next-line`.

## Convenciones de naming

- `NNN-web-kebab-case-name/` — NNN es el número correlativo con el backend.
- Ejemplos: `002-web-score-ui/`, `003-web-adapt-ui/`, `004-web-export-ui/`.
- `000-INDEX.md` (este archivo) es la única excepción al patrón numérico.

## Stack técnico

- **Next.js 16.2.7** (App Router) + React 19.2.4
- **TypeScript ^5 strict**
- **Tailwind CSS v4** (PostCSS via `@tailwindcss/postcss`)
- **pnpm 11** (frozen lockfile en CI)
- **Node 22+**
- **Sin librería UI externa** — diseño custom (consistente en todo el proyecto)

## Constitución cumplimiento (frontend)

- **Art. III (Privacidad)**: BFF same-origin oculta el backend, sin telemetría, sin guardar CV en localStorage.
- **Art. IV (Encuadre honesto)**: copy en `lib/copy/es.ts` dice "coincidencia con la vacante + legibilidad", nunca "ATS oficial".
- **Art. V (Entrada como dato)**: nunca `dangerouslySetInnerHTML` con CV/vacante.
- **Art. VI (Clean Arch)**: BFF = `app/api/*` proxyea al backend. Browser NUNCA habla directo.

## Links externos

- **Backend INDEX:** [../../BuildCv-api/specs/000-INDEX.md](../../BuildCv-api/specs/000-INDEX.md)
- **Constitution:** [../../BuildCv-api/.specify/memory/constitution.md](../../BuildCv-api/.specify/memory/constitution.md) (v1.0.0, ley suprema)
- **AGENTS.md:** [../../AGENTS.md](../../AGENTS.md) (tarjeta de identidad del sub-proyecto)
- **Spec-kit:** [.specify/](../../.specify/) (CLI, scripts bash, plantillas)
