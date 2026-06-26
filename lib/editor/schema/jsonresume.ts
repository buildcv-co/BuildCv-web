/**
 * Schema Zod JSON Resume para el editor (PR 4a — foundation de PR 4).
 *
 * Match 1:1 contra https://jsonresume.org/schema.json con dos extensiones:
 *  1. `ConfidenceMarker` (`inferred` | `explicit` | `user_confirmed`) en cada
 *     campo que el parser/backend (`BuildCv.Domain.Resumes.CvDocument.cs`)
 *     ya etiqueta. Constitution Art. I: el parser nunca inventa; la UI
 *     promueve `inferred → user_confirmed` solo al editar.
 *  2. `DatosPersonalesSchema` bajo `basics` (NO top-level — preserva compat
 *     JSON Resume): `cedula`, `nacionalidad`, `estadoCivil`,
 *     `libretaMilitar`, `rh`. Enums cerrados para los valores esperados en
 *     Colombia (PR 1 los define como strings libres, aquí los cerramos).
 *
 * Tipos exportados se infieren con `z.infer<...>` — NO se duplican a mano.
 * Así el contrato del backend (C#) ↔ schema Zod (web) nunca se desalinea.
 *
 * Decisiones:
 *  - `.strict()` en todos los objects: rechaza campos desconocidos (Constitution
 *    Art. V — sin invención).
 *  - `basics.location` se modela como `string` (no objeto) por compat con
 *    `lib/job/cv-document.ts` (PR 1).
 *  - `endDate` acepta `YYYY-MM` | `"Present"` | `null`. El literal `"Present"`
 *    es la convención UX del editor ("trabajo actual").
 *  - `urlOrEmpty` permite `""` o URL válida: JSON Resume admite URLs vacías en
 *    `profiles[].url` y `certificates.url`.
 *  - Phone regex `^\+?\d{7,15}$`: solo dígitos con `+` opcional, 7-15 dígitos
 *    (E.164 sin separadores).
 */
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Fecha parcial ISO `YYYY-MM` (JSON Resume: `startDate`/`endDate`).
 * El schema canónico acepta también `YYYY-MM-DD` y `YYYY`, pero el
 * contrato con el backend exige precisión mensual para que el scoring
 * calcule gaps de empleo (red-flag `gap > 6mo`).
 */
export const jsonResumeDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, { message: "Fecha debe tener formato YYYY-MM" });

/**
 * URL opcional con string vacío permitido. JSON Resume admite URLs vacías
 * (ej: `profiles[].url === ""` cuando solo se conoce el username).
 */
const urlOrEmpty = z.union([
  z.literal(""),
  z.string().url({ message: "URL inválida" }),
]);

/**
 * Teléfono internacional formato E.164 simplificado: prefijo `+` opcional,
 * 7-15 dígitos, sin separadores. `+57 300 123 4567` se rechaza a propósito
 * — el editor normaliza en blur a `+573001234567`.
 */
const phoneSchema = z
  .string()
  .regex(/^\+?\d{7,15}$/, {
    message: "Teléfono debe tener 7-15 dígitos, opcional prefijo +",
  });

// ─────────────────────────────────────────────────────────────────────
// ConfidenceMarker — Constitution Art. I
// ─────────────────────────────────────────────────────────────────────

export const confidenceMarkerSchema = z.enum([
  "inferred",
  "explicit",
  "user_confirmed",
]);

export type ConfidenceMarker = z.infer<typeof confidenceMarkerSchema>;

// ─────────────────────────────────────────────────────────────────────
// DatosPersonales — extensión colombiana bajo basics
// ─────────────────────────────────────────────────────────────────────

const NACIONALIDADES_CO = ["CO", "EC", "PE", "BR", "MX", "AR", "CL"] as const;
const ESTADOS_CIVILES = [
  "soltero",
  "casado",
  "union_libre",
  "divorciado",
  "viudo",
] as const;
const LIBRETA_MILITAR = ["primera", "segunda", "no_aplica"] as const;
const RH_SANGUINEO = [
  "A+",
  "A-",
  "B+",
  "B-",
  "O+",
  "O-",
  "AB+",
  "AB-",
] as const;

export const datosPersonalesSchema = z
  .object({
    /** Cédula de ciudadanía / DNI: numérico puro, 6-10 dígitos. */
    cedula: z
      .string()
      .regex(/^\d{6,10}$/, {
        message: "Cédula debe ser numérica, 6-10 dígitos",
      })
      .optional(),
    /** Nacionalidad (códigos LATAM soportados en MVP). */
    nacionalidad: z.enum(NACIONALIDADES_CO).optional(),
    /** Estado civil — enum cerrado para evitar valores libres. */
    estadoCivil: z.enum(ESTADOS_CIVILES).optional(),
    /** Libreta militar — `no_aplica` para mujeres / no obligados. */
    libretaMilitar: z.enum(LIBRETA_MILITAR).optional(),
    /** Factor RH + grupo sanguíneo (8 combinaciones estándar). */
    rh: z.enum(RH_SANGUINEO).optional(),
  })
  .strict();

export type DatosPersonales = z.infer<typeof datosPersonalesSchema>;

// ─────────────────────────────────────────────────────────────────────
// Basics — perfil + contacto + extensión colombiana
// ─────────────────────────────────────────────────────────────────────

const profileSchema = z
  .object({
    network: z.string().min(1).max(60),
    username: z.string().max(60).optional(),
    url: urlOrEmpty,
  })
  .strict();

const basicsConfidenceSchema = z
  .object({
    name: confidenceMarkerSchema,
    email: confidenceMarkerSchema,
    phone: confidenceMarkerSchema,
    location: confidenceMarkerSchema,
    url: confidenceMarkerSchema,
    profiles: confidenceMarkerSchema,
    summary: confidenceMarkerSchema,
    datosPersonales: confidenceMarkerSchema,
  })
  .strict();

export const basicsSchema = z
  .object({
    name: z.string().min(1, { message: "Requerido" }).max(200),
    email: z.string().email({ message: "Email inválido" }),
    phone: phoneSchema.optional(),
    location: z.string().min(1).max(200).optional(),
    url: urlOrEmpty.optional(),
    profiles: z.array(profileSchema).max(10),
    summary: z.string().max(2000).optional(),
    /**
     * Extensión colombiana. VIVE bajo `basics` para preservar compat JSON
     * Resume — NUNCA como sección top-level. Ausente (undefined) cuando el
     * candidato no la provee (extranjeros, cv importados sin la sección).
     */
    datosPersonales: datosPersonalesSchema.optional(),
    confidence: basicsConfidenceSchema,
  })
  .strict();

export type Basics = z.infer<typeof basicsSchema>;

// ─────────────────────────────────────────────────────────────────────
// Work — entradas de experiencia laboral
// ─────────────────────────────────────────────────────────────────────

const endDateSchema = z.union([
  jsonResumeDateSchema,
  z.literal("Present"),
  z.null(),
]);

const workConfidenceSchema = z
  .object({
    name: confidenceMarkerSchema,
    position: confidenceMarkerSchema,
    startDate: confidenceMarkerSchema,
    endDate: confidenceMarkerSchema,
    summary: confidenceMarkerSchema,
    highlights: confidenceMarkerSchema,
  })
  .strict();

const workEntryShape = z.object({
  name: z.string().min(1, { message: "Requerido" }).max(200),
  position: z.string().min(1, { message: "Requerido" }).max(200),
  location: z.string().max(200).optional(),
  /** URL de la empresa. NO usamos `urlOrEmpty` aquí — si la provee el parser
   * debe ser válida (URL vacía en una experiencia no aporta valor). */
  url: z.string().url().optional(),
  startDate: jsonResumeDateSchema,
  endDate: endDateSchema,
  summary: z.string().max(2000).optional(),
  highlights: z.array(z.string().min(1).max(500)).max(20).optional(),
});

export const workSchema = workEntryShape
  .extend({
    confidence: workConfidenceSchema,
  })
  .strict()
  /**
   * Regla temporal: `startDate` no puede ser posterior a `endDate` cuando
   * `endDate` es una fecha YYYY-MM. Cuando `endDate === "Present"` o `null`,
   * la regla no aplica (trabajo actual o no especificado).
   */
  .superRefine((data, ctx) => {
    if (data.endDate === null || data.endDate === "Present") return;
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "startDate debe ser anterior o igual a endDate",
      });
    }
  });

export type Work = z.infer<typeof workSchema>;

// ─────────────────────────────────────────────────────────────────────
// Education — formación académica
// ─────────────────────────────────────────────────────────────────────

const educationConfidenceSchema = z
  .object({
    institution: confidenceMarkerSchema,
    area: confidenceMarkerSchema,
    studyType: confidenceMarkerSchema,
    startDate: confidenceMarkerSchema,
    endDate: confidenceMarkerSchema,
    score: confidenceMarkerSchema,
  })
  .strict();

export const educationSchema = z
  .object({
    institution: z
      .string()
      .min(1, { message: "Requerido" })
      .max(200),
    url: z.string().url().optional(),
    area: z.string().max(120).optional(),
    studyType: z.string().max(120).optional(),
    startDate: jsonResumeDateSchema.optional(),
    endDate: jsonResumeDateSchema.nullable().optional(),
    score: z.string().max(40).optional(),
    courses: z.array(z.string().min(1).max(200)).max(50).optional(),
    confidence: educationConfidenceSchema,
  })
  .strict();

export type Education = z.infer<typeof educationSchema>;

// ─────────────────────────────────────────────────────────────────────
// Skills — agrupación por categoría (JSON Resume: keyword list por skill)
// ─────────────────────────────────────────────────────────────────────

const skillsConfidenceSchema = z
  .object({
    name: confidenceMarkerSchema,
    level: confidenceMarkerSchema,
    keywords: confidenceMarkerSchema,
  })
  .strict();

export const skillsSchema = z
  .object({
    name: z.string().min(1, { message: "Requerido" }).max(120),
    level: z.string().max(60).optional(),
    keywords: z.array(z.string().min(1).max(60)).max(30).optional(),
    confidence: skillsConfidenceSchema,
  })
  .strict();

export type Skills = z.infer<typeof skillsSchema>;

// ─────────────────────────────────────────────────────────────────────
// Projects — proyectos destacados (con roles, highlights, keywords)
// ─────────────────────────────────────────────────────────────────────

const projectsConfidenceSchema = z
  .object({
    name: confidenceMarkerSchema,
    description: confidenceMarkerSchema,
    highlights: confidenceMarkerSchema,
    keywords: confidenceMarkerSchema,
    startDate: confidenceMarkerSchema,
    endDate: confidenceMarkerSchema,
    url: confidenceMarkerSchema,
    roles: confidenceMarkerSchema,
  })
  .strict();

export const projectsSchema = z
  .object({
    name: z.string().min(1, { message: "Requerido" }).max(200),
    description: z.string().max(2000).optional(),
    highlights: z.array(z.string().min(1).max(500)).max(20).optional(),
    keywords: z.array(z.string().min(1).max(60)).max(30).optional(),
    startDate: jsonResumeDateSchema.optional(),
    endDate: endDateSchema.optional(),
    url: urlOrEmpty.optional(),
    roles: z.array(z.string().min(1).max(80)).max(10).optional(),
    entity: z.string().max(120).optional(),
    type: z.string().max(60).optional(),
    confidence: projectsConfidenceSchema,
  })
  .strict();

export type Projects = z.infer<typeof projectsSchema>;

// ─────────────────────────────────────────────────────────────────────
// Certificates — certificaciones (ISO `YYYY-MM` para `date`)
// ─────────────────────────────────────────────────────────────────────

const certificatesConfidenceSchema = z
  .object({
    name: confidenceMarkerSchema,
    date: confidenceMarkerSchema,
    issuer: confidenceMarkerSchema,
    url: confidenceMarkerSchema,
  })
  .strict();

export const certificatesSchema = z
  .object({
    name: z.string().min(1, { message: "Requerido" }).max(200),
    date: jsonResumeDateSchema.optional(),
    issuer: z.string().max(200).optional(),
    url: urlOrEmpty.optional(),
    confidence: certificatesConfidenceSchema,
  })
  .strict();

export type Certificates = z.infer<typeof certificatesSchema>;

// ─────────────────────────────────────────────────────────────────────
// Languages — idiomas con nivel de fluidez libre
// ─────────────────────────────────────────────────────────────────────

const languagesConfidenceSchema = z
  .object({
    language: confidenceMarkerSchema,
    fluency: confidenceMarkerSchema,
  })
  .strict();

export const languagesSchema = z
  .object({
    language: z.string().min(1, { message: "Requerido" }).max(60),
    fluency: z.string().max(60).optional(),
    confidence: languagesConfidenceSchema,
  })
  .strict();

export type Languages = z.infer<typeof languagesSchema>;

// ─────────────────────────────────────────────────────────────────────
// Awards / Interests / References — secciones opcionales JSON Resume
// (cubiertas en el schema; opcionales en `cvDocumentSchema`)
// ─────────────────────────────────────────────────────────────────────

const awardsConfidenceSchema = z
  .object({
    title: confidenceMarkerSchema,
    date: confidenceMarkerSchema,
    awarder: confidenceMarkerSchema,
    summary: confidenceMarkerSchema,
  })
  .strict();

export const awardsSchema = z
  .object({
    title: z.string().min(1).max(200),
    date: jsonResumeDateSchema.optional(),
    awarder: z.string().max(200).optional(),
    summary: z.string().max(1000).optional(),
    confidence: awardsConfidenceSchema,
  })
  .strict();

export type Awards = z.infer<typeof awardsSchema>;

const interestsConfidenceSchema = z
  .object({
    name: confidenceMarkerSchema,
    keywords: confidenceMarkerSchema,
  })
  .strict();

export const interestsSchema = z
  .object({
    name: z.string().min(1).max(120),
    keywords: z.array(z.string().min(1).max(60)).max(20).optional(),
    confidence: interestsConfidenceSchema,
  })
  .strict();

export type Interests = z.infer<typeof interestsSchema>;

const referencesConfidenceSchema = z
  .object({
    name: confidenceMarkerSchema,
    reference: confidenceMarkerSchema,
  })
  .strict();

export const referencesSchema = z
  .object({
    name: z.string().min(1).max(120),
    reference: z.string().min(1).max(2000),
    confidence: referencesConfidenceSchema,
  })
  .strict();

export type References = z.infer<typeof referencesSchema>;

// ─────────────────────────────────────────────────────────────────────
// CvDocument — top-level, sella `engineVersion: "2.0.0"`
// ─────────────────────────────────────────────────────────────────────

const cvMetaSchema = z
  .object({
    engineVersion: z.literal("2.0.0"),
  })
  .strict();

export const cvDocumentSchema = z
  .object({
    basics: basicsSchema,
    work: z.array(workSchema).max(50),
    education: z.array(educationSchema).max(20),
    skills: z.array(skillsSchema).max(30),
    projects: z.array(projectsSchema).max(30).optional(),
    certificates: z.array(certificatesSchema).max(30).optional(),
    languages: z.array(languagesSchema).max(20).optional(),
    awards: z.array(awardsSchema).max(30).optional(),
    interests: z.array(interestsSchema).max(30).optional(),
    references: z.array(referencesSchema).max(20).optional(),
    meta: cvMetaSchema,
  })
  .strict();

export type CvDocument = z.infer<typeof cvDocumentSchema>;

/**
 * Wrapper que devuelve un resultado seguro en vez de lanzar `ZodError`.
 * Patrón alineado con `validateJobSpec` (`lib/job/job-spec.ts`) y con los
 * `isXxx` type guards de `lib/api/types.ts`.
 */
export function validateCvDocument(
  input: unknown,
): { success: true; data: CvDocument } | { success: false } {
  const result = cvDocumentSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false };
}