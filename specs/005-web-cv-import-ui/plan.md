# Plan: 005-web-cv-import-ui

**Status:** 📋 PLANEADO | **Backend counterpart:** [../../BuildCv-api/specs/005-cv-pdf-docx-import/](../../BuildCv-api/specs/005-cv-pdf-docx-import/) (specs escritos, implementación TDD-ordenada)

## Summary

UI web para consumir `POST /api/v1/import` del backend. El frontend **no parsea**: solo sube el archivo vía el BFF `app/api/import/route.ts` y muestra el `ImportResult` al usuario. El handoff al editor (006) ocurre vía state o `localStorage` transitorio (no en URL).

## Technical Context

- **Next.js 16.2.7** (App Router) + React 19.2.4
- **TypeScript ^5 strict**
- **Tailwind v4**
- **Zod** para validación runtime
- **Sin testing framework** (no hay Vitest aún en M0/M1; tests manuales + checklist E2E)
- **Sin librería UI externa** (diseño custom)

## Componentes

```
components/import/
├── file-upload.tsx              # Drag/drop + click. Validación client-side.
├── import-button.tsx             # Botón con state machine.
├── import-result-panel.tsx       # Renderiza text + sections + warnings.
└── import-error-panel.tsx        # Panel rojo para errores.
```

## BFF

`app/api/import/route.ts` — proxy multipart al backend. Runtime `nodejs` (necesario para multipart >4 MB; el runtime `edge` de Vercel tiene límite de 4 MB).

```typescript
import { BACKEND_URL } from "@/lib/api/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const upstream = await fetch(`${BACKEND_URL}/api/v1/import`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}
```

## Tipos

Ver [spec.md § Tipos TypeScript](./spec.md#tipos-typescript-en-libapitipests) para los Zod schemas exactos.

## API client

Ver [spec.md § API client](./spec.md#api-client-en-libapiimportts) para `requestImport` y `validateFile`.

## Copy

Ver [spec.md § Copy](./spec.md#copy-en-libcopyest) para `IMPORT_COPY` en `lib/copy/es.ts`.

## Flujo de usuario

```
[/importar: idle]
   ↓
[User drops PDF] → [FileUpload: validate client-side]
   ↓ ok
[ImportButton: loading]
   ↓ POST /api/import → BFF → backend
   ↓
[ImportResultPanel: success]
   ↓
[User clicks "Usar en editor"]
   ↓ navigate /editor?traceId=...
   ↓ state: { importedText, importedSections }
   ↓
[Editor (006) loads importedText into textarea]
```

### Manejo de errores

| Status | Significado | UI |
|---|---|---|
| 200 | OK | `ImportResultPanel` con `text`, `sections[]`, `warnings[]`. |
| 400 | Validation | `ImportErrorPanel` rojo con detalle. |
| 413 | `IMPORT_TOO_LARGE` | `ImportErrorPanel` "El archivo supera el límite de 5 MB." |
| 415 | `IMPORT_UNSUPPORTED_MEDIA` | `ImportErrorPanel` "Tipo de archivo no soportado." |
| 422 | `IMPORT_PDF_ENCRYPTED`, `IMPORT_SCANNED_PDF`, `IMPORT_DOCX_PROTECTED`, etc. | `ImportErrorPanel` con mensaje específico del `detail`. |
| 429 | `IMPORT_RATE_LIMIT_EXCEEDED` | Toast amarillo con countdown. |
| 503 | `IMPORT_ENGINE_ERROR` | `ImportErrorPanel` gris con retry button. |
| 0 (network) | `NETWORK_ERROR` | `ImportErrorPanel` "No pudimos conectar con el servidor." |

## Accesibilidad (WCAG 2.2 AA)

- **FileUpload**: keyboard-navigable (`Tab` + `Enter`/`Space`), `aria-label`, `aria-describedby` con instrucciones, `<input type="file">` oculto que se activa programáticamente.
- **ImportResultPanel**: `aria-live="polite"` para anunciar cambios de estado.
- **ImportErrorPanel**: `role="alert"` para anuncios inmediatos a lectores de pantalla.
- **Focus management**: al abrir el panel de error, el foco se mueve al título del panel.
- **Contraste**: 4.5:1 para texto, 3:1 para texto grande. Validar con Lighthouse o axe-core.

## Validación client-side (defense in depth, Art. I FR-029a)

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function validateFile(file: File): { ok: true } | { ok: false; reason: string } {
  if (file.size === 0) return { ok: false, reason: "El archivo está vacío." };
  if (file.size > MAX_FILE_SIZE) return { ok: false, reason: "El archivo supera el límite de 5 MB." };
  if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
    return { ok: false, reason: "Tipo de archivo no soportado. Sube un PDF o DOCX." };
  }
  return { ok: true };
}
```

La validación **no duplica la del backend** (que es la fuente de verdad), pero evita round-trips innecesarios y mejora UX.

## Handoff al editor (006)

El editor (006) es una feature futura. Mientras tanto:
- Si 006 no existe, el botón "Usar en editor" muestra "Próximamente" y está deshabilitado.
- Cuando 006 exista, el botón navega a `/editor?traceId=...` y pasa el `importedText` + `importedSections` vía state/context.

**Decisión: NO usar URL params para el texto** (PII en query strings, se loguea en servidores proxy). Usar `sessionStorage` con cleanup automático al cerrar la pestaña, o pasar vía un context provider que vive en la sesión.

## Estructura de archivos a crear

```
app/
└── importar/
    └── page.tsx                    # Página principal que orquesta FileUpload + Result + Error

components/import/
├── file-upload.tsx                 # Componente drag/drop
├── import-button.tsx               # Botón con state machine
├── import-result-panel.tsx         # Panel de resultado
└── import-error-panel.tsx          # Panel de error

lib/api/
├── import.ts                       # requestImport + validateFile + ImportError
└── types.ts                        # ImportResultSchema (extender)

lib/copy/
└── es.ts                           # IMPORT_COPY (extender)
```

## Tests (sin framework instalado)

Pendiente Vitest en M3+. Mientras tanto, **checklist E2E manual** (ver [quickstart.md § Tests E2E manuales](./quickstart.md#tests-e2e-manuales)).

## Out of scope (v0.5)

- Tests automatizados (Vitest en M3+).
- Drag/drop de múltiples archivos.
- Previsualización del PDF antes de subir.
- Soporte para `.rtf`, `.odt`, `.pages`, `.txt` (v1).
- Historial de imports (v1 con cuentas).
- Integración con almacenamiento en la nube (v1).

## Next Phase

→ Phase 1: Tasks — [tasks.md](./tasks.md) (TDD-ordered, con checklist E2E en lugar de Vitest).
