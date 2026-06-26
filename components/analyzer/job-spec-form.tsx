"use client";

import { useId, useMemo, useState } from "react";
import {
  type EmploymentType,
  EMPLOYMENT_TYPES,
  type JobSpec,
  jobSpecSchema,
  validateJobSpec,
} from "@/lib/job/job-spec";
import { Field, inputClass } from "@/components/editor/_shared/form-field";
import { cn } from "@/lib/utils/cn";
import { copy } from "@/lib/copy/es";

/**
 * JobSpecForm — formulario estructurado y obligatorio para los datos de
 * la vacante (Constitution Art. V, anti-prompt-injection).
 *
 * Reemplaza el textarea legacy de `InputPanel` (PR 5b lo cablea). Acepta
 * un `initial?: Partial<JobSpec>` opcional para pre-poblar (PR 6 e2e
 * flow), y un `onSubmit(job: JobSpec)` que solo se invoca cuando el
 * `jobSpecSchema` (Zod) acepta el form completo.
 *
 * Validación 100% Zod — no hay reglas ad-hoc. La fuente de verdad es
 * `lib/job/job-spec.ts` (PR 1) y coincide byte a byte con el validator
 * del backend .NET (parity test).
 *
 * UX:
 *  - Submit deshabilitado mientras el schema rechace el form (reactivo,
 *    sin warnings ruidosos mientras el usuario tipea).
 *  - Errores inline por field al hacer submit (Zod issue message).
 *  - `RequirementsList` es sub-componente (PR 5a refactor) — add/remove
 *    con error display por index usando el path `requirements.<idx>`.
 *  - Cada input tiene label accesible vía `Field` (WCAG 4.1.2) y los
 *    errores se anuncian con `role="alert"` (WCAG 4.1.3).
 */
export function JobSpecForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<JobSpec>;
  onSubmit: (job: JobSpec) => void;
}) {
  const id = useId();
  const [title, setTitle] = useState<string>(initial?.title ?? "");
  const [company, setCompany] = useState<string>(initial?.company ?? "");
  const [description, setDescription] = useState<string>(
    initial?.description ?? "",
  );
  const [location, setLocation] = useState<string>(initial?.location ?? "");
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">(
    (initial?.employmentType as EmploymentType | undefined) ?? "",
  );
  const [requirements, setRequirements] = useState<string[]>(
    initial?.requirements ?? [""],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Estado completo del form (snapshot que Zod valida).
  const job = useMemo<Partial<JobSpec>>(
    () => ({
      title,
      company,
      description,
      location,
      employmentType: employmentType === "" ? undefined : employmentType,
      requirements,
    }),
    [title, company, description, location, employmentType, requirements],
  );

  // Submit reactivo: solo habilitado cuando el schema acepta el form.
  const isValid = useMemo(
    () => jobSpecSchema.safeParse(job).success,
    [job],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validateJobSpec(job);
    if (!result.success) {
      // Mapea ZodError → Record<path, message>. First-wins por path
      // (si Zod emite varios issues para el mismo campo, mostramos el
      // primero — la UX es "un error por field").
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_form";
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  const addRequirement = () => {
    setRequirements((prev) => [...prev, ""]);
  };

  const removeRequirement = (index: number) => {
    setRequirements((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Mantener al menos 1 slot visible (Zod exige min 1).
      return next.length === 0 ? [""] : next;
    });
    // Limpia el error de ese index para no dejar feedback colgando.
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`requirements.${index}`];
      return next;
    });
  };

  const updateRequirement = (index: number, value: string) => {
    setRequirements((prev) => prev.map((r, i) => (i === index ? value : r)));
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-labelledby={`${id}-title`}
      noValidate
      className="space-y-5"
    >
      <header className="space-y-1">
        <h2
          id={`${id}-title`}
          className="font-display text-xl text-ink"
        >
          {copy.analyze.jobLabel}
        </h2>
        <p className="text-xs text-faint">
          Todos los campos son obligatorios. Medimos coincidencia y
          legibilidad para sistemas automáticos — no es un &ldquo;puntaje
          ATS oficial&rdquo; (Constitution Art. IV).
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={copy.analyze.jobSpec.title}
          htmlFor={`${id}-title-field`}
          hint={copy.analyze.jobSpec.titleHint}
          error={errors.title}
        >
          <input
            id={`${id}-title-field`}
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
            }}
            className={inputClass()}
            aria-invalid={errors.title ? "true" : undefined}
            maxLength={500}
          />
        </Field>

        <Field
          label={copy.analyze.jobSpec.company}
          htmlFor={`${id}-company`}
          hint={copy.analyze.jobSpec.companyHint}
          error={errors.company}
        >
          <input
            id={`${id}-company`}
            type="text"
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
            }}
            className={inputClass()}
            aria-invalid={errors.company ? "true" : undefined}
            maxLength={500}
          />
        </Field>

        <Field
          label={copy.analyze.jobSpec.location}
          htmlFor={`${id}-location`}
          hint={copy.analyze.jobSpec.locationHint}
          error={errors.location}
        >
          <input
            id={`${id}-location`}
            type="text"
            value={location}
            onChange={(event) => {
              setLocation(event.target.value);
            }}
            className={inputClass()}
            aria-invalid={errors.location ? "true" : undefined}
            maxLength={500}
          />
        </Field>

        <Field
          label={copy.analyze.jobSpec.employmentType}
          htmlFor={`${id}-employment-type`}
          hint={copy.analyze.jobSpec.employmentTypeHint}
          error={errors.employmentType}
        >
          <select
            id={`${id}-employment-type`}
            value={employmentType}
            onChange={(event) => {
              setEmploymentType(
                event.target.value === ""
                  ? ""
                  : (event.target.value as EmploymentType),
              );
            }}
            className={inputClass()}
            aria-invalid={errors.employmentType ? "true" : undefined}
          >
            <option value=""></option>
            {EMPLOYMENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {copy.analyze.jobSpec.employmentTypeOptions[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label={copy.analyze.jobSpec.description}
        htmlFor={`${id}-description`}
        hint={copy.analyze.jobSpec.descriptionHint}
        error={errors.description}
      >
        <textarea
          id={`${id}-description`}
          rows={6}
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
          }}
          className={cn(inputClass(), "resize-y")}
          aria-invalid={errors.description ? "true" : undefined}
        />
      </Field>

      <RequirementsList
        id={id}
        requirements={requirements}
        errors={errors}
        onAdd={addRequirement}
        onRemove={removeRequirement}
        onChange={updateRequirement}
      />

      <footer className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-faint">
          {copy.analyze.privacy}
        </p>
        <button
          type="submit"
          disabled={!isValid}
          className={cn(
            "rounded-full px-7 py-3 font-medium transition",
            isValid
              ? "bg-accent text-accent-ink hover:brightness-110"
              : "cursor-not-allowed bg-surface-2 text-faint",
          )}
        >
          {copy.analyze.submit}
        </button>
      </footer>
    </form>
  );
}

/**
 * RequirementsList — sub-componente presentacional de la lista de
 * requisitos. Maneja add/remove y propaga el error por index
 * (`requirements.<idx>`) al `Field` correspondiente.
 *
 * Mantiene al menos 1 slot vacío visible para que el usuario pueda
 * empezar a tipear sin tener que clickear "Agregar requisito" antes
 * (UX progressive disclosure).
 */
function RequirementsList({
  id,
  requirements,
  errors,
  onAdd,
  onRemove,
  onChange,
}: {
  id: string;
  requirements: ReadonlyArray<string>;
  errors: Record<string, string>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, value: string) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-line bg-surface/30 p-4">
      <legend className="px-1 text-sm font-medium text-ink">
        {copy.analyze.jobSpec.requirements}
      </legend>
      <p className="text-xs text-faint">
        {copy.analyze.jobSpec.requirementsHint}
      </p>
      <ul className="space-y-2">
        {requirements.map((value, index) => {
          const errorKey = `requirements.${index}`;
          const error = errors[errorKey] ?? errors.requirements;
          const inputId = `${id}-req-${index}`;
          return (
            <li
              key={index}
              className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
            >
              <Field
                label={copy.analyze.jobSpec.requirementLabel(index)}
                htmlFor={inputId}
                error={error}
              >
                <input
                  id={inputId}
                  type="text"
                  value={value}
                  onChange={(event) => {
                    onChange(index, event.target.value);
                  }}
                  className={inputClass()}
                  placeholder={
                    copy.analyze.jobSpec.requirementPlaceholder
                  }
                  aria-invalid={error ? "true" : undefined}
                />
              </Field>
              <button
                type="button"
                onClick={() => {
                  onRemove(index);
                }}
                aria-label={copy.analyze.jobSpec.removeRequirement(index)}
                className="self-end rounded-full border border-missing/40 bg-missing/10 px-3 py-1.5 text-xs font-medium text-missing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {copy.analyze.jobSpec.addRequirement}
      </button>
    </fieldset>
  );
}
