import type {
  AdaptErrorCode,
  AdaptErrorKind,
  AdaptRequest,
  AdaptationResult,
} from "./types";

export class AdaptError extends Error {
  readonly status: number;
  readonly code: AdaptErrorCode;
  readonly kind: AdaptErrorKind;
  readonly fields?: Record<string, string[]>;

  constructor(params: {
    status: number;
    code: AdaptErrorCode;
    kind: AdaptErrorKind;
    message: string;
    fields?: Record<string, string[]>;
  }) {
    super(params.message);
    this.name = "AdaptError";
    this.status = params.status;
    this.code = params.code;
    this.kind = params.kind;
    this.fields = params.fields;
  }
}

const BFF_PATH = "/api/adapt";

interface ProblemDetails {
  errors?: Record<string, string[]>;
  detail?: string;
  title?: string;
}

export async function requestAdapt(req: AdaptRequest): Promise<AdaptationResult> {
  let response: Response;
  try {
    response = await fetch(BFF_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
    });
  } catch {
    throw new AdaptError({
      status: 0,
      code: "ADAPT_NETWORK",
      kind: "network",
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    });
  }

  if (response.ok) {
    return (await response.json()) as AdaptationResult;
  }

  let problem: ProblemDetails = {};
  try {
    problem = (await response.json()) as ProblemDetails;
  } catch {
    // respuesta sin cuerpo JSON — usamos fallback
  }

  const { status } = response;
  const code = problem.title ?? "ADAPT_FAILED";
  const detail = problem.detail ?? "No pudimos adaptar tu CV. Intenta de nuevo.";

  if (status === 400) {
    throw new AdaptError({
      status,
      code,
      kind: "validation",
      message: "Revisa los textos: hay campos demasiado cortos o demasiado largos.",
      fields: problem.errors,
    });
  }
  if (status === 422) {
    throw new AdaptError({
      status,
      code,
      kind: "invention",
      message: detail,
    });
  }
  if (status === 429) {
    throw new AdaptError({
      status,
      code,
      kind: "rate_limit",
      message: "Has alcanzado el tope de adaptaciones (5/hora). El análisis determinista sigue disponible.",
    });
  }
  if (status === 503) {
    throw new AdaptError({
      status,
      code,
      kind: "unavailable",
      message: "La adaptación con IA no está disponible temporalmente. Intenta de nuevo en unos minutos.",
    });
  }

  throw new AdaptError({ status, code, kind: "unknown", message: detail });
}
