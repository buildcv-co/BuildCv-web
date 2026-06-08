# Research: 006-web-cv-editor — Decisiones técnicas locked

> **Spec:** [./spec.md](./spec.md) · **Plan:** [./plan.md](./plan.md) · **Data Model:** [./data-model.md](./data-model.md)
> **Fecha de cierre de decisiones:** 2026-06-08.
> **Próxima re-revisión:** al cerrar v0.5 o si el Constitution Check revela un nuevo conflicto con la Constitución v1.1.0.

---

## 1. Editor library: Tiptap v2 (locked)

### Comparativa

| Librería | Licencia | Data model | React 19 | Tamaño bundle | Mantenimiento | Veredicto |
|---|---|---|---|---|---|---|
| **Tiptap v2** | MIT | ProseMirror (schema declarativo) | ✅ oficial | ~50 KB core + extensiones | Activo (Tiptap team) | ✅ **Elegido** |
| **Slate.js** | MIT | Custom JSON tree (no ProseMirror) | ✅ community | ~40 KB | Community-driven, releases lentos | ❌ Riesgo: data model propio, migración dolorosa |
| **Lexical** | MIT | Custom (Meta) | ✅ | ~60 KB | Activo (Meta) | ❌ v0.5 todavía con cambios breaking; overkill para 8 secciones |
| **Quill** | BSD-3 | Delta (custom) | ⚠️ wrappers comunitarios | ~80 KB | Mantenimiento mínimo (1.x) | ❌ Legacy, no vale la pena |
| **ProseMirror directo** | MIT | ProseMirror | ✅ manual | ~40 KB | Maduro | ❌ Demasiado bajo nivel para 2 semanas de ship |

### Por qué Tiptap

1. **Schema declarativo**: 8 custom nodes son archivos pequeños (~50 líneas cada uno) que extienden `Node.create({...})`.
2. **Headless**: el componente Tiptap NO impone UI; nosotros dibujamos la toolbar, los badges, los placeholders. Encaja con la convención "sin librería UI externa" del proyecto.
3. **React 19 compatible**: el equipo de Tiptap soporta React 19 oficialmente desde v2.4.
4. **Markdown round-trip**: existe `@tiptap/extension-markdown` (oficial) que usamos como base, pero lo extendemos con `remark-buildcv` para las 8 secciones custom.
5. **MIT**: igual que el resto del stack, sin riesgo legal.

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

## 2. Validación: Zod v3 (locked)

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

## 3. Persistencia local: localStorage + IndexedDB (locked)

### Comparativa

| Opción | Tamaño típico | Sync API | Soporte navegadores | Riesgo |
|---|---|---|---|---|
| **localStorage** | 5-10 MB | Sí (bloqueante) | Todos | QuotaExceededError si >5 MB |
| **sessionStorage** | 5-10 MB | Sí | Todos | Se borra al cerrar pestaña (no cumple "restaurar tras recarga") |
| **IndexedDB** | ≥50 MB (50% del disco en Chrome) | No (async) | Todos modernos | API verbosa |
| **OPFS** | Grande | No | Solo Chromium | No portable |
| **Cookies** | 4 KB | Sí | Todos | Insuficiente para un CV |

### Estrategia locked: `ICvStore` port con dos adapters

1. **Default: `LocalStorageCvStore`** (≤4 MB).
   - Pros: API síncrona, simple, soportado en todos los navegadores.
   - Contras: `QuotaExceededError` si el borrador >5 MB.
2. **Fallback: `IndexedDbCvStore`** (>4 MB o cuando localStorage falla).
   - Pros: cuota grande, async (no bloquea UI).
   - Contras: API verbosa (mitigada con `idb`, ~1 KB wrapper).

### Factory (`lib/storage/index.ts`)

```typescript
export async function makeCvStore(): Promise<ICvStore> {
  const local = new LocalStorageCvStore();
  try {
    // Test write: intenta guardar un payload dummy de 1 KB
    await local.save({ id: "__probe__", document: null as any, jobText: "", scoreHistory: [], lastSavedAt: new Date().toISOString(), engineVersions: { editor: "0.5.0", score: "1.0.0" } });
    await local.clear("__probe__");
    return local;
  } catch (err) {
    if (err instanceof QuotaExceededError || err instanceof SecurityError) {
      return new IndexedDbCvStore();
    }
    throw err;
  }
}
```

### Por qué NO sessionStorage

- sessionStorage se borra al cerrar la pestaña. Eso NO cumple US-2 ("restaurar tras recarga") si la recarga ocurre después de cerrar.
- localStorage sobrevive a cierre de pestaña, hasta que el usuario hace "Limpiar borrador" explícitamente (FR-040b).

### Por qué NO OPFS

- OPFS solo está disponible en Chromium y Firefox (no Safari estable hasta 2025).
- Es overkill para un editor de texto plano.

### Por qué NO cookies

- 4 KB máximo. Insuficiente para un CV.

---

## 4. Estado global: Zustand v4 (locked)

### Comparativa

| Opción | Boilerplate | Tamaño | React 19 | Persistencia | Veredicto |
|---|---|---|---|---|---|
| **Zustand v4** | Bajo | ~1 KB | ✅ | Middleware `persist` flexible | ✅ **Elegido** |
| Redux Toolkit | Alto | ~12 KB + RTK | ✅ | `redux-persist` separado | ❌ Sobra para 1 store |
| React Context | Cero | 0 (built-in) | ✅ | Manual | ❌ Re-renders en cada cambio del context |
| Jotai | Bajo | ~3 KB | ✅ | `atomWithStorage` | ❌ Modelo atómico no aporta valor aquí |
| Recoil | Medio | ~22 KB | ⚠️ | Manual | ❌ En desuso desde 2025 (Meta archivó) |

### Por qué Zustand

1. **Store único** (`useCvDocumentStore`) que contiene `document`, `jobText`, y acciones.
2. **`persist` middleware** permite inyectar nuestro `ICvStore` custom (no atado a localStorage).
3. **Sin providers**: el hook se importa directamente, no requiere wrap en `<Provider>`.
4. **Selectores granulares**: `useCvDocumentStore((s) => s.document)` evita re-renders innecesarios.

### Por qué NO Redux Toolkit

- RTK resuelve un problema que no tenemos: actions/reducers tipados para +10 stores. Tenemos 1 store.
- El bundle añade +12 KB que no aportan valor.

### Por qué NO Context puro

- `useState` + `Context` re-renderiza TODOS los consumidores cuando CUALQUIER parte del estado cambia.
- Con keystrokes en el editor, eso serían +60 renders/s por sección.
- Zustand con selectores limita los re-renders a los consumidores que necesitan el slice actualizado.

### Por qué NO Jotai

- Jotat es excelente para estados atómicos分散. Aquí tenemos UN documento (no átomos分散).
- El bundle es comparable, no hay ganancia.

---

## 5. Markdown round-trip: `remark` + plugin custom (locked)

### Comparativa

| Opción | Madurez | Custom syntax | Bundle | Veredicto |
|---|---|---|---|---|
| **`remark` + plugin custom** | Maduro (Unified ecosystem) | ✅ MDAST traversal | ~25 KB (con `remark-gfm`) | ✅ **Elegido** |
| Parser hand-rolled | Control total | ✅ | ~5 KB | ❌ Re-implementar Markdown: bugs garantizados |
| `marked` | Maduro | ⚠️ limitado (no AST traversal) | ~30 KB | ❌ No expone AST para customizar secciones |
| `markdown-it` | Maduro | ✅ plugins | ~40 KB | ❌ Más grande que remark |

### Por qué remark

1. **AST traversal**: podemos visitar nodos `heading`, `paragraph`, `list` y mapearlos a nuestras 8 secciones.
2. **Plugin custom** (`remark-buildcv.ts`): ~80 líneas, implementa la lógica de "este heading abre la sección X, los bloques siguientes pertenecen a X hasta el próximo heading".
3. **Ecosistema**: `remark-gfm` para tablas, `remark-stringify` para serializar, `unified` para pipeline.
4. **Usado por Next.js** internamente (al menos para `next-mdx-remote`): consistencia con el framework.

### Por qué NO parser hand-rolled

- Markdown tiene 20+ edge cases (links, énfasis, code blocks, escape sequences, HTML inline). Implementar esto a mano es 2-3 semanas de bugs.
- remark ya los maneja.

### Por qué NO marked

- `marked` es un parser, no un transformer. No expone AST para visitar.
- `marked.use({...})` permite hooks pero el modelo es "token stream", no árbol.

### Por qué NO markdown-it

- markdown-it tiene plugins pero el API es menos elegante que remark.
- remark gana en DX para custom transformers.

---

## 6. Detección de "entidad que el usuario no tipeó" (locked)

### El problema

La Constitución Art. I FR-029a dice: "el editor frontend MUST NOT agregar entidades nuevas (skills, certificaciones, experiencia, empresas, cargos, fechas, métricas) que el usuario no haya escrito explícitamente".

Esto aplica a:
- Texto que el usuario tipea (legítimo).
- Texto que el usuario pega desde otra fuente (legítimo, pero ¿lo tipeó él?).
- Texto que aparece por paste/insert del navegador (puede incluir formato oculto).
- Texto que se genera por una operación de Tiptap (puede no ser consciente del usuario).

### Estrategia: `EntityRef` con `source: 'imported' | 'user-typed'`

1. **Al parsear el `ImportResult`**: cada token del texto importado se etiqueta como `source: 'imported'`. Estos son la "lista blanca inicial".
2. **Al tipear/pastear el usuario**: cualquier `EntityRef` nuevo se etiqueta como `source: 'user-typed'`. Se acepta.
3. **Al guardar/cargar el borrador**: los `EntityRef` mantienen su `source`.
4. **Al parsear Markdown de vuelta** (round-trip): los `EntityRef` que vienen del Markdown se comparan con la lista blanca inicial:
   - Si `source === 'user-typed'`: se acepta (ya fue validado en su momento).
   - Si `source === 'imported'`: se acepta.
   - Si un nodo nuevo aparece CON un token que NO está en la lista blanca Y NO tiene `source: 'user-typed'`: **RECHAZADO** con `EntityNotAllowedError`.

### Implementación

```typescript
// lib/editor/markdown/parse.ts
export function parseCvDocument(
  markdown: string,
  ctx: { originalEntities: Set<string> },
): CvDocument {
  const tree = unified().use(remarkParse).use(remarkBuildcv).parse(markdown);
  const doc: CvDocument = { sections: [], entities: [] };
  for (const node of visit(tree, "cvSection")) {
    const section = mapToSection(node);
    for (const entity of section.entities) {
      if (entity.source === "user-typed") continue; // OK, ya validado
      if (!ctx.originalEntities.has(entity.value.toLowerCase().trim())) {
        throw new EntityNotAllowedError(entity.value, section.kind);
      }
    }
    doc.sections.push(section);
  }
  return doc;
}
```

### Por qué esta estrategia cumple Art. I FR-029a

- La "lista blanca inicial" son los tokens del `ImportResult.text` (lo que el usuario ya tenía).
- Todo lo que el usuario tipea se etiqueta explícitamente.
- El round-trip Markdown es el momento donde "se cocina" la trampa: si un atacante (o un bug) inyecta un nodo con un token nuevo, Zod lo rechaza.

### Edge case: paste de un CV diferente

Si el usuario borra todo el contenido y pega un CV nuevo (de otro archivo), la "lista blanca inicial" queda desactualizada. Solución propuesta: el botón "Limpiar borrador" (FR-040b) también limpia la lista blanca. La nueva lista blanca se reconstruye en el próximo import.

### Edge case: autocompletado del navegador

Los navegadores a veces autocompletan formularios con valores previos. El editor no es un `<input>` ni un `<form>`, así que el autocompletado no aplica.

---

## 7. Resumen de decisiones locked

| Decisión | Locked | Alternativa rechazada |
|---|---|---|
| Editor library | Tiptap v2 | Slate, Lexical, Quill, ProseMirror directo |
| Validación | Zod v3 | Yup, io-ts, Valibot |
| Persistencia default | localStorage (≤4 MB) | sessionStorage (no persiste tras cerrar) |
| Persistencia fallback | IndexedDB (`idb`) | OPFS, cookies |
| Estado global | Zustand v4 | Redux Toolkit, Context, Jotai |
| Markdown round-trip | `remark` + plugin custom | parser hand-rolled, marked, markdown-it |
| Detección entidades | `EntityRef.source` + lista blanca | heurísticas de NLP (imposible client-side) |
| Colaboración en tiempo real | NO en v0.5 | Yjs (v1) |
| Markdown export | Función pura `serializeCvDocument` | Conversión a PDF directa (rompe arquitectura) |
| Re-puntuar | `requestScore` existente (BFF) | Nuevo endpoint en backend |
| Entidades "imported" como whitelist | Sí (del `ImportResult.text`) | Whitelist vacía (rechaza todo lo nuevo) |
| Tests automatizados | NO en v0.5 (Vitest en M3+) | Vitest desde ya (bundle size, fricción) |

---

## 8. Constitution re-check (post-investigación)

| Art. | Verificación después de locked | Estado |
|---|---|---|
| **Art. I FR-029a** | Zod en parse + lista blanca + `EntityRef.source` cubren la regla. | ✅ PASS |
| **Art. III FR-040a/b** | `ICvStore` con `localStorage` + `IndexedDB` + botón "Limpiar borrador" modal. | ✅ PASS |
| **Art. VI `ICvStore` puerto** | Interface en `lib/storage/icv-store.ts`, 2 adapters intercambiables. | ✅ PASS |
| **Art. VII v0.5 sin fricción** | Sin cuentas, sin server-side. | ✅ PASS |

---

## Next Phase

→ `data-model.md` — tipos TypeScript detallados (CvDocument, CvSection, EntityRef, Draft, ICvStore).
→ `contracts/frontend-internal.md` — firmas exactas de las funciones puras y hooks.
→ `tasks.md` — desglose de tareas.
