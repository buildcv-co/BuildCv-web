# Exploration: 020-structured-cv-import-and-job-input

> **Status:** [Explore] — Pending proposal
> **Mode:** hybrid (filesystem + Engram topic `sdd/020-structured-cv-import-and-job-input/explore`)
> **Author:** sdd-explore sub-agent (manual-save-buildcv)
> **Date:** 2026-06-26

## Resumen ejecutivo

El usuario pide **refactorizar el flujo de import y entrada de vacante** para que (1) el CV importado se devuelva como **JSON estructurado** (no texto plano), (2) la vacante tenga **validación explícita** y permita pegar texto, y (3) ambos se procesen de forma **estructurada, predecible y objetiva**.

La investigación del código real muestra que **gran parte de la infraestructura estructurada ya existe** (006-web-cv-editor tiene `CvDocument` con 8 secciones tipadas y `ICvStore` ya implementado), pero **el contrato HTTP sigue siendo text-only**: `POST /api/v1/score` recibe `{CvText, JobText}` y `POST /api/v1/import` devuelve `{text, sections: [{heading, start, end, confidence}], ...}` — secciones como **posiciones en texto**, no como contenido tipado.

---

## Current State

### Flujo actual end-to-end (texto plano en el wire)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ /importar → ImportButton → requestImport(file)                    │  │
│  │   ↓ file (multipart)                                               │  │
│  │ BFF /api/import (nodejs runtime, runtime="nodejs")                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│       ↓ HTTP proxy (passthrough)                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Backend POST /api/v1/import                                        │  │
│  │   1. ImportEndpoints lee IFormFile                                 │  │
│  │   2. ImportCvValidator valida (mime + size + filename)             │  │
│  │   3. ParserRouter dispatcha (PDF→PdfPigCvParser, DOCX→OpenXml)     │  │
│  │   4. PdfPigCvParser/ OpenXmlCvParser extrae TEXTO PLANO            │  │
│  │   5. SectionDetector (regex MAYÚSCULAS) detecta offsets            │  │
│  │   6. ImportCvHandler → ImportResult { text, sections[], warn[] }   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│       ↓ JSON { text, sections: [{heading, start, end, confidence}] }   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ ImportButton guarda text en localStorage "buildcv:analizar:cv..."  │  │
│  │ Botón "Analizar" → redirect a /analizar                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│       ↓                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ AnalizarScreen lee preseed de localStorage                         │  │
│  │ Si vacío → EmptyState con CTA a /importar                         │  │
│  │ Si lleno → Analyzer (InputPanel con 2 textareas: cvText, jobText)  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│       ↓                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Analyzer.analyze() → requestScore(cvText, jobText)                 │  │
│  │   ↓ POST { cvText, jobText }                                        │  │
│  │ BFF /api/score → proxy                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│       ↓                                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Backend POST /api/v1/score                                          │  │
│  │   1. ScoreCvValidator valida (max 20k chars cada uno)               │  │
│  │   2. JobAnalyzer.Analyze(jobText) → JobRequirementSet              │  │
│  │   3. CvAnalyzer.Analyze(cvText) → CvAnalysis                        │  │
│  │   4. ScoringEngine.Score(job, cv) → ScoreResult                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│       ↓ JSON ScoreResponse { overallScore, components[], ... }           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lo que ya existe (estructurado, infra local)

| Componente | Path | Estado |
|---|---|---|
| `CvDocument` (8 secciones tipadas) | `BuildCv-web/lib/editor/types.ts` (180 líneas) | ✅ shipped en 006 |
| Zod schemas de cada sección | `BuildCv-web/lib/editor/schema/{profile,experience,education,...}.ts` | ✅ shipped en 006 |
| `LocalStorageCvStore` (`ICvStore` impl) | `BuildCv-web/lib/storage/icv-store.ts` (136 líneas) | ✅ shipped en 006 |
| `parseCvDocument` / `serializeCvDocument` (regex round-trip MD) | `BuildCv-web/lib/editor/markdown/{parse,serialize}.ts` | ✅ shipped en 006 |
| Editor (8 inputs nativos) | `BuildCv-web/components/editor/editor.tsx` (382 líneas) | ✅ shipped en 006 |
| `SectionSplitter` (regex ES+EN) | `BuildCv-api/src/BuildCv.Domain/Text/SectionSplitter.cs` | ✅ shipped en 002 |
| `CvAnalyzer` (regex sobre 22 headers ES+EN) | `BuildCv-api/src/BuildCv.Domain/Resumes/CvAnalyzer.cs` | ✅ shipped en 002 |
| `JobAnalyzer` (regex sobre 14 headers) | `BuildCv-api/src/BuildCv.Domain/Jobs/JobAnalyzer.cs` | ✅ shipped en 002 |

### Lo que falta (la propuesta)

| Gap | Impacto |
|---|---|
| `ImportResult.sections` son **posiciones** (`start`/`end`), no contenido tipado | El editor (006) hoy **re-parsea el texto** con `parseCvDocument` → regex MD round-trip → pierde secciones que el parser original pudo detectar (listas, bullets, tablas DOCX) |
| `ScoreCvCommand` recibe `{CvText, JobText}` strings | El backend **re-analyze** el CV y la vacante en cada llamada a `/score` (regex interno), en vez de aceptar el resultado del análisis previo |
| `InputPanel` exige `cvText ≥ 200 chars`, `jobText ≥ 100 chars` | Sin validación estructurada; sin feedback al usuario sobre **qué falta** (e.g. "falta experiencia", "falta email de contacto") |
| `ImportResult` no expone **contacto** (email, phone, links) | Hoy el usuario tiene que tipear el email en el editor manualmente tras importar |
| `ImportResult` no expone **items de skills** (lista tipada) | El score engine hoy tiene que escanear el texto otra vez con `SkillScanner` |

---

## Affected Areas

### API (`BuildCv-api/`)

| Path | Por qué se afecta |
|---|---|
| `src/BuildCv.Application/Features/Import/ImportTypes.cs` | `ImportSection` es `{Heading, Start, End, Confidence}` → debe evolucionar a sección tipada con `Kind` + `Body` + `Items[]` |
| `src/BuildCv.Application/Features/Import/ICvParser.cs` | El puerto `Parse` devuelve `ImportResult`; firma estable, pero el shape cambia |
| `src/BuildCv.Application/Features/Import/SectionDetector.cs` | Hoy regex heurístico sobre MAYÚSCULAS. Debe pasar a **constructor de secciones estructuradas** (kind + items) |
| `src/BuildCv.Application/Features/Import/ImportCvHandler.cs` | Pasa-through, pero debe manejar el nuevo shape |
| `src/BuildCv.Application/Features/Scoring/ScoreCvCommand.cs` | Hoy `(string CvText, string JobText)`. Evolución a `(CvDocument Cv, JobSpec Job)` o mantener `(string, string)` con flag opcional |
| `src/BuildCv.Application/Features/Scoring/ScoreCvHandler.cs` | Decide qué analyzer invocar; podría saltarse análisis si ya viene estructurado |
| `src/BuildCv.Application/Features/Scoring/ScoreCvValidator.cs` | Hoy valida solo `MaximumLength(20_000)`. Debe validar shape si la entrada es estructurada |
| `src/BuildCv.Domain/Resumes/CvAnalyzer.cs` | Ya hace section-split interno. Podría aceptar **secciones pre-tipeadas** y obviar el regex |
| `src/BuildCv.Domain/Jobs/JobAnalyzer.cs` | Idem — `Headers` dict ya produce 4 kinds (`must`/`nice`/`resp`/`title`). Solo falta aceptar input estructurado |
| `src/BuildCv.Api/Endpoints/ImportEndpoints.cs` | Mapping del nuevo `ImportResult` al DTO HTTP (rate-limit `import` 30/h se mantiene) |
| `src/BuildCv.Api/Endpoints/ScoringEndpoints.cs` | Body bind para el nuevo command |
| `src/BuildCv.Api/Contracts/ImportContracts.cs` | DTOs: `ImportSectionDto` (hoy posicional) → tipado |
| `src/BuildCv.Api/Contracts/ScoreResponse.cs` + `ScoreResponseMapper.cs` | Idem si el score response gana breakdown por sección (opcional) |
| `src/BuildCv.Infrastructure/Parsing/PdfPigCvParser.cs` | Debe construir secciones estructuradas en vez de delegar a `SectionDetector` |
| `src/BuildCv.Infrastructure/Parsing/OpenXmlCvParser.cs` | Idem; **además DOCX tiene estructura nativa** (`Paragraph`, `Table`, `SdtBlock`) — debería preservar listas y tablas |
| `src/BuildCv.Infrastructure/Parsing/ParserRouter.cs` | Sin cambios (dispatcher puro) |

### Domain (`BuildCv-api/src/BuildCv.Domain/`)

| Path | Por qué |
|---|---|
| `Resumes/CvAnalysis.cs` | Si el contrato cambia, debe aceptar `SectionsProvided: bool` para bypass del regex interno |
| `Jobs/Requirement.cs` + `JobRequirementSet` | Si se expone como `JobSpec`, podría crearse un DTO en Application (mantener Domain PURO) |
| `Text/SectionSplitter.cs` | Sin cambios (regex interno de los analyzers); pero el `Import` ya no lo usaría porque el parser entrega secciones directas |

### Web (`BuildCv-web/`)

| Path | Por qué |
|---|---|
| `lib/api/types.ts` | `ImportResult` (líneas 230-236): evolucionar a `{ cv: CvDocument, warnings, engineVersion, traceId }`. `ScoreResponse` puede ganar `sectionsBreakdown?: SectionScore[]` |
| `lib/api/score.ts` | `requestScore(cvText, jobText)` firma → `requestScore(cv: CvDocument, job: JobSpec)` (o ambas con discriminated union) |
| `lib/api/import.ts` | `requestImport(file)` → sin cambios de firma, pero parsea el nuevo shape |
| `lib/editor/types.ts` | `CvDocument`, `CvSection`, `EntityRef`, `Draft` ya están. Si el import devuelve `CvDocument` directo, **se elimina el round-trip MD** (gran ahorro) |
| `lib/editor/markdown/parse.ts` | Hoy se invoca desde `Editor.tsx` para parsear `ImportResult.text`. Si import entrega estructurado, el `parseCvDocument` se vuelve opcional (solo para pegar MD manualmente) |
| `lib/editor/schema/*` | Zod schemas ya existen. Se reutilizan para validar el `ImportResult.cv` antes de aceptar (defense in depth, Art. I FR-029a) |
| `lib/storage/icv-store.ts` | `LocalStorageCvStore` ya persiste `Draft` con `CvDocument`. Sin cambios |
| `components/analyzer/input-panel.tsx` | Validación actual `CV_MIN=200`, `JOB_MIN=100`. Evoluciona a validación estructurada con Zod (mensajes específicos: "Falta email", "Falta experiencia") |
| `components/analyzer/analyzer.tsx` | `analyze()` pasa `cvText/jobText` strings → pasa `cv: CvDocument / job: JobSpec` (o un objeto con el CV ya importado del editor + job del textarea) |
| `components/import/import-button.tsx` | `goToAnalyze(text)` guarda el texto a localStorage. Si import entrega `CvDocument`, debe guardar el documento completo (no el texto) |
| `components/editor/editor.tsx` | Línea 144-152: hoy invoca `parseCvDocument(handoff.importedText)` si el handoff trae solo texto. Si el import entrega `CvDocument` directo, ese bloque se simplifica a `setDocument(handoff.cv)` |
| `app/analizar/page.tsx` + `app/importar/page.tsx` | Sin cambios significativos |
| `app/api/import/route.ts` | Sin cambios (passthrough) |
| `app/api/score/route.ts` | Debe aceptar el nuevo body shape (probablemente JSON con `cv` y `job` como objetos) |
| `components/analyzer/analizar-screen.tsx` | Lee preseed de localStorage. Si el preseed es `CvDocument` (no string), cambia `Preseed` shape |
| `lib/copy/es.ts` | Textos del ImportErrorPanel, JobRequired state, etc. (es-CO neutral; ver Art. IV) |

### Specs existentes (referencias, no se modifican en explore)

| Path | Rol en la propuesta |
|---|---|
| `BuildCv-api/specs/002-score-engine/spec.md` | Score engine determinista — NO cambia el algoritmo, solo el input shape |
| `BuildCv-api/specs/005-cv-pdf-docx-import/spec.md` + `data-model.md` + `contracts/import-api.md` | Contrato actual del import; **evoluciona** (versión 2.0.0 con breaking change) |
| `BuildCv-web/specs/006-web-cv-editor/spec.md` + `data-model.md` | El `CvDocument` ya está definido. Esta propuesta **lo expone al import endpoint** |
| `BuildCv-api/specs/003-adapt-ia/spec.md` | Adapt IA: sigue recibiendo `cvText` + `jobText` (no es afectado) — aunque podría aceptar el nuevo shape en v2 |
| `BuildCv-web/specs/000-INDEX.md` | Tiene `020-a11y-automated-audit` ya planeado. **Conflicto de numeración** |

---

## Approaches

### A — Mínimo: extender `ImportResult` con secciones tipadas (mantiene /score text-only)

- **Descripción:** Solo cambia el contrato del import. `ImportResult.sections` evoluciona de `{heading, start, end, confidence}` a `{kind: "experience" | "education" | ..., heading, items: string[], entities: {emails, phones, links, dates}[]}`. El score endpoint **NO cambia**: el editor sigue serializando a Markdown.
- **Pros:**
  - Riesgo bajo: un solo endpoint cambia; el editor ya tiene schema para validar.
  - Engine v1.0.0 sin tocar (preserva Art. II determinismo sin re-test masivos).
  - 002-score-engine, 003-adapt-ia, 018-iteration-loop: cero cambios.
- **Cons:**
  - **No cumple el requisito "ambos CV y job procesados estructuradamente"** — el job sigue siendo text-only con regex.
  - El score sigue haciendo regex interno redundante.
  - El usuario tiene que tipear el job text en un textarea (sin validación estructurada del job).
- **Effort:** Low-Medium (~250 LOC backend, ~150 LOC web, ~80 test)

### B — Full structured CV + Job schema en /score (reusa 006 CvDocument, redefine /score)

- **Descripción:** Reescribe el contrato de `POST /api/v1/score` a `{cv: CvDocument, job: JobSpec}` donde:
  - `CvDocument` = el mismo del editor 006 (8 secciones tipadas)
  - `JobSpec` = `{title: string, must: string[], nice: string[], responsibilities: string[], contextHash?: string}`
  - El response gana `sectionsBreakdown: { kind, score, evidence[] }[]`
  - `ScoreCvHandler` salta `CvAnalyzer.Analyze` y `JobAnalyzer.Analyze` cuando recibe documentos estructurados, y pasa directamente al `ScoringEngine`.
- **Pros:**
  - Cubre 100% del requisito del usuario.
  - Determinismo del score engine **se preserva** (mismas funciones puras; solo cambia el input pre-analizado).
  - Art. V se refuerza: el CV y el job llegan **tipados** (no como string opaco susceptible a prompt-injection en el flujo de score; el flujo de score **no usa LLM** igual, pero defensivo).
  - Eliminación del round-trip Markdown en el editor → menos código, menos bugs.
  - Reutiliza el 100% del trabajo de 006-web-cv-editor (no reinventar schema).
- **Cons:**
  - Breaking change en `/api/v1/score` → requiere versionado (`/api/v2/score`) o feature flag con backward-compat.
  - Mayor superficie de tests: ~25 tests nuevos solo en scoring handler/validator/endpoint.
  - JobSpec es una invención nueva (no existe schema hoy) → hay que diseñarla desde cero con Zod + DataAnnotations.
  - Requiere actualizar **003-adapt-ia** (también recibe cvText/jobText hoy) y **018-iteration-loop** (consume ambos). Esto se vuelve una **cascada de cambios**.
- **Effort:** High (~600 LOC backend, ~350 LOC web, ~150 test) → **obliga a chained PRs** (3-4 PRs)

### C — Híbrido recomendado: import estructurado + job validado (score mantiene text)

- **Descripción:** Compromiso entre A y B.
  - `ImportResult` evoluciona a `{cv: CvDocument, warnings[], engineVersion, traceId}` — el CV llega **estructurado** desde el backend.
  - `POST /api/v1/score` **se mantiene** con `(string CvText, string JobText)` — Art. II sin tocar.
  - El editor elimina el round-trip `parseCvDocument` y consume `ImportResult.cv` directo (`setDocument(handoff.cv)`).
  - **Validación del job** se endurece: Zod schema en `lib/api/types.ts` con `minLength(100)`, `maxLength(20_000)`, regex para detectar email/URL del empleador, y campo opcional `jobSpec?: { title, company, requirements: string[] }` que el usuario puede llenar (UX: botón "Estructurar vacante" opcional).
  - **El score sigue siendo determinista** — solo se cambia **qué** consume el `ScoreCvHandler`: en vez de pasar el `CvDocument` (que requiere reshape), el editor serializa a Markdown solo para `/score` (o acepta el `text` que el backend puede regenerar desde `CvDocument` con un helper).
  - **El CV estructurado se persiste en localStorage** vía `LocalStorageCvStore` (ya existe `Draft.document: CvDocument`).
- **Pros:**
  - Cubre el 80% del dolor real del usuario (import pierde estructura → fixed).
  - Valida job (cumple "validación explícita").
  - **No toca 002-score-engine, 003-adapt-ia, 018-iteration-loop** → cero cascada.
  - Score endpoint backward-compat: clientes externos (si los hay) siguen funcionando.
  - Bajo riesgo de regresión.
  - Encaja en **2 chained PRs** (~400 líneas cada uno, dentro del budget).
- **Cons:**
  - El score **internamente** sigue haciendo regex sobre el CV (porque recibe texto plano), pero el **artefacto de usuario** es estructurado.
  - Job no se "estructura" automáticamente — solo se valida más fuerte (con la opción opcional de tipar).
  - Si el usuario quiere análisis por sección en el response (recomendación por sección específica), hay que añadirlo en v2.
- **Effort:** Medium (~350 LOC backend, ~250 LOC web, ~100 test) → 2 chained PRs

---

## Recommendation

**Recomiendo Approach C (Híbrido)** porque:

1. **Maximiza el valor para el usuario con mínimo riesgo.** El dolor #1 del usuario es que el import pierde estructura. Approach C lo arregla de un plumazo sin tocar el score engine (que ya está shipped, testeado, y es el activo defendible del proyecto — Art. II "motor determinista sellado").

2. **Reutiliza trabajo existente.** El `CvDocument` con 8 secciones tipadas de 006-web-cv-editor ya está shipped. Approach C lo expone directamente al import, eliminando el round-trip `parseCvDocument` (cuyo regex MD es frágil — bug surface conocido).

3. **Cumple Art. I, II, III, V, VI, VII, VIII, IX sin enmienda constitucional.** No introduce LLM en el score (Art. II), no agrega persistencia server-side (Art. III), no invierte reglas existentes, mantiene Clean Arch (Art. VI — el `ICvParser` port sigue siendo el mismo), respeta rate-limit (Art. VII).

4. **Encaja en 2 chained PRs (~400 LOC cada uno):**
   - **PR1 — Backend structured import:** `ImportResult` v2 + `ImportSection` tipado + parsers (PdfPig/OpenXml) emiten secciones estructuradas + DTOs + tests + OpenAPI. ~350 LOC.
   - **PR2 — Web consume structured import + job validation:** `requestImport` parsea nuevo shape + `InputPanel` valida con Zod + `Editor.tsx` consume `ImportResult.cv` directo (sin round-trip) + job Zod schema + tests + accesibilidad. ~250 LOC.

5. **Deferrable a v2 sin arrepentimiento.** Si en el futuro el usuario quiere score por sección (Approach B), el schema `CvDocument` ya está en el contrato → es solo cambiar el body de `/score` y `ScoreCvHandler` para aceptar el documento pre-estructurado. No se pierde trabajo.

### Naming

⚠️ **Conflicto de numeración detectado:** `BuildCv-web/specs/000-INDEX.md` ya tiene planeado **`020-a11y-automated-audit`** (v0.5.3, a11y automatizada). Renombrar este change a **`021-structured-cv-import-and-job-input`** antes de promote-to-spec. Alternativamente, si el owner decide que el alcance structured-import es más prioritario que a11y-audit, se puede absorber y mover a11y-audit a `022`.

### Delivery strategy

- **Strategy:** `ask-on-risk` (default; el orchestrator ya cachea esto).
- **Forecast 400-line budget:** 2 chained PRs → cada PR <400 líneas → **budget risk: Low**.
- **Decision needed before apply:** No — siempre que el owner apruebe Approach C y el renombre a 021.
- **Chained PRs recommended:** Yes — PR1 backend + PR2 web (sequential, autonomous scopes).

---

## Risks

1. **Conflicto de numeración con `020-a11y-automated-audit`** (PLANNED en web specs/000-INDEX.md). Mitigation: renombrar este change a `021-structured-cv-import-and-job-input`. Resolver ANTES de `sdd-spec`.

2. **Breaking change en `ImportResult`** (Approach A o C). Mitigation: bumpear `engineVersion` de `1.0.0` → `2.0.0` (SemVer MAJOR), documentar en OpenAPI changelog, mantener endpoint path `/api/v1/import` (NO romper ruta). El frontend debe desplegarse en el mismo PR que el backend (deploy atómico) — esto ya es la convención del monorepo (mismo commit si cruza).

3. **Parser accuracy (DOCX con tablas/listas):** `OpenXmlCvParser.AppendElementText` hoy aplana tablas con `\t` entre celdas (línea 124-130). Si migramos a secciones estructuradas, **preservar tablas como items con campos** (e.g., `ExperienceSection.bullets[]`). Tests nuevos con DOCX reales (golden set del 002).

4. **PDF layout no estructurado:** PdfPig no preserva estructura semántica del PDF. Mitigation: regex heurístico sobre headers sigue funcionando; los warnings deben **decir claramente** "PDF sin estructura semántica detectable — X secciones inferidas, Y por confirmar manualmente". El usuario puede corregir en el editor (006).

5. **Job validation estricta puede romper UX:** si exigimos estructura (no solo texto), el usuario tiene que tipear campos separados → fricción. Mitigation: Approach C mantiene el textarea de texto como primary, y `jobSpec` es **opcional**. El usuario que quiera精细 control lo llena; el resto pega texto y el score engine hace su magia heurística.

6. **Cascada hacia 002-score-engine, 003-adapt-ia, 018-iteration-loop:** Approach C la evita. Approach B la activa. Recommendation es C → riesgo 0.

7. **localStorage quota:** `LocalStorageCvStore` ya tiene `QuotaExceededError` handler. `CvDocument` estructurado es más pesado que el texto plano (~2-3× por la metadata de IDs, dates, entities). Mitigation: ya documentado como **deuda técnica v1** (`IndexedDbCvStore` deferred). No nuevo.

8. **`engineVersion` sellado (Art. II):** bumpear de `1.0.0` a `2.0.0` requiere actualizar `ImportErrorCodes` (?) y los tests que asumen `1.0.0`. Tarea mecánica en PR1.

9. **Round-trip loss:** hoy el editor (006) hace `parseCvDocument(text)` con regex MD. Si el import devuelve `CvDocument` directo, **ese regex se vuelve innecesario**, pero algunos usuarios podrían seguir pegando MD manualmente en el editor → mantener el parser como fallback. Tests deben cubrir ambos paths.

10. **Constitution compliance check:** si el parser quiere "estructurar" usando un LLM (e.g. LLM resume bullets de experiencia), **viola Art. I + Art. II** (invención + LLM en el flujo de import si el output entra al score). Approach C mantiene todo heurístico en backend → sin riesgo. Si en el futuro el owner quiere LLM structuring, requeriría enmienda constitucional explícita (Art. I FR-029a cubre defensa en profundidad en cliente, pero el backend tendría que añadir el mismo gate).

---

## Ready for Proposal

**Yes** — pero con 3 clarificaciones que el orchestrator debe pedir al user antes de `sdd-propose`:

### Q1 — Numeración
¿Renombrar a `021-structured-cv-import-and-job-input` (recomendado, evita colisión con `020-a11y-automated-audit`) o absorber ese alcance?

### Q2 — Approach
¿Approach C (Híbrido, recomendado — 2 chained PRs, sin tocar 002/003/018) o Approach B (Full structured score — más alcance, 3-4 chained PRs, toca 002/003/018)?

### Q3 — Job spec opcional vs obligatorio
¿El campo `jobSpec?: { title, company, requirements: string[] }` debe ser **opcional** (el usuario pega texto como hoy, con validación más estricta) o **obligatorio** (forzar estructura, romper UX actual)?

Una vez resueltas las 3 preguntas, `sdd-propose` puede arrancar directamente sin más exploraciones.
