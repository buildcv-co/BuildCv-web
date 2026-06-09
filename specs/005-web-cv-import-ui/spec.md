# Feature 005-web-cv-import-ui — UI de Import PDF/DOCX del CV

> **Status:** 📋 PLANEADO (frontend de la 005 del API) · **Hito:** v0.5 (P0.5)
> **Backend counterpart:** [../../BuildCv-api/specs/005-cv-pdf-docx-import/](../../BuildCv-api/specs/005-cv-pdf-docx-import/) (✅ specs escritos, implementación TDD-ordenada)
> **Handoff downstream:** `006-cv-editor` (planeado) — el editor recibe `ImportResult` y lo usa como semilla.
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)

## Resumen

Construir la UI web que consume el endpoint `POST /api/v1/import` del backend (005). El usuario podrá:

1. Arrastrar un PDF o DOCX al componente `FileUpload` (o hacer click para abrir el selector de archivos).
2. Ver un spinner mientras el archivo viaja: Browser → BFF (`app/api/import/route.ts`) → backend (`.NET` `:5080`) → parser → response.
3. Recibir un `ImportResult` con `text` + `sections[]` + `warnings[]` renderizado en `ImportResultPanel`.
4. Revisar el texto extraído y las secciones detectadas.
5. Click "Usar este texto en el editor" → navega a `/editor` (006) con el texto como semilla.

**Constitución cumplimiento:**
- **Art. III (Privacidad)**: el archivo NO se guarda en el navegador. Solo el `ImportResult.text` se pasa al editor vía state. Logs sin contenido.
- **Art. IV (Encuadre honesto)**: copy dice "Extraer texto de tu CV", NO "Convertir a formato ATS".
- **Art. VI (Clean Arch)**: el navegador NUNCA habla directo con el backend. BFF = `app/api/import/route.ts` (planeado en esta feature).
- **Art. VII (Rate-limit)**: 30/h por IP. Mensaje honesto cuando se agota.
- **Art. V (Entrada como dato)**: el texto extraído se entrega al editor como contenido inerte. El score/adapt aplicarán sus propios guardarraíles.

## Stack técnico

- **Next.js 16.2.7** (App Router) + React 19.2.4
- **TypeScript ^5 strict**
- **Tailwind v4**
- **Sin librería UI externa** (diseño custom)
- **Zod** para validación client-side (defense in depth, Constitution Art. I FR-029a).
- **Sin testing framework aún** (no hay Vitest; tests manuales + checklist E2E).

## User Scenarios

### User Story 1 — Arrastrar PDF al FileUpload (Priority: P1)

Como usuario que tiene su CV en PDF, quiero arrastrar el archivo al área designada en la página `/importar` y ver el texto extraído aparecer en menos de 3 segundos.

**Acceptance Scenarios**:
1. Drag PDF de 2 páginas al `FileUpload` → spinner 1-2s → `ImportResultPanel` muestra el texto completo y las secciones "EXPERIENCIA" y "EDUCACIÓN" detectadas.
2. El archivo NO se guarda en `localStorage` ni en cookies (defensa de Art. III).
3. Si arrastro un `.txt`, la UI rechaza ANTES de subir (validación client-side) con mensaje honesto.

### User Story 2 — Selector de archivos alternativo (Priority: P1)

Como usuario que no puede arrastrar (móvil, lector de pantalla), quiero hacer click en el `FileUpload` y usar el selector nativo de archivos.

**Acceptance Scenarios**:
1. Click en `FileUpload` (con teclado, `Enter` o `Space`) → abre selector de archivos del SO.
2. Selección de archivo → mismo flujo que drag/drop.
3. WCAG 2.2 AA: el `FileUpload` es accesible por teclado, con `aria-label` descriptivo y `aria-describedby` con instrucciones.

### User Story 3 — Manejo de errores honestos (Priority: P1)

Si el backend retorna error (415, 413, 422, 429, 503), la UI muestra un panel con el `detail` del ProblemDetails en español, sin jerga técnica, y sugiere acción al usuario.

**Acceptance Scenarios**:
1. PDF cifrado → 422 `IMPORT_PDF_ENCRYPTED` → toast rojo: "Este PDF está protegido con contraseña. Quítale la contraseña y vuelve a subirlo."
2. PDF escaneado → 422 `IMPORT_SCANNED_PDF` → toast rojo: "Este PDF parece un escaneo. No podemos extraer texto. Pega el contenido manualmente o usa un PDF con texto seleccionable."
3. Rate-limit excedido → 429 → toast amarillo con countdown: "Has alcanzado el tope de importaciones (30/hora)."

### User Story 4 — Handoff al editor (Priority: P1)

Cuando el import es exitoso, el usuario ve un botón "Usar este texto en el editor" prominente. Al hacer click, navega a `/editor` con el texto extraído como valor inicial del textarea.

**Acceptance Scenarios**:
1. Click "Usar en editor" → navega a `/editor?source=import&traceId=...` → editor carga el texto extraído en el textarea.
2. Si el editor (006) no está implementado aún, el botón muestra "Próximamente" y queda deshabilitado (no rompe la UI).
3. El texto se pasa vía state (no URL params, para no exponer PII en query strings).

### User Story 5 — Ver warnings del parseo (Priority: P2)

Si el `ImportResult` trae `warnings[]` (imágenes omitidas, secciones ambiguas, encoding normalizado), la UI los muestra como toasts no bloqueantes, en una lista expandible.

**Acceptance Scenarios**:
1. DOCX con 2 imágenes → `warnings[]` tiene 1 entrada `IMAGE_OMITTED` → toast amarillo "Se omitieron 2 imágenes".
2. PDF sin secciones detectables → `warnings[]` tiene 1 entrada `NO_SECTIONS_DETECTED` → toast amarillo "No se detectaron secciones. Podrás marcarlas manualmente en el editor."
3. Warnings no bloquean el flujo: el usuario puede seguir y usar el texto extraído.

## Componentes a crear

```
components/import/
├── file-upload.tsx         # Drag/drop + click. Valida 5 MB y MIME en cliente. Accesible WCAG 2.2 AA.
├── import-button.tsx        # Botón con state machine (idle|loading|success|error)
├── import-result-panel.tsx  # Renderiza text + sections + warnings. Botón "Usar en editor".
└── import-error-panel.tsx   # Panel rojo para 4xx/5xx con detail en español.
```

## BFF (`app/api/import/route.ts`)

```typescript
// Patrón: el navegador NUNCA habla con el backend (Constitution Art. VI).
// El BFF proxyea el multipart al backend, preservando el boundary.
import { BACKEND_URL } from "@/lib/api/backend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";   // Necesario para manejar multipart >4 MB (Edge runtime cap)

export async function POST(request: Request) {
  const formData = await request.formData();
  const upstream = await fetch(`${BACKEND_URL}/api/v1/import`, {
    method: "POST",
    body: formData,   // fetch re-empaqueta el multipart con su propio boundary
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

## Tipos TypeScript (en `lib/api/types.ts`)

```typescript
import { z } from "zod";

// Zod schemas (defense in depth, Constitution Art. I FR-029a)
export const DetectedSectionSchema = z.object({
  heading: z.string().min(1).max(100),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  confidence: z.enum(["High", "Low"]),
});

export const ImportWarningSchema = z.object({
  code: z.string().min(1).max(50),
  message: z.string().min(1).max(500),
  severity: z.enum(["Info", "Warning", "Error"]),
});

export const ImportResultSchema = z.object({
  text: z.string().max(50_000),
  sections: z.array(DetectedSectionSchema).max(50),
  warnings: z.array(ImportWarningSchema).max(20),
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  traceId: z.string().min(1).max(100),
});

export type DetectedSection = z.infer<typeof DetectedSectionSchema>;
export type ImportWarning = z.infer<typeof ImportWarningSchema>;
export type ImportResult = z.infer<typeof ImportResultSchema>;
```

## API client (en `lib/api/import.ts`)

```typescript
import { ImportResultSchema, type ImportResult } from "./types";

export class ImportError extends Error {
  readonly status: number;
  readonly code: string;
  readonly kind: ImportErrorKind;
  readonly details?: Record<string, unknown>;

  constructor(params: {
    status: number;
    code: string;
    kind: ImportErrorKind;
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = "ImportError";
    this.status = params.status;
    this.code = params.code;
    this.kind = params.kind;
    this.details = params.details;
  }
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type ImportErrorKind =
  | "network"
  | "client_validation"
  | "too_large"
  | "unsupported_mime"
  | "validation"
  | "engine"
  | "rate_limit"
  | "unknown";

/** Validación client-side ANTES de subir (defensa temprana, ahorra CPU del backend). */
export function validateFile(file: File):
  | { ok: true }
  | { ok: false; reason: string } {
  if (file.size === 0) return { ok: false, reason: "El archivo está vacío." };
  if (file.size > MAX_FILE_SIZE) return { ok: false, reason: "El archivo supera el límite de 5 MB." };
  if (!ALLOWED_MIMES.includes(file.type as (typeof ALLOWED_MIMES)[number])) {
    return { ok: false, reason: "Tipo de archivo no soportado. Sube un PDF o DOCX." };
  }
  return { ok: true };
}

/** Llama al BFF same-origin (/api/import). Lanza ImportError si falla. */
export async function requestImport(file: File): Promise<ImportResult> {
  const validation = validateFile(file);
  if (!validation.ok) {
    throw new ImportError({
      status: 0,
      code: "CLIENT_VALIDATION",
      kind: "client_validation",
      message: validation.reason,
    });
  }

  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch("/api/import", {
      method: "POST",
      body: formData,
      cache: "no-store",
    });
  } catch {
    throw new ImportError({
      status: 0,
      code: "NETWORK_ERROR",
      kind: "network",
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    });
  }

  if (!response.ok) {
    let problem: {
      code?: string;
      detail?: string;
      title?: string;
      [key: string]: unknown;
    } = {};
    try {
      problem = await response.json();
    } catch {
      // sin cuerpo JSON
    }

    const { status } = response;
    const code = problem.code ?? "IMPORT_FAILED";
    const detail = problem.detail ?? problem.title ?? "Ocurrió un error al procesar el archivo.";

    if (status === 413) {
      throw new ImportError({ status, code, kind: "too_large", message: "El archivo supera el límite de 5 MB.", details: problem });
    }
    if (status === 415) {
      throw new ImportError({ status, code, kind: "unsupported_mime", message: "Tipo de archivo no soportado. Sube un PDF o DOCX.", details: problem });
    }
    if (status === 429) {
      throw new ImportError({ status, code, kind: "rate_limit", message: "Has alcanzado el tope de importaciones (30/hora).", details: problem });
    }
    if (status === 422 || status === 400) {
      throw new ImportError({ status, code, kind: "validation", message: detail, details: problem });
    }
    if (status === 503) {
      throw new ImportError({ status, code, kind: "engine", message: "El servicio de import no está disponible temporalmente. Intenta de nuevo en unos minutos.", details: problem });
    }
    throw new ImportError({ status, code, kind: "unknown", message: detail, details: problem });
  }

  const raw = await response.json();
  return ImportResultSchema.parse(raw);
}
```

## Copy (en `lib/copy/es.ts`)

```typescript
export const IMPORT_COPY = {
  page: {
    title: "Carga tu CV",
    subtitle: "Sube un PDF o DOCX y extraemos el texto para que no tengas que copiar a mano.",
    maxSize: "Tamaño máximo: 5 MB.",
    dragHere: "Arrastra tu CV aquí",
    or: "o",
    clickToSelect: "haz click para seleccionar un archivo",
  },
  states: {
    idle: "Selecciona un archivo",
    loading: "Extrayendo texto...",
    success: "Texto extraído",
    error: "No pudimos procesar el archivo",
  },
  button: "Usar este texto en el editor",
  sections: {
    title: "Secciones detectadas",
    confidence: {
      High: "Alta confianza",
      Low: "Baja confianza (revisar)",
    },
  },
  warnings: {
    title: "Avisos del parseo",
    close: "Cerrar",
  },
  errors: {
    CLIENT_VALIDATION: "El archivo no es válido. Revisa el tipo y el tamaño.",
    NETWORK_ERROR: "No pudimos conectar con el servidor. Revisa tu conexión.",
    IMPORT_TOO_LARGE: "El archivo supera el límite de 5 MB.",
    IMPORT_UNSUPPORTED_MEDIA: "Tipo de archivo no soportado. Sube un PDF o DOCX.",
    IMPORT_PDF_ENCRYPTED: "Este PDF está protegido con contraseña. Quítale la contraseña y vuelve a subirlo.",
    IMPORT_SCANNED_PDF: "Este PDF parece un escaneo. No podemos extraer texto. Pega el contenido manualmente o usa un PDF con texto seleccionable.",
    IMPORT_DOCX_PROTECTED: "Este archivo de Word está protegido. Quítale la contraseña y vuelve a subirlo.",
    IMPORT_DOCX_NO_TEXT: "Este archivo de Word no contiene texto extraíble.",
    IMPORT_TOO_MANY_PAGES: "El documento tiene más de 100 páginas. Sube un CV más conciso.",
    IMPORT_EMPTY_FILE: "El archivo está vacío.",
    IMPORT_RATE_LIMIT_EXCEEDED: "Has alcanzado el tope de importaciones (30/hora). El análisis determinista y la adaptación siguen disponibles.",
    IMPORT_ENGINE_ERROR: "El servicio de import no está disponible temporalmente. Intenta de nuevo en unos minutos.",
    UNKNOWN: "Ocurrió un error al procesar el archivo. Intenta de nuevo.",
  },
};
```

## Accesibilidad (WCAG 2.2 AA)

- `FileUpload`:
  - `role="button"`, `tabindex={0}`, `aria-label="Cargar CV en PDF o DOCX"`.
  - `aria-describedby` con `<p id="upload-instructions">` que indica "Arrastra o selecciona un archivo PDF o DOCX, máximo 5 MB".
  - Click handler responde a `Enter` y `Space` (además de click).
  - `<input type="file" hidden>` que se abre programáticamente.
  - Focus ring visible (2px outline en color de marca).
- `ImportResultPanel`:
  - `aria-live="polite"` cuando el estado cambia a `success` o `error`.
  - Warnings list usa `<ul>` con `aria-label="Avisos del parseo"`.
  - Botón "Usar en editor" tiene `aria-label` descriptivo.
- Mensajes de error se anuncian con `role="alert"` (lectores de pantalla los leerán inmediatamente).
- Contraste de colores cumple 4.5:1 (texto normal) y 3:1 (texto grande). Verificar con axe-core o Lighthouse.

## Convención de nombres

- **Componentes**: `kebab-case.tsx` (`file-upload.tsx`).
- **Handlers**: `requestImport` (camelCase) en `lib/api/import.ts`.
- **Tipos**: `PascalCase` (`ImportResult`).
- **Schemas Zod**: `PascalCaseSchema` (`ImportResultSchema`).

## Fuera de scope (v0.5)

- Tests automatizados (Vitest en M3+).
- Drag/drop de múltiples archivos simultáneos (1 a la vez).
- Previsualización del PDF en la UI antes de subir.
- Soporte para `.rtf`, `.odt`, `.pages`, `.txt` (v1, si hay demanda).
- Historial de imports (v1 con cuentas).
- Integración con almacenamiento en la nube (v1).

## Tasks (TDD-ordered)

Pendiente de implementar — ver [tasks.md](./tasks.md).
