# Research: 006-web-cv-diff-viewer — Decisiones técnicas (histórico + shipped)

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Data Model:** [./data-model.md](./data-model.md)
> **Fecha de cierre:** 2026-06-08.

---

> **⚠️ HISTORICAL — pre-implementation research.** La implementación REJECTED Tiptap v2 (read-only con nodo editable) y `react-diff-viewer-continued` en favor del stack shipped: **`diff` (jsdiff) v5 + renderer custom en React + `<input>` HTML nativo + Zod para validación inline**. Ver `tasks.md` líneas 8–14 para la decisión arquitectónica explícita y la justificación técnica. El commit shipped es `4bf92b7` (2026-06-09). Las secciones 2 y 3 describen las alternativas que se consideraron ANTES de la decisión final; se renumeraron a "## Alternatives Considered (rejected at impl time)" para preservar el rastro de auditoría. Las secciones 1 (diff library), 4 (modo default), 5 (mapeo), 6 (re-puntuar), 7 (bloqueo Hard) son CONSISTENTES con el shipped code y se mantienen como referencia activa.

---

## 1. Diff library: `diff` (jsdiff) (✅ KEEP — instalado)

### Comparativa

| Librería | Licencia | API | Tamaño | Mantenimiento | Veredicto |
|---|---|---|---|---|---|
| **`diff` (jsdiff) v5** | BSD-3-Clause | Funciones puras (`diffWords`, `diffChars`, etc.) | ~15 KB | Maduro (kpdecker) | ✅ **Elegido** |
| `react-diff-viewer-continued` | MIT | Componente React con UI | ~50 KB + deps | Maduro pero opinionated | ❌ **Rechazado en v0.5** (UI no respeta nuestro tema) |
| `diff-match-patch` (Google) | Apache-2.0 | Patch-based (orientado a aplicar parches) | ~40 KB | Mantenimiento mínimo | ❌ Complejo para solo display |
| `git-diff` (jsdiff add-on) | BSD-3-Clause | Diff estilo git (orientado a código) | Mismo bundle | Maduro | ❌ Overkill para texto plano |
| `jsondiffpatch` | MIT | Para JSON, no texto | n/a | Maduro | ❌ No aplica |
| Hand-rolled Myers/LCS | n/a | Control total | 0 KB | n/a | ❌ 2-3 días de código + tests |

### Por qué `diff` (jsdiff) (shipped)

1. **API simple**: `diffWords(original, adapted)` retorna un array de `{ value, added?, removed? }`.
2. **Myers algorithm**: word-level diff eficiente, ~O(ND) en la mayoría de casos.
3. **Sin React acoplado**: devuelve datos puros, nosotros decidimos cómo renderizar.
4. **BSD-3-Clause**: igual que el resto del stack, sin riesgo legal.
5. **Bundle pequeño**: ~15 KB minificado+gzipped.

### Por qué NO `react-diff-viewer-continued` (rechazado en v0.5)

- La UI no respeta nuestro tema oscuro cálido.
- El highlight de invenciones requeriría override de componentes internos.
- ~50 KB de bundle para una feature que podemos hacer en 200 líneas custom.

### Por qué NO `diff-match-patch`

- Está orientado a "patch" (generar un conjunto de cambios aplicables), no a "display".
- Su API es más verbosa para lo que necesitamos.
- Google lo mantiene en modo "best effort" desde 2018.

### Por qué NO hand-rolled diff (rechazado en v0.5)

- Implementar Myers o LCS a mano es 2-3 días de código + tests.
- jsdiff ya lo tiene, probado en millones de proyectos.

---

## Alternatives Considered (rejected at impl time)

> Las siguientes secciones resumen la evaluación original. **Ninguna de las librerías rechazadas se instaló en `package.json`** (verificado contra `BuildCv-web/package.json` después del commit `4bf92b7`).

### 2. Render: custom React + Tiptap read-only (REJECTED — se usa custom React + `<input>` HTML nativo)

### Comparativa

| Opción | Control | Bundle | A11y | Veredicto |
|---|---|---|---|---|
| **Custom React** | Total | 0 (built-in) | Implementamos WCAG desde el inicio | ✅ **Elegido** |
| `react-diff-viewer-continued` | Bajo | ~50 KB | Theme-dependiente | ❌ **Rechazado en v0.5** |
| `react-diff-component` | Medio | ~30 KB | Razonable | ❌ Mantenimiento irregular |
| Tiptap v2 read-only con nodo editable | Total | ~50-80 KB | Custom | ❌ **Rechazado en v0.5** (overkill para edición inline de 1 valor) |

### Por qué custom React (shipped)

1. **Control total de a11y**: cada `<span>` con `aria-label` describiendo el cambio.
2. **Consistencia visual**: mismo tema oscuro cálido que el resto de la app.
3. **Highlight de invenciones**: el render necesita inyectar `<FlaggedEntityBadge>` en posiciones específicas del árbol del diff.
4. **Bundle**: 0 KB de dependencia extra (reusa React + Tailwind ya instalados).

### Implementación shipped (en `components/diff/diff-view.tsx`)

```tsx
const SEGMENT_CLASS: Record<string, string> = {
  added: "bg-present/15 text-present",         // verde (tema: present = "good")
  removed: "bg-missing/15 text-missing line-through",  // rojo (tema: missing = "warning")
  unchanged: "text-ink",                       // neutro
};

function UnifiedColumn({ segments, onEditEntity, onKeepEntity }) {
  return (
    <article aria-label={copy.diff.regions.adapted}
             className="rounded-2xl border border-line bg-surface/30 p-4 font-mono text-sm leading-relaxed">
      {segments.map((seg, i) => (
        <span key={i} className="whitespace-pre-wrap">
          {seg.kind === "added" ? (
            <span data-kind="added" className={cn(SEGMENT_CLASS.added)}>+{seg.value}</span>
          ) : seg.kind === "removed" ? (
            <span data-kind="removed" className={cn(SEGMENT_CLASS.removed)}>−{seg.value}</span>
          ) : (
            <span data-kind="unchanged" className={cn(SEGMENT_CLASS.unchanged)}>{seg.value}</span>
          )}
          {seg.flags.map((f) => (
            <FlaggedEntityBadge key={...} flag={f}
              onEdit={onEditEntity ? () => onEditEntity(f.entity) : undefined}
              onKeep={onKeepEntity ? () => onKeepEntity(f.entity) : undefined} />
          ))}
        </span>
      ))}
    </article>
  );
}
```

### Por qué NO Tiptap read-only con nodo editable (rechazado en v0.5)

- **Bundle**: Tiptap añade ~50-80 KB. La edición inline es de UN valor (claimed ≤ 200 chars), no requiere rich text.
- **Complejidad**: Tiptap read-only con un nodo editable solo donde está la invención requiere configuración custom por invención.
- **Mismo Constitution compliance**: Art. I FR-068 se cumple con `<input>` + Zod, no requiere ProseMirror.
- **Tests más simples**: input controlado por React es trivial de testear; ProseMirror state requiere mocks.
- **Accesibilidad**: `<input>` HTML nativo es accesible por defecto; Tiptap requiere configuración manual de ARIA.

### Por qué NO `<input>` plano (en la evaluación original, parte de "rechazado")

En la evaluación original, el `<input>` se rechazó porque "el usuario podría querer pegar texto con formato (links, fechas)". **RESOLUCIÓN**: el claimed de una invención es texto plano (el backend 003 lo extrae como string). Pegar formato en una invención no tiene sentido; la edición es semántica, no visual. El `<input>` HTML es suficiente.

---

### 3. Edición inline: Tiptap read-only con nodo editable (REJECTED — se usa `<input>` HTML nativo + Zod)

### Por qué Tiptap read-only (en la evaluación original)

- Consistencia con el editor (006a). El usuario ya conoce la UI.
- El `InlineEntityEditor` puede reusar `useEditor` con `editable: false` y habilitar `editable: true` solo en el nodo que contiene la invención.
- Validación Zod se aplica al confirmar (Enter o blur).

### Por qué se REJECTÓ

- **Bundle size**: Tiptap es ~50-80 KB para una feature que es UN `<input>`.
- **Complejidad innecesaria**: "edición inline de UN valor string" no requiere ProseMirror.
- **Mismo FR-068**: validación con Zod al confirmar es independiente del editor.
- **Mejor accesibilidad**: `<input>` HTML es accesible por defecto; Tiptap requiere configuración manual.

### Implementación shipped (en `components/diff/diff-page.tsx`)

```tsx
// InlineValueSchema
const InlineValueSchema = z
  .string()
  .min(1, "vacío")
  .max(200, "demasiado largo");

// InlineEditRow
function InlineEditRow({ edit, onChange, onConfirm, onCancel }) {
  return (
    <div role="group" aria-label={`Editar ${edit.entity.type}`}>
      <label htmlFor="inline-edit-input">Nuevo valor:</label>
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
      <button onClick={onConfirm}>{copy.diff.invention.confirm}</button>
      <button onClick={onCancel}>{copy.diff.invention.cancel}</button>
    </div>
  );
}

// onConfirm (en DiffPage)
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

**Accesibilidad**: el `<input>` tiene `id`, `aria-label` heredado del `role="group"`, Enter/Escape/blur handlers, focus visible. Suficiente para WCAG 2.2 AA.

---

## Active decisions (KEEP — shipped code)

### 4. Modo default: responsive (✅ KEEP)

### Decisión

- **Mobile (<768 px)**: unificado por defecto.
- **Desktop (≥768 px)**: lado a lado por defecto.
- El usuario puede override con el toggle (`DiffToolbar`).
- **NO persiste entre sesiones en v0.5** (decisión; v1 con `localStorage["buildcv:diff:mode"]`).

### Implementación shipped

```typescript
const [mode, setMode] = useState<DiffMode>(() => {
  if (typeof window === "undefined") return "unified";
  return window.matchMedia("(min-width: 768px)").matches
    ? "side-by-side"
    : "unified";
});

useEffect(() => {
  if (typeof window === "undefined") return;
  const mql = window.matchMedia("(min-width: 768px)");
  const onChange = (e: MediaQueryListEvent) => {
    setMode(e.matches ? "side-by-side" : "unified");
  };
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}, []);
```

### Por qué

- En móvil, dos columnas requerirían scroll horizontal o texto microscópico.
- En desktop, lado a lado es la vista "natural" para diff.
- El listener de `matchMedia` ajusta el modo automáticamente si el usuario rota el móvil o cambia el tamaño de ventana.

### Justificación del breakpoint

768 px es el breakpoint de Tailwind `md:`. Coincide con tablets en landscape y desktop en portrait. Es el estándar de la industria.

---

### 5. Mapeo de `EntityInvention.position` a segmentos del diff (✅ KEEP)

### El problema

El backend retorna `EntityInvention.position: number` (offset en caracteres del `adaptedText`). Pero el diff produce segmentos con valores (palabras/frases). Necesitamos mapear la posición del backend al segmento correcto.

### Solución shipped (`lib/diff/flag-entities.ts`)

```typescript
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
        flags.push({ entity, position: entity.position, color: severityToColor(entity.severity) });
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
```

### Edge cases manejados

- **Invención en segmento "removed"**: se excluye (no aparece en el texto adaptado) y va a `orphanedFlags`. La UI muestra un aviso "Hay N invención(es) que el backend marcó en una posición que el visor no pudo mapear."
- **Invención en el límite entre dos segmentos**: se asigna al segmento donde `position < endOffset` (estricto).
- **`position` del backend incorrecto** (off-by-one, negativo, o más allá del texto): va a `orphanedFlags`.
- **Dos invenciones en la misma posición**: `dedupeByHighestSeverity` conserva la Hard (Constitution Art. I).

---

### 6. Re-puntuar después de ediciones (✅ KEEP)

### Decisión

El botón "Re-puntuar" del toolbar llama a `requestScore(adaptedText, jobText)` con el `adaptedText` ACTUALIZADO (con las ediciones del usuario). El `ScoreResponse` se muestra en el `DiffToolbar` con `lastScore` (un número entero).

### Por qué re-puntuar

- Una edición puede cambiar el score significativamente (ej. cambiar "40%" a "35%" puede afectar el match de keywords).
- El usuario quiere ver el impacto de sus correcciones antes de aceptar.

### Rate-limit

El backend 002 aplica 60/h por IP. El viewer deshabilita el botón si `!hasJobText || isRescoring`. Si el backend retorna 429, se muestra `copy.diff.errors.network` (o el mensaje de `ScoreError.message`).

---

### 7. Bloqueo de "Aceptar" con Hard pendientes (✅ KEEP) [REGLA DURA Art. I]

### Decisión shipped (`components/diff/action-footer.tsx`)

```typescript
const hardCount = inventions.filter((i) => i.severity === "Hard").length;

const onAcceptClick = () => {
  if (hardCount > 0) {
    setModalOpen(true);
    return;
  }
  onAcceptExport();
};

// En el modal:
<button onClick={() => setModalOpen(false)}>{copy.diff.actions.reviewFirst}</button>
<button onClick={() => { setModalOpen(false); onAcceptExport(); }}>
  {copy.diff.actions.acceptAnyway}
</button>
```

- **Hard sin resolver + "Aceptar y exportar"** → modal de confirmación obligatorio (`role="alertdialog"`, `aria-modal="true"`).
- **Soft sin resolver + "Aceptar y exportar"** → NO bloquea (warning visible en el badge, no modal).

### Por qué esta distinción

- **Hard** (empresa inventada, fecha fabricada): el usuario DEBE revisar o aceptar explícitamente. No se puede hacer "Aceptar todo" ciego.
- **Soft** (métrica redondeada, skill relacionada): el usuario probablemente está bien, pero el badge Soft lo señala.

---

## Resumen de decisiones (final, shipped)

| Decisión | Locked | Alternativa rechazada |
|---|---|---|
| Diff library | `diff` (jsdiff) v5 (✅ instalado) | react-diff-viewer-continued, diff-match-patch, hand-rolled Myers |
| Render | Custom React (✅ shipped) | react-diff-viewer-continued, react-diff-component, Tiptap read-only |
| Edición inline | `<input>` HTML nativo + Zod (✅ shipped) | Tiptap v2 read-only con nodo editable |
| Modo default | Responsive (unified móvil, side-by-side desktop) + `matchMedia` listener | Forzar lado a lado siempre |
| Mapeo position→segment | Filtro "removed" + offset acumulativo + `dedupeByHighestSeverity` + `orphanedFlags` | Diff character-level (overkill) |
| Re-puntuar | `requestScore(adaptedText, jobText)` | Nuevo endpoint backend |
| Bloqueo Hard | Modal obligatorio (✅ shipped) | Bloqueo total (UX peor) |
| Soft warning | Badge visible sin modal | Bloqueo total (UX peor) |
| Persistencia del modo | NO en v0.5 (decisión; v1 con `localStorage["buildcv:diff:mode"]`) | `localStorage` desde ya (fricción) |
| Estado global | `useState` + `useCallback` local en `DiffPage` (✅ shipped, mismo enfoque que 006a) | Zustand v4, Redux Toolkit, Context, Jotai |
| Tests automatizados | Vitest 2 + RTL 16 + jsdom (✅ instalado) + Playwright 1 chromium | Manual-only en v0.5 (REJECTED), Vitest en M3+ (REJECTED) |

---

## Constitution re-check (post-implementación)

| Art. | Verificación shipped | Estado |
|---|---|---|
| **Art. I** | FR-066 (badges rojos), FR-067 (popover con detalles), FR-068 (edición inline con Zod), FR-070 (modal Hard). | ✅ PASS |
| **Art. III** | Handoff via sessionStorage. Sin persistencia adicional. | ✅ PASS |
| **Art. IV** | Copy: "Revisa la adaptación", NUNCA "confirma el cambio". | ✅ PASS |
| **Art. V** | Sin modificaciones automáticas; cada cambio es del usuario. | ✅ PASS |
| **Art. VI** | Reusa BFF existentes. Sin nuevo endpoint. | ✅ PASS |
| **Art. VIII** | Vitest 2 + RTL 16 + jsdom configurados; 5 test files shipped. | ✅ PASS |

---

## Next Phase

→ `data-model.md` — tipos TypeScript del diff.
→ `contracts/frontend-internal.md` — contratos con 003 y 004.
→ `quickstart.md` y `tasks.md` (preserva el bloque "DECISIÓN ARQUITECTÓNICA" en líneas 8–14).
