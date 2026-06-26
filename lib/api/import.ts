import { isImportResult, isImportResultV2, type ImportErrorKind, type ImportResult, type ImportResultV2 } from "./types";

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

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

type AllowedMime = (typeof ALLOWED_MIMES)[number];

const BFF_PATH = "/api/import";

/**
 * Versión del motor de import que este cliente negocia con el backend.
 * El header `X-Engine-Version` viaja en cada request y el backend devuelve
 * `ImportResultV2` (engineVersion 2.0.0 con `cv: CvDocument` tipado) por
 * defecto, o `ImportResult` legacy (engineVersion 1.0.0 con `text` + `sections`)
 * si el cliente envía explícitamente `1.0.0`. PR 2e de 021.
 */
export const ENGINE_VERSION = "2.0.0";
const ENGINE_VERSION_HEADER = "X-Engine-Version";

/**
 * Respuesta discriminada por `engineVersion`. El import button (005) consume
 * directamente la variante v2 (`cv: CvDocument`) sin pasar por
 * `parseCvDocument(text)` — Constitution Art. I: cero invención, el parser del
 * backend ya marcó cada campo con su ConfidenceMarker.
 */
export type ImportResponse = ImportResultV2 | ImportResult;

interface ProblemDetails {
  code?: string;
  detail?: string;
  title?: string;
  [key: string]: unknown;
}

export type ValidateFileResult = { ok: true } | { ok: false; reason: string };

/**
 * Validación client-side ANTES de subir (defense in depth, Constitution Art. I).
 * No sustituye al backend; evita round-trips innecesarios y mejora UX.
 */
function isAllowedFile(file: File): boolean {
  if (ALLOWED_MIMES.includes(file.type as AllowedMime)) return true;
  // Fallback por extensión solo cuando el browser no pudo determinar MIME.
  if (file.type !== "" && file.type !== "application/octet-stream") return false;
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || name.endsWith(".docx");
}

export function validateFile(file: File): ValidateFileResult {
  if (file.size === 0) return { ok: false, reason: "El archivo está vacío." };
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: "El archivo supera el límite de 5 MB." };
  }
  if (!isAllowedFile(file)) {
    return {
      ok: false,
      reason: "Tipo de archivo no soportado. Sube un PDF o DOCX.",
    };
  }
  return { ok: true };
}

/** Llama al BFF same-origin (/api/import). Lanza ImportError si falla. */
export async function requestImport(file: File): Promise<ImportResponse> {
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
    response = await fetch(BFF_PATH, {
      method: "POST",
      body: formData,
      cache: "no-store",
      headers: { [ENGINE_VERSION_HEADER]: ENGINE_VERSION },
    });
  } catch {
    throw new ImportError({
      status: 0,
      code: "NETWORK_ERROR",
      kind: "network",
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    });
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    if (!response.ok) {
      throw new ImportError({
        status: response.status,
        code: "IMPORT_FAILED",
        kind: "unknown",
        message: "Ocurrió un error al procesar el archivo. Intenta de nuevo.",
      });
    }
    throw new ImportError({
      status: response.status,
      code: "INVALID_RESPONSE",
      kind: "unknown",
      message: "Respuesta inválida del servidor. Intenta de nuevo.",
    });
  }

  if (!response.ok) {
    const problem = readProblem(raw);
    const status = response.status;
    const code = problem.code ?? "IMPORT_FAILED";
    const detail = problem.detail ?? problem.title ?? "Ocurrió un error al procesar el archivo.";

    if (status === 413) {
      throw new ImportError({
        status,
        code,
        kind: "too_large",
        message: "El archivo supera el límite de 5 MB.",
        details: problem,
      });
    }
    if (status === 415) {
      throw new ImportError({
        status,
        code,
        kind: "unsupported_mime",
        message: "Tipo de archivo no soportado. Sube un PDF o DOCX.",
        details: problem,
      });
    }
    if (status === 429) {
      throw new ImportError({
        status,
        code,
        kind: "rate_limit",
        message:
          "Has alcanzado el tope de importaciones (30/hora). El análisis determinista y la adaptación siguen disponibles.",
        details: problem,
      });
    }
    if (status === 422 || status === 400) {
      throw new ImportError({
        status,
        code,
        kind: "validation",
        message: detail,
        details: problem,
      });
    }
    if (status === 503) {
      throw new ImportError({
        status,
        code,
        kind: "engine",
        message:
          "El servicio de import no está disponible temporalmente. Intenta de nuevo en unos minutos.",
        details: problem,
      });
    }
    throw new ImportError({
      status,
      code,
      kind: "unknown",
      message: detail,
      details: problem,
    });
  }

  if (isImportResultV2(raw)) {
    return raw;
  }

  if (isImportResult(raw)) {
    return raw;
  }

  throw new ImportError({
    status: response.status,
    code: "INVALID_RESPONSE",
    kind: "validation",
    message: "Respuesta inválida del servidor. Intenta de nuevo.",
  });
}

function readProblem(raw: unknown): ProblemDetails {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return raw as ProblemDetails;
}
