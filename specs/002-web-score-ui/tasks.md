# Tasks: 002-web-score-ui

**Status:** ✅ SHIPPED (commit `ed13890`) — Todos los tasks completados.

> **Note:** Este spec se creó DESPUÉS de la implementación (docs retroactive). Todos los tasks ya están completados en código.

## Tasks completados

### BFF (1/1)

- [x] **T01** — Crear `app/api/score/route.ts` como proxy de JSON a `${BACKEND_URL}/api/v1/score` con `export const dynamic = "force-dynamic"` y `cache: "no-store"`.

### API Client (1/1)

- [x] **T02** — Crear `lib/api/score.ts` con `requestScore(cvText, jobText)` que llama al BFF `/api/score`, maneja errores (400, 429, network) y lanza `ScoreError`.

### Tipos (1/1)

- [x] **T03** — Definir `ScoreResponse` y tipos auxiliares en `lib/api/types.ts` (congelados contra el contrato del backend).

### Componentes (7/7)

- [x] **T04** — Crear `components/analyzer/input-panel.tsx` — formulario con 2 textareas (CV mín 200 chars, vacante mín 100 chars), botón "Analizar" (deshabilitado si no cumple), "Probar con ejemplo", "Limpiar".
- [x] **T05** — Crear `components/analyzer/score-gauge.tsx` — anillo SVG animado con `stroke-dashoffset`, counter numérico con easing cubic, `prefers-reduced-motion` respeta accesibilidad.
- [x] **T06** — Crear `components/analyzer/component-bars.tsx` — barras de progreso por componente con color coding (present/partial/missing), peso, confianza, explicación.
- [x] **T07** — Crear `components/analyzer/keyword-cloud.tsx` — grid 3 columnas (present/partial/missing) con pills de color, responsive (1 col en mobile).
- [x] **T08** — Crear `components/analyzer/fix-list.tsx` — lista priorizada de recomendaciones con número, tipo, impacto estimado, nota de honestidad.
- [x] **T09** — Crear `components/analyzer/honesty-note.tsx` — aviso de encuadre honesto, gates aplicados, versiones selladas (engine + lexicon).
- [x] **T10** — Crear `components/analyzer/analyzer.tsx` — orquestador con estado (input → loading → result → error), layout responsive (sidebar sticky desktop, stack mobile).

### Copy (1/1)

- [x] **T11` — Agregar `copy.analyze.*` y `copy.result.*` en `lib/copy/es.ts` con toda la copy en español (nunca hardcodeada en componentes).

### Demo Data (1/1)

- [x] **T12** — Crear `lib/utils/demo-data.ts` con CV + vacante de ejemplo realista (perfil tech colombiano) que demuestre el valor del producto.

### Página (1/1)

- [x] **T13** — Crear `app/analizar/page.tsx` que renderice el componente `Analyzer`.

## Resumen

| Categoría | Tasks | Estado |
|---|---|---|
| BFF | 1 | ✅ 1/1 |
| API Client | 1 | ✅ 1/1 |
| Tipos | 1 | ✅ 1/1 |
| Componentes | 7 | ✅ 7/7 |
| Copy | 1 | ✅ 1/1 |
| Demo Data | 1 | ✅ 1/1 |
| Página | 1 | ✅ 1/1 |
| **Total** | **13** | **✅ 13/13** |
