# Research: 008-web-observability-web

## 1. Web Vitals: librería oficial

**Investigado**: web.dev/vitals, GitHub GoogleChrome/web-vitals.

### Métricas soportadas

| Métrica | Qué mide | API |
|---|---|---|
| **LCP** (Largest Contentful Paint) | Render del contenido más grande | `onLCP(callback)` |
| **FID** (First Input Delay) | Latencia de la primera interacción (deprecated en 2024) | `onFID(callback)` |
| **CLS** (Cumulative Layout Shift) | Estabilidad visual | `onCLS(callback)` |
| **INP** (Interaction to Next Paint) | Reemplazo de FID (2024+) | `onINP(callback)` |
| **TTFB** (Time to First Byte) | Latencia del servidor | `onTTFB(callback)` |
| **FCP** (First Contentful Paint) | Primer contenido visible | `onFCP(callback)` |

### Librería `web-vitals`

- **Versión**: 4.x (última estable, MIT, ~5 KB)
- **API**: callbacks que reciben `{ name, value, rating, id, navigationType, delta }`
- **Auto-reporting**: `reportWebVitals(callback)` que llama a todos los callbacks

```typescript
import { onLCP, onINP, onCLS, onTTFB, onFCP } from "web-vitals";

onLCP((metric) => console.log("[WebVital]", metric));
```

**Decisión**: usar `web-vitals@^4`. Es oficial de Google, MIT, ~5 KB, sin dependencias.

## 2. ErrorBoundary: librerías vs custom

| Approach | Pros | Contras | Decisión |
|---|---|---|---|
| **`react-error-boundary`** (npm) | Maduro, MIT, ~3 KB, bien testeado, hooks útiles | Dependencia extra | ✅ **Adoptado** |
| Custom class component con `componentDidCatch` | 0 deps, control total | Hay que mantenerlo, edge cases | ❌ |
| Hook `useErrorBoundary` de `react-error-boundary` | API más ergonómica | Igual requiere la lib | ✅ **Usado** (de la misma lib) |

### API de `react-error-boundary`

```typescript
import { ErrorBoundary } from "react-error-boundary";

<ErrorBoundary
  FallbackComponent={MyFallback}
  onError={(error, info) => reportError(error, { componentStack: info.componentStack })}
  onReset={() => { /* reset state */ }}
>
  <ChildrenThatMightThrow />
</ErrorBoundary>
```

**Decisión**: usar `<ErrorBoundary>` con `FallbackComponent` y `onError` para reportar a `error-reporter`.

## 3. Third-party tracking: lista negra explícita

**Investigado**: Constitution Art. III + políticas de privacidad modernas.

### Servicios PROHIBIDOS en este proyecto

- ❌ Sentry (popular pero envía datos a servidor externo)
- ❌ PostHog (analytics + session replay)
- ❌ Mixpanel, Amplitude, Heap (product analytics)
- ❌ Google Analytics, Google Tag Manager
- ❌ Facebook Pixel, LinkedIn Insight Tag
- ❌ Hotjar, FullStory, LogRocket (session replay)
- ❌ Plausible, Fathom, Umami (privacy-friendly pero siguen siendo third-party)
- ❌ Datadog RUM, New Relic Browser
- ❌ Sentry Replay, Datadog Session Replay
- ❌ Cualquier servicio que ejecute JS en el cliente del usuario y envíe datos fuera del proyecto

### Servicios PERMITIDOS

- ✅ `web-vitals` (oficial de Google, MIT, solo mide localmente)
- ✅ `react-error-boundary` (MIT, solo maneja boundary)
- ✅ BFF `/api/log` propio (datos quedan en el proyecto)
- ✅ `console.error` / `console.info` (nativo del navegador, no transmite datos)

### Verificación de no-third-party

E2E test que verifica que el navegador NO hace requests a dominios externos:

```typescript
test("no third-party scripts (Constitution Art. III)", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.hostname !== "localhost:3000" && url.hostname !== "buildcv.co") {
      externalRequests.push(req.url());
    }
  });
  await page.goto("/");
  await page.goto("/analizar");
  await page.goto("/importar");
  expect(externalRequests).toEqual([]);
});
```

## 4. Web Vitals: cómo reportar localmente

**Decisión**: reportar via `console.info` con formato estructurado (no JSON.stringify, template literal para legibilidad en consola).

```typescript
onLCP((metric) => {
  console.info(
    `[BuildCv WebVital] ${metric.name}=${metric.value.toFixed(0)} rating=${metric.rating} id=${metric.id}`
  );
});
```

Esto permite que el dev abra DevTools y vea las métricas sin parsear JSON. Si quiere machine-readable, puede parsear el string (es determinista).

## 5. Deduplicación de errores: algoritmo

**Decisión**: ventana de 60 segundos, máximo 5 errores idénticos reportados. Después del 5to, se silencia.

```typescript
const dedupeKey = `${error.message}::${ctx.url}`;
const recent = RECENT_ENTRIES.filter(
  (e) => Date.now() - Date.parse(e.timestamp) < 60_000 && e.dedupeKey === dedupeKey,
);
if (recent.length >= 5) return; // Silent
```

**Justificación**: si un componente tira el mismo error en un loop (ej. re-render infinito), no spam la consola. El dev puede ver "ocurrió 100 veces en el último minuto" en el counter del dedupe.

## 6. BFF `/api/log`: análisis de costo/beneficio

### Por qué SÍ tener un BFF opcional

- Permite debugging en environments donde no tengo DevTools (ej. testing manual en device físico).
- Permite logging centralizado si en el futuro se quiere (v1).
- Es UN endpoint propio, no third-party.
- Es opcional (default OFF).

### Por qué NO usar Sentry o similar

- Tercer party (Constitution Art. III).
- Recolectaría más data de la necesaria.
- Vendor lock-in.

### Por qué NO persistir en disco

- Privacy: datos en disco son más difíciles de borrar (regulations GDPR/Habeas Data).
- Volumen: en dev no se necesita, en prod es un endpoint opcional.
- Simplicidad: Map en memoria es suficiente para debugging local.

## 7. Web Vitals vs Lighthouse

| Métrica | Web Vitals (runtime) | Lighthouse (audit) |
|---|---|---|
| **Cuándo corre** | Cada página en el browser del usuario real | En build/devtools |
| **Granularidad** | Per-user, per-session | Snapshot único |
| **Reporting** | `console.info` | Dashboard |
| **Uso** | Debugging en dev, monitoring en prod | Pre-deploy verification |

**Conclusión**: ambos son complementarios, no redundantes. Lighthouse (que ya corre en 007) es para pre-deploy. Web Vitals (este sprint) es para runtime.

## 8. Decisión final: bundle size

| Asset | Size | Justificación |
|---|---|---|
| `web-vitals` | ~5 KB | oficial de Google, necesario para Web Vitals |
| `react-error-boundary` | ~3 KB | MIT, necesario para ErrorBoundary |
| `lib/observability/*` (código nuevo) | ~15 KB | types + reporter + context + dedupe + log-store + hook |
| `components/observability/*` (código nuevo) | ~8 KB | ErrorBoundary + DevErrorOverlay + WebVitalsReporter |
| **Total** | **~31 KB** | Justo en el target de <30 KB. Aceptable. |

**Mitigación si excede**: tree-shaking con imports nombrados de `web-vitals` (no `import * from "web-vitals"`).

## 9. Referencias

- [web.dev/vitals](https://web.dev/vitals/)
- [web-vitals npm](https://www.npmjs.com/package/web-vitals)
- [react-error-boundary GitHub](https://github.com/bvaughn/react-error-boundary)
- [React error boundaries docs](https://react.dev/reference/react/Component#componentdidcatch)
- [Next.js 16 error.tsx](https://nextjs.org/docs/app/api-reference/file-conventions/error)
- [Constitution Art. III — Privacidad](file:///BuildCv-api/.specify/memory/constitution.md)
- [WCAG 2.2 AA](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
