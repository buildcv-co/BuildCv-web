# Proposal: 021 — Structured CV Import + Mandatory Job Spec

> **Mode**: hybrid · **Approach**: B (full structured end-to-end) · **Review budget**: 400 LOC · **Risk: WILL exceed** (4–6 chained PRs)

## Intent

Today `/score`, `/adapt`, `/iterate` exchange raw `{CvText, JobText}`; backend re-runs regex every call, the import loses section semantics, and the user gets no structured feedback. This change makes CV and Job exchange **typed JSON** end-to-end — **JSON Resume** as the CV contract and a **mandatory `JobSpec`** for jobs — so scoring returns **per-section breakdowns** (experience / education / skills / certifications / contact + red flags) the way real TA teams evaluate candidates.

## Scope

### In Scope
- JSON Resume schema (`basics`, `work`, `education`, `skills`, `projects`, `certificates`, `languages`, `interests`, `references`, `awards`).
- `ImportResult` evolves `{text, sections[]}` → `{cv: CvDocument, warnings, engineVersion, traceId}` (**breaking** → bump `engineVersion` **1.0.0 → 2.0.0**, Art. II).
- Mandatory `jobSpec: {title, company, description, location, employmentType, requirements: string[]}` — Zod (web) + FluentValidation (api).
- `/score`, `/adapt`, `/iterate` accept structured input; analyzers skip regex when pre-structured.
- `ScoreResponse` gains `perSection: {experience, education, skills, certifications, contact}` + `overallScore` + `redFlags[]` (gaps, job hopping).
- Visual editor inspired by `xitanggg/open-resume` (MIT, no copy): section-based forms — purpose = "review/fix what the parser inferred", not "build from scratch".
- Parser tags every field `confidence: 'inferred' | 'explicit' | 'user_confirmed'` (Art. I).

### Out of Scope
- LLM structuring (forbidden Art. I/II), server-side persistence (Art. III), IndexedDbCvStore migration (deferred v1).

## Capabilities

### New
- `structured-job-spec`: `JobSpec` Zod + FluentValidation; rejects prompt-injection-shaped strings.
- `score-section-breakdown`: per-section scoring + red-flag detection; pure Domain functions.

### Modified (delta specs)
- `005-cv-pdf-docx-import` (`BuildCv-api/specs/005-cv-pdf-docx-import/`): `ImportResult` → v2.0.0.
- `002-score-engine` (`BuildCv-api/specs/002-score-engine/`): command accepts `CvDocument | string` (backward-compat shim); response gains `perSection`.
- `006-web-cv-editor` (`BuildCv-web/specs/006-web-cv-editor/`): migrate custom `CvDocument` → JSON Resume; UI replaced by open-resume-inspired section forms.
- `008-observability-web` (`BuildCv-web/specs/008-observability-web/`): tag events with `engineVersion`.

## Approach

CV and Job flow as structured JSON end-to-end. Backend parsers emit JSON Resume `CvDocument` with `confidence` markers; Zod and FluentValidation gate the mandatory `JobSpec`. `ScoringEngine` receives typed inputs, skips `CvAnalyzer`/`JobAnalyzer` regex passes, emits `perSection` + `redFlags`. Frontend editor (open-resume-inspired) lets the user confirm/correct parsed fields; `JobSpec` form is mandatory (no text-area fallback). SemVer bump seals the contract under Art. II.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `BuildCv-api/src/BuildCv.Application/Features/Import/{ImportTypes,ICvParser}.cs` | Modified | `ImportSection` → discriminated union; `CvDocument` (JSON Resume shape). |
| `BuildCv-api/src/BuildCv.Infrastructure/Parsing/{PdfPigCvParser,OpenXmlCvParser}.cs` | Modified | Emit structured sections; preserve DOCX lists/tables. |
| `BuildCv-api/src/BuildCv.Application/Features/Scoring/{ScoreCvCommand,ScoreCvValidator,ScoreCvHandler}.cs` | Modified | `JobSpecValidator`; discriminated-union command; bypass regex when structured. |
| `BuildCv-api/src/BuildCv.Domain/Scoring/{ScoringEngine,ScoreResult}.cs` | Modified | Add `PerSectionScore` + `RedFlag`; bump `Version` to `2.0.0`. |
| `BuildCv-api/src/BuildCv.Api/Endpoints/{Import,Scoring,Adapt,Iteration}Endpoints.cs` + `Contracts/*.cs` | Modified | Wire DTOs; keep `/api/v1/*` paths. |
| `BuildCv-web/lib/api/{types.ts,score.ts,import.ts,adapt.ts,iterate.ts}` | Modified | Discriminated-union types; pass structured payloads. |
| `BuildCv-web/lib/editor/{types.ts,schema/*}` | Replaced | Migrate to JSON Resume; add `confidence` field. |
| `BuildCv-web/lib/job/job-spec.ts` | New | Zod `JobSpec` schema. |
| `BuildCv-web/components/editor/` | Replaced | Open-resume-inspired forms: `BasicsForm`, `WorkList`, `EducationList`, `SkillsByCategory`. |
| `BuildCv-web/components/analyzer/{input-panel,analyzer,score-gauge}.tsx` + `section-breakdown.tsx` | Modified/New | Mandatory `JobSpec` form; render `perSection`. |
| `BuildCv-web/components/import/import-button.tsx` + `app/api/import/route.ts` | Modified | Consume `ImportResult.cv` directly (drop MD round-trip). |
| `BuildCv-web/lib/observability/error-reporter.ts` | Modified | Tag events with `engineVersion`. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **400-line budget OVERRUN**: Approach B + open-resume editor = **~1500–2000 LOC across 4–6 PRs**. **WILL exceed**. | **High** | Orchestrator MUST obtain `size:exception` OR auto-chain: PR1 API contracts+validators, PR2 backend parser restructure, PR3 scoring per-section, PR4 web JobSpec + editor migration, PR5 web analyzer UI, PR6 tests+a11y+e2e. Each <400 LOC. |
| Breaking change to `/api/v1/score` body | Med | Keep path; bump `engineVersion`; 1-release backward-compat shim. |
| Cascade into 003-adapt-ia + 018-iteration-loop | Med | Discriminated-union input keeps their handlers backward-compat. |
| JSON Resume gaps (Colombian "datos personales") | Med | Extend in `lib/editor/schema/colombia.ts`; never break JSON Resume compat. |
| DOCX table/list semantics loss | Med | Tests with golden DOCX set (from 002). |
| Art. I under `confidence` markers | Med | Parser never invents; `confidence='inferred'` is metadata, never auto-promoted. |
| open-resume is a builder, not an analyzer | Med | UX reference only — no greenfield authoring flow shipped. |

## Rollback Plan

1. Revert `engineVersion` to `1.0.0`; restore `ImportResult` shape (regenerate `text` from `CvDocument` via `serializeCvDocument()`).
2. Web: keep both paths behind `NEXT_PUBLIC_STRUCTURED_INPUT` flag, default off.
3. Backend: deploy v1.0.0 branch; backward-compat shim already shipped, no client deploy needed.
4. Zero server-side persistence → nothing to migrate.
5. Re-plan as `022-structured-cv-import-v2` after root-cause review.

## Dependencies

- **`xitanggg/open-resume`** (MIT) — UX reference only, **NOT copied** (it is a builder; BuildCv is an analyzer).
- **`https://jsonresume.org/schema.json`** — canonical CV contract for both repos.
- **`HR-JSON` / `schema.org/JobPosting`** — reference for `JobSpec` shape (cited in `lib/job/job-spec.ts`).
- **`Zod v3`** (web) + **`FluentValidation`** (api) — already in stack.

## Success Criteria

- [ ] `POST /api/v1/score` accepts `{cv: CvDocument, job: JobSpec}`, returns `perSection` + `redFlags` + `overallScore`, `engineVersion === "2.0.0"`.
- [ ] `POST /api/v1/import` returns `{cv: CvDocument, warnings[], engineVersion, traceId}`; every field carries `confidence`.
- [ ] Backend tests: golden JSON Resume fixtures, DOCX lists/tables, PDF without semantic structure, JobSpec validation (happy + 5 rejection paths incl. prompt-injection-shape), per-section determinism.
- [ ] Web tests: open-resume-inspired editor forms, Zod `JobSpec`, confidence visualization, `LocalStorageCvStore` round-trip.
- [ ] **Determinism property test**: same `CvDocument + JobSpec + engineVersion="2.0.0"` → byte-identical `ScoreResponse` (Art. II).
- [ ] `pnpm lint/build/test/test:e2e` + `dotnet build/test` green; **zero suppressions**.
- [ ] Docs: `spec.md` + `design.md` + `tasks.md` (chained 4–6 PRs); Constitution impact declared (none required, Art. II sealed by SemVer bump).
- [ ] A11y: editor passes WCAG 2.2 AA via `axe-playwright` (per 019 CI gate).

## Constitution Compliance

- **Art. I**: parser only INFERs, never invents; every field tagged `confidence`. Editor rejects save of unconfirmed fields without explicit input.
- **Art. II**: scoring over structured fields stays pure C#. SemVer bump **1.0.0 → 2.0.0** seals the contract; backward-compat shim is feature-flagged.
- **Art. III**: zero server-side persistence (unchanged).
- **Art. V**: `JobSpec` validated with Zod + FluentValidation; reject prompt-injection-shaped strings (length caps, regex for email/URL, character allowlist).
- **Art. VI**: `ICvParser` port unchanged; extended via discriminated-union return. New `IStructuredCvParser` not needed.
- **Art. VIII**: tests for schema, parsers, validators, per-section scoring BEFORE implementation; coverage ≥90% in `BuildCv.Domain`.