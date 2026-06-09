# Implementation Plan: 006-web-cv-diff-viewer

> **Feature Branch:** `006-web-cv-diff-viewer`
> **Spec:** [./spec.md](./spec.md) · **Research:** [./research.md](./research.md) · **Data Model:** [./data-model.md](./data-model.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
> **Sister sub-feature:** [`../006-web-cv-editor/`](../006-web-cv-editor/) (shipped, commit 748611d)
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)
>
> **⚠️ Plan vs. shipped deviation.** El plan original proponía Tiptap v2 read-only con un nodo editable solo donde está la invención. El shipped code REJECTÓ Tiptap. Se usa un `<input>` HTML nativo controlado por React con Zod. El render del diff es custom (sin librería UI). El estado es local con `useState` + `useCallback` (mismo enfoque que 006a). Ver `tasks.md` líneas 8–14 para la decisión arquitectónica explícita. Este plan refleja el shipped code (commit 4bf92b7).

---

## Summary

Construir el visor de diff en `/analizar/diff`. El viewer consume un `AdaptResult` (de 003) vía `sessionStorage` (`buildcv:diff-handoff`) y renderiza un diff palabra-por-palabra entre el CV original y el adaptado, con **badges rojos** sobre cada `EntityInvention` marcada por el backend. El usuario puede editar inline (vía `<input>` validado por Zod), aceptar, rechazar, o re-prompt. El viewer usa **`diff` (jsdiff v5)** para el word-level diff y un **renderer custom en React** con `<span>` por segmento.

**Decisiones locked (reflejando el shipped code):**

1. **Diff library**: `diff` (jsdiff, BSD-3-Clause) — única dep nueva para 006b. Rechazados: `react-diff-viewer-continued` (pesado, opinionated), `diff-match-patch` (Google, menos mantenido), hand-rolled Myers/LCS.
2. **Render**: custom React component (NO librería UI de diff) — control total de a11y/estilos.
3. **Edición inline**: **`<input>` HTML nativo** controlado por React, con Zod (`z.string().min(1).max(200)`). **NO Tiptap** (read-only o cualquier modo).
4. **Modo default**: unificado en móvil (<768 px), lado a lado en desktop. Sin persistencia del modo entre sesiones (decisión v0.5; v1 con `localStorage`).
5. **Estado**: `useState` + `useCallback` local en `DiffPage` (mismo enfoque que 006a). **Sin Zustand**.
6. **Sin backend nuevo**: reusa `POST /api/score` (002) y `POST /api/adapt` (003).

---

## Technical Context

| Aspecto | Decisión | Justificación |
|---|---|---|
| Lenguaje/versión | TypeScript ^5 strict | Estricto en `tsconfig.json`. |
| Framework | Next.js 16.2.7 + React 19.2.4 | Stack locked del sub-proyecto. |
| Diff library | `diff` v5 (jsdiff) | BSD-3, word-level Myers, ~15 KB. |
| Render | Custom React (`<span>` por segmento) | Control de a11y/estilos, consistencia con 006a. |
| Edición inline | `<input>` HTML nativo + Zod | Mínimo bundle, accesibilidad nativa. |
| Estado | `useState` + `useCallback` local en `DiffPage` | Sin store global; mismo enfoque que 006a. |
| Validación | Zod v3 (re-uso) | Consistencia con 005/006a. |
| Storage adicional | `sessionStorage["buildcv:diff-handoff"]` | Handoff desde 003; Art. III. |
| Testing | Vitest 2 + RTL 16 + jsdom + Playwright 1 chromium | TDD activo (Constitution Art. VIII). 5 test files shipped. |
| Plataforma | Web moderno + móvil ≥360 px | NFR-034. |

---

## Constitution Check

| Art. | Verificación | Estado |
|---|---|---|
| **Art. I** — Cero invención | FR-066/067/068/070: badges rojos sobre cada invención, edición inline con `<input>` + Zod, footer bloquea "Aceptar" con Hard pendientes (modal). | ✅ PASS |
| **Art. II** — Determinismo | Re-score via 002-score-engine. Diff viewer no calcula números. | ✅ PASS |
| **Art. III** — Privacidad | Handoff via sessionStorage (no URL). Sin persistencia adicional. | ✅ PASS |
| **Art. IV** — Encuadre honesto | Copy: "Revisa la adaptación", NUNCA "confirma el cambio". | ✅ PASS |
| **Art. V** — Entrada como dato | Sin modificaciones automáticas del adaptedText. Cada cambio es explícito. | ✅ PASS |
| **Art. VI** — Clean Arch | Reusa BFF existentes (003, 002, 004). No nuevo endpoint backend. | ✅ PASS |
| **Art. VII** — v0.5 sin fricción | Sin cuentas, sin server-side. | ✅ PASS |
| **Art. VIII** — TDD | Vitest 2 + RTL 16 + jsdom configurados; 5 test files shipped. | ✅ PASS |

**Compliance esperado: PASS en v0.5.**

---

## Project Structure

### Documentación (esta feature)

```text
BuildCv-web/specs/006-web-cv-diff-viewer/
├── plan.md                              # Este archivo
├── research.md                          # Phase 0 — histórico de evaluación
├── data-model.md                        # Phase 1 — tipos TypeScript
├── quickstart.md                        # Phase 1 — pasos para correr
├── tasks.md                             # Phase 2 — T-006b-01..N (preserva bloque DECISIÓN)
└── contracts/
    └── frontend-internal.md             # Phase 1 — contratos
```

### Código fuente shipped (paths desde `BuildCv-web/`)

```text
app/
└── analizar/
    └── diff/
        └── page.tsx                     # ✅ SHIPPED — Server Component que monta <DiffPage> dentro de <ClientWrapper>

components/
└── diff/
    ├── diff-page.tsx                    # ✅ SHIPPED — Orquestador (useState + useCallback, handoff listener, 467 líneas)
    ├── diff-view.tsx                    # ✅ SHIPPED — Renderer (unified | side-by-side), 163 líneas
    ├── diff-toolbar.tsx                 # ✅ SHIPPED — Toggle modo + Re-puntuar, 88 líneas
    ├── flagged-entity-badge.tsx         # ✅ SHIPPED — Badge rojo con popover de detalles, 129 líneas
    └── action-footer.tsx                # ✅ SHIPPED — Footer con 3 acciones + modal Hard, 113 líneas

lib/
└── diff/
    ├── compute-diff.ts                  # ✅ SHIPPED — jsdiff wrapper (diffWords → DiffChange[]), 44 líneas
    ├── flag-entities.ts                 # ✅ SHIPPED — Mapeo EntityInvention → segmento + dedupe Hard>Soft + orphanedFlags, 112 líneas
    ├── types.ts                         # ✅ SHIPPED — DiffChange, DiffSegmentWithFlags, FlaggedEntity, DiffMode, DiffHandoff, 61 líneas
    ├── handoff.ts                       # ✅ SHIPPED — readDiffHandoff, readValidDiffHandoff, writeDiffHandoff, clearDiffHandoff, 84 líneas
    ├── compute-diff.test.ts             # ✅ SHIPPED — 8+ tests
    ├── flag-entities.test.ts            # ✅ SHIPPED — 6+ tests
    └── types.test.ts                    # ✅ SHIPPED — 4+ tests

e2e/                                     # Playwright specs (cuando se creen en sprint futuro)
```

**5 componentes shipped** + **4 lib/diff helpers** + **3 archivos de test** = ~1 200 líneas de código shipped.

---

## Decisiones de arquitectura (locked — shipped)

### 1. Diff library: `diff` (jsdiff) v5

```typescript
// lib/diff/compute-diff.ts
import { diffWords } from "diff";

export type DiffChangeKind = "added" | "removed" | "unchanged";

export interface DiffChange {
  readonly kind: DiffChangeKind;
  readonly value: string;
}

export function computeDiff(
  before: string,
  after: string,
): ReadonlyArray<DiffChange> {
  return diffWords(before, after).map(toDiffChange);
}

function toDiffChange(change: { value: string; added?: boolean; removed?: boolean }): DiffChange {
  const kind: DiffChangeKind = change.added ? "added" : change.removed ? "removed" : "unchanged";
  return { kind, value: change.value };
}
```

**Por qué jsdiff sobre alternativas** (rechazadas):

- `react-diff-viewer-continued`: UI bonita pero opinionated; no respeta el tema oscuro cálido del proyecto.
- `diff-match-patch` (Google): orientado a patching, no a display. Más complejo para lo que necesitamos.
- hand-rolled Myers/LCS: 2-3 días de código + tests. jsdiff ya lo tiene.

**Performance**: word-level diff de 50 KB completa en ~300-500 ms en hardware moderno. Aceptable para NFR-032 (<2 s).

### 2. Render custom (NO librería UI) — `components/diff/diff-view.tsx`

El render es un componente React que itera sobre los `DiffSegmentWithFlags[]` y emite `<span>` con clases CSS según el kind:

```tsx
const SEGMENT_CLASS: Record<string, string> = {
  added: "bg-present/15 text-present",         // verde
  removed: "bg-missing/15 text-missing line-through",  // rojo
  unchanged: "text-ink",                       // neutro
};

// Modo unificado: una sola columna
function UnifiedColumn({ segments, ... }) {
  return (
    <article>
      {segments.map((seg, i) => (
        <span key={i} className="whitespace-pre-wrap">
          {seg.kind === "added" ? <span className="bg-present/15 text-present">+{seg.value}</span>
           : seg.kind === "removed" ? <span className="bg-missing/15 text-missing line-through">−{seg.value}</span>
           : <span>{seg.value}</span>}
          {seg.flags.map((f) => <FlaggedEntityBadge key={...} flag={f} ... />)}
        </span>
      ))}
    </article>
  );
}

// Modo lado a lado: 2 columnas (original | adapted)
function SideColumn({ segments, side, ... }) {
  const filtered = segments.filter((s) =>
    side === "original" ? s.kind !== "added" : s.kind !== "removed"
  );
  // render similar con filtered
}
```

**Justificación**: control total de a11y (aria-labels en cada segmento, `aria-live="polite"` en la región), colores que respetan el tema oscuro cálido (`bg-present` = verde, `bg-missing` = rojo), y consistencia con el resto del proyecto.

### 3. Badges sobre `EntityInvention` (FR-066/067) — `lib/diff/flag-entities.ts`

El backend retorna `EntityInvention[]` con `position: number` (offset en el `adaptedText`). El viewer:

1. Calcula el word-level diff (`computeDiff`).
2. Mapea cada `EntityInvention.position` al segmento del diff que contiene la posición (`flagEntitiesInDiff`).
3. Inyecta un `<FlaggedEntityBadge>` justo después del segmento que contiene la posición.

```typescript
// lib/diff/flag-entities.ts
export function flagEntitiesInDiff(
  diff: ReadonlyArray<DiffChange>,
  inventions: ReadonlyArray<EntityInvention>,
): FlagEntitiesResult {
  const segments: DiffSegmentWithFlags[] = [];
  const orphaned: EntityInvention[] = [];
  let offset = 0;

  for (const change of diff) {
    const startOffset = offset;
    const endOffset = offset + change.value.length;
    offset = endOffset;

    if (change.kind === "removed") {
      segments.push({ ...change, startOffset, endOffset, flags: [] });
      continue;
    }

    const flags: FlaggedEntity[] = [];
    for (const entity of inventions) {
      if (entity.position < 0) { orphaned.push(entity); continue; }
      if (entity.position >= startOffset && entity.position < endOffset) {
        flags.push({
          entity, position: entity.position,
          color: severityToColor(entity.severity),
        });
      }
    }
    const dedup = dedupeByHighestSeverity(flags);
    segments.push({ ...change, startOffset, endOffset, flags: dedup });
  }

  // Lo que no quedó asignado → orphaned
  const assigned = new Set(segments.flatMap((s) => s.flags.map((f) => f.entity)));
  for (const entity of inventions) {
    if (!assigned.has(entity) && !orphaned.includes(entity)) orphaned.push(entity);
  }

  return { segments, orphanedFlags: orphaned };
}

// Regla Art. I: Hard > Soft. Si dos invenciones comparten position, conserva la Hard.
function dedupeByHighestSeverity(flags: ReadonlyArray<FlaggedEntity>): ReadonlyArray<FlaggedEntity> {
  if (flags.length <= 1) return flags;
  const byPosition = new Map<number, FlaggedEntity>();
  for (const flag of flags) {
    const existing = byPosition.get(flag.position);
    if (!existing) { byPosition.set(flag.position, flag); continue; }
    if (flag.color === "hard" && existing.color !== "hard") {
      byPosition.set(flag.position, flag);
    }
  }
  return Array.from(byPosition.values());
}
```

### 4. Edición inline con `<input>` HTML nativo (NO Tiptap) — `DiffPage` con `InlineEditRow`

Cuando el usuario click "Editar" en un popover, el badge se reemplaza por un `<input>` controlado por React:

```tsx
// InlineEditRow (dentro de diff-page.tsx)
<input
  id="inline-edit-input"
  type="text"
  value={edit.value}
  onChange={(e) => onChange(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") { e.preventDefault(); onConfirm(); }
    else if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  }}
  onBlur={() => onConfirm()}
  className="flex-1 min-w-[200px] rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
/>

// Validación Zod (también en diff-page.tsx)
const InlineValueSchema = z
  .string()
  .min(1, "vacío")
  .max(200, "demasiado largo");

// onConfirm: si pasa Zod, reemplaza en adaptedText
const onConfirmEdit = useCallback(() => {
  if (!inlineEdit) return;
  const parsed = InlineValueSchema.safeParse(inlineEdit.value);
  if (!parsed.success) {
    setToastMsg(copy.diff.errors.validationFailed);
    setInlineEdit(null);
    return;
  }
  const { entity } = inlineEdit;
  const before = adaptedText.slice(0, entity.position);
  const after = adaptedText.slice(entity.position + entity.claimed.length);
  const next = before + parsed.data + after;
  setEditedText(next);
  setInventions(inventions.filter((i) => i !== entity));
  setInlineEdit(null);
}, [inlineEdit, adaptedText, inventions]);
```

**Justificación del `<input>` HTML sobre Tiptap** (rechazado):

- Mismo Constitution compliance (Art. I FR-068) con Zod como gate.
- Bundle 0 KB extra (Tiptap añade ~50-80 KB).
- Tests más simples (input controlado vs. ProseMirror state).
- Accesibilidad nativa del `<input>` (mejor que custom editor).
- Suficiente para "editar el valor de una palabra/frase corta" (claimed ≤ 200 chars por convención de 003).

### 5. Footer (FR-069/070) — `components/diff/action-footer.tsx`

```tsx
export function ActionFooter({ inventions, onAcceptExport, onEditInEditor, onReject }) {
  const hardCount = inventions.filter((i) => i.severity === "Hard").length;
  const onAcceptClick = () => {
    if (hardCount > 0) { setModalOpen(true); return; }
    onAcceptExport();
  };

  return (
    <div role="toolbar" aria-label="Acciones finales del diff">
      <button onClick={onAcceptClick}>{copy.diff.actions.accept}</button>
      <button onClick={onEditInEditor}>{copy.diff.actions.edit}</button>
      <button onClick={onReject}>{copy.diff.actions.reject}</button>

      {modalOpen && (
        <div role="alertdialog" aria-modal="true">
          <h2>{copy.diff.modal.hardTitle}</h2>
          <p>{copy.diff.modal.hardDetail.replace("{count}", String(hardCount))}</p>
          <button onClick={() => setModalOpen(false)}>{copy.diff.actions.reviewFirst}</button>
          <button onClick={() => { setModalOpen(false); onAcceptExport(); }}>
            {copy.diff.actions.acceptAnyway}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 6. Re-puntuar (FR-071) — `useCallback` en `DiffPage`

```typescript
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

**Rate-limit**: el backend 002 aplica 60/h por IP. El viewer deshabilita el botón "Re-puntuar" si `!hasJobText` o `isRescoring`.

### 7. Handoff listener con `useSyncExternalStore` — `components/diff/diff-page.tsx`

`DiffPage` usa `useSyncExternalStore` para leer el handoff de sessionStorage de forma estable (no causa re-renders innecesarios):

```typescript
function getClientSnapshot(): HandoffSnapshot {
  if (typeof window === "undefined") return LOADING_SNAPSHOT;
  const raw = readDiffHandoff();
  if (raw === null) return SNAPSHOT_CACHE["no-handoff"];
  try {
    const h = readValidDiffHandoff();
    // ... cache snapshot para mantener referencia estable
  } catch (err) {
    if (err instanceof AdaptationExpiredError) return SNAPSHOT_CACHE.expired;
    if (err instanceof AdaptationStorageError) return SNAPSHOT_CACHE["no-handoff"];
    return SNAPSHOT_CACHE.error;
  }
}

let handoffListeners: Array<() => void> = [];
function subscribeHandoff(listener: () => void): () => void {
  handoffListeners.push(listener);
  return () => { handoffListeners = handoffListeners.filter((l) => l !== listener); };
}
```

---

## Routing

- **`/analizar/diff`**: página principal del diff viewer (server component que monta el client component `DiffPage` dentro de `ClientWrapper`).
- **`/analizar/diff?job=...`**: query param opcional con la vacante (URL-friendly, NO PII).
- **No sub-rutas**: el viewer es una sola pantalla.

---

## State management

**Decisión shipped: `useState` + `useCallback` local en `DiffPage`.**

```typescript
export function DiffPage({ jobText }: DiffPageProps) {
  const hydration = useSyncExternalStore(/* ... */);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [inventions, setInventions] = useState<ReadonlyArray<EntityInvention>>([]);
  const [mode, setMode] = useState<DiffMode>(() => {
    if (typeof window === "undefined") return "unified";
    return window.matchMedia("(min-width: 768px)").matches ? "side-by-side" : "unified";
  });
  const [isRescoring, setIsRescoring] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const adaptedText = editedText ?? hydration.adaptedText;
  // ...
}
```

**Justificación**: el viewer tiene UN diff. No hay múltiples vistas que necesiten sincronización. `useState` local es más simple, más testeable, y suficiente.

---

## Test plan (TDD activo, Constitution Art. VIII)

### Tests automatizados (5 test files shipped)

- **Unit (`lib/diff/`)**:
  - `compute-diff.test.ts` (8+ tests) — `diffWords` mapea a `DiffChange[]` correctamente; casos: idénticos, added, removed, modified, empty, caracteres especiales (&, <, >, "), performance 50 KB.
  - `flag-entities.test.ts` (6+ tests) — `flagEntitiesInDiff` mapea posiciones correctamente; `dedupeByHighestSeverity` aplica Hard>Soft; `orphanedFlags` para segmentos `removed` y posiciones inválidas.
  - `types.test.ts` (4+ tests) — shape de `DiffChange`, `DiffSegmentWithFlags`, `FlaggedEntity`, `DiffMode`, `DiffHandoff`.
- **Component (`components/diff/`)**:
  - `action-footer.test.tsx` (3+ tests) — renderiza 3 botones; abre modal Hard si hay Hard pendientes; llama `onAcceptExport` solo tras confirmar.
  - `diff-page.test.tsx` (5+ tests) — render de loading/expired/no-handoff/error/empty/ready; edición inline con Zod; re-puntuar; "Aceptar y exportar" navega.
  - `diff-toolbar.test.tsx` (2+ tests) — toggle modo; deshabilita re-puntuar si `!hasJobText`.
  - `diff-view.test.tsx` (2+ tests) — render unified/side-by-side; badges con `aria-label`.
  - `flagged-entity-badge.test.tsx` (2+ tests) — badge con popover; severidad Hard vs Soft.

### Tests E2E (Playwright 1 chromium)

- `e2e/diff.spec.ts` — flujo adapt + diff + edit + accept + export (cuando se cree en sprint futuro).

### CI ground truth

```bash
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
pnpm test                       # vitest run → 710 tests passing
pnpm test:e2e                   # playwright test → si existe
```

---

## Files shipped (resumen)

| Path | Líneas (aprox.) | Exports principales |
|---|---|---|
| `app/analizar/diff/page.tsx` | 35 | Server Component |
| `components/diff/diff-page.tsx` | 467 | `DiffPage` (orquestador) |
| `components/diff/diff-view.tsx` | 163 | `DiffView`, `DiffViewProps` |
| `components/diff/diff-toolbar.tsx` | 88 | `DiffToolbar`, `DiffToolbarProps` |
| `components/diff/flagged-entity-badge.tsx` | 129 | `FlaggedEntityBadge`, `FlaggedEntityBadgeProps` |
| `components/diff/action-footer.tsx` | 113 | `ActionFooter`, `ActionFooterProps` |
| `lib/diff/compute-diff.ts` | 44 | `computeDiff`, `DiffChange`, `DiffChangeKind` |
| `lib/diff/flag-entities.ts` | 112 | `flagEntitiesInDiff`, `FlagEntitiesResult` |
| `lib/diff/types.ts` | 61 | `DiffChange`, `DiffSegmentWithFlags`, `FlaggedEntity`, `FlagColor`, `DiffMode`, `DiffHandoff` |
| `lib/diff/handoff.ts` | 84 | `readDiffHandoff`, `readValidDiffHandoff`, `writeDiffHandoff`, `clearDiffHandoff`, `AdaptationExpiredError`, `AdaptationStorageError`, `DIFF_HANDOFF_KEY`, `MAX_DIFF_HANDOFF_AGE_MS` |

**Total**: ~1 300 líneas de código shipped + 5 archivos de test (~20+ tests).

---

## Dependencias añadidas (`pnpm add`)

**SÓLO UNA dep nueva** para 006b:

```bash
pnpm add diff
```

Las demás dependencias (Vitest, RTL, jsdom, Playwright, Zod) ya estaban instaladas por sprint 0 / sprint 4a.

**Verificación previa a `pnpm add`**: `pnpm-lock.yaml` no debe romperse. CI corre `pnpm install --frozen-lockfile`.

---

## Risks y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| jsdiff añade ~15 KB al bundle | Alta | Bajo | Tree-shaking con named imports (`import { diffWords } from "diff"`). |
| Word-level diff de 50 KB >2 s | Baja | Medio | jsdiff Myers es ~O(ND); medido ~500 ms. Si falla, Web Worker (futuro). |
| `position` del backend no coincide con offsets del frontend | Media | Alto (badges misplaced) | `flagEntitiesInDiff` calcula offsets acumulativos; las invenciones fuera de rango van a `orphanedFlags` con un aviso visible. |
| Móvil no cabe el diff lado a lado | Alta | Bajo | Default unificado en móvil, toggle sigue disponible (`useMatchMedia` listener). |
| Sesión de adaptaciones >1 h se borra de sessionStorage | Baja | Bajo | Banner "La adaptación expiró" + link a re-adaptar. |
| Race condition en handoff listener (otro tab) | Baja | Bajo | `handoffListeners` notifica a los componentes suscritos cuando el handoff cambia. |

---

## Next Phase

→ `tasks.md` — desglose T-006b-01..N por fase (Setup, Foundational, US-1..4, Polish). El bloque "DECISIÓN ARQUITECTÓNICA" (líneas 8–14) está preservado verbatim.
