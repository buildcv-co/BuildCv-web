# Contracts: 002-web-score-ui (Frontend)

> **Los contracts HTTP viven en el backend:** [../../BuildCv-api/specs/002-score-engine/contracts/score-api.md](../../BuildCv-api/specs/002-score-engine/contracts/score-api.md). Este archivo documenta cómo el frontend **consume** esos contracts.

## Browser → BFF (same-origin)

### POST /api/score

```typescript
// En el componente React (analyzer.tsx)
const result = await requestScore(cvText, jobText);

// result es ScoreResponse
console.log(result.overallScore);  // 78
console.log(result.band);          // "Fuerte"
console.log(result.components);    // ComponentScore[]
console.log(result.keywordAnalysis); // { present, missing, partial }
console.log(result.recommendations); // Recommendation[]
```

**BFF endpoint** (shipped): `BuildCv-web/app/api/score/route.ts`
- Recibe POST con JSON body `{ cvText: string, jobText: string }`
- Proxyea a `${BACKEND_URL}/api/v1/score`
- Retorna JSON con la respuesta del backend O un ProblemDetails en error

## BFF → Backend (server-to-server)

El BFF hace el request al backend con headers correctos. Ver `BuildCv-web/app/api/score/route.ts`.

## Request Body

```typescript
interface ScoreRequest {
  cvText: string;   // max 20,000 chars (validado por backend)
  jobText: string;  // max 20,000 chars (validado por backend)
}
```

## Response Body (200 OK)

```typescript
interface ScoreResponse {
  overallScore: number;           // 0–100
  band: string;                   // "Bajo" | "Medio" | "Bueno" | "Fuerte"
  honestyNotice: string;          // "coincidencia con la vacante + legibilidad..."
  engineVersion: string;          // "1.0.0"
  lexiconVersion: string;         // Versión del léxico
  contextId: string;              // traceId
  components: ComponentScore[];   // Desglose ponderado
  keywordAnalysis: KeywordAnalysis;
  recommendations: Recommendation[];
  formatIssues: FormatIssue[];
  gatesApplied: Gate[];
}

interface ComponentScore {
  componentId: string;            // "match" | "structure" | "achievements" | "format" | "length"
  label: string;                  // "Coincidencia de skills"
  subScore: number;               // 0–100
  weight: number;                 // 0–1
  measurementCoverage: number;    // 0–1
  confidence: string;             // "low" | "medium" | "high"
  explanation: string;            // Explicación legible
}

interface KeywordAnalysis {
  present: Keyword[];
  missing: Keyword[];
  partial: Keyword[];
}

interface Keyword {
  canonicalTerm: string;
  category: string;
  sourceSection: string;
  weight: number;
  matchLevel: string;
  location: string;
  creditAwarded: number;
  note: string;
}

interface Recommendation {
  action: string;
  type: string;
  targetComponent: string;
  estimatedImpact: number;
  requiresInvention: boolean;
  honestyNote: string;
}

interface Gate {
  componentId: string;
  cap: number;
  reason: string;
  message: string;
}

interface FormatIssue {
  code: string;
  severity: string;
  message: string;
}
```

## Error Handling (en `lib/api/score.ts`)

```typescript
export interface ScoreError {
  status: number;    // 0 (network) | 400 | 429
  message: string;   // Mensaje legible para el usuario
  fields?: Record<string, string[]>;  // Errores de validación (400)
}
```

| Status | Significado | Acción UI |
|---|---|---|
| 0 | Error de red | "No pudimos conectar con el servidor. Revisa tu conexión." |
| 400 | Validación falló | "Revisa los textos: hay campos demasiado cortos o demasiado largos." |
| 429 | Rate-limit "score" (60/min) | "Demasiados análisis seguidos. Espera un momento e intenta de nuevo." |

## Configuration

```typescript
// lib/api/backend.ts (ya existe)
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5080";
```

`BACKEND_URL` en `.env.local` (gitignored) o variable de entorno del deploy.

## Logging Contract

```typescript
// ✓ Allowed
console.log("Score requested", { cvLength, jobLength, traceId });

// ✗ Prohibited (Constitution Art. III)
console.log("CV:", cvText);      // NUNCA contenido
console.log("Job:", jobText);    // NUNCA contenido
```
