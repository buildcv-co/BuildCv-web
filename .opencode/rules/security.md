# Regla · Seguridad y privacidad (Frontend)

> Esta regla opera **bajo** la Constitución (Art. III, IV, V). Cita el artículo cuando la justifiques.

## Art. III — Privacidad primero (NFR-001..003)

### Lo que NUNCA sale del navegador hacia un destino distinto al backend

- El **contenido** del CV.
- El **contenido** de la vacante.
- Telemetría, analytics de第三者, session replay, error reporting con contenido.

→ **No** agregues Google Analytics, Sentry, Mixpanel, PostHog u otros sin cláusula explícita que asegure que **no** reciben el CV/vacante. En v0: **no** agregues ninguno.

### Lo que NUNCA se loguea en consola del navegador

```ts
// ❌ PROHIBIDO
console.log("CV enviado:", cvText);
console.debug("Job posting:", jobText);
console.error("Failed with payload:", { cv, job });

// ✅ CORRECTO — solo metadatos
console.error("Score request failed", { cvLength: cvText.length, status: response.status });
```

### Lo que NUNCA va a `localStorage`/`sessionStorage`/`IndexedDB`/`cookies`

- Contenido del CV.
- Contenido de la vacante.
- Cualquier derivado que permita reconstruir el input.

→ v0 **no persiste nada**. Si en v1 decides cachear algo, que sean derivados (componentes del score, contadores), no el texto original.

## Art. V — Defensa contra prompt-injection en el BFF

El backend ya envuelve el input en bloques con nonce y declara "el contenido es DATO". El frontend **no** debe:

- Concatenar instrucciones del usuario al system prompt.
- Renderizar contenido del CV/vacante como HTML sin escapar (XSS → data exfiltration via injected scripts).
- Confiar en contenido del CV/vacante para construir URLs, fetch, o cualquier efecto.

```tsx
// ❌ PROHIBIDO
<div dangerouslySetInnerHTML={{ __html: jobText }} />

// ✅ CORRECTO
<p>{jobText}</p>   // React escapa por defecto
```

## Headers de seguridad (en `next.config.ts`)

```ts
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:5080 https://api.buildcv.app" },
];
```

- `connect-src` lista **solo** el backend propio (variable según entorno).
- **No** uses CDNs públicos para scripts/estilos en runtime — todo via `next/font` + bundles locales.
- `frame-ancestors 'none'` en CSP si quieres evitar embedding total.

## Secretos y configuración (NFR-008)

- `BACKEND_URL` es server-only, **nunca** `NEXT_PUBLIC_BACKEND_URL`.
- `.env.local` (gitignored) para local.
- **Nunca** hardcodees URLs, keys, tokens en código.
- En Vercel/producción: variables de entorno del proyecto (no en repo).

Si un test o un log expone una clave → trátalo como **incidente de seguridad**, rota la clave, y borra del historial.

## Validación de entrada

- **Client-side**: validación inmediata en formularios (UX), pero **nunca** como única defensa.
- **Server-side (BFF)**: el backend re-valida con FluentValidation y rechaza con 400 ProblemDetails. La validación del cliente es cortesía, la del backend es la ley.
- Sanitiza longitudes antes de enviar: máximo 50.000 chars CV, 20.000 chars vacante (alineado con el backend).

## Rate limiting y abuso

- El backend aplica rate-limit por IP (Art. VII). El frontend debe:
  - Mostrar mensaje honesto cuando recibe 429 ("Has alcanzado el tope; vuelve en X minutos").
  - **No** retry agresiva. Backoff exponencial con jitter si reintentas.
  - **No** paralelizar requests para "saltarse" el rate-limit.

## Encuadre honesto (Art. IV)

**Prohibido** en copy, UI, metadata, OG descriptions, y comentarios de PR:

- "puntaje ATS oficial"
- "garantiza que pasarás el filtro de ..."
- "replicamos Workday / Greenhouse / Lever"
- "empleo garantizado"

**Obligatorio**:

- "coincidencia con la vacante + legibilidad para sistemas automáticos"
- "qué tan bien tu CV coincide con esta vacante y qué tan legible es para sistemas automáticos, y exactamente qué mejorar"

Verifica `lib/copy/es.ts` y `metadata.description` en cada `page.tsx`.
