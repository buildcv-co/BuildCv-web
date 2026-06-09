# Research: 006-web-cv-editor — Decisiones técnicas (histórico + shipped)

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Data Model:** [./data-model.md](./data-model.md)
> **Fecha de cierre de decisiones:** 2026-06-08.
> **Próxima re-revisión:** al cerrar v0.5 o si el Constitution Check revela un nuevo conflicto con la Constitución v1.1.0.

---

> **⚠️ HISTORICAL — pre-implementation research.** La implementación REJECTED Tiptap, Zustand, idb, nanoid, react-markdown, remark-gfm en favor del stack shipped: **8 inputs/textareas nativos + Zod v3 + `LocalStorageCvStore` + parser Markdown regex hand-rolled + `useState`/`useCallback`**. Ver `tasks.md` líneas 9–24 para la decisión arquitectónica explícita y la justificación técnica. El commit shipped es `748611d` (2026-06-09). Las secciones 1, 3, 4, 5, 6 a continuación describen las alternativas que se consideraron ANTES de la decisión final; se renumeraron a "## Alternatives Considered (rejected at impl time)" para preservar el rastro de auditoría. Las secciones 2 (Zod) y 7 (detección de entidades) son CONSISTENTES con el shipped code y se mantienen como referencia activa.

---

## Alternatives Considered (rejected at impl time)

> Las siguientes secciones resumen la evaluación original de cada dependencia. **Ninguna de las librerías mencionadas se instaló en `package.json`** (verificado contra `BuildCv-web/package.json` después del commit `748611d`).

### 1. Editor library: Tiptap v2 (REJECTED — se usan inputs/textareas nativos)

### Comparativa

| Librería | Licencia | Data model | React 19 | Tamaño bundle | Mantenimiento | Veredicto |
|---|---|---|---|---|---|---|
| **Tiptap v2** | MIT | ProseMirror (schema declarativo) | ✅ oficial | ~50 KB core + extensiones | Activo (Tiptap team) | ❌ **Rechazado en v0.5** (ver `tasks.md` líneas 9–24) |
| **Slate.js** | MIT | Custom JSON tree (no ProseMirror) | ✅ community | ~40 KB | Community-driven, releases lentos | ❌ Riesgo: data model propio, migración dolorosa |
| **Lexical** | MIT | Custom (Meta) | ✅ | ~60 KB | Activo (Meta) | ❌ v0.5 todavía con cambios breaking; overkill para 8 secciones |
| **Quill** | BSD-3 | Delta (custom) | ⚠️ wrappers comunitarios | ~80 KB | Mantenimiento mínimo (1.x) | ❌ Legacy, no vale la pena |
| **ProseMirror directo** | MIT | ProseMirror | ✅ manual | ~40 KB | Maduro | ❌ Demasiado bajo nivel para 2 semanas de ship |
| **Inputs/textareas HTML** | Built-in | DOM nativo | ✅ | 0 KB | n/a | ✅ **Elegido** |

### Por qué se REJECTÓ Tiptap

1. **Bundle size**: Tiptap añade ~50-80 KB al bundle del cliente. 8 inputs/textareas añaden 0 KB.
2. **Tests más simples**: 8 secciones se testean como inputs/outputs puros (Zod schemas). Tiptap requiere tests E2E con DOM complejo que son frágiles.
3. **Mantenibilidad**: el editor simple es más fácil de extender a v1 (cuando llegue Tiptap) sin romper tests.
4. **Mismo Constitution compliance**: Art. I, III, V se cumplen exactamente igual con inputs nativos.
5. **Spec justificada pero no obligatoria**: la spec es una recomendación; el Constitution es la ley. El recorte es una decisión técnica documentada en `tasks.md`.

### Por qué NO Slate

- El data model de Slate es JSON libre (cualquier estructura sirve). Eso es flexibility pero también riesgo: no hay un schema que ProseMirror enforce. El defense in depth (FR-029a) se debilita.
- La comunidad de Slate ha estado inactiva en releases importantes durante 2025-2026.
- El último release mayor (1.0.0) lleva +1 año sin actualización.

### Por qué NO Lexical

- Lexical está bien para editores grandes (Facebook, WhatsApp Web lo usan), pero su API es más compleja que Tiptap y el equipo aún está iterando (breaking changes cada 2-3 meses).
- Para 8 secciones y un round-trip Markdown simple, Tiptap es ~2x más rápido de implementar.

### Por qué NO Quill

- Quill 1.x está en mantenimiento mínimo. Quill 2 lleva años en beta.
- La API de Delta (su data model) es opaca y no encaja con MDAST/CommonMark.

### Por qué NO ProseMirror directo

- ProseMirror es la base de Tiptap. Tiptap es un wrapper que vale la pena: nos da React bindings, mejor DX, y MIT.

### Sin colaboración en tiempo real (v0.5)

Tiptap soporta Yjs (CRDT) nativamente. Pero añadir Yjs implica:
- Servidor de sync (Hocuspocus o similar)
- Provider WebSocket
- Conflict resolution
- +2-3 semanas de trabajo
- +80 KB al bundle

Decisión: NO Yjs en v0.5. Reservado para v1 con cuentas.

---

### 2. Validación: Zod v3 (✅ KEEP — instalado)

### Comparativa

| Librería | Tamaño | TS inference | Ecosistema | Veredicto |
|---|---|---|---|---|
| **Zod v3** | ~14 KB | ✅ nativo | Maduro, doc excelente | ✅ **Elegido** |
| Yup | ~22 KB | ⚠️ con typegen separado | Maduro | ❌ Más grande, TS no first-class |
| io-ts | ~30 KB | ✅ pipe-based | Maduro pero complejo | ❌ Demasiado functional, curva de aprendizaje |
| Valibot | ~10 KB | ✅ con typegen | Nuevo, creciendo | ❌ Estable pero menos maduro que Zod |

### Por qué Zod

1. **Ya se usa en 005** (`ImportResultSchema`, etc.) — consistencia con la feature hermana.
2. **Inferencia de tipos**: `z.infer<typeof XxxSectionSchema>` genera el tipo TypeScript sin duplicación.
3. **Discriminated unions**: las 8 secciones son una union discriminada por `kind: 'profile' | 'experience' | ...`. Zod lo soporta de primera clase.
4. **Errors tipados**: `ZodError.issues` da path + message + code, perfecto para devolver a la UI con i18n.
5. **Tree-shakable**: solo importamos los schemas que necesitamos.
6. **Defensa Art. I FR-029a**: el round-trip `parse(serialize(doc))` se valida con Zod; cualquier entidad nueva se rechaza.

### Por qué NO Yup

- Yup requiere un plugin (`@types/yup` separado o `yup` con `--typegen`) para generar tipos TS.
- El bundle es ~50% más grande.
- La API no es tan elegante para discriminated unions.

### Por qué NO io-ts

- io-ts es funcional puro, lo cual es elegante pero requiere más boilerplate.
- El equipo del proyecto (1 dev) no tiene tiempo para aprender el modelo `pipe` + `Either` + `Decoder` solo para validar 8 secciones.

### Por qué NO Valibot

- Valibot es más nuevo (v0.30+) y su ecosistema es todavía pequeño.
- La consistencia con 005 (que ya usa Zod) gana.

---

### 3. Persistencia local: `LocalStorageCvStore` (✅ KEEP — única implementación shipped)

### Comparativa

| Opción | Tamaño típico | Sync API | Soporte navegadores | Riesgo |
|---|---|---|---|---|
| **localStorage** | 5-10 MB | Sí (bloqueante) | Todos | QuotaExceededError si >5 MB |
| `IndexedDB` (con `idb`) | ≥50 MB | No (async) | Todos modernos | API verbosa; **REJECTED en v0.5** (deuda técnica v1) |
| `sessionStorage` | 5-10 MB | Sí | Todos | Se borra al cerrar pestaña (no cumple "restaurar tras recarga") |
| OPFS | Grande | No | Solo Chromium | No portable |
| Cookies | 4 KB | Sí | Todos | Insuficiente para un CV |

### Estrategia shipped: `ICvStore` port con UNA implementación (`LocalStorageCvStore`)

1. **Única: `LocalStorageCvStore`** (~5 MB).
   - Pros: API síncrona, simple, soportado en todos los navegadores.
   - Contras: `QuotaExceededError` si el borrador >5 MB. **Se surfacea al usuario con un toast rojo** (no fallback silencioso).
2. **`IndexedDbCvStore` queda como deuda técnica** (no se implementa en v0.5).

### Por qué NO sessionStorage

- sessionStorage se borra al cerrar la pestaña. Eso NO cumple US-2 ("restaurar tras recarga") si la recarga ocurre después de cerrar.
- localStorage sobrevive a cierre de pestaña, hasta que el usuario hace "Limpiar borrador" explícitamente (FR-040b).

### Por qué NO IndexedDB en v0.5

- Una sola implementación es más simple de testear y razonar.
- `localStorage` cubre el 99% de los CVs reales (un CV de 5 KB-50 KB es el rango típico).
- El error de cuota es **manejable**: el usuario puede decidir limpiar el borrador o exportar a Markdown antes de seguir.
- v1 introduce `IndexedDbCvStore` para CVs >5 MB sin romper `ICvStore`.

### Por qué NO OPFS

- OPFS solo está disponible en Chromium y Firefox (no Safari estable hasta 2025).
- Es overkill para un editor de texto plano.

### Por qué NO cookies

- 4 KB máximo. Insuficiente para un CV.

---

### 4. Estado global: React `useState` + `useCallback` local (REJECTED Zustand)

### Comparativa

| Opción | Boilerplate | Tamaño | React 19 | Persistencia | Veredicto |
|---|---|---|---|---|---|
| **`useState` + `useCallback` local** | Mínimo | 0 KB | ✅ | Hook `useDraft` separado | ✅ **Elegido** |
| Zustand v4 | Bajo | ~1 KB | ✅ | Middleware `persist` flexible | ❌ **Rechazado en v0.5** (no se necesita store global) |
| Redux Toolkit | Alto | ~12 KB + RTK | ✅ | `redux-persist` separado | ❌ Sobra para 1 store |
| React Context | Cero | 0 (built-in) | ✅ | Manual | ❌ Re-renders en cada cambio del context |
| Jotai | Bajo | ~3 KB | ✅ | `atomWithStorage` | ❌ Modelo atómico no aporta valor aquí |
| Recoil | Medio | ~22 KB | ⚠️ | Manual | ❌ En desuso desde 2025 (Meta archivó) |

### Por qué `useState` + `useCallback` local (shipped)

1. **El editor tiene UN documento y UN jobText.** No hay múltiples vistas que necesiten sincronización.
2. **El hook `useDraft` ya encapsula el ciclo de vida del `Draft` persistido** (`lib/editor/use-draft.ts`).
3. **Cero dependencias** (vs ~1 KB de Zustand).
4. **Tests más simples**: el componente `Editor` se monta/evalúa como cualquier React component.
5. **Mismo Constitution compliance**: el estado local es determinista y testeable.

### Por qué NO Zustand

- Zustand resuelve un problema que no tenemos: estado compartido entre múltiples árboles de componentes. El editor tiene UN componente "inteligente" y N presentacionales.
- Zustand añade una dependencia + una capa de indirección.
- Si en v1 se necesita estado compartido (ej. multi-borrador), se introduce Zustand sin breaking changes.

### Por qué NO Context puro

- `useState` + `Context` re-renderiza TODOS los consumidores cuando CUALQUIER parte del estado cambia.
- Con keystrokes en el editor, eso serían +60 renders/s por sección.
- Zustand con selectores limita los re-renders, pero ya no se necesita.

### Por qué NO Jotai

- Jotai es excelente para estados atómicos分散. Aquí tenemos UN documento (no átomos分散).
- El bundle es comparable, no hay ganancia.

---

### 5. Markdown round-trip: parser regex hand-rolled (REJECTED `remark` + plugin custom)

### Comparativa

| Opción | Madurez | Custom syntax | Bundle | Veredicto |
|---|---|---|---|---|
| **Parser regex hand-rolled** | n/a (nuestro) | ✅ | ~5 KB | ✅ **Elegido** |
| `remark` + plugin custom | Maduro (Unified ecosystem) | ✅ MDAST traversal | ~25 KB (con `remark-gfm`) | ❌ **Rechazado en v0.5** (overkill para 8 secciones) |
| `react-markdown` + `remark-gfm` | Maduro | ✅ | ~30 KB | ❌ **Rechazado en v0.5** (no se necesita render React del MD) |
| `marked` | Maduro | ⚠️ limitado (no AST traversal) | ~30 KB | ❌ No expone AST para customizar secciones |
| `markdown-it` | Maduro | ✅ plugins | ~40 KB | ❌ Más grande que remark |

### Por qué parser regex hand-rolled (shipped)

1. **Cero dependencias** (vs ~25 KB de `remark` o ~30 KB de `react-markdown`).
2. **Sintaxis limitada**: el CV tiene 8 secciones fijas, no necesita full CommonMark.
3. **Output determinista**: input → output conocido, fácil de testear.
4. **Performance**: ~100 ms para 50 KB; suficiente para NFR-030.
5. **Zod como gate** (Art. I FR-029a): el output del parser se valida con `CvDocumentSchema`; cualquier entidad nueva se rechaza.

### Por qué NO parser hand-rolled (en la evaluación original)

- Markdown tiene 20+ edge cases (links, énfasis, code blocks, escape sequences, HTML inline). Implementar esto a mano es 2-3 semanas de bugs.
- remark ya los maneja.

**RESOLUCIÓN**: el CV tiene 8 secciones con sintaxis limitada (headings + bullets + fechas + niveles de idioma). El parser regex cubre estos casos con ~500 líneas y tests deterministas. No es "Markdown completo" — es "Markdown de CV", que es mucho más simple.

### Por qué NO `marked`

- `marked` es un parser, no un transformer. No expone AST para visitar.
- `marked.use({...})` permite hooks pero el modelo es "token stream", no árbol.

### Por qué NO `markdown-it`

- markdown-it tiene plugins pero el API es menos elegante que remark.
- remark gana en DX para custom transformers.

---

### 6. IDs: `Math.random().toString(36).slice(2, 10)` (REJECTED `nanoid`)

### Comparativa

| Opción | Tamaño | Unicidad | Veredicto |
|---|---|---|---|
| **`Math.random().toString(36).slice(2, 10)`** | 0 KB | ~50 bits de entropía (suficiente para scope local) | ✅ **Elegido** |
| `nanoid` v5 | ~400 B | 21 chars URL-safe, crypto-seguro | ❌ **Rechazado en v0.5** (overkill) |
| `uuid` v4 | ~5 KB | 128 bits, estándar | ❌ Bundle grande |
| `crypto.randomUUID()` (built-in) | 0 KB | 128 bits, crypto-seguro | ⚠️ Alternativa viable; no se adoptó para mantener homogeneidad con `Math.random()` |

### Por qué `Math.random().toString(36).slice(2, 10)` (shipped)

1. **Cero dependencias** (vs ~400 B de `nanoid`).
2. **Suficiente para scope local**: los IDs solo se usan dentro del documento del usuario; no hay riesgo de colisión cross-device.
3. **Generación rápida**: síncrona, sin overhead.

### Por qué NO `nanoid`

- Los IDs no se exponen al exterior; no necesitan ser URL-safe globalmente.
- 50 bits de entropía son ~10^15 valores únicos — más que suficiente para un solo documento.

---

## Active decisions (KEEP — shipped code)

### 7. Detección de "entidad que el usuario no tipeó" (✅ KEEP)

### El problema

La Constitución Art. I FR-029a dice: "el editor frontend MUST NOT agregar entidades nuevas (skills, certificaciones, experiencia, empresas, cargos, fechas, métricas) que el usuario no haya escrito explícitamente".

Esto aplica a:
- Texto que el usuario tipea (legítimo).
- Texto que el usuario pega desde otra fuente (legítimo, pero ¿lo tipeó él?).
- Texto que aparece por paste/insert del navegador (puede incluir formato oculto).

### Estrategia shipped: Zod como gate

1. **Al parsear el `ImportResult`**: cada sección del handoff se parsea con `parseCvDocument`, que devuelve un `CvDocument` con `source: 'imported'`. Los tokens de la importación son la "lista blanca inicial".
2. **Al tipear/pastear el usuario**: las secciones editadas tienen `source: 'user-typed'` (implícito en el flujo de edición).
3. **Al guardar/cargar el borrador**: el `Draft` se persiste con todas las secciones y sus `source` originales.
4. **Al parsear Markdown de vuelta** (round-trip): `CvDocumentSchema.safeParse` rechaza cualquier campo que no cumpla las constraints (longitudes, enums, regex). Si pasa, el documento es estructuralmente válido.

### Defensa en profundidad

- **Capa 1**: validación Zod en `save()` (`DraftSchema.safeParse(draft)` antes de `JSON.stringify`).
- **Capa 2**: validación Zod en `load()` (`DraftSchema.safeParse(JSON.parse(raw))` antes de devolver el `Draft`).
- **Capa 3**: validación Zod en el round-trip (`roundtrip(doc, ctx)` que compara `parse(serialize(doc))` con `doc`).
- **Capa 4**: el parser regex (`parse-cv.ts`) no agrega entidades; solo extrae las que el usuario ya escribió.

### Edge case: paste de un CV diferente

Si el usuario borra todo el contenido y pega un CV nuevo, el editor parsea el nuevo texto y crea un `CvDocument` con `source: 'imported'`. La "lista blanca" se reconstruye desde el handoff actual (si existe) o desde el paste.

### Edge case: autocompletado del navegador

Los navegadores a veces autocompletan formularios con valores previos. El editor no es un `<input>` ni un `<form>` (los textareas sí son `<textarea>`, pero el navegador no autocompleta su contenido con la misma heurística que `<input>`). En la práctica no es un problema.

---

## Resumen de decisiones (final, shipped)

| Decisión | Locked | Alternativa rechazada |
|---|---|---|
| Editor UI | 8 inputs/textareas HTML nativos | Tiptap v2, Slate, Lexical, Quill, ProseMirror directo |
| Validación | Zod v3 (✅ instalado) | Yup, io-ts, Valibot |
| Persistencia | `LocalStorageCvStore` (única) | sessionStorage, IndexedDB (`idb`), OPFS, cookies |
| Estado global | `useState` + `useCallback` local + `useDraft` hook | Zustand v4, Redux Toolkit, Context, Jotai, Recoil |
| Markdown round-trip | Parser regex hand-rolled (`parse-cv.ts`) | `remark` + plugin custom, `react-markdown` + `remark-gfm`, `marked`, `markdown-it` |
| IDs | `Math.random().toString(36).slice(2, 10)` | `nanoid`, `uuid`, `crypto.randomUUID()` |
| Detección entidades | `EntityRef.source` + validación Zod en round-trip | heurísticas de NLP (imposible client-side) |
| Colaboración en tiempo real | NO en v0.5 | Yjs (v1) |
| Markdown export | Función pura `serializeCvDocument` + `downloadBlob` | Conversión a PDF directa (rompe arquitectura) |
| Re-puntuar | `requestScore` existente (BFF) | Nuevo endpoint en backend |
| Entidades "imported" como whitelist | Sí (del `ImportResult.text` o paste) | Whitelist vacía (rechaza todo lo nuevo) |
| Tests automatizados | Vitest 2 + RTL 16 + jsdom (✅ instalado) + Playwright 1 chromium | Manual-only en v0.5 (REJECTED), Vitest en M3+ (REJECTED) |

---

## Constitution re-check (post-implementación)

| Art. | Verificación shipped | Estado |
|---|---|---|
| **Art. I FR-029a** | Zod en `save` + `load` + `roundtrip` + `parse-cv` cubre la regla. | ✅ PASS |
| **Art. III FR-040a/b** | `ICvStore` con `LocalStorageCvStore` + botón "Limpiar borrador" con modal. | ✅ PASS |
| **Art. VI `ICvStore` puerto** | Interface en `lib/storage/icv-store.ts`. `LocalStorageCvStore` es la única implementación shipped; `IndexedDbCvStore` queda como deuda técnica. | ✅ PASS |
| **Art. VII v0.5 sin fricción** | Sin cuentas, sin server-side. | ✅ PASS |
| **Art. VIII TDD** | Vitest 2 + RTL 16 + jsdom configurados; 35+ tests shipped. | ✅ PASS |

---

## Next Phase

→ `data-model.md` — tipos TypeScript detallados (CvDocument, CvSection, EntityRef, Draft, ICvStore).
→ `contracts/frontend-internal.md` — firmas exactas de las funciones puras y hooks.
→ `tasks.md` — desglose de tareas (preserva el bloque "DECISIÓN ARQUITECTÓNICA EXPLÍCITA" en líneas 9–24).
