# Tasks: 022 — LLM Integration Local MVP

> **Change**: `022-llm-integration-local-mvp` · **Artifact home**: `BuildCv-web/specs/022-llm-integration-local-mvp/` · **Cross-repo**: `BuildCv-api/` + `BuildCv-web/`  
> **Mode**: filesystem SDD artifact · **Constitution**: `BuildCv-api/.specify/memory/constitution.md` v1.2.0 · **TDD**: RED → GREEN → REFACTOR per PR · **Implementation**: none in this phase.

---

## 1. Overview

Ship optional local-first LLM feedback as a separate channel from the deterministic score. The MVP is four reviewable PRs: PR1 API fake provider/config/contracts, PR2 API endpoint/security/fallback, PR3 Web BFF/adapter, PR4 Web panel/toggle/a11y/e2e. Real providers, production smoke, persistent preferences, billing, and advanced adversarial suites are deferred to 023+.

---

## 2. Execution Strategy

- Strict TDD per task: write failing RED test, implement GREEN, then REFACTOR without suppressions.
- Use atomic micro-batches: contracts → port/options → fake → endpoint → BFF → UI.
- Fresh review is mandatory before merging every PR; downstream PRs wait for review feedback to be resolved.
- Chain strategy is `feature-branch-chain` across independent repos; each child PR targets its parent branch.
- No code implementation during task planning. No `apply-progress` file.

---

## 3. Branch Strategy

| PR | Repo | Branch | Base | Target (final) |
|---|---|---|---|---|
| PR1 | api | `feature/022-llm-local-pr1-api-fake-provider` | api/main | api/main |
| PR2 | api | `feature/022-llm-local-pr2-api-feedback-endpoint` | api PR1 branch | api/main |
| PR3 | web | `feature/022-llm-local-pr3-web-bff` | web/main | web/main |
| PR4 | web | `feature/022-llm-local-pr4-feedback-panel` | web PR3 branch | web/main |

Dependencies: PR2 → PR1; PR3 → PR2; PR4 → PR3. If a child PR diff shows parent changes, retarget/rebase before review.

---

## 4. Review Budget / Size Forecast

Decision needed before apply: No (PR scope already split into PR1-4 by user; each PR < 400 LOC)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Low (each PR < 400 LOC; split paths documented for PR2/PR4 if needed)

| Field | Value |
|---|---|
| Estimated changed lines | ~1050 LOC total across 4 PRs (PR1 ~200 + PR2 ~350 + PR3 ~150 + PR4 ~350) |
| 400-line budget risk per PR | Low (PR1 200, PR2 350, PR3 150, PR4 350 — all <400) |
| Chained PRs recommended | Yes (4 PRs in chain) |
| Delivery strategy | ask-on-risk (default; user already chose scope conservative) |
| Chain strategy | feature-branch-chain cross-repo |

| PR | LOC forecast | Unit/component tests | Integration/contract tests | E2E/regression tests |
|---|---:|---:|---:|---:|
| PR1 api | ~200 | ~8 | ~3 | 0 |
| PR2 api | ~350 | ~18 | ~7 | 0 |
| PR3 web | ~150 | ~8 | ~4 | 0 |
| PR4 web | ~350 | ~14 | ~1 | ~5 |

---

## 5. PR1 Tasks — BuildCv-api fake provider + config/contracts

### Phase 1.1: Contracts (RED → GREEN → REFACTOR)

- [x] **T-PR1-001 RED**: Test `LlmFeedbackRequest` record binding for `cv`, `job`, `provider`, `providerAccountId`, `scoreContext`, and markers.
- [x] **T-PR1-001 GREEN**: Create `BuildCv-api/src/BuildCv.Application/Features/LlmFeedback/LlmFeedbackRequest.cs`.
- [x] **T-PR1-002 RED**: Test `LlmFeedbackResponse` 10-field record contract, including arrays and provider metadata.
- [x] **T-PR1-002 GREEN**: Create `LlmFeedbackResponse.cs`, `LlmFeedbackSuggestion.cs`, and `LlmFeedbackProviderMetadata.cs`.
- [x] **T-PR1-003 REFACTOR**: Add XML docs/invariants for contract boundaries without touching Domain.

### Phase 1.2: Port + Options

- [x] **T-PR1-004 RED**: Test `ILlmFeedbackClient.GenerateAsync` contract receives `LlmFeedbackContext` and `CancellationToken`.
- [x] **T-PR1-004 GREEN**: Create `ILlmFeedbackClient.cs` port and `LlmFeedbackContext.cs` carrier in Application.
- [x] **T-PR1-005 RED**: Test `LlmFeedbackOptions` binding: `Enabled=false`, `Provider=fake`, `Model=fake-local-v1`, `TimeoutMs=5000`.
- [x] **T-PR1-005 GREEN**: Create `LlmFeedbackOptions.cs` and register options + fake provider in DI.

### Phase 1.3: Fake Provider

- [x] **T-PR1-006 RED**: Test `FakeLlmFeedbackClient` returns deterministic v2 contract for same CV+job+score.
- [x] **T-PR1-006 GREEN**: Create `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/FakeLlmFeedbackClient.cs` with no HTTP/API key.
- [x] **T-PR1-007 RED**: Test markers affect output deterministically: `user_confirmed` strengths, `inferred` risks.
- [x] **T-PR1-007 GREEN**: Implement marker-aware deterministic output rules.
- [x] **T-PR1-008 RED**: Test fake always returns `degraded=false`, `provider='fake'`, `model='fake-local-v1'`.
- [x] **T-PR1-009 REFACTOR**: Extract common fake response builder and fixed clock seam.

### Phase 1.4: Config defaults

- [x] **T-PR1-010 RED**: Test config loads from `LlmFeedback` namespace, not `Ai`.
- [x] **T-PR1-010 GREEN**: Modify `BuildCv-api/src/BuildCv.Api/appsettings.json` and `appsettings.Development.json` with disabled fake defaults.
- [x] **T-PR1-011 RED**: Test env override `LLM_FEEDBACK__ENABLED=false` binds correctly.
- [x] **T-PR1-011 GREEN**: Verify env var binding through `IOptions<LlmFeedbackOptions>`.

### Phase 1.5: Quality gates

- [x] **T-PR1-012**: Verify Domain purity: `dotnet list src/BuildCv.Domain package references` → 0 AspNetCore/EF packages.
- [x] **T-PR1-013**: Defensive grep `NEXT_PUBLIC_LLM` → 0 hits.
- [x] **T-PR1-014**: Defensive grep `LLM_API_KEY` literal in code/responses/logs → 0 hits.
- [x] **T-PR1-015**: Verify CI/test config uses fake only and cannot instantiate real providers.

### Phase 1.6: Docs + commit

- [x] **T-PR1-016**: Update `BuildCv-api/specs/000-INDEX.md` row 022 PR1 status.
- [x] **T-PR1-017**: Commit `test(llm): cubrir fake provider y configuración`.
- [x] **T-PR1-018**: Commit `feat(llm): agregar contratos y fake provider`.
- [x] **T-PR1-019**: Commit `docs(022-llm): registrar avance PR1`.
- [x] **T-PR1-020**: Fresh review from review agent/person before merge.
- [ ] **T-PR1-021**: Merge api PR1 → api/main (`--no-ff`).

### PR1 verification commands

- `dotnet format --verify-no-changes`
- `dotnet build BuildCv.slnx -c Release` → 0 warnings, 0 errors
- `dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~FakeLlmFeedback"`
- `dotnet list src/BuildCv.Domain package references` → 0 external packages
- Defensive greps from section 10

### PR1 acceptance criteria

- [ ] `LlmFeedback:Enabled=false` default.
- [ ] `LlmFeedback:Provider=fake` default.
- [ ] `FakeLlmFeedbackClient` offline, deterministic, no HTTP.
- [ ] 10-field contract populated correctly.
- [ ] Domain purity maintained.
- [ ] No secrets hardcoded.
- [ ] Tests use fake only.

---

## 6. PR2 Tasks — BuildCv-api feedback endpoint + security/fallback/rate-limit

### Phase 2.1: PII Redaction (RED → GREEN → REFACTOR)

- [x] **T-PR2-001 RED**: Test `PiiRedactor.Redact(cvText)` masks emails.
- [x] **T-PR2-001 GREEN**: Implement email regex in `PiiRedactor`.
- [x] **T-PR2-002 RED**: Test phone masking for CO/US/ES formats.
- [x] **T-PR2-002 GREEN**: Add phone regex and fixtures.
- [x] **T-PR2-003 RED**: Test personal URL masking except known work domains.
- [x] **T-PR2-003 GREEN**: Add URL regex and allowlist.
- [x] **T-PR2-004 RED**: Test physical address masking with `calle`, `carrera`, `avenida` keywords.
- [x] **T-PR2-004 GREEN**: Add address regex.
- [x] **T-PR2-005 RED**: Test names are not masked to preserve work context.
- [x] **T-PR2-006 RED**: Test redaction failure throws `LlmFeedbackRedactionException` and never sends raw CV.
- [x] **T-PR2-006 GREEN**: Implement failure handler and exception type.

### Phase 2.2: Endpoint + Handler

- [x] **T-PR2-007 RED**: Test `POST /api/v1/llm/feedback` valid body → 200 + `LlmFeedbackResponse`.
- [x] **T-PR2-007 GREEN**: Create `BuildCv.Api/Endpoints/LlmFeedbackEndpoint.cs` and `GenerateLlmFeedbackHandler.cs`.
- [x] **T-PR2-008 RED**: Test validation error for missing CV → 400 `validation_error`.
- [x] **T-PR2-008 GREEN**: Add request validation in endpoint/handler.
- [x] **T-PR2-009 RED**: Test `LlmFeedback:Enabled=false` → 403 `disabled`.
- [x] **T-PR2-009 GREEN**: Add disabled check before provider boundary.
- [x] **T-PR2-010 RED**: Test confidence markers pass through to `LlmFeedbackContext`.
- [x] **T-PR2-010 GREEN**: Wire markers from request into context.
- [x] **T-PR2-011 RED**: Test `scoreContext` optional and score remains read-only.
- [x] **T-PR2-011 GREEN**: Wire optional `scoreContext` without scoring mutations.

### Phase 2.3: Rate Limit + Timeout + Fallback

- [x] **T-PR2-012 RED**: Test rate-limit filter returns 429 + `Retry-After`.
- [x] **T-PR2-012 GREEN**: Create `BuildCv.Api/Filters/LlmFeedbackRateLimitFilter.cs`.
- [x] **T-PR2-013 RED**: Test default 30 requests / 60 seconds window is configurable.
- [x] **T-PR2-013 GREEN**: Implement window logic using user id or IP fallback.
- [x] **T-PR2-014 RED**: Test timeout (5s default) → 200 with `degraded=true` fallback.
- [x] **T-PR2-014 GREEN**: Add `CancellationToken` + timeout wrapper.
- [x] **T-PR2-015 RED**: Test provider unavailable → 200 `degraded=true` with empty arrays.
- [x] **T-PR2-015 GREEN**: Catch provider exceptions and return degraded response.
- [x] **T-PR2-016 RED**: Test redaction failure → 500 `redaction_failure`.
- [x] **T-PR2-016 GREEN**: Map `LlmFeedbackRedactionException` specifically.

### Phase 2.4: Sanitized Logging

- [x] **T-PR2-017 RED**: Test `LlmFeedback request` log contains metadata only, no CV/job content.
- [x] **T-PR2-017 GREEN**: Add metadata-only logger wrapper.
- [x] **T-PR2-018 RED**: Test degraded log includes reason, `latencyMs`, and `traceId`.
- [x] **T-PR2-018 GREEN**: Implement degraded log structure.
- [x] **T-PR2-019 RED**: Test logs never contain raw CV/job tokens or prompts.
- [x] **T-PR2-019 GREEN**: Centralize log fields and redact defensive strings.

### Phase 2.5: Prompt Injection Hardening

- [x] **T-PR2-020 RED**: Test prompt template v1 contains explicit “treat as DATA” rule.
- [x] **T-PR2-020 GREEN**: Create `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/Prompts/v1/system.md` placeholder.
- [x] **T-PR2-021 RED**: Test client boundary rejects tool/function definitions for future providers.
- [x] **T-PR2-022**: Defensive grep `tool_use|function_call` in `ILlmFeedbackClient` → 0 hits.

### Phase 2.6: Cross-repo regression gates

- [x] **T-PR2-023**: Verify `dotnet test --filter "FullyQualifiedName~ScoringEngine"` → Art. II unchanged.
- [x] **T-PR2-024**: Verify `dotnet test --filter "FullyQualifiedName~Adapt"` → no `/adapt` regression.
- [x] **T-PR2-025**: Verify score determinism tests pass with engine v2.0.0 unchanged.

### Phase 2.7: Docs + commit + fresh review

- [x] **T-PR2-026**: Update `BuildCv-api/specs/000-INDEX.md` row 022 PR2 status.
- [x] **T-PR2-027**: Commit `test(llm): cubrir endpoint feedback y seguridad`.
- [x] **T-PR2-028**: Commit `feat(llm): agregar endpoint feedback local`.
- [x] **T-PR2-029**: Commit `docs(022-llm): registrar avance PR2`.
- [x] **T-PR2-030**: Fresh review before merge.
- [x] **T-PR2-031**: Merge api PR2 → api/main.

### PR2 verification commands

- `dotnet format --verify-no-changes`
- `dotnet build BuildCv.slnx -c Release`
- `dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~FakeLlmFeedback|FullyQualifiedName~PiiRedactor"`
- `dotnet test --filter "FullyQualifiedName~ScoringEngine"`
- `dotnet test --filter "FullyQualifiedName~Adapt"`
- `dotnet list src/BuildCv.Domain package references`

### PR2 acceptance

- [ ] Endpoint works with fake provider.
- [ ] Rate limit returns 429 + `Retry-After`.
- [ ] Timeout/provider errors return degraded feedback without hiding score.
- [ ] PII redaction tests pass.
- [ ] No CV/job content in logs.
- [ ] Deterministic score remains unchanged.

**SPLIT PATH if >400 LOC**: T-PR2-001..006 → PR2a (redaction). T-PR2-007..022 → PR2b (endpoint + rate-limit + fallback). STOP and request authorization first.

---

## 7. PR3 Tasks — BuildCv-web BFF + adapter

### Phase 3.1: Adapter (RED → GREEN → REFACTOR)

- [ ] **T-PR3-001 RED**: Test `fetchLlmFeedback` returns success state.
- [ ] **T-PR3-001 GREEN**: Create `BuildCv-web/lib/api/llm.ts` with types + fetch.
- [ ] **T-PR3-002 RED**: Test error normalization: 5xx → `unavailable`, 429 → `rate_limited`, 504 → `timeout`.
- [ ] **T-PR3-002 GREEN**: Implement error mapper.
- [ ] **T-PR3-003 RED**: Test `LlmFeedbackState` discriminated union covers all states.
- [ ] **T-PR3-003 GREEN**: Add exported type definitions.
- [ ] **T-PR3-004 RED**: Test request body matches API request (`cv`, `job`, `scoreContext`, markers).
- [ ] **T-PR3-004 GREEN**: Implement body builder.

### Phase 3.2: BFF Route

- [ ] **T-PR3-005 RED**: Test `POST /api/llm/feedback` BFF route exists.
- [ ] **T-PR3-005 GREEN**: Create `BuildCv-web/app/api/llm/feedback/route.ts` with `runtime='nodejs'`.
- [ ] **T-PR3-006 RED**: Test BFF forwards CV/job/markers to backend `/api/v1/llm/feedback`.
- [ ] **T-PR3-006 GREEN**: Implement proxy handler using `BACKEND_URL`.
- [ ] **T-PR3-007 RED**: Test BFF returns 200 + normalized state on success.
- [ ] **T-PR3-008 RED**: Test BFF returns 502 + state `unavailable` on backend error.
- [ ] **T-PR3-008 GREEN**: Implement error passthrough/normalization.
- [ ] **T-PR3-009 RED**: Test BFF never exposes `BFF_API_KEY` or any secret in response.
- [ ] **T-PR3-009 GREEN**: Strip sensitive headers/body fields.
- [ ] **T-PR3-010 RED**: Test `NEXT_PUBLIC_LLM_*` does not exist in BFF code.
- [ ] **T-PR3-010 GREEN**: Add defensive grep verification.

### Phase 3.3: Endpoint drift gate

- [ ] **T-PR3-011**: Update `scripts/check-endpoint-drift.mjs` if needed to include `/api/llm/feedback`.
- [ ] **T-PR3-012**: Verify `node scripts/check-endpoint-drift.mjs` → PASS.

### Phase 3.4: Docs + commit

- [ ] **T-PR3-013**: Update `BuildCv-web/specs/000-INDEX.md` row 022 PR3 status.
- [ ] **T-PR3-014**: Commit `test(llm): cubrir bff y adapter feedback`.
- [ ] **T-PR3-015**: Commit `feat(llm): agregar bff de feedback`.
- [ ] **T-PR3-016**: Commit `docs(022-llm): registrar avance PR3`.
- [ ] **T-PR3-017**: Fresh review before merge.
- [ ] **T-PR3-018**: Merge web PR3 → web/main.

### PR3 verification

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm typecheck`
- `node scripts/check-endpoint-drift.mjs`
- Defensive greps from section 10

### PR3 acceptance

- [ ] BFF route works.
- [ ] Adapter handles success/degraded/disabled/unavailable/rate-limited/timeout/error states.
- [ ] No secrets exposed client-side or in responses.
- [ ] Endpoint drift gate passes.

---

## 8. PR4 Tasks — BuildCv-web panel + toggle + e2e/a11y

### Phase 4.1: Toggle Hook (RED → GREEN → REFACTOR)

- [ ] **T-PR4-001 RED**: Test `useSessionToggle` reads/writes `sessionStorage`.
- [ ] **T-PR4-001 GREEN**: Create `BuildCv-web/lib/use-session-toggle.ts`.
- [ ] **T-PR4-002 RED**: Test toggle persists within session and resets on tab close.
- [ ] **T-PR4-002 GREEN**: Implement `sessionStorage` logic.

### Phase 4.2: Panel Component

- [ ] **T-PR4-003 RED**: Test `<LlmFeedbackPanel>` renders disabled state copy.
- [ ] **T-PR4-003 GREEN**: Create component skeleton and state discriminator.
- [ ] **T-PR4-004 RED**: Test idle state shows CTA button.
- [ ] **T-PR4-005 RED**: Test loading state shows spinner and `aria-busy=true`.
- [ ] **T-PR4-005 GREEN**: Implement loading UI.
- [ ] **T-PR4-006 RED**: Test success renders summary, strengths, risks, suggestions.
- [ ] **T-PR4-006 GREEN**: Implement success render.
- [ ] **T-PR4-007 RED**: Test degraded state shows banner + reason.
- [ ] **T-PR4-007 GREEN**: Implement degraded banner.
- [ ] **T-PR4-008 RED**: Test `unavailable`, `rate_limited`, `timeout`, and `error` states.
- [ ] **T-PR4-008 GREEN**: Implement error state renderers.

### Phase 4.3: A11y

- [ ] **T-PR4-009 RED**: Test `role="region"` and `aria-label="AI Feedback"`.
- [ ] **T-PR4-009 GREEN**: Add ARIA attributes.
- [ ] **T-PR4-010 RED**: Test keyboard toggle works with Tab + Space/Enter.
- [ ] **T-PR4-010 GREEN**: Use native button and focus management.
- [ ] **T-PR4-011 RED**: Test screen reader announces loading state.
- [ ] **T-PR4-011 GREEN**: Add `aria-live="polite"` to dynamic content.

### Phase 4.4: Copy

- [ ] **T-PR4-012**: Add `copy.analyzer.llmFeedback.*` keys to `BuildCv-web/lib/copy/es.ts`.
- [ ] **T-PR4-013**: Copy includes disclaimer: “Sugerencias IA complementarias, no reemplazan análisis determinista.”
- [ ] **T-PR4-014**: Copy avoids promising exactness, ATS official status, or employment guarantees.

### Phase 4.5: Integration

- [ ] **T-PR4-015**: Integrate panel in `BuildCv-web/app/analizar/page.tsx` beside deterministic results / `<FixList>`.
- [ ] **T-PR4-016**: Verify `<FixList>` unchanged: `git diff components/analyzer/fix-list.tsx` has no semantic changes.
- [ ] **T-PR4-017**: Verify toggle persists across navigation within the session.

### Phase 4.6: E2E + regression

- [ ] **T-PR4-018 RED**: E2E fake provider → panel shows success state.
- [ ] **T-PR4-018 GREEN**: Create `BuildCv-web/e2e/llm-feedback-pr4.spec.ts`.
- [ ] **T-PR4-019**: E2E toggle off → panel disabled.
- [ ] **T-PR4-020**: E2E backend error → panel unavailable.
- [ ] **T-PR4-021**: Regression: 009 auth-web e2e suite remains green.
- [ ] **T-PR4-022**: Regression: 021 structured input e2e suite remains green.

### Phase 4.7: Docs + commit + review

- [ ] **T-PR4-023**: Update `BuildCv-web/specs/000-INDEX.md` and API index cross-reference.
- [ ] **T-PR4-024**: Commit `test(llm): cubrir panel feedback ia`.
- [ ] **T-PR4-025**: Commit `feat(llm): agregar panel feedback ia`.
- [ ] **T-PR4-026**: Commit `docs(022-llm): registrar avance PR4`.
- [ ] **T-PR4-027**: Fresh review before merge.
- [ ] **T-PR4-028**: Merge web PR4 → web/main.

### PR4 verification

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm typecheck`
- `pnpm exec playwright test e2e/llm-feedback-pr4.spec.ts`
- `pnpm exec playwright test e2e/account-flow.spec.ts`
- `pnpm exec playwright test e2e/landing.spec.ts`
- `node scripts/check-endpoint-drift.mjs`
- Defensive greps from section 10

### PR4 acceptance

- [ ] Panel renders all 8 states.
- [ ] Toggle persists in `sessionStorage`.
- [ ] A11y attributes and keyboard flow present.
- [ ] Fake E2E smoke passes.
- [ ] `<FixList>` unchanged.
- [ ] 009/021 regressions green.

**SPLIT PATH if >400 LOC**: T-PR4-001..017 → PR4a (panel + states + toggle). T-PR4-009..014 → PR4b (copy + a11y). T-PR4-018..022 → PR4c (e2e + regression). STOP and request authorization first.

---

## 9. Cross-Repo Gates

- [ ] **G-1**: `/score` unchanged: `dotnet test --filter "FullyQualifiedName~ScoringEngine"` + response-shape contract test.
- [ ] **G-2**: `<FixList>` unchanged: `git diff components/analyzer/fix-list.tsx`.
- [ ] **G-3**: 009 auth-web e2e: `pnpm exec playwright test e2e/account-flow.spec.ts e2e/user-menu-pr8.spec.ts e2e/a11y-auth-pr8.spec.ts e2e/endpoint-drift.spec.ts`.
- [ ] **G-4**: 021 structured input e2e: `pnpm exec playwright test e2e/landing.spec.ts e2e/import*.spec.ts` if present.
- [ ] **G-5**: No real provider in CI: grep `provider.*=.*['"](ollama|anthropic|openai|minimax)['"]` in tests → 0 hits.
- [ ] **G-6**: No client-side secrets: grep `NEXT_PUBLIC_LLM` → 0 hits.
- [ ] **G-7**: `LlmFeedback:Enabled=false` default disables endpoint + UI.
- [ ] **G-8**: Fake provider works offline; disable network in test if feasible.
- [ ] **G-9**: Domain purity: `dotnet list src/BuildCv.Domain package references` → 0 external packages.
- [ ] **G-10**: Endpoint drift gate: `node scripts/check-endpoint-drift.mjs` → PASS.

---

## 10. Verification Commands

### BuildCv-api

- `dotnet format --verify-no-changes`
- `dotnet build BuildCv.slnx -c Release`
- `dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~PiiRedactor|FullyQualifiedName~FakeLlm"`
- `dotnet test --filter "FullyQualifiedName~ScoringEngine"`
- `dotnet test --filter "FullyQualifiedName~Adapt"`
- `dotnet list src/BuildCv.Domain package references`

### BuildCv-api defensive greps

- `NEXT_PUBLIC_LLM` → 0 hits
- `LLM_API_KEY` in responses/logs → 0 hits
- `LogInformation.*Cv.*[^L]` raw CV logs → 0 hits
- `LogInformation.*Job.*[^L]` raw job logs → 0 hits
- `tool_use|function_call` in `ILlmFeedbackClient` → 0 hits
- `provider.*=.*['"](ollama|anthropic)['"]` in test files → 0 hits
- `ApiKey\s*=\s*"[^"]+"` → 0 hits
- `pragma warning disable|Skip|Fact\(.*Skip` → 0 new hits

### BuildCv-web

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm typecheck`
- `pnpm exec vitest run lib/api/llm components/analyzer/llm-feedback-panel`
- `pnpm exec playwright test e2e/llm-feedback-pr4.spec.ts`
- `pnpm exec playwright test e2e/account-flow.spec.ts e2e/user-menu-pr8.spec.ts e2e/a11y-auth-pr8.spec.ts e2e/endpoint-drift.spec.ts`
- `pnpm exec playwright test e2e/landing.spec.ts`
- `node scripts/check-endpoint-drift.mjs`

### BuildCv-web defensive greps

- `NEXT_PUBLIC_LLM` → 0 hits
- `LLM_API_KEY` → 0 hits
- `console.log.*cv\.|console.log.*\.cv\b` → 0 hits
- `console.log.*job\.|console.log.*\.job\b` → 0 hits
- `provider.*=.*['"](ollama|anthropic)['"]` in tests → 0 hits
- `@ts-ignore` → 0 hits
- `eslint-disable` → 0 hits

---

## 11. Rollback Plan

- **PR1**: `git revert -m 1 <merge-sha>` or `git reset --hard <previous-commit>` on api/main if not pushed/shared.
- **PR2**: depends on PR1; revert PR2 first, then PR1 only if the foundation is also unsafe.
- **PR3**: revert merge on web/main; BFF removal leaves API intact.
- **PR4**: depends on PR3; revert PR4 first, then PR3 only if adapter/BFF must also be removed.

Operational kill switch without rollback: `LlmFeedback:Enabled=false` disables endpoint + UI immediately; `LlmFeedback:Provider=fake` prevents real provider use. Feature branches remain after merge per project convention.

---

## 12. Traceability Matrix

| Task ID | Description | REQ | NFR | Compliance | PR | Repo | Test | Risk |
|---|---|---|---|---|---|---|---|---|
| T-PR1-001 | `LlmFeedbackRequest` contract | REQ-LLM-004 | NFR-CONFIG-01 | CR-CONST-VI | PR1 | api | unit | contract drift |
| T-PR1-002 | `LlmFeedbackResponse` 10 fields | REQ-LLM-004 | NFR-CONFIG-01 | CR-NO-3P-CONTENT | PR1 | api | unit | contract drift |
| T-PR1-005 | Options/default binding | REQ-LLM-001/003 | NFR-CONFIG-01 | CR-NO-SECRETS | PR1 | api | unit | config leak |
| T-PR1-006 | Fake provider offline | REQ-LLM-002 | NFR-OFFLINE-01 | CR-NO-SECRETS | PR1 | api | unit | offline failure |
| T-PR1-007 | Marker-aware output | REQ-LLM-006 | NFR-DET-01 | CR-MARKERS | PR1 | api | unit | UI confusion |
| T-PR1-012 | Domain purity | REQ-LLM-020 | NFR-TEST-01 | CR-CONST-VI | PR1 | api | gate | coupling |
| T-PR2-001 | Email redaction | REQ-LLM-017 | NFR-PRIV-01 | CR-CONST-III | PR2 | api | unit | PII leak |
| T-PR2-002 | Phone redaction | REQ-LLM-017 | NFR-PRIV-01 | CR-CONST-III | PR2 | api | unit | PII leak |
| T-PR2-003 | URL redaction | REQ-LLM-017 | NFR-PRIV-01 | CR-CONST-III | PR2 | api | unit | PII leak |
| T-PR2-006 | Redaction failure blocks raw send | REQ-LLM-017 | NFR-SEC-01 | CR-CONST-III | PR2 | api | unit | PII leak |
| T-PR2-007 | POST `/api/v1/llm/feedback` | REQ-LLM-007 | NFR-RES-01 | CR-CONST-VI | PR2 | api | integration | score regression |
| T-PR2-009 | Disabled endpoint 403 | REQ-LLM-001 | NFR-CONFIG-01 | CR-NO-SECRETS | PR2 | api | unit | config leak |
| T-PR2-012 | Rate limit 429 | REQ-LLM-014 | NFR-RATE-01 | CR-NO-SECRETS | PR2 | api | unit | abuse |
| T-PR2-014 | Timeout degraded | REQ-LLM-015 | NFR-RES-01 | CR-NO-3P-CONTENT | PR2 | api | unit | timeout |
| T-PR2-015 | Provider fallback | REQ-LLM-016 | NFR-RES-01 | CR-CONST-VI | PR2 | api | unit | outage |
| T-PR2-017 | Sanitized request logs | REQ-LLM-019 | NFR-OBS-01 | CR-CONST-III | PR2 | api | unit | secret leak |
| T-PR2-020 | Prompt DATA rule | REQ-LLM-018 | NFR-SEC-01 | CR-CONST-V | PR2 | api | unit | injection |
| T-PR2-023 | ScoringEngine regression | REQ-LLM-005 | NFR-DET-01 | CR-CONST-II | PR2 | api | regression | score regression |
| T-PR3-001 | Adapter success state | REQ-LLM-011 | NFR-OBS-01 | CR-CONST-VI | PR3 | web | unit | UX gap |
| T-PR3-002 | Adapter error mapping | REQ-LLM-013/015 | NFR-RES-01 | CR-NO-SECRETS | PR3 | web | unit | UX gap |
| T-PR3-005 | BFF route runtime=nodejs | REQ-LLM-008 | NFR-CONFIG-01 | CR-NO-SECRETS | PR3 | web | unit | secret leak |
| T-PR3-009 | BFF no secrets exposed | REQ-LLM-008 | NFR-SEC-01 | CR-NO-SECRETS | PR3 | web | unit | secret leak |
| T-PR3-011 | Endpoint drift gate | REQ-LLM-020 | NFR-TEST-01 | CR-CONST-VI | PR3 | web | gate | drift |
| T-PR4-001 | Session toggle | REQ-LLM-010 | NFR-CONFIG-01 | CR-NO-SECRETS | PR4 | web | unit | preference |
| T-PR4-003 | Panel disabled state | REQ-LLM-012 | NFR-A11Y-01 | CR-NO-SECRETS | PR4 | web | unit | UX gap |
| T-PR4-005 | Loading state | REQ-LLM-011 | NFR-A11Y-01 | CR-CONST-VI | PR4 | web | unit | UX gap |
| T-PR4-006 | Success state | REQ-LLM-009/011 | NFR-A11Y-01 | CR-CONST-VI | PR4 | web | unit | UX gap |
| T-PR4-007 | Degraded state | REQ-LLM-013/016 | NFR-RES-01 | CR-NO-3P-CONTENT | PR4 | web | unit | UX gap |
| T-PR4-009 | Region/aria-label | REQ-LLM-013 | NFR-A11Y-01 | CR-NO-SECRETS | PR4 | web | a11y | UX gap |
| T-PR4-012 | Centralized copy | REQ-LLM-012/013 | NFR-A11Y-01 | CR-CONST-II | PR4 | web | unit | UI confusion |
| T-PR4-015 | Integrate in `/analizar` | REQ-LLM-009 | NFR-DET-01 | CR-MARKERS | PR4 | web | e2e | UI confusion |
| T-PR4-016 | FixList unchanged | REQ-LLM-005/009 | NFR-DET-01 | CR-CONST-II | PR4 | web | gate | score confusion |
| T-PR4-018 | Fake success E2E | REQ-LLM-002/011 | NFR-OFFLINE-01 | CR-NO-3P-CONTENT | PR4 | web | e2e | offline failure |
| T-PR4-021 | 009 auth-web regression | REQ-LLM-021 | NFR-DET-01 | CR-CONST-IX | PR4 | web | e2e | regression |
| T-PR4-022 | 021 structured input regression | REQ-LLM-022 | NFR-DET-01 | CR-MARKERS | PR4 | web | e2e | regression |

---

## 13. Risks & Mitigations

| Risk | Likelihood | Mitigation (tasks) |
|---|---|---|
| PII leak | Med | T-PR2-001..006 redaction + failure block |
| Prompt injection | Med | T-PR2-020 DATA rule + T-PR2-022 no tools |
| Score regression | Low | T-PR2-023 Art. II regression tests + T-PR4-016 FixList unchanged |
| Abuse | Med | T-PR2-012..013 dedicated rate limit |
| Timeout | Med | T-PR2-014 cancellation + degraded response |
| Contract drift | Low | T-PR1-002 schema + T-PR3-011 endpoint drift gate |
| Secret leak | Low | T-PR3-009 + defensive greps |
| Offline failure | Low | T-PR1-006 fake no IO/API key |
| UI confusion | Med | T-PR4-012..016 separate panel + disclaimer + FixList unchanged |

---

## 14. Deferred Items

- `023-ollama-real-provider`: PR5 Ollama adapter + PR6 verify.
- Multi-provider feedback: Anthropic, OpenAI, Minimax.
- External billing/cost credits.
- Persistent user LLM preference.
- Advanced prompt-injection adversarial suite.
- Production deploy smoke.
- 009 PR3 `/privacidad`.
- 009 PR5 consent UI.

---

## 15. Ready for Apply Checklist

- [ ] Tasks PR1-4 complete: T-PR1-001..021, T-PR2-001..031, T-PR3-001..018, T-PR4-001..028.
- [ ] LOC forecasts explicit per PR.
- [ ] Tests forecasts explicit per PR: unit, integration, e2e, a11y, regression.
- [ ] Verification commands clear for API + Web.
- [ ] Split paths documented: PR2 → PR2a/PR2b; PR4 → PR4a/PR4b/PR4c.
- [ ] Branch strategy explicit with base branches.
- [ ] Traceability matrix covers 22 REQs + 10 NFRs + 9 compliance requirements through task rows/gates.
- [ ] 0 Open Questions.
- [ ] 0 implementation done.

If all checked: Ready for `sdd-apply` PR1 (`feature/022-llm-local-pr1-api-fake-provider`).
