# Tasks: 021 — Structured CV Import + Mandatory Job Spec

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

## Phase 1: Backend Foundation (PR 1)

### PR 1 — API contracts + JobSpec validators
- [x] 1.1 TDD — `web/lib/job/job-spec.ts` Zod schema + 5-rejection tests
- [x] 1.2 TDD — `api/.../Jobs/JobSpec.cs` + `JobSpecValidator.cs` + xUnit rejection tests
- [x] 1.3 TDD — Zod ↔ FluentValidation parity (byte-identical error codes)
- [x] 1.4 GREEN — `api/.../Domain/Resumes/CvDocument.cs` JSON Resume + `DatosPersonales` + `ConfidenceMarker`
- [x] 1.5 Modify `ScoreCvCommand.cs` discriminated union + branch on `engineVersion`
- [x] 1.6 Modify `ScoreResponse.cs` add `PerSectionResponse`/`RedFlagResponse`; `ScoreCvRequest` in `web/lib/api/types.ts`; extract codes

## Phase 2: Backend Parsers + Scoring (PR 2, PR 3)

### PR 2 — Backend parser restructure

> Micro-batch 2a (PR 2a) — IStructuredParser + ParseResult discriminated union — done; legacy parsers untouched. Tasks 2.1/2.2 are marked as the RED/GREEN slots for this micro-batch per the orchestrator brief. The full scope of the original 2.1 (golden fixtures) and 2.2 (`Import/CvDocument.cs` — superseded by `Domain/Resumes/CvDocument.cs` from PR 1) is captured in the apply-progress and split across micro-batches 2b/2c/2d.

- [x] 2.1 RED — `ParseResultTests` (10 cases: union variants, engineVersion, throws on cross-variant accessors, IStructuredParser contract via mock) — micro-batch 2a RED
- [x] 2.2 GREEN — `ParseResult.cs` discriminated union (RawParseResult / StructuredParseResult / ParsingWarning) + `IStructuredParser` + `LegacyParserAdapter` shim wrapping legacy ICvParser — micro-batch 2a GREEN
- [ ] 2.3 GREEN — `SectionDetector.cs` `SectionKind` enum header discriminator
- [x] 2.b RED — `PdfPigCvParserStructuredTests` (5 spec tests: structured result, inferred confidence, explicit email, engineVersion=2.0.0, no user_confirmed) + 2 triangulation (work/edu/skills extraction, LinkedIn profile) — micro-batch 2b RED
- [x] 2.b GREEN — `PdfPigCvParser.cs` implementa `IStructuredParser` → `StructuredParseResult` con `CvDocument` + `confidence` markers (`explicit` para regex estricto, `inferred` para heurística, nunca `user_confirmed`); preserva `ICvParser` legacy 1.0.0 — micro-batch 2b GREEN
- [x] 2.c RED — `OpenXmlCvParserStructuredTests` (6 spec tests: structured result, inferred confidence, bullet list → Highlights, table → Highlights, engineVersion=2.0.0, no user_confirmed, DOCX_NO_SEMANTIC_STRUCTURE warning) — micro-batch 2c RED
- [x] 2.c GREEN — `OpenXmlCvParser.cs` implementa `IStructuredParser` → `StructuredParseResult` con `CvDocument` + `confidence` markers; walk body preservando estructura (paragraphs + tables + bullets → `ResumeWorkEntry.Highlights[]` con separator ` | `, sin aplanar con `\t`); preserva `ICvParser` legacy 1.0.0; section-header regex duplicada de PdfPigCvParser por atomicidad — micro-batch 2c GREEN
- [x] 2.4 GREEN — Refactor `OpenXmlCvParser.cs` preserve DOCX lists in `work[]` (subsumido por micro-batch 2c — parser preserva paragraphs + tables + bullets como `Highlights[]` en cada work entry)
- [x] 2.5 GREEN — `ParserRouter.cs` returns `{structured: CvDocument} | {raw: {text}}` por `engineVersion` (micro-batch 2d) — `Parse(ImportCvCommand)` ahora retorna `ParseResult` discriminated union (`RawParseResult` para v1, `StructuredParseResult` para v2). Despacha por MIME vía `IKnownMimeParser` marker, valida magic bytes, lanza `InvalidOperationException` ante engineVersion desconocido. `ImportCvCommand` gana `EngineVersion` opcional (default `"1.0.0"` en el router). `ImportCvHandler` consume `IParserRouter` (nuevo puerto) y adapta `ParseResult` → `ImportResult` legacy (shim que se retira en 2e).
- [x] 2.6 TDD — `ImportResult` v2 + `ImportResponseMapper` + endpoints (micro-batch 2e) — `ImportResult` ahora es discriminated union (`LegacyImportResult` para v1, `StructuredImportResult` con `Cv: CvDocument` para v2); `ImportEndpoints` acepta `?engineVersion=` / `X-Engine-Version` (default `2.0.0`, 400 si desconocido con código `IMPORT_UNSUPPORTED_ENGINE_VERSION`); `ImportResponseMapper.Map` retorna `object` mapeando por variante; shim `AdaptToLegacy` retirado del handler; web consumer (BFF + import button) negocia v2 por header y discrimina con `isImportResultV2`.

### PR 3 — Scoring engine v2.0.0
> **Decomposed into micro-batches 3a–3d** for reviewable scope. Each
> micro-batch is one atomic commit; no endpoint touched until 3c.

- [x] **3a** — Domain types `PerSectionScore`, `RedFlag`, `RedFlagSeverity`,
  `ScoreResultV2` with sealed `CurrentEngineVersion = "2.0.0"`. Pure
  factory `ScoreResultV2.FromLegacy(...)` returns zero PerSection +
  empty RedFlags (real scoring in 3b). 6 tests RED→GREEN on
  `tests/BuildCv.Domain.Tests/Scoring/ScoreResultV2Tests.cs`. Commit
  `1628a5f`. **Deviation**: types live in their own files (not appended
  to `ScoreResult.cs`) — better separation; `RedFlag` uses non-positional
  record + explicit ctor to work around Roslyn regression on
  SDK 10.0.108/Linux that rejects executable statements inside the
  primary-constructor body of positional records (same call-site
  signature `(string, RedFlagSeverity, string)` preserved).
- [x] **3b** — Per-section scoring pure function in `ScoringEngine.ScoreV2`
  (renormalization on missing section, contact hard-gate)
- [x] **3c** — `ScoringEngine.Version` bump to `"2.0.0"` + SemVer seal;
  `ScoreCvHandler` switches on `engineVersion`; `ScoreResponseMapper`
  exposes `perSection` + `redFlags` only when v2; legacy v1 path intact
  (commit in BuildCv-api; web consumer `requestScoreV2` discriminated
  response also lands in this micro-batch — see web commit).
- [x] **3d** — Property-based determinism test (1000 parallel runs →
  byte-identical output, no `DateTime.UtcNow` / `Guid.NewGuid` on calc
  path)

Decomposed from original tasks 3.1–3.6:

- [x] 3.1 RED — Property determinism test (1000 parallel → byte-identical) → 3d
- [ ] 3.2 RED — Per-section + red-flag tests (gaps > 6mo, job-hop ≥3 <18mo/5y) → 3b
- [ ] 3.3 GREEN — Bump `ScoringEngine.cs` `Version` to `"2.0.0"`; `ScoreV2(cv, job)` pure → 3b+3c
- [ ] 3.4 GREEN — Add `PerSectionScore`, `RedFlag`, `SectionId`, `RedFlagSeverity` → 3a (done); `SectionId` deferred to 3b if needed
- [x] 3.5 Modify `ScoreCvHandler.cs` accept discriminated union; bypass regex when structured → 3c
- [x] 3.6 Update `ScoreResponseMapper.cs` + `ScoringEndpoints.cs` → 3c

## Phase 3: Web Editor + Analyzer (PR 4, PR 5)

### PR 4 — Web editor migration to JSON Resume
- [ ] 4.1 TDD — `web/lib/editor/schema/jsonresume.ts` Zod schemas `.strict()`
- [ ] 4.2 TDD — `web/lib/editor/types.ts` → JSON Resume compatible; keep legacy for v1
- [ ] 4.3 TDD — Section forms `BasicsForm`/`WorkList`/`EducationList`/`SkillsByCategory` + RTL tests
- [ ] 4.4 TDD — Confidence-promotion flow (only editor sets `user_confirmed` on blur)
- [ ] 4.5 Update `editor.tsx` + `editor-toolbar.tsx` + `section-node.tsx` for `NEXT_PUBLIC_STRUCTURED_INPUT`

### PR 5 — Web analyzer + JobSpec form + observability
- [ ] 5.1 TDD — `web/components/analyzer/job-spec-form.tsx` mandatory (Zod validation) + RTL tests
- [ ] 5.2 TDD — `web/components/analyzer/section-breakdown.tsx` (render `perSection` + `redFlags`) + RTL tests
- [ ] 5.3 Update `input-panel.tsx` + `analyzer.tsx` + `lib/api/{types,score,import}.ts`; `error-reporter.ts` tag events with `engineVersion`

## Phase 4: Tests + Docs + Rollout (PR 6)

### PR 6 — Tests, a11y, e2e, docs, feature flag, deploy
- [ ] 6.1 Playwright e2e `web/e2e/structured-input.spec.ts` (upload → editor → JobSpec → score → breakdown)
- [ ] 6.2 axe-playwright WCAG 2.2 AA on `/analizar` + `/analizar/editar`
- [ ] 6.3 Update `web/lib/editor/__tests__/` fixtures; `LocalStorageCvStore` round-trip test
- [ ] 6.4 Add `NEXT_PUBLIC_STRUCTURED_INPUT` (default `"false"`) to `.env.example`
- [ ] 6.5 Update `specs/021-.../spec.md` + `constitution.md`; `import-button.tsx` + `web/app/api/{import,score}/route.ts` + BFF handlers