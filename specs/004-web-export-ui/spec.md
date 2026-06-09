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

export type ExportErrorKind = "network" | "validation" | "invention" | "rate_limit" | "unavailable" | "unknown";
export type ExportErrorCode = string;

export interface ExportErrorShape {
  status: number;
  code: ExportErrorCode;
  kind: ExportErrorKind;
  message: string;
  fields?: Record<string, string[]>;
}
```

## API client (en `lib/api/export.ts`)

> **Corrección 2026-06-09:** el browser **NUNCA** habla directo con `BACKEND_URL` (Constitution Art. VI — Clean Arch, BFF same-origin). Va contra `/api/export` (mismo origen), que es el Route Handler ya implementado en `app/api/export/route.ts` (commit `6b6f390`).

```typescript
import type { ExportRequest, ExportErrorKind, ExportErrorCode } from "./types";

const BFF_PATH = "/api/export";

export class ExportError extends Error {
  readonly status: number;
  readonly code: ExportErrorCode;
  readonly kind: ExportErrorKind;
  readonly fields?: Record<string, string[]>;

  constructor(params: {
    status: number;
    code: ExportErrorCode;
    kind: ExportErrorKind;
    message: string;
    fields?: Record<string, string[]>;
  }) {
    super(params.message);
    this.name = "ExportError";
    this.status = params.status;
    this.code = params.code;
    this.kind = params.kind;
    this.fields = params.fields;
  }
}

export async function requestExportPdf(req: ExportRequest): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(BFF_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
    });
  } catch {
    throw new ExportError({
      status: 0,
      code: "EXPORT_NETWORK",
      kind: "network",
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    });
  }

  if (response.ok) {
    return response.blob();
  }

  let problem: { errors?: Record<string, string[]>; detail?: string; title?: string } = {};
  try {
    problem = (await response.json()) as typeof problem;
  } catch {
    // respuesta sin cuerpo JSON
  }

  const { status } = response;
  const code = problem.title ?? "EXPORT_FAILED";
  const detail = problem.detail ?? "No pudimos generar el PDF. Intenta de nuevo.";

  if (status === 400) {
    throw new ExportError({
      status,
      code,
      kind: "validation",
      message: "Revisa los datos: el CV adaptado o el nombre son demasiado largos.",
      fields: problem.errors,
    });
  }
  if (status === 422) {
    throw new ExportError({
      status,
      code,
      kind: "invention",
      message: detail,
    });
  }
  if (status === 429) {
    throw new ExportError({
      status,
      code,
      kind: "rate_limit",
      message: "Has alcanzado el tope de exportaciones (20/hora). El análisis determinista y la adaptación siguen disponibles.",
    });
  }
  if (status === 503) {
    throw new ExportError({
      status,
      code,
      kind: "unavailable",
      message: "La generación de PDF no está disponible temporalmente. Intenta de nuevo en unos minutos.",
    });
  }

  throw new ExportError({ status, code, kind: "unknown", message: detail });
}

/** Crea un blob URL, dispara descarga vía <a>, libera el URL. Llamar desde el cliente. */
export function downloadBlob(blob: Blob, filename: string): void {
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

Agregar bloque `export` (NO crear `EXPORT_COPY` separado — unificar con el patrón 003, todos los bloques viven en `copy.export`):

```typescript
export: {
  button: "Descargar PDF",
  buttonLoading: "Generando PDF…",
  filenameHint: "cv-adapted-{date}.pdf", // se sustituye con la fecha actual al renderizar
  success: "Descarga iniciada",
  errors: {
    rateLimit: "Has alcanzado el tope de exportaciones (20/hora). El análisis determinista y la adaptación siguen disponibles.",
    blocked: "El CV adaptado tiene invenciones que no estaban en el original. Regenera la adaptación antes de exportar.",
    unavailable: "La generación de PDF no está disponible temporalmente. Intenta de nuevo en unos minutos.",
    network: "No pudimos conectar con el servidor. Revisa tu conexión.",
    generic: "Ocurrió un error al generar el PDF. Intenta de nuevo.",
  },
  retry: "Reintentar",
}
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
