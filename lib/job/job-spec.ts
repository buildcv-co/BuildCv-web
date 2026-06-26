import { z } from "zod";

/**
 * Substrings que rechazamos en cualquier campo de texto libre del JobSpec.
 * Defensa contra prompt injection (Constitution Art. V). Coincidencia
 * case-insensitive. La lista DEBE coincidir con la de `JobSpecValidator` en
 * el backend (parity test).
 */
export const PROMPT_INJECTION_PATTERNS: readonly string[] = [
  "ignore previous",
  "system:",
  "<|im_start|>",
  "assistant:",
] as const;

const CONTROL_CHAR_REGEX = /[\x00-\x1F\x7F]/u;
const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/u;

function containsPromptInjection(value: string): boolean {
  const lower = value.toLowerCase();
  if (PROMPT_INJECTION_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return true;
  }
  if (CONTROL_CHAR_REGEX.test(value)) {
    return true;
  }
  if (ZERO_WIDTH_REGEX.test(value)) {
    return true;
  }
  return false;
}

export const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
]);

export type EmploymentType = z.infer<typeof employmentTypeSchema>;

/**
 * Tupla con los 5 valores válidos de `EmploymentType`, en el orden canónico
 * que usa el `<select>` del `JobSpecForm` (PR 5a). Iterar este array garantiza
 * que el orden del dropdown match el orden de la schema Zod (Constitution
 * Art. V — single source of truth).
 */
export const EMPLOYMENT_TYPES: readonly EmploymentType[] = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
] as const;

const freeTextField = (maxLength: number) =>
  z
    .string({ message: "Requerido" })
    .min(1, { message: "Requerido" })
    .max(maxLength, { message: `Máximo ${maxLength} caracteres` })
    .refine((value) => !containsPromptInjection(value), {
      message: "Requisito contiene patrones sospechosos",
    });

const requirementSchema = z
  .string({ message: "Requerido" })
  .min(1, { message: "Requerido" })
  .max(500, { message: "Máximo 500 caracteres" })
  .refine((value) => !containsPromptInjection(value), {
    message: "Requisito contiene patrones sospechosos",
  });

export const jobSpecSchema = z.object({
  title: freeTextField(200),
  company: freeTextField(200),
  description: freeTextField(5000),
  location: freeTextField(200),
  employmentType: employmentTypeSchema,
  requirements: z
    .array(requirementSchema)
    .min(1, { message: "Al menos un requisito" })
    .max(50, { message: "Máximo 50 requisitos" }),
});

export type JobSpec = z.infer<typeof jobSpecSchema>;

/**
 * Wrapper que devuelve un resultado seguro en vez de lanzar ZodError,
 * alineado con el patrón `isXxx` ya usado en `lib/api/types.ts`.
 *
 * En la rama de fallo incluye el `ZodError` para que callers como
 * `JobSpecForm` (PR 5a) puedan mapear los issues a errores por field
 * (path → message). Backward-compatible: los callers existentes solo
 * chequean `result.success` y la union discriminada sigue angostando
 * correctamente.
 */
export function validateJobSpec(
  input: unknown,
):
  | { success: true; data: JobSpec }
  | { success: false; error: z.ZodError } {
  const result = jobSpecSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
