# Contracts (Frontend internal): 006-web-cv-diff-viewer

> **Spec:** [../spec.md](../spec.md) · **Plan:** [../plan.md](../plan.md) · **Data Model:** [../data-model.md](../data-model.md)
> **Propósito**: Fuente de verdad de los contratos internos del diff viewer: tipos, funciones puras, hooks, errores, handoffs con 003 y 004.
>
> **Source of truth:** el shipped code (commit 4bf92b7). Los tipos, firmas y errores listados a continuación son los que existen en el código, no los que la spec original proponía.

---

## 1. `getDiffHandoff()` / `setDiffHandoff()` — Handoff con 003

**Ubicación**: `lib/diff/handoff.ts`

```typescript
import type { ValidationReport } from "@/lib/api/types";

export const DIFF_HANDOFF_KEY = "buildcv:diff-handoff";
export const MAX_DIFF_HANDOFF_AGE_MS = 60 * 60 * 1000;  // 1 hora

export interface DiffHandoff {
  /** Texto del CV original (antes de adaptar). */
  readonly originalText: string;
  /** Texto del CV adaptado (después de adaptar). */
  readonly adaptedText: string;
  /** ValidationReport del AdaptResult (severity, inventions, warnings). */
  readonly validation: ValidationReport;
  /** Trace ID de la request de adapt (correlación con logs del backend). */
  readonly adaptTraceId: string;
  /** Timestamp ISO 8601 del handoff. Se valida <1 h de antigüedad. */
  readonly timestamp: string;
}

export function readDiffHandoff(): DiffHandoff | null;          // sin validar expiración
export function readValidDiffHandoff(): DiffHandoff;             // lanza AdaptationExpiredError si >1h
export function writeDiffHandoff(handoff: DiffHandoff): void;
export function clearDiffHandoff(): void;
```

**Errores**:

```typescript
export class AdaptationExpiredError extends Error {
  readonly ageMs: number;
  constructor(ageMs: number) {
    super(`ADAPTATION_EXPIRED: la adaptación tiene ${Math.round(ageMs / 60_000)} minutos (máx 60).`);
    this.name = "AdaptationExpiredError";
    this.ageMs = ageMs;
  }
}

export class AdaptationStorageError extends Error {
  constructor(message: string) {
    super(`ADAPTATION_STORAGE_ERROR: ${message}`);
    this.name = "AdaptationStorageError";
  }
}
```

**Flujo**:

1. 003 (adapt) escribe `sessionStorage["buildcv:diff-handoff"] = JSON.stringify({...})` antes de navegar a `/analizar/diff`.
2. El viewer monta → `useSyncExternalStore` lee el handoff via `getClientSnapshot` → `readValidDiffHandoff` (lanza `AdaptationExpiredError` si >1h).
3. El usuario edita / acepta / rechaza. El handoff se actualiza o se limpia según la acción.
4. `writeDiffHandoff` re-escribe el handoff cuando el usuario hace "Aceptar" o "Editar en el editor" (preserva el `adaptedText` actualizado).
5. `clearDiffHandoff` lo elimina cuando el usuario hace "Rechazar".

**Diferencia shipped vs. spec original**:

- La spec original proponía un handoff con `currentDocument: CvDocument` (referencia al doc del editor 006a) y `originalText`. El shipped code NO incluye `currentDocument`: el handoff solo contiene `originalText` + `adaptedText` + `validation` + `adaptTraceId` + `timestamp`. El flujo 003 → 006b es standalone una vez que se carga el handoff.

---

## 2. Funciones puras — Diff

**Ubicación**: `lib/diff/`

### 2.1 `computeDiff`

```typescript
// lib/diff/compute-diff.ts
import { diffWords } from "diff";

export type DiffChangeKind = "added" | "removed" | "unchanged";

export interface DiffChange {
  readonly kind: DiffChangeKind;
  readonly value: string;
}

/**
 * Calcula el diff palabra-por-palabra entre dos textos usando Myers algorithm (jsdiff).
 * Devuelve una secuencia de `DiffChange` mapeada a un tipo local inmutable.
 * @pure
 * @example
 *   computeDiff("hello world", "hello there")
 *   // → [
 *   //   { kind: "unchanged", value: "hello " },
 *   //   { kind: "removed", value: "world" },
 *   //   { kind: "added", value: "there" },
 *   // ]
 */
export function computeDiff(
  before: string,
  after: string,
): ReadonlyArray<DiffChange>;
```

### 2.2 `flagEntitiesInDiff`

```typescript
// lib/diff/flag-entities.ts
import type { EntityInvention } from "@/lib/api/types";
import type { DiffChange, DiffSegmentWithFlags, FlagColor, FlaggedEntity } from "./types";

export interface FlagEntitiesResult {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  /** Invenciones que NO caen en ningún segmento del diff (segmentos "removed" o posición inválida). */
  readonly orphanedFlags: ReadonlyArray<EntityInvention>;
}

/**
 * Mapea cada `EntityInvention` al segmento del diff que la contiene.
 * Solo asigna flags a segmentos "added" o "unchanged"; los "removed" se excluyen
 * del texto adaptado y sus flags van a `orphanedFlags`.
 *
 * Reglas Constitution Art. I:
 * - Hard > Soft: si dos invenciones comparten position, conserva la Hard.
 * - Posiciones inválidas (negativas, fuera de rango) → `orphanedFlags`.
 * @pure
 */
export function flagEntitiesInDiff(
  diff: ReadonlyArray<DiffChange>,
  inventions: ReadonlyArray<EntityInvention>,
): FlagEntitiesResult;
```

---

## 3. Hooks — `DiffPage` (en `components/diff/diff-page.tsx`)

**No existe un hook `useDiff()`** en el shipped code. Toda la lógica de estado vive en el componente `DiffPage` (467 líneas).

```typescript
import type { EntityInvention } from "@/lib/api/types";
import type { DiffMode } from "@/lib/diff/types";

export interface DiffPageProps {
  /** Texto de la vacante, necesario para re-puntuar. */
  readonly jobText: string;
}

export function DiffPage({ jobText }: DiffPageProps): JSX.Element;
```

**Estado interno**:

```typescript
const hydration = useSyncExternalStore(
  subscribeHandoff, getClientSnapshot, getServerSnapshot,
);
const [editedText, setEditedText] = useState<string | null>(null);
const [inventions, setInventions] = useState<ReadonlyArray<EntityInvention>>([]);
const [mode, setMode] = useState<DiffMode>(() => /* matchMedia */);
const [isRescoring, setIsRescoring] = useState(false);
const [lastScore, setLastScore] = useState<number | null>(null);
const [errorMsg, setErrorMsg] = useState<string | null>(null);
const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);
const [toastMsg, setToastMsg] = useState<string | null>(null);
```

**Computación del diff** (con `useMemo`):

```typescript
const result = useMemo(() => {
  if (hydration.status !== "ready") return null;
  const diff = computeDiff(hydration.originalText, adaptedText);
  return flagEntitiesInDiff(diff, inventions);
}, [hydration.status, hydration.originalText, adaptedText, inventions]);
```

**Listeners del handoff** (para sync cross-tab):

```typescript
let handoffListeners: Array<() => void> = [];
function subscribeHandoff(listener: () => void): () => void {
  handoffListeners.push(listener);
  return () => { handoffListeners = handoffListeners.filter((l) => l !== listener); };
}
```

---

## 4. Componentes React (en `components/diff/`)

### 4.1 `<DiffView segments mode onModeChange onEditEntity onKeepEntity>`

```typescript
// components/diff/diff-view.tsx
import type { DiffMode, DiffSegmentWithFlags } from "@/lib/diff/types";
import type { EntityInvention } from "@/lib/api/types";

export interface DiffViewProps {
  readonly segments: ReadonlyArray<DiffSegmentWithFlags>;
  readonly mode: DiffMode;
  readonly onModeChange: (mode: DiffMode) => void;
  /** Handlers de invención (pasa por el badge). */
  readonly onEditEntity?: (entity: EntityInvention) => void;
  readonly onKeepEntity?: (entity: EntityInvention) => void;
}

export function DiffView(props: DiffViewProps): JSX.Element;
```

**Comportamiento**:

- Lee `mode` y renderiza `<UnifiedColumn>` (1 columna) o 2× `<SideColumn>` (lado a lado).
- Pasa los `segments` y handlers a cada columna.
- Toggle de modo inline en la cabecera (`onModeChange(NEXT_MODE[mode])`).

### 4.2 `<FlaggedEntityBadge flag onEdit onKeep>`

```typescript
// components/diff/flagged-entity-badge.tsx
import type { FlaggedEntity } from "@/lib/diff/types";

export interface FlaggedEntityBadgeProps {
  readonly flag: FlaggedEntity;
  readonly onEdit?: () => void;
  readonly onKeep?: () => void;
}

export function FlaggedEntityBadge(props: FlaggedEntityBadgeProps): JSX.Element;
```

**Comportamiento**:

- Renderiza un `<button>` con clase CSS según `color`:
  - `soft`: `border-red-700 bg-red-900/30 text-red-100`.
  - `hard`: `border-red-800 bg-red-950 text-red-50` + icono `×` (X).
- `aria-label`: `${copy.diff.invention.badgeLabel}. Severidad ${flag.entity.severity}. Término: ${flag.entity.claimed}.`
- `title` (tooltip): `copy.diff.invention.hardTooltip` o `copy.diff.invention.softTooltip`.
- Click → popover (modal) con detalles: Tipo, Severidad, Reclamado, Original, Posición + botones "Mantener" y "Editar".
- `Esc` cierra el popover (`useEffect` con `keydown` listener).

### 4.3 `<DiffToolbar mode onModeChange onRescore isRescoring lastScore hasJobText>`

```typescript
// components/diff/diff-toolbar.tsx
import type { DiffMode } from "@/lib/diff/types";

export interface DiffToolbarProps {
  readonly mode: DiffMode;
  readonly onModeChange: (mode: DiffMode) => void;
  readonly onRescore: () => void;
  readonly isRescoring: boolean;
  readonly lastScore: number | null;
  readonly hasJobText: boolean;
}

export function DiffToolbar(props: DiffToolbarProps): JSX.Element;
```

**Comportamiento**:

- Toggle de modo (radiogroup con 2 botones: "Unificado" / "Lado a lado").
- Botón "Re-puntuar" deshabilitado si `!hasJobText || isRescoring`.
- Si `lastScore !== null`, muestra: "Último puntaje: <strong>{lastScore}</strong>".

### 4.4 `<ActionFooter inventions onAcceptExport onEditInEditor onReject>`

```typescript
// components/diff/action-footer.tsx
import type { EntityInvention } from "@/lib/api/types";

export interface ActionFooterProps {
  readonly inventions: ReadonlyArray<EntityInvention>;
  readonly onAcceptExport: () => void;
  readonly onEditInEditor: () => void;
  readonly onReject: () => void;
}

export function ActionFooter(props: ActionFooterProps): JSX.Element;
```

**Comportamiento**:

- 3 botones en `role="toolbar"`.
- Si `inventions.filter(i => i.severity === "Hard").length > 0` y el usuario click "Aceptar y exportar":
  - Abre modal `role="alertdialog"` con `aria-modal="true"`.
  - "Revisarlas primero" → cierra el modal.
  - "Aceptar de todos modos" → llama `onAcceptExport`.
- Si no hay Hard pendientes: "Aceptar y exportar" → llama `onAcceptExport` directamente.

### 4.5 `InlineEditRow` (interno a `DiffPage`)

```typescript
// dentro de diff-page.tsx
interface InlineEdit {
  readonly entity: EntityInvention;
  readonly value: string;
}

const InlineValueSchema = z
  .string()
  .min(1, "vacío")
  .max(200, "demasiado largo");

function InlineEditRow({ edit, onChange, onConfirm, onCancel }: {
  readonly edit: InlineEdit;
  readonly onChange: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}): JSX.Element;
```

**Comportamiento**:

- `<div role="group" aria-label="Editar {entity.type}">` con:
  - `<label htmlFor="inline-edit-input">` "Nuevo valor:"
  - `<input type="text">` controlado por React.
  - `onKeyDown`: `Enter` → `onConfirm`, `Escape` → `onCancel`.
  - `onBlur` → `onConfirm`.
  - 2 botones: "Confirmar" y "Cancelar".
- Validación Zod: `InlineValueSchema.safeParse(value)` antes de `onConfirm`. Si falla, `setToastMsg(copy.diff.errors.validationFailed)`.
- Tras confirmar: `onConfirmEdit` (en `DiffPage`) reemplaza el `claimed` en el `adaptedText` en el offset de la invención y elimina la invención del array de `inventions`.

---

## 5. Errores (en `lib/diff/handoff.ts`)

```typescript
export class AdaptationExpiredError extends Error {
  readonly ageMs: number;
  constructor(ageMs: number) {
    super(`ADAPTATION_EXPIRED: la adaptación tiene ${Math.round(ageMs / 60_000)} minutos (máx 60).`);
    this.name = "AdaptationExpiredError";
    this.ageMs = ageMs;
  }
}

export class AdaptationStorageError extends Error {
  constructor(message: string) {
    super(`ADAPTATION_STORAGE_ERROR: ${message}`);
    this.name = "AdaptationStorageError";
  }
}
```

**Mapeo a UI** (en `getClientSnapshot` de `diff-page.tsx`):

| Error | UI |
|---|---|
| `AdaptationExpiredError` | Página de error: "La adaptación expiró. Vuelve a solicitarla." + botón "Volver a `/analizar`". |
| `AdaptationStorageError` (no handoff found) | Página de error: "Adaptación no encontrada" + botón "Volver a `/analizar`". |
| Otros errores de storage | Página de error genérica. |

**Nota shipped**: las clases `DiffComputationError` y `HardInventionPendingError` mencionadas en la spec original **NO existen** como clases. El cómputo del diff no lanza errores (jsdiff siempre retorna un resultado). El bloqueo de Hard se hace por conteo en `ActionFooter`, no como excepción.

---

## 6. Contrato con feature 002 — Re-puntuar

**Ubicación**: `components/diff/diff-page.tsx` (`onRescore`)

```typescript
import { requestScore, type ScoreError } from "@/lib/api/score";

const onRescore = useCallback(async () => {
  if (!hasJobText) return;
  setIsRescoring(true);
  setErrorMsg(null);
  try {
    const r = await requestScore(adaptedText, jobText);
    setLastScore(r.overallScore);
  } catch (err) {
    const message = err && typeof err === "object" && "message" in err
      ? String((err as ScoreError).message)
      : copy.diff.errors.network;
    setErrorMsg(message);
  } finally {
    setIsRescoring(false);
  }
}, [adaptedText, jobText, hasJobText]);
```

**Comportamiento**:

- Si `!hasJobText` (vacante vacía), retorna sin llamar al backend.
- `lastScore` se setea con `r.overallScore` (entero 0-100).
- Errores del backend (4xx/5xx, incluido 429) se surfacean en `errorMsg` con `aria-live`.

---

## 7. Contrato con feature 004 — Aceptar y exportar

**Ubicación**: `components/diff/diff-page.tsx` (`onAcceptExport`)

```typescript
const onAcceptExport = useCallback(() => {
  if (!hydration.handoff) return;
  const next: DiffHandoff = {
    ...hydration.handoff,
    adaptedText,
    validation: {
      ...hydration.handoff.validation,
      inventions: inventions.slice(),
    },
    timestamp: new Date().toISOString(),
  };
  writeDiffHandoff(next);
  if (typeof window !== "undefined") {
    window.location.href = "/analizar/exportar";
  }
  for (const listener of handoffListeners) listener();
}, [hydration.handoff, adaptedText, inventions]);
```

**Flujo**:

1. `onAcceptExport` actualiza el handoff con el `adaptedText` actual (post-ediciones) y la lista de `inventions` (las resueltas se eliminan).
2. `writeDiffHandoff(next)` re-escribe el handoff.
3. `window.location.href = "/analizar/exportar"` navega a 004.
4. `for (const listener of handoffListeners) listener()` notifica a otros componentes suscritos (cross-tab sync).
5. 004 lee `getDiffHandoff().adaptedText` y lo usa como input para `serializeCvDocument` (re-uso de 006a) → PDF.

---

## 8. Contrato con feature 003 — Re-prompt

**Ubicación**: `components/diff/diff-page.tsx` (`onReject`)

```typescript
const onReject = useCallback(() => {
  clearDiffHandoff();
  if (typeof sessionStorage !== "undefined") {
    // Guardar contexto de re-prompt (opcional, futuro)
    sessionStorage.setItem(
      "buildcv:reprompt:context",
      JSON.stringify({ originalText: hydration.originalText, timestamp: new Date().toISOString() }),
    );
  }
  setToastMsg(copy.diff.actions.rejectToast);
  if (typeof window !== "undefined") {
    setTimeout(() => {
      window.location.href = "/analizar";
    }, 300);
  }
}, [hydration.originalText]);
```

**Flujo**:

1. `clearDiffHandoff()` elimina el handoff de sessionStorage.
2. Guarda contexto de re-prompt (opcional, no se lee actualmente en el shipped code).
3. Muestra toast "Adaptación rechazada".
4. Tras 300ms, navega a `/analizar`.

---

## 9. Ejemplos de payloads (alineados con el shipped code)

### 9.1 `DiffHandoff` ejemplo (serializado en `sessionStorage["buildcv:diff-handoff"]`)

```json
{
  "originalText": "Juan Pérez\nBackend Developer\nStack: Node.js, PostgreSQL",
  "adaptedText": "Juan Pérez\nBackend Developer Senior\nStack: Node.js, PostgreSQL, Redis, AWS\nMétrica: reduje latencia 40%",
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
      },
      {
        "type": "Metric",
        "claimed": "40%",
        "original": "35%",
        "severity": "Soft",
        "position": 95
      }
    ],
    "warnings": ["Una métrica fue redondeada (40% vs 35%)."]
  },
  "adaptTraceId": "0HMVD9F2E5Q2P:00000012",
  "timestamp": "2026-06-09T14:30:00.000Z"
}
```

**Nota**: el shipped code NO incluye `currentDocument: CvDocument` (a diferencia de la spec original). El handoff es más simple.

### 9.2 Resultado de `flagEntitiesInDiff` (en runtime)

```typescript
{
  segments: [
    { kind: "unchanged", value: "Juan Pérez\nBackend Developer ", startOffset: 0, endOffset: 30, flags: [] },
    { kind: "added", value: "Senior", startOffset: 30, endOffset: 36, flags: [
      { entity: { type: "Title", claimed: "Senior", original: null, severity: "Hard", position: 32 }, position: 32, color: "hard" }
    ]},
    { kind: "unchanged", value: "\nStack: Node.js, PostgreSQL", startOffset: 36, endOffset: 64, flags: [] },
    { kind: "added", value: ", Redis, AWS", startOffset: 64, endOffset: 77, flags: [] },
    { kind: "added", value: "\nMétrica: reduje latencia ", startOffset: 77, endOffset: 103, flags: [] },
    { kind: "added", value: "40", startOffset: 103, endOffset: 105, flags: [] },
    { kind: "added", value: "%", startOffset: 105, endOffset: 106, flags: [
      { entity: { type: "Metric", claimed: "40%", original: "35%", severity: "Soft", position: 105 }, position: 105, color: "soft" }
    ]}
  ],
  orphanedFlags: []
}
```

---

## 10. Garantías (lo que el contrato PROMETE)

1. **`computeDiff` es determinista**: misma entrada → mismo output.
2. **`flagEntitiesInDiff` preserva orden**: las invenciones se asignan a los segmentos en el orden en que aparecen.
3. **`flagEntitiesInDiff` aplica la regla Art. I**: Hard > Soft (deduplica por posición, conservando la Hard).
4. **`readValidDiffHandoff` lanza `AdaptationExpiredError` si >1 h**: el viewer no procesa handoffs viejos.
5. **El adaptedText NUNCA se envía al backend** salvo en `requestScore` (operación explícita del usuario vía "Re-puntuar").
6. **El modo (`unified` | `side-by-side`) NO persiste entre sesiones en v0.5** (decisión; v1 con `localStorage["buildcv:diff:mode"]`).
7. **El listener de `matchMedia` actualiza el modo automáticamente** si el usuario cambia el tamaño de ventana o rota el móvil.
8. **El bloqueo de Hard es un modal, no un bloqueo total**: el usuario puede "Aceptar de todos modos" tras confirmar.

---

## 11. Anti-garantías (lo que el contrato NO PROMETE)

1. **NO hay sync entre pestañas garantizado** (los listeners existen pero son best-effort).
2. **NO hay undo/redo** de las ediciones inline (v1 si hay demanda).
3. **NO hay highlight de "cambios sospechosos"** más allá de los `EntityInvention` del backend.
4. **NO hay export del diff** como artefacto separado (PDF/imagen).
5. **NO hay Tiptap ni rich text inline** (v0.5 usa `<input>` HTML nativo; v1 con Tiptap si hay demanda).
6. **NO hay persistencia del modo entre sesiones** (decisión v0.5).
7. **NO hay un hook `useDiff()` reusable**: la lógica vive en `DiffPage` (467 líneas). Si en v1 se necesita, se extrae sin breaking changes.
