# Research: 004-web-export-ui

**Status:** ✅ SHIPPED (commit `45ec05d`)

## 1. Blob URL + download pattern

Para descargar un PDF binario en el browser sin recargar la página:

```typescript
const blob = await res.blob();  // application/pdf
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = "cv-adapted-2026-06-08.pdf";
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);  // cleanup
```

**Importante**: `URL.revokeObjectURL` evita memory leaks. Llamarlo después del click.

## 2. Headers del response del backend

El backend retorna:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="cv-adapted-2026-06-08.pdf"
Content-Length: 46351
```

El browser respeta `Content-Disposition: attachment` y descarga automáticamente con el filename del header.

**Alternativa**: leer el `Content-Disposition` del response y usar ese filename en `a.download`. Más robusto, pero el backend ya lo hace bien.

## 3. Filename

El backend decide el filename: `cv-adapted-{YYYY-MM-DD}.pdf`.

Razones del naming:
- "cv-adapted-" (no "ats-ready", no "optimized", no "professional") → encuadre honesto (Art. IV)
- Fecha en formato ISO 8601 → ordenable lexicográficamente

## 4. Estado del componente

```typescript
type ExportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "downloading" }   // descargando via blob URL
  | { kind: "error"; error: ExportError };
```

## 5. Riesgos

1. **Memory leak del blob URL**: si no se llama `revokeObjectURL`, el blob queda en memoria. Solución: SIEMPRE revoke.
2. **Cross-origin issues**: el BFF es same-origin, no hay CORS. OK.
3. **PDF corrupto**: si el backend retorna bytes inválidos, `Blob` los acepta pero el PDF reader los rechaza. Mostrar mensaje "PDF inválido, intenta de nuevo".
4. **Filename collision**: si el usuario descarga 2 PDFs el mismo día, el browser los numera automáticamente (`cv-adapted-2026-06-08 (1).pdf`).

## Next Phase

→ Phase 1: Tasks.
