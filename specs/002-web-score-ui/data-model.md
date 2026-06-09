# Data Model: 002-web-score-ui

**Status:** ✅ SHIPPED

## Frontend Types (`lib/api/types.ts`)

El frontend NO tiene modelo de datos propio — refleja el contrato JSON del backend. Todos los tipos son congelados contra `POST /api/v1/score`.

### ScoreResponse

```typescript
export interface ScoreResponse {
  overallScore: number;          // 0–100, entero
  band: string;                  // "Bajo" | "Medio" | "Bueno" | "Fuerte"
  honestyNotice: string;         // Texto de encuadre honesto (Art. IV)
  engineVersion: string;         // "1.0.0" — sellado para trazabilidad
  lexiconVersion: string;        // Versión del léxico de skills
  contextId: string;             // Identificador de contexto (traceId)
  components: ComponentScore[];  // Desglose ponderado
  keywordAnalysis: KeywordAnalysis; // Cruce de keywords
  recommendations: Recommendation[]; // Fixes priorizados
  formatIssues: FormatIssue[];   // Problemas de formato detectados
  gatesApplied: Gate[];          // Compuertas activadas (Art. VII)
}
```

### ComponentScore

```typescript
export type ComponentId = "match" | "structure" | "achievements" | "format" | "length";
export type Confidence = "low" | "medium" | "high";

export interface ComponentScore {
  componentId: ComponentId;      // ID del componente
  label: string;                 // Nombre legible ("Coincidencia de skills")
  subScore: number;              // 0–100, subpuntaje del componente
  weight: number;                // 0–1, peso en el cálculo global
  measurementCoverage: number;   // 0–1, qué tan completo se pudo medir
  confidence: Confidence;        // Confianza de la medición
  explanation: string;           // Explicación legible del subpuntaje
}
```

### KeywordAnalysis

```typescript
export interface Keyword {
  canonicalTerm: string;         // Término normalizado ("c#")
  category: string;              // Categoría ("tech", "soft_skill")
  sourceSection: string;         // De dónde vino ("job_requirements")
  weight: number;                // Peso relativo
  matchLevel: string;            // "exact" | "partial" | "none"
  location: string;              // Dónde está en el CV
  creditAwarded: number;         // Crédito otorgado (0–1)
  note: string;                  // Nota explicativa
}

export interface KeywordAnalysis {
  present: Keyword[];            // Keywords encontradas en el CV
  missing: Keyword[];            // Keywords de la vacante que faltan
  partial: Keyword[];            // Keywords parcialmente coincidentes
}
```

### Recommendation

```typescript
export interface Recommendation {
  action: string;                // "Reubicar 'AWS' en sección Skills"
  type: string;                  // "resurface" | "rewrite" | "addMetric" | "fixFormat" | "learnAdd"
  targetComponent: string;       // Componente afectado
  estimatedImpact: number;       // Impacto estimado en el puntaje
  requiresInvention: boolean;    // true si requeriría inventar contenido
  honestyNote: string;           // "no se inventa" / "brecha real"
}
```

### Gate

```typescript
export interface Gate {
  componentId: string;           // Componente que activó la compuerta
  cap: number;                   // Techo aplicado
  reason: string;                // Razón de la compuerta
  message: string;               // Mensaje legible
}
```

### FormatIssue

```typescript
export interface FormatIssue {
  code: string;                  // Código del problema
  severity: string;              // Severidad
  message: string;               // Mensaje legible
}
```

## State local del componente

```typescript
// analyzer.tsx — estado interno (NO persistido)
type AnalyzerState = {
  cvText: string;                // Texto del CV (input del usuario)
  jobText: string;               // Texto de la vacante (input del usuario)
  loading: boolean;              // POST en curso
  error: string | null;          // Mensaje de error
  result: ScoreResponse | null;  // Respuesta del backend
};
```

## Persistencia

**Ninguna.** El score NO se persiste (Constitution Art. III — v0 sin guardado). El texto del CV y la vacante viven solo en el state del componente y se descartan al navegar.

## Data flow

```
User input (cvText, jobText)
  → requestScore() → POST /api/score → BFF → backend
  → ScoreResponse
  → ScoreGauge (overallScore, band)
  → ComponentBars (components[])
  → KeywordCloud (keywordAnalysis)
  → FixList (recommendations[])
  → HonestyNote (honestyNotice, gatesApplied[], engineVersion, lexiconVersion)
```
