import { z } from "zod";

const DATE_PARTIAL_RE = /^\d{4}(-\d{2})?$/;

export const CertificationsSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("certifications"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z
    .array(
      z.object({
          name: z.string().max(200),
        issuer: z.string().max(200),
        date: z
          .string()
          .max(20)
          .refine(
            (s) => s.length === 0 || DATE_PARTIAL_RE.test(s),
            "date debe ser vacío, 'YYYY' o 'YYYY-MM'",
          ),
        credentialId: z.union([z.string().max(200), z.null()]),
      }),
    )
    .max(50),
});
