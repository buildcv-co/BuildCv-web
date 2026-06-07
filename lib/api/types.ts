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
