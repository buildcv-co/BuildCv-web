# Data Model: 003-web-adapt-ui

## Domain Types (TypeScript)

```typescript
// lib/api/types.ts
export type Severity = "None" | "Warning" | "Critical";
export type InventionSeverity = "Soft" | "Hard";
export type InventionType = "Skill" | "Certification" | "Company" | "Date" | "Metric" | "Title" | "Other";

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

export interface AdaptError {
  status: number;        // 422 | 429 | 503
  code: string;
  message: string;
}
```

## Component State

```typescript
// components/adapt/adapt-panel.tsx
type AdaptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; result: AdaptationResult }
  | { kind: "error"; error: AdaptError };
```

## Props Contracts

```typescript
// adapt-panel.tsx
interface AdaptPanelProps {
  cvText: string;
  jobText: string;
  onExportClick?: () => void;  // Optional CTA to M2
}

// adapted-cv-viewer.tsx
interface AdaptedCvViewerProps {
  markdown: string;            // AdaptedCv result
}

// delta-improvements.tsx
interface DeltaImprovementsProps {
  report: ValidationReport;
}

// severity-badge.tsx
interface SeverityBadgeProps {
  severity: Severity;
  inventionCount: number;
}

// regenerate-button.tsx
interface RegenerateButtonProps {
  onClick: () => void;
  loading: boolean;
}
```

## State Machine

```
              click
[idle]  ──────────────→  [loading]
                              │
                  POST /api/adapt
                              │
              ┌───────────────┴───────────────┐
              ↓                               ↓
        [success]                       [error]
        result: AdaptationResult         error: AdaptError
                                              │
                              ┌───────────────┼───────────────┐
                              ↓               ↓               ↓
                          status 422       status 429      status 503
                          "Regenerar"     "Esperar 1h"     "Reintentar"
```

## Out of Scope

- Persistencia de adaptaciones en localStorage (Art. III: sin datos del CV en cliente)
- Compartir adaptación por URL (v1)
- Historial de adaptaciones (v1 — requiere auth)
