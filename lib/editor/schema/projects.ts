import { z } from "zod";

export const ProjectsSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("projects"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z
    .array(
      z.object({
          name: z.string().max(200),
        description: z.string().max(2000),
        techStack: z.array(z.string().max(100)).max(50),
        link: z
          .union([z.string().url().max(500), z.null()])
          .refine(
            (v) => v === null || v.length === 0 || /^https?:\/\//.test(v),
            "link debe ser URL válida o vacío",
          ),
      }),
    )
    .max(20),
});
