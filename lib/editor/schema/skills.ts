import { z } from "zod";

export const SkillsSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("skills"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  groups: z
    .array(
      z.object({
        category: z.string().max(100),
        items: z.array(z.string().max(100)).max(100),
      }),
    )
    .max(20),
});
