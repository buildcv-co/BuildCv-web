# Research: 002-web-score-ui

**Status:** ✅ SHIPPED (commit `ed13890`)

## 1. BFF vs direct backend call

**Opciones:**
- A) Browser llama directo a `BACKEND_URL/api/v1/score`
- B) BFF same-origin `app/api/score/route.ts` proxyea al backend

**Decisión:** Opción B (BFF). Razones:
- Constitution Art. VI: el browser NUNCA habla directo con el backend
- BFF oculta `BACKEND_URL` del cliente (seguridad)
- Same-origin simplifica CORS y cookies futuras (v1 auth)
- Performance: server-to-server es más rápido que browser-to-server

## 2. Score gauge animation

**Opciones:**
- A) SVG con `stroke-dashoffset` animado + counter numérico
- B) Librería de gauge (recharts, etc.)
- C) CSS puro con `conic-gradient`

**Decisión:** Opción A (SVG custom). Razones:
- 0 dependencias externas (consistencia con "sin librería UI")
- Control total del easing (`1 - Math.pow(1 - t, 3)` cubic ease-out)
- `prefers-reduced-motion` respeta accesibilidad
- ~40 líneas de código, testeable

## 3. Layout responsive del resultado

**Opciones:**
- A) Sidebar fijo a la izquierda (score + honesty note), contenido scrollable a la derecha
- B) Stack vertical siempre
- C) Tabs (score | components | keywords | fixes)

**Decisión:** Opción A con breakpoint. Razones:
- Desktop (≥lg): sidebar sticky a la izquierda, contenido scrollable
- Mobile: stack vertical, sidebar arriba
- El score gauge es el hero visual — siempre visible al hacer scroll

## 4. Keyword cloud rendering

**Opciones:**
- A) Grid de 3 columnas (present/partial/missing) con pills de color
- B) Nube visual tipo tag cloud con pesos variables
- C) Lista simple con iconos

**Decisión:** Opción A (grid 3 columnas). Razones:
- Más escaneable que una nube visual (el usuario busca "qué me falta")
- Pills con color coding (verde/amarillo/rojo) comunican estado instantáneamente
- Responsive: 3 col en desktop, 1 col en mobile

## 5. Error handling strategy

**Opciones:**
- A) Toast notifications para errores
- B) Inline error messages bajo el form
- C) Error page dedicada

**Decisión:** Opción B (inline bajo el form). Razones:
- El error siempre está cerca de la acción que lo causó
- Sin dependencia de librería de toasts
- 429 tiene copy honesta: "El análisis determinista sigue disponible"
- Network errors tienen copy amigable: "Revisa tu conexión"

## 6. Demo data approach

**Opciones:**
- A) Hardcodear CV y vacante de ejemplo en el componente
- B) Archivo separado `lib/utils/demo-data.ts` con datos realistas
- C) Fetch de un endpoint que sirva datos de ejemplo

**Decisión:** Opción B (archivo separado). Razones:
- Datos realistas (perfil tech colombiano) que demuestran el valor del producto
- Separado del componente para facilitar actualización
- Sin costo de red (v0 sin persistencia)
- El CV de ejemplo muestra skills tech que el scoring engine reconoce bien

## 7. Animation strategy

**Opciones:**
- A) CSS animations con `@keyframes` + `animation-delay` escalonado
- B) Framer Motion o librería de animación
- C) Sin animaciones

**Decisión:** Opción A (CSS puro). Razones:
- 0 dependencias
- `rise` animation con `animationDelay` escalonado da sensación de progresión
- `prefers-reduced-motion` desactiva todas las animaciones
- Performance: CSS animations son offloaded al compositor
