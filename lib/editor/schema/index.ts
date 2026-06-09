import { z } from "zod";
import type { CvDocument } from "../types";
import { ProfileSectionSchema } from "./profile";
import { ExperienceSectionSchema } from "./experience";
import { EducationSectionSchema } from "./education";
import { SkillsSectionSchema } from "./skills";
import { ProjectsSectionSchema } from "./projects";
import { CertificationsSectionSchema } from "./certifications";
import { LanguagesSectionSchema } from "./languages";
import { OtherSectionSchema } from "./other";

export {
  ProfileSectionSchema,
  ExperienceSectionSchema,
  EducationSectionSchema,
  SkillsSectionSchema,
  ProjectsSectionSchema,
  CertificationsSectionSchema,
  LanguagesSectionSchema,
  OtherSectionSchema,
};

export const CvSectionSchema = z.discriminatedUnion("kind", [
  ProfileSectionSchema,
  ExperienceSectionSchema,
  EducationSectionSchema,
  SkillsSectionSchema,
  ProjectsSectionSchema,
  CertificationsSectionSchema,
  LanguagesSectionSchema,
  OtherSectionSchema,
]);

export const EntityRefSchema = z.object({
  id: z.string().min(1).max(50),
  kind: z.enum(["skill", "certification", "company", "role", "date", "metric", "other"]),
  value: z.string().min(1).max(200),
  normalized: z.string().min(1).max(200),
  source: z.enum(["imported", "user-typed"]),
  confidence: z.enum(["high", "low"]),
  sectionId: z.string().min(1).max(50),
  firstSeenAt: z.string().datetime(),
});

export const CvDocumentSchema = z.object({
  id: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  locale: z.enum(["es-CO", "en-US"]),
  sections: z.array(CvSectionSchema).max(8),
  entities: z.array(EntityRefSchema).max(500),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  source: z.enum(["imported", "blank", "pasted"]),
});

export const ScoreHistoryEntrySchema = z.object({
  score: z.number().int().min(0).max(100),
  band: z.string().min(1).max(50),
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  at: z.string().datetime(),
});

export const EngineVersionsSchema = z.object({
  editor: z.string().regex(/^\d+\.\d+\.\d+$/),
  score: z.string().regex(/^\d+\.\d+\.\d+$/),
});

export const DraftSchema = z.object({
  id: z.string().min(1).max(50),
  document: CvDocumentSchema,
  jobText: z.string().max(20_000),
  scoreHistory: z.array(ScoreHistoryEntrySchema).max(20),
  lastSavedAt: z.string().datetime(),
  engineVersions: EngineVersionsSchema,
});

export const CvDocumentLikeSchema = CvDocumentSchema;

const ISO_EPOCH = new Date(0).toISOString();

export const BLANK_DOCUMENT: CvDocument = Object.freeze({
  id: "blank",
  version: "0.5.0",
  locale: "es-CO",
  sections: [],
  entities: [],
  createdAt: ISO_EPOCH,
  updatedAt: ISO_EPOCH,
  source: "blank",
}) as CvDocument;
