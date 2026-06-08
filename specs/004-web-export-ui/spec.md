# Feature 004-web-export-ui — UI de Export PDF

> **Status:** 📋 PLANEADO (frontend de la 004 del API) · **Prioridad:** M2.1
> **Backend counterpart:** [../../BuildCv-api/specs/004-export-pdf/](../../BuildCv-api/specs/004-export-pdf/) (✅ SHIPPED con QuestPDF)
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)

## Resumen

Construir la UI web que consume el endpoint `POST /api/v1/export` del backend (004-export-pdf). El usuario podrá:

1. Click "Descargar PDF" después de una adaptación exitosa
2. Ver un spinner mientras se genera el PDF (BFF → backend :5080 → QuestPDF)
3. Recibir el PDF como descarga automática del browser
4. Ver mensajes de error honestos si:
   - 422 — Hard invenciones detectadas (Constitution Art. I)
   - 429 — Rate-limit "export" 20/h agotado
   - 503 — QuestPDF no disponible

**Constitución cumplimiento:**
- **Art. III (Privacidad)**: BFF proxyea, sin telemetría, sin guardar PDF en localStorage.
- **Art. IV (Encuadre honesto)**: copy dice "Descargar PDF adaptado", NO "CV optimizado para ATS".
- **Art. VI (Clean Arch)**: BFF = `app/api/export/route.ts` ya implementado (commit `6b6f390`).
- **Art. VII (Rate-limit)**: 20/h por IP, mensaje honesto cuando se agota.

## Stack técnico

- **Next.js 16.2.7** (App Router) + React 19.2.4
- **TypeScript ^5 strict**
- **Tailwind v4**
- **Sin librería UI externa**
- **BFF pattern**: `app/api/export/route.ts` ya proxyea a `${BACKEND_URL}/api/v1/export` con `Content-Disposition` header.

## User Scenarios

### User Story 1 — Botón "Descargar PDF" (Priority: P1)

Después de una adaptación exitosa, el usuario ve un botón prominente "Descargar PDF". Al hacer click, ve un spinner, luego el browser descarga `cv-adapted-2026-06-08.pdf` automáticamente.

**Acceptance Scenarios**:
1. Click "Descargar" → spinner 1-2s → browser descarga PDF (~46 KB).
2. El filename es `cv-adapted-2026-06-08.pdf` (no "ats-ready.pdf", no "optimized.pdf").
3. El PDF se abre correctamente (válido PDF v1.4 con marca de agua honesta).

### User Story 2 — Manejo de 422 (Hard invenciones) (Priority: P1)

Si la adaptación tiene Hard invenciones, el endpoint retorna 422. La UI debe mostrar un panel rojo: "El CV adaptado tiene X invenciones Hard: [FakeCorp]. Regenera la adaptación antes de exportar."

**Acceptance Scenarios**:
1. POST `/api/v1/export` retorna 422 → UI muestra mensaje del backend.
2. Botón "Regenerar" lanza nueva adaptación (M1: con prompt más estricto).
3. NO descarga el PDF si hay 422 (defense in depth).

### User Story 3 — Rate-limit 20/h honesto (Priority: P2)

Si el usuario ha consumido 20 exports en 1h, el endpoint retorna 429. La UI debe mostrar: "Has alcanzado el tope de exportaciones (20/hora). El análisis determinista y la adaptación siguen disponibles."

**Acceptance Scenarios**:
1. Click "Descargar" → 429 → UI muestra mensaje honesto + countdown.
2. NO retry agresivo (backoff exponencial si se reintenta).

## Componentes a crear

```
components/export/
├── export-button.tsx         # Botón principal con state machine (idle | loading | done | error)
├── export-error-panel.tsx     # Panel rojo para 422/429/503
└── filename-hint.tsx         # Muestra el filename que se va a descargar
```

## BFF (ya implementado en M2)

`app/api/export/route.ts` ya proxyea `POST ${BACKEND_URL}/api/v1/export` con headers correctos (Content-Type + Content-Disposition). **No cambios necesarios en BFF.**

## Tipos TypeScript (en `lib/api/types.ts`)

```typescript
export interface ExportRequest {
  adaptedCv: string;
  validation: ValidationReport;  // Reusado de 003
  candidateName: string;
}

// El response es binario (application/pdf) — no se modela en TS.
// El browser lo descarga directamente vía blob URL.
```

## API client (en `lib/api/export.ts`)

```typescript
import { BACKEND_URL } from "./backend";
import type { ExportRequest } from "./types";

export class ExportError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function requestExportPdf(req: ExportRequest): Promise<Blob> {
  const res = await fetch(`${BACKEND_URL}/api/v1/export`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const problem = await res.json().catch(() => ({}));
    throw new ExportError(res.status, problem.title || "EXPORT_FAILED", problem.detail || res.statusText);
  }

  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

## Copy (en `lib/copy/es.ts`)

```typescript
export const EXPORT_COPY = {
  button: "Descargar PDF",
  loading: "Generando PDF...",
  filenameHint: "cv-adapted-{date}.pdf",
  success: "Descarga iniciada",
  errors: {
    rateLimit: "Has alcanzado el tope de exportaciones (20/hora). El análisis determinista y la adaptación siguen disponibles.",
    blocked: "El CV adaptado tiene invenciones que no estaban en el original. Regenera la adaptación antes de exportar.",
    unavailable: "La generación de PDF no está disponible temporalmente. Intenta de nuevo en unos minutos.",
    generic: "Ocurrió un error al generar el PDF. Intenta de nuevo.",
  },
};
```

## Convención de nombres

- **Componentes**: `kebab-case.tsx` (`export-button.tsx`)
- **Handlers**: `requestExportPdf` (camelCase) en `lib/api/export.ts`
- **Tipos**: `PascalCase` (`ExportRequest`)

## Fuera de scope (v0 frontend)

- Tests automatizados (M3+)
- Selección de template de PDF (v1)
- Watermark personalizado con logo (v1)
- Historial de exports (v1)

## Tasks (TDD-ordered)

Pendiente de implementar — ver [tasks.md](./tasks.md).
