# Quickstart: 007-web-landing-ui

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Contracts:** [./contracts/metadata.ts](./contracts/metadata.ts)

## Setup local

```bash
cd BuildCv-web
pnpm install                # ya hecho
pnpm dev                    # http://localhost:3000
```

## Verificación de gates (6 obligatorios)

```bash
# 1. Lint
pnpm lint

# 2. Typecheck
pnpm typecheck

# 3. Unit tests
pnpm test

# 4. E2E tests
pnpm test:e2e

# 5. Build
pnpm build

# 6. Constitution check (corre desde la raíz del monorepo)
cd .. && bash scripts/constitution-check.sh
```

Los 6 deben pasar con 0 errores antes de commit.

## Verificación manual del landing

### 1. SEO técnico

```bash
# Metadata en el HTML
curl -sS http://localhost:3000/ | grep -E "<title>|<meta name=\"description\"|<meta property=\"og:|<meta name=\"twitter:"

# JSON-LD presente
curl -sS http://localhost:3000/ | grep -A 30 'application/ld+json' | head -50

# sitemap.xml
curl -sS http://localhost:3000/sitemap.xml

# robots.txt
curl -sS http://localhost:3000/robots.txt
```

**Esperado**:
- `<title>BuildCv · Tu CV, medido con honestidad</title>`
- `<meta name="description" content="...">` con la descripción del producto
- OG tags (`og:title`, `og:description`, `og:url`, `og:type=website`)
- Twitter cards (`twitter:card=summary_large_image`, `twitter:title`, etc.)
- JSON-LD con `@graph` conteniendo Organization, WebSite, SoftwareApplication, FAQPage
- sitemap.xml con 7 URLs (incluyendo `/`, `/analizar`, etc.)
- robots.txt con `Allow: /` y `Sitemap: https://buildcv.co/sitemap.xml`

### 2. 404 page

```bash
curl -sS -o /dev/null -w "%{http_code}" http://localhost:3000/ruta-inexistente
# Esperado: 404
```

**Manual**: navegar a `http://localhost:3000/ruta-inexistente`. Debe mostrar:
- Título "Página no encontrada"
- Detalle en español
- 2 CTAs: "Volver al inicio" (a `/`) y "Ir a /analizar" (a `/analizar`)
- Mismo header/footer que el landing (consistencia visual)
- `lang="es-CO"` en `<html>`

### 3. Error boundary (testing)

Para forzar un error en un componente de cliente:
1. Crear un componente temporal con `throw new Error("test")` en el render
2. Navegar a la página
3. Verificar que se muestra la UI de error, no pantalla blanca

**Alternativa sin modificar código**: en Next.js dev, navegar a una ruta con params inválidos que cause error en el server component.

### 4. FAQ interactiva

1. Navegar a `http://localhost:3000/`
2. Scroll hasta la sección FAQ
3. Click en una pregunta
4. Verificar que se expande/colapsa
5. Verificar navegación por teclado (Tab a la pregunta, Enter para expandir)

### 5. Trust signals

1. Navegar a `http://localhost:3000/`
2. Scroll al footer
3. Verificar badges:
   - "Código abierto" → link a `https://github.com/buildcv-co/BuildCv-web` en nueva pestaña
   - "Constitution v1.1.0 ratificada" → texto
   - "540 tests automatizados · 0 supresiones" → texto
4. Click en "Código abierto" → abre nueva pestaña a GitHub

### 6. Nav con aria-current

1. Navegar a `http://localhost:3000/`
2. Inspeccionar el nav: el item "Inicio" tiene `aria-current="page"`
3. Navegar a `http://localhost:3000/analizar`
4. Inspeccionar el nav: el item "Analizar" tiene `aria-current="page"`, "Inicio" no

### 7. prefers-reduced-motion

1. macOS: System Preferences → Accessibility → Display → Reduce motion
2. Recargar el landing
3. Verificar que no hay animaciones de scroll ni transiciones largas

## Verificación de Lighthouse

Lighthouse corre mejor en producción (build + start):

```bash
pnpm build
pnpm start  # puerto 3000
```

Luego en Chrome DevTools → Lighthouse:
- Categoría: Performance, Accessibility, Best Practices, SEO
- Device: Mobile
- Click "Analyze page load"

**Targets** (G-1, G-2, G-3, G-4):
- Performance ≥ 90
- Accessibility ≥ 95
- Best Practices ≥ 95
- SEO ≥ 95

## Verificación de JSON-LD con Google Rich Results

1. Ir a https://search.google.com/test/rich-results
2. Pegar la URL de producción (o `http://localhost:3000/` si lo corres público con ngrok)
3. Click "Test URL"
4. **Esperado**: 0 errors, 0 warnings, 4 schemas detectados:
   - Organization ✅
   - WebSite ✅
   - SoftwareApplication ✅
   - FAQPage ✅ (con sus Question/Answer)

## Verificación de sitemap

1. Ir a https://www.xml-sitemaps.com/validate-xml-sitemap.html
2. Pegar `https://buildcv.co/sitemap.xml` (o el output de curl)
3. **Esperado**: XML válido, 7 URLs, formato correcto

## Verificación de robots.txt

1. Ir a https://support.google.com/webmasters/answer/6062598 (Google tool) o manualmente:
2. Confirmar que `User-agent: *` con `Allow: /`
3. Confirmar que `Sitemap: https://buildcv.co/sitemap.xml`

## Smoke test del flujo completo

1. Landing → click "Analizar mi CV" → llega a `/analizar`
2. En `/analizar`, paste un CV y una vacante → click "Analizar" → ve el score
3. Click "Adaptar con IA" → ve la adaptación
4. Click "Ver diff" (cuando exista el botón, sprint 4b) → ve el diff viewer
5. En cualquier punto, verificar que el nav marca la sección activa con `aria-current="page"`

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| JSON-LD no aparece en el HTML | `next/script` no se inyecta | Verificar que el componente use `next/script` y no `<script>` directo |
| sitemap.xml 404 | `app/sitemap.ts` no exporta default function | Verificar export default |
| robots.txt 404 | `app/robots.ts` no exporta default | Verificar export default |
| 404 page no aparece en `/ruta-inexistente` | `app/not-found.tsx` no existe | Crear el archivo |
| Error boundary no captura error | Error en server component | Usar `app/error.tsx` (client) |
| Global error no se muestra | Error en root layout | Usar `app/global-error.tsx` con `<html>` y `<body>` |
| Lighthouse score bajo en dev | HMR + DevTools bajan score | Correr en producción (`pnpm build && pnpm start`) |
| FAQ no se expande | `<details>` no usado correctamente | Verificar uso nativo HTML5, no librería |
| aria-current no aparece | Función `isActive()` mal escrita | Verificar path matching |

## Comandos útiles

```bash
# Solo el sprint actual
pnpm test --run e2e/landing.spec.ts

# Solo los nuevos unit tests
pnpm test --run components/landing/ lib/seo/

# Watch mode para un archivo
pnpm test --watch components/landing/faq-section.test.tsx

# Build de producción local
pnpm build && pnpm start
```

## Próximo sprint

Cuando este esté cerrado:
- 008-observability-web (sin spec, requiere spec + impl)
- O polish adicional (axe-core en CI, perf budget, etc.)
- O v1 features (009/010/011 — bloqueadas por Constitution Art. IX)
