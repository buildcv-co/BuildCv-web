# Regla · Frontend Next.js 16

> Esta regla opera **bajo** la Constitución (Art. III, IV). Cita el artículo cuando la justifiques.

## Stack y comandos (CI los corre)

```bash
pnpm install --frozen-lockfile        # CI estricto; local puede omitir --frozen-lockfile
pnpm dev                              # http://localhost:3000
pnpm lint                             # ESLint flat config + TS
pnpm build                            # next build (verifica compilación + tipos)
```

**Versiones fijadas** en `package.json`: Next 16.2.7, React 19.2.4, TS ^5 strict, Tailwind v4, pnpm 11. No subas versiones sin planificar.

## Estructura BFF (Browser → same-origin → Backend)

```
Browser ──same-origin──> app/api/* (Route Handlers) ──server-to-server──> .NET Backend (:5080)
```

- **El navegador NUNCA habla directo con el backend.** Todo pasa por `app/api/*/route.ts` que oculta el endpoint real y agrega headers de seguridad.
- `BACKEND_URL` se lee en `lib/api/backend.ts` con default `http://localhost:5080`. En producción, variable de entorno del deploy.
- **No** expongas `BACKEND_URL` al cliente (sería `NEXT_PUBLIC_*`, lo cual está prohibido).

## App Router — Route Handlers

```ts
// app/api/score/route.ts
import { NextResponse } from "next/server";
import { requestScore, ScoreError } from "@/lib/api/score";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await requestScore(body.cvText, body.jobText);
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    if (e instanceof ScoreError) {
      return NextResponse.json(
        { error: { code: e.code, message: e.publicMessage } },
        { status: e.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Error interno." } },
      { status: 500 },
    );
  }
}
```

- Exporta funciones nombradas por verbo: `GET`, `POST`, `PUT`, `DELETE`.
- **No** uses Pages Router (carpeta `pages/`). Todo va en `app/`.
- **No** pongas lógica de negocio en el handler: delega a `lib/`.

## Server Components por defecto, Client solo cuando toca

```tsx
// app/analizar/page.tsx — Server Component
import { Analyzer } from "@/components/analyzer/analyzer";
export default function Page() {
  return <Analyzer />;
}
```

```tsx
// components/analyzer/analyzer.tsx — Client Component (cuando usa useState/effects)
"use client";
```

- Server Components por defecto. Agrega `"use client"` **solo** si usas hooks, eventos o browser APIs.
- **No** importes Server Components desde Client Components.

## Tipos y contratos

- **Contratos HTTP** del backend congelados en `lib/api/types.ts` — cuando cambies el contrato backend, regenera el cliente aquí **primero**, luego actualiza el backend.
- **No** uses `any`. TS strict (`tsconfig.json`) — el build falla si hay `any` implícito.
- **No** `// @ts-ignore` / `// @ts-expect-error` / `// eslint-disable-next-line`. Si el tipo falla, corrige el código.
- Path alias `@/*` apunta a `./*` (definido en `tsconfig.json`).

## Copy y UX

- **Todo texto visible** en `lib/copy/es.ts`. Nunca hardcodees strings en componentes.
- Encuadre honesto (Art. IV): "coincidencia con la vacante + legibilidad para sistemas automáticos". **Nunca** "puntaje ATS oficial" ni "garantía de empleo".
- Idioma: español colombiano (`lang="es-CO"` en `app/layout.tsx`).

## Diseño y estilos

- Tailwind v4 con PostCSS (`@tailwindcss/postcss`). Tema en `app/globals.css` con `@theme`.
- **Sin librería UI externa** (shadcn/ui, Material, etc.). Custom design system.
- Tipografías: **Fraunces** (display) + **Geist** (sans/mono). Definidas en `app/layout.tsx`.
- Tema oscuro cálido (definido en `app/globals.css`).
- **No** `style={{ ... }}` inline para lo que se puede hacer con Tailwind. Inline solo para valores dinámicos (ej. `style={{ width: \`${pct}%\` }}`).

## Fonts y assets

- Fuentes via `next/font` (auto-hospedadas, no Google Fonts runtime).
- Imágenes via `next/image` con `width`/`height` explícitos. Dominios en `next.config.ts` `images.remotePatterns`.
- Favicon en `app/icon.tsx` (generado) o `public/`.

## Metadata y SEO

- `metadata` exportado en cada `page.tsx` y en `layout.tsx` raíz. `title` y `description` obligatorios.
- `openGraph` y `twitter` en layout raíz.
- `robots.ts` y `sitemap.ts` en `app/` para producción.
- Ver regla dedicada `seo` (skill de autoskills).

## Variables de entorno

- `BACKEND_URL` — server-only, sin prefijo `NEXT_PUBLIC_`.
- `.env.local` (gitignored) para local; `.env.example` (commited) documenta las keys necesarias.
- **Nunca** `NEXT_PUBLIC_*` con secretos.

## Errores y observabilidad

- Errores de red/backend se mapean a `ScoreError` con `code`, `status`, `publicMessage` (lo que se muestra al usuario) y `internalMessage` (lo que se loguea server-side).
- **No** `console.error` con contenido del usuario. Solo metadatos: `(cvLength, jobLength, traceId, status)`.
- Logging server-side mínimo (Vercel Functions, etc.) — Art. III.

## Antes de cerrar tarea

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
git status    # solo cambios intencionales
```

Si los 3 comandos pasan + `git status` limpio → listo.
