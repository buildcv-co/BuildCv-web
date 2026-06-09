import { z } from "zod";

const DATE_PARTIAL_RE = /^\d{4}(-\d{2})?$/;

export const EducationSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("education"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  degree: z.string().max(200),
  institution: z.string().max(200),
  startDate: z
    .string()
    .max(20)
    .refine(
      (s) => s.length === 0 || DATE_PARTIAL_RE.test(s),
      "startDate debe ser vacío, 'YYYY' o 'YYYY-MM'",
    ),
  endDate: z
    .union([z.string().max(20), z.null()])
    .refine(
      (v) => v === null || (v as string).length === 0 || DATE_PARTIAL_RE.test(v as string),
      "endDate debe ser null, 'YYYY' o 'YYYY-MM'",
    ),
  location: z.string().max(200),
  description: z.string().max(2000),
});
