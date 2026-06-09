# Quickstart: 008-web-observability-web

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Research:** [./research.md](./research.md)

## Setup local

```bash
cd BuildCv-web
pnpm install                # instala web-vitals + react-error-boundary (2 nuevas deps)
pnpm dev                    # http://localhost:3000
```

## Verificación de gates (6 obligatorios)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
cd .. && bash scripts/constitution-check.sh
```

Los 6 deben pasar con 0 errores antes de commit.

## Verificación manual del dev overlay

### 1. Dev overlay visible en dev

1. `pnpm dev` (dev mode)
2. Abrir `http://localhost:3000/`
3. Inspeccionar: NO debe haber overlay visible (no hay errores aún)
4. Abrir DevTools → Console
5. Ejecutar: `throw new Error("test manual")`
6. **Esperado**: el dev overlay aparece en la esquina inferior derecha con "test manual"

### 2. Dev overlay oculto en producción

1. `pnpm build && pnpm start` (production mode)
2. Abrir `http://localhost:3000/`
3. Inspeccionar: el código del dev overlay NO debe estar en el bundle (grep verificable)
4. Tirar un error en consola: el overlay NO debe aparecer
5. Pero el error SÍ debe loggearse a `console.error` (contexto estructurado)

### 3. ErrorBoundary captura errores de React

1. Crear un componente temporal de testing:
   ```tsx
   // app/test-error/page.tsx
   "use client";
   export default function TestError() {
     throw new Error("test boundary");
   }
   ```
2. Envolverlo en `<ErrorBoundary>` (si no lo está ya) en una página de prueba
3. Navegar a `/test-error`
4. **Esperado**: el fallback UI se muestra con el error, el `error-reporter` loggea, DevTools muestra el error estructurado

### 4. Web Vitals se reportan

1. Abrir `http://localhost:3000/`
2. Abrir DevTools → Console
3. Recargar la página
4. Esperar 5-10 segundos (LCP se estabiliza)
5. **Esperado**: ver líneas como `[BuildCv WebVital] LCP=1234 rating=good id=...`

### 5. BFF opcional `/api/log`

#### Default (BFF OFF)

1. `pnpm dev` sin env vars
2. Tirar un error
3. **Esperado**: solo `console.error`. NO request HTTP a `/api/log`.

#### BFF ON (activar)

1. Crear `.env.local` con `BUILDCV_LOG_ENDPOINT=enabled`
2. Reiniciar `pnpm dev`
3. Tirar un error
4. **Esperado**: ver POST a `/api/log` en DevTools → Network
5. `curl -sS http://localhost:3000/api/log` retorna el log en JSON

### 6. Deduplicación

1. Abrir DevTools → Console
2. Ejecutar 5 veces: `setTimeout(() => { throw new Error("spam") }, 100)`
3. **Esperado**: solo 1 console.error (no 5). El log dice `dedupeCount: 5`.

### 7. 0 third-party scripts

1. Abrir DevTools → Network
2. Recargar la página
3. Filtrar requests a dominios externos (no localhost, no buildcv.co)
4. **Esperado**: 0 requests externos

## Verificación con tests E2E

```bash
pnpm test:e2e e2e/observability.spec.ts
```

**Esperado**: 6+ tests verdes, incluyendo:
- Dev overlay visible en dev con error simulado
- Dev overlay NO visible en prod
- 0 requests a third-party dominios
- Web Vitals se reportan a console
- Dedupe funciona
- BFF ON/OFF funciona

## Verificación del bundle size

```bash
pnpm build
# Output incluye los chunks generados. Verificar:
# - web-vitals: ~5 KB
# - react-error-boundary: ~3 KB
# - lib/observability + components/observability: ~20-25 KB
# Total: <30 KB (target NFR-047)
```

## Smoke test del flujo completo

1. Landing → /analizar → score → adapt → diff → back to landing
2. NO hay console errors en navegación normal (NFR-050)
3. Web Vitals se reportan al menos una vez por sesión
4. 0 cookies creados (verificar DevTools → Application → Cookies)
5. 0 third-party requests (verificar DevTools → Network → dominios)

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| Dev overlay no aparece en dev | `process.env.NODE_ENV !== "development"` | Verificar que `pnpm dev` no se ejecutó como `NODE_ENV=production pnpm dev` |
| Dev overlay aparece en prod | Bug en el chequeo de NODE_ENV | Test E2E debe detectar esto |
| Web Vitals no se reportan | Hook no se monta | Verificar que `<WebVitalsReporter />` está en `app/layout.tsx` |
| BFF retorna 400 | Payload inválido (Zod) | Test el shape con curl + jq |
| 5 errores idénticos spameando consola | Bug en dedupe | Test debe verificar solo 1 console.error |
| 0 console errors pero sí warnings | Console.error es solo para errores, no warnings | Esperado |

## Comandos útiles

```bash
# Solo el sprint actual
pnpm test --run e2e/observability.spec.ts
pnpm test --run lib/observability/ components/observability/

# Watch mode
pnpm test --watch lib/observability/

# Ver el BFF en acción
BUILDCV_LOG_ENDPOINT=enabled pnpm dev
# En otra terminal:
curl -sS http://localhost:3000/api/log | jq .

# Forzar un error en cualquier página (DevTools)
# (() => { throw new Error("test") })()
```

## Privacy checklist

Antes de mergear, verificar:

- [ ] `rg "sentry|posthog|mixpanel|amplitude|ga\.|google-analytics|gtag|hotjar|fullstory|logrocket|datadog|newrelic" BuildCv-web/` retorna 0 matches en código de prod
- [ ] `cat BuildCv-web/.env.local.example` (si existe) NO contiene third-party API keys
- [ ] El dev overlay dice prominentemente "Errores locales (no se envían a terceros)"
- [ ] El BFF está OFF por default (env `BUILDCV_LOG_ENDPOINT` no seteada)
- [ ] Test E2E verifica que no hay requests a dominios externos
- [ ] Bundle size: `pnpm build` y verificar chunks de `web-vitals` y `react-error-boundary` (~8 KB total)

## Próximo sprint

Cuando este esté cerrado:
- 008-observability-api (backend) — deferido, sin spec
- O v1 features (009/010/011) — bloqueadas por Constitution Art. IX
- O polish adicional (Lighthouse a11y fix del text-faint warning pre-existente)
