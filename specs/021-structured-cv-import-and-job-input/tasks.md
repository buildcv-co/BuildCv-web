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
- [ ] 2.1 RED — Golden JSON Resume (5+) + DOCX fixtures
- [ ] 2.2 GREEN — `Import/CvDocument.cs` JSON Resume + Colombian extension
- [ ] 2.3 GREEN — `SectionDetector.cs` `SectionKind` enum header discriminator
- [ ] 2.4 GREEN — Refactor `PdfPigCvParser.cs` emit structured `CvDocument` + `confidence` markers
- [ ] 2.5 GREEN — Refactor `OpenXmlCvParser.cs` preserve DOCX lists in `work[]`
- [ ] 2.6 GREEN — `ParserRouter.cs` returns `{structured: CvDocument} | {raw: {text}}`
- [ ] 2.7 TDD — `ImportResult` v2 + `ImportResponseMapper` + endpoints

### PR 3 — Scoring engine v2.0.0
- [ ] 3.1 RED — Property determinism test (1000 parallel → byte-identical)
- [ ] 3.2 RED — Per-section + red-flag tests (gaps > 6mo, job-hop ≥3 <18mo/5y)
- [ ] 3.3 GREEN — Bump `ScoringEngine.cs` `Version` to `"2.0.0"`; `ScoreV2(cv, job)` pure
- [ ] 3.4 GREEN — Add `PerSectionScore`, `RedFlag`, `SectionId`, `RedFlagSeverity` to `ScoreResult.cs`
- [ ] 3.5 Modify `ScoreCvHandler.cs` accept discriminated union; bypass regex when structured
- [ ] 3.6 Update `ScoreResponseMapper.cs` + `ScoringEndpoints.cs`

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