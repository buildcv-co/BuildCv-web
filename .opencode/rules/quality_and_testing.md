# Regla · Calidad y testing (Frontend)

> Esta regla opera **bajo** la Constitución (Art. II, IV). Cita el artículo cuando la justifiques.

## Cero supresiones (regla global)

**PROHIBIDO**, sin excepciones:

```ts
// @ts-ignore
// @ts-expect-error
// eslint-disable-next-line ...
/* eslint-disable */
```

**Única excepción justificada:** en `next.config.ts` cuando un type de Next.js 16 todavía no está estabilizado, con comentario que cite el issue upstream y fecha. Aprobación en el PR.

> "Si hay un error: CORRÍGELO. Nunca lo silencies."

## TypeScript strict — sin `any`

`tsconfig.json` ya tiene `strict: true`. Esto activa:

- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `alwaysStrict`
- `useUnknownInCatchVariables`

**No** uses `any`. Si no conoces el tipo, usa `unknown` y valida (zod, valibot, o type guards manuales).

```ts
// ❌ PROHIBIDO
function parseInput(data: any) { return data.cvText; }

// ✅ CORRECTO
function parseInput(data: unknown) {
  if (typeof data === "object" && data !== null && "cvText" in data) {
    return String((data as { cvText: unknown }).cvText);
  }
  throw new Error("Invalid input");
}
```

## ESLint

`eslint.config.mjs` usa `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`. Si una regla es molesta:

1. Arregla el código.
2. Si es un falso positivo real, documenta el `// eslint-disable-next-line` con razón.
3. **Nunca** desactives reglas a nivel proyecto para silenciar errores.

## Estructura de componentes

```tsx
// components/analyzer/input-panel.tsx
"use client";

import { useState } from "react";
import { COPY } from "@/lib/copy/es";

interface InputPanelProps {
  onSubmit: (cv: string, job: string) => void;
  loading: boolean;
}

export function InputPanel({ onSubmit, loading }: InputPanelProps) {
  const [cv, setCv] = useState("");
  const [job, setJob] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(cv, job);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}
```

- **Un componente por archivo**, exportado como `export function` (no `export default` excepto en `page.tsx`).
- Props tipadas explícitamente con `interface` o `type`. **No** `React.FC` (heredaba children implícito, propenso a bugs).
- **No** lógica de negocio dentro del JSX. Helpers y handlers extraídos.

## Naming

- Componentes: `PascalCase` (`ScoreGauge`).
- Hooks: `useCamelCase` (`useScore`).
- Utils: `camelCase` (`formatPct`).
- Constantes: `UPPER_SNAKE_CASE` (`MAX_CV_LENGTH`).
- Archivos: `kebab-case.tsx` para componentes largos, `PascalCase.tsx` también aceptable para componentes hoja. **Consistencia** > preferencia.
- Tipos: `PascalCase` (`ScoreResponse`).

## Copy y constantes

- Strings de UI en `lib/copy/es.ts` agrupados por feature:

```ts
// lib/copy/es.ts
export const COPY = {
  analyzer: {
    title: "Analiza tu CV contra una vacante",
    submit: "Calcular coincidencia",
    error: { network: "No pudimos conectar. Intenta de nuevo." },
  },
  // ...
} as const;
```

- Constantes mágicas (límites, timeouts) en `lib/constants.ts` con `as const`.

## Accesibilidad (WCAG 2.2)

- **Skip link** en `app/layout.tsx` saltando al `<main>`.
- Landmarks semánticos: `<header>`, `<nav>`, `<main>`, `<footer>`.
- Forms con `<label htmlFor>` explícito, **no** `<div>` con texto.
- Imágenes con `alt` (vacío si decorativa).
- Focus visible (no `outline: none` sin reemplazo).
- `aria-live="polite"` en regiones de resultado.
- Contraste mínimo 4.5:1 en texto, 3:1 en UI.
- Ver skill `accessibility` (autoskills) para auditoría profunda.

## SEO (meta y structured data)

- Cada `page.tsx` exporta `metadata`.
- `app/sitemap.ts` y `app/robots.ts` para producción.
- JSON-LD en páginas relevantes (Organization, WebSite, BreadcrumbList).
- Ver skill `seo` (autoskills) para auditoría profunda.

## Testing (cuando llegue)

- **Vitest** + **@testing-library/react** es la elección natural para Next 16.
- Tests unitarios de lógica (`lib/`) sin render.
- Tests de componentes con `@testing-library/react` y queries semánticas (`getByRole` > `getByTestId`).
- Tests E2E con **Playwright** (skill `frontend-design` recomienda browser real).
- TDD cuando toques lógica de scoring client-side o validación de inputs.
- **No** mockear todo el DOM. Mockear solo lo que es IO/red.

## Performance

- Server Components por defecto (zero JS shipped).
- `next/dynamic` para componentes pesados que no son above-the-fold.
- `next/image` siempre (no `<img>`).
- `next/font` siempre (no `<link>` a Google Fonts).
- Bundle analysis con `pnpm build` (revisa output por chunks grandes).
- **No** importes librerías enteras para usar 1 función (`date-fns/locale`, `lodash/some`, etc.).

## Pre-flight de tarea (los 4 obligatorios)

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
git status    # solo cambios intencionales
```

Si los 3 comandos pasan + `git status` limpio → listo.
