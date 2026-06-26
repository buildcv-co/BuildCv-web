import {
  isScoreResponseV2,
  type LegacyScoreRequest,
  type ScoreCvRequest,
  type ScoreCvResponseV2,
  type ScoreResponse,
} from "./types";

export interface ScoreError {
  status: number;
  message: string;
  fields?: Record<string, string[]>;
}

/**
 * Respuesta del endpoint discriminada por versión de motor (Constitution Art. II):
 * el cliente negocia `engineVersion` y el BFF / backend pueden devolver
 * <see cref="ScoreResponse"/> legacy (v1) o <see cref="ScoreCvResponseV2"/>
 * (v2). La UI discrimina con <see cref="isScoreResponseV2"/> antes de
 * leer `perSection` o `redFlags`.
 */
export type ScoreOutcome = ScoreResponse | ScoreCvResponseV2;

/**
 * Llama al BFF (/api/score) con el payload v1 (texto pegado). Devuelve el
 * <see cref="ScoreResponse"/> legacy. Los consumidores actuales
 * (`analyzer.tsx`, `editor.tsx`, `diff-page.tsx`) siguen usando este
 * entrypoint hasta que PR 5 los migre a <see cref="requestScoreV2"/>.
 */
export async function requestScore(
  cvText: string,
  jobText: string,
): Promise<ScoreResponse> {
  const payload: LegacyScoreRequest = {
    kind: "legacy",
    cvText,
    jobText,
    engineVersion: "1.0.0",
  };
  const json = await postScore(payload);
  return json as ScoreResponse;
}

/**
 * Llama al BFF (/api/score) con el payload discriminado
 * (<see cref="ScoreCvRequest"/>). Devuelve un <see cref="ScoreOutcome"/>
 * que el consumidor discrimina por <see cref="isScoreResponseV2"/>:
 * - `engineVersion: "2.0.0"` → `ScoreCvResponseV2` con `perSection` +
 *   `redFlags` + `gatesApplied`.
 * - `engineVersion: "1.0.0"` → `ScoreResponse` legacy.
 */
export async function requestScoreV2(
  request: ScoreCvRequest,
): Promise<ScoreOutcome> {
  const json = await postScore(request);
  return json as ScoreOutcome;
}

async function postScore(payload: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch("/api/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw {
      status: 0,
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    } satisfies ScoreError;
  }

  if (response.ok) {
    return response.json();
  }

  let message = "No pudimos analizar tu CV. Intenta de nuevo en un momento.";
  let fields: Record<string, string[]> | undefined;

  try {
    const problem = (await response.json()) as {
      errors?: Record<string, string[]>;
      detail?: string;
      title?: string;
    };
    if (response.status === 400 && problem.errors) {
      fields = problem.errors;
      message = "Revisa los textos: hay campos demasiado cortos o demasiado largos.";
    } else if (response.status === 429) {
      message = "Demasiados análisis seguidos. Espera un momento e intenta de nuevo.";
    } else if (problem.detail ?? problem.title) {
      message = (problem.detail ?? problem.title) as string;
    }
  } catch {
    // respuesta sin cuerpo JSON; usamos el mensaje por defecto
  }

  throw { status: response.status, message, fields } satisfies ScoreError;
}

/**
 * Type guard para la respuesta del motor 2.0.0. Re-exporta el type guard
 * ya definido en <see cref="isScoreResponseV2"/> con un nombre alineado al
 * dominio (`isScoreResponseV2` ya es la fuente de verdad en types.ts).
 */
export const isV2 = isScoreResponseV2;