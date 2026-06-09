import { z } from "zod";

export const OtherSectionSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.literal("other"),
  source: z.enum(["imported", "user-typed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  title: z.string().max(200),
  content: z.string().max(5000),
});
