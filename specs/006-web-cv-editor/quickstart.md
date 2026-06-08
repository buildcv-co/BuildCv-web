# Quickstart: 006-web-cv-editor

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Tasks:** [./tasks.md](./tasks.md)
> **Tiempo estimado:** 15 minutos para tener el editor corriendo localmente con un CV de ejemplo.

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

Las dependencias nuevas (Tiptap, Zod, idb, nanoid, Zustand, react-markdown, remark-gfm) se añaden en T-006-02.

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

## Paso 5 — Probar el editor (5 min)

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
2. Aparece un modal: **"Tienes un borrador sin guardar. ¿Restaurarlo o empezar de nuevo?"**.
3. Click "Restaurar".
4. El editor abre con tus 3 secciones llenas.

### 5.3 — Limpiar borrador (FR-060 + US-3)

1. Click en "Limpiar borrador" (toolbar superior, botón rojo).
2. Aparece un modal: **"¿Borrar todo tu borrador local? Esta acción no se puede deshacer."**
3. Click "Sí, limpiar".
4. Toast verde: **"Borrador eliminado"**.
5. **Verificación en DevTools**:
   - `Application` → `Local Storage` → `http://localhost:3000` → la clave `buildcv:draft:default` **no debe existir**.
   - `Application` → `IndexedDB` → `buildcv-drafts` → object store `drafts` **debe estar vacío**.

### 5.4 — Re-puntuar (US-4)

1. Llena la vacante (panel lateral derecho, o en `/analizar` si vienes de ahí).
2. Click "Re-puntuar" en la toolbar.
3. Spinner 1-3 s.
4. Badge de score aparece con el número y el delta: **"Antes: 62 → Ahora: 78 (+16)"**.

### 5.5 — Exportar Markdown (US-5)

1. Click "Exportar Markdown" en la toolbar.
2. Se descarga `cv-YYYY-MM-DD.md`.
3. Ábrelo en tu editor favorito: debe tener 8 headings (`## Profile`, `## Experience`, etc.) y el contenido de cada sección.

### 5.6 — Handoff desde 005 (ImportResult)

1. Ve a <http://localhost:3000/analizar/importar> (feature 005).
2. Arrastra un PDF de 2 páginas.
3. Espera el resultado.
4. Click "Usar este texto en el editor".
5. Llegas a `/analizar/editar` con el CV pre-poblado en las 8 secciones.
6. Las `EntityRef` están etiquetadas como `source: 'imported'`.

---

## Paso 6 — Verificar a11y WCAG 2.2 AA (2 min)

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
   - Cambios en el score → anuncia "Puntaje actualizado: 78, antes 62".

4. **Contraste de color**:
   - Abrir DevTools → Lighthouse → Audit "Accessibility" → score ≥95.

---

## Paso 7 — Verificar defense in depth (FR-029a) (1 min)

1. Abre DevTools → Console.
2. Pega este código (helper de dev, expuesto en `NODE_ENV=development`):

```javascript
const result = await __editor_test.roundtrip();
console.log(result);
// Esperado: { success: true, entityCount: { before: 8, after: 8 } }
```

3. Luego prueba la trampa:

```javascript
const trap = await __editor_test.injectForbiddenEntity("FakeCorp Inc");
console.log(trap);
// Esperado: throws EntityNotAllowedError
```

4. Confirma en consola que el editor NO guardó "FakeCorp Inc" en el documento.

---

## Solución de problemas

| Problema | Causa probable | Solución |
|---|---|---|
| Pantalla blanca al entrar a `/analizar/editar` | Dependencias no instaladas o backend caído | `pnpm install` + verificar `BACKEND_URL` en `.env.local` |
| "Limpiar borrador" no elimina IndexedDB | Safari modo privado | Salir de modo privado o usar Chrome/Firefox |
| Re-puntuar retorna 429 | Has hecho >60 scores en 1h | Esperar el `Retry-After` del header |
| `__editor_test` no existe en consola | NODE_ENV ≠ development | Verificar que `pnpm dev` está corriendo (no `pnpm build && pnpm start`) |
| Round-trip falla con "ENTITY_NOT_ALLOWED" | El import del PDF contenía tokens que no pasaron la validación | Pegar manualmente el CV problemático y reportar al equipo |
| Bundle size explotó (>500 KB) | Tiptap tree-shaking roto | Verificar imports nombrados (`@tiptap/react`, NO `import * as Tiptap`) |

---

## Comandos útiles

```bash
# Ver el bundle analyzer
pnpm build -- --profile

# Lint
pnpm lint

# Type-check
npx tsc --noEmit

# Limpiar caché de Next.js
rm -rf .next

# Resetear borrador desde la consola del navegador
indexedDB.deleteDatabase("buildcv-drafts");
localStorage.removeItem("buildcv:draft:default");
```

---

## Siguiente paso

Lee [`tasks.md`](./tasks.md) para ver el desglose de tareas y elige por dónde empezar. Recomendación: empieza por **T-006-01 (Setup: pnpm add)** y **T-006-02 (tipos y schemas Zod)** — son el foundation sobre el que se construye todo lo demás.
