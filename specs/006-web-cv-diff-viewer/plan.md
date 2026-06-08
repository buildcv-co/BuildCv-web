# Implementation Plan: 006-web-cv-diff-viewer

> **Feature Branch:** `006-web-cv-diff-viewer`
> **Spec:** [./spec.md](./spec.md) · **Research:** [./research.md](./research.md) · **Data Model:** [./data-model.md](./data-model.md) · **Contracts:** [./contracts/frontend-internal.md](./contracts/frontend-internal.md)
> **Sister sub-feature:** [`../006-web-cv-editor/`](../006-web-cv-editor/)
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)

---

## Summary

Construir el visor de diff en `/analizar/diff`. El viewer consume un `AdaptResult` (de 003) vía `sessionStorage` y renderiza un diff palabra-por-palabra entre el CV original y el adaptado, con **badges rojos** sobre cada `EntityInvention` marcada por el backend. El usuario puede editar inline, aceptar, rechazar, o re-prompt. El viewer reusa Tiptap (006a) en modo read-only para la columna adaptada y `diff` (jsdiff) para el word-level diff.

**Decisiones locked** (detalle en `research.md`):

1. **Diff library**: `diff` (jsdiff, BSD-3-Clause) — rechazados: react-diff-viewer-continued (pesado, opinionated), diff-match-patch (Google, menos mantenido), `git-diff` (no aplica a texto).
2. **Render**: custom React component (no librería de diff UI) para control total de a11y/estilos.
3. **Edición inline**: Tiptap v2 read-only con un nodo editable solo donde está la invención.
4. **Modo default**: unificado en móvil (<768 px), lado a lado en desktop.
5. **Sin backend nuevo**: reusa `POST /api/score` (002) y `POST /api/adapt` (003).

---

## Technical Context

| Aspecto | Decisión | Justificación |
|---|---|---|
| Lenguaje/versión | TypeScript ^5 strict | Estricto en `tsconfig.json`. |
| Framework | Next.js 16.2.7 + React 19.2.4 | Stack locked del sub-proyecto. |
| Diff library | `diff` v5 (jsdiff) | BSD-3, word-level Myers, ~10 KB. |
| Render | Custom React + Tiptap v2 read-only | Control de a11y/estilos, consistencia con 006a. |
| Estado | Zustand (mismo store que 006a, extendido) | Sin duplicar estado. |
| Validación | Zod v3 (re-uso) | Consistencia con 005/006a. |
| Storage adicional | Ninguno (reusa `ICvStore` de 006a) | sessionStorage para handoff. |
| Testing | Manual e2e checklist (Vitest en M3+) | Sin framework en v0.5. |
| Plataforma | Web moderno + móvil ≥360 px | NFR-034. |

---

## Constitution Check

| Art. | Verificación | Estado |
|---|---|---|
| **Art. I** — Cero invención | FR-066/067/068: badges rojos sobre cada invención, edición inline, footer bloquea "Aceptar" con Hard pendientes. | ✅ PASS |
| **Art. II** — Determinismo | Re-score via 002-score-engine. Diff viewer no calcula números. | ✅ PASS |
| **Art. III** — Privacidad | Handoff via sessionStorage (no URL). Sin persistencia adicional. | ✅ PASS |
| **Art. IV** — Encuadre honesto | Copy: "Revisa la adaptación", NUNCA "confirma el cambio". | ✅ PASS |
| **Art. V** — Entrada como dato | Sin modificaciones automáticas del adaptedText. Cada cambio es explícito. | ✅ PASS |
| **Art. VI** — Clean Arch | Reusa BFF existentes (003, 002, 004). No nuevo endpoint backend. | ✅ PASS |
| **Art. VII** — v0.5 sin fricción | Sin cuentas, sin server-side. | ✅ PASS |

**Compliance esperado: PASS** en v0.5.

---

## Project Structure

### Documentación (esta feature)

```text
BuildCv-web/specs/006-web-cv-diff-viewer/
├── plan.md                              # Este archivo
├── research.md                          # Phase 0
├── data-model.md                        # Phase 1
├── quickstart.md                        # Phase 1
├── tasks.md                             # Phase 2
└── contracts/
    └── frontend-internal.md             # Phase 1
```

### Código fuente (paths desde `BuildCv-web/`)

```text
app/
└── analizar/
    └── diff/
        ├── page.tsx                     # 🆕 Página principal del diff viewer
        └── layout.tsx                   # 🆕 Layout con DiffToolbar persistente

components/
└── diff/
    ├── diff-view.tsx                    # 🆕 Orquestador (unified | side-by-side)
    ├── diff-toolbar.tsx                 # 🆕 Toggle modo + Re-puntuar + Acción footer
    ├── diff-column.tsx                  # 🆕 Una columna del diff (original o adaptado)
    ├── flagged-entity-badge.tsx         # 🆕 Badge rojo sobre EntityInvention
    ├── flagged-entity-popover.tsx       # 🆕 Popover con detalles + Editar/Mantener
    ├── inline-entity-editor.tsx         # 🆕 Tiptap read-only con nodo editable
    └── action-footer.tsx                # 🆕 Footer con 3 acciones

lib/
├── diff/
│   ├── compute-diff.ts                  # 🆕 jsdiff wrapper (palabra a palabra)
│   ├── flag-entities.ts                 # 🆕 Mapeo de EntityInvention → posición en texto
│   ├── render-diff.ts                   # 🆕 Pure function: DiffResult → React nodes
│   ├── use-diff.ts                      # 🆕 Hook principal
│   └── types.ts                         # 🆕 DiffSegment, FlaggedEntity, etc.
└── copy/
    └── es.ts                            # ⚠️ EXTENDER — añadir bloque `DIFF_COPY`
```

**Decisión de estructura**: agrupar en `components/diff/` y `lib/diff/`. Reusa Zustand store de 006a.

---

## Decisiones de arquitectura (locked)

### 1. Diff library: `diff` (jsdiff)

```typescript
// lib/diff/compute-diff.ts
import { diffWords } from "diff";

export interface DiffSegment {
  readonly type: "added" | "removed" | "unchanged";
  readonly value: string;
}

export function computeWordDiff(original: string, adapted: string): ReadonlyArray<DiffSegment> {
  return diffWords(original, adapted).map((change) => ({
    type: change.added ? "added" : change.removed ? "removed" : "unchanged",
    value: change.value,
  }));
}
```

**Por qué jsdiff sobre alternativas**:

- `react-diff-viewer-continued`: bonita UI pero opinionated; no respeta el tema oscuro cálido del proyecto.
- `diff-match-patch` (Google): orientado a patching, no a display. Más complejo para lo que necesitamos.
- `git-diff` (jsdiff add-on): orientado a código; para texto plano es over-engineering.

**Performance**: word-level diff de 50 KB completa en ~300-500 ms en hardware moderno. Aceptable para NFR-032 (<2 s).

### 2. Render custom (no librería UI)

El render es un componente React que itera sobre los `DiffSegment[]` y emite `<span>` con clases CSS según el tipo:

```tsx
<span className="bg-green-900/30 text-green-200">{segment.value}</span>  // added
<span className="bg-red-900/30 text-red-200 line-through">{segment.value}</span>  // removed
```

**Justificación**: control total de a11y (aria-labels en cada segmento), colores que respetan el tema oscuro cálido, y consistencia con el resto del proyecto (Tailwind v4 sin librería UI externa).

### 3. Badges sobre EntityInvention (FR-066/067)

El backend retorna `EntityInvention[]` con `position: number` (offset en el `adaptedText`). El viewer:

1. Calcula el word-level diff.
2. Mapea cada `EntityInvention.position` a un nodo del árbol del diff (búsqueda binaria sobre los offsets acumulados).
3. Inyecta un `<FlaggedEntityBadge>` justo después del segmento que contiene la posición.

```typescript
// lib/diff/flag-entities.ts
export function mapFlagsToSegments(
  segments: ReadonlyArray<DiffSegment>,
  inventions: ReadonlyArray<EntityInvention>,
): ReadonlyArray<SegmentWithFlags> {
  let offset = 0;
  return segments.map((segment) => {
    const flags = inventions.filter(
      (inv) => inv.position >= offset && inv.position < offset + segment.value.length,
    );
    offset += segment.value.length;
    return { ...segment, flags };
  });
}
```

### 4. Edición inline con Tiptap read-only

Cuando el usuario click "Editar" en un popover, el badge se reemplaza por un `<InlineEntityEditor>` que es un mini-Tiptap con un único nodo editable. El editor:

- Acepta solo texto plano (no rich text).
- Valida con Zod al confirmar.
- Si pasa, emite `onChange(newValue)` que actualiza el `AdaptResult.adaptedText` y elimina la invención del listado de flags.

### 5. Footer (FR-069/070)

```tsx
<div className="action-footer">
  <Button onClick={onAcceptExport}>Aceptar y exportar</Button>
  <Button onClick={onEditInEditor} variant="secondary">Editar en el editor</Button>
  <Button onClick={onReject} variant="danger">Rechazar y re-prompt</Button>
</div>
```

Si hay invenciones `Hard` sin resolver y el usuario click "Aceptar y exportar":
```tsx
<Modal>
  <h2>Tienes {hardCount} invenciones Hard sin revisar</h2>
  <p>¿Aceptar de todos modos o revisarlas primero?</p>
  <Button onClick={forceAccept}>Aceptar de todos modos</Button>
  <Button onClick={onCancel}>Revisarlas primero</Button>
</Modal>
```

### 6. Re-puntuar (FR-071)

Mismo flujo que en 006a: serializar el `adaptedText` (después de ediciones) a Markdown, llamar a `requestScore(md, jobText)`. El `jobText` viene del `Draft` (006a) o del `DiffHandoff`.

---

## Routing

- **`/analizar/diff`**: página principal del diff viewer.
- **`/analizar/diff?traceId=...`**: query param opcional para correlación con logs (NO contiene PII).
- **No sub-rutas**: el viewer es una sola pantalla.

---

## Files a create (resumen)

| Path | Propósito |
|---|---|
| `app/analizar/diff/page.tsx` | Server component |
| `app/analizar/diff/layout.tsx` | Layout con DiffToolbar |
| `components/diff/diff-view.tsx` | Orquestador (unified \| side-by-side) |
| `components/diff/diff-toolbar.tsx` | Toggle modo + Re-puntuar |
| `components/diff/diff-column.tsx` | Una columna del diff |
| `components/diff/flagged-entity-badge.tsx` | Badge rojo sobre EntityInvention |
| `components/diff/flagged-entity-popover.tsx` | Popover con detalles |
| `components/diff/inline-entity-editor.tsx` | Tiptap read-only con nodo editable |
| `components/diff/action-footer.tsx` | Footer con 3 acciones |
| `lib/diff/compute-diff.ts` | jsdiff wrapper |
| `lib/diff/flag-entities.ts` | Mapeo de flags a segmentos |
| `lib/diff/render-diff.ts` | Pure function para render |
| `lib/diff/use-diff.ts` | Hook principal |
| `lib/diff/types.ts` | Tipos del diff |
| `lib/copy/es.ts` (extender) | Bloque `DIFF_COPY` |

## Dependencias a añadir

```bash
# Reusa las deps de 006a + añade:
pnpm add diff@^5
```

Solo `diff` (jsdiff). El resto ya está instalado por 006a.

---

## Test plan (manual E2E checklist)

- [ ] **Happy path — adapt + diff + accept + export**
  1. `pnpm dev`, ir a `/analizar`, pegar CV + vacante.
  2. Click "Adaptar con IA" → spinner → llega `AdaptResult`.
  3. Click "Ver diff" → llega a `/analizar/diff`.
  4. Ve dos columnas (desktop) o una (móvil) con diff palabra-por-palabra.
  5. Las invenciones `Soft`/`Hard` aparecen como badges rojos.
  6. Click "Aceptar y exportar" → navega a `/analizar/exportar` (004) con el CV adaptado.
- [ ] **Editar invención inline**
  1. En el diff, click sobre un badge rojo → popover.
  2. Click "Editar" → el badge se reemplaza por un input.
  3. Cambiar el valor a algo coherente → Enter.
  4. La invención desaparece del listado; el diff se recalcula.
  5. Click "Re-puntuar" → nuevo `ScoreResult`.
- [ ] **Hard invention bloquea Aceptar**
  1. Adaptar un CV que genera una invención `Hard` (empresa inventada).
  2. Ver badge rojo oscuro con icono X.
  3. Click "Aceptar y exportar" → modal: "Tienes 1 invención Hard sin revisar".
  4. Confirmar "Aceptar de todos modos" → continúa.
- [ ] **Toggle de modo (unificado ↔ lado a lado)**
  1. En desktop, click toggle "Unificado" → la vista cambia a una columna.
  2. Click "Lado a lado" → vuelve a dos columnas.
- [ ] **WCAG 2.2 AA**
  1. Navegar con `Tab` por los badges → cada uno es focusable.
  2. `Enter` abre el popover.
  3. Screen reader anuncia cada invención con su severidad.
  4. Contraste: verificaciones con axe-core o Lighthouse.
- [ ] **Adaptación vacía**
  1. Provocar un error del LLM que retorne `adaptedText = ""`.
  2. El viewer muestra panel rojo "La adaptación no produjo texto. Intenta de nuevo."
- [ ] **Adaptación expirada**
  1. Setear un `DiffHandoff` con `at: "2026-01-01T00:00:00Z"`.
  2. El viewer detecta >1 h de antigüedad → muestra "La adaptación expiró".

---

## Risks y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| jsdiff añade ~10 KB | Alta | Bajo | Tree-shaking con named imports. |
| Word-level diff de 50 KB >2 s | Baja | Medio | Skeleton + Web Worker (futuro). |
| `position` del backend no coincide con offsets del frontend | Media | Alto (badges misplaced) | Logs + assertion en dev (`if (process.env.NODE_ENV === 'development')`). |
| Móvil no cabe el diff lado a lado | Alta | Bajo | Default unificado en móvil, toggle sigue disponible. |
| Sesión de adaptaciones >1 h se borra de sessionStorage | Baja | Bajo | Banner "La adaptación expiró" + link a re-adaptar. |

---

## Next Phase

→ `tasks.md` — desglose T-006b-01..N.
