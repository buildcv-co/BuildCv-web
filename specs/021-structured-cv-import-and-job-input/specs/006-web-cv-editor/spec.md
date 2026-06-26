# Delta for 006-web-cv-editor

> **Status**: DELTA (change 021-structured-cv-import-and-job-input)
> **Migration**: custom 8-section `CvDocument` → JSON Resume compatible; UI migrates to open-resume-inspired section forms
> **Constitution**: Art. I FR-029a (no entity invention), Art. III (local persistence only)

## ADDED Requirements

### Requirement: Editor stores JSON Resume compatible CvDocument

The system MUST persist `CvDocument` shaped as JSON Resume: `{ basics, work, education, skills, projects, certificates, languages, references, awards, interests, meta }`. The legacy 8-section shape (`Profile`, `Experience`, `Education`, `Skills`, `Projects`, `Certifications`, `Languages`, `Other`) MUST be retired on the v2 path; the new path is JSON Resume + a Colombian `datosPersonales` extension under `basics`.

#### Scenario: Save produces JSON Resume shape

- GIVEN the user edits and clicks "Guardar borrador"
- WHEN the editor persists to `LocalStorageCvStore`
- THEN `draft.cv.basics.name`, `draft.cv.work[0]` (JSON Resume work entry shape) are present and the legacy `Profile` section is absent

#### Scenario: Round-trip preserves fields

- GIVEN a `CvDocument` is loaded and re-saved
- WHEN compared via Zod `DraftSchema`
- THEN the document is structurally equivalent (`safeParse` succeeds) and field count is preserved

### Requirement: Confidence markers visualized and user-confirmable

The system MUST render each `CvDocument` field with its `confidence` marker. Fields with `confidence === "inferred"` MUST be visually distinguished (e.g. dashed border + tooltip "Inferido del PDF/DOCX — confirma para fijarlo"). On user confirmation (blur after edit OR explicit "Confirmar" button), `confidence` MUST be promoted to `"user_confirmed"`.

#### Scenario: Inferred field highlighted

- GIVEN `cv.basics.email.confidence === "inferred"`
- WHEN the editor renders the Basics form
- THEN the email input has a visual indicator and a tooltip explaining the inference

#### Scenario: Edit promotes to user_confirmed

- GIVEN the user types into an inferred field
- WHEN the input loses focus
- THEN `confidence` is set to `"user_confirmed"` and the visual indicator is removed

#### Scenario: No auto-promotion

- GIVEN a field is shown but not edited
- WHEN the user clicks "Guardar borrador"
- THEN the field's `confidence` remains `"inferred"` (no auto-promotion; defense in depth, Art. I)

### Requirement: Section-based forms replace single textarea

The system MUST render the editor as **section-based forms** inspired by `xitanggg/open-resume` (UX reference only, no copy): `BasicsForm`, `WorkList`, `EducationList`, `SkillsByCategory`, `ProjectsList`, `CertificatesList`, `LanguagesList`. Each section has a typed schema in `lib/editor/schema/json-resume/*.ts`. Each section form MUST add, edit, and remove items via Zod-validated mutations.

#### Scenario: Work list add/edit/remove

- GIVEN the Work section is rendered
- WHEN the user clicks "Agregar experiencia", fills the form, and saves
- THEN a new entry appears in `cv.work` and Zod `WorkEntrySchema.safeParse` succeeds

#### Scenario: Removing an item

- GIVEN a work entry exists
- WHEN the user clicks "Eliminar" and confirms
- THEN the entry is removed from `cv.work` and the count decreases by 1

### Requirement: Colombian datosPersonales sub-form

The system MUST render `datosPersonales` fields (`cedula`, `nacionalidad`, `estadoCivil`, `libretaMilitar`, `rh`) inside the `BasicsForm` when the form is in Colombian locale (`navigator.language.startsWith("es-CO")`) OR when the imported CV carries these fields. The sub-form MUST NOT auto-fill from heuristics — values come only from explicit user input (Art. I).

#### Scenario: Locale-triggered sub-form

- GIVEN `navigator.language === "es-CO"`
- WHEN the editor mounts
- THEN `datosPersonales` fields are visible in the `BasicsForm`

#### Scenario: Import carries data

- GIVEN the import response contains `cv.basics.datosPersonales.cedula = "123..."`
- WHEN the editor pre-populates
- THEN the cedula field shows that value with `confidence === "inferred"`

### Requirement: LocalStorageCvStore carries confidence

The system MUST round-trip `confidence` markers through `LocalStorageCvStore.save/load` without losing them. The `Draft` schema MUST include the full per-field confidence shape.

#### Scenario: Save preserves confidence

- GIVEN `draft.cv.work[0].position.confidence === "user_confirmed"`
- WHEN the draft is saved and reloaded
- THEN the same confidence value is restored

#### Scenario: Zod rejects malformed draft

- GIVEN a draft with a missing `confidence` field on any entry
- WHEN `DraftSchema.safeParse` runs
- THEN it fails with a typed error pointing to the field

## MODIFIED Requirements

### Requirement: FR-057 — section validation

The system MUST validate the `CvDocument` against JSON Resume Zod schemas (per section) in the parse, edit, save, and export pipeline.
(Previously: validation used 8 custom Zod schemas matching the legacy 8-section shape.)

#### Scenario: JSON Resume schema applied

- GIVEN a user types a new work entry
- WHEN `WorkEntrySchema.safeParse` runs
- THEN the entry conforms to JSON Resume (`name`, `position`, `startDate`, `endDate?`, `summary?`, `highlights?`)

#### Scenario: Round-trip rejection preserved

- GIVEN the round-trip Markdown→Document→Markdown
- WHEN the document is parsed
- THEN it conforms to `DraftSchema` and no entities have been added (Art. I FR-058)

### Requirement: FR-061 — Markdown round-trip functions

The system MUST provide `serializeCvDocument` and `parseCvDocument` for JSON Resume shaped documents.
(Previously: the round-trip targeted the legacy 8-section shape.)

#### Scenario: Serialize to Markdown

- GIVEN a valid `CvDocument`
- WHEN `serializeCvDocument(cv)` runs
- THEN the output is a stable Markdown representation that round-trips through `parseCvDocument` to an equivalent `CvDocument`

#### Scenario: Markdown parser uses JSON Resume headings

- GIVEN a Markdown with `## Experience`, `## Education`, `## Skills` headings
- WHEN `parseCvDocument(md)` runs
- THEN the result maps to `cv.work`, `cv.education`, `cv.skills` respectively

### Requirement: FR-062 — re-score wiring

The system MUST call `POST /api/score` with structured payloads when the structured path is active.
(Previously: the editor called with `{ cvText, jobText }`.)

#### Scenario: Structured re-score call

- GIVEN the editor is on the v2 path and `jobSpec` is filled
- WHEN the user clicks "Re-puntuar"
- THEN `POST /api/score` is called with `{ cv: CvDocument, job: JobSpec, engineVersion: "2.0.0" }` and the response includes `perSection`

#### Scenario: Backward-compat fallback

- GIVEN the editor is in v1 mode (flag off)
- WHEN "Re-puntuar" is clicked
- THEN the legacy `{ cvText, jobText, engineVersion: "1.0.0" }` payload is sent

## REMOVED Requirements

### Requirement: Legacy 8-section shape on the v2 path

(Reason: superseded by JSON Resume; the v1 path keeps it during the rollback window.)
(Migration: clients importing v1 `ImportResult` (text + sections) call `parseCvDocument(text)` which produces the JSON Resume shape with `confidence === "inferred"` for all fields.)

## Rollback Plan Scenarios

### Requirement: NEXT_PUBLIC_STRUCTURED_INPUT flag controls rollout

The system MUST honor `NEXT_PUBLIC_STRUCTURED_INPUT` (default `"false"` during the rollout window). When `false`, the legacy editor (8 textareas, MD round-trip, `{ cvText, jobText }` payloads) is rendered. When `true`, the new JSON-Resume-shaped editor is rendered.

#### Scenario: Flag off — legacy editor

- GIVEN `NEXT_PUBLIC_STRUCTURED_INPUT === "false"`
- WHEN the user opens `/analizar/editar`
- THEN the legacy 8-textarea editor is rendered and `engineVersion: "1.0.0"` is sent

#### Scenario: Flag on — new editor

- GIVEN `NEXT_PUBLIC_STRUCTURED_INPUT === "true"`
- WHEN the user opens `/analizar/editar`
- THEN the section-based editor is rendered and `engineVersion: "2.0.0"` is sent

### Requirement: One-release coexistence

The system MUST ship both editor variants (legacy + JSON Resume) in the same bundle for at least one release cycle. Only after the v2 path is observed stable for one cycle is the legacy editor deleted.

#### Scenario: Bundle contains both paths

- GIVEN the ship cycle
- WHEN the build runs
- THEN both `components/editor/v1/*` and `components/editor/v2/*` are present and the flag chooses between them

## Out of Scope

- Tiptap / rich-text editing — explicitly rejected (see spec 006 §Resolved Decisions).
- LLM-suggested skills or rewording — Art. I violation.
- Multi-device sync — v1.
- Per-field validation that consults the backend (`POST /validate-cv`) — local Zod is the source of truth.