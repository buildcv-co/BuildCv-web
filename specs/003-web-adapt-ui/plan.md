# Plan: 003-web-adapt-ui

**Status:** ✅ SHIPPED (commit `19577ab`) | **Backend counterpart:** [../../../BuildCv-api/specs/003-adapt-ia/](../../../BuildCv-api/specs/003-adapt-ia/) (✅ SHIPPED)

## Summary

Construir la UI web para consumir `POST /api/v1/adapt` del backend. La BFF (`app/api/adapt/route.ts`) ya está implementada (commit `f94999f`). El trabajo es puramente de UI: componentes React + estado + copy en español.

## Technical Context

- **Next.js 16.2.7** (App Router) + React 19.2.4 (Server Components por defecto)
- **TypeScript ^5 strict** — sin `any`, sin `// @ts-ignore`
- **Tailwind v4** con `@theme` — sin shadcn/ui
- **Sin testing framework instalado aún** — v0 sin Vitest. Los tests llegan en hitos futuros (M3+).
- **Sin librería UI externa** — custom design system consistente con 002-web-score-ui
- **Sin SSE/MDX** — renderizar `adaptedCv` como `<pre>` con `whitespace-pre-wrap` (suficiente para v0)

## Componentes (Next.js 16, App Router)

```
components/adapt/
├── adapt-panel.tsx           # "use client" — orquestador con estado
├── adapted-cv-viewer.tsx     # Renderiza adaptedCv en <pre>
├── delta-improvements.tsx     # Lista de invenciones Hard/Soft
├── severity-badge.tsx        # Verde/Amarillo/Rojo
└── regenerate-button.tsx     # Para 422 (Hard invenciones)
```

## BFF

`app/api/adapt/route.ts` **ya existe** (implementado en 003 del API session). No requiere cambios.

## Tipos

Ver [spec.md § Tipos TypeScript](./spec.md#tipos-typescript-en-libapitipests).

## API client

Ver [spec.md § API client](./spec.md#api-client-en-libapiadapts).

## Copy (en `lib/copy/es.ts`)

Ver [spec.md § Copy](./spec.md#copy-en-libcopyest).

## Flow de usuario

```
[Score: 62] → Click "Adaptar" → POST /api/adapt → [Adapted: 78, Validation: Warning]
   ↓
[Panel render] → severity badge (amarillo) → delta improvements (3 items)
   ↓
User edita si quiere (futuro) o click "Exportar PDF" → POST /api/export
```

## Out of scope (v0)

- Streaming visual (M1.5)
- Editor inline del CV (v1)
- Comparación side-by-side (v1)
- Tests automatizados (M3+)

## Next Phase

→ Phase 1: Tasks — `/speckit.tasks` (auto mode) genera `tasks.md` con TDD ordering.
→ Phase 2: Implement — `/sdd-apply` o trabajo manual.
