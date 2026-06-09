import { z } from "zod";

const DATE_PARTIAL_RE = /^\d{4}(-\d{2})?$/;

export const ExperienceSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("experience"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  role: z.string().max(200),
  company: z.string().max(200),
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
  bullets: z.array(z.string().max(2000)).max(50),
  techStack: z.array(z.string().max(100)).max(50),
});
