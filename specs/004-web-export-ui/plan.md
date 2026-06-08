# Plan: 004-web-export-ui

**Status:** 📋 PLANEADO | **Backend counterpart:** [../../BuildCv-api/specs/004-export-pdf/](../../BuildCv-api/specs/004-export-pdf/) (✅ SHIPPED)

## Summary

UI web para consumir `POST /api/v1/export` del backend. La BFF ya existe (commit `6b6f390`). El trabajo es UI: botón "Descargar PDF" + manejo de errores + descarga via blob.

## Technical Context

- **Next.js 16.2.7** (App Router) + React 19.2.4
- **TypeScript ^5 strict**
- **Tailwind v4**
- **Sin testing framework** (M0 sin Vitest aún)

## Componentes

```
components/export/
├── export-button.tsx
├── export-error-panel.tsx
└── filename-hint.tsx
```

## BFF

`app/api/export/route.ts` ya implementado. No requiere cambios.

## Tipos

Ver [spec.md § Tipos TypeScript](./spec.md#tipos-typescript-en-libapitipests).

## API client

Ver [spec.md § API client](./spec.md#api-client-en-libapiexportts).

## Copy

Ver [spec.md § Copy](./spec.md#copy-en-libcopyest).

## Flujo de usuario

```
[AdaptPanel: success] → Click "Descargar PDF" → POST /api/export → Blob (PDF)
   ↓
[Browser descarga cv-adapted-2026-06-08.pdf]
   ↓
[Toast: "Descarga iniciada"]
```

### Manejo de errores

| Status | Significado | UI |
|---|---|---|
| 200 | OK | Toast "Descarga iniciada" + browser descarga |
| 422 | Hard invenciones | Panel rojo con mensaje + botón "Regenerar" |
| 429 | Rate-limit "export" (20/h) | Panel amarillo con countdown + link al score |
| 503 | QuestPDF no disponible | Panel gris con retry button |

## Out of scope (v0)

- Streaming visual (no aplica — es un PDF binario)
- Selección de template (v1)
- Watermark personalizado (v1)

## Next Phase

→ Phase 1: Tasks — `/speckit.tasks` (auto mode).
