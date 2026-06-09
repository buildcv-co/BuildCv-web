# Plan: 002-web-score-ui

**Status:** ✅ SHIPPED (commit `ed13890`) | **Backend counterpart:** [../../../BuildCv-api/specs/002-score-engine/](../../../BuildCv-api/specs/002-score-engine/) (✅ SHIPPED)

## Summary

UI del analizador que consume `POST /api/v1/score` del backend (002-score-engine) y muestra el puntaje determinista con desglose de componentes, keywords y recomendaciones. Feature base del producto — todo el flujo de usuario arranca aquí.

## Technical Context

- **Next.js 16.2.7** (App Router) + React 19.2.4 (Server Components por defecto)
- **TypeScript ^5 strict** — sin `any`, sin `// @ts-ignore`
- **Tailwind v4** con `@theme` — sin shadcn/ui, diseño custom
- **Sin librería UI externa** — sistema de diseño propio con tema oscuro cálido
- **Copy centralizado** — `lib/copy/es.ts` con toda la copy en español

## Componentes (shipped)

```
components/analyzer/
├── analyzer.tsx           # Orquestador principal (estado: input | result | loading | error)
├── input-panel.tsx        # Formulario CV + vacante (2 textareas, submit, demo, clear)
├── score-gauge.tsx        # Anillo SVG animado con easing cubic
├── component-bars.tsx     # Barras de progreso por componente (match, structure, etc.)
├── keyword-cloud.tsx      # Nube de keywords present/partial/missing
├── fix-list.tsx           # Lista priorizada de recomendaciones
└── honesty-note.tsx       # Aviso de encuadre honesto + versiones selladas
```

## BFF

`app/api/score/route.ts` — proxy simple de JSON a `${BACKEND_URL}/api/v1/score`:

```typescript
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.text();
  const res = await fetch(`${BACKEND_URL}/api/v1/score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });
  return new Response(res.body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
```

## API client

`lib/api/score.ts` — `requestScore(cvText, jobText)` que llama al BFF `/api/score` y lanza `ScoreError` en caso de fallo. Maneja 400 (validación), 429 (rate-limit), y errores de red.

## Tipos

`lib/api/types.ts` — `ScoreResponse` con `overallScore`, `band`, `components`, `keywordAnalysis`, `recommendations`, `formatIssues`, `gatesApplied`, `engineVersion`, `lexiconVersion`, `honestyNotice`.

## Flow de usuario

```
[Input] → Pegar CV + vacante (o "Probar con ejemplo") → Click "Analizar"
   ↓
[Loading] → POST /api/score → backend ScoringEngine.Score()
   ↓
[Result] → ScoreGauge (anillo animado) + ComponentBars + KeywordCloud + FixList + HonestyNote
   ↓
[Adapt] → Click "Adaptar mi CV" → AdaptPanel (feature 003)
```

## Copy (en `lib/copy/es.ts`)

Toda la copy del analizador vive bajo `copy.analyze.*` (input) y `copy.result.*` (resultados). Copy centralizada, nunca hardcodeada en componentes (Constitution Art. IV).

## Out of scope (v0)

- Tests automatizados (llegaron en sprints posteriores: 710+ unit, 65+ e2e)
- Editor inline del CV (feature 006)
- Streaming visual de score (el score es determinista, no hay nada que streamear)

## Constitution compliance

- **Art. III** — sin localStorage con CV/vacante, sin telemetría externa, BFF same-origin
- **Art. IV** — copy dice "coincidencia + legibilidad", nunca "ATS oficial"
- **Art. V** — sin `dangerouslySetInnerHTML`, validación client-side
- **Art. VI** — BFF = `app/api/score/route.ts` que proxyea al backend
- **Art. VII** — sin auth, footer "tus datos no se guardan"
