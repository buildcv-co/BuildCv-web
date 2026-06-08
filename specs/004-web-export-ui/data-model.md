# Data Model: 004-web-export-ui

## Domain Types (TypeScript)

```typescript
// lib/api/types.ts
export interface ExportRequest {
  adaptedCv: string;
  validation: ValidationReport;  // Reusado de 003
  candidateName: string;
}
```

## Component State

```typescript
type ExportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "downloading" }
  | { kind: "error"; error: ExportError };
```

## Props Contracts

```typescript
// export-button.tsx
interface ExportButtonProps {
  adaptedCv: string;
  validation: ValidationReport;
  candidateName: string;
  disabled?: boolean;
}

// export-error-panel.tsx
interface ExportErrorPanelProps {
  error: ExportError;
  onRetry?: () => void;
  onRegenerate?: () => void;  // Para 422: regenera la adaptación
}

// filename-hint.tsx
interface FilenameHintProps {
  filename: string;  // "cv-adapted-2026-06-08.pdf"
}
```

## Error Class

```typescript
// lib/api/export.ts
export class ExportError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
```

## State Machine

```
[idle] → click → [loading] → POST /api/export
                            ↓
                ┌───────────┴───────────┐
                ↓                       ↓
        [downloading]               [error]
        blob → save               error: ExportError
        ↓                              │
        [idle] (re-arm)         422 / 429 / 503
```

## Out of Scope

- Persistencia de exports (v1)
- Historial de exports (v1)
- Selección de template (v1)
- Watermark personalizado (v1)
