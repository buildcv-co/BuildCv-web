# Tasks: 005-web-cv-import-ui

**Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> **Sin framework de testing instalado aún** (Vitest llega en M3+). Mientras tanto, **checklist E2E manual** (ver [quickstart.md](./quickstart.md#tests-e2e-manuales)).
> **Hito v0.5** · **0 supresiones** (no `// @ts-ignore`, no `// eslint-disable`).

## Phase 1 — BFF Setup

- [ ] **T1.1** Crear `BuildCv-web/app/api/import/route.ts` con `export const runtime = "nodejs"` y `export const dynamic = "force-dynamic"`.
- [ ] **T1.2** Implementar el handler: leer `formData`, hacer `fetch` a `BACKEND_URL/api/v1/import`, propagar status + body + `content-type` headers.
- [ ] **T1.3** Verificar manualmente con `curl -F file=@sample.pdf http://localhost:3000/api/import` que el BFF proxyea correctamente.

## Phase 2 — Tipos y validación

- [ ] **T2.1** Agregar `zod` a `package.json` (si no está).
- [ ] **T2.2** En `lib/api/types.ts`, agregar los Zod schemas `DetectedSectionSchema`, `ImportWarningSchema`, `ImportResultSchema` y sus tipos inferidos.
- [ ] **T2.3** Crear `lib/api/import.ts` con:
  - `class ImportError` (status, code, message, details).
  - `const MAX_FILE_SIZE = 5 * 1024 * 1024`.
  - `const ALLOWED_MIMES = [...]`.
  - `function validateFile(file) → { ok, reason? }`.
  - `async function requestImport(file) → ImportResult` (POST a `/api/import`, Zod parsea el response).
- [ ] **T2.4** En `lib/api/import.ts`, agregar `setEditorHandoff`, `getEditorHandoff`, `clearEditorHandoff` (sessionStorage).
- [ ] **T2.5** Verificar que `pnpm build` pasa (TypeScript strict).

## Phase 3 — Copy

- [ ] **T3.1** En `lib/copy/es.ts`, agregar `IMPORT_COPY` con strings en español neutro (NO Rioplatense):
  - `page`: title, subtitle, maxSize, dragHere, or, clickToSelect.
  - `states`: idle, loading, success, error.
  - `button`: "Usar este texto en el editor" / "Próximamente".
  - `sections`: title, confidence labels.
  - `warnings`: title, close.
  - `errors`: CLIENT_VALIDATION, NETWORK_ERROR, IMPORT_TOO_LARGE, IMPORT_UNSUPPORTED_MEDIA, IMPORT_PDF_ENCRYPTED, IMPORT_SCANNED_PDF, IMPORT_DOCX_PROTECTED, IMPORT_DOCX_NO_TEXT, IMPORT_TOO_MANY_PAGES, IMPORT_EMPTY_FILE, IMPORT_RATE_LIMIT_EXCEEDED, IMPORT_ENGINE_ERROR, UNKNOWN.

## Phase 4 — Componente FileUpload

- [ ] **T4.1** Crear `components/import/file-upload.tsx` con:
  - `<div role="button" tabindex={0}>` con handlers de click, keydown (Enter/Space), dragover, dragleave, drop.
  - `<input type="file" hidden ref={fileInputRef}>` activado programáticamente.
  - `aria-label="Cargar CV en PDF o DOCX"`.
  - `aria-describedby="upload-instructions"` con párrafo de instrucciones.
  - Focus ring visible (Tailwind: `focus-visible:ring-2 focus-visible:ring-amber-500`).
  - Validación client-side antes de llamar `onFileSelected`.
- [ ] **T4.2** [CHECKLIST] Tab navega al componente. Enter/Space abre el selector. Drag/drop funciona. Validación rechaza >5 MB y MIMEs inválidos.
- [ ] **T4.3** [CHECKLIST] Screen reader anuncia correctamente el `aria-label` y `aria-describedby`.

## Phase 5 — Componente ImportButton

- [ ] **T5.1** Crear `components/import/import-button.tsx` con:
  - State machine `idle | loading | success | error`.
  - Llama a `requestImport(file)` cuando recibe un archivo nuevo.
  - Muestra spinner durante `loading`.
  - Muestra toast de éxito al completar.
  - Muestra toast de error si falla.
  - Accesibilidad: `aria-busy={state === "loading"}`.
- [ ] **T5.2** [CHECKLIST] Click "Import" → spinner → resultado en <3s para PDF de 2 páginas.

## Phase 6 — Componente ImportResultPanel

- [ ] **T6.1** Crear `components/import/import-result-panel.tsx` con:
  - Renderiza `text` en un `<pre>` con scroll y font-mono.
  - Renderiza `sections` como lista con badges de confianza (`High` verde, `Low` amarillo).
  - Renderiza `warnings` como toasts amarillos no bloqueantes.
  - Botón "Usar este texto en el editor" prominente.
  - Si `editorAvailable === false`, botón deshabilitado con texto "Próximamente".
  - `aria-live="polite"` para anunciar el estado de éxito.
  - `aria-label` descriptivo en el botón.
- [ ] **T6.2** [CHECKLIST] Renderiza correctamente text, sections, warnings. Botón navega a `/editor` con el handoff en sessionStorage.

## Phase 7 — Componente ImportErrorPanel

- [ ] **T7.1** Crear `components/import/import-error-panel.tsx` con:
  - Recibe `error: ImportError`.
  - Mapea `error.code` a mensaje en español usando `IMPORT_COPY.errors`.
  - Panel rojo con `role="alert"` (anuncio inmediato a screen readers).
  - Botón "Reintentar" (opcional) que llama a `onRetry`.
  - Botón "Cerrar" que llama a `onDismiss`.
  - Focus se mueve al título del panel al abrir.
- [ ] **T7.2** [CHECKLIST] Cada código de error (CLIENT_VALIDATION, NETWORK_ERROR, IMPORT_*) muestra el mensaje correcto.

## Phase 8 — Página /importar

- [ ] **T8.1** Crear `app/importar/page.tsx` que orquesta:
  - `useState<ImportState>` (idle | loading | success | error).
  - `FileUpload` recibe el archivo y llama a `requestImport`.
  - `ImportButton` muestra el estado actual.
  - `ImportResultPanel` muestra el resultado exitoso.
  - `ImportErrorPanel` muestra el error.
  - `metadata.title = "Cargar tu CV | BuildCv"` (encuadre honesto, NO "ATS").
- [ ] **T8.2** Conectar al layout: la página hereda `app/layout.tsx` (tema oscuro cálido, Fraunces + Geist).
- [ ] **T8.3** Agregar `<Link href="/importar">` en la landing (`app/page.tsx`) como CTA secundario.
- [ ] **T8.4** [CHECKLIST] Navegación a `/importar` carga la página sin errores en console.
- [ ] **T8.5** [CHECKLIST] Lighthouse Accessibility ≥95.
- [ ] **T8.6** [CHECKLIST] axe DevTools: 0 violations críticas.

## Phase 9 — Privacidad y persistencia

- [ ] **T9.1** Verificar que el archivo NO se guarda en `localStorage` (DevTools → Application).
- [ ] **T9.2** Verificar que el archivo NO se guarda en cookies.
- [ ] **T9.3** El handoff al editor se guarda en `sessionStorage` con la key `buildcv:import:handoff` y se limpia al cerrar la pestaña.
- [ ] **T9.4** [CHECKLIST] Botón "Limpiar borrador" (si existe en landing) limpia también el handoff de import.

## Phase 10 — Validación con Zod del response

- [ ] **T10.1** En `requestImport`, hacer `ImportResultSchema.parse(await response.json())` antes de retornar.
- [ ] **T10.2** [CHECKLIST] Si el backend envía un payload inválido (e.g., `engineVersion: "not-semver"`), el frontend lanza `ImportError` con code `INVALID_RESPONSE` y muestra mensaje "Respuesta inválida del servidor."

## Phase 11 — Pre-merge verification

- [ ] **T11.1** `pnpm install --frozen-lockfile` → exit 0
- [ ] **T11.2** `pnpm lint` → 0 errors, 0 warnings
- [ ] **T11.3** `pnpm build` → success
- [ ] **T11.4** [CHECKLIST] Todos los 14 tests E2E manuales del [quickstart.md](./quickstart.md#tests-e2e-manuales) pasan.
- [ ] **T11.5** Code review adversarial (`judgment-day` skill).
- [ ] **T11.6** PR con cita explícita de Constitution Art. III, IV, V, VI, VII.

## Critical Path

```
T1 (BFF) → T2 (Tipos) → T3 (Copy) → T4-T7 (Componentes) → T8 (Página) → T9 (Privacidad) → T10 (Zod) → T11 (Pre-merge)
```

## Risks Per Phase

| Phase | Risk | Mitigation |
|---|---|---|
| T1 | BFF no transmite archivos >4 MB | `runtime = "nodejs"` (no `edge`) |
| T2 | Zod schema desincronizado del backend | regenerar Zod desde OpenAPI o desde `BuildCv-api/specs/005-cv-pdf-docx-import/contracts/import-api.md` |
| T4 | Drag/drop no funciona en Safari | `e.preventDefault()` en `onDragOver`; probar en Safari antes de mergear |
| T6 | El handoff al editor (006) no existe | botón deshabilitado con "Próximamente" si `editorAvailable === false` |
| T8 | Lighthouse <95 | checklist de accesibilidad; iterar hasta cumplir |
| T9 | sessionStorage acumula handoffs | `useEffect` cleanup en `app/importar/page.tsx` que llama `clearEditorHandoff` al desmontar |

## Out of Scope

- Tests automatizados (Vitest en M3+).
- Drag/drop de múltiples archivos.
- Previsualización del PDF antes de subir.
- Soporte para `.rtf`, `.odt`, `.pages`, `.txt` (v1).
- Historial de imports (v1 con cuentas).
- Integración con almacenamiento en la nube (v1).

## Handoff a features downstream

- **006-cv-editor**: el editor consume `EditorHandoff` desde `sessionStorage` y usa `importedText` como valor inicial del textarea.
- **002-score-engine**: el score opera sobre el texto que el editor le pase (sin cambios).
- **003-adapt-ia**: la adaptación opera sobre el texto del editor (sin cambios).
