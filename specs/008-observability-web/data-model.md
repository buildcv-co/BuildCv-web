# Data Model: 008-web-observability-web

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Research:** [./research.md](./research.md)

## Overview

Este sprint introduce **2 tipos de log** (LogEntry para errores, WebVitalsEntry para métricas) y un store en memoria. Cero tipos de dominio (no se tocan `lib/api/types.ts`, `lib/editor/types.ts`, `lib/storage/types.ts`).

```
Error de cliente
    ↓
reportError(error, options)
    ↓
LogEntry (contexto, dedupe, redact?)
    ↓
console.error (siempre) + POST /api/log (si BFF enabled)
    ↓
In-memory Map (FIFO 100)
    ↓
GET /api/log (debug, dev only)
```

---

## 1. `LogLevel` (en `lib/observability/types.ts`)

```typescript
export type LogLevel = "error" | "warning" | "info";
```

---

## 2. `LogContext` (en `lib/observability/types.ts`)

```typescript
export interface LogContext {
  readonly url: string;                 // window.location.href
  readonly userAgent: string;          // navigator.userAgent
  readonly viewport: {
    readonly width: number;             // window.innerWidth
    readonly height: number;            // window.innerHeight
  };
  readonly appVersion: string;         // from package.json (build-time injected)
  readonly buildSha: string;           // from env (build-time injected)
  readonly locale: string;              // navigator.language
}
```

---

## 3. `LogEntry` (en `lib/observability/types.ts`)

```typescript
export interface LogEntry {
  readonly timestamp: string;            // ISO 8601
  readonly level: LogLevel;
  readonly message: string;
  readonly stack?: string;                // error.stack
  readonly context: LogContext;
  readonly componentStack?: string;       // React-specific (ErrorBoundary only)
  readonly dedupeKey?: string;            // message::url
  readonly dedupeCount?: number;           // how many times seen in dedupe window
}
```

---

## 4. `WebVitalsEntry` (en `lib/observability/types.ts`)

```typescript
export type WebVitalName = "LCP" | "FID" | "CLS" | "INP" | "TTFB" | "FCP";
export type WebVitalRating = "good" | "needs-improvement" | "poor";
export type NavigationType = "navigate" | "reload" | "back-forward" | "prerender";

export interface WebVitalsEntry extends Omit<LogEntry, "level" | "stack" | "componentStack"> {
  readonly level: "info";
  readonly metric: WebVitalName;
  readonly value: number;
  readonly rating: WebVitalRating;
  readonly id: string;
  readonly navigationType: NavigationType;
}
```

---

## 5. Zod schemas (en `app/api/log/route.ts`, para validación BFF)

```typescript
import { z } from "zod";

export const LogContextSchema = z.object({
  url: z.string().url(),
  userAgent: z.string().max(500),
  viewport: z.object({
    width: z.number().int().min(0).max(10000),
    height: z.number().int().min(0).max(10000),
  }),
  appVersion: z.string().max(50),
  buildSha: z.string().max(50),
  locale: z.string().max(20),
});

export const LogEntrySchema = z.object({
  timestamp: z.string().datetime(),
  level: z.enum(["error", "warning", "info"]),
  message: z.string().min(1).max(2000),
  stack: z.string().max(10_000).optional(),
  context: LogContextSchema,
  componentStack: z.string().max(10_000).optional(),
  dedupeKey: z.string().max(500).optional(),
  dedupeCount: z.number().int().min(1).max(1000).optional(),
});
```

---

## 6. `InMemoryLogStore` (en `lib/observability/log-store.ts`)

```typescript
import type { LogEntry } from "./types";

const MAX_ENTRIES = 100;
const STORE: LogEntry[] = [];

export const logStore = {
  add(entry: LogEntry): void {
    STORE.push(entry);
    if (STORE.length > MAX_ENTRIES) STORE.shift();
  },
  getAll(): ReadonlyArray<LogEntry> {
    return [...STORE];
  },
  clear(): void {
    STORE.length = 0;
  },
  size(): number {
    return STORE.length;
  },
} as const;
```

**No es una clase**: es un singleton con funciones puras. `STORE` se reinicia con el proceso. **NO** se persiste en disco, **NO** se envía a third-party.

---

## 7. Validación runtime

- **Tests unit**: Zod schemas validan el shape de los builders/helpers.
- **Runtime en prod**: NO usamos Zod en hot path. La validación es solo en el BFF (entrada de red). En el cliente, los tipos TypeScript + readonly son suficientes.
- **Rich Results / a11y**: el dev overlay usa `role="alert"` + `aria-live="polite"` (validado con E2E).

---

## 8. Versionado

- **`LogEntry` schema**: si schema.org o Google Web Vitals agregan métricas nuevas, bumpear MINOR. El campo `metric: WebVitalName` es union literal, agregar uno nuevo requiere migración.
- **`logStore.MAX_ENTRIES`**: constante, no cambia entre versiones.
- **BFF endpoint**: `/api/log` es estable. Si en v1 se quiere `/api/log/v2`, convive con el viejo.

## Resumen de tipos

| Tipo | Archivo | Propósito |
|---|---|---|
| `LogLevel` | `lib/observability/types.ts` | nivel del log (error/warning/info) |
| `LogContext` | `lib/observability/types.ts` | contexto (URL, userAgent, viewport, etc.) |
| `LogEntry` | `lib/observability/types.ts` | entrada genérica |
| `WebVitalName` | `lib/observability/types.ts` | unión literal de métricas |
| `WebVitalRating` | `lib/observability/types.ts` | good/needs-improvement/poor |
| `WebVitalsEntry` | `lib/observability/types.ts` | entrada de Web Vitals |
| `LogContextSchema` | `app/api/log/route.ts` | Zod schema (validación BFF) |
| `LogEntrySchema` | `app/api/log/route.ts` | Zod schema (validación BFF) |
| `logStore` | `lib/observability/log-store.ts` | singleton en memoria |

Cero cambios en `lib/api/types.ts`, `lib/editor/types.ts`, `lib/storage/types.ts`.
