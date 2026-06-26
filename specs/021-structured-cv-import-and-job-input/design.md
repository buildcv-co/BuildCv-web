# Design: 021 — Structured CV Import + Mandatory Job Spec

> **Mode**: hybrid · **Approach**: B (structured end-to-end) · **Engine bump**: `1.0.0 → 2.0.0` (sealed) · **Slicing**: 6 chained PRs (each <400 LOC) · **Constitution**: Art. I (no invention + confidence), Art. II (deterministic C#), Art. III (no persistence), Art. V (input as data, anti prompt-injection), Art. VI (Domain purity), Art. VIII (TDD)

## Technical Approach

CV and Job travel as **typed JSON end-to-end** instead of `{CvText, JobText}`. Backend parsers (`BuildCv-api/src/BuildCv.Infrastructure/Parsing/{PdfPigCvParser,OpenXmlCvParser}.cs`) emit a JSON Resume `CvDocument` with per-field `confidence` markers; the `JobSpec` is a single mandatory structured payload. `ScoringEngine` (currently at `BuildCv-api/src/BuildCv.Domain/Scoring/ScoringEngine.cs`) gains a v2 path that consumes typed inputs directly, bypassing `CvAnalyzer`/`JobAnalyzer` regex (verified via test spy, spec `002-score-engine`). Frontend migrates from the 8-textarea `CvDocument` (`BuildCv-web/lib/editor/types.ts`) to **open-resume-inspired section forms** (UX reference only — `xitanggg/open-resume` is a builder; we ship an analyzer). The legacy v1 contract stays reachable for one release cycle via explicit `engineVersion: "1.0.0"` and `NEXT_PUBLIC_STRUCTURED_INPUT === "false"`.

## Architecture Decisions

### Decision: JSON Resume as CV contract

| Choice | Alternatives | Rationale |
|---|---|---|
| Adopt **JSON Resume** schema (`basics/work/education/skills/projects/certificates/languages` + Colombian `datosPersonales` under `basics`) | (a) extend the legacy 8-section shape; (b) build custom schema | Industry-standard, interoperable with `HR-JSON` ecosystem, mirrors TA vocabulary (the "per-section breakdown" the spec demands maps 1:1). The legacy shape lacks `projects`, `certificates`, and date ranges — required by `score-section-breakdown` for red-flag detection. |

### Decision: Discriminated-union command with `engineVersion` discriminator

| Choice | Alternatives | Rationale |
|---|---|---|
| `ScoreCvCommand = { cv, job, engineVersion: "2.0.0" } \| { cvText, jobText, engineVersion: "1.0.0" }` | (a) two separate endpoints (`/score` + `/score/v2`); (b) parallel payload fields (always send both) | Single URL (`POST /api/v1/score`) keeps infra + cache + observability simple. Discriminator at payload level matches how `engineVersion` is already sealed in responses (`BuildCv-api/src/BuildCv.Api/Contracts/ScoreResponse.cs`). Mixing `{cv, engineVersion: "1.0.0"}` returns `VERSION_MISMATCH` — refuses to silently downgrade. |

### Decision: Per-section scoring as pure Domain functions

| Choice | Alternatives | Rationale |
|---|---|---|
| Add `PerSectionScore`, `RedFlag`, `SectionId` records to `BuildCv.Domain/Scoring/`, alongside existing `ComponentScore`; recompute via `ScoringEngine.ScoreV2(cv, job)` with **no** `DateTime.UtcNow`/`Guid.NewGuid`/`Random` on the calc path | (a) score sections in the Application layer; (b) reuse regex `CvAnalyzer` even for structured input | Art. VI demands Domain purity; existing engine already pure. Property-based determinism test (`BuildCv.Domain.Tests/Scoring/ScoringEngineDeterminismPropertyTests.cs`) guarantees byte-identical output across 1000 parallel runs (Art. II FR-006). v1 path keeps `ComponentScore`; v2 path adds `perSection`/`redFlags` additively. |

### Decision: `confidence: 'user_confirmed'` only on editor save

| Choice | Alternatives | Rationale |
|---|---|---|
| Parser emits `'inferred'` or `'explicit'`; **only** the editor's `onBlur`/`onConfirm` handler promotes to `'user_confirmed'`; the auto-save handler does NOT promote untouched fields | (a) parser promotes high-confidence regex matches; (b) editor promotes everything visible | Art. I defense in depth. Parser never invents; promotion is an explicit user signal. The editor saves the unchanged inferred fields verbatim — Zod schema round-trip preserves them. |

### Decision: Section forms, not a builder

| Choice | Alternatives | Rationale |
|---|---|---|
| Ship **section-based forms** (`BasicsForm`, `WorkList`, `EducationList`, `SkillsByCategory`, `ProjectsList`, `CertificatesList`, `LanguagesList`) modeled on `xitanggg/open-resume` UX, **not** a free-form builder | (a) full WYSIWYG builder (Tiptap); (b) keep the legacy 8-textarea editor | `xitanggg/open-resume` is MIT (compatible reference, no copy). Purpose is "review/fix what the parser inferred", not "author from scratch". Avoids Tiptap bundle cost (rejected in `006-web-cv-editor` §Resolved Decisions). Reuses the existing `SectionNode` pattern in `components/editor/`. |

### Decision: Zod (web) + FluentValidation (api) for `JobSpec`

| Choice | Alternatives | Rationale |
|---|---|---|
| **Defense in depth**: Zod in `BuildCv-web/lib/job/job-spec.ts` AND FluentValidation in `BuildCv-api/src/BuildCv.Application/Features/Scoring/JobSpecValidator.cs` — same error codes, same Spanish messages | (a) Zod only on the BFF, rely on Minimal-API binding; (b) FluentValidation only | BFF must reject before opening a server connection (Art. V: reject before AI cost). Backend must defend independently against direct clients. A parity test (`BuildCv-web/lib/job/job-spec.parity.test.ts` + `BuildCv.Api.IntegrationTests/JobSpecValidatorParityTests.cs`) enforces byte-identical error codes for: oversized `description` → `JOB_SPEC_FIELD_TOO_LONG`, prompt-injection substring → `JOB_SPEC_PROMPT_INJECTION`, unknown enum → `JOB_SPEC_INVALID_ENUM`. |

### Decision: `NEXT_PUBLIC_STRUCTURED_INPUT` flag for rollback

| Choice | Alternatives | Rationale |
|---|---|---|
| Single flag defaults to `"false"`; rolls forward to `"true"` after one stable release cycle. Both editor variants ship in the same bundle (`components/editor/v1/*` + `components/editor/v2/*`); flag chooses at mount | (a) environment-gated build (different artifacts); (b) irreversible cutover | Web bundle keeps both paths = guaranteed rollback without redeploy. Matches the spec's `NEXT_PUBLIC_STRUCTURED_INPUT` semantics already drafted in `006-web-cv-editor/spec.md`. Aligns with backend's `engineVersion: "1.0.0"` shim. |

### Decision: `engineVersion` SemVer bump + observability tagging

| Choice | Alternatives | Rationale |
|---|---|---|
| `ScoringEngine.Version` becomes `public const string Version = "2.0.0"` (single literal in `BuildCv.Domain/Scoring/ScoringEngine.cs`); every observability event tags `context.engineVersion` (echoed from response, or `"n/a"`); version mismatch logs `ENGINE_VERSION_DOWNGRADE`/`_UPGRADE` | (a) keep `1.0.0` and add a `features[]` field; (b) silent failure | SemVer bump seals the contract (Art. II). `engineVersion` is **additive** in `BuildCv-web/lib/observability/types.ts` — v1 consumers ignore it without breaking. Mismatch detection surfaces rollout drift early. |

## Data Flow

```
[Browser]                            [BFF app/api/*]                          [.NET Backend]
   │                                       │                                       │
   │ 1. POST /api/import (multipart)       │                                       │
   ├──────────────────────────────────────►│  POST /api/v1/import (multipart)      │
   │                                       ├──────────────────────────────────────►│
   │                                       │                                       │─ PdfPigCvParser / OpenXmlCvParser
   │                                       │                                       │   • detect sections (SectionDetector)
   │                                       │                                       │   • emit CvDocument (JSON Resume shape)
   │                                       │                                       │   • tag confidence='inferred'/'explicit'
   │                                       │◄──────────────────────────────────────┤   ImportResult { cv, warnings, engineVersion: "2.0.0", traceId }
   │                                       │  (200 OK; ImportResult mapped)        │
   │◄──────────────────────────────────────┤                                       │
   │   2. Editor (open-resume-inspired)    │                                       │
   │      • pre-populated from ImportResult.cv                                  │
   │      • each field carries confidence                                      │
   │      • onBlur on edited field → confidence='user_confirmed'                │
   │      • JobSpecForm (mandatory Zod form)                                    │
   │                                                                             │
   │ 3. POST /api/score { cv, job, engineVersion: "2.0.0" }                     │
   ├──────────────────────────────────────►│  POST /api/v1/score { cv, job, "2.0.0" }│
   │                                       ├──────────────────────────────────────►│
   │                                       │  FluentValidation (JobSpec + JobSpecValidator)
   │                                       │       │                                │
   │                                       │       ▼                                │─ Domain: JobAnalyzer / CvAnalyzer SKIPPED
   │                                       │  ScoreCvHandler dispatches            │─ ScoringEngine.ScoreV2(cv, job, "2.0.0")
   │                                       │  (structured path)                    │   • perSection {experience, education, skills, certifications, contact}
   │                                       │                                       │   • redFlags (gaps, job-hopping)
   │                                       │◄──────────────────────────────────────┤   ScoreResponse { overallScore, perSection, redFlags, engineVersion: "2.0.0" }
   │◄──────────────────────────────────────┤                                       │
   │ 4. <SectionBreakdown/> renders perSection + redFlags                       │
   │   ErrorReporter tags context.engineVersion = response.engineVersion       │
```

## File Changes

| PR | File | Action | Description | LOC |
|---|---|---|---|---|
| **PR1 API contracts + validators** | `BuildCv-api/src/BuildCv.Domain/Resumes/CvDocument.cs` (NEW) | Create | JSON Resume `CvDocument` record + `DatosPersonales` + `ConfidenceMarker` enum | ~120 |
| | `BuildCv-api/src/BuildCv.Application/Features/Jobs/JobSpec.cs` (NEW) | Create | JobSpec record + `EmploymentType` enum + `JobSpecCodes` | ~80 |
| | `BuildCv-api/src/BuildCv.Application/Features/Jobs/JobSpecValidator.cs` (NEW) | Create | FluentValidation (length caps, enum, prompt-injection allowlist, unknown fields) | ~140 |
| | `BuildCv-api/src/BuildCv.Application/Features/Scoring/ScoreCvCommand.cs` | Modify | Discriminated union with `engineVersion` discriminator | ~30 |
| | `BuildCv-api/src/BuildCv.Application/Features/Scoring/ScoreCvValidator.cs` | Modify | Branch on `engineVersion`; apply `JobSpecValidator` for v2 | ~80 |
| | `BuildCv-api/src/BuildCv.Api/Contracts/ScoreResponse.cs` | Modify | Add `PerSectionResponse`, `RedFlagResponse`, optional fields | ~30 |
| **PR2 Parser restructure** | `BuildCv-api/src/BuildCv.Application/Features/Import/ImportTypes.cs` | Modify | `ImportSection` → discriminated union; add `ImportResult.Cv`; preserve legacy fields for shim | ~60 |
| | `BuildCv-api/src/BuildCv.Application/Features/Import/ICvParser.cs` | Modify | Add `ParseStructured` (returns CvDocument); keep `Parse` (returns ImportResult v1) | ~20 |
| | `BuildCv-api/src/BuildCv.Infrastructure/Parsing/PdfPigCvParser.cs` | Modify | Implement `ParseStructured`; preserve DOCX table/list semantics via `OpenXmlCvParser` test | ~180 |
| | `BuildCv-api/src/BuildCv.Infrastructure/Parsing/OpenXmlCvParser.cs` | Modify | Emit `work[]` with start/end dates; preserve bullets/tables | ~150 |
| | `BuildCv-api/src/BuildCv.Application/Features/Import/SectionDetector.cs` | Modify | Add `SectionKind` enum; map headers → discriminator | ~50 |
| | `BuildCv-api/src/BuildCv.Application/Features/Import/ImportCvHandler.cs` | Modify | Dispatch by `engineVersion`; v2 returns `CvDocument` | ~40 |
| | `BuildCv-api/src/BuildCv.Api/Endpoints/ImportEndpoints.cs` | Modify | Header detection; `SerializeCvDocument()` for v1 shim | ~60 |
| **PR3 Scoring per-section** | `BuildCv-api/src/BuildCv.Domain/Scoring/ScoreResult.cs` | Modify | Add `PerSectionScore`, `RedFlag`, `SectionId`, `RedFlagSeverity` | ~40 |
| | `BuildCv-api/src/BuildCv.Domain/Scoring/ScoringEngine.cs` | Modify | Bump `Version` to `"2.0.0"`; add `ScoreV2(cv, job)`; perSection scoring + gap/job-hopping detection | ~200 |
| | `BuildCv-api/src/BuildCv.Application/Features/Scoring/ScoreCvHandler.cs` | Modify | Dispatch v1 vs v2 by `engineVersion`; pass typed inputs | ~40 |
| | `BuildCv-api/src/BuildCv.Api/Contracts/ScoreResponseMapper.cs` | Modify | Map `PerSectionScore` + `RedFlag[]` | ~30 |
| | `BuildCv-api/src/BuildCv.Api/Endpoints/ScoringEndpoints.cs` | Modify | Same path; mapper does the work | ~10 |
| **PR4 Web JobSpec + editor migration** | `BuildCv-web/lib/job/job-spec.ts` (NEW) | Create | Zod `JobSpecSchema` + per-rule error code parity | ~160 |
| | `BuildCv-web/lib/editor/schema/json-resume/index.ts` (NEW) | Create | JSON Resume Zod schemas (basics/work/education/skills/projects/certificates/languages) + `ConfidenceMarker` + `DatosPersonalesSchema` + `COLOMBIA_FIELDS` | ~250 |
| | `BuildCv-web/lib/editor/types.ts` | Modify | Add `engineVersion: "2.0.0"`; `Draft.document` → JSON Resume shape (legacy fields stay for v1 path) | ~60 |
| | `BuildCv-web/lib/editor/markdown/{serialize,parse}.ts` | Modify | Round-trip JSON Resume shape; `serializeCvDocument` regenerates v1 text from CvDocument | ~120 |
| | `BuildCv-web/components/editor/v2/BasicsForm.tsx` (NEW) | Create | Section form with confidence indicators | ~140 |
| | `BuildCv-web/components/editor/v2/WorkList.tsx` (NEW) | Create | Add/edit/remove work entries; per-field confidence | ~160 |
| | `BuildCv-web/components/editor/v2/{EducationList,SkillsByCategory,ProjectsList,CertificatesList,LanguagesList}.tsx` (NEW) | Create | Section forms | ~280 |
| | `BuildCv-web/components/editor/editor.tsx` | Modify | Branch by `NEXT_PUBLIC_STRUCTURED_INPUT`; mount v2 forms | ~40 |
| **PR5 Web analyzer UI** | `BuildCv-web/components/analyzer/input-panel.tsx` | Modify | Render `JobSpecForm` (mandatory) instead of textarea when flag on; legacy textarea path under flag off | ~80 |
| | `BuildCv-web/components/analyzer/job-spec-form.tsx` (NEW) | Create | Zod-validated form (title/company/description/location/employmentType/requirements[]) | ~180 |
| | `BuildCv-web/components/analyzer/section-breakdown.tsx` (NEW) | Create | Render `perSection` bars + `redFlags` list (signal-only, no deduction label) | ~120 |
| | `BuildCv-web/components/analyzer/analyzer.tsx` | Modify | Wire `section-breakdown.tsx`; handle 422 codes (`JOB_SPEC_*`, `VERSION_MISMATCH`) | ~60 |
| | `BuildCv-web/lib/api/types.ts` | Modify | Add v2 `ScoreResponse` (`perSection` + `redFlags` optional); add v2 `ImportResult` (`cv` instead of `text`/`sections[]`); discriminated `ScoreRequest`/`ImportRequest` types | ~120 |
| | `BuildCv-web/lib/api/score.ts` | Modify | `requestScore(payload)` — sends `engineVersion` + structured payload; map v2 response | ~40 |
| | `BuildCv-web/lib/api/import.ts` | Modify | `requestImport` returns v2 result shape; `isImportResult` validates v2 | ~60 |
| | `BuildCv-web/app/api/score/route.ts` | Modify | Forward structured payload; echo `engineVersion` | ~20 |
| | `BuildCv-web/app/api/import/route.ts` | Modify | No body change (multipart); just return v2 shape | ~10 |
| **PR6 Tests + a11y + e2e** | `BuildCv-api/tests/BuildCv.Domain.Tests/Scoring/ScoringEngineDeterminismPropertyTests.cs` (NEW) | Create | Property test: 1000× parallel `ScoreV2` → byte-identical | ~80 |
| | `BuildCv-api/tests/BuildCv.Application.Tests/Features/Jobs/JobSpecValidatorTests.cs` (NEW) | Create | Happy + 5 rejection paths (oversized, prompt-injection, zero-width, enum, unknown fields) | ~160 |
| | `BuildCv-api/tests/BuildCv.Application.Tests/Features/Import/CvDocumentSchemaTests.cs` (NEW) | Create | Golden JSON Resume fixtures (5+) including Colombian datosPersonales | ~120 |
| | `BuildCv-api/tests/BuildCv.Infrastructure.Tests/Parsing/DocxListTablePreservationTests.cs` (NEW) | Create | Golden DOCX set preserves bullets/tables in `work[]` | ~100 |
| | `BuildCv-api/tests/BuildCv.Api.IntegrationTests/JobSpecValidatorParityTests.cs` (NEW) | Create | Parity vs web Zod (same error codes, same Spanish messages) | ~120 |
| | `BuildCv-web/lib/job/job-spec.test.ts` (NEW) | Create | Zod happy + rejection cases | ~160 |
| | `BuildCv-web/components/editor/v2/*.test.tsx` (NEW) | Create | Form-level: add/edit/remove; confidence promotion on blur; Colombian sub-form gating | ~280 |
| | `BuildCv-web/e2e/structured-input.spec.ts` (NEW) | Create | Full flow: upload → editor → JobSpec → score → breakdown; axe-playwright WCAG 2.2 AA | ~200 |

## Interfaces / Contracts

### `CvDocument` — JSON Resume shape (TS)

```ts
// BuildCv-web/lib/editor/schema/json-resume/index.ts
export const ConfidenceMarkerSchema = z.enum(["inferred", "explicit", "user_confirmed"]);
export type ConfidenceMarker = z.infer<typeof ConfidenceMarkerSchema>;

export const DatosPersonalesSchema = z.object({
  cedula: z.string().min(1).max(20).optional(),
  nacionalidad: z.string().max(60).optional(),
  estadoCivil: z.string().max(40).optional(),
  libretaMilitar: z.string().max(40).optional(),
  rh: z.string().max(10).optional(),
}).strict();

export const BasicsSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  location: z.string().max(200).optional(),
  url: z.string().url().optional(),
  profiles: z.array(z.object({ network: z.string(), url: z.string().url() })).max(10),
  summary: z.string().max(2000).optional(),
  datosPersonales: DatosPersonalesSchema.optional(), // undefined when absent
}).strict();

export const WorkEntrySchema = z.object({
  name: z.string().min(1).max(200),            // company
  position: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
  summary: z.string().max(2000).optional(),
  highlights: z.array(z.string().max(500)).max(20).optional(),
}).strict();

// Confidence is wrapped at the field level, not the entry level (see CvDocument below)
export const TaggedWorkSchema = WorkEntrySchema.extend({
  confidence: z.object({
    name: ConfidenceMarkerSchema,
    position: ConfidenceMarkerSchema,
    startDate: ConfidenceMarkerSchema,
    endDate: ConfidenceMarkerSchema,
    summary: ConfidenceMarkerSchema,
  }),
}).strict();

export const CvDocumentSchema = z.object({
  basics: BasicsSchema,
  work: z.array(TaggedWorkSchema).max(50),
  education: z.array(/* … EducationEntrySchema with confidence */).max(20),
  skills: z.array(/* … SkillEntrySchema */).max(30),
  projects: z.array(/* … ProjectEntrySchema */).max(30).optional(),
  certificates: z.array(/* … CertificateEntrySchema */).max(30).optional(),
  languages: z.array(/* … LanguageEntrySchema */).max(20).optional(),
  meta: z.object({ engineVersion: z.literal("2.0.0") }),
}).strict();
```

### `JobSpec` — TS Zod + C# record + validator

```ts
// BuildCv-web/lib/job/job-spec.ts
export const EmploymentTypeSchema = z.enum([
  "full_time", "part_time", "contract", "internship", "temporary", "volunteer", "other",
]);

export const JobSpecSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  description: z.string().min(1).max(20_000),
  location: z.string().min(1).max(200),
  employmentType: EmploymentTypeSchema,
  requirements: z.array(z.string().min(1).max(500)).max(100),
}).strict(); // unknown fields → ZodError
```

```csharp
// BuildCv-api/src/BuildCv.Application/Features/Jobs/JobSpec.cs
public sealed record JobSpec(
    string Title,
    string Company,
    string Description,
    string Location,
    EmploymentType EmploymentType,
    IReadOnlyList<string> Requirements);

public enum EmploymentType { FullTime, PartTime, Contract, Internship, Temporary, Volunteer, Other }

// BuildCv-api/src/BuildCv.Application/Features/Jobs/JobSpecValidator.cs
public sealed class JobSpecValidator : AbstractValidator<JobSpec>
{
    private static readonly HashSet<string> _denySubstrings = new(StringComparer.OrdinalIgnoreCase)
        { "ignore previous", "system:", "<|im_start|>", "assistant:" };
    private static readonly Regex _controlChars = new(@"[\x00-\x1F\x7F]", RegexOptions.Compiled);
    private static readonly Regex _zeroWidth = new(@"[\u200B-\u200D\uFEFF]", RegexOptions.Compiled);

    public JobSpecValidator()
    {
        RuleForEach(x => x.Requirements).MaximumLength(500);
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Company).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(20_000);
        RuleFor(x => x.Location).NotEmpty().MaximumLength(200);
        RuleFor(x => x).Must(x => x.Requirements.Count <= 100)
            .WithMessage("requirements excede 100 elementos (recibido " + nameof(JobSpec.Requirements) + ")");
        RuleFor(x => x.Title).Must(NotContainInjection).WithErrorCode("JOB_SPEC_PROMPT_INJECTION");
        RuleFor(x => x.Description).Must(NotContainInjection).WithErrorCode("JOB_SPEC_PROMPT_INJECTION");
        // + RuleForEach Requirement, Company, Location → same deny list
    }
    private static bool NotContainInjection(string s) =>
        !_controlChars.IsMatch(s ?? "") &&
        !_zeroWidth.IsMatch(s ?? "") &&
        !_denySubstrings.Any(d => s.Contains(d, StringComparison.OrdinalIgnoreCase));
}
```

### Discriminated-union command (`ScoreCvCommand`)

```csharp
// BuildCv-api/src/BuildCv.Application/Features/Scoring/ScoreCvCommand.cs
public abstract record ScoreCvCommand(string EngineVersion);

public sealed record StructuredScoreCommand(CvDocument Cv, JobSpec Job)
    : ScoreCvCommand("2.0.0");

public sealed record TextScoreCommand(string CvText, string JobText)
    : ScoreCvCommand("1.0.0");

// BuildCv-api/src/BuildCv.Application/Features/Scoring/ScoreCvValidator.cs
public sealed class ScoreCvValidator : AbstractValidator<ScoreCvCommand>
{
    public ScoreCvValidator()
    {
        RuleFor(x => x.EngineVersion).Must(v => v is "1.0.0" or "2.0.0")
            .WithErrorCode("ENGINE_VERSION_UNKNOWN");
        When(x => x.EngineVersion == "2.0.0", () =>
        {
            RuleFor(x => x).Must(x => x is StructuredScoreCommand)
                .WithErrorCode("JOB_SPEC_REQUIRED");
            RuleFor(x => ((StructuredScoreCommand)x).Job).NotNull().SetValidator(new JobSpecValidator());
        });
        When(x => x.EngineVersion == "1.0.0", () =>
        {
            RuleFor(x => x).Must(x => x is TextScoreCommand).WithErrorCode("VERSION_MISMATCH");
            RuleFor(x => ((TextScoreCommand)x).CvText).MinimumLength(200).MaximumLength(20_000);
            RuleFor(x => ((TextScoreCommand)x).JobText).MinimumLength(100).MaximumLength(20_000);
        });
    }
}
```

```ts
// BuildCv-web/lib/api/types.ts
export type ScoreRequest =
  | { cv: CvDocument; job: JobSpec; engineVersion: "2.0.0" }
  | { cvText: string; jobText: string; engineVersion: "1.0.0" };
```

### `ScoreResponse` v2

```csharp
// BuildCv-api/src/BuildCv.Api/Contracts/ScoreResponse.cs (additive)
public sealed record PerSectionResponse(
    int? Experience, int? Education, int? Skills, int? Certifications, int? Contact);
public sealed record RedFlagResponse(string Code, string Severity, string Message, int? Months, int? EmployersIn5y);

public sealed record ScoreResponse(
    int OverallScore,
    string Band,
    string HonestyNotice,
    string EngineVersion,         // "2.0.0"
    string LexiconVersion,
    string ContextId,
    IReadOnlyList<ComponentResponse> Components,         // v1 (kept for backward visual)
    KeywordAnalysisResponse KeywordAnalysis,            // v1
    IReadOnlyList<RecommendationResponse> Recommendations,
    IReadOnlyList<FormatIssueResponse> FormatIssues,
    IReadOnlyList<GateResponse> GatesApplied,
    PerSectionResponse? PerSection,                     // v2 only
    IReadOnlyList<RedFlagResponse>? RedFlags);          // v2 only
```

### `ImportResult` v2

```csharp
// BuildCv-api/src/BuildCv.Application/Features/Import/ImportTypes.cs
public sealed record ImportResult(
    CvDocument? Cv,                              // v2 only
    string? Text,                                // v1 only (regenerated from Cv via SerializeCvDocument)
    IReadOnlyList<ImportSection>? Sections,      // v1 only
    IReadOnlyList<ImportWarning> Warnings,
    string EngineVersion,                        // "1.0.0" or "2.0.0"
    string TraceId);
```

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| **Unit (api Domain)** | `ScoringEngine.ScoreV2` determinism | Property-based: FsCheck or hand-rolled — 1000 parallel runs of same `(cv, job)` ⇒ byte-equal JSON. Static grep: zero matches for `DateTime.UtcNow\|Guid.NewGuid\|Random` in `BuildCv.Domain/Scoring/ScoringEngine.cs` |
| **Unit (api Application)** | `JobSpecValidator` rejection paths | xUnit cases: oversized `description` (25k chars) → `JOB_SPEC_FIELD_TOO_LONG`; prompt-injection substring → `JOB_SPEC_PROMPT_INJECTION`; zero-width in title → `JOB_SPEC_PROMPT_INJECTION`; `employmentType: "freelance_rockstar"` → `JOB_SPEC_INVALID_ENUM`; unknown field `secretSystemPrompt` → `JOB_SPEC_UNKNOWN_FIELDS`; empty `requirements` → `JOB_SPEC_MISSING_REQUIREMENTS` |
| **Unit (api Infrastructure)** | DOCX/PDF parser preserves structure | Golden DOCX set (from `002-score-engine` test corpus): bullets → `work[i].highlights[]`, tables → preserved as `summary` content, dates → `startDate`/`endDate` ISO `YYYY-MM`. PDF without semantic structure → graceful degrade to `inferred` confidence, no exception |
| **Unit (api Application)** | `CvDocument` shape from JSON Resume fixtures | Golden fixtures (5+): simple English CV, Colombian CV with `datosPersonales`, multilingual (Spanish headers + English skills), empty sections, multi-page. Each asserts full shape + per-field `confidence === "inferred"` (never `"user_confirmed"`) |
| **Integration (api)** | Zod ↔ FluentValidation parity | Same payload → same code + same Spanish `detail` (table-driven test, both libs) |
| **Unit (web)** | Zod `JobSpecSchema` rejection paths | Vitest: same 5 rejection paths as api (parity test) |
| **Component (web)** | Editor v2 forms | RTL + user-event: add/edit/remove work entry; `confidence: "user_confirmed"` promoted on blur of edited field; unedited inferred field stays `"inferred"` after save; Colombian sub-form renders only when `navigator.language === "es-CO"` or imported CV carries `datosPersonales` |
| **Component (web)** | `JobSpecForm` | RTL: validation errors per field; submit disabled until valid; parity error codes surfaced |
| **E2E (web)** | Full structured flow | Playwright: `/analizar` → upload PDF → import → editor pre-populated with `cv` → fill JobSpec → "Re-puntuar" → `<SectionBreakdown/>` shows `perSection.skills === 100` for direct match + axe-playwright WCAG 2.2 AA scan (per 019 CI gate) |
| **E2E (web)** | Rollback path | Playwright with `NEXT_PUBLIC_STRUCTURED_INPUT="false"` → legacy 8-textarea editor renders; `engineVersion: "1.0.0"` in payload |

## Migration / Rollout

1. **PR1–PR3 ship together** to backend main: API contracts + parser restructure + per-section scoring (the v2 server is fully wired but defaults to `engineVersion: "1.0.0"` for unmapped clients).
2. **PR4–PR5 ship together** to web main: editor v2 + analyzer UI + BFF routes. Default `NEXT_PUBLIC_STRUCTURED_INPUT="false"` everywhere (Render env var).
3. **PR6** (tests + a11y + e2e) lands behind a CI-required gate — never skips the WCAG scan.
4. **Enablement**: flip `NEXT_PUBLIC_STRUCTURED_INPUT="true"` in Render staging → canary 24h → prod. Backend keeps serving v1 to clients that pin `"1.0.0"`.
5. **Rollback**: (a) flip env var back to `"false"` — instant, no redeploy (both paths live in the bundle); (b) if backend regression, deploy previous `dotnet` build — clients that pinned `"1.0.0"` continue; (c) zero data migration (Art. III). Re-plan as `022-structured-cv-import-v2` after root-cause review.
6. **Observability**: `engineVersion` counter on `/api/log/metrics` lets dev confirm traffic shape during rollout (`1.0.0` should trend to 0 in 7 days; mismatch warnings alert if it doesn't).

## Open Questions

- **None blocking.** All decisions confirmed against the existing codebase (`ScoringEndpoints`, `ImportCvHandler`, `SectionDetector`, `editor.tsx`, `types.ts`, `ScoringEngine.cs`, `error-reporter.ts`). The Colombian `datosPersonales` field set is fixed by `006-web-cv-editor/spec.md` — no further discovery needed.
