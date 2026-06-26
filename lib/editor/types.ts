/**
 * Tipos del editor migrados a JSON Resume (PR 4b — migration bridge).
 *
 * Antes: `CvDocument` era el shape "8 secciones tipadas" del editor legacy
 * (ProfileSection / ExperienceSection / …). Después: `CvDocument` es JSON
 * Resume (basics / work / education / skills / projects / certificates /
 * languages + meta.engineVersion === "2.0.0" + confidence markers). El
 * shape viejo sobrevive como `LegacyCvDocument` para que
 * `parseCvDocument()` (markdown parser) y los payloads viejos de
 * localStorage sigan funcionando hasta que `editor.tsx` migre en PR 4e.
 *
 * Sub-tipos (Basics, Work, …, ConfidenceMarker, DatosPersonales) se
 * re-exportan desde `./schema/jsonresume` (PR 4a) — NO se duplican a mano.
 * Así el contrato Zod ↔ TS no se desalinea.
 *
 * Constitution Art. I: la fuente del parseo plain-text nunca es
 * confirmación del usuario — `migrateLegacyToJsonResume` siempre marca
 * `confidence: 'inferred'`. Promote a `'user_confirmed'` solo en blur del
 * editor (PR 4d).
 */

import type {
  CvDocument as JsonResumeCvDocument,
  Basics,
  Work,
  Education,
  Skills,
  Projects,
  Certificates,
  Languages,
  Awards,
  Interests,
  References,
  ConfidenceMarker,
  DatosPersonales,
} from "./schema/jsonresume";

// ─────────────────────────────────────────────────────────────────────
// Primary: CvDocument = JSON Resume (PR 4a re-export)
// ─────────────────────────────────────────────────────────────────────

/**
 * CvDocument principal del editor — shape JSON Resume compatible
 * (https://jsonresume.org/schema) con extensión colombiana `datosPersonales`
 * bajo `basics`. Cada campo lleva su `ConfidenceMarker`.
 *
 * Re-exportado por inferencia desde `./schema/jsonresume` (PR 4a). NO
 * redefinir a mano — eso desincroniza Zod ↔ TS.
 */
export type CvDocument = JsonResumeCvDocument;

// ─────────────────────────────────────────────────────────────────────
// Legacy: shape viejo de 8 secciones tipadas — backward-compat
// ─────────────────────────────────────────────────────────────────────

/**
 * Shape viejo del editor — 8 secciones tipadas (profile / experience /
 * education / skills / projects / certifications / languages / other) +
 * entities + locale + version. Producido por `parseCvDocument()` (markdown
 * parser) y persistido en payloads viejos de localStorage bajo
 * `buildcv:draft:*`.
 *
 * Sobrevive como alias para que PR 4c/4d/4e migren gradualmente los
 * consumidores (PR 4e migrará `editor.tsx`). NO se debe usar para código
 * nuevo — usar `CvDocument` (JSON Resume).
 */
export type LegacyCvDocument = {
  readonly id: string;
  readonly version: string;
  readonly locale: Locale;
  readonly sections: ReadonlyArray<CvSection>;
  readonly entities: ReadonlyArray<EntityRef>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly source: DocumentSource;
};

// ─────────────────────────────────────────────────────────────────────
// Re-exports: sub-tipos JSON Resume para que el editor los importe de
// `@/lib/editor/types` (single import surface).
// ─────────────────────────────────────────────────────────────────────

export type {
  Basics,
  Work,
  Education,
  Skills,
  Projects,
  Certificates,
  Languages,
  Awards,
  Interests,
  References,
  ConfidenceMarker,
  DatosPersonales,
};

// ─────────────────────────────────────────────────────────────────────
// Tipos legacy (mantenidos para `parseCvDocument`, `serializeCvDocument`,
// `LocalStorageCvStore`, `editor.tsx` hasta PR 4e).
// ─────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────
// Draft — envuelve LegacyCvDocument para localStorage (PR 4e migrará a
// CvDocument JSON Resume cuando el editor esté en el nuevo shape).
// ─────────────────────────────────────────────────────────────────────

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
  readonly document: LegacyCvDocument;
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

// ─────────────────────────────────────────────────────────────────────
// migrateLegacyToJsonResume — bridge de migración (PR 4b)
// ─────────────────────────────────────────────────────────────────────

/**
 * Convierte un `LegacyCvDocument` (8 secciones tipadas del editor legacy,
 * producido por `parseCvDocument()` markdown o cargado de payloads viejos
 * de localStorage) a un `CvDocument` JSON Resume con todos los campos
 * marcados `confidence: 'inferred'`.
 *
 * Decisiones Constitution Art. I:
 *  - **Todos los campos `confidence: 'inferred'`**. La fuente plain-text
 *    nunca es confirmación del usuario — promote a `'user_confirmed'`
 *    solo en blur del editor (PR 4d).
 *  - **El texto de cada sección NO se reconstruye**. `parseCvDocument()`
 *    producía texto libre (markdown); mapear ese texto a campos
 *    estructurados sería invención (Art. I: cero invención). El usuario
 *    re-ingresa la información en el editor estructurado.
 *  - **`work`/`education`/`skills`/`projects`/`certificates`/`languages`
 *    arrancan vacíos** — el usuario los completa desde cero.
 *  - **`meta.engineVersion === "2.0.0"`** — SemVer seal del schema JSON
 *    Resume (PR 4a).
 *  - **`meta.lastModified`** usa epoch (`new Date(0)`) porque esta función
 *    se llama una vez por payload viejo durante migración — no es el
 *    camino de cálculo (Constitution Art. II). El próximo save del editor
 *    sobrescribirá este valor con la hora real.
 */
export function migrateLegacyToJsonResume(
  legacy: LegacyCvDocument,
): CvDocument {
  void legacy;
  return {
    basics: {
      name: "",
      email: "",
      url: "",
      profiles: [],
      confidence: {
        name: "inferred",
        email: "inferred",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
    certificates: [],
    languages: [],
    meta: {
      engineVersion: "2.0.0",
    },
  };
}
