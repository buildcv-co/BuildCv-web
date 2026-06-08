# Contracts (Frontend internal): 006-web-cv-diff-viewer

> **Spec:** [../spec.md](../spec.md) · **Plan:** [../plan.md](../plan.md) · **Data Model:** [../data-model.md](../data-model.md)
> **Propósito**: Fuente de verdad de los contratos internos del diff viewer: tipos, funciones puras, hooks, errores, handoffs con 003 y 004.

---

## 1. `getDiffHandoff()` / `setDiffHandoff()` — Handoff con 003

**Ubicación**: `lib/diff/handoff.ts`

```typescript
import type { AdaptResult } from "@/lib/api/types";
import type { CvDocument } from "@/lib/editor/types";

const HANDOFF_KEY = "buildcv:diff:handoff";
const MAX_HANDOFF_AGE_MS = 60 * 60 * 1000;  // 1 hora

export interface DiffHandoff {
  /** CvDocument actual (lo que el usuario editó antes de adaptar). */
  readonly currentDocument: CvDocument;
  /** Resultado de la adaptación 003 que se está revisando. */
  readonly adaptResult: AdaptResult;
  /** Texto original (de donde se partió para adaptar). */
  readonly originalText: string;
  /** Trace ID de la request de adapt. */
  readonly adaptTraceId: string;
  /** Timestamp del handoff (ISO 8601). */
  readonly at: string;
}

export function setDiffHandoff(handoff: DiffHandoff): void;
export function getDiffHandoff(): DiffHandoff | null;
export function clearDiffHandoff(): void;

/**
 * Variante de getDiffHandoff que valida que el handoff no esté expirado.
 * @throws {AdaptationExpiredError} si el handoff tiene >1 h de antigüedad.
 */
export function getValidDiffHandoff(): DiffHandoff;
```

**Flujo**:
1. 003 retorna `AdaptResult`. La UI de 003 (o un botón en el editor 006a) llama `setDiffHandoff({...})`.
2. Navega a `/analizar/diff`.
3. El viewer llama `getValidDiffHandoff()` y renderiza.

---

## 2. Funciones puras — Diff

**Ubicación**: `lib/diff/`

### 2.1 `computeWordDiff`

```typescript
// lib/diff/compute-diff.ts
import { diffWords } from "diff";

export type DiffSegmentType = "added" | "removed" | "unchanged";

export interface DiffSegment {
  readonly type: DiffSegmentType;
  readonly value: string;
}

/**
 * Calcula el diff palabra-por-palabra entre dos textos usando Myers algorithm.
 * @pure
 * @example
 *   computeWordDiff("hello world", "hello there")
 *   // → [
 *   //   { type: "unchanged", value: "hello " },
 *   //   { type: "removed", value: "world" },
 *   //   { type: "added", value: "there" },
 *   // ]
 */
export function computeWordDiff(
  original: string,
  adapted: string,
): ReadonlyArray<DiffSegment>;
```

### 2.2 `mapFlagsToSegments`

```typescript
// lib/diff/flag-entities.ts
import type { EntityInvention } from "@/lib/api/types";
import type { DiffSegment, DiffSegmentWithFlags } from "./types";

export interface MapFlagsResult {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  /** Invenciones que NO caen en ningún segmento del diff (segmentos "removed" o posición inválida). */
  readonly orphanedFlags: ReadonlyArray<EntityInvention>;
}

/**
 * Mapea cada EntityInvention al segmento del diff que la contiene.
 * Solo asigna flags a segmentos "added" o "unchanged"; los "removed" se excluyen
 * del texto adaptado y sus flags van a `orphanedFlags`.
 * @pure
 */
export function mapFlagsToSegments(
  segments: ReadonlyArray<DiffSegment>,
  inventions: ReadonlyArray<EntityInvention>,
): MapFlagsResult;
```

### 2.3 `buildDiffResult`

```typescript
// lib/diff/compute-diff.ts
import type { DiffInput, DiffResult } from "./types";

/**
 * Compone el DiffResult completo a partir del DiffInput.
 * Encadena `computeWordDiff` + `mapFlagsToSegments` + cálculo de `summary`.
 * @pure
 */
export function buildDiffResult(input: DiffInput): DiffResult;
```

### 2.4 `canDirectAccept`

```typescript
// lib/diff/can-direct-accept.ts
import type { EntityInvention } from "@/lib/api/types";

export interface CanDirectAcceptResult {
  /** true si no hay Hard pendientes (Soft sí se permite). */
  readonly allowed: boolean;
  readonly hardCount: number;
  readonly softCount: number;
}

/**
 * Determina si el usuario puede "Aceptar y exportar" sin modal de confirmación.
 * REGLA DURA (Constitución Art. I): Hard pendientes bloquean Aceptar.
 * @pure
 */
export function canDirectAccept(
  inventions: ReadonlyArray<EntityInvention>,
): CanDirectAcceptResult;
```

---

## 3. Hook React: `useDiff()`

**Ubicación**: `lib/diff/use-diff.ts`

```typescript
import type { DiffInput, DiffResult, DiffMode } from "./types";
import type { EntityInvention } from "@/lib/api/types";

export interface UseDiffResult {
  /** DiffResult computado. `null` si el input es inválido. */
  readonly result: DiffResult | null;
  /** `true` durante el cómputo inicial (típicamente <500 ms). */
  readonly isComputing: boolean;
  /** Último error capturado. */
  readonly error: Error | null;
  /** Modo actual ("unified" | "side-by-side"). */
  readonly mode: DiffMode;
  /** Cambia el modo (persiste en localStorage). */
  readonly setMode: (mode: DiffMode) => void;
  /** Texto adaptado ACTUAL (post-ediciones del usuario). */
  readonly editedAdaptedText: string;
  /** Aplica una edición inline a una invención. Re-computa el diff. */
  readonly applyEdit: (position: number, newValue: string) => void;
}

export function useDiff(input: DiffInput): UseDiffResult;
```

**Comportamiento**:

- `result` se computa con `useMemo` (evita recálculo en cada render).
- `mode` se persiste en `localStorage["buildcv:diff:mode"]`; default: `unified` en móvil, `side-by-side` en desktop.
- `applyEdit` actualiza el texto adaptado (internamente), elimina la invención del array de flags, y re-computa el diff en el siguiente render.
- `error` se setea si `input` no pasa `DiffInputSchema`.

---

## 4. Componentes React (en `components/diff/`)

### 4.1 `<DiffView input={input} />`

```typescript
export interface DiffViewProps {
  readonly input: DiffInput;
}

export function DiffView(props: DiffViewProps): JSX.Element;
```

**Comportamiento**:

- Lee `mode` de `useDiff`.
- Renderiza `<DiffColumn>` × 1 (unified) o × 2 (side-by-side).
- Pasa los `result.segments` a cada `<DiffColumn>`.

### 4.2 `<DiffColumn segments={...} side="original" | "adapted" />`

```typescript
export type DiffColumnSide = "original" | "adapted";

export interface DiffColumnProps {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  readonly side: DiffColumnSide;
}

export function DiffColumn(props: DiffColumnProps): JSX.Element;
```

**Comportamiento**:

- Itera sobre los segmentos.
- Si el segmento tiene `flags`, renderiza `<FlaggedEntityBadge>` después del texto.
- En modo side-by-side, "original" muestra solo los segmentos `unchanged` y `removed`; "adapted" muestra solo `unchanged` y `added`.

### 4.3 `<FlaggedEntityBadge flag={...} onEdit={...} onKeep={...} />`

```typescript
import type { EntityInvention } from "@/lib/api/types";

export interface FlaggedEntityBadgeProps {
  readonly flag: EntityInvention;
  readonly onEdit: () => void;
  readonly onKeep: () => void;
}

export function FlaggedEntityBadge(props: FlaggedEntityBadgeProps): JSX.Element;
```

**Comportamiento**:

- Renderiza un `<span>` con clase CSS según `severity`:
  - `Soft`: `bg-red-900/40 text-red-100 underline decoration-wavy`.
  - `Hard`: `bg-red-950 text-red-50 underline decoration-wavy font-bold`.
- `aria-label`: "Advertencia: invención detectada. Severidad {severity}. Término: {claimed}."
- Click → `<FlaggedEntityPopover>`.

### 4.4 `<FlaggedEntityPopover flag={...} onEdit={...} onKeep={...} />`

```typescript
export interface FlaggedEntityPopoverProps {
  readonly flag: EntityInvention;
  readonly onEdit: () => void;
  readonly onKeep: () => void;
  readonly onClose: () => void;
}

export function FlaggedEntityPopover(props: FlaggedEntityPopoverProps): JSX.Element;
```

**Contenido**:
- Tipo (Skill, Company, Metric, etc.)
- Claimed (texto del adaptado)
- Original (texto del CV original, si hay match)
- Posición (offset en caracteres)
- 2 botones: "Editar" y "Mantener"
- Botón "Cerrar" (Esc)

### 4.5 `<InlineEntityEditor value={...} entityKind={...} onConfirm={...} onCancel={...} />`

```typescript
export interface InlineEntityEditorProps {
  readonly value: string;
  readonly entityKind: EntityInventionType;
  readonly onConfirm: (newValue: string) => void;
  readonly onCancel: () => void;
}

export function InlineEntityEditor(props: InlineEntityEditorProps): JSX.Element;
```

**Comportamiento**:

- Mini-Tiptap con `editable: true`.
- `Enter` o blur → `onConfirm(editor.getText())`.
- Validación Zod antes de `onConfirm`; si falla, `onCancel` + toast rojo.

### 4.6 `<ActionFooter inventions={...} />`

```typescript
export interface ActionFooterProps {
  readonly inventions: ReadonlyArray<EntityInvention>;
  readonly onAcceptExport: () => void;
  readonly onEditInEditor: () => void;
  readonly onReject: () => void;
}

export function ActionFooter(props: ActionFooterProps): JSX.Element;
```

**Comportamiento**:

- Si `canDirectAccept(inventions).allowed === false` y el usuario click "Aceptar y exportar":
  - Muestra `<HardInventionModal>`.
  - "Aceptar de todos modos" → `onAcceptExport()`.
  - "Revisarlas primero" → cierra el modal.

---

## 5. Errores (en `lib/diff/errors.ts`)

```typescript
export class DiffComputationError extends Error {
  constructor(public readonly reason: string) {
    super(`DIFF_COMPUTATION_FAILED: ${reason}`);
    this.name = "DiffComputationError";
  }
}

export class AdaptationExpiredError extends Error {
  constructor(public readonly ageMs: number) {
    super(`ADAPTATION_EXPIRED: la adaptación tiene ${Math.round(ageMs / 60_000)} minutos (máx 60).`);
    this.name = "AdaptationExpiredError";
  }
}

export class HardInventionPendingError extends Error {
  constructor(public readonly count: number) {
    super(`HARD_INVENTION_PENDING: ${count} invenciones Hard sin resolver.`);
    this.name = "HardInventionPendingError";
  }
}
```

**Mapeo a UI**:

| Error | UI |
|---|---|
| `DiffComputationError` | Toast rojo: "No pudimos calcular el diff. Intenta recargar." |
| `AdaptationExpiredError` | Página de error: "La adaptación expiró. Vuelve a solicitarla." + botón "Volver a `/analizar`" |
| `HardInventionPendingError` | Modal obligatorio en el action footer (ver §4.6) |

---

## 6. Contrato con feature 002 — Re-puntuar

**Ubicación**: `lib/diff/use-diff.ts` (extensión)

```typescript
import type { ScoreResponse } from "@/lib/api/types";
import { requestScore } from "@/lib/api/score";

/**
 * Re-puntúa el adaptedText (post-ediciones) contra la vacante.
 * @param adaptedText el texto adaptado actual.
 * @param jobText la vacante (del Draft o del handoff).
 * @returns ScoreResponse.
 * @throws {ScoreError} si el backend retorna 4xx/5xx (incluido 429).
 */
export async function rescoreAdapted(
  adaptedText: string,
  jobText: string,
): Promise<ScoreResponse>;
```

---

## 7. Contrato con feature 004 — Aceptar y exportar

**Ubicación**: `lib/diff/handoff.ts` (re-uso)

Cuando el usuario click "Aceptar y exportar", el `ActionFooter`:

1. Crea un `CvDocument` a partir del `adaptedText` actual (post-ediciones):
   ```typescript
   const adaptedDoc: CvDocument = parseCvDocument(adaptedText, ctx);
   ```
2. Llama `setDiffHandoff({ currentDocument: adaptedDoc, adaptResult, originalText, adaptTraceId, at: new Date().toISOString() })`.
3. Navega a `/analizar/exportar?from=diff&traceId=...`.
4. 004 lee `getDiffHandoff().currentDocument` y lo usa como input para `serializeCvDocument` (re-uso de 006a) → PDF.

---

## 8. Contrato con feature 003 — Re-prompt

Cuando el usuario click "Rechazar y re-prompt":

1. `clearDiffHandoff()`.
2. `sessionStorage.setItem("buildcv:reprompt:context", JSON.stringify({...}))` con:
   - CV original (para no pedirlo de nuevo).
   - Vacante (idem).
   - Razón del rechazo (opcional, para análisis futuro).
3. Navega a `/analizar` con toast rojo "Adaptación rechazada. Vuelve a solicitar con nuevas instrucciones."
4. `/analizar` lee `getRepromptContext()` y pre-pobla el formulario.

---

## 9. Ejemplos de payloads

### 9.1 `DiffInput` ejemplo

```json
{
  "originalText": "Juan Pérez\nBackend Developer\nStack: Node.js, PostgreSQL",
  "adaptedText": "Juan Pérez\nBackend Developer Senior\nStack: Node.js, PostgreSQL, Redis, AWS\nMétrica: reduje latencia 40%",
  "inventions": [
    {
      "type": "Title",
      "claimed": "Senior",
      "original": null,
      "severity": "Hard",
      "position": 32
    },
    {
      "type": "Metric",
      "claimed": "40%",
      "original": "35%",
      "severity": "Soft",
      "position": 95
    }
  ],
  "warnings": ["Una métrica fue redondeada (40% vs 35%)."],
  "engineVersion": "1.0.0",
  "adaptTraceId": "0HMVD9F2E5Q2P:00000012",
  "adaptedAt": "2026-06-08T14:30:00.000Z"
}
```

### 9.2 `DiffResult` ejemplo (output de `buildDiffResult`)

```json
{
  "segments": [
    {
      "type": "unchanged",
      "value": "Juan Pérez\nBackend Developer ",
      "startOffset": 0,
      "endOffset": 30,
      "flags": []
    },
    {
      "type": "added",
      "value": "Senior",
      "startOffset": 30,
      "endOffset": 36,
      "flags": [
        {
          "type": "Title",
          "claimed": "Senior",
          "original": null,
          "severity": "Hard",
          "position": 32
        }
      ]
    },
    {
      "type": "unchanged",
      "value": "\nStack: Node.js, PostgreSQL",
      "startOffset": 36,
      "endOffset": 64,
      "flags": []
    },
    {
      "type": "added",
      "value": ", Redis, AWS",
      "startOffset": 64,
      "endOffset": 77,
      "flags": []
    },
    {
      "type": "added",
      "value": "\nMétrica: reduje latencia ",
      "startOffset": 77,
      "endOffset": 103,
      "flags": []
    },
    {
      "type": "added",
      "value": "40",
      "startOffset": 103,
      "endOffset": 105,
      "flags": []
    },
    {
      "type": "added",
      "value": "%",
      "startOffset": 105,
      "endOffset": 106,
      "flags": [
        {
          "type": "Metric",
          "claimed": "40%",
          "original": "35%",
          "severity": "Soft",
          "position": 105
        }
      ]
    }
  ],
  "summary": {
    "addedWords": 9,
    "removedWords": 0,
    "unchangedWords": 12,
    "totalFlags": 2,
    "hardFlags": 1,
    "softFlags": 1
  },
  "orphanedFlags": []
}
```

### 9.3 `DiffHandoff` ejemplo

```json
{
  "currentDocument": {
    "id": "V1StGXR8_Z5jdHi6B-myT",
    "version": "0.5.0",
    "locale": "es-CO",
    "sections": [
      {
        "id": "sec_01",
        "kind": "experience",
        "source": "user-typed",
        "createdAt": "2026-06-08T14:25:00.000Z",
        "updatedAt": "2026-06-08T14:30:00.000Z",
        "role": "Backend Developer",
        "company": "Acme Corp",
        "startDate": "2022-01",
        "endDate": null,
        "location": "Medellín",
        "bullets": ["Reduje latencia de API en 35%."],
        "techStack": ["Node.js", "PostgreSQL"]
      }
    ],
    "entities": [],
    "createdAt": "2026-06-08T14:25:00.000Z",
    "updatedAt": "2026-06-08T14:30:00.000Z",
    "source": "user-typed"
  },
  "adaptResult": {
    "adaptedText": "...",
    "validation": {
      "isValid": false,
      "severity": "Critical",
      "inventions": [
        {
          "type": "Title",
          "claimed": "Senior",
          "original": null,
          "severity": "Hard",
          "position": 32
        }
      ],
      "warnings": ["Hard invention detectada."]
    },
    "engineVersion": "1.0.0",
    "aiModel": "claude-sonnet-4-20250514"
  },
  "originalText": "...",
  "adaptTraceId": "0HMVD9F2E5Q2P:00000012",
  "at": "2026-06-08T14:35:00.000Z"
}
```

---

## 10. Garantías (lo que el contrato PROMETE)

1. **`computeWordDiff` es determinista**: misma entrada → mismo output.
2. **`mapFlagsToSegments` preserva orden**: las invenciones se asignan a los segmentos en el orden en que aparecen.
3. **`canDirectAccept` aplica la regla Art. I FR-070**: cualquier Hard pendiente bloquea.
4. **`useDiff.applyEdit` re-computa el diff sincrónicamente** (en el siguiente render) y elimina la invención correspondiente.
5. **`getValidDiffHandoff` lanza `AdaptationExpiredError` si >1 h**: el viewer no procesa handoffs viejos.
6. **El adaptedText NUNCA se envía al backend** salvo en `rescoreAdapted` (operación explícita del usuario).
7. **El modo (`unified` | `side-by-side`) persiste** entre recargas en `localStorage["buildcv:diff:mode"]`.

---

## 11. Anti-garantías (lo que el contrato NO PROMETE)

1. **NO hay sync entre pestañas** (cambiar el modo en una pestaña no afecta otras).
2. **NO hay undo/redo** de las ediciones inline (v1 si hay demanda).
3. **NO hay highlight de "cambios sospechosos"** más allá de los `EntityInvention` del backend.
4. **NO hay export del diff** como artefacto separado (PDF/imagen).
