# Quickstart: 006-web-cv-diff-viewer

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Tasks:** [./tasks.md](./tasks.md)
> **Tiempo estimado:** 10 minutos para tener el diff viewer corriendo.

---

## Prerrequisitos

- **Node 22+** y **pnpm 11+**.
- **Backend .NET 10** corriendo en `http://localhost:5080`.
- **Browser moderno**.
- Haber completado el quickstart de [`../006-web-cv-editor/`](../006-web-cv-editor/quickstart.md) (Tiptap, Zod, Zustand instalados).

---

## Paso 1 — Instalar la dependencia nueva (30 s)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web
pnpm add diff@^5
```

(El resto de dependencias — Tiptap, Zod, Zustand — ya están instaladas por 006a).

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

## Paso 4 — Probar el diff viewer (5 min)

### 4.1 — Flujo end-to-end (adapt + diff + accept)

1. Abre <http://localhost:3000/analizar> en el navegador.
2. Pega un CV de ejemplo (mínimo 200 caracteres) y una vacante (mínimo 100 caracteres).
3. Click "Analizar" → ves el score pre-adaptación.
4. Click "Adaptar con IA" → spinner 5-10 s → llega el `AdaptResult`.
5. En el panel de resultado, click "Ver diff" (botón nuevo, parte de 003-web-adapt-ui si está integrado; o navega manualmente a `/analizar/diff`).
6. Llegas a `/analizar/diff` con dos columnas (desktop) o una (móvil).

### 4.2 — Ver el diff (US-1)

1. Observa las diferencias: **verde** = añadido, **rojo** = eliminado, **neutro** = igual.
2. Toggle "Unificado / Lado a lado" en el toolbar superior.
3. Resize la ventana a <768 px → el modo cambia automáticamente a unificado.
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
2. El badge se reemplaza por un input Tiptap con el valor actual.
3. Cambia el valor a algo coherente (ej. "35%" en lugar de "40%").
4. Presiona Enter o click fuera → la invención desaparece del listado.
5. El diff se recalcula automáticamente.
6. Click "Re-puntuar" en el toolbar → nuevo `ScoreResult` con el delta.

### 4.5 — Aceptar / rechazar (US-4)

1. Footer con 3 botones: **"Aceptar y exportar"**, **"Editar en el editor"**, **"Rechazar y re-prompt"**.
2. **Si hay Hard pendientes**:
   - Click "Aceptar y exportar" → modal: "Tienes X invenciones Hard sin revisar. ¿Aceptar de todos modos o revisarlas primero?".
   - "Aceptar de todos modos" → continúa a `/analizar/exportar` (004).
3. **Si no hay Hard**:
   - Click "Aceptar y exportar" → navega directamente a `/analizar/exportar` con el CV adaptado.
4. Click "Editar en el editor" → navega a `/analizar/editar` con el CV adaptado pre-poblado.
5. Click "Rechazar y re-prompt" → toast rojo "Adaptación rechazada" → vuelve a `/analizar`.

---

## Paso 5 — Verificar a11y WCAG 2.2 AA (2 min)

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

## Paso 6 — Probar edge cases (2 min)

### 6.1 — Adaptación sin invenciones

1. Provoca una adaptación que NO genere invenciones (CV muy completo).
2. El diff viewer muestra un badge verde arriba: "Sin invenciones detectadas".
3. El footer se simplifica: solo "Aceptar y exportar" y "Editar en el editor".

### 6.2 — Adaptación vacía

1. Provoca un error del LLM (temporalmente cambia el modelo a uno que retorne vacío).
2. El viewer muestra panel rojo: "La adaptación no produjo texto. Intenta de nuevo." + botón "Reintentar".

### 6.3 — Adaptación expirada

1. Abre DevTools → Console.
2. Pega:
   ```javascript
   sessionStorage.setItem("buildcv:diff:handoff", JSON.stringify({
     currentDocument: { /* ... */ },
     adaptResult: { /* ... */ },
     originalText: "...",
     adaptTraceId: "abc",
     at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()  // 2h ago
   }));
   location.href = "/analizar/diff";
   ```
3. El viewer detecta >1 h de antigüedad → muestra "La adaptación expiró. Vuelve a solicitarla." + botón "Volver a adaptar".

---

## Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| Página `/analizar/diff` muestra "Adaptación no encontrada" | No hay `DiffHandoff` en sessionStorage | Completar el flujo de adapt primero (Paso 4.1) |
| Badges rojos no aparecen sobre el texto | `position` del backend incorrecto | Verificar en DevTools → Console si hay warnings de mapeo |
| Toggle de modo no persiste | `localStorage` deshabilitado | Verificar en DevTools → Application → Local Storage |
| Diff tarda >3 s en renderizar | CV >50 KB | Normal; el skeleton debería mostrarse. Si no, reportar bug. |
| Aceptar y exportar no bloquea con Hard | Bug en `canDirectAccept` | Verificar en dev: `__diff_test.canDirectAccept(inventions)` |

---

## Comandos útiles

```bash
# Helpers de dev (expuestos en NODE_ENV=development)
__diff_test.canDirectAccept(inventions)  // returns { allowed, hardCount, softCount }
__diff_test.computeDiff(original, adapted)  // returns DiffSegment[]
__diff_test.expireHandoff()  // sets DiffHandoff.at to 2h ago
__diff_test.clearHandoff()  // removes from sessionStorage
```

```bash
# Limpiar handoff desde la consola del navegador
sessionStorage.removeItem("buildcv:diff:handoff");
location.reload();
```

---

## Siguiente paso

Lee [`tasks.md`](./tasks.md) para el desglose de tareas. Recomendación: empieza por **T-006b-01 (Setup: pnpm add diff)** y **T-006b-02 (tipos DiffInput/DiffResult)**.
