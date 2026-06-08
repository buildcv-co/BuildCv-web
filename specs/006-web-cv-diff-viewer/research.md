# Research: 006-web-cv-diff-viewer — Decisiones técnicas locked

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Data Model:** [./data-model.md](./data-model.md)
> **Fecha de cierre:** 2026-06-08.

---

## 1. Diff library: `diff` (jsdiff) (locked)

### Comparativa

| Librería | Licencia | API | Tamaño | Mantenimiento | Veredicto |
|---|---|---|---|---|---|
| **`diff` (jsdiff) v5** | BSD-3-Clause | Funciones puras (`diffWords`, `diffChars`, etc.) | ~10 KB | Maduro (kpdecker) | ✅ **Elegido** |
| `react-diff-viewer-continued` | MIT | Componente React con UI | ~50 KB + deps | Maduro pero opinionated | ❌ UI cerrada; no respeta nuestro tema |
| `diff-match-patch` (Google) | Apache-2.0 | Patch-based (orientado a aplicar parches) | ~40 KB | Mantenimiento mínimo | ❌ Complejo para solo display |
| `git-diff` (jsdiff add-on) | BSD-3 | Diff estilo git (orientado a código) | Mismo bundle | Maduro | ❌ Overkill para texto plano |
| `jsondiffpatch` | MIT | Para JSON, no texto | n/a | Maduro | ❌ No aplica |

### Por qué `diff` (jsdiff)

1. **API simple**: `diffWords(original, adapted)` retorna un array de `{ value, added?, removed? }`.
2. **Myers algorithm**: word-level diff eficiente, ~O(ND) en la mayoría de casos.
3. **Sin React acoplado**: devuelve datos puros, nosotros decidimos cómo renderizar.
4. **BSD-3-Clause**: igual que el resto del stack, sin riesgo legal.
5. **Bundle pequeño**: ~10 KB minificado+gzipped.

### Por qué NO `react-diff-viewer-continued`

- La UI no respeta nuestro tema oscuro cálido.
- El highlight de invenciones requeriría override de componentes internos.
- ~50 KB de bundle para una feature que podemos hacer en 200 líneas custom.

### Por qué NO `diff-match-patch`

- Está orientado a "patch" (generar un conjunto de cambios aplicables), no a "display".
- Su API es más verbosa para lo que necesitamos.
- Google lo mantiene en modo "best effort" desde 2018.

### Por qué NO hand-rolled diff

- Implementar Myers o LCS a mano es 2-3 días de código + tests.
- jsdiff ya lo tiene, probado en millones de proyectos.

---

## 2. Render: custom React + Tiptap read-only (locked)

### Comparativa

| Opción | Control | Bundle | A11y | Veredicto |
|---|---|---|---|---|
| **Custom React** | Total | 0 (built-in) | Implementamos WCAG desde el inicio | ✅ **Elegido** |
| `react-diff-viewer-continued` | Bajo | ~50 KB | Theme-dependiente | ❌ |
| `react-diff-component` | Medio | ~30 KB | Razonable | ❌ Mantenimiento irregular |

### Por qué custom

1. **Control total de a11y**: cada `<span>` con `aria-label` describiendo el cambio.
2. **Consistencia visual**: mismo tema oscuro cálido que el resto de la app.
3. **Highlight de invenciones**: el render necesita inyectar `<FlaggedEntityBadge>` en posiciones específicas del árbol del diff.
4. **Bundle**: 0 KB de dependencia extra (reusa React + Tailwind ya instalados).

### Implementación

```tsx
// lib/diff/render-diff.tsx
export function renderDiffSegment(
  segment: DiffSegmentWithFlags,
  index: number,
): React.ReactNode {
  const baseClass = {
    added: "bg-green-900/30 text-green-200",
    removed: "bg-red-900/30 text-red-200 line-through",
    unchanged: "text-neutral-200",
  }[segment.type];

  return (
    <span key={index} className={baseClass} aria-label={ariaLabelFor(segment)}>
      {segment.value}
      {segment.flags.map((flag) => (
        <FlaggedEntityBadge key={flag.type + flag.position} flag={flag} />
      ))}
    </span>
  );
}

function ariaLabelFor(segment: DiffSegmentWithFlags): string {
  if (segment.type === "added") return `Añadido: ${segment.value}`;
  if (segment.type === "removed") return `Eliminado: ${segment.value}`;
  return segment.value;
}
```

---

## 3. Edición inline: Tiptap read-only con nodo editable (locked)

### Por qué Tiptap read-only

- Consistencia con el editor (006a). El usuario ya conoce la UI.
- El `InlineEntityEditor` puede reusar `useEditor` con `editable: false` y habilitar `editable: true` solo en el nodo que contiene la invención.
- Validación Zod se aplica al confirmar (Enter o blur).

### Por qué NO un `<input>` plano

- El usuario podría querer pegar texto con formato (links, fechas). Tiptap lo maneja.
- El `<input>` plano se ve inconsistente con el resto del editor.
- La validación con Zod es la misma.

### Implementación

```tsx
// components/diff/inline-entity-editor.tsx
export function InlineEntityEditor({
  value,
  entityKind,
  onConfirm,
  onCancel,
}: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder],
    content: value,
    editable: true,
    onUpdate: ({ editor }) => {
      // autosave on blur
    },
  });

  return (
    <div role="textbox" aria-label={`Editar ${entityKind}`}>
      <EditorContent editor={editor} />
      <Button onClick={() => {
        const newValue = editor?.getText() ?? "";
        const result = EntityValueSchema.safeParse(newValue);
        if (result.success) onConfirm(result.data);
        else onCancel();
      }}>Confirmar</Button>
    </div>
  );
}
```

---

## 4. Modo default: responsive (locked)

### Decisión

- **Mobile (<768 px)**: unificado por defecto.
- **Desktop (≥768 px)**: lado a lado por defecto.
- El usuario puede override con el toggle.

### Por qué

- En móvil, dos columnas requerirían scroll horizontal o texto microscópico.
- En desktop, lado a lado es la vista "natural" para diff.
- El toggle respeta la preferencia del usuario en `localStorage` (key: `buildcv:diff:mode`).

### Justificación del breakpoint

768 px es el breakpoint de Tailwind `md:`. Coincide con tablets en landscape y desktop en portrait. Es el estándar de la industria.

---

## 5. Mapeo de `EntityInvention.position` a segmentos del diff (locked)

### El problema

El backend retorna `EntityInvention.position: number` (offset en caracteres del `adaptedText`). Pero el diff produce segmentos con valores (palabras/frases). Necesitamos mapear la posición del backend al segmento correcto.

### Solución

```typescript
// lib/diff/flag-entities.ts
export interface SegmentWithFlags extends DiffSegment {
  readonly startOffset: number;       // offset absoluto en el texto adaptado
  readonly endOffset: number;
  readonly flags: ReadonlyArray<EntityInvention>;
}

export function mapFlagsToSegments(
  segments: ReadonlyArray<DiffSegment>,
  inventions: ReadonlyArray<EntityInvention>,
): ReadonlyArray<SegmentWithFlags> {
  let offset = 0;
  return segments
    .filter((s) => s.type !== "removed")  // Solo segmentos en el texto adaptado
    .map((segment) => {
      const startOffset = offset;
      const endOffset = offset + segment.value.length;
      offset = endOffset;
      const flags = inventions.filter(
        (inv) => inv.position >= startOffset && inv.position < endOffset,
      );
      return { ...segment, startOffset, endOffset, flags };
    });
}
```

### Edge cases

- **Invención en segmento "removed"**: se filtra (no aparece en el texto adaptado). El badge se muestra en el panel lateral "Todas las invenciones".
- **Invención en el límite entre dos segmentos**: se asigna al segmento donde `position < endOffset` (estricto).
- **`position` del backend incorrecto** (off-by-one): en dev mode, log warning con la posición esperada vs. la real.

---

## 6. Re-puntuar después de ediciones (locked)

### Decisión

El botón "Re-puntuar" del toolbar llama a `requestScore(adaptedText, jobText)` con el `adaptedText` ACTUALIZADO (con las ediciones del usuario). El `ScoreResult` se muestra en un `ScoreBadge` (re-uso del componente de 006a).

### Por qué re-puntuar

- Una edición puede cambiar el score significativamente (ej. cambiar "40%" a "35%" puede afectar el match de keywords).
- El usuario quiere ver el impacto de sus correcciones antes de aceptar.

### Rate-limit

El backend 002 aplica 60/h por IP. Si el usuario llega al límite, el botón "Re-puntuar" se deshabilita con un tooltip "Has alcanzado el tope de puntajes (60/hora)".

---

## 7. Bloqueo de "Aceptar" con Hard pendientes (locked) [REGLA DURA Art. I]

### Decisión

- **Hard sin resolver + "Aceptar y exportar"** → modal de confirmación obligatorio.
- **Soft sin resolver + "Aceptar y exportar"** → warning no bloqueante (toast amarillo "Tienes N invenciones Soft sin revisar. ¿Continuar?").

### Por qué esta distinción

- **Hard** (empresa inventada, fecha fabricada): el usuario DEBE revisar o aceptar explícitamente. No se puede hacer "Aceptar todo" ciego.
- **Soft** (métrica redondeada, skill relacionada): el usuario probablemente está bien, pero le avisamos.

### Implementación

```typescript
function canDirectAccept(inventions: EntityInvention[]): {
  allowed: boolean;
  hardCount: number;
  softCount: number;
} {
  const hardCount = inventions.filter((i) => i.severity === "Hard").length;
  const softCount = inventions.filter((i) => i.severity === "Soft").length;
  return { allowed: hardCount === 0, hardCount, softCount };
}
```

---

## 8. Resumen de decisiones locked

| Decisión | Locked | Alternativa rechazada |
|---|---|---|
| Diff library | `diff` (jsdiff) v5 | react-diff-viewer-continued, diff-match-patch, hand-rolled |
| Render | Custom React | react-diff-viewer-continued, react-diff-component |
| Edición inline | Tiptap v2 read-only con nodo editable | `<input>` plano |
| Modo default | Responsive (unified móvil, side-by-side desktop) | Forzar lado a lado siempre |
| Mapeo position→segment | Filtro "removed" + offset acumulativo | Diff character-level (overkill) |
| Re-puntuar | `requestScore(adaptedText, jobText)` | Nuevo endpoint backend |
| Bloqueo Hard | Modal obligatorio | Bloqueo total (UX peor) |
| Soft warning | Toast no bloqueante | Bloqueo total (UX peor) |
| Persistencia del modo | `localStorage["buildcv:diff:mode"]` | Sin persistencia (UX peor) |
| Tests automatizados | NO en v0.5 (Vitest M3+) | Vitest desde ya (fricción) |

---

## 9. Constitution re-check (post-investigación)

| Art. | Verificación | Estado |
|---|---|---|
| **Art. I** | FR-066 (badges rojos), FR-067 (popover con detalles), FR-070 (modal obligatorio para Hard). | ✅ PASS |
| **Art. III** | Handoff via sessionStorage. Sin persistencia adicional. | ✅ PASS |
| **Art. IV** | Copy: "Revisa la adaptación", NUNCA "confirma el cambio". | ✅ PASS |
| **Art. V** | Sin modificaciones automáticas; cada cambio es del usuario. | ✅ PASS |
| **Art. VI** | Reusa BFF existentes. Sin nuevo endpoint. | ✅ PASS |

---

## Next Phase

→ `data-model.md` — tipos TypeScript del diff.
→ `contracts/frontend-internal.md` — contratos con 003 y 004.
→ `quickstart.md` y `tasks.md`.
