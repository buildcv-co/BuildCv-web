# Quickstart: 006-web-cv-diff-viewer

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Tasks:** [./tasks.md](./tasks.md)
> **Tiempo estimado:** 10 minutos para tener el diff viewer corriendo.
>
> **Stack shipped (ver `tasks.md` líneas 8–14):** `diff` (jsdiff) v5 + renderer custom en React + `<input>` HTML nativo para edición inline + Zod para validación. Sin Tiptap, sin `react-diff-viewer-continued`, sin Zustand. Vitest 2 + RTL 16 + jsdom ya configurados (sprint 0, commit 21fb83b).

---

## Prerrequisitos

- **Node 22+** y **pnpm 11+**.
- **Backend .NET 10** corriendo en `http://localhost:5080`.
- **Browser moderno**.
- Haber completado el quickstart de [`../006-web-cv-editor/`](../006-web-cv-editor/quickstart.md) (Zod v3 instalado; Vitest 2 + RTL 16 + jsdom configurados).

---

## Paso 1 — Verificar la dependencia nueva (30 s)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web
grep -E '"diff"' package.json
# Esperado: "diff": "^5.2.2"
```

Si falta, instalar:

```bash
pnpm add diff@^5
```

(El resto de dependencias — Zod, Vitest, RTL, jsdom — ya están instaladas por 006a).

---

## Paso 2 — Verificar backend (1 min)

```bash
# En otra terminal, si no está corriendo:
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-api
dotnet run --project src/BuildCv.Api
```

Verifica que el healthcheck esté verde:

```bash
curl http://localhost:5080/health/ready
# Esperado: "Healthy"
```

---

## Paso 3 — Arrancar dev server (30 s)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web
pnpm dev
# Escucha en http://localhost:3000
```

---

## Paso 4 — Probar el diff viewer en el navegador (5 min)

### 4.1 — Flujo end-to-end (adapt + diff + accept)

1. Abre <http://localhost:3000/analizar> en el navegador.
2. Pega un CV de ejemplo (mínimo 200 caracteres) y una vacante (mínimo 100 caracteres).
3. Click "Analizar" → ves el score pre-adaptación.
4. Click "Adaptar con IA" → spinner 5-10 s → llega el `AdaptResult`.
5. Navega a `/analizar/diff` (o usa el botón "Ver diff" si está integrado en 003).
6. Llegas a `/analizar/diff` con dos columnas (desktop) o una (móvil).

### 4.2 — Ver el diff (US-1)

1. Observa las diferencias: **verde** = añadido, **rojo** = eliminado, **neutro** = igual.
2. Toggle "Unificado / Lado a lado" en el toolbar superior.
3. Resize la ventana a <768 px → el modo cambia automáticamente a unificado (vía `matchMedia` listener).
4. Resize de vuelta a ≥768 px → vuelve a lado a lado.

### 4.3 — Ver invenciones (US-2)

1. Observa los **badges rojos** sobre las invenciones detectadas:
   - **Rojo claro** = `Soft` (métrica redondeada, skill relacionada).
   - **Rojo oscuro con icono X** = `Hard` (empresa inventada, fecha fabricada).
2. Click sobre un badge → popover con detalles:
   - Tipo (Skill, Company, Metric, etc.)
   - Claimed (lo que dice el adaptado)
   - Original (lo que decía el CV original, si hay match)
   - Posición (offset en caracteres)
3. Dos acciones: **Editar** y **Mantener**.

### 4.4 — Editar invención inline (US-3)

1. En el popover, click "Editar".
2. El badge se reemplaza por un `<input>` HTML nativo con el valor actual.
3. Cambia el valor a algo coherente (ej. "35%" en lugar de "40%").
4. Presiona **Enter** o click fuera (blur) → la invención desaparece del listado.
5. El diff se recalcula automáticamente.
6. Click "Re-puntuar" en el toolbar → nuevo `ScoreResponse` con `lastScore`.

### 4.5 — Aceptar / rechazar (US-4)

1. Footer con 3 botones: **"Aceptar y exportar"**, **"Editar en el editor"**, **"Rechazar y re-prompt"**.
2. **Si hay Hard pendientes**:
   - Click "Aceptar y exportar" → modal: "Tienes X invenciones Hard sin revisar. ¿Aceptar de todos modos o revisarlas primero?".
   - "Aceptar de todos modos" → continúa a `/analizar/exportar` (004).
3. **Si no hay Hard**:
   - Click "Aceptar y exportar" → navega directamente a `/analizar/exportar` con el CV adaptado.
4. Click "Editar en el editor" → navega a `/analizar/editar` con el CV adaptado pre-poblado.
5. Click "Rechazar y re-prompt" → toast "Adaptación rechazada" → vuelve a `/analizar` (con delay 300ms).

---

## Paso 5 — Correr los tests automatizados (1 min)

El shipped code tiene **5 test files** (Vitest 2 + RTL 16 + jsdom). Para correrlos:

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web
pnpm test
```

**Esperado**: 710 tests passing, 0 failing. Los tests del diff viewer están en:

- `lib/diff/types.test.ts` — shape de los tipos.
- `lib/diff/compute-diff.test.ts` — `computeDiff` con jsdiff; casos: idénticos, added, removed, modified, empty, caracteres especiales, performance 50 KB.
- `lib/diff/flag-entities.test.ts` — `flagEntitiesInDiff` con mapeo de posiciones, `dedupeByHighestSeverity`, `orphanedFlags`.
- `components/diff/action-footer.test.tsx` — renderiza 3 botones; abre modal Hard si hay Hard pendientes.
- `components/diff/diff-page.test.tsx` — render de loading/expired/no-handoff/error/empty/ready; edición inline; re-puntuar; aceptar y exportar.
- `components/diff/diff-toolbar.test.tsx` — toggle modo; deshabilita re-puntuar si `!hasJobText`.
- `components/diff/diff-view.test.tsx` — render unified/side-by-side; badges con `aria-label`.
- `components/diff/flagged-entity-badge.test.tsx` — badge con popover; severidad Hard vs Soft.

Para correr solo los del diff viewer (más rápido):

```bash
pnpm test -- lib/diff/ components/diff/
```

Para watch mode (TDD activo, Constitution Art. VIII):

```bash
pnpm test:watch
```

---

## Paso 6 — Verificar a11y WCAG 2.2 AA (2 min)

1. **Keyboard nav**:
   - `Tab` desde el URL bar → lleva al toggle de modo.
   - `Tab` por el diff → cada badge es focusable.
   - `Enter` en un badge → abre el popover.
   - `Esc` en el popover → cierra.
   - `Tab` al footer → los 3 botones son focusables.
2. **Focus visible**: outline ≥2 px, contraste ≥3:1.
3. **Screen reader**:
   - Anuncia cada badge: "Advertencia: invención detectada. Severidad Hard. Término: FakeCorp. Posición: 142."
   - Anuncia cada cambio: "Añadido: 40%" o "Eliminado: 35%".
4. **Contraste de color** (Lighthouse audit):
   - Score a11y ≥95.

---

## Paso 7 — Probar edge cases (2 min)

### 7.1 — Sin invenciones

1. Provoca una adaptación que NO genere invenciones (CV muy completo).
2. El diff viewer renderiza sin badges y el footer funciona normal.

### 7.2 — Adaptación vacía

1. Provoca un error del LLM (temporalmente cambia el modelo a uno que retorne vacío).
2. El viewer muestra un panel rojo: "La adaptación no produjo texto. Intenta de nuevo." + botón "Volver a analizar".

### 7.3 — Handoff expirado (>1 h)

1. Abre DevTools → Console.
2. Pega:
   ```javascript
   const raw = sessionStorage.getItem("buildcv:diff-handoff");
   const h = JSON.parse(raw);
   h.timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
   sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(h));
   location.href = "/analizar/diff";
   ```
3. El viewer detecta >1 h de antigüedad → muestra "La adaptación expiró. Vuelve a solicitarla." + botón "Volver a `/analizar`".

### 7.4 — Invenciones huérfanas (posición inválida)

1. Si el backend retorna una `EntityInvention` con `position` fuera del rango del `adaptedText`, el viewer la muestra en un aviso amarillo:
   > "Hay N invención(es) que el backend marcó en una posición que el visor no pudo mapear. Revísalas en el editor antes de aceptar."

---

## Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| Página `/analizar/diff` muestra "Adaptación no encontrada" | No hay `DiffHandoff` en sessionStorage | Completar el flujo de adapt primero (Paso 4.1) |
| Badges rojos no aparecen sobre el texto | `position` del backend incorrecto | Verificar en `orphanedFlags`; se muestra un aviso si hay |
| Toggle de modo no persiste entre sesiones | **Decisión v0.5**: el modo NO persiste | Re-abrir la página lo re-inicializa con `matchMedia`; v1 con `localStorage` |
| Diff tarda >3 s en renderizar | CV >50 KB | Normal; el render es síncrono. Si no, reportar bug. |
| Aceptar y exportar no bloquea con Hard | Bug en `ActionFooter.onAcceptClick` | Verificar `hardCount > 0` antes de `setModalOpen(true)` |
| Tests fallan con "Cannot find module 'diff'" | Lockfile desactualizado | `pnpm install --frozen-lockfile` |

---

## Comandos útiles

```bash
# Lint
pnpm lint

# Type-check
pnpm typecheck

# Build de producción
pnpm build

# Tests (Vitest, una sola corrida)
pnpm test

# Tests en watch mode (TDD)
pnpm test:watch

# Tests con coverage
pnpm test:cov

# E2E (Playwright, solo cuando se cree el spec)
pnpm test:e2e

# Limpiar handoff desde la consola del navegador
sessionStorage.removeItem("buildcv:diff-handoff");
location.reload();
```

---

## Siguiente paso

Lee [`tasks.md`](./tasks.md) para ver el desglose de tareas (preserva el bloque "DECISIÓN ARQUITECTÓNICA" en líneas 8–14). El shipped code corresponde a las fases Setup → Foundational → US-1..4 → Polish.

Para la sub-feature hermana (editor), ve a [`../006-web-cv-editor/quickstart.md`](../006-web-cv-editor/quickstart.md).
