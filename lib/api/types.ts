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
