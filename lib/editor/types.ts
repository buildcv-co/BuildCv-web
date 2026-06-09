/**
 * Tipos centrales de la feature 006-web-cv-editor.
 * Inmutables (readonly everywhere). Validados en runtime con Zod (lib/editor/schema).
 *
 * DECISIÓN ARQUITECTÓNICA: NO usamos Tiptap. El "documento" es un objeto
 * estructurado con 8 secciones tipadas. Cada sección se renderiza con su propio
 * formulario (textareas, inputs). Esto preserva Constitution Art. I, III, V
 * con menos bundle y tests más simples.
 */

export type CvSectionKind =
  | "profile"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "other";

export type EntityKind =
  | "skill"
  | "certification"
  | "company"
  | "role"
  | "date"
  | "metric"
  | "other";

export type EntitySource = "imported" | "user-typed";

export type EntityConfidence = "high" | "low";

export type LanguageLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";

export type DocumentSource = "imported" | "blank" | "pasted";

export type Locale = "es-CO" | "en-US";

export interface CvSectionBase {
  readonly id: string;
  readonly kind: CvSectionKind;
  readonly source: EntitySource;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProfileSection extends CvSectionBase {
  readonly kind: "profile";
  readonly fullName: string;
  readonly headline: string;
  readonly email: string;
  readonly phone: string;
  readonly location: string;
  readonly links: ReadonlyArray<{ readonly label: string; readonly url: string }>;
  readonly summary: string;
}

export interface ExperienceSection extends CvSectionBase {
  readonly kind: "experience";
  readonly role: string;
  readonly company: string;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly location: string;
  readonly bullets: ReadonlyArray<string>;
  readonly techStack: ReadonlyArray<string>;
}

export interface EducationSection extends CvSectionBase {
  readonly kind: "education";
  readonly degree: string;
  readonly institution: string;
  readonly startDate: string;
  readonly endDate: string | null;
  readonly location: string;
  readonly description: string;
}

export interface SkillsSection extends CvSectionBase {
  readonly kind: "skills";
  readonly groups: ReadonlyArray<{
    readonly category: string;
    readonly items: ReadonlyArray<string>;
  }>;
}

export interface ProjectsSection extends CvSectionBase {
  readonly kind: "projects";
  readonly items: ReadonlyArray<{
    readonly name: string;
    readonly description: string;
    readonly techStack: ReadonlyArray<string>;
    readonly link: string | null;
  }>;
}

export interface CertificationsSection extends CvSectionBase {
  readonly kind: "certifications";
  readonly items: ReadonlyArray<{
    readonly name: string;
    readonly issuer: string;
    readonly date: string;
    readonly credentialId: string | null;
  }>;
}

export interface LanguagesSection extends CvSectionBase {
  readonly kind: "languages";
  readonly items: ReadonlyArray<{
    readonly language: string;
    readonly level: LanguageLevel;
  }>;
}

export interface OtherSection extends CvSectionBase {
  readonly kind: "other";
  readonly title: string;
  readonly content: string;
}

export type CvSection =
  | ProfileSection
  | ExperienceSection
  | EducationSection
  | SkillsSection
  | ProjectsSection
  | CertificationsSection
  | LanguagesSection
  | OtherSection;

export interface EntityRef {
  readonly id: string;
  readonly kind: EntityKind;
  readonly value: string;
  readonly normalized: string;
  readonly source: EntitySource;
  readonly confidence: EntityConfidence;
  readonly sectionId: string;
  readonly firstSeenAt: string;
}

export interface CvDocument {
  readonly id: string;
  readonly version: string;
  readonly locale: Locale;
  readonly sections: ReadonlyArray<CvSection>;
  readonly entities: ReadonlyArray<EntityRef>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly source: DocumentSource;
}

export interface ScoreHistoryEntry {
  readonly score: number;
  readonly band: string;
  readonly engineVersion: string;
  readonly at: string;
}

export interface EngineVersions {
  readonly editor: string;
  readonly score: string;
}

export interface Draft {
  readonly id: string;
  readonly document: CvDocument;
  readonly jobText: string;
  readonly scoreHistory: ReadonlyArray<ScoreHistoryEntry>;
  readonly lastSavedAt: string;
  readonly engineVersions: EngineVersions;
}

export interface DraftSummary {
  readonly id: string;
  readonly lastSavedAt: string;
  readonly sectionCount: number;
  readonly entityCount: number;
}
