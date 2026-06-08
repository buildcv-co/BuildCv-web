# Quickstart: 005-web-cv-import-ui

**Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Pre-requisitos

- Node 22+
- pnpm 11
- Backend (BuildCv-api) corriendo en `http://localhost:5080`
- M0, M1, M2 del backend implementados (score, adapt, export)
- 005 del backend implementada (parser funcionando)

## Setup local

```bash
cd ~/Dev/portfolio/buildCV/BuildCv-web
pnpm install --frozen-lockfile
cp .env.example .env.local   # Asegúrate de que BACKEND_URL=http://localhost:5080
pnpm dev
# → http://localhost:3000
```

## Pre-flight: backend debe estar corriendo

```bash
# Terminal 1: backend
cd ~/Dev/portfolio/buildCV/BuildCv-api
dotnet run --project src/BuildCv.Api
# → http://localhost:5080

# Terminal 2: frontend
cd ~/Dev/portfolio/buildCV/BuildCv-web
pnpm dev
# → http://localhost:3000
```

Verificar que el backend está vivo:

```bash
curl http://localhost:5080/health/ready
# Expected: 200 OK
```

## Tests E2E manuales

> **No hay framework de testing instalado aún** (Vitest llega en M3+). Mientras tanto, validación manual con checklist.

### Test 1: Importar PDF happy path

1. Abrir `http://localhost:3000/importar` en el navegador.
2. Arrastrar un PDF de 2 páginas (con secciones EXPERIENCIA, EDUCACIÓN) al `FileUpload`.
3. **Esperado**:
   - Spinner aparece ("Extrayendo texto...").
   - En <3s aparece `ImportResultPanel` con:
     - `text` completo del CV.
     - `sections` con al menos 2 entries ("EXPERIENCIA", "EDUCACIÓN" con `confidence: High`).
     - `warnings` vacío (o con `IMAGE_OMITTED` si el PDF tiene imágenes).
     - Botón "Usar este texto en el editor" prominente.
4. **Verificación accesibilidad**:
   - Tab navega al `FileUpload` (focus ring visible).
   - Enter o Space abre el selector de archivos.
   - Screen reader anuncia "Cargar CV en PDF o DOCX, Arrastra o selecciona un archivo PDF o DOCX, máximo 5 MB".

### Test 2: Importar DOCX happy path

1. Arrastrar un DOCX de 1 página (con secciones EXPERIENCIA, HABILIDADES).
2. **Esperado**: misma UI que Test 1, con texto extraído y secciones detectadas. Si el DOCX tiene imágenes, `warnings` incluye `IMAGE_OMITTED`.

### Test 3: Rechazo client-side (5 MB excedido)

1. Generar un PDF de 6 MB con texto random:
   ```bash
   # Requiere una herramienta que genere un PDF con texto (no bytes random)
   # Sugerencia: usar LibreOffice o un script Python con reportlab
   ```
2. Arrastrar al `FileUpload`.
3. **Esperado**:
   - NO hay spinner (rechazo inmediato).
   - Toast rojo: "El archivo supera el límite de 5 MB."

### Test 4: Rechazo client-side (MIME inválido)

1. Renombrar un `.txt` a `.pdf` y arrastrarlo.
2. **Esperado**:
   - NO hay spinner.
   - Toast rojo: "Tipo de archivo no soportado. Sube un PDF o DOCX."

### Test 5: 415 desde el backend (MIME spoofing)

1. Crear un archivo `.txt` cuyo contenido sea `%PDF-1.4` + bytes random.
2. Renombrarlo a `.pdf` para que el MIME declarado sea `application/pdf`.
3. Arrastrarlo.
4. **Esperado**:
   - Validación client-side pasa (MIME declarado es PDF).
   - Backend retorna 415 porque los magic bytes no son de un PDF válido.
   - UI muestra `ImportErrorPanel` con detail "Tipo de archivo no soportado. Sube un PDF o DOCX."

### Test 6: 413 desde el backend (archivo >5 MB pero <6 MB)

1. Si la validación client-side se salta (e.g., con DevTools), el backend debe rechazar con 413.
2. **Esperado**:
   - `ImportErrorPanel` con detail "El archivo supera el límite de 5 MB."

### Test 7: 422 (PDF cifrado)

1. Crear un PDF protegido con contraseña (usar `qpdf --encrypt ...`).
2. Arrastrarlo.
3. **Esperado**:
   - `ImportErrorPanel` con detail "Este PDF está protegido con contraseña. Quítale la contraseña y vuelve a subirlo."

### Test 8: 422 (PDF escaneado)

1. Usar un PDF que solo contenga imágenes (sin capa de texto).
2. Arrastrarlo.
3. **Esperado**:
   - `ImportErrorPanel` con detail "Este PDF parece un escaneo. No podemos extraer texto..."

### Test 9: 429 (rate-limit excedido)

1. Hacer 31 uploads en menos de 1h.
2. El 31º upload retorna 429.
3. **Esperado**:
   - Toast amarillo persistente: "Has alcanzado el tope de importaciones (30/hora)..."
   - NO hay retry automático.
   - El botón "Reintentar" está deshabilitado durante el `Retry-After`.

### Test 10: Handoff al editor (006)

> **Este test depende de que 006-cv-editor esté implementado.** Si no, ver Test 11.

1. Después de un import exitoso (Test 1 o 2), click "Usar este texto en el editor".
2. **Esperado**:
   - Navega a `/editor?traceId=...`.
   - El textarea del editor (006) tiene el texto extraído como valor inicial.
   - El sessionStorage tiene la entry `buildcv:import:handoff` con el JSON del handoff.

### Test 11: Botón "Usar en editor" deshabilitado (006 no implementado)

1. Si 006-cv-editor no está implementado, el botón muestra "Próximamente" y está deshabilitado.
2. **Esperado**:
   - El botón no responde a click.
   - El texto del botón es "Próximamente" en lugar de "Usar este texto en el editor".
   - `aria-disabled="true"`.

### Test 12: Validar Zod del response

1. Con DevTools abiertos, interceptar el response del backend y modificar el JSON.
2. Eliminar el campo `traceId` o cambiar `engineVersion` a "not-semver".
3. **Esperado**:
   - El frontend NO renderiza el resultado.
   - `ImportErrorPanel` con detail "Respuesta inválida del servidor. Intenta de nuevo."
   - Console.error con el detalle de Zod.

### Test 13: Accesibilidad completa

1. **Lighthouse Accessibility Audit** (DevTools → Lighthouse):
   - Score ≥95.
2. **axe DevTools extension**:
   - 0 violations críticas.
3. **Screen reader (VoiceOver/NVDA)**:
   - Navegación con Tab llega al `FileUpload` con anuncio claro.
   - Anuncio de éxito al cargar el `ImportResultPanel`.
   - Anuncio de error inmediato al fallar.
4. **Solo teclado**:
   - Tab → FileUpload → Enter → selector de archivos → seleccionar → flow completo.
   - No requiere mouse en ningún paso.

### Test 14: Privacidad (NFR-001a)

1. Abrir DevTools → Application → Local Storage / Session Storage / Cookies.
2. **Esperado**:
   - El archivo PDF/DOCX **NO** aparece en `localStorage` ni `sessionStorage`.
   - Solo aparece `buildcv:import:handoff` en `sessionStorage` con el texto extraído (no el archivo).
   - No hay cookies nuevas.
3. **Verificación de logs**:
   - DevTools → Network → click en el request `/api/import`.
   - El body del request muestra el archivo, pero el response solo tiene el JSON.
   - Backend logs: solo metadatos (fileSize, mime, parseTimeMs), NO el texto.

## Verificación pre-merge

```bash
# 1. Lint
cd ~/Dev/portfolio/buildCV/BuildCv-web
pnpm lint
# Expected: 0 errors, 0 warnings

# 2. Build
pnpm build
# Expected: build success, sin errores de TypeScript

# 3. (Si hay framework de testing) Vitest
pnpm test
# Expected: all green
```

## Crear PR

```bash
gh pr create \
  --title "feat(005-web-cv-import-ui): UI de import PDF/DOCX" \
  --body "Implements BFF + UI for POST /api/v1/import. Cite Constitution Art. III, IV, V, VI, VII. WCAG 2.2 AA compliant."
```

## Troubleshooting

- **El spinner se queda colgado**: probablemente el BFF no está corriendo o `BACKEND_URL` apunta a un puerto incorrecto. Verificar `.env.local`.
- **`pnpm build` falla con error de Zod**: el Zod schema debe coincidir con la respuesta del backend. Si el backend cambió el schema, actualizar `ImportResultSchema`.
- **Drag/drop no funciona en Safari**: Safari tiene comportamientos distintos para `dragover`. Verificar que el `onDragOver` llame a `e.preventDefault()`.
- **El archivo se guarda en `localStorage` accidentalmente**: revisar que ningún componente haga `JSON.stringify(file)` y lo guarde. El archivo debe viajar como `FormData` y nunca persistirse.
- **El sessionStorage acumula handoffs**: agregar un `useEffect` en `app/importar/page.tsx` que limpie el handoff al desmontar (después de pasarlo al editor).

## Métricas a observar (post-launch)

- Tasa de éxito del import (200 / total requests).
- Distribución de status codes (200, 400, 415, 422, 429, 503).
- Tiempo de respuesta P50, P95, P99.
- Tasa de drop-off (usuarios que abren `/importar` pero no suben nada).
- Tasa de handoff exitoso al editor (006).
