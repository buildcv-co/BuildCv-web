import type { ScoreResponse } from "./types";

export interface ScoreError {
  status: number;
  message: string;
  fields?: Record<string, string[]>;
}

/** Llama al BFF (/api/score), que proxyea al backend .NET. Lanza ScoreError si falla. */
export async function requestScore(
  cvText: string,
  jobText: string,
): Promise<ScoreResponse> {
  let response: Response;
  try {
    response = await fetch("/api/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cvText, jobText }),
    });
  } catch {
    throw {
      status: 0,
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    } satisfies ScoreError;
  }

  if (response.ok) {
    return (await response.json()) as ScoreResponse;
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
