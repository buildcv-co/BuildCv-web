import { z } from "zod";

export const LanguagesSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("languages"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z
    .array(
      z.object({
        language: z.string().max(100),
        level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2", "Native"]),
      }),
    )
    .max(30),
});
