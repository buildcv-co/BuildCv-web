# Contracts: 003-web-adapt-ui (Frontend)

> **Los contracts HTTP viven en el backend:** [../../BuildCv-api/specs/003-adapt-ia/contracts/adapt-api.md](../../BuildCv-api/specs/003-adapt-ia/contracts/adapt-api.md). Este archivo documenta cómo el frontend **consume** esos contracts.

## Browser → BFF (mismo-origin)

### POST /api/adapt

```typescript
// En el componente React
const result = await requestAdapt({
  cvText: "Backend dev con C# y .NET",
  jobText: "Buscamos developer con C# y AWS",
});

// result es AdaptationResult
console.log(result.adaptedCv);     // markdown del CV optimizado
console.log(result.validation.severity);  // "None" | "Warning" | "Critical"
```

**BFF endpoint** (ya implementado): `BuildCv-web/app/api/adapt/route.ts`
- Recibe POST con JSON body
- Proxyea a `${BACKEND_URL}/api/v1/adapt`
- Retorna JSON con la respuesta del backend O un ProblemDetails en error

## BFF → Backend (server-to-server)

El BFF hace el request al backend con headers correctos. Ver `BuildCv-web/app/api/adapt/route.ts`.

## Tipos TypeScript (en `lib/api/types.ts`)

```typescript
// Re-exports del contrato del backend
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
```

## Error Handling (en `lib/api/adapt.ts`)

```typescript
export class AdaptError extends Error {
  constructor(
    public status: number,    // 400 | 422 | 429 | 503
    public code: string,      // "EXPORT_BLOCKED_INVENTION" | "RATE_LIMIT" | "PDF_UNAVAILABLE"
    message: string
  ) {
    super(message);
  }
}
```

| Status | Significado | Acción UI |
|---|---|---|
| 400 | Validación falló (CV vacío, idéntico, >50k) | Mostrar mensaje de validación (vino del backend) |
| 422 | Hard invenciones detectadas | Mostrar panel rojo con detalle + botón Regenerar |
| 429 | Rate-limit "ai" (5/h) | Mensaje honesto + countdown al próximo slot |
| 503 | Adapt no disponible (IA provider down) | Mensaje + retry button |

## Configuración

```typescript
// lib/api/backend.ts (ya existe)
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5080";
```

`BACKEND_URL` en `.env.local` (gitignored) o variable de entorno del deploy.

## Logging Contract

```typescript
// ✓ Allowed
console.log("Adapt requested", { cvLength, jobLength, traceId });

// ✗ Prohibited (Constitution Art. III)
console.log("CV:", cvText);      // NUNCA contenido
console.log("Job:", jobText);    // NUNCA contenido
```
