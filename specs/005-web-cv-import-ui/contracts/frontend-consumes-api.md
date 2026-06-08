# Contracts (Frontend consumes API): 005-web-cv-import-ui

> **Contrato que el frontend de BuildCv-web consume del backend BuildCv-api.** El backend es la fuente de verdad (ver `BuildCv-api/specs/005-cv-pdf-docx-import/contracts/import-api.md`); este documento es el **espejo** con schemas TypeScript + Zod, y describe cómo el BFF + UI del frontend orquestan la llamada.

## Flujo end-to-end

```
Browser (FileUpload)
   ↓ drag/drop o click
[FileUpload valida client-side: size ≤ 5 MB, MIME ∈ {pdf, docx}]
   ↓
[ImportButton llama requestImport(file)]
   ↓
[POST /api/import (BFF: app/api/import/route.ts, runtime nodejs)]
   ↓ server-to-server
[POST BACKEND_URL/api/v1/import (Backend .NET :5080)]
   ↓
[PdfPigCvParser o OpenXmlCvParser]
   ↓
[Response: ImportResult JSON (200) o ProblemDetails JSON (4xx/5xx)]
   ↑
[BFF propaga body + status + content-type]
   ↑
[Frontend: Zod parsea el response]
   ↓
[ImportResultPanel renderiza o ImportErrorPanel muestra error]
   ↓
[User click "Usar en editor" → setEditorHandoff → navigate /editor]
```

## BFF: `BuildCv-web/app/api/import/route.ts`

```typescript
import { BACKEND_URL } from "@/lib/api/backend";

// Runtime nodejs: necesario para multipart >4 MB (edge runtime trunca a 4 MB).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({
        type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
        title: "Bad Request",
        status: 400,
        detail: "El cuerpo de la petición no es multipart/form-data válido.",
        code: "INVALID_MULTIPART",
      }),
      { status: 400, headers: { "content-type": "application/problem+json" } },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return new Response(
      JSON.stringify({
        type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
        title: "Bad Request",
        status: 400,
        detail: "El campo 'file' es requerido.",
        code: "MISSING_FILE",
      }),
      { status: 400, headers: { "content-type": "application/problem+json" } },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/api/v1/import`, {
      method: "POST",
      body: formData,    // fetch re-empaqueta con su propio boundary
      cache: "no-store",
    });
  } catch {
    return new Response(
      JSON.stringify({
        type: "https://tools.ietf.org/html/rfc9110#section-15.5.5",
        title: "Bad Gateway",
        status: 502,
        detail: "No pudimos contactar el backend. Intenta de nuevo en unos minutos.",
        code: "BACKEND_UNREACHABLE",
      }),
      { status: 502, headers: { "content-type": "application/problem+json" } },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "x-ratelimit-limit": upstream.headers.get("x-ratelimit-limit") ?? "30",
      "x-ratelimit-remaining": upstream.headers.get("x-ratelimit-remaining") ?? "0",
      "x-ratelimit-reset": upstream.headers.get("x-ratelimit-reset") ?? "",
    },
  });
}
```

## Tipos TypeScript + Zod (en `lib/api/types.ts`)

```typescript
import { z } from "zod";

// =====================================================================
// ImportResult (response 200 OK)
// =====================================================================

export const DetectedSectionSchema = z.object({
  heading: z.string().min(1).max(100),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  confidence: z.enum(["High", "Low"]),
});
export type DetectedSection = z.infer<typeof DetectedSectionSchema>;

export const ImportWarningSchema = z.object({
  code: z.string().min(1).max(50),
  message: z.string().min(1).max(500),
  severity: z.enum(["Info", "Warning", "Error"]),
});
export type ImportWarning = z.infer<typeof ImportWarningSchema>;

export const ImportResultSchema = z.object({
  text: z.string().max(50_000),
  sections: z.array(DetectedSectionSchema).max(50),
  warnings: z.array(ImportWarningSchema).max(20),
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  traceId: z.string().min(1).max(100),
});
export type ImportResult = z.infer<typeof ImportResultSchema>;

// =====================================================================
// ProblemDetails (response 4xx/5xx)
// =====================================================================

export const ProblemDetailsSchema = z.object({
  type: z.string().url().optional(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string().optional(),
  instance: z.string().optional(),
  code: z.string().optional(),          // IMPORT_TOO_LARGE, IMPORT_PDF_ENCRYPTED, etc.
  [key: string]: z.unknown(),           // detalles específicos (pageCount, retryAfter, etc.)
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
```

## API client (en `lib/api/import.ts`)

```typescript
import { ImportResultSchema, ProblemDetailsSchema, type ImportResult, type ProblemDetails } from "./types";

// =====================================================================
// Constantes (sincronizadas con FR-039b y rate-limit 30/h)
// =====================================================================

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;   // 5 MB
export const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
export type AllowedMime = (typeof ALLOWED_MIMES)[number];

// =====================================================================
// ImportError class
// =====================================================================

export class ImportError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ProblemDetails,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

// =====================================================================
// Validación client-side
// =====================================================================

export function validateFile(file: File): { ok: true } | { ok: false; reason: string } {
  if (file.size === 0) {
    return { ok: false, reason: "El archivo está vacío." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: "El archivo supera el límite de 5 MB." };
  }
  if (!ALLOWED_MIMES.includes(file.type as AllowedMime)) {
    return { ok: false, reason: "Tipo de archivo no soportado. Sube un PDF o DOCX." };
  }
  return { ok: true };
}

// =====================================================================
// requestImport: POST a /api/import
// =====================================================================

export async function requestImport(file: File): Promise<ImportResult> {
  // Validación client-side (defense in depth, no sustituye al backend)
  const validation = validateFile(file);
  if (!validation.ok) {
    throw new ImportError(0, "CLIENT_VALIDATION", validation.reason);
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
    throw new ImportError(
      0,
      "NETWORK_ERROR",
      "No pudimos conectar con el servidor. Revisa tu conexión.",
    );
  }

  // Leer el body una sola vez (response.body es un ReadableStream)
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ImportError(
      response.status,
      "INVALID_RESPONSE",
      "Respuesta inválida del servidor. Intenta de nuevo.",
    );
  }

  if (!response.ok) {
    const problem = ProblemDetailsSchema.safeParse(raw);
    if (problem.success) {
      throw new ImportError(
        response.status,
        problem.data.code ?? "IMPORT_FAILED",
        problem.data.detail ?? problem.data.title ?? "Error al procesar el archivo.",
        problem.data,
      );
    }
    throw new ImportError(
      response.status,
      "IMPORT_FAILED",
      "Error al procesar el archivo.",
    );
  }

  // Validar con Zod el response 200 (defense in depth)
  const result = ImportResultSchema.safeParse(raw);
  if (!result.success) {
    console.error("ImportResult Zod validation failed:", result.error);
    throw new ImportError(
      response.status,
      "INVALID_RESPONSE",
      "Respuesta inválida del servidor. Intenta de nuevo.",
    );
  }

  return result.data;
}

// =====================================================================
// Handoff al editor (006) vía sessionStorage
// =====================================================================

const HANDOFF_KEY = "buildcv:import:handoff";

export interface EditorHandoff {
  importedText: string;
  importedSections: DetectedSection[];
  importedTraceId: string;
  importedAt: string;   // ISO 8601
}

export function setEditorHandoff(handoff: EditorHandoff): void {
  sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
}

export function getEditorHandoff(): EditorHandoff | null {
  const raw = sessionStorage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditorHandoff;
  } catch {
    return null;
  }
}

export function clearEditorHandoff(): void {
  sessionStorage.removeItem(HANDOFF_KEY);
}
```

## Mapeo de errores a UI

| Status | `code` | `detail` (backend) | UI |
|---|---|---|---|
| 0 (network) | `NETWORK_ERROR` | (cliente) | Toast rojo: "No pudimos conectar con el servidor. Revisa tu conexión." |
| 0 (validation) | `CLIENT_VALIDATION` | (cliente) | Toast rojo: "El archivo no es válido. Revisa el tipo y el tamaño." |
| 400 | (cualquiera) | (cualquiera) | Toast rojo con el `detail` del backend. |
| 413 | `IMPORT_TOO_LARGE` | "El archivo supera el límite de 5 MB." | Toast rojo persistente. |
| 415 | `IMPORT_UNSUPPORTED_MEDIA` | "Tipo de archivo no soportado. Sube un PDF o DOCX." | Toast rojo persistente. |
| 422 | `IMPORT_PDF_ENCRYPTED` | "Este PDF está protegido con contraseña..." | Toast rojo persistente. |
| 422 | `IMPORT_SCANNED_PDF` | "Este PDF parece un escaneo..." | Toast rojo persistente. |
| 422 | `IMPORT_DOCX_PROTECTED` | "Este archivo de Word está protegido..." | Toast rojo persistente. |
| 422 | `IMPORT_DOCX_NO_TEXT` | "Este archivo de Word no contiene texto extraíble." | Toast rojo persistente. |
| 422 | `IMPORT_TOO_MANY_PAGES` | "El documento tiene N páginas (máx. 100)..." | Toast rojo persistente. |
| 422 | `IMPORT_EMPTY_FILE` | "El archivo está vacío." | Toast rojo persistente. |
| 429 | `IMPORT_RATE_LIMIT_EXCEEDED` | "Has alcanzado el tope de importaciones (30/hora)..." | Toast amarillo con countdown. |
| 503 | `IMPORT_ENGINE_ERROR` | "El servicio de import no está disponible temporalmente..." | Toast gris con botón "Reintentar". |

## Headers de respuesta (del backend, propagados por el BFF)

| Header | Tipo | Descripción |
|---|---|---|
| `content-type` | `string` | `application/json` (200, 4xx) o `application/problem+json` (4xx, 5xx). |
| `x-ratelimit-limit` | `string` | `30` (límite de la política `"import"`). |
| `x-ratelimit-remaining` | `string` | Requests restantes en la ventana actual. |
| `x-ratelimit-reset` | `string` | ISO 8601 timestamp de cuándo se resetea. |
| `retry-after` | `string` | Solo en 429. Segundos hasta el reset. |

## Ejemplo end-to-end (happy path)

```typescript
// En el componente ImportButton:
const onFileSelected = async (file: File) => {
  setState({ kind: "loading" });
  try {
    const result = await requestImport(file);
    setState({ kind: "success", result });
  } catch (err) {
    if (err instanceof ImportError) {
      setState({ kind: "error", error: err });
    } else {
      throw err;
    }
  }
};

// En ImportResultPanel:
const onUseInEditor = () => {
  setEditorHandoff({
    importedText: result.text,
    importedSections: result.sections,
    importedTraceId: result.traceId,
    importedAt: new Date().toISOString(),
  });
  router.push(`/editor?traceId=${result.traceId}`);
};
```

## Ejemplo end-to-end (error 415)

```typescript
// Backend retorna:
//   Status: 415
//   Body:
//   {
//     "type": "https://tools.ietf.org/html/rfc9110#section-15.5.16",
//     "title": "Tipo de archivo no soportado",
//     "status": 415,
//     "detail": "Tipo de archivo no soportado. Sube un PDF o DOCX.",
//     "code": "IMPORT_UNSUPPORTED_MEDIA",
//     "mimeDeclared": "text/plain",
//     "traceId": "0HMVD9F2E5Q2P:00000003"
//   }

// Frontend (requestImport):
//   - response.ok === false
//   - ProblemDetailsSchema.safeParse(raw) === success
//   - throws new ImportError(415, "IMPORT_UNSUPPORTED_MEDIA",
//       "Tipo de archivo no soportado. Sube un PDF o DOCX.",
//       { type, title, status, detail, code, mimeDeclared, traceId })

// ImportErrorPanel renderiza:
//   <div role="alert">
//     <h2>Tipo de archivo no soportado</h2>
//     <p>Tipo de archivo no soportado. Sube un PDF o DOCX.</p>
//     <button>Reintentar</button>
//     <button>Cerrar</button>
//   </div>
```

## Accesibilidad (WCAG 2.2 AA)

- **FileUpload**:
  - `role="button"`, `tabindex={0}`, `aria-label="Cargar CV en PDF o DOCX"`.
  - `aria-describedby="upload-instructions"` con `<p>` que indica el formato y tamaño.
  - Click handler responde a `Enter` y `Space` además de click.
  - `<input type="file" hidden>` que se abre programáticamente.
  - Focus ring visible (2px outline en color de marca, no menor a 3:1 de contraste).
- **ImportResultPanel**:
  - `aria-live="polite"` para anunciar el estado de éxito.
  - Warnings list usa `<ul>` con `aria-label="Avisos del parseo"`.
  - Botón "Usar en editor" tiene `aria-label` descriptivo.
- **ImportErrorPanel**:
  - `role="alert"` para anuncio inmediato.
  - Foco se mueve al título del panel al abrir.
  - Botón "Cerrar" tiene `aria-label="Cerrar mensaje de error"`.
- **Contraste**: 4.5:1 para texto normal, 3:1 para texto grande.
- **No información solo por color**: warnings tienen icono + texto, no solo color amarillo.

## Versionado

- `ImportResult.engineVersion` se sella por el backend (SemVer).
- `ImportResult.traceId` es por-request, único.
- Si el backend cambia la estructura del `ImportResult`, se actualiza el Zod schema en sincronía.
- El frontend NUNCA modifica el `ImportResult` antes de pasarlo al editor (006): lo entrega tal cual para que el editor aplique sus propios Zod schemas (defense in depth).
