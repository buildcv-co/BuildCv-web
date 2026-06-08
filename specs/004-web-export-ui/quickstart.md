# Quickstart: 004-web-export-ui

**Status:** 📋 PLANEADO

## Pre-requisitos

- Node 22+ con pnpm 11
- Backend (BuildCv-api) corriendo en :5080
- Backend 004-export-pdf ✅ SHIPPED
- 003-web-adapt-ui ✅ (necesitamos el resultado de la adaptación)

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
# 2. Pegar CV + vacante → click "Calcular" → ver score
# 3. Click "Adaptar con IA" → ver panel con adaptedCv
# 4. Click "Descargar PDF" → ver spinner 1-2s → browser descarga PDF

# 5. Verificar el PDF descargado:
file ~/Downloads/cv-adapted-*.pdf
# Expected: "PDF document, version 1.4"

# 6. Test 422 (con adaptación que tiene Hard invenciones):
# - Crear un caso de prueba donde la adaptación retorne severity=Critical
# - Click "Descargar" → panel rojo con detalle de la invención

# 7. Test rate-limit (20/h):
for i in {1..21}; do
  HTTP=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3000/api/export \
    -H "Content-Type: application/json" \
    -d '{"adaptedCv":"test","validation":{"isValid":true,"severity":"None","inventions":[],"warnings":[]},"candidateName":"Test"}')
  echo "Req $i: HTTP $HTTP"
done
# Expected: req 1-20 → 200, req 21 → 429
```

## Estructura de archivos

```
BuildCv-web/
├── app/analizar/page.tsx     # Integra <ExportButton /> después de <AdaptPanel />
├── components/export/
│   ├── export-button.tsx
│   ├── export-error-panel.tsx
│   └── filename-hint.tsx
├── lib/api/
│   ├── export.ts               # requestExportPdf() + ExportError + downloadBlob()
│   └── types.ts                # ExportRequest
└── lib/copy/
    └── es.ts                   # EXPORT_COPY
└── app/api/export/route.ts     # BFF (ya existe, M2)
```

## Verificación pre-merge

```bash
# 1. Web
cd ~/Dev/portfolio/buildCV/BuildCv-web
pnpm lint
pnpm build

# 2. Backend
cd ~/Dev/portfolio/buildCV/BuildCv-api
./scripts/preflight.sh
./scripts/constitution-check.sh
```

## Out of scope para este quickstart

- Tests automatizados (M3+)
- Selección de template (v1)
- Watermark personalizado (v1)
