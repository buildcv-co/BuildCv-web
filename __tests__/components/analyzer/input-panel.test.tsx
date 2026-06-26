/**
 * Tests RED → GREEN del wiring de `InputPanel` con `JobSpecForm` (PR 5b).
 *
 * `InputPanel` ya no renderiza el `<textarea>` legacy para la vacante. En su
 * lugar compone el `<JobSpecForm>` obligatorio (PR 5a) que valida con Zod
 * (`jobSpecSchema`) y entrega un `JobSpec` tipado al submit. El CV sigue
 * siendo un `<textarea>` libre por ahora (se reemplaza en otra PR cuando el
 * editor v2 se cablee al flujo del analyzer).
 *
 *  1. Render — usa `<JobSpecForm>` en vez del textarea legacy para la vacante.
 *  2. Submit — el botón del form está deshabilitado cuando el JobSpec es
 *     inválido (delegación de UX al JobSpecForm).
 *  3. On submit válido — `onSubmit` recibe `{ cvText, job: JobSpec }` con
 *     el `JobSpec` normalizado por Zod (no `jobText` legacy).
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InputPanel } from "@/components/analyzer/input-panel";
import type { JobSpec } from "@/lib/job/job-spec";

const VALID_CV =
  "Mariana Gómez\nmariana.gomez@correo.com · +57 311 555 0142 · Bogotá\n\n" +
  "PERFIL\nDesarrolladora backend con 4 años de experiencia en .NET.\n\n" +
  "EXPERIENCIA\nBackend Developer en Pagos S.A.S (2022–2025)\n" +
  "Lideré la migración de un monolito a microservicios con Docker, " +
  "reduciendo los despliegues de 2 horas a 15 minutos. ".repeat(5);

const VALID_JOB: JobSpec = {
  title: "Senior Backend Engineer",
  company: "Acme S.A.",
  description:
    "Buscamos un ingeniero backend con experiencia en .NET 10 y arquitecturas limpias para unirse a nuestro equipo de plataforma.",
  location: "Bogotá, Colombia",
  employmentType: "full_time",
  requirements: ["5 años de experiencia en C#"],
};

function fillJobSpecForm() {
  fireEvent.change(
    screen.getByLabelText(/cargo|t[ií]tulo/i, { selector: "input" }),
    { target: { value: VALID_JOB.title } },
  );
  fireEvent.change(
    screen.getByLabelText(/empresa/i, { selector: "input" }),
    { target: { value: VALID_JOB.company } },
  );
  fireEvent.change(
    screen.getByLabelText(/descripci[oó]n/i, { selector: "textarea" }),
    { target: { value: VALID_JOB.description } },
  );
  fireEvent.change(
    screen.getByLabelText(/ubicaci[oó]n/i, { selector: "input" }),
    { target: { value: VALID_JOB.location } },
  );
}

describe("InputPanel", () => {
  it("InputPanel_Renders_JobSpecForm_Instead_Of_Legacy_Textarea_For_Job", () => {
    const onCv = vi.fn();
    const onJob = vi.fn();
    const onSubmit = vi.fn();
    render(
      <InputPanel
        cvText={VALID_CV}
        job={null}
        onCv={onCv}
        onJob={onJob}
        onSubmit={onSubmit}
        onExample={() => undefined}
        onClear={() => undefined}
        loading={false}
        error={null}
      />,
    );
    // El CV sigue siendo un textarea libre (data-testid preservado).
    expect(
      screen.getByTestId("analyzer-cv-textarea"),
    ).toBeInTheDocument();
    // El JobSpecForm debe renderizar los 6 fields (5 inputs + 1 select + 1 textarea).
    expect(
      screen.getByLabelText(/cargo|t[ií]tulo/i, { selector: "input" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/empresa/i, { selector: "input" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/ubicaci[oó]n/i, { selector: "input" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/tipo de empleo/i, { selector: "select" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/descripci[oó]n/i, { selector: "textarea" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/requisito 1/i, { selector: "input" }),
    ).toBeInTheDocument();
    // El textarea legacy "La vacante" ya no existe (placeholder que apuntaba
    // al textarea con "Pega aquí la descripción de la vacante…").
    expect(
      screen.queryByPlaceholderText(/pega aquí la descripci[oó]n de la vacante/i),
    ).toBeNull();
  });

  it("InputPanel_Submit_Disabled_When_JobSpec_Empty", () => {
    const onCv = vi.fn();
    const onJob = vi.fn();
    const onSubmit = vi.fn();
    render(
      <InputPanel
        cvText={VALID_CV}
        job={null}
        onCv={onCv}
        onJob={onJob}
        onSubmit={onSubmit}
        onExample={() => undefined}
        onClear={() => undefined}
        loading={false}
        error={null}
      />,
    );
    // El submit del analyzer exige JobSpec pre-cargado (JobSpecForm debe
    // haber llamado `onSubmit(job)` antes). Con el JobSpecForm vacío, el
    // submit del analyzer sigue HTML-disabled — esto refleja el flujo UX
    // correcto: el usuario primero valida el JobSpecForm, después dispara
    // el análisis.
    const submit = screen.getByTestId("analyzer-submit");
    expect(submit).toBeDisabled();
  });

  it("InputPanel_On_Submit_Calls_OnSubmit_With_CvText_And_JobSpec", async () => {
    const user = userEvent.setup();
    const onCv = vi.fn();
    const onJob = vi.fn();
    const onSubmit = vi.fn();
    render(
      <InputPanel
        cvText={VALID_CV}
        job={null}
        onCv={onCv}
        onJob={onJob}
        onSubmit={onSubmit}
        onExample={() => undefined}
        onClear={() => undefined}
        loading={false}
        error={null}
      />,
    );
    // Paso 1: llenar el JobSpec completo (campos + select + requisito).
    fillJobSpecForm();
    await user.selectOptions(
      screen.getByLabelText(/tipo de empleo/i, { selector: "select" }),
      VALID_JOB.employmentType,
    );
    fireEvent.change(
      screen.getByLabelText(/requisito 1/i, { selector: "input" }),
      { target: { value: VALID_JOB.requirements[0] } },
    );
    // Paso 2: submit del JobSpecForm (su propio botón "Analizar" interno).
    // Esto valida con Zod, llama `onJob(job)` y habilita el submit del
    // analyzer. Usamos el form del JobSpecForm directamente porque hay
    // DOS botones con name /analizar/i (uno en JobSpecForm, otro en
    // InputPanel) — `data-testid="analyzer-submit"` está en el segundo.
    const jobSpecForm = document.querySelectorAll("form")[0]!;
    fireEvent.submit(jobSpecForm);
    await waitFor(() => {
      expect(onJob).toHaveBeenCalledTimes(1);
    });
    // Paso 3: el submit del analyzer ahora está habilitado — click.
    const analyzeButton = screen.getByTestId("analyzer-submit");
    await waitFor(() => {
      expect(analyzeButton).toBeEnabled();
    });
    await user.click(analyzeButton);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    // El payload del submit es `{ cvText, job }` con un `JobSpec` tipado
    // (no `jobText: string` legacy). Verificamos AMBOS campos para asegurar
    // que la integración con analyzer.tsx pasa el `JobSpec` correcto.
    const payload = onSubmit.mock.calls[0][0] as {
      cvText: string;
      job: JobSpec;
    };
    expect(payload.cvText).toBe(VALID_CV);
    expect(payload.job.title).toBe(VALID_JOB.title);
    expect(payload.job.company).toBe(VALID_JOB.company);
    expect(payload.job.employmentType).toBe(VALID_JOB.employmentType);
    expect(payload.job.requirements).toEqual(VALID_JOB.requirements);
  });
});