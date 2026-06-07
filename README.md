# BuildCv · Web (Next.js)

Frontend del asistente de CV **BuildCv**: pega tu hoja de vida + una vacante y obtén un **puntaje de coincidencia y legibilidad** explicable, las palabras clave que faltan y qué arreglar. API en repo aparte: **[BuildCv-api](https://github.com/buildcv-co/BuildCv-api)**.

[![CI](https://github.com/buildcv-co/BuildCv-web/actions/workflows/ci.yml/badge.svg)](https://github.com/buildcv-co/BuildCv-web/actions/workflows/ci.yml) [![License: FSL-1.1-ALv2](https://img.shields.io/badge/license-FSL--1.1--ALv2-2ea44f)](LICENSE.md)

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · diseño propio (tema oscuro cálido, tipografía Fraunces, anillo de puntaje animado). El navegador habla con un **BFF same-origin** (`app/api/*`) que proxyea al backend .NET — el backend nunca se expone directo.

## Desarrollo

Requisitos: **Node 22+ · pnpm 11**. Necesita la API corriendo en `http://localhost:5080`.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm lint
pnpm build
```

El BFF lee `BACKEND_URL` de `.env.local` (ver `.env.example`).

## Deploy (Vercel)

1. Importa este repo en Vercel (detecta Next.js automáticamente).
2. Define la variable de entorno **`BACKEND_URL`** con la URL pública de la API en Render (p. ej. `https://buildcv-api.onrender.com`).
3. Cada push a `main` despliega.

## Licencia

**FSL-1.1-ALv2** ([Functional Source License](https://fsl.software)) — código a la vista: puedes usar, modificar y redistribuir el software para cualquier propósito **que no compita** con BuildCv. Se convierte automáticamente a **Apache 2.0 a los 2 años**. Ver [`LICENSE.md`](LICENSE.md).
