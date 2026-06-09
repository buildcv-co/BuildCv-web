# Quickstart: 006-web-cv-editor

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Tasks:** [./tasks.md](./tasks.md)
> **Tiempo estimado:** 15 minutos para tener el editor corriendo localmente con un CV de ejemplo.
>
> **Stack shipped (ver `tasks.md` líneas 9–24):** 8 inputs/textareas nativos + Zod v3 + `LocalStorageCvStore`. Sin Tiptap, sin Zustand, sin idb, sin nanoid, sin react-markdown/remark. Vitest 2 + RTL 16 + jsdom ya configurados (sprint 0, commit 21fb83b).

---

## Prerrequisitos

- **Node 22+** y **pnpm 11+** instalados.
- **Backend .NET 10** corriendo en `http://localhost:5080` (sigue `BuildCv-api/AGENTS.md` para arrancarlo).
- **Browser moderno**: Chrome / Edge / Firefox / Safari ≥16.

```bash
node --version    # ≥ 22
pnpm --version    # ≥ 11
```

---

## Paso 1 — Instalar dependencias (1 min)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web
pnpm install
```

Las dependencias para esta feature ya están en `package.json` (sprint 0 + sprint 4a):

- **`zod@^3.25.76`** — validación runtime + tipos estáticos (sprint 4a).
- **`diff@^5.2.2`** — agregado por la sub-feature 006b, presente en lockfile compartido.
- **`vitest@^2.1.9`** + **`@testing-library/react@^16.3.2`** + **`jsdom@^29.1.1`** — sprint 0.
- **`@playwright/test@^1.60.0`** — sprint 0.

**NO se instalan**: Tiptap, Zustand, idb, nanoid, react-markdown, remark, remark-gfm (rechazados en `tasks.md`).

---

## Paso 2 — Levantar el backend (si aún no está corriendo) (1 min)

```bash
# En otra terminal
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-api
dotnet run --project src/BuildCv.Api
# Escucha en http://localhost:5080
```

Verifica que el healthcheck esté verde:

```bash
curl http://localhost:5080/health/ready
# Esperado: "Healthy"
```

---

## Paso 3 — Configurar variables de entorno (30 s)

```bash
# En BuildCv-web/
cat .env.local
# Esperado:
# BACKEND_URL=http://localhost:5080
```

Si no existe, créalo:

```bash
echo "BACKEND_URL=http://localhost:5080" > .env.local
```

---

## Paso 4 — Arrancar el dev server (30 s)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web
pnpm dev
# Escucha en http://localhost:3000
```

---

## Paso 5 — Probar el editor en el navegador (5 min)

### 5.1 — Sin import previo (ruta mínima)

1. Abre <http://localhost:3000/analizar/editar> en el navegador.
2. Verás 8 secciones vacías con placeholders ("Agregar nombre completo", "Agregar experiencia", etc.).
3. Llena `Profile` con tu nombre y email.
4. Llena `Experience` con un rol, una empresa, una fecha de inicio y al menos un bullet.
5. Llena `Skills` con 2-3 skills (ej. "TypeScript", "React", "PostgreSQL").
6. Click en "Guardar borrador" (toolbar superior).
7. El indicador de la toolbar cambia a "Guardado hace 1 s".

### 5.2 — Reload + restore (FR-059 + US-2)

1. Recarga la página (F5).
2. El editor abre directamente con tus secciones llenas (NO hay modal de confirmación; el `useDraft` hook hidrata el singleton `"default"` automáticamente).

### 5.3 — Limpiar borrador (FR-060 + US-3)

1. Click en "Limpiar borrador" (toolbar superior, botón rojo).
2. Aparece un modal: **"¿Borrar todo tu borrador local? Esta acción no se puede deshacer."**
3. Click "Sí, limpiar".
4. Toast verde: **"Borrador eliminado"**.
5. **Verificación en DevTools**:
   - `Application` → `Local Storage` → `http://localhost:3000` → la clave `buildcv:draft:default` **no debe existir**.

### 5.4 — Re-puntuar (US-4)

1. Llena la vacante (panel lateral derecho, o en `/analizar` si vienes de ahí).
2. Click "Re-puntuar" en la toolbar.
3. Spinner 1-3 s.
4. El `<output aria-live="polite">` muestra: **"Re-puntuado: 78 (Strong)"** (o equivalente).

### 5.5 — Exportar Markdown (US-5)

1. Click "Exportar Markdown" en la toolbar.
2. Se descarga `cv-YYYY-MM-DD.md`.
3. Ábrelo en tu editor favorito: debe tener 8 headings (`## Profile`, `## Experience`, etc.) y el contenido de cada sección.

### 5.6 — Handoff desde 005 (ImportResult)

1. Ve a <http://localhost:3000/analizar/importar> (feature 005).
2. Arrastra un PDF de 2 páginas.
3. Espera el resultado.
4. Click "Usar este texto en el editor".
5. Llegas a `/analizar/editar` con el CV pre-poblado en las 8 secciones (parseado por `parseCvDocument`).

---

## Paso 6 — Correr los tests automatizados (1 min)

El shipped code tiene **35+ tests** (Vitest 2 + RTL 16 + jsdom). Para correrlos:

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web
pnpm test
```

**Esperado**: 710 tests passing, 0 failing. Los tests del editor están en:

- `lib/editor/types.test.ts` — shape de los tipos.
- `lib/editor/schema/{section}.test.ts` (8 archivos) — cada Zod schema.
- `lib/editor/schema/index.test.ts` — discriminated union.
- `lib/editor/markdown/parse.test.ts`, `serialize.test.ts`, `roundtrip.test.ts`.
- `lib/editor/use-draft.test.ts`.
- `lib/storage/icv-store.test.ts` (12+ tests), `index.test.ts` (6+ tests).
- `components/editor/editor.test.tsx`, `editor-toolbar.test.tsx`, `editor-save-indicator.test.tsx`, `section-node.test.tsx`, `entity-badge.test.tsx`, `limp-borrador-button.test.tsx`.

Para correr solo los del editor (más rápido):

```bash
pnpm test -- lib/editor/ components/editor/ lib/storage/
```

Para watch mode (TDD activo, Constitution Art. VIII):

```bash
pnpm test:watch
```

Para coverage:

```bash
pnpm test:cov
# Reporte HTML en coverage/
```

---

## Paso 7 — Verificar a11y WCAG 2.2 AA (2 min)

1. **Keyboard nav**:
   - `Tab` desde el URL bar → debe llevar al primer input del editor (no a la barra de direcciones).
   - `Tab` por toda la UI → todos los botones son focusables, en orden lógico.
   - `Shift+Tab` → reversa.
   - `Enter` y `Space` activan botones.
   - `Esc` cierra modales.

2. **Focus visible**:
   - El outline de focus es claramente visible (≥2 px, contraste ≥3:1).

3. **Screen reader** (VoiceOver en macOS / NVDA en Windows):
   - `Tab` al editor → anuncia "Editor de CV, 8 secciones".
   - `Tab` a cada sección → anuncia el nombre ("Experiencia", "Educación", etc.).
   - Cambios en el score → anuncia "Re-puntuado: 78, Strong".

4. **Contraste de color**:
   - Abrir DevTools → Lighthouse → Audit "Accessibility" → score ≥95.

---

## Paso 8 — Verificar defense in depth (FR-029a) (1 min)

El round-trip Markdown↔CvDocument se valida con Zod. Para verificar:

1. Carga un CV, edita 2-3 secciones, guarda.
2. Abre DevTools → Console.
3. Ejecuta (helper disponible en `NODE_ENV=development` si se expone):

```javascript
// Importa el módulo en runtime (no expuesto por defecto en prod)
const { roundtrip } = await import("/lib/editor/markdown/roundtrip.ts");
const { useDraft } = await import("/lib/editor/use-draft.ts");

const result = roundtrip(/* el CvDocument actual */);
console.log(result);
// Esperado: { ok: true, markdown: "..." }
```

Alternativa más simple: corre los tests de round-trip:

```bash
pnpm test -- lib/editor/markdown/roundtrip.test.ts
```

---

## Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| Pantalla blanca al entrar a `/analizar/editar` | Dependencias no instaladas o backend caído | `pnpm install` + verificar `BACKEND_URL` en `.env.local` |
| "Limpiar borrador" no elimina | `localStorage` deshabilitado o modo privado Safari | Salir de modo privado o usar Chrome/Firefox |
| Re-puntuar retorna 429 | Has hecho >60 scores en 1h | Esperar el `Retry-After` del header |
| Tests fallan con "Cannot find module" | Lockfile desactualizado | `pnpm install --frozen-lockfile` |
| Editor se ve sin estilos | Tailwind v4 no compiló | Verificar `pnpm dev` está corriendo (no `pnpm build && pnpm start` sin prebuild) |
| `QuotaExceededError` al guardar | CV >5 MB (caso raro) | Reducir contenido o limpiar el borrador. En v1: `IndexedDbCvStore` (deuda técnica). |

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

# Limpiar caché de Next.js
rm -rf .next

# Limpiar el singleton "default" del store desde la consola del navegador
localStorage.removeItem("buildcv:draft:default");
location.reload();
```

---

## Siguiente paso

Lee [`tasks.md`](./tasks.md) para ver el desglose de tareas (preserva el bloque "DECISIÓN ARQUITECTÓNICA EXPLÍCITA" en líneas 9–24). El shipped code corresponde a las fases Setup → Foundational → US-1..5 → Polish.

Para la sub-feature hermana (diff viewer), ve a [`../006-web-cv-diff-viewer/quickstart.md`](../006-web-cv-diff-viewer/quickstart.md).
