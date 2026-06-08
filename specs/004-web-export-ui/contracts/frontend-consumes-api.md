# Contracts: 004-web-export-ui (Frontend)

> **Los contracts HTTP viven en el backend:** [../../BuildCv-api/specs/004-export-pdf/contracts/export-api.md](../../BuildCv-api/specs/004-export-pdf/contracts/export-api.md). Este archivo documenta cómo el frontend **consume** esos contracts.

## Browser → BFF (mismo-origin)

### POST /api/export

```typescript
// En el componente React
const blob = await requestExportPdf({
  adaptedCv: "# Juan Pérez\n\n## Resumen\nBackend dev...",
  validation: { isValid: true, severity: "None", inventions: [], warnings: [] },
  candidateName: "Juan Pérez",
});

// blob es un Blob con application/pdf
downloadBlob(blob, "cv-adapted-2026-06-08.pdf");
// → browser descarga el PDF automáticamente
```

**BFF endpoint** (ya implementado): `BuildCv-web/app/api/export/route.ts`
- Recibe POST con JSON body
- Proxyea a `${BACKEND_URL}/api/v1/export`
- Retorna el PDF binario (application/pdf) con `Content-Disposition: attachment; filename="..."`

## BFF → Backend (server-to-server)

El BFF hace el request al backend con headers correctos. Ver `BuildCv-web/app/api/export/route.ts`.

## Tipos TypeScript (en `lib/api/types.ts`)

```typescript
// Re-uso de ValidationReport (de 003)
import type { ValidationReport } from "./types";

export interface ExportRequest {
  adaptedCv: string;
  validation: ValidationReport;
  candidateName: string;
}

// El response es binario (application/pdf) — no se modela en TS.
// El browser lo descarga directamente vía blob URL.
```

## Error Handling (en `lib/api/export.ts`)

```typescript
export class ExportError extends Error {
  constructor(
    public status: number,    // 400 | 422 | 429 | 503
    public code: string,      // "EXPORT_BLOCKED_INVENTION" | "RATE_LIMIT" | "PDF_UNAVAILABLE"
    message: string
  ) {
    super(message);
  }
}
```

| Status | Significado | Acción UI |
|---|---|---|
| 400 | Validación falló (CV vacío, >50k, name >100) | Mostrar mensaje de validación (vino del backend) |
| 422 | Hard invenciones detectadas | Mostrar panel rojo con detalle + botón Regenerar |
| 429 | Rate-limit "export" (20/h) | Mensaje honesto + countdown al próximo slot |
| 503 | QuestPDF no disponible | Mensaje + retry button |

## Blob Download Pattern

```typescript
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);  // CRÍTICO: evita memory leak
}
```

## Configuración

```typescript
// lib/api/backend.ts (ya existe)
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5080";
```

`BACKEND_URL` en `.env.local` (gitignored) o variable de entorno del deploy.

## Logging Contract

```typescript
// ✓ Allowed
console.log("Export requested", { cvLength, validationSeverity, traceId });

// ✗ Prohibited (Constitution Art. III)
console.log("Adapted CV:", adaptedCv);  // NUNCA contenido
```
