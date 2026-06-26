# Delta for 005-cv-pdf-docx-import

> **Status**: DELTA (change 021-structured-cv-import-and-job-input)
> **Bumps**: `ImportResult.engineVersion` 1.0.0 → **2.0.0** (breaking)
> **Constitution**: Art. I (confidence markers, zero invention), Art. V (input as data)

## ADDED Requirements

### Requirement: ImportResult v2.0.0 carries structured CvDocument

The system MUST return `ImportResult` shaped as `{ cv: CvDocument, warnings: Warning[], engineVersion: "2.0.0", traceId: string }`. The `CvDocument` MUST follow the JSON Resume schema (`basics`, `work`, `education`, `skills`, `projects`, `certificates`, `languages`, plus optional Colombian `datosPersonales` extension). Legacy fields `text` and `sections[]` MUST NOT appear in v2.0.0 responses.

#### Scenario: PDF parsed to structured CV

- GIVEN a 2-page PDF with name, contact, 3 work entries, 1 education entry, and 8 skills
- WHEN `POST /api/v1/import` is called
- THEN the response `cv.basics.name`, `cv.work.length === 3`, `cv.education.length === 1`, `cv.skills[0].keywords.length === 8` are populated and `engineVersion === "2.0.0"`

#### Scenario: Engine version mismatch on v2 contract

- GIVEN a client that requests the v1 shape
- WHEN it sends `Accept: application/vnd.buildcv.import.v1+json` (or the `?version=1` query)
- THEN the legacy `{text, sections[]}` payload is returned with `engineVersion: "1.0.0"` (shim, see Rollback Plan)

### Requirement: Every parsed field carries a confidence marker (Art. I)

The system MUST tag every value in the returned `CvDocument` with `confidence: 'inferred' | 'explicit' | 'user_confirmed'`. Default for parsed (non-user-confirmed) values MUST be `'inferred'` when the parser derived the value via heuristic and `'explicit'` when the value was directly read from a structured source (PDF form field, DOCX heading hierarchy).

#### Scenario: Inferred marker on heuristic field

- GIVEN a PDF where the parser infers `cv.basics.email` from a regex over the header line
- WHEN the response is returned
- THEN `cv.basics.email === { value: "j@x.com", confidence: "inferred" }` (or equivalent typed shape)

#### Scenario: Explicit marker on structured source

- GIVEN a DOCX with `coreProperties.creator` set
- WHEN parsed
- THEN `cv.basics.name.confidence === "explicit"`

#### Scenario: No auto-promotion to user_confirmed

- GIVEN any parsed field regardless of regex confidence score
- WHEN returned
- THEN `confidence` MUST be either `'inferred'` or `'explicit'` — never `'user_confirmed'` (only the editor UI sets that marker on save)

### Requirement: Section detection evolved to structured discriminator

The system MUST emit a discriminated union per detected section: `{ kind: 'basics' | 'work' | 'education' | 'skills' | 'projects' | 'certificates' | 'languages' | 'other', entries: Entry[], sectionConfidence: 'High' | 'Low' }`. The previous free-form `heading` field is replaced by `kind`; unknown headings fall under `kind: 'other'` with the original heading preserved in `entries[i].rawHeading`.

#### Scenario: Header maps to discriminator

- GIVEN a CV containing `EXPERIENCIA LABORAL` as a heading
- WHEN parsed
- THEN the response contains a section with `kind === "work"` (not the literal string)

#### Scenario: Unknown header preserved

- GIVEN a CV containing `PUBLICACIONES` (not in the recognized set)
- WHEN parsed
- THEN a section with `kind === "other"` is returned and `entries[0].rawHeading === "PUBLICACIONES"`

### Requirement: Colombian datosPersonales extension preserved

The system MUST surface Colombian fields (`cedula`, `nacionalidad`, `estadoCivil`, `libretaMilitar`, `rh`) under `cv.basics.datosPersonales` when present in the source document. When absent, the field MUST be `undefined` (NOT omitted from schema, NOT an empty object).

#### Scenario: Cedula extracted

- GIVEN a PDF with `C.C. 1.234.567.890`
- WHEN parsed
- THEN `cv.basics.datosPersonales?.cedula === "1234567890"`

#### Scenario: Extension absent

- GIVEN a CV without Colombian fields
- WHEN parsed
- THEN `cv.basics.datosPersonales === undefined`

## MODIFIED Requirements

### Requirement: FR-039 — ImportResult JSON shape

The system MUST accept PDF/DOCX via `POST /api/v1/import` and return `ImportResult` JSON with the v2 shape `{ cv, warnings, engineVersion: "2.0.0", traceId }`.
(Previously: v1 returned `{ text, sections, warnings, engineVersion: "1.0.0", traceId }`.)

#### Scenario: PDF accepted and parsed

- GIVEN a 2-page PDF
- WHEN uploaded via multipart/form-data
- THEN HTTP 200 with `ImportResult.engineVersion === "2.0.0"` and `cv` populated

#### Scenario: DOCX accepted and parsed

- GIVEN a 1-page DOCX with sections
- WHEN uploaded
- THEN HTTP 200 with structured `cv` and `engineVersion === "2.0.0"`

### Requirement: FR-039d — ImportResult contract schema

The system MUST return `ImportResult` with the v2 schema: `{ cv: CvDocument, warnings: Warning[], engineVersion: "2.0.0", traceId: string }`.
(Previously: schema was `{ text: string, sections: Section[], warnings: Warning[], engineVersion: "1.0.0", traceId: string }`.)

#### Scenario: Schema matches v2 exactly

- GIVEN any successful import
- WHEN the response is JSON-parsed
- THEN `result.cv` is present and `result.text` is absent

#### Scenario: Section discriminated union

- GIVEN a CV with 3 work entries
- WHEN parsed
- THEN `result.cv.work.length === 3` and `result.cv.work[0].confidence` is set

### Requirement: FR-039f — Section detection

The system MUST map detected section headers to a discriminator (`kind`) using the same set as FR-039f (`EXPERIENCIA`, `EDUCACIÓN`, `HABILIDADES`, `PROYECTOS`, `CONTACTO`, `PERFIL`, `RESUMEN`, `IDIOMAS`, `CERTIFICACIONES`, plus English equivalents), with the discriminator replacing the free-form `heading` string.
(Previously: detection returned free-form `heading` strings with `confidence: "High" | "Low"`; the v2 discriminator carries `sectionConfidence: "High" | "Low"` per section and per-entry `confidence` markers.)

#### Scenario: Spanish header recognized

- GIVEN a header `HABILIDADES`
- WHEN detected
- THEN a section with `kind === "skills"` is emitted

#### Scenario: English header recognized

- GIVEN a header `EDUCATION`
- WHEN detected
- THEN a section with `kind === "education"` is emitted

### Requirement: FR-039i — engineVersion sealing

The system MUST seal `engineVersion` and `traceId` in every `ImportResult`; v2 requests MUST receive `engineVersion: "2.0.0"`.
(Previously: v1 sealed `engineVersion: "1.0.0"` with the legacy `{text, sections[]}` payload.)

#### Scenario: Version is always present

- GIVEN any successful import
- WHEN the response is returned
- THEN `engineVersion === "2.0.0"` and `traceId` is a valid ULID/Activity.Id

## REMOVED Requirements

### Requirement: FR-039d (legacy text + sections fields)

(Reason: superseded by the structured `cv` field; downstream consumers must migrate. The Rollback Plan keeps `text` regenerable from `CvDocument` via `serializeCvDocument()`.)
(Migration: clients consuming v1 shape must request `Accept: application/vnd.buildcv.import.v1+json`; otherwise they receive the v2 shape and parse `cv`.)

## Rollback Plan Scenarios

### Requirement: Rollback via engineVersion pin

The system MUST allow `engineVersion: "1.0.0"` to be requested explicitly on `/api/v1/import`. When that header is present, the response MUST be regenerated in v1 shape (with `text` derived from `cv` via `serializeCvDocument()` and `sections` reconstructed from the discriminator).

#### Scenario: Pin to v1 returns legacy shape

- GIVEN the server still has v2 parsers deployed but the client requests v1
- WHEN the request includes `engineVersion: "1.0.0"`
- THEN `ImportResult.text` and `ImportResult.sections[]` are present and `cv` is absent

#### Scenario: Rollback to v1 server build

- GIVEN the owner decides to roll back to the v1 server build
- WHEN the v1 build is deployed
- THEN the v1 endpoint is live and clients that had pinned `1.0.0` continue working; clients on v2 receive a 404 + `detail: "Use engineVersion: 1.0.0"`

### Requirement: Web client dual-path during transition

The web client MUST support both shapes via `NEXT_PUBLIC_STRUCTURED_INPUT` flag (default `off` during the rollout window). When the flag is `off`, the client requests `engineVersion: "1.0.0"`; when `on`, it uses `2.0.0`.

#### Scenario: Flag off — v1 path

- GIVEN `NEXT_PUBLIC_STRUCTURED_INPUT === "false"`
- WHEN the user uploads a CV
- THEN the client receives `{text, sections}` and seeds the v1 editor

#### Scenario: Flag on — v2 path

- GIVEN `NEXT_PUBLIC_STRUCTURED_INPUT === "true"`
- WHEN the user uploads a CV
- THEN the client receives `{cv: CvDocument}` and seeds the JSON-Resume-compatible editor

## Out of Scope

- OCR for scanned PDFs — covered by 005 v1+.
- LLM-based structuring — forbidden by Art. I/II.
- Direct JSON Resume authoring UI — covered by 006-web-cv-editor.

---

## Status

**MERGED** into `BuildCv-api/specs/005-cv-pdf-docx-import/spec.md` at 2026-06-26 (sdd-archive, change 021-structured-cv-import-and-job-input).

The complete delta (ADDED + MODIFIED + REMOVED + Rollback Plan) was appended as a new section `## v2.0.0 Changes (delta from change 021-structured-cv-import-and-job-input, archived 2026-06-26)` at the bottom of the main spec. The v2 contract (`engineVersion: "2.0.0"`, structured `cv: CvDocument` with `confidence` markers, section discriminator) is now the source of truth in `BuildCv-api/specs/005-cv-pdf-docx-import/spec.md`.

See `BuildCv-web/specs/021-structured-cv-import-and-job-input/archive-report.md` for full archive summary.