# BuildCv-web · AGENTS

> Frontend **Next.js 16 / TypeScript** de **BuildCv** — BFF same-origin que proxyea al backend .NET y UI de análisis determinista de CV vs vacante. Backend en directorio hermano: `../BuildCv-api/` (repositorio independiente).
>
> Este archivo describe el proyecto. Las reglas operativas del producto (Constitución Art. I–IX) viven en `../BuildCv-api/.specify/memory/constitution.md` y aplican también al frontend (encuadre honesto, privacidad, cero invención).

## Stack

| Herramienta | Versión |
|---|---|
| Next.js | 16.2.7 (App Router) |
| React | 19.2.4 |
| TypeScript | ^5 (strict) |
| Tailwind CSS | ^4 (PostCSS via `@tailwindcss/postcss`) |
| pnpm | 11 (frozen lockfile en CI) |
| Node | 22+ |

## Comandos (CI los corre; ejecútalos antes de cerrar tarea)

```bash
pnpm install                          # instala dependencias
pnpm dev                              # http://localhost:3000
pnpm lint                             # ESLint (eslint-config-next + TS)
pnpm build                            # next build (verifica compilación)
pnpm test                             # vitest run (unit + integración con jsdom)
pnpm test:watch                       # vitest en modo watch
pnpm test:cov                         # vitest run --coverage (reporte v8 + html)
pnpm test:e2e                         # playwright test (E2E chromium)
pnpm test:e2e:ui                      # playwright test --ui (modo interactivo)
```

**CI ground truth** (`.github/workflows/ci.yml`): `pnpm install --frozen-lockfile` → `pnpm run lint` → `pnpm run build` → `pnpm test` → `pnpm test:e2e`.

## Arquitectura

```
Browser ──same-origin──> app/api/* (BFF Route Handlers) ──server-to-server──> .NET Backend (:5080)
```

- El navegador **nunca** habla directo con el backend. Todo pasa por Route Handlers same-origin que ocultan y proxyean.
- `BACKEND_URL` en `.env.local` (default `http://localhost:5080`). Ver `.env.example`.

### Layout de directorios

```
app/                  # App Router pages + API routes
  page.tsx            # Landing
  analizar/page.tsx   # Analizador
  layout.tsx          # Root layout (Fraunces + Geist fonts, lang=es-CO)
  globals.css         # Tailwind v4 + tema oscuro cálido
  api/
    score/route.ts    # POST → proxy al backend /api/v1/score
    health/route.ts   # GET → proxy /health/ready
    adapt/            # POST → proxy al backend /api/v1/adapt
    export/           # POST → proxy al backend /api/v1/export
components/
  analyzer/           # 7 componentes del analizador
    analyzer.tsx      # Orquestador
    input-panel.tsx   # Formulario CV + vacante
    score-gauge.tsx   # Anillo de puntaje animado
    component-bars.tsx
    keyword-cloud.tsx
    fix-list.tsx
    honesty-note.tsx
lib/
  api/
    backend.ts        # BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5080"
    score.ts          # requestScore() — llama al BFF, maneja errores con ScoreError
    types.ts          # ScoreResponse y tipos de contrato (congelados con el backend)
  copy/
    es.ts             # Copy en español (todo el texto visible de la UI)
  utils/              # Utilidades (cn.ts, prefers-reduced-motion.ts, demo-data.ts)
```

## Convenciones de código

- **Sin librería UI externa** — diseño custom con Tailwind v4, tema oscuro cálido, tipografía Fraunces (display) + Geist (sans/mono). Sin shadcn/ui, sin componentes de terceros.
- **Copy centralizado** — todo texto visible al usuario en `lib/copy/es.ts`, nunca hardcodeado en componentes.
- **`@/` path alias** apunta a `./` (`tsconfig.json paths: { "@/*": ["./*"] }`).
- **ESLint flat config** (`eslint.config.mjs`) — `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- **TypeScript strict** — `strict: true` en `tsconfig.json`, `noEmit: true`.

## Testing framework

- **Vitest 2** para unit + integración con `jsdom`. Cobertura con `@vitest/coverage-v8` (provider `v8`).
- **React Testing Library 16** + `@testing-library/user-event` + `@testing-library/jest-dom` para componentes.
- **Playwright 1** para E2E — solo **chromium** en v0.5 (firefox/webkit diferidos para ahorrar tiempo de CI).
- TDD activo vía Constitución Art. VIII. Escribe el test antes del código en cada user story.

### Dónde vive cada cosa

```
vitest.config.ts          # resolve.alias `@/*` → ./*, jsdom, setupFiles
vitest.setup.ts           # importa jest-dom + cleanup automático
playwright.config.ts      # testDir e2e, baseURL :3000, webServer pnpm dev
e2e/
  smoke.spec.ts           # smoke E2E (landing) — verifica el setup
lib/utils/cn.test.ts      # smoke unit (cn) — verifica el setup
```

- Tests unit co-localizados con el código (`foo.ts` + `foo.test.ts`) en `lib/`, `components/`, `app/`.
- Specs E2E en `e2e/`, independientes de los unit (Playwright los excluye de Vitest vía `exclude`).
- Reportes de cobertura: `coverage/` (html) — ya está en `.gitignore`.
- Reportes Playwright: `playwright-report/`, `test-results/` — ya están en `.gitignore`.

### Regla v0.5 — checklist E2E manual sigue vigente

Hasta que las suites E2E por feature crezcan, **mantén el checklist E2E manual** dentro de cada `tasks.md` (006a, 006b). Es el gate de ship además de los tests automatizados. El checklist manual cubre flujos críticos que la suite aún no cubre (subida de archivos, diff grande, mobile, etc.).

## Encuadre honesto (Constitución Art. IV)

Todo el copy público debe decir "coincidencia con la vacante + legibilidad para sistemas automáticos", **nunca** "puntaje ATS oficial" ni "garantía de empleo". Verifica `lib/copy/es.ts` y los `metadata.description` en páginas.

## Privacidad (Constitución Art. III)

- **v0 no persiste nada** — no hay base de datos, no se guardan CVs ni vacantes.
- Los datos viajan al backend solo para el análisis y se descartan al responder.
- Footer de la landing: "Tus datos no entrenan ninguna IA y no se guardan."

## Next.js 16 — advertencia

Esta versión tiene cambios de API respecto a versiones anteriores. Antes de escribir código:
- Revisa `node_modules/next/dist/docs/` si existe o consulta la documentación oficial de Next.js 16.
- Atento a deprecation notices en la salida de `pnpm build` y `pnpm dev`.

## Entry points

| Necesitas… | Ve a |
|---|---|
| Reglas del producto (constitución) | `../BuildCv-api/.specify/memory/constitution.md` |
| Comandos API, specs, hitos | `../BuildCv-api/AGENTS.md` |
| Root monorepo navegación | `../AGENTS.md` |
| Endpoint contracts | `specs/000-INDEX.md` (ver detalle por feature) |
| Specs del producto | `specs/000-INDEX.md` |

## Proceso

- **Pre-flight**: `pnpm lint` + `pnpm build` en verde antes de decir "listo".
- **No commits sin pedirlo** — revisa `git status` + `git diff`, stagea solo intencional, nunca secretos.
- **No comentarios en código** — refactoriza hasta que se explique solo.
- **0 supresiones** — no `// @ts-expect-error`, no `// @ts-ignore`, no `// eslint-disable-next-line`.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
