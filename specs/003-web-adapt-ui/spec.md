# Feature 003-web-adapt-ui — UI de Adaptación con IA

> **Status:** 📋 PLANEADO (frontend de la 003 del API) · **Prioridad:** M1.1
> **Backend counterpart:** [../../BuildCv-api/specs/003-adapt-ia/](../../BuildCv-api/specs/003-adapt-ia/) (✅ SHIPPED con StubAiClient)
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)

## Resumen

Construir la UI web que consume el endpoint `POST /api/v1/adapt` del backend (003-adapt-ia). El usuario podrá:

1. Ver el score pre-adaptación (M0)
2. Solicitar adaptación con IA (proxyeando al BFF `/api/adapt`)
3. Ver el CV adaptado con **delta de mejora trazado** (qué cambió, por qué)
4. Ver el **indicador de severidad** (verde/amarillo/rojo) según `ValidationReport`
5. (Opcional) Streaming visual del LLM cuando llegue M1.5

**Constitución cumplimiento:**
- **Art. III (Privacidad)**: BFF same-origin oculta el backend, sin telemetría, sin localStorage con CV.
- **Art. IV (Encuadre honesto)**: copy en `lib/copy/es.ts` dice "coincidencia con la vacante + legibilidad", nunca "ATS oficial".
- **Art. V (Entrada como dato)**: nunca `dangerouslySetInnerHTML` con CV/vacante. Validación client es cortesía.
- **Art. VI (Clean Arch)**: BFF = `app/api/adapt/route.ts` proxyea al backend. Browser NUNCA habla directo.

## Stack técnico

- **Next.js 16.2.7** (App Router) + React 19.2.4
- **TypeScript ^5** strict
- **Tailwind CSS v4** (PostCSS via `@tailwindcss/postcss`)
- **Sin librería UI externa** — diseño custom (consistente con 002-web-score-ui)
- **BFF pattern**: `app/api/adapt/route.ts` proxyea a `${BACKEND_URL}/api/v1/adapt`

## User Scenarios

### User Story 1 — Panel de adaptación (Priority: P1)

Después de obtener un score alto, el usuario ve un panel "Adaptar CV" con un botón "Adaptar con IA". Al hacer click, ve el CV adaptado en markdown renderizado, con un delta de mejora que muestra qué cambió y por qué (tracing a reglas concretas).

**Acceptance Scenarios**:
1. Click "Adaptar" → loading spinner → resultado con `adaptedCv` renderizado.
2. El delta muestra: "Resurgir 'AWS' en sección Skills (estaba enterrada)", "Reescribir bullet 'mejoré performance' → 'reduje latencia 35%' (métrica cuantificable)".
3. Indicador de severidad: verde si `severity: None`, amarillo si `Warning`, rojo si `Critical`.

### User Story 2 — Manejo de 422 (Hard invenciones) (Priority: P2)

Si el cross-entity validator detecta Hard invenciones, el endpoint retorna 422. La UI debe mostrar: "El CV adaptado tiene X invenciones Hard: [FakeCorp]. Regenera la adaptación con prompt más estricto antes de exportar."

**Acceptance Scenarios**:
1. POST `/api/v1/adapt` retorna 422 con `detail` mencionando invenciones Hard.
2. UI muestra panel rojo con el mensaje del backend.
3. Botón "Regenerar" lanza una nueva adaptación (M1: con prompt más estricto).

### User Story 3 — Rate-limit 5/h honesto (Priority: P3)

Si el usuario ha consumido 5 adaptaciones en 1h, el endpoint retorna 429. La UI debe mostrar: "Has alcanzado el tope de adaptaciones (5/hora). El análisis determinista sigue disponible."

**Acceptance Scenarios**:
1. Click "Adaptar" → 429 → UI muestra mensaje honesto + link al score.
2. NO intenta retry agresiva (backoff exponencial si se reintenta).

## Componentes a crear (Next.js 16, App Router)

```
components/adapt/
├── adapt-panel.tsx           # Orquestador (estado: idle | loading | done | error)
├── adapted-cv-viewer.tsx     # Renderiza el CV adaptado en markdown
├── delta-improvements.tsx    # Lista de cambios trazados a reglas
├── severity-badge.tsx        # Verde/Amarillo/Rojo según severity
└── regenerate-button.tsx     # Cuando hay 422, regenera con prompt estricto
```

## BFF (ya implementado en M1)

`app/api/adapt/route.ts` ya proxyea `POST ${BACKEND_URL}/api/v1/adapt` con headers correctos. **No cambios necesarios en BFF.**

## Tipos TypeScript (en `lib/api/types.ts`)

```typescript
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

export type AdaptErrorKind = "network" | "validation" | "invention" | "rate_limit" | "unavailable" | "unknown";
export type AdaptErrorCode = string;

export interface AdaptErrorShape {
  status: number;
  code: AdaptErrorCode;
  kind: AdaptErrorKind;
  message: string;
  fields?: Record<string, string[]>;
}
```

## API client (en `lib/api/adapt.ts`)

> **Corrección 2026-06-09:** el browser **NUNCA** habla directo con `BACKEND_URL` (Constitution Art. VI — Clean Arch, BFF same-origin). La spec original tenía un fetch directo al backend que fue descartado al implementar el BFF (`f94999f`). El cliente va contra `/api/adapt` (mismo origen), que es el Route Handler ya implementado en `app/api/adapt/route.ts`.

```typescript
import type { AdaptRequest, AdaptationResult, AdaptErrorCode, AdaptErrorKind } from "./types";

export class AdaptError extends Error {
  readonly status: number;
  readonly code: AdaptErrorCode;
  readonly kind: AdaptErrorKind;
  readonly fields?: Record<string, string[]>;

  constructor(params: {
    status: number;
    code: AdaptErrorCode;
    kind: AdaptErrorKind;
    message: string;
    fields?: Record<string, string[]>;
  }) {
    super(params.message);
    this.name = "AdaptError";
    this.status = params.status;
    this.code = params.code;
    this.kind = params.kind;
    this.fields = params.fields;
  }
}

const BFF_PATH = "/api/adapt";

export async function requestAdapt(req: AdaptRequest): Promise<AdaptationResult> {
  let response: Response;
  try {
    response = await fetch(BFF_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
    });
  } catch {
    throw new AdaptError({
      status: 0,
      code: "ADAPT_NETWORK",
      kind: "network",
      message: "No pudimos conectar con el servidor. Revisa tu conexión.",
    });
  }

  if (response.ok) {
    return (await response.json()) as AdaptationResult;
  }

  let problem: { errors?: Record<string, string[]>; detail?: string; title?: string } = {};
  try {
    problem = (await response.json()) as typeof problem;
  } catch {
    // respuesta sin cuerpo JSON
  }

  const { status } = response;
  const code = problem.title ?? "ADAPT_FAILED";
  const detail = problem.detail ?? "No pudimos adaptar tu CV. Intenta de nuevo.";

  if (status === 400) {
    throw new AdaptError({
      status,
      code,
      kind: "validation",
      message: "Revisa los textos: hay campos demasiado cortos o demasiado largos.",
      fields: problem.errors,
    });
  }
  if (status === 422) {
    throw new AdaptError({
      status,
      code,
      kind: "invention",
      message: detail,
    });
  }
  if (status === 429) {
    throw new AdaptError({
      status,
      code,
      kind: "rate_limit",
      message: "Has alcanzado el tope de adaptaciones (5/hora). El análisis determinista sigue disponible.",
    });
  }
  if (status === 503) {
    throw new AdaptError({
      status,
      code,
      kind: "unavailable",
      message: "La adaptación con IA no está disponible temporalmente. Intenta de nuevo en unos minutos.",
    });
  }

  throw new AdaptError({ status, code, kind: "unknown", message: detail });
}
```

## Copy (en `lib/copy/es.ts`)

```typescript
export const ADAPT_COPY = {
  panel: {
    title: "Adaptar tu CV con IA",
    description: "Reorganiza, reescribe y prioriza tu CV sin inventar contenido.",
    button: "Adaptar con IA",
    loading: "Adaptando...",
  },
  severity: {
    None: "Sin invenciones. CV listo para descargar.",
    Warning: "Advertencia: hay mejoras menores que puedes revisar.",
    Critical: "Atención: se detectaron posibles invenciones. Regenera antes de exportar.",
  },
  errors: {
    rateLimit: "Has alcanzado el tope de adaptaciones (5/hora). El análisis determinista sigue disponible.",
    blocked: "El CV adaptado tiene invenciones que no estaban en el original. Regenera la adaptación.",
    unavailable: "La adaptación con IA no está disponible temporalmente. Intenta de nuevo en unos minutos.",
    generic: "Ocurrió un error inesperado. Intenta de nuevo.",
  },
  delta: {
    title: "Cambios aplicados",
    empty: "No se detectaron cambios.",
  },
};
```

## Convención de nombres

- **Componentes**: `kebab-case.tsx` (`adapt-panel.tsx`)
- **Handlers**: `requestAdapt` (camelCase) en `lib/api/adapt.ts`
- **Tipos**: `PascalCase` (`AdaptationResult`)
- **Errores**: `AdaptError extends Error` con `status` + `code` + `message`

## Fuera de scope (v0 frontend)

- Streaming SSE visual (queda para M1.5 cuando el backend tenga streaming real con LLM).
- Editor inline del CV adaptado (queda para v1).
- Comparación lado a lado CV original vs adaptado (queda para v1).

## Tasks (TDD-ordered)

Pendiente de implementar — ver [tasks.md](./tasks.md).
