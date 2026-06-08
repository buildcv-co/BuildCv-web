# Constitución de BuildCv-web — LEY SUPREMA (heredada)

> **No regenerar con `/speckit.constitution`**. La Constitución de este proyecto vive en `../BuildCv-api/.specify/memory/constitution.md` y es **ley suprema** que aplica también al frontend (Art. III privacidad, Art. IV encuadre honesto, Art. V entrada como dato).

## Constitución aplicable

**Path:** `../BuildCv-api/.specify/memory/constitution.md` (relativo a este archivo)

**Versión:** 1.0.0 (ratificada 2026-06-06)

**Aplica al frontend (BuildCv-web):**

| Art. | Cómo aplica |
|---|---|
| **III** Privacidad | Sin telemetría externa, sin `localStorage` con CV/vacante, sin analytics, headers CSP en `next.config.ts`, BFF same-origin oculta el backend. |
| **IV** Encuadre honesto | Copy del UI en `lib/copy/es.ts` debe decir "coincidencia con la vacante + legibilidad para sistemas automáticos". Nunca "puntaje ATS oficial" ni "empleo garantizado". |
| **V** Entrada como dato | Sin `dangerouslySetInnerHTML` con CV/vacante, validación client como cortesía (backend re-valida), topes antes de enviar. |
| **VI** Clean Arch | Frontend BFF = `app/api/*` (Route Handlers) que proxyea al backend. El navegador NUNCA habla directo con el backend. |
| **VII** v0 sin fricción | Sin auth, sin DB, sin cookies persistentes, footer "tus datos no se guardan". |
| **VIII** TDD | Cuando llegue testing, TDD con Vitest + Testing Library. 0 supresiones (`@ts-ignore` prohibido). |

**No aplica al frontend** (dominio del backend): Art. I (cero invención), Art. II (motor determinista), Art. IX (Habeas Data). El frontend **consume** el resultado del backend que ya cumple estos artículos.

## Ver Constitución completa

```bash
cat ../BuildCv-api/.specify/memory/constitution.md
```

## Reglas operativas del frontend

Viven en `.opencode/rules/`:

- `frontend-nextjs.md` — BFF, App Router, RSC, contratos
- `security.md` — Privacidad + seguridad frontend
- `quality_and_testing.md` — TS strict, 0 supresiones, a11y, perf

## Slash command de auditoría

`/constitution-check` (en `.opencode/commands/constitution-check.md`) audita contra esta Constitución.

## Slash commands de Spec Kit disponibles

Todos los `speckit.*` excepto `speckit.constitution` (deshabilitado).
