# Quickstart: 003-web-adapt-ui

**Status:** 📋 PLANEADO

## Pre-requisitos

- Node 22+ con pnpm 11
- Backend (BuildCv-api) corriendo en :5080
- Backend 003-adapt-ia ✅ SHIPPED

## Setup local

```bash
cd ~/Dev/portfolio/buildCV/BuildCv-web
pnpm install --frozen-lockfile
```

## Desarrollo

```bash
# Terminal 1: backend
cd ~/Dev/portfolio/buildCV/BuildCv-api
dotnet run --project src/BuildCv.Api
# → http://localhost:5080

# Terminal 2: web
cd ~/Dev/portfolio/buildCV/BuildCv-web
pnpm dev
# → http://localhost:3000
```

## Test end-to-end manual

```bash
# 1. Abrir http://localhost:3000/analizar
# 2. Pegar CV:
#    "Maria López. Backend developer con 2 años en C# y .NET. Trabajé en AcmeCorp."
# 3. Pegar vacante:
#    "Buscamos developer backend con experiencia en C# y .NET."
# 4. Click "Calcular" → ver score (debería ser >50, similar al test del backend)
# 5. Click "Adaptar con IA" → ver panel con adaptedCv + delta + severity badge
# 6. Si severity=Critical, ver mensaje en rojo explicando las invenciones

# 7. Test rate-limit (consumir 5 adaptaciones en <1h):
for i in {1..6}; do
  curl -sS -o /dev/null -w "Req $i: HTTP %{http_code}\n" \
    -X POST http://localhost:3000/api/adapt \
    -H "Content-Type: application/json" \
    -d '{"cvText":"test","jobText":"test"}'
done
# Expected: req 1-5 → 200, req 6 → 429
```

## Verificación pre-merge

```bash
# 1. Web build OK
cd ~/Dev/portfolio/buildCV/BuildCv-web
pnpm lint
pnpm build

# 2. Backend OK
cd ~/Dev/portfolio/buildCV/BuildCv-api
./scripts/preflight.sh
./scripts/constitution-check.sh
```

## Estructura de archivos

```
BuildCv-web/
├── app/
│   └── (si quieres agregar ruta) /adaptar/page.tsx
├── components/
│   └── adapt/
│       ├── adapt-panel.tsx           # State machine + UI
│       ├── adapted-cv-viewer.tsx     # Render del markdown
│       ├── delta-improvements.tsx     # Lista de invenciones
│       ├── severity-badge.tsx        # Color del panel
│       └── regenerate-button.tsx     # Para 422
├── lib/
│   ├── api/
│   │   ├── adapt.ts                  # requestAdapt() + AdaptError
│   │   └── types.ts                  # AdaptationResult, etc.
│   └── copy/
│       └── es.ts                     # ADAPT_COPY
└── app/api/adapt/
    └── route.ts                      # BFF (ya existe, M1)
```

## Out of scope para este quickstart

- Tests automatizados (M3+ con Vitest)
- Streaming SSE (M1.5)
- Editor inline (v1)
