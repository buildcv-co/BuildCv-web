# Research: 005-web-cv-import-ui

**Date**: 2026-06-09 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> **Decisiones del lado frontend.** El parsing vive en el backend; aquí solo se documentan las decisiones de UI/UX, accesibilidad, validación client-side, y handoff al editor (006).

---

## W01 — ¿Por qué el frontend NO parsea?

### Decisión

El frontend sube el archivo vía `multipart/form-data` al BFF, que lo proxyea al backend. **El frontend no parsea**.

### Razones

1. **Consistencia con la arquitectura BFF**: el navegador nunca habla directo con el backend (Constitution Art. VI). El patrón ya está en `app/api/score/route.ts`, `app/api/adapt/route.ts`, `app/api/export/route.ts`.
2. **Sin librerías pesadas en el cliente**: `pdf.js` o `mammoth.js` añaden 200-500 KB al bundle. Innecesario si el backend ya lo hace.
3. **Edge runtime incompatible con archivos grandes**: el runtime `edge` de Vercel tiene límite de 4 MB para `Request.body`. El BFF usa `runtime = "nodejs"` para evitar ese límite.
4. **Defense in depth**: si el frontend validara MIME, no podría validar magic bytes (no tiene acceso a `FileReader` binario confiable). El backend sí puede con PdfPig/OpenXml.
5. **Coherencia con Constitution Art. V**: el texto extraído se trata como dato. Si el parseo ocurre en el cliente, podría aplicarse sanitización agresiva antes de enviar al backend. Server-side, el texto viaja crudo y los guardarraíles (nonces, bloques delimitados) aplican uniformemente.

### Alternativa descartada: drag/drop con FileReader en el browser

Técnicamente viable. Pero:
- Más código.
- Más superficie de bugs (encoding, navegador-específico).
- Doble implementación (cliente + backend) = doble mantenimiento.

---

## W02 — ¿Por qué Zod en el cliente?

### Decisión

Validar el `ImportResult` con Zod al recibirlo del backend.

### Razones

1. **Defense in depth (Constitution Art. I FR-029a)**: el editor (006) consumirá el `ImportResult`. Si el backend cambia el schema o hay un bug, el Zod schema rechaza el payload antes de que el editor lo procese.
2. **Type safety**: `z.infer<typeof ImportResultSchema>` genera el tipo TypeScript automáticamente, sincronizado con el schema.
3. **Validación de límites**: `text.max(50_000)`, `sections.max(50)`, etc. Defiende contra respuestas inesperadamente grandes.
4. **Falla temprano, falla explícito**: si el schema cambia, el error de Zod es claro y stack-traceable.

### Alternativa descartada: tipar y confiar

TypeScript solo valida en compile-time. En runtime, un backend bug o un proxy malicioso podría enviar un payload inválido. Zod cierra esa brecha.

---

## W03 — ¿Por qué validación client-side del archivo?

### Decisión

Antes de subir, validar tamaño (≤5 MB) y MIME declarado (`application/pdf` o `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).

### Razones

1. **UX**: el usuario recibe feedback inmediato sin esperar el round-trip al backend. Si su archivo es de 10 MB, se lo decimos antes de que pierda 30 segundos esperando.
2. **Ahorro de CPU del backend**: rechazamos archivos inválidos ANTES de que Kestrel los parsee. Ahorra ancho de banda del usuario y CPU del server.
3. **Ahorro de bandwidth del BFF**: el archivo nunca viaja al backend si falla la validación client-side.
4. **Coherencia con FR-039a (backend)**: el backend también valida MIME y magic bytes. La validación client-side es **complementaria**, no sustituta.

### Limitación

La validación de MIME en el cliente es **superficial**: el navegador puede mentir sobre el tipo (atacante con DevTools). El backend valida magic bytes y estructura interna, que es la fuente de verdad.

---

## W04 — ¿Por qué drag/drop + click juntos?

### Decisión

El `FileUpload` acepta tanto drag/drop como click para abrir el selector nativo.

### Razones

1. **Accesibilidad (WCAG 2.2 AA)**: drag/drop no es accesible para usuarios de teclado, lectores de pantalla, o dispositivos móviles sin mouse. El click es el fallback universal.
2. **UX moderna**: drag/drop es la convención en herramientas web (Gmail, Dropbox, etc.). Click es el fallback para quien no puede arrastrar.
3. **Coherencia con el resto del producto**: el editor (006) y otras features futuras usarán el mismo patrón.

### Implementación

- `<div role="button" tabindex={0}>` con handlers de `onClick`, `onKeyDown` (Enter/Space), `onDragOver`, `onDragLeave`, `onDrop`.
- `<input type="file" hidden ref={fileInputRef}>` que se activa con `.click()` en el handler.
- `aria-label`, `aria-describedby` con instrucciones.
- Focus ring visible.

---

## W05 — ¿Por qué warnings como toasts no bloqueantes?

### Decisión

`warnings[]` se muestra como una lista expandible con toasts amarillos (`Info`, `Warning`), no como errores bloqueantes.

### Razones

1. **Constitution Art. IV (encuadre honesto)**: el parser puede haber omitido imágenes o tenido dudas sobre una sección. Eso es información para el usuario, no un error que bloquee el flujo.
2. **Defensa contra falsos positivos**: la heurística de secciones es imperfecta. Mostrar un warning permite al usuario revisar manualmente sin frustrarse por un error.
3. **Coherencia con el patrón de export (004)**: `export-button.tsx` ya usa toasts para feedback no bloqueante.

### Implementación

- Toast amarillo persistente (no auto-dismiss) en la esquina inferior derecha.
- `role="status"` con `aria-live="polite"` (anuncio suave).
- Botón "Cerrar" para dismiss manual.

---

## W06 — ¿Por qué handoff al editor (006) vía state, no URL?

### Decisión

Cuando el usuario hace click en "Usar en editor", el `ImportResult` se pasa al editor (006) vía state (React Context o `sessionStorage` transitorio), NO vía query string.

### Razones

1. **Privacidad (Constitution Art. III)**: el CV es PII (información personal identificable). Si pasa por URL, queda en logs del navegador, del proxy, y de servicios de analytics.
2. **Tamaño**: el texto extraído puede ser hasta 50.000 chars. URL tiene límites prácticos (~2000 chars en la mayoría de browsers).
3. **Encoding**: la URL necesita encoding de caracteres especiales (UTF-8 → percent-encoding), propenso a bugs.
4. **Limpieza**: `sessionStorage` se borra al cerrar la pestaña; query string persiste en historial.

### Alternativa descartada: `localStorage` persistente

`localStorage` persiste entre pestañas y sesiones, lo que aumenta el riesgo de exposición. `sessionStorage` es suficiente para el handoff in-tab.

---

## W07 — ¿Por qué runtime `nodejs` en el BFF (no `edge`)?

### Decisión

`app/api/import/route.ts` declara `export const runtime = "nodejs"`.

### Razones

1. **Límite de 4 MB en edge runtime**: el runtime `edge` de Vercel trunca `Request.body` a 4 MB. Como nuestro límite es 5 MB, necesitamos `nodejs`.
2. **Multipart parsing**: Node.js tiene mejor soporte para `FormData` con archivos grandes.
3. **Consistencia con `app/api/export/route.ts`**: ya usa `runtime = "nodejs"` para el PDF binario.

### Costo

- Latencia ligeramente mayor (Node cold start ~200-500 ms vs Edge ~50 ms). Aceptable para un import que toma 1-2s en total.

---

## W08 — Accesibilidad (WCAG 2.2 AA): checklist

- [ ] **FileUpload** es navegable por teclado (Tab + Enter/Space).
- [ ] **FileUpload** tiene `aria-label="Cargar CV en PDF o DOCX"`.
- [ ] **FileUpload** tiene `aria-describedby` con instrucciones ("Arrastra o selecciona un archivo PDF o DOCX, máximo 5 MB").
- [ ] **FileUpload** tiene focus ring visible (no remover el outline sin reemplazo).
- [ ] **ImportResultPanel** tiene `aria-live="polite"` para anunciar el estado de éxito.
- [ ] **ImportErrorPanel** tiene `role="alert"` para anuncio inmediato.
- [ ] **Warnings** se anuncian con `aria-live="polite"` y `role="status"`.
- [ ] Contraste de texto cumple 4.5:1 (normal) y 3:1 (grande).
- [ ] No hay información comunicada SOLO por color (los warnings tienen icono + texto).
- [ ] Botón "Usar en editor" tiene `aria-label` descriptivo.
- [ ] Validar con Lighthouse y axe-core antes de mergear.

---

## Resumen de decisiones

| # | Decisión | Razón principal |
|---|---|---|
| W01 | Frontend NO parsea, solo sube | Consistencia con BFF + sin librerías pesadas + Art. V |
| W02 | Zod en cliente | Defense in depth (Art. I FR-029a) + type safety |
| W03 | Validación client-side del archivo | UX + ahorro de CPU/bandwidth |
| W04 | Drag/drop + click | Accesibilidad (WCAG 2.2 AA) |
| W05 | Warnings como toasts no bloqueantes | Encuadre honesto (Art. IV) |
| W06 | Handoff al editor vía state (no URL) | Privacidad (Art. III) |
| W07 | Runtime `nodejs` en BFF | Límite de 4 MB en edge |
| W08 | Checklist WCAG 2.2 AA | Accesibilidad como regla dura |

---

## Referencias

- Constitution Art. I (cero invención), III (privacidad), IV (encuadre honesto), V (entrada como dato), VI (Clean Arch), VII (rate-limit), VIII (TDD — aplica también a UI con tests manuales).
- WCAG 2.2 — Web Content Accessibility Guidelines.
- Next.js 16 docs — `runtime = "nodejs"` vs `"edge"`, `FormData` API.
- Zod docs — `z.infer`, `z.object`, `z.enum`, `z.string.max`, `z.array.max`.
- Backend counterpart: `BuildCv-api/specs/005-cv-pdf-docx-import/` (research.md).
