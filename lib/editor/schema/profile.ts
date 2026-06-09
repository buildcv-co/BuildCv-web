import { z } from "zod";

export const ProfileSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("profile"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  fullName: z.string().max(200),
  headline: z.string().max(200),
  email: z
    .string()
    .max(200)
    .refine(
      (s) => s.length === 0 || /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(s),
      "email inválido",
    ),
  phone: z.string().max(50),
  location: z.string().max(200),
  links: z
    .array(
      z.object({
        label: z.string().min(1).max(50),
        url: z.string().url().max(500),
      }),
    )
    .max(10),
  summary: z.string().max(2000),
});
