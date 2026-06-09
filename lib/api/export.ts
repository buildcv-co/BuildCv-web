import type { ExportErrorCode, ExportErrorKind, ExportRequest } from "./types";

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

const BFF_PATH = "/api/export";

interface ProblemDetails {
  errors?: Record<string, string[]>;
  detail?: string;
  title?: string;
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

  let problem: ProblemDetails = {};
  try {
    problem = (await response.json()) as ProblemDetails;
  } catch {
    // respuesta sin cuerpo JSON — usamos fallback
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
      message:
        "Has alcanzado el tope de exportaciones (20/hora). El análisis determinista y la adaptación siguen disponibles.",
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
