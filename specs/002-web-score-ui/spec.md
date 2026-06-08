# Feature 002-web-score-ui — UI del analizador (M0 — UI del score)

> **Status:** ✅ SHIPPED · **Cerrada:** 2026-06-08
> **Backend counterpart:** [../../BuildCv-api/specs/002-score-engine/](../../BuildCv-api/specs/002-score-engine/) (✅ SHIPPED)
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)

## Resumen

UI del analizador que consume el endpoint `/api/v1/score` del backend (BuildCv-api, feature 002) y muestra:

- Anillo de puntaje animado (`ScoreGauge`)
- Barras de componentes (`ComponentBars`)
- Nube de keywords presentes/faltantes (`KeywordCloud`)
- Lista de fixes priorizados (`FixList`)
- Aviso de encuadre honesto (`HonestyNote`)

## Stack y comandos

```bash
cd BuildCv-web
pnpm install --frozen-lockfile
pnpm lint
pnpm build
```

## Arquitectura BFF

```
Browser ──same-origin──> app/api/score/route.ts ──server-to-server──> BACKEND_URL/api/v1/score
```

- **El navegador NUNCA habla directo con el backend** (Art. VI Clean Arch).
- `app/api/health/route.ts` — proxy a `/health/ready`.
- `app/api/adapt/route.ts` — placeholder (M1).
- `app/api/export/route.ts` — placeholder (M2).

## Cumplimiento Constitución

- **Art. III** — sin localStorage con CV/vacante, sin telemetría externa.
- **Art. IV** — copy en `lib/copy/es.ts` usa "coincidencia + legibilidad", nunca "ATS oficial".
- **Art. V** — sin `dangerouslySetInnerHTML`, validación client (cortesía).
- **Art. VI** — BFF = `app/api/*` que proxyea al backend.
- **Art. VII** — sin auth, footer "tus datos no se guardan".

## Próximas features

- **003-web-adapt-ui** (M1) — UI de adaptación con IA + indicator de "sin invención"
- **004-web-export** (M2) — UI de exportar/copiar
- **005-web-landing** (paralela) — landing page pública
