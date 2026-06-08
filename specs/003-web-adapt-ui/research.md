# Research: 003-web-adapt-ui

**Status:** 📋 PLANEADO

## 1. Streaming vs no-streaming

Para v0: **no-streaming** (M0 score + M1 stub + M1.5 streaming real).

El `StubAiClient` retorna instantáneamente, no hay tokens que streamear. Cuando llegue M1.5 con `AnthropicAiClient` real, el backend tendrá `POST /api/v1/adapt/stream` (SSE) y la UI deberá:
- Llamar al BFF `/api/adapt/stream` en lugar de `/api/adapt`
- Renderizar tokens incrementalmente
- Mantener el validation badge al final del stream

## 2. Markdown rendering

El `adaptedCv` viene en markdown simple del LLM:
- `#` para h1 (nombre del candidato)
- `##` para h2 (sección: Resumen, Experiencia, Skills, etc.)
- `-` o `*` para listas (bullets)

**Opciones para renderizar**:
- `react-markdown` (librería popular, sanitization incluida) — overkill para v0
- **Custom parser** (regex para h1/h2/list) — ~50 líneas, sin dependencias
- `<pre>{markdown}</pre>` literal — feo pero 0 código

**Decisión**: custom parser minimalista. Si la UI crece, migrar a `react-markdown` con sanitization.

## 3. Severidad visual

| Severity | Color | Ícono | Mensaje |
|---|---|---|---|
| None | Verde | ✓ | "Sin invenciones" |
| Warning | Amarillo | ⚠ | "Advertencia: X mejoras menores" |
| Critical | Rojo | ✗ | "Invenciones detectadas: regenera" |

**Tailwind**: `bg-green-50 text-green-900 border-green-200` para None, `bg-yellow-50 text-yellow-900 border-yellow-200` para Warning, `bg-red-50 text-red-900 border-red-200` para Critical.

## 4. Estado del componente

```typescript
type AdaptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; result: AdaptationResult }
  | { kind: "error"; error: AdaptError };
```

State machine:
- `idle` → click "Adaptar" → `loading` → POST → `success` | `error`
- `error` con `status: 422` → mostrar "Regenerar" → click → vuelve a `loading`
- `error` con `status: 429` → mostrar mensaje + NO retry (backoff si user insiste)
- `error` con `status: 503` → mostrar mensaje + retry button

## 5. Riesgos

1. **Renderizar markdown mal**: parser custom puede tener edge cases (links, código inline, etc.). v0 acepta — el LLM emite markdown simple.
2. **Tamaño del CV adaptado**: para CVs grandes, el `<pre>` con todo el texto puede ser lento. Solución futura: virtualizar la lista.
3. **Estado de error persistente**: si el usuario navega y vuelve, ¿el estado se preserva? Por ahora NO (cada mount es fresh). M1.5+: considerar `useState` lifted a URL state.

## Next Phase

→ Phase 1: Tasks — TDD-ordered.
