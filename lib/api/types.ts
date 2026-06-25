// Tipos que reflejan el contrato JSON de POST /api/v1/score (formato congelado).

export type Confidence = "low" | "medium" | "high";

export type ComponentId =
  | "match"
  | "structure"
  | "achievements"
  | "format"
  | "length";

export interface ComponentScore {
  componentId: ComponentId;
  label: string;
  subScore: number; // 0–100
  weight: number;
  measurementCoverage: number;
  confidence: Confidence;
  explanation: string;
}

export interface Keyword {
  canonicalTerm: string;
  category: string;
  sourceSection: string;
  weight: number;
  matchLevel: string;
  location: string;
  creditAwarded: number;
  note: string;
}

export interface KeywordAnalysis {
  present: Keyword[];
  missing: Keyword[];
  partial: Keyword[];
}

export interface Recommendation {
  action: string;
  type: string;
  targetComponent: string;
  estimatedImpact: number;
  requiresInvention: boolean;
  honestyNote: string;
}

export interface FormatIssue {
  code: string;
  severity: string;
  message: string;
}

export interface Gate {
  componentId: string;
  cap: number;
  reason: string;
  message: string;
}

export interface ScoreResponse {
  overallScore: number;
  band: string;
  honestyNotice: string;
  engineVersion: string;
  lexiconVersion: string;
  contextId: string;
  components: ComponentScore[];
  keywordAnalysis: KeywordAnalysis;
  recommendations: Recommendation[];
  formatIssues: FormatIssue[];
  gatesApplied: Gate[];
}

// ─────────────────────────────────────────────────────────────────────
// 003-web-adapt-ui — contrato JSON de POST /api/v1/adapt (BFF /api/adapt)
// ─────────────────────────────────────────────────────────────────────

export type Severity = "None" | "Warning" | "Critical";
export type InventionSeverity = "Soft" | "Hard";
export type InventionType =
  | "Skill"
  | "Certification"
  | "Company"
  | "Date"
  | "Metric"
  | "Title"
  | "Other";

export interface EntityInvention {
  type: InventionType;
  claimed: string;
  original: string | null;
  severity: InventionSeverity;
  position: number;
}

export interface ValidationReport {
  isValid: boolean;
  severity: Severity;
  inventions: EntityInvention[];
  warnings: string[];
}

export interface AdaptationResult {
  adaptedCv: string;
  validation: ValidationReport;
  engineVersion: string;
  aiModel: string;
}

export interface AdaptRequest {
  cvText: string;
  jobText: string;
}

export type AdaptErrorKind =
  | "network"
  | "validation"
  | "invention"
  | "rate_limit"
  | "payment_required"
  | "unavailable"
  | "unknown";

export type AdaptErrorCode = string;

export interface AdaptErrorShape {
  status: number;
  code: AdaptErrorCode;
  kind: AdaptErrorKind;
  message: string;
  fields?: Record<string, string[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SEVERITIES: ReadonlySet<Severity> = new Set(["None", "Warning", "Critical"]);
const INVENTION_SEVERITIES: ReadonlySet<InventionSeverity> = new Set(["Soft", "Hard"]);
const INVENTION_TYPES: ReadonlySet<InventionType> = new Set([
  "Skill",
  "Certification",
  "Company",
  "Date",
  "Metric",
  "Title",
  "Other",
]);

export function isEntityInvention(value: unknown): value is EntityInvention {
  if (!isRecord(value)) return false;
  if (!INVENTION_TYPES.has(value.type as InventionType)) return false;
  if (typeof value.claimed !== "string") return false;
  if (value.original !== null && typeof value.original !== "string") return false;
  if (!INVENTION_SEVERITIES.has(value.severity as InventionSeverity)) return false;
  if (typeof value.position !== "number") return false;
  return true;
}

export function isValidationReport(value: unknown): value is ValidationReport {
  if (!isRecord(value)) return false;
  if (typeof value.isValid !== "boolean") return false;
  if (!SEVERITIES.has(value.severity as Severity)) return false;
  if (!Array.isArray(value.inventions)) return false;
  if (!value.inventions.every(isEntityInvention)) return false;
  if (!Array.isArray(value.warnings)) return false;
  if (!value.warnings.every((w) => typeof w === "string")) return false;
  return true;
}

export function isAdaptationResult(value: unknown): value is AdaptationResult {
  if (!isRecord(value)) return false;
  if (typeof value.adaptedCv !== "string") return false;
  if (!isValidationReport(value.validation)) return false;
  if (typeof value.engineVersion !== "string") return false;
  if (typeof value.aiModel !== "string") return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// 004-web-export-ui — contrato JSON de POST /api/v1/export (BFF /api/export)
// ─────────────────────────────────────────────────────────────────────

export interface ExportRequest {
  adaptedCv: string;
  validation: ValidationReport;
  candidateName: string;
}

export type ExportErrorKind =
  | "network"
  | "validation"
  | "invention"
  | "rate_limit"
  | "unavailable"
  | "unknown";

export type ExportErrorCode = string;

export interface ExportErrorShape {
  status: number;
  code: ExportErrorCode;
  kind: ExportErrorKind;
  message: string;
  fields?: Record<string, string[]>;
}

// ─────────────────────────────────────────────────────────────────────
// 005-web-cv-import-ui — contrato JSON de POST /api/v1/import (BFF /api/import)
// ─────────────────────────────────────────────────────────────────────

export type ImportConfidence = "High" | "Low";
export type ImportWarningSeverity = "Info" | "Warning" | "Error";

export interface DetectedSection {
  heading: string;
  start: number;
  end: number;
  confidence: ImportConfidence;
}

export interface ImportWarning {
  code: string;
  message: string;
  severity: ImportWarningSeverity;
}

export interface ImportResult {
  text: string;
  sections: DetectedSection[];
  warnings: ImportWarning[];
  engineVersion: string;
  traceId: string;
}

export type ImportErrorKind =
  | "network"
  | "client_validation"
  | "too_large"
  | "unsupported_mime"
  | "validation"
  | "engine"
  | "rate_limit"
  | "unknown";

export type ImportErrorCode = string;

export interface ImportErrorShape {
  status: number;
  code: ImportErrorCode;
  kind: ImportErrorKind;
  message: string;
  details?: Record<string, unknown>;
}

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const IMPORT_CONFIDENCES: ReadonlySet<ImportConfidence> = new Set(["High", "Low"]);
const IMPORT_WARNING_SEVERITIES: ReadonlySet<ImportWarningSeverity> = new Set([
  "Info",
  "Warning",
  "Error",
]);

export function isDetectedSection(value: unknown): value is DetectedSection {
  if (!isRecord(value)) return false;
  if (typeof value.heading !== "string" || value.heading.length === 0) return false;
  if (value.heading.length > 100) return false;
  if (typeof value.start !== "number" || !Number.isInteger(value.start) || value.start < 0) {
    return false;
  }
  if (typeof value.end !== "number" || !Number.isInteger(value.end) || value.end < 0) {
    return false;
  }
  if (!IMPORT_CONFIDENCES.has(value.confidence as ImportConfidence)) return false;
  return true;
}

export function isImportWarning(value: unknown): value is ImportWarning {
  if (!isRecord(value)) return false;
  if (typeof value.code !== "string" || value.code.length === 0) return false;
  if (value.code.length > 50) return false;
  if (typeof value.message !== "string" || value.message.length === 0) return false;
  if (value.message.length > 500) return false;
  if (!IMPORT_WARNING_SEVERITIES.has(value.severity as ImportWarningSeverity)) return false;
  return true;
}

export function isImportResult(value: unknown): value is ImportResult {
  if (!isRecord(value)) return false;
  if (typeof value.text !== "string") return false;
  if (value.text.length > 50_000) return false;
  if (!Array.isArray(value.sections)) return false;
  if (value.sections.length > 50) return false;
  if (!value.sections.every(isDetectedSection)) return false;
  if (!Array.isArray(value.warnings)) return false;
  if (value.warnings.length > 20) return false;
  if (!value.warnings.every(isImportWarning)) return false;
  if (typeof value.engineVersion !== "string") return false;
  if (!SEMVER_RE.test(value.engineVersion)) return false;
  if (typeof value.traceId !== "string" || value.traceId.length === 0) return false;
  if (value.traceId.length > 100) return false;
  return true;
}
