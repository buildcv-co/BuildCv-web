# Data Model: 005-web-cv-import-ui

## Tipos del dominio (TypeScript, en `lib/api/types.ts`)

```typescript
import { z } from "zod";

// Defense in depth: Zod valida el payload en runtime (Constitution Art. I FR-029a).
// El backend es la fuente de verdad; el Zod schema lo refleja con límites estrictos.

export const DetectedSectionSchema = z.object({
  heading: z.string().min(1).max(100),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  confidence: z.enum(["High", "Low"]),
});
export type DetectedSection = z.infer<typeof DetectedSectionSchema>;

export const ImportWarningSchema = z.object({
  code: z.string().min(1).max(50),
  message: z.string().min(1).max(500),
  severity: z.enum(["Info", "Warning", "Error"]),
});
export type ImportWarning = z.infer<typeof ImportWarningSchema>;

export const ImportResultSchema = z.object({
  text: z.string().max(50_000),
  sections: z.array(DetectedSectionSchema).max(50),
  warnings: z.array(ImportWarningSchema).max(20),
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  traceId: z.string().min(1).max(100),
});
export type ImportResult = z.infer<typeof ImportResultSchema>;
```

## Error class (en `lib/api/import.ts`)

```typescript
export class ImportError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ImportError";
  }
}
```

## Component state (en `components/import/import-button.tsx`)

```typescript
type ImportState =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "loading" }
  | { kind: "success"; result: ImportResult }
  | { kind: "error"; error: ImportError };
```

## Props contracts

```typescript
// file-upload.tsx
interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  maxSizeBytes?: number;   // default 5 * 1024 * 1024
  accept?: string[];       // default ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
}

// import-button.tsx
interface ImportButtonProps {
  file: File | null;
  onSuccess: (result: ImportResult) => void;
  onError: (error: ImportError) => void;
  disabled?: boolean;
}

// import-result-panel.tsx
interface ImportResultPanelProps {
  result: ImportResult;
  onUseInEditor: () => void;
  editorAvailable: boolean;   // false → botón deshabilitado "Próximamente"
}

// import-error-panel.tsx
interface ImportErrorPanelProps {
  error: ImportError;
  onRetry?: () => void;
  onDismiss?: () => void;
}
```

## Handoff al editor (006)

```typescript
// sessionStorage key (transitorio, se borra al cerrar pestaña)
const SESSION_KEY = "buildcv:import:handoff";

interface EditorHandoff {
  importedText: string;
  importedSections: DetectedSection[];
  importedTraceId: string;
  importedAt: string;   // ISO 8601
}

export function setEditorHandoff(handoff: EditorHandoff): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(handoff));
}

export function getEditorHandoff(): EditorHandoff | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EditorHandoff;
  } catch {
    return null;
  }
}

export function clearEditorHandoff(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
```

## State machine (orquestador en `app/importar/page.tsx`)

```
[idle]
   ↓ user drops/selects file
[validating] → validateFile() in client
   ↓ ok
[loading] → POST /api/import
   ↓
[success] → setState({ result }) → render ImportResultPanel
   ↓ user clicks "Usar en editor"
[handoff] → setEditorHandoff() → navigate /editor

[error] ← (en cualquier momento) → render ImportErrorPanel
   ↓ user clicks "Reintentar"
[idle]
```

## Constantes

```typescript
export const IMPORT_CONSTANTS = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024,   // 5 MB
  MAX_TEXT_LENGTH: 50_000,                 // Consistente con FR-037 (backend)
  ACCEPTED_MIMES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ] as const,
  ACCEPTED_EXTENSIONS: [".pdf", ".docx"] as const,
} as const;
```

## Persistencia

**NINGUNA persistente** (Constitution Art. III):
- El archivo NO se guarda en `localStorage`, `sessionStorage` (solo se guarda el `handoff` con el texto extraído, no el archivo original), ni cookies.
- El `importedText` en `sessionStorage` se borra al cerrar la pestaña.
- El usuario puede limpiar el handoff manualmente con un botón "Limpiar borrador" (FR-040b, Constitution Art. III v1.1.0).

## Out of Scope (persistente)

- Historial de imports (v1 con cuentas).
- Caché del `ImportResult` (v1, si hay métricas de re-imports).
- Persistencia del archivo original (v1 con consentimiento).
