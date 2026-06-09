# Implementation Plan: 008-web-observability-web

> **Spec:** [./spec.md](./spec.md) · **Research:** [./research.md](./research.md) · **Data Model:** [./data-model.md](./data-model.md) · **Contracts:** [./contracts/log-payload.ts](./contracts/log-payload.ts)

## Summary

Observabilidad del frontend sin third-party tracking. 2 deps nuevas: `web-vitals` (~5 KB, oficial de Google) y `react-error-boundary` (~3 KB, MIT). Cero Sentry, PostHog, GA, ni nada externo. Privacy por diseño (Constitution Art. III).

## Decisiones arquitectónicas (locked)

1. **2 deps nuevas**:
   - `web-vitals@^4` (oficial de Google, MIT) — Web Vitals API wrapper.
   - `react-error-boundary@^5` (MIT) — `<ErrorBoundary>` component.
2. **Sin third-party**: cero Sentry, PostHog, Mixpanel, GA. Verificado con `rg` post-impl.
3. **BFF `/api/log` opcional**: configurable via env `BUILDCV_LOG_ENDPOINT`. Default OFF. Si OFF, solo `console.error`.
4. **Persistencia en memoria** (Map) — NO disco, NO DB. FIFO 100 entradas.
5. **Deduplicación de errores**: si `error.message + url` ocurre 5 veces en 1 minuto, solo se reporta 1 vez (con counter).
6. **Dev overlay con `process.env.NODE_ENV === "development"`** — NO aparece en prod. Verificado con test E2E.
7. **ErrorBoundary complement a `app/error.tsx`**: app/error.tsx captura errores de Next.js routing. ErrorBoundary captura errores de React render en client components.
8. **Web Vitals via `useReportWebVitals`**: hook que se monta una vez en `app/layout.tsx` (client component wrapper). Reporta a `console.info` estructurado.

## Project Structure

### Archivos a crear

```
lib/
├── observability/
│   ├── types.ts                        # 🆕 LogLevel, LogContext, LogEntry, WebVitalsEntry
│   ├── types.test.ts                   # 🆕 Test
│   ├── error-reporter.ts               # 🆕 Pure function reportError(error, context, redact?)
│   ├── error-reporter.test.ts          # 🆕 Test
│   ├── context.ts                      # 🆕 Pure function buildContext() that reads window
│   ├── context.test.ts                 # 🆕 Test (jsdom)
│   ├── dedupe.ts                       # 🆕 Pure function shouldDedupe(entry, recentEntries)
│   ├── dedupe.test.ts                  # 🆕 Test
│   ├── log-store.ts                    # 🆕 In-memory store (Map) for BFF
│   ├── log-store.test.ts               # 🆕 Test
│   ├── use-report-web-vitals.ts        # 🆕 Hook que usa web-vitals library
│   └── use-report-web-vitals.test.ts   # 🆕 Test

components/
├── observability/
│   ├── error-boundary.tsx              # 🆕 react-error-boundary wrapper con nuestro fallback
│   ├── error-boundary.test.tsx         # 🆕 Test
│   ├── dev-error-overlay.tsx           # 🆕 Panel flotante dev-only
│   ├── dev-error-overlay.test.tsx      # 🆕 Test
│   ├── web-vitals-reporter.tsx         # 🆕 Client component que monta useReportWebVitals
│   └── web-vitals-reporter.test.tsx    # 🆕 Test

app/
├── api/
│   └── log/
│       └── route.ts                    # 🆕 BFF opcional POST/GET
└── (mod) layout.tsx                    # ⚠️ Montar <WebVitalsReporter />

e2e/
└── observability.spec.ts               # 🆕 E2E: error simulado, dev overlay, BFF

components/observability/
└── (test fixture) throw-on-render.tsx   # 🆕 Componente de testing que throw
```

### Archivos modificados

- `package.json`: +web-vitals@^4, +react-error-boundary@^5
- `app/layout.tsx`: agregar `<WebVitalsReporter />` (client component que monta el hook)
- `lib/copy/es.ts`: agregar bloque `observability` con copy del dev overlay y errores

## Detalles de implementación

### `lib/observability/error-reporter.ts`

```typescript
import type { LogContext, LogEntry, LogLevel } from "./types";
import { buildContext } from "./context";
import { shouldDedupe } from "./dedupe";

const RECENT_ENTRIES: LogEntry[] = [];
const DEDUPE_WINDOW_MS = 60_000;
const DEDUPE_MAX = 5;

let bffEnabled = false;

export function enableBffLogging(): void {
  bffEnabled = true;
}

export interface ReportErrorOptions {
  readonly level?: LogLevel;
  readonly context?: Partial<LogContext>;
  readonly componentStack?: string;
  readonly redact?: (message: string) => string;
}

export function reportError(
  error: Error,
  options: ReportErrorOptions = {},
): LogEntry {
  const now = Date.now();
  const ctx: LogContext = { ...buildContext(), ...options.context };
  const message = options.redact ? options.redact(error.message) : error.message;
  const dedupeKey = `${message}::${ctx.url}`;

  // Dedup
  const recent = RECENT_ENTRIES.filter(
    (e) => now - Date.parse(e.timestamp) < DEDUPE_WINDOW_MS && e.dedupeKey === dedupeKey,
  );
  if (recent.length >= DEDUPE_MAX) {
    return recent[0]!; // No re-report
  }

  const entry: LogEntry = {
    timestamp: new Date(now).toISOString(),
    level: options.level ?? "error",
    message,
    stack: error.stack,
    context: ctx,
    componentStack: options.componentStack,
    dedupeKey,
    dedupeCount: recent.length + 1,
  };

  RECENT_ENTRIES.push(entry);
  // Keep at most 100 recent for dedup window
  if (RECENT_ENTRIES.length > 100) RECENT_ENTRIES.shift();

  // Console log (always)
  console.error(`[BuildCv ${entry.level}] ${entry.message}`, {
    timestamp: entry.timestamp,
    context: entry.context,
    stack: entry.stack,
    componentStack: entry.componentStack,
    dedupeCount: entry.dedupeCount,
  });

  // BFF (optional)
  if (bffEnabled && typeof fetch !== "undefined") {
    void fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry),
    }).catch(() => {
      // Fail silently — BFF errors should not break the app
    });
  }

  return entry;
}
```

### `components/observability/dev-error-overlay.tsx`

```typescript
"use client";
import { useEffect, useState } from "react";

interface DevErrorEntry { ... }

declare global {
  interface Window {
    __buildcv_errors?: DevErrorEntry[];
  }
}

export function DevErrorOverlay() {
  if (process.env.NODE_ENV !== "development") return null;
  const [entries, setEntries] = useState<DevErrorEntry[]>([]);
  // Subscribe to global error push
  // ...
}
```

En el dev, los errores se push a `window.__buildcv_errors` y el overlay los lee. **Solo visible en dev**, doble chequeado con `process.env.NODE_ENV`.

### `app/api/log/route.ts`

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { logStore } from "@/lib/observability/log-store";

const LogPayloadSchema = z.object({ ... });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LogPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  logStore.add(parsed.data);
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return NextResponse.json(logStore.getAll());
}
```

`logStore` es un singleton en memoria (Map con FIFO de 100). Se reinicia con el proceso.

## Test plan

### Unit (Vitest + RTL)

- `lib/observability/types.test.ts`: shape checks
- `lib/observability/context.test.ts`: buildContext en jsdom (window.location, navigator, etc.)
- `lib/observability/dedupe.test.ts`: shouldDedupe con varios escenarios (mismo mensaje, ventana expirada, diferente mensaje)
- `lib/observability/error-reporter.test.ts`: reportError loggea, dedup, BFF, redact
- `lib/observability/log-store.test.ts`: add, getAll, FIFO
- `lib/observability/use-report-web-vitals.test.ts`: hook llama web-vitals on mount
- `components/observability/error-boundary.test.tsx`: render fallback on error, reset
- `components/observability/dev-error-overlay.test.tsx`: visible en dev, oculto en prod, dismiss, copy stack
- `components/observability/web-vitals-reporter.test.tsx`: monta el hook
- `lib/copy/es.test.ts`: bloque observability

### E2E (Playwright)

- `e2e/observability.spec.ts`:
  - Dev mode: simular error (via test fixture component), ver dev overlay visible
  - Production: mismo flow, dev overlay NO visible (forzar `process.env.NODE_ENV=production` via test)
  - Web Vitals: cargar página, ver console.info con metric LCP
  - BFF OFF: error loggeado a console, no HTTP request
  - BFF ON (mock): error loggeado + POST a /api/log
  - Dedupe: 5 errores idénticos → solo 1 console.error
  - Console sin errores en navegación normal (landing → /analizar → /importar)
  - **Test Art. III**: no cookies ni third-party scripts (page.on("request") filtra todo lo que no sea el propio dominio)

## Constitution Check

| Art. | Verificación | Estado |
|---|---|---|
| **Art. III** | 0 third-party scripts (rg-verified). 0 cookies. 0 fingerprinting. Logs en memoria, no disco. JSON-LD de 007 declara "no data stored on servers". | ✅ PASS |
| **Art. IV** | UI del dev overlay dice "Errores locales (no se envían a terceros)" prominentemente. Sin claims de AI monitoring. | ✅ PASS |
| **Art. V** | error.message se trata como DATO, no como instrucción. El caller puede usar `redact` para sanitizar. | ✅ PASS |
| **Art. VI** | `lib/observability/` es capa de infraestructura del frontend. Reusable. Testeable. | ✅ PASS |
| **Art. VII** | Sin cuentas, sin opt-in, sin tracking. Funciona out-of-the-box. | ✅ PASS |
| **Art. VIII** | TDD: tests para cada helper y componente. | ✅ PASS |
| **Art. I, II, IX** | No aplicables a observabilidad. | N/A |

## Risks

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Bundle size >30 KB | Baja | Bajo | Solo 2 deps pequeñas (~8 KB total). El resto es código nuevo (~20 KB). |
| Dev overlay visible en prod | Media | Alto | Doble check: `process.env.NODE_ENV === "development"` + test E2E que verifica oculto en prod. |
| BFF endpoint expuesto en prod sin querer | Baja | Medio | Solo se activa si `BUILDCV_LOG_ENDPOINT=enabled` env var. Default OFF. |
| Dedupe window incorrecta | Baja | Bajo | Test verifica el comportamiento con varios escenarios. |
| Web Vitals no se miden en SSR | Alta | N/A | Hook solo corre en cliente. SSR no emite métricas. Es esperado. |
| ErrorBoundary captura errores "fantasma" en Strict Mode | Media | Bajo | Solo loggea (no side effects). |
| Falsa confianza: "logs no se envían a terceros" pero SÍ al BFF | Media | Alto | UI del dev overlay dice "Errores locales (no se envían a TERCEROS — opcionalmente al backend del propio proyecto)". Constitution compliance verificable. |

## Next Phase

→ `tasks.md` — desglose T-008-01..N por fase.
