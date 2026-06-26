/**
 * Mirror del record `BuildCv.Domain.Resumes.CvDocument` (C#) en formato
 * JSON Resume (https://jsonresume.org/schema). Cada campo lleva su
 * ConfidenceMarker para que la UI pueda aplicar la regla de cero invención
 * (Constitution Art. I).
 *
 * Este archivo es la fundación del schema Zod del editor (PR4). Por ahora
 * expone los tipos puros; los `.strict()` de Zod llegan en PR4.
 */

export type ConfidenceMarker = "inferred" | "explicit" | "user_confirmed";

export interface DatosPersonales {
  cedula?: string;
  nacionalidad?: string;
  estadoCivil?: string;
  libretaMilitar?: string;
  rh?: string;
}

export interface ResumeProfile {
  network: string;
  url: string;
}

export interface BasicsConfidence {
  name: ConfidenceMarker;
  email: ConfidenceMarker;
  phone: ConfidenceMarker;
  location: ConfidenceMarker;
  url: ConfidenceMarker;
  profiles: ConfidenceMarker;
  summary: ConfidenceMarker;
  datosPersonales: ConfidenceMarker;
}

export interface Basics {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  url?: string;
  profiles: ResumeProfile[];
  summary?: string;
  datosPersonales?: DatosPersonales;
  confidence: BasicsConfidence;
}

export interface ResumeWorkEntry {
  name: string;
  position: string;
  startDate: string;
  endDate: string | null;
  summary?: string;
  highlights?: string[];
}

export interface WorkConfidence {
  name: ConfidenceMarker;
  position: ConfidenceMarker;
  startDate: ConfidenceMarker;
  endDate: ConfidenceMarker;
  summary: ConfidenceMarker;
  highlights: ConfidenceMarker;
}

export interface TaggedResumeWork {
  entry: ResumeWorkEntry;
  confidence: WorkConfidence;
}

export interface ResumeEducationEntry {
  institution: string;
  area?: string;
  studyType?: string;
  startDate: string;
  endDate?: string | null;
  score?: string;
}

export interface EducationConfidence {
  institution: ConfidenceMarker;
  area: ConfidenceMarker;
  studyType: ConfidenceMarker;
  startDate: ConfidenceMarker;
  endDate: ConfidenceMarker;
  score: ConfidenceMarker;
}

export interface TaggedResumeEducation {
  entry: ResumeEducationEntry;
  confidence: EducationConfidence;
}

export interface ResumeSkillEntry {
  name: string;
  level?: string;
}

export interface SkillConfidence {
  name: ConfidenceMarker;
  level: ConfidenceMarker;
}

export interface TaggedResumeSkill {
  entry: ResumeSkillEntry;
  confidence: SkillConfidence;
}

export interface ResumeProjectEntry {
  name: string;
  description?: string;
  highlights?: string[];
  keywords?: string[];
  startDate?: string;
  endDate?: string | null;
  url?: string;
}

export interface ProjectConfidence {
  name: ConfidenceMarker;
  description: ConfidenceMarker;
  highlights: ConfidenceMarker;
  keywords: ConfidenceMarker;
  startDate: ConfidenceMarker;
  endDate: ConfidenceMarker;
  url: ConfidenceMarker;
}

export interface TaggedResumeProject {
  entry: ResumeProjectEntry;
  confidence: ProjectConfidence;
}

export interface ResumeCertificateEntry {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
}

export interface CertificateConfidence {
  name: ConfidenceMarker;
  issuer: ConfidenceMarker;
  date: ConfidenceMarker;
  url: ConfidenceMarker;
}

export interface TaggedResumeCertificate {
  entry: ResumeCertificateEntry;
  confidence: CertificateConfidence;
}

export interface ResumeLanguageEntry {
  language: string;
  fluency?: string;
}

export interface LanguageConfidence {
  language: ConfidenceMarker;
  fluency: ConfidenceMarker;
}

export interface TaggedResumeLanguage {
  entry: ResumeLanguageEntry;
  confidence: LanguageConfidence;
}

export interface CvMeta {
  engineVersion: "2.0.0";
}

export interface CvDocument {
  basics: Basics;
  work: TaggedResumeWork[];
  education: TaggedResumeEducation[];
  skills: TaggedResumeSkill[];
  projects: TaggedResumeProject[];
  certificates: TaggedResumeCertificate[];
  languages: TaggedResumeLanguage[];
  meta: CvMeta;
}
