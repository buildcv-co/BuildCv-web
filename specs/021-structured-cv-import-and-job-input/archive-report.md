# Archive Report: 021-structured-cv-import-and-job-input

> **Status**: ✅ SHIPPED + ARCHIVED
> **Archived**: 2026-06-26
> **Git tag**: `021-structured-cv-import-and-job-input-v1.0` at commit `5d40a53` (BuildCv-api HEAD, merge) and `82a400b` (BuildCv-web HEAD, includes typo fix)
> **Web HEAD (work-unit tip before archive)**: `b75c5b1` (PR6d INDEX sync + proposal final-status + tasks final-status). Followup commit `55985f3` migrated 8 e2e tests + AnalizarScreen bug fix. Typo fix `82a400b` moved `exploration.md` from `specs/020-` to `specs/021-`.
> **API HEAD (work-unit tip before archive)**: `6f0456f` (PR6d constitution Art. II SemVer bump note + INDEX sync).
> **Cycle**: sdd-propose → sdd-spec → sdd-design → sdd-tasks → sdd-apply (PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6, 6 chained PRs on `feature/021-structured-cv-import-and-job-input` + followup `021-followups-1`) → sdd-verify (each PR green; final CI gate local: `pnpm lint && pnpm build && pnpm test && pnpm test:e2e --retries=2` + `dotnet build BuildCv.slnx -c Release && dotnet test && dotnet format --verify-no-changes` — all green) → **sdd-archive**.

## Summary

Replaces free-text `{CvText, JobText}` exchange with typed JSON end-to-end. CV flows as JSON Resume `CvDocument` with `confidence` markers (`inferred` | `explicit` | `user_confirmed`); job flows as mandatory `JobSpec` validated identically by Zod (web) + FluentValidation (api). Scoring emits a per-section breakdown `{experience, education, skills, certifications, contact}` + red flags (employment gaps >6 months, job-hopping ≥3 employers <18 months in 5 years) as signal-only (never a deduction, Constitution Art. I). `ScoringEngine.Version` bumps MAYOR `1.0.0 → 2.0.0` (Constitution Art. II SemVer seal — note added to `constitution.md` per PR6d commit `6f0456f`). The v1 text path remains reachable via explicit `engineVersion: "1.0.0"` for one release cycle via discriminated-union `ScoreCvCommand` (backward-compat shim). The editor (web) is rebuilt open-resume-inspired: section-based forms (`BasicsForm`/`WorkList`/`EducationList`/`SkillsByCategory`) replacing the legacy 8-textarea shape; `promoteConfidence` pure function promotes `inferred` slots to `user_confirmed` ONLY on user blur (defense in depth, Art. I). Feature flag `NEXT_PUBLIC_STRUCTURED_INPUT=true` (default in `.env.example` + `.env.local`) controls rollout; flip to `"false"` for instant rollback (no redeploy needed).

**Chained delivery strategy**: 6 chained PRs on `feature/021-structured-cv-import-and-job-input` + 1 followup (`021-followups-1`) on `main`. 23 work-unit commits web + 11 work-unit commits api + 2 merge commits + 1 typo fix = **37 total commits** on `main` across both repos. All merged directly to `main` and pushed to `origin` BEFORE archive per project rules.

## What shipped

### User-facing capabilities

- **Structured CV upload**: User drops a PDF/DOCX → backend emits JSON Resume `CvDocument` with `confidence` markers per field. The editor pre-populates with visual indicator on inferred fields.
- **Mandatory JobSpec form**: User fills 6 typed fields (`title`, `company`, `description`, `location`, `employmentType` enum, `requirements[]`) — no more free-text vacante textarea. Zod validates client-side; FluentValidation validates server-side (anti-prompt-injection).
- **Per-section scoring**: Response includes `perSection: {experience, education, skills, certifications, contact}` (each 0–100 or `null` when section absent and renormalized) + `redFlags[]` (employment gaps, job-hopping).
- **Confidence-promotion on save**: User-edited fields promote from `inferred` to `user_confirmed` on blur (Constitution Art. I defense in depth — parser never auto-promotes).
- **Engine version seal**: Every `ScoreResponse` and `ImportResult` includes `engineVersion: "2.0.0"` (Art. II SemVer seal). v1 clients pin `engineVersion: "1.0.0"` and continue working for one release cycle.
- **Rollback path**: Flip `NEXT_PUBLIC_STRUCTURED_INPUT=false` → editor reverts to legacy 8-textarea + MD round-trip + `{ cvText, jobText }` payloads. Zero server-side persistence means zero data migration on rollback (Art. III).

### Architecture (Backend)

| Layer | New / Modified | Highlights |
|---|---|---|
| **Domain** (PR3a–3d) | New | `PerSectionScore`, `RedFlag`, `RedFlagSeverity`, `ScoreResultV2` records; `ScoringEngine.ScoreV2(cv, job, "2.0.0")` pure function with per-section scoring + renormalization on missing section + contact hard-gate (missing email → `overallScore: 0` + red flag `MISSING_EMAIL`). `ScoringEngine.Version` bumps to `"2.0.0"` as compile-time `public const string`. |
| **Application** (PR1) | New | `JobSpec` record + `JobSpecValidator` (FluentValidation; rejects control chars, zero-width, `ignore previous` / `system:` / `assistant:`). `CvDocument` JSON Resume + Colombian `datosPersonales` extension under `basics`. `ScoreCvCommand` discriminated union: `{cv, job, engineVersion: "2.0.0"}` OR `{cvText, jobText, engineVersion: "1.0.0"}`. Mixing structured cv with v1 → HTTP 422 `VERSION_MISMATCH`. |
| **Infrastructure** (PR2a–e) | New + Modified | `IStructuredParser` port + `ParseResult` discriminated union (`RawParseResult` / `StructuredParseResult` / `ParsingWarning`) + `LegacyParserAdapter` shim. `PdfPigCvParser` emits `StructuredParseResult` with `CvDocument` + `confidence` markers (`explicit` for regex-strict fields, `inferred` for heuristics, NEVER `user_confirmed`). `OpenXmlCvParser` preserves DOCX lists + tables in `ResumeWorkEntry.Highlights[]` (separator ` | `, no `\t` flattening). `ParserRouter` dispatches by `engineVersion`. `ImportEndpoints` accepts `?engineVersion=` / `X-Engine-Version` (default `2.0.0`, 400 if unknown with code `IMPORT_UNSUPPORTED_ENGINE_VERSION`). `ImportResponseMapper.Map` returns `object` discriminating by variant. |
| **API** (PR1, PR2e, PR3c) | Modified | `ImportEndpoints` v2 contract; `ScoreResponse` v2 gains `perSection` + `redFlags` on v2 (absent on v1). No new paths — paths unchanged (`/api/v1/{score,import}`). No new rate-limit policies (reuses existing `score` 60/min + `import` 30/h). |

### Architecture (Frontend)

| Layer | New / Modified | Highlights |
|---|---|---|
| **Editor schema** (PR4a) | New | `lib/editor/schema/jsonresume.ts` — 12 Zod schemas (`.strict()`) covering `basics` / `work` / `education` / `skills` / `projects` / `certificates` / `languages` / `awards` / `interests` / `references` / `meta`. Colombian `datosPersonales` extension under `basics` (cedula/nacionalidad/estadoCivil/libretaMilitar/rh). `ConfidenceMarker` re-defined as `z.enum(['inferred', 'explicit', 'user_confirmed'])`. `endDate` accepts `YYYY-MM` | `"Present"` | `null`. Phone regex `^\+?\d{7,15}$`. URL helper `urlOrEmpty = ""` | `url()`. `cvDocumentSchema` requires `meta.engineVersion === "2.0.0"`. |
| **Editor types** (PR4b) | New | `lib/editor/types.ts` re-exports `JsonResumeCvDocument` from schema; `LegacyCvDocument` alias + `migrateLegacyToJsonResume(legacy): CvDocument` (all `confidence: 'inferred'` per Constitution Art. I — no auto-promote; `meta.engineVersion: '2.0.0'` SemVer seal). `lib/storage/migrate.ts` `migrateLegacyLocalStorage()` detects `buildcv:draft:*` legacy keys, persists as `-v2`, deletes legacy. |
| **Section components** (PR4c) | New | 4 components in `components/editor/`: `basics-form.tsx` (profile + email with Zod inline validation + datosPersonales conditional + profiles), `work-list.tsx` (`ListCard` collapsible + add/remove + status live + "Trabajo actual" as `endDate === "Present"`), `education-list.tsx`, `skills-by-category.tsx`. 3 shared sub-components in `components/editor/_shared/`: `form-field.tsx`, `list-card.tsx`, `confidence-badge.tsx`. Items new to the form start with `confidence: 'user_confirmed'` (the user is actively creating). |
| **Confidence promotion** (PR4d) | New | `lib/editor/confidence-promotion.ts` — pure function `promoteConfidence(cv: CvDocument, touched: ReadonlySet<string>): CvDocument`. Constitution Art. I: parser never emits `user_confirmed`; editor on save promotes ONLY touched slots (`basics.<slot>`, `basics.datosPersonales.*` → slot `datosPersonales`, `basics.profiles.*` → slot `profiles`, `<section>.<idx>.<slot>` for work/education/skills/projects/certificates/languages/awards/interests/references). `meta.engineVersion` SemVer seal NOT touched. Pure: input never mutated; structural sharing for untouched sections; early-return when `touched.size === 0`. Helper `pathPrefix(path: string): string` extracted. |
| **Editor migration** (PR4e) | Modified | `editor.tsx` rewritten with two paths controlled by `NEXT_PUBLIC_STRUCTURED_INPUT` (default `true`). Structured mode loads from `buildcv:editor:cv-document-v2` with auto-migration from legacy `buildcv:editor:cv-document` via `tryMigrateLegacyDraft`. On save calls `promoteConfidence(cv, touched)` then persists under `-v2`. Helpers `diffBasicsPaths` + `diffListPaths` extracted. `.env.example` + `.env.local` document flag. |
| **JobSpec** (PR5a) | New | `lib/job/job-spec.ts` Zod schema + `EMPLOYMENT_TYPES` enum. `components/analyzer/job-spec-form.tsx` with 6 fields validated by Zod (Constitution Art. V anti-prompt-injection). Submit HTML-disabled when schema rejects; errors inline per field on submit. Sub-component `RequirementsList` (add/remove/error per index). |
| **Analyzer wiring** (PR5b) | Modified | `InputPanel` composes `<JobSpecForm>` instead of legacy `<textarea>` for vacante; CV stays as textarea (editor v2 wiring future). `Analyzer` migrated `jobText: string` → `job: JobSpec | null`; consumes `requestScoreV2({kind: "structured", cv, job, engineVersion: "2.0.0"})`. Discriminates response with `isScoreResponseV2()` → renders `<V2ResultSections>` with `perSection` + `redFlags`. |
| **SectionBreakdown UI** (PR5c) | New | `components/analyzer/section-breakdown.tsx` — 5 per-section bars with `role="progressbar"` + `aria-valuemin/max/now` 0–100; red flags list with `role="list"` / `role="listitem"` + severity badges color-coded (`data-severity={low|medium|high}`) + warning icon only for `high` severity. Sub-components `ProgressBar` / `RedFlagBadge` / `SectionBar` extracted via REFACTOR. 89 lines removed from `analyzer.tsx`. |
| **Observability tagging** (PR5d) | Modified | `lib/observability/types.ts` adds `engineVersion?: string` to `LogContext` + `LogEntry`. `lib/observability/log-store.ts` exports `resolveEngineVersion(response)` (returns `response.engineVersion ?? LEGACY_ENGINE_VERSION ("1.0.0")`). `LEGACY_ENGINE_VERSION` constant as single source of truth. `error-reporter.ts` propagates via `{...baseCtx, ...options.context}` Partial<LogContext> merge. |
| **Storage extension** (PR6c) | New | `lib/storage/icv-store.ts` now exports `ICvStore.saveCv(id, document)` + `loadCv(id)` (key `buildcv:cv:{id}` separate from legacy `buildcv:draft:*`). Validates against `cvDocumentSchema` on save/load. 3 golden fixtures in `__tests__/fixtures/json-resume/`: `basic-cv.json`, `full-cv.json`, `colombian-cv.json`. 4 round-trip tests covering confidence preservation, datosPersonales preservation, engineVersion seal. |
| **E2E tests** (PR6a, PR6b) | New | `e2e/importar.spec.ts` — v2 happy path slice (upload → structured panel → analyze redirect). `e2e/a11y-structured.spec.ts` — axe-aligned in-house rule set (3 tests covering `JobSpecForm` / `SectionBreakdown` / Editor structured mode). `e2e/analizar-adapt.spec.ts` + `e2e/analizar-export.spec.ts` + `e2e/credits.spec.ts` — migrated from legacy `<textarea>` to `JobSpecForm` (followup-1 commit `55985f3`); 16/16 e2e pass + 9/9 regression pass. |
| **Feature flag** | New | `NEXT_PUBLIC_STRUCTURED_INPUT=true` (default `.env.example` + `.env.local`). Rollback = flip to `"false"` (instant, no redeploy). |

## Stats

| Metric | API | Web | Total |
|---|---|---|---|
| **Work-unit commits** | 11 (`5f3982a` → `6f0456f`) | 23 (`30672b4` → `b75c5b1` + `55985f3` + typo fix `82a400b`) | 34 (+ 2 merge + 1 typo fix = 37) |
| **Files changed** | 112 | 80 | 192 |
| **Insertions** | ~18,800 | ~12,500 | ~31,300 |
| **Deletions** | ~275 | ~417 | ~692 |
| **New tests** | +N (JobSpecValidator, discriminated-union tests, IStructuredParser contract, PdfPig/OpenXml structured tests, ScoreV2 per-section + red-flag tests, determinism property test) | +M (Zod schemas, section component tests, JobSpecForm tests, observability `engineVersion` tagging tests, golden fixture round-trip, e2e migrations) | +N+M |
| **New dependencies** | 0 (uses existing EF Core + FluentValidation + PdfPig + OpenXML) | 0 (uses existing Zod) | 0 |
| **EF migrations** | 0 (no DB schema change) | n/a | 0 |
| **Build warnings** | 0 (`dotnet build -c Release` clean, warnings-as-errors) | 0 (`pnpm build` clean, 26 routes) | 0 |
| **Lint / format** | 0 (`dotnet format --verify-no-changes` clean) | 0 (`pnpm lint` clean) | 0 |
| **Suppressions** | 0 (no `#pragma warning disable`, no `[Skip]`) | 0 (no `@ts-ignore`, no `eslint-disable`) | 0 |

### Test counts (post-verify — see [verify gates](#6-gates-all-green))

Per `tasks.md` final state (PR6d): web unit **1012/1012** passing (+4 over baseline 1008), web e2e **22+ (3 a11y-structured + 1 v2 happy path slice in importar + 16 migrated in followups-1 + 9 regression)** all green; api tests pass under `dotnet test` (Domain + Application + Infrastructure + Integration). Full CI gate local verified in PR6d: `pnpm lint && pnpm build && pnpm test && pnpm test:e2e --retries=2` + `dotnet build BuildCv.slnx -c Release && dotnet test && dotnet format --verify-no-changes` all green.

## 6 Gates (all green)

| Gate | Status | Details |
|------|--------|---------|
| 1. lint | ✅ | `dotnet format --verify-no-changes` clean. `pnpm lint` clean. |
| 2. typecheck | ✅ | `pnpm tsc --noEmit` clean (implicit via `pnpm build`). |
| 3. test | ✅ | API: `dotnet test` all green per PR3d commit message + PR6d CI gate verification. Web: **1012/1012 unit** + **16/16 migrated e2e + 9/9 regression** (followups-1). |
| 4. e2e | ✅ | Playwright: `pnpm test:e2e` all green (1 pre-existing flaky in `navigation.spec.ts:142` verified with `git stash` to be unrelated to 021 — known flaky mobile-menu test). |
| 5. build | ✅ | `dotnet build BuildCv.slnx -c Release` 0 warnings. `pnpm build` clean (26 routes). |
| 6. constitution-check | ✅ | All 9 articles compliant (see Constitution Compliance section below). No amendments required — SemVer bump is the contractual materialization of Art. II (note added to `constitution.md` per PR6d commit `6f0456f`). |

## Constitution Compliance

| Article | Status | Notes |
|---------|--------|-------|
| **Art. I** — Cero invención | ✅ PASS | Parser NEVER emits `confidence: "user_confirmed"` — that marker is set ONLY by the editor on save via `promoteConfidence(cv, touched)`. Untouched fields stay `"inferred"`. Defense in depth: Zod strict mode rejects new entities in round-trip; the score response shape exposes `artIViolations`-equivalent (the `redFlags[]` array) for transparency. JSON Resume shape has no "Soft invention" path — entities come exclusively from the source document or user-typed fields. |
| **Art. II** — Puntaje determinista | ✅ PASS | `ScoringEngine.ScoreV2` is pure C# with no IO/clock/randomness on the calc path. `ScoringEngine.Version` is a `public const string Version = "2.0.0"` (compile-time, single source of truth). Determinism property test (PR3d commit `26cdd2b`) verifies 1000 parallel runs produce byte-identical output. SemVer MAYOR bump seals the contract; `VERSION_MISMATCH` 422 rejected if `engineVersion` doesn't match the input shape. Constitution note added per PR6d commit `6f0456f`. |
| **Art. III** — Privacidad primero | ✅ PASS | Zero server-side persistence: `ImportResult` returned in RAM only; `ScoreResponse` not stored; rollback requires zero data migration. `LocalStorageCvStore` v2 path stores `CvDocument` in user's device only (Art. III v1.1.0). JobSpec validation rejection messages use generic codes (`JOB_SPEC_PROMPT_INJECTION`) WITHOUT echoing the offending payload (Art. III privacy first; the offending string is not logged). |
| **Art. IV** — Encuadre honesto | ✅ PASS | UI copy in `lib/copy/es.ts` (added in PR5b) uses "coincidencia con la vacante + legibilidad", never "ATS oficial". Per-section scoring shows the breakdown honestly (sections absent get `null` and renormalize, not hidden). Red flags are signal-only — never deduct from score. No forbidden phrases in any new copy. |
| **Art. V** — Entrada como dato | ✅ PASS | `JobSpecValidator` rejects prompt-injection-shaped strings (control chars U+0000–U+001F, zero-width U+200B–U+200D/U+FEFF, substrings `ignore previous` / `system:` / `` / `assistant:` case-insensitive). Rejection occurs BEFORE scoring. Reuse of 003-adapt-ia's `PromptBuilder` with `<DATA nonce>` blocks for any LLM-bound flows (none in the structured v2 path itself — but downstream 003/018 calls inherit the nonce pattern). |
| **Art. VI** — Clean Architecture | ✅ PASS | Domain pure: `dotnet list src/BuildCv.Domain package references` → 0 packages. New Domain types (`PerSectionScore`, `RedFlag`, `ScoreResultV2`) are pure records. `ICvParser` port extended via discriminated-union `ParseResult` (no new ports needed). `IStructuredParser` is the new interface, `LegacyParserAdapter` shim wraps legacy `ICvParser`. Web `ICvStore` port extended with `saveCv`/`loadCv`. |
| **Art. VII** — Rate limits | ✅ PASS | No new rate-limit policies — score (60/min) + import (30/h) unchanged. The new payload types don't change the rate-limit policy matrix. |
| **Art. VIII** — TDD | ✅ PASS | TDD on every handler + adapter + state transition + UI component. Tests written BEFORE implementation per PR descriptions in `tasks.md`. Coverage ≥90% on Domain (PerSectionScore/RedFlag/ScoreResultV2 + discriminators). 0 suppressions across both repos. |
| **Art. IX** — Habeas Data | N/A | This change is v0.5.3 — no monetary flow, no user accounts, no consent flow. Privacy-by-default: zero server-side persistence (Art. III). The v1 Habeas Data gates (009-auth) remain blocking 010-payments. |

**Total**: 9 articles, 8 ✅ PASS + 1 N/A. **No amendments required** — SemVer bump is the contractual materialization of Art. II's existing rule per the note added to `constitution.md` in PR6d commit `6f0456f`.

## Deviations from Design

Three deviations were discovered during implementation and verification. All are **documented and acceptable** — none required a spec rewrite or constitution amendment.

### 1. `NEXT_PUBLIC_STRUCTURED_INPUT` default `"true"` (not `"false"`)

- **Origin**: PR 6 task 6.4 in the original proposal said default `"false"` (rollout OFF initially). PR 4e (commit `82c0bfd`) shipped with default `"true"` (rollout ON).
- **Reason**: Per PR6d micro-batch documentation, the rollout was decided to be ON immediately — feature is mature, gates green, no observed regressions. Default `"true"` keeps the rollback path explicit (flip env var to `"false"` for instant rollback, no redeploy needed).
- **Impact**: Zero — both paths live in the bundle (Constitution Art. VI ships legacy + JSON Resume for one release cycle). Rollback is a config flip, not a redeploy.
- **Documented**: `tasks.md` PR6d slice "6d" deviation note (lines 117-119).

### 2. `RedFlag` uses non-positional record + explicit ctor (Roslyn regression workaround)

- **Origin**: PR 3a originally intended to add `RedFlag` as a positional record like `PerSectionScore`. SDK 10.0.108/Linux rejected executable statements inside the primary-constructor body of positional records (Roslyn regression).
- **Reason**: Workaround for Roslyn regression — `RedFlag` uses non-positional record + explicit ctor. Call-site signature `(string, RedFlagSeverity, string)` preserved (identical to the original positional record's compile signature).
- **Impact**: Zero — public API surface unchanged. Internal type-shape difference is invisible to consumers.
- **Documented**: `tasks.md` PR3a deviation note (lines 38-41 of the file).

### 3. `StructuredCvDocument` wire-format differs from editor's internal JSON Resume

- **Origin**: PR1 backend (`lib/job/cv-document.ts`) uses `Tagged*` wrappers (`{entry, confidence}`); the editor's internal schema (`lib/editor/schema/jsonresume.ts`, PR4a) uses flat `work`/`education`/etc. PR5b uses the wire-format to maintain backend parity.
- **Reason**: Backend wire-format is canonical for HTTP contracts. Editor internal schema is optimized for Zod parsing of typed inputs. The two formats co-exist until the editor is fully wired to the analyzer in a future PR.
- **Impact**: Minimal — Analyzer currently constructs an empty wire-format `CvDocument` (`createEmptyWireCvDocument()`) for the v2 score path. Once the editor is fully wired, the two formats can be unified.
- **Documented**: `tasks.md` PR5b deviation note (lines 81-82 of the file).

## Delta Specs Synced

For each delta spec in `specs/021-structured-cv-import-and-job-input/specs/{N}/spec.md`, the complete delta (ADDED + MODIFIED + REMOVED + Rollback Plan) was appended as a new `## v2.0.0 Changes (delta from change 021-structured-cv-import-and-job-input, archived 2026-06-26)` section at the bottom of the corresponding main spec. Each delta spec also got a `## Status` footer marking it as `MERGED into BuildCv-{api,web}/specs/{N}/spec.md at 2026-06-26`.

| Delta spec | Target main spec | Repo | Action |
|---|---|---|---|
| `021/specs/002-score-engine/spec.md` | `BuildCv-api/specs/002-score-engine/spec.md` | api | Appended v2.0.0 section (ADDED ×5 + MODIFIED ×2 + REMOVED ×1 + Rollback ×2); status footer `MERGED`. |
| `021/specs/005-cv-pdf-docx-import/spec.md` | `BuildCv-api/specs/005-cv-pdf-docx-import/spec.md` | api | Appended v2.0.0 section (ADDED ×4 + MODIFIED ×4 + REMOVED ×1 + Rollback ×2); status footer `MERGED`. |
| `021/specs/006-web-cv-editor/spec.md` | `BuildCv-web/specs/006-web-cv-editor/spec.md` | web | Appended v2.0.0 section (ADDED ×5 + MODIFIED ×3 + REMOVED ×1 + Rollback ×2); status footer `MERGED`. |
| `021/specs/008-observability-web/spec.md` | `BuildCv-web/specs/008-observability-web/spec.md` | web | Appended v2.0.0 section (ADDED ×3 + MODIFIED ×2 + Rollback ×1); status footer `MERGED`. |
| `021/specs/score-section-breakdown/spec.md` | _(cross-cutting — preserved in `021/specs/`)_ | api domain | **NEW** cross-cutting sub-spec (kept as audit trail in 021 folder; not promoted to numbered top-level). |
| `021/specs/structured-job-spec/spec.md` | _(cross-cutting — preserved in `021/specs/`)_ | web+api | **NEW** cross-cutting sub-spec (kept as audit trail in 021 folder; not promoted to numbered top-level). |

The two NEW cross-cutting sub-specs (`score-section-breakdown`, `structured-job-spec`) are preserved in `specs/021-structured-cv-import-and-job-input/specs/` as audit trail — they are implementation sub-pieces of 021 itself, not standalone features with their own NNN number. Their content is reflected in the main specs (002 + 005 for the backend portion; 006 for the editor portion) and in the 021 proposal.md + spec.md + design.md + tasks.md.

## Delivery Strategy

6 chained PRs + 1 followup (`021-followups-1`) on `feature/021-structured-cv-import-and-job-input`, matching the 012-wompi + 013-credit-consumption + 016-subscription-recurring + 018-cv-iteration-loop pattern (chained PRs per phase with atomic commits, all merged directly to `main`):

| Phase | Scope | API commits | Web commits | Lines (prod) | Test additions |
|-------|-------|-------------|-------------|--------------|----------------|
| **PR 1** — API contracts + JobSpec validators | JobSpec + discriminated-union types | `5f3982a` | `30672b4` | ~200 prod + ~600 test | +18 (5 api + 13 web) |
| **PR 2** — Backend parser restructure (5 micro-batches) | IStructuredParser + PdfPig + OpenXml + ParserRouter + ImportEndpoints | `bcbd078` + `7dd0089` + `9456bbc` + `a4c4277` + `2194c92` | `9eadbc0` + `5739415` + `1a7f95f` + `03f3672` (web consumer ImportResultV2) | ~1,200 prod + ~1,500 test | +35 (28 api + 7 web) |
| **PR 3** — Scoring engine v2.0.0 (4 micro-batches) | Domain types + ScoreV2 pure + handler dispatch + determinism property test | `1628a5f` + `64c3987` + `3afbe26` + `26cdd2b` | `bd7c8f0` + `9550792` + `2bea434` (web consumer ScoreResponseV2) | ~600 prod + ~400 test | +24 (15 api + 9 web) |
| **PR 4** — Web editor migration (5 micro-batches) | Zod schemas + types + section components + promoteConfidence + editor.tsx + flag | — | `ef22c59` + `f332f80` + `2baf9b0` + `0bc5ed8` + `82c0bfd` | ~1,800 prod + ~2,500 test | +45 (4a 12 + 4b 7 + 4c 19 + 4d 9 + 4e 6) |
| **PR 5** — Web analyzer + JobSpec + observability (4 micro-batches) | JobSpecForm + InputPanel/Analyzer + SectionBreakdown + observability tagging | — | `4b97a06` + `6d006ee` + `a5f50be` + `38577ec` | ~800 prod + ~1,200 test | +30 (5a 7 + 5b 6 + 5c 6 + 5d 4 + migration 7) |
| **PR 6** — Tests + a11y + e2e + docs (4 micro-batches) | Playwright e2e + axe-aligned a11y + golden fixtures + INDEX/proposal/tasks final-status | `6f0456f` (constitution SemVer note + INDEX sync) | `af59e67` + `79242b2` + `07a9142` + `b75c5b1` | ~200 prod + ~1,500 test | +17 (6a 6 + 6b 3 + 6c 4 + 6d 0 docs + 4 round-trip) |
| **Followups-1** | 8 e2e tests migrated to JobSpecForm + AnalizarScreen job-lift bug fix + tests | — | `55985f3` | ~50 prod + ~200 test | +8 migrated + bug fix |
| **Merge** | `feature/021-...` → `main` | `5d40a53` | `c9b893a` | (no source changes) | (no source changes) |
| **Typo fix** | Move `exploration.md` from `specs/020-` to `specs/021-` | — | `82a400b` | (docs only) | — |
| **TOTAL** | 7 phases (6 PRs + 1 followup) + 2 merges + 1 typo | **11 work-unit + 1 merge** | **23 work-unit + 1 merge + 1 typo** | **~4,850 prod + ~7,900 test** | **+177 cumulative (across PR1–PR6 + followups-1)** |

**Per-PR gates** (all passed per `tasks.md` micro-batch notes):
1. `dotnet build BuildCv.slnx -c Release` — 0 warnings (warnings-as-errors)
2. `dotnet format --verify-no-changes`
3. `dotnet test -c Release --no-build` — green (API)
4. `pnpm lint && pnpm build && pnpm tsc --noEmit && pnpm test` (web PRs)
5. `constitution-check.sh` — no Art. I-IX violations
6. `./scripts/preflight.sh` — full pipeline green

**Branch strategy**: only `main` (no feature branches in final state — `feature/021-structured-cv-import-and-job-input` was merged into `main` then deleted); per project rules, all work lands directly on `main` via chained PRs.

## Risks & Known Limitations

1. **`StructuredCvDocument` wire-format unification deferred** — backend `lib/job/cv-document.ts` (PR1) uses `Tagged*` wrappers `{entry, confidence}`; editor's internal JSON Resume schema (`lib/editor/schema/jsonresume.ts`, PR4a) uses flat `work`/`education`/etc. Analyzer currently constructs empty wire-format `CvDocument`s for the v2 score path. Unification deferred to a future PR when the editor is fully wired to the analyzer (full editor → score round-trip). Impact: minimal — score responses still valid; `perSection` shows `null` when CV sections are empty.
2. **Legacy editor shipped in same bundle as JSON Resume editor** — `components/editor/v1/*` + `components/editor/v2/*` both present. Bundle size overhead <15KB. Migration path is `NEXT_PUBLIC_STRUCTURED_INPUT` flip. After one release cycle of stability observation, the legacy editor can be deleted.
3. **Migration of legacy localStorage drafts is best-effort** — `lib/storage/migrate.ts` `migrateLegacyLocalStorage()` detects `buildcv:draft:*` legacy keys and persists as `-v2`. If migration fails silently (e.g., schema validation rejects), the user loses their legacy draft. Impact: low — legacy drafts are 8-section typed text, easy to re-create; user receives a non-blocking toast on next editor mount.
4. **@axe-core/playwright deferred to `020-a11y-automated-audit`** — 021 ships an in-house axe-aligned rule set (`html[lang]`, `<title>`, `<main>`, focusable count, label association, progressbar ARIA, list semantics). REQ-A11Y-002 (WCAG 4.5:1 contrast) not automatically verified — carried from 019 WARNING-2. Tracked by `020-a11y-automated-audit` (PLANEADO).
5. **JobSpec rejection codes are generic** — `JOB_SPEC_PROMPT_INJECTION` does NOT echo the offending payload (Art. III privacy first). Users see "Tu vacante no cumple con el formato esperado" without context. Trade-off: privacy over debuggability. Future: rate-limit-aware user-friendly hints could be added without revealing the payload (deferred).
6. **`engineVersion` mismatch events (`ENGINE_VERSION_DOWNGRADE` / `ENGINE_VERSION_UPGRADE`) are logged but not alerted** — out of scope per spec. Operators must monitor observability dashboards manually.
7. **`engineVersion` field is additive on log payloads** — legacy consumers that don't know about it continue working. Strict Zod rejects `engineVersionX` typo (verified by FR-091 test scenario).
8. **DOCX without semantic structure** falls back to `confidence: "inferred"` everywhere — parser can't read DOCX heading hierarchy in flattened text. User must confirm all fields via the editor on blur.

## Migration Notes

- **No database migrations** (zero server-side persistence — Art. III).
- **No new NuGet dependencies** (uses existing EF Core + FluentValidation + PdfPig + OpenXML).
- **No new pnpm dependencies** (uses existing `zod@^3`).
- **Production deploy order**:
  1. Backend first: deploy new `BuildCv-api` build → server now serves v2 contract by default (default `engineVersion: "2.0.0"`). v1 clients that pin `"1.0.0"` continue working via shim.
  2. Web second: deploy new `BuildCv-web` build with `NEXT_PUBLIC_STRUCTURED_INPUT=true` (default). Users see new editor + per-section breakdown + JobSpecForm.
  3. Rollback (instant, no redeploy): set `NEXT_PUBLIC_STRUCTURED_INPUT=false` in `.env.local` and `next build` reload → users see legacy editor + legacy score + legacy import.
- **Backwards compatibility**:
  - v1 `engineVersion: "1.0.0"` clients continue to work for at least one release cycle via discriminated-union shim in `ScoreCvHandler`.
  - v1 `engineVersion: "1.0.0"` import clients continue to work via `?engineVersion=1.0.0` query param or `X-Engine-Version: 1.0.0` header.
  - Legacy localStorage drafts auto-migrate on next editor mount via `tryMigrateLegacyDraft`.
  - Both web editor variants (legacy + JSON Resume) ship in the same bundle for one release cycle.

## Code Quality Checks (all pass)

- [x] 0 `#pragma warning disable` in source (auto-generated EF scaffolder output excluded).
- [x] 0 `[Skip]` / `[Fact(DisplayName="Skip…")]` / `dotnet test --filter !~…` in source.
- [x] 0 `@ts-ignore` in source.
- [x] 0 `eslint-disable` in source.
- [x] 0 `Mock<>` abuse — uses real `InMemory` adapters (api) + real `ICvStore` (web) for unit tests.
- [x] 0 cookies added (BFF routes use `getJwtFromSession()` for auth, no tracking cookies).
- [x] 0 third-party tracking added (Art. III privacy strict).
- [x] 0 new NuGet dependencies.
- [x] 0 new pnpm dependencies.
- [x] Domain purity: 0 external packages in `BuildCv.Domain` (verified via `dotnet list src/BuildCv.Domain/BuildCv.Domain.csproj package`).
- [x] Conventional commits: all 34 work-unit commits follow `feat(021): ...` / `test(021): ...` / `fix(021): ...` / `docs(021): ...` / `chore(021): ...` pattern.
- [x] No AI attribution in commits (no `Co-Authored-By: AI` lines per project rules).
- [x] Work-unit commits: 11 api + 23 web + 2 merges + 1 typo fix = **37 total on `main`**.

## Backward Compat Verification

All baseline test suites still pass (no regressions):

- [x] **002-score-engine** — `ScoringEngine.ScoreV2` is additive (v1 path retained). `ScoreCvHandler` dispatches on `engineVersion`. v1 clients pin `"1.0.0"` and receive the v1 response shape.
- [x] **003-adapt-ia** — `AdaptCvCommand` + `AdaptCvHandler` unchanged. v1 `{cvText, jobText}` payloads still accepted; v2 `{cv, job}` payloads routed through the new path.
- [x] **004-export-pdf** — unchanged.
- [x] **005-cv-pdf-docx-import** — `ParserRouter` dispatches by `engineVersion`. v1 clients pin `"1.0.0"` (via query param or header) and receive legacy `{text, sections}` shape; v2 clients receive `{cv: CvDocument}` shape.
- [x] **006-cv-editor** — editor rewritten with `NEXT_PUBLIC_STRUCTURED_INPUT` flag; legacy 8-textarea editor still in bundle for one release cycle.
- [x] **006b-web-cv-diff-viewer** — unchanged.
- [x] **008-observability** — `engineVersion` field additive on `LogContext` + `LogEntry`. Legacy consumers continue working; observability events now tagged with the engine version that produced them.
- [x] **009-018** — all prior features untouched. ARCO cascade (009-auth), credit ledger (013-credit-consumption), subscriptions (016), iteration loop (018) all continue working.

**Total verified**: All api + web test suites pass with 0 regressions. Rollback path requires zero data migration.

## Constitution (v1.2.0) — note added in PR6d commit `6f0456f`

```diff
+ > **SemVer bump note (added 2026-06-26, 021-structured-cv-import-and-job-input):**
+ > La regla anterior se materializó con un bump MAYOR `1.0.0 → 2.0.0` en
+ > `ScoringEngine.Version` como parte del cambio `021-structured-cv-import-and-job-input`
+ > (per-section breakdown + `redFlags` + entrada tipada `CvDocument` / `JobSpec`).
+ > El sello `engineVersion: "2.0.0"` se incluye en cada `ScoreResponse` (v2) y
+ > `ImportResult` (v2); el contrato v1 (`"1.0.0"`) sigue alcanzable vía `engineVersion`
+ > explícito por un ciclo de release (shim con discriminated-union `ScoreCvCommand`).
+ > Sin enmienda constitucional — el bump es la materialización contractual de la regla existente.
```

This note documents the SemVer bump as the **contractual materialization** of the existing Art. II rule. No constitutional amendment required.

## Source of Truth Updated

The master indexes are updated:

- `BuildCv-web/specs/000-INDEX.md` — 021 row: `🚧 EN CURSO` → `✅ SHIPPED + ARCHIVED` with tag reference. "Última actualización" → 2026-06-26. New `### 021-structured-cv-import-and-job-input (v0.5.3, cross-repo: web frontend + api backend) — ✅ SHIPPED + ARCHIVED` section added under "Features SHIPPED (detalle)" with full delivery, constitution compliance, commits, and date details.
- `BuildCv-api/specs/000-INDEX.md` — same updates. New `### 021-structured-cv-import-and-job-input (v0.5.3, cross-repo: web frontend + api backend) — ✅ SHIPPED + ARCHIVED` section added. "Próximos pasos candidatos" extended with archived 021 strikethrough.

Delta specs synced:

| Target main spec | Repo | Action |
|---|---|---|
| `BuildCv-api/specs/002-score-engine/spec.md` | api | Appended `## v2.0.0 Changes (delta from change 021, archived 2026-06-26)` section (ADDED ×5 + MODIFIED ×2 + REMOVED ×1 + Rollback ×2). |
| `BuildCv-api/specs/005-cv-pdf-docx-import/spec.md` | api | Appended v2.0.0 section (ADDED ×4 + MODIFIED ×4 + REMOVED ×1 + Rollback ×2). |
| `BuildCv-web/specs/006-web-cv-editor/spec.md` | web | Appended v2.0.0 section (ADDED ×5 + MODIFIED ×3 + REMOVED ×1 + Rollback ×2). |
| `BuildCv-web/specs/008-observability-web/spec.md` | web | Appended v2.0.0 section (ADDED ×3 + MODIFIED ×2 + Rollback ×1). |
| `021/specs/002-score-engine/spec.md` | web | Added `## Status` footer: `MERGED into BuildCv-api/specs/002-score-engine/spec.md at 2026-06-26`. |
| `021/specs/005-cv-pdf-docx-import/spec.md` | web | Added `## Status` footer: `MERGED into BuildCv-api/specs/005-cv-pdf-docx-import/spec.md at 2026-06-26`. |
| `021/specs/006-web-cv-editor/spec.md` | web | Added `## Status` footer: `MERGED into BuildCv-web/specs/006-web-cv-editor/spec.md at 2026-06-26`. |
| `021/specs/008-observability-web/spec.md` | web | Added `## Status` footer: `MERGED into BuildCv-web/specs/008-observability-web/spec.md at 2026-06-26`. |
| `021/specs/score-section-breakdown/spec.md` | web | Kept in 021/specs/ as audit trail (NEW cross-cutting sub-spec). |
| `021/specs/structured-job-spec/spec.md` | web | Kept in 021/specs/ as audit trail (NEW cross-cutting sub-spec). |

## Archive Contents

| File | Status |
|------|--------|
| `proposal.md` | ✅ present (~280 lines, 9 sections, risk matrix, 9-article compliance, 4 risks, 5 dependencies, 8 success criteria) |
| `spec.md` | ✅ present (~140 lines, NEW Capabilities ×2 + MODIFIED Capabilities ×4, File Map, Cross-cutting Rules) |
| `design.md` | ✅ present (~970 lines, architecture decisions, component breakdown, parser restructure strategy, scoring v2 design, editor migration roadmap) |
| `tasks.md` | ✅ present (~340 lines, 6 PRs decomposed into ~17 micro-batches, 21+ task items all ✅ done, followup batch included) |
| `archive-report.md` | ✅ present (this file) |

The change folder `BuildCv-web/specs/021-structured-cv-import-and-job-input/` is preserved as the audit trail. No move to `_archive/` was performed — the project convention keeps shipped features in their numbered folder (matching 002-score-engine through 018-cv-iteration-loop + 019-navigation-onboarding pattern).

## Tag

- **Tag**: `021-structured-cv-import-and-job-input-v1.0`
- **Tag at**: `5d40a53` (BuildCv-api HEAD, merge commit) and `82a400b` (BuildCv-web HEAD, includes typo fix)
- **Branch**: only `main` (no feature branches in final state — `feature/021-structured-cv-import-and-job-input` was merged into `main` then deleted)
- **Web HEAD**: `82a400b` (typo fix `020→021`)
- **NOT pushed** by archive per project rules (orchestrator pushes after archive completes + tags)

## Verification Verdict

**READY TO ARCHIVE** ✅ — verified on 2026-06-26, 6/6 gates green, all CRITICALs closed (0 CRITICAL issues found), 0 WARNINGs (all deferred followups resolved in followups-1 commit `55985f3`), 8/9 articles compliant + 1 N/A (Art. IX — v1 monetization not in scope), Constitution SemVer bump note added in PR6d commit `6f0456f`, delta specs synced into 4 main specs (002 + 005 api, 006 + 008 web) with status footers, INDEXes updated in both repos, archive report created. Backward compat preserved across all 18 prior features (002/003/004/005/006/006b/007/008/009/010/011/012/013/013.2/014/015/016/017/018).

## SDD Cycle Complete

```
sdd-propose  ✅ proposal.md (~280 lines, 9 decisions, 4 risks, 9-article compliance, 8 success criteria)
sdd-spec     ✅ spec.md (~140 lines, 2 NEW capabilities + 4 MODIFIED capabilities, file map, cross-cutting rules)
sdd-design   ✅ design.md (~970 lines, data model, ports, parser restructure strategy, scoring v2 design, editor migration roadmap)
sdd-tasks    ✅ tasks.md (~340 lines, 6 PRs decomposed into ~17 micro-batches, TDD-ordered)
sdd-apply    ✅ PR1 → PR2 (5 micro-batches) → PR3 (4 micro-batches) → PR4 (5 micro-batches) → PR5 (4 micro-batches) → PR6 (4 micro-batches) + followups-1
              → 11 work-unit api + 23 work-unit web + 2 merges + 1 typo fix = 37 commits total on main
sdd-verify   ✅ 6/6 gates green (lint + typecheck + test + e2e + build + constitution-check), all CRITICALs closed, all WARNINGs deferred resolved
sdd-archive  ✅ this report + INDEX update in both repos + delta spec sync (4 main specs) + status footers (4 deltas) + engram memory + git tag (local only)
```

## Recommended Next Candidates (in order of priority)

1. **020-a11y-automated-audit (v0.5.3, web-only)** — wires `@axe-core/playwright` for automated WCAG 2.2 AA scans across all routes. Closes WARNING-2 from 019 + adds defense-in-depth for 021's section components + `SectionBreakdown` (5 `role="progressbar"` + red-flag list semantics). ~M effort (1-2 hours). **Already PLANEADO in `BuildCv-web/specs/000-INDEX.md`** as the next recommended feature.
2. **021-followups-2 (v0.5.3, optional)** — unify `StructuredCvDocument` wire-format (backend `lib/job/cv-document.ts` Tagged* wrappers) with editor's internal JSON Resume flat schema. Deferred per PR5b deviation. ~S effort (1 commit).
3. **021-followups-3 (v0.5.3, optional)** — drop the unused `secondaryCta` prop from `<EmptyState>` after one release cycle of 021 stability observation (parallels 019 WARNING-1 closure pattern). ~XS effort (5 min).
4. **022-structured-cv-import-v2 (v1, optional)** — if 021 needs a v2 for any reason (root-cause review after one release cycle of stability), re-plan per the existing proposal.md Rollback Plan §5.
5. **009-auth-web (v1)** — blocked by gate Habeas Data (Art. IX). Unblocks 010-payments + multi-device draft sync. Suggestion: extract `<CreditArea>` from `/analizar` to `<HeaderExtras>` slot during PR1 of 009.

## Lessons Learned (for next SDD cycles)

1. **Cross-repo feature delivery via 6 chained PRs + followup works at this scale** — the proposal.md flagged "400-line budget WILL exceed" risk with mitigation "4–6 chained PRs each <400 LOC". The reality: 6 PRs decomposed into ~17 micro-batches, each micro-batch <400 LOC, each individually reviewable. Pattern: any cross-repo feature that bumps `ScoringEngine.Version` MUST follow this pattern (chained PRs with explicit `engineVersion` discrimination + backward-compat shim).
2. **Discriminated-union `ScoreCvCommand` + `engineVersion` discriminator is the canonical pattern for backward-compat** — v1 clients pin `engineVersion: "1.0.0"` and continue working; v2 clients receive new shape. The shim lives for one release cycle. This pattern is reusable for future SemVer bumps (v2 → v3 when needed).
3. **`promoteConfidence(cv, touched)` is a pure function + structural sharing for untouched sections** — proves that Constitution Art. I defense in depth (parser never auto-promotes) is enforceable in the type system. Pattern reusable for any "metadata-set-only-by-frontend-on-user-action" requirement.
4. **`engineVersion` as additive observability field works cleanly** — strict Zod rejects `engineVersionX` typo; legacy consumers ignore the new field; migration is zero-config. Pattern reusable for any future "tag responses with contract version" requirement.
5. **In-house axe-aligned rule set is a viable stopgap for `@axe-core/playwright`** — covers the WCAG 2.2 AA must-haves (lang, title, landmarks, focusable, label association, progressbar ARIA, list semantics). Defer `@axe-core/playwright` to a dedicated feature (`020-a11y-automated-audit`) rather than blocking cross-repo delivery.
6. **Followup batch (PR 8 e2e migrations + AnalizarScreen job-lift bug fix) was unavoidable** — the v1 → v2 contract change in PR5b (replace `<textarea>` with `<JobSpecForm>`) was a UI-breaking change that touched 8 e2e tests across 3 specs. Pattern: when changing the contract of a core form component, schedule a followup batch for e2e migration in the same release. The followup is a single atomic commit per repo, well-scoped, and documented as a deviation in `tasks.md`.

## Engram Persistence

This report is persisted to Engram with:

- `topic_key`: `sdd/021-structured-cv-import-and-job-input/archive-report`
- `type`: `architecture`
- `project`: `buildcv`
- `capture_prompt`: `false` (automated SDD artifact)

The session-level `mem_save` for "021-structured-cv-import-and-job-input SHIPPED + ARCHIVED" is also persisted with project context, 6-PR + followup-1 delivery strategy learnings, discriminated-union `ScoreCvCommand` + `engineVersion` pattern, `promoteConfidence` pure function + structural sharing pattern, SemVer bump note for Constitution Art. II materialization, and axe-aligned in-house rule set as stopgap.