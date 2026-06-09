# Quickstart: 002-web-score-ui

**Status:** ✅ SHIPPED (commit `ed13890`)

## Pre-requisitos

- Node 22+ con pnpm 11
- Backend (BuildCv-api) corriendo en :5080
- Backend 002-score-engine ✅ SHIPPED

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
# 2. Click "Probar con un ejemplo" (carga CV + vacante de demo)
# 3. Click "Analizar" → ver score animado + desglose + keywords + fixes
# 4. Verificar: score gauge anima de 0 al valor final en ~1.1s
# 5. Verificar: component bars muestran peso + confianza + explicación
# 6. Verificar: keyword cloud muestra 3 columnas (presentes/parciales/faltantes)
# 7. Verificar: fix list muestra recomendaciones ordenadas por impacto
# 8. Verificar: honesty note muestra versiones selladas

# 9. Test con CV muy corto (<200 chars):
#    → botón "Analizar" deshabilitado, counter muestra "X / mín 200"

# 10. Test con vacante muy corta (<100 chars):
#     → botón "Analizar" deshabilitado

# 11. Test rate-limit (consumir 60 scores en <1min):
for i in {1..61}; do
  curl -sS -o /dev/null -w "Req $i: HTTP %{http_code}\n" \
    -X POST http://localhost:3000/api/score \
    -H "Content-Type: application/json" \
    -d '{"cvText":"Backend developer con 4 años de experiencia en C# y .NET","jobText":"Buscamos developer backend con experiencia en C# y AWS"}'
done
# Expected: req 1-60 → 200, req 61 → 429
```

## Verificación pre-merge

```bash
# 1. Web build OK
cd ~/Dev/portfolio/buildCV/BuildCv-web
pnpm lint
pnpm build

# 2. Backend OK
cd ~/Dev/portfolio/buildCV/BuildCv-api
dotnet build BuildCv.slnx -c Release
dotnet test
dotnet format --verify-no-changes
```

## Estructura de archivos

```
BuildCv-web/
├── app/
│   ├── analizar/
│   │   └── page.tsx              # Página del analizador
│   └── api/
│       └── score/
│           └── route.ts          # BFF proxy → backend /api/v1/score
├── components/
│   └── analyzer/
│       ├── analyzer.tsx           # Orquestador principal
│       ├── input-panel.tsx        # Formulario CV + vacante
│       ├── score-gauge.tsx        # Anillo SVG animado
│       ├── component-bars.tsx     # Barras de componentes
│       ├── keyword-cloud.tsx      # Nube de keywords
│       ├── fix-list.tsx           # Lista de fixes
│       └── honesty-note.tsx       # Aviso de encuadre honesto
├── lib/
│   ├── api/
│   │   ├── backend.ts            # BACKEND_URL
│   │   ├── score.ts              # requestScore() + ScoreError
│   │   └── types.ts              # ScoreResponse y tipos congelados
│   ├── copy/
│   │   └── es.ts                 # copy.analyze.* + copy.result.*
│   └── utils/
│       └── demo-data.ts          # CV + vacante de ejemplo
└── specs/
    └── 002-web-score-ui/
        ├── spec.md
        ├── plan.md
        ├── research.md
        ├── data-model.md
        ├── quickstart.md
        ├── tasks.md
        └── contracts/
            └── frontend-consumes-api.md
```

## Out of scope para este quickstart

- Tests automatizados (ya existen: 710+ unit, 65+ e2e en el repo)
- Editor inline del CV (feature 006)
- Streaming (el score es determinista, no hay nada que streamear)
