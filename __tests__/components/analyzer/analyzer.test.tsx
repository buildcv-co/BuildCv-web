/**
 * Tests RED → GREEN del wiring de `Analyzer` con `ScoreCvRequest` v2 (PR 5b).
 *
 * `Analyzer` ahora consume `JobSpec` (typed, validado por Zod en PR 5a) en
 * lugar de `jobText: string` legacy. El submit envía
 * `requestScoreV2({ kind: "structured", cv, job, engineVersion: "2.0.0" })`
 * y discrimina la respuesta por `engineVersion` para renderizar `perSection`
 * + `redFlags` (v2) o el shape legacy (v1).
 *
 *  1. On analyze — llama `requestScore` con un `ScoreCvRequest`
 *     discriminado `kind: "structured"` + `engineVersion: "2.0.0"`.
 *  2. Success v2 — renderiza perSection + redFlags cuando el backend
 *     responde v2 (engineVersion === "2.0.0").
 *  3. Unknown engineVersion — error del backend con código
 *     `UNSUPPORTED_SCORE_ENGINE_VERSION` se muestra en el `role="alert"`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Analyzer } from "@/components/analyzer/analyzer";
import type { JobSpec } from "@/lib/job/job-spec";
import type { ScoreCvResponseV2, ScoreError } from "@/lib/api/types";

const requestScoreMock = vi.fn();
const adaptPanelSpy = vi.fn();

// Mock del módulo `@/lib/api/score`. El analyzer migrado (PR 5b) llama a
// `requestScoreV2` con un `ScoreCvRequest` discriminado; también re-exporta
// `isV2` (type guard para la respuesta v2). Apuntamos ambos entry points al
// mismo `requestScoreMock` para que los tests verifiquen el payload sin
// importar qué función llamó el analyzer.
vi.mock("@/lib/api/score", () => ({
  requestScore: (...args: unknown[]) => requestScoreMock(...args),
  requestScoreV2: (...args: unknown[]) => requestScoreMock(...args),
  isV2: (value: unknown) =>
    typeof value === "object" &&
    value !== null &&
    "engineVersion" in value &&
    (value as { engineVersion: unknown }).engineVersion === "2.0.0",
}));

// AdaptPanel y los componentes hijos del result screen reciben tipos que no
// cambian en este PR — para mantener los tests enfocados en el wiring de
// `requestScore`, los stubbeamos. La cobertura real de esos componentes
// vive en sus propios tests (`components/adapt/*`, etc.).
vi.mock("@/components/adapt/adapt-panel", () => ({
  AdaptPanel: (props: { cvText: string; jobText: string }) => {
    adaptPanelSpy(props);
    return <div data-testid="adapt-panel-stub" />;
  },
}));

const VALID_CV =
  "Mariana Gómez\nmariana.gomez@correo.com · +57 311 555 0142 · Bogotá\n\n" +
  "PERFIL\nDesarrolladora backend con 4 años de experiencia en .NET.\n\n" +
  "EXPERIENCIA\nBackend Developer en Pagos S.A.S (2022–2025)\n" +
  "Lideré la migración de un monolito a microservicios con Docker.";

const VALID_JOB: JobSpec = {
  title: "Senior Backend Engineer",
  company: "Acme S.A.",
  description:
    "Buscamos un ingeniero backend con experiencia en .NET 10 y arquitecturas limpias para unirse a nuestro equipo de plataforma.",
  location: "Bogotá, Colombia",
  employmentType: "full_time",
  requirements: ["5 años de experiencia en C#"],
};

const V2_RESPONSE: ScoreCvResponseV2 = {
  overallScore: 82,
  band: "high",
  perSection: {
    experience: 85,
    education: 70,
    skills: 90,
    certifications: null,
    contact: 60,
  },
  redFlags: [
    {
      code: "EMPLOYMENT_GAP_6MO",
      severity: "low",
      message: "Gap de 7 meses entre 2021-09 y 2022-04",
    },
  ],
  honestyNotice: "Análisis determinista. Sin invención.",
  gatesApplied: [],
  engineVersion: "2.0.0",
  lexiconVersion: "es-CO-v1",
  traceId: "trace-5b",
};

afterEach(() => {
  cleanup();
  requestScoreMock.mockReset();
  adaptPanelSpy.mockReset();
});

describe("Analyzer", () => {
  it("Analyzer_On_Analyze_Calls_RequestScore_With_Structured_ScoreCvRequest_V2", async () => {
    requestScoreMock.mockResolvedValueOnce(V2_RESPONSE);
    const user = userEvent.setup();
    render(
      <Analyzer
        cvText={VALID_CV}
        job={VALID_JOB}
        onCv={() => undefined}
        onJob={() => undefined}
      />,
    );
    // El Analyzer renderiza el InputPanel directamente cuando no hay
    // resultado. Como `job` ya viene como prop, el submit del analyzer
    // está habilitado cuando cvText cumple CV_MIN (200) y job no es null.
    // Usamos `data-testid="analyzer-submit"` para disambiguar del botón
    // "Analizar" interno del JobSpecForm.
    const submit = screen.getByTestId("analyzer-submit");
    await waitFor(() => {
      expect(submit).toBeEnabled();
    });
    await user.click(submit);
    await waitFor(() => {
      expect(requestScoreMock).toHaveBeenCalledTimes(1);
    });
    const payload = requestScoreMock.mock.calls[0][0] as {
      kind: string;
      engineVersion: string;
      cvText?: string;
      cv?: unknown;
      job?: unknown;
    };
    expect(payload.kind).toBe("structured");
    expect(payload.engineVersion).toBe("2.0.0");
    // Estructura discriminated union: el payload v2 incluye `cv` y `job`
    // tipados (no `cvText`/`jobText` legacy).
    expect(payload.job).toEqual(VALID_JOB);
    expect(payload.cvText).toBeUndefined();
  });

  it("Analyzer_Displays_ScoreResponseV2_PerSection_And_RedFlags_After_Success", async () => {
    requestScoreMock.mockResolvedValueOnce(V2_RESPONSE);
    const user = userEvent.setup();
    render(
      <Analyzer
        cvText={VALID_CV}
        job={VALID_JOB}
        onCv={() => undefined}
        onJob={() => undefined}
      />,
    );
    const submit = screen.getByTestId("analyzer-submit");
    await waitFor(() => {
      expect(submit).toBeEnabled();
    });
    await user.click(submit);
    // Tras el success, el resultado se renderiza. La presencia del
    // AdaptPanel-stub confirma que salimos del InputPanel y entramos en
    // el result screen, que es donde viven `perSection` + `redFlags`.
    await waitFor(() => {
      expect(screen.getByTestId("adapt-panel-stub")).toBeInTheDocument();
    });
    // Verificamos que la UI discriminó correctamente el v2 response:
    // las secciones `perSection` se renderizan vía `<V2ResultSections>`
    // (testid estable; el contenido del ScoreGauge es animado por rAF
    // y no es estable para asserts determinísticos).
    await waitFor(() => {
      expect(screen.getByTestId("v2-per-section")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId("v2-red-flags")).toBeInTheDocument();
    });
    // El código del red flag del response v2 (mockeado) debe estar en el DOM.
    expect(
      screen.getByText(/EMPLOYMENT_GAP_6MO/),
    ).toBeInTheDocument();
  });

  it("Analyzer_Handles_UnknownEngineVersion_With_Unsupported_Score_Engine_Version_Error", async () => {
    const scoreError: ScoreError = {
      status: 400,
      message:
        "Versión de motor no soportada (UNSUPPORTED_SCORE_ENGINE_VERSION).",
    };
    requestScoreMock.mockRejectedValueOnce(scoreError);
    const user = userEvent.setup();
    render(
      <Analyzer
        cvText={VALID_CV}
        job={VALID_JOB}
        onCv={() => undefined}
        onJob={() => undefined}
      />,
    );
    const submit = screen.getByTestId("analyzer-submit");
    await waitFor(() => {
      expect(submit).toBeEnabled();
    });
    await user.click(submit);
    // El Analyzer debe mostrar el `message` del ScoreError en el `role="alert"`.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/UNSUPPORTED_SCORE_ENGINE_VERSION/i);
  });
});