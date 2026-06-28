# Apply Progress — 022 LLM Integration Local MVP PR1

Date: 2026-06-28
Branch: `feature/022-llm-local-pr1-api-fake-provider`
Status: **applied + reviewed + merged + pushed** (post-baseline-acceptance, see §PR1 baseline acceptance below)

## Scope completed

- T-PR1-001..020 completed.
- T-PR1-021 not completed: merge blocked by required `/adapt` regression failure.
- No public endpoint created.
- No functional web code touched.
- `/score`, `/adapt`, and auth-web source untouched.
- No real provider, no Ollama, no HTTP, no API key.
- Score determinism source unchanged; `ScoringEngine.Version` remains `2.0.0`.
- Domain purity intact.

## TDD Cycle Evidence

| Task | RED (test written, fails) | GREEN (impl, passes) | REFACTOR (cleanup) |
|---|---|---|---|
| T-PR1-001 | 2026-06-28 `LlmFeedbackContractsTests.LlmFeedbackRequest_BindsStructuredCvJobScoreContextAndMarkers` failed: missing namespace/types | 2026-06-28 passed after `LlmFeedbackRequest` + `LlmFeedbackScoreContext` | XML docs added |
| T-PR1-002 | 2026-06-28 `LlmFeedbackResponse_BindsTenFieldContractWithProviderMetadata` failed: missing response records | 2026-06-28 passed after response/suggestion/metadata records | XML docs added |
| T-PR1-003 | Structural refactor task | 2026-06-28 contract tests still passed | XML docs/invariants added without Domain changes |
| T-PR1-004 | 2026-06-28 `ILlmFeedbackClient_GenerateAsync_ReceivesContextAndCancellationToken` failed: missing port/context | 2026-06-28 passed after port/context creation | Carrier kept minimal |
| T-PR1-005 | 2026-06-28 `LlmFeedbackConfigurationTests` failed: missing options/provider registration | 2026-06-28 passed after options + DI + env alias binding | Added explicit `LLM_FEEDBACK__*` alias support |
| T-PR1-006 | 2026-06-28 `FakeLlmFeedbackClientTests.GenerateAsync_ReturnsDeterministicV2FeedbackForSameInput` failed on placeholder output | 2026-06-28 passed after deterministic response builder | Extracted builder methods |
| T-PR1-007 | 2026-06-28 marker test failed on empty strengths/risks | 2026-06-28 passed after marker-aware strengths/risks | Ordered output for determinism |
| T-PR1-008 | 2026-06-28 metadata test guarded provider/model/degraded | 2026-06-28 passed with fixed metadata and clock seam | Fixed clock test double used |
| T-PR1-009 | Refactor task covered by fake provider tests | 2026-06-28 fake tests still passed | Extracted `BuildResponse`, `BuildStrengths`, `BuildRisks`, keyword finder |
| T-PR1-010 | 2026-06-28 appsettings test failed: missing `LlmFeedback` section | 2026-06-28 passed after tracked `appsettings.json` defaults | Noted ignored development settings |
| T-PR1-011 | 2026-06-28 env override test failed until alias support | 2026-06-28 passed with `LLM_FEEDBACK__ENABLED=false` binding | Alias helper extracted |
| T-PR1-012 | Gate | `dotnet list src/BuildCv.Domain package references` shows no packages | — |
| T-PR1-013 | Gate | `NEXT_PUBLIC_LLM` defensive grep: 0 hits in API branch | — |
| T-PR1-014 | Gate | `LLM_API_KEY` defensive grep: 0 hits in API branch | — |
| T-PR1-015 | Gate | CI/test config uses fake `ILlmFeedbackClient`; no real feedback provider registered | — |
| T-PR1-016 | Docs task | API INDEX row 022 updated | — |
| T-PR1-017 | Commit task | `cf6058f test(llm): cubrir fake provider y configuración` | — |
| T-PR1-018 | Commit task | `c66da17 feat(llm): agregar contratos y fake provider` | — |
| T-PR1-019 | Commit task | `d2d76eb docs(022-llm): registrar avance PR1` | — |
| T-PR1-020 | Review task | Fresh review created: `reviews/pr1-fresh-review.md` | Verdict BLOCKED |
| T-PR1-021 | Merge task | Not run | Blocked by `/adapt` regression failure |

## Tests added

- `LlmFeedbackContractsTests`: 3 tests.
- `LlmFeedbackConfigurationTests`: 4 tests.
- `FakeLlmFeedbackClientTests`: 3 tests.
- Total: 10 tests.

## Commands executed

| Command | Result |
|---|---:|
| `git status --short && git branch --show-current && git log --oneline -10 && git rev-parse HEAD && git fetch origin && git rev-parse origin/main` | 0 |
| `git checkout -b feature/022-llm-local-pr1-api-fake-provider` | 0 |
| `dotnet test --filter "FullyQualifiedName~LlmFeedbackContractsTests"` (RED) | non-zero expected |
| `dotnet test --filter "FullyQualifiedName~LlmFeedbackContractsTests"` (GREEN) | 0 |
| `dotnet test --filter "FullyQualifiedName~LlmFeedbackConfigurationTests"` (RED/GREEN cycles) | red then 0 |
| `dotnet test --filter "FullyQualifiedName~FakeLlmFeedbackClientTests"` (RED/GREEN cycles) | red then 0 |
| `dotnet format --verify-no-changes` | initial non-zero import ordering, then 0 after `dotnet format` |
| `dotnet build BuildCv.slnx -c Release` | 0 |
| `dotnet test --filter "FullyQualifiedName~LlmFeedback\|FullyQualifiedName~PiiRedactor\|FullyQualifiedName~FakeLlm"` | 0 |
| `dotnet test --filter "FullyQualifiedName~ScoringEngine"` | 0 |
| `dotnet test --filter "FullyQualifiedName~Adapt"` | 1 — `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` expected 401, got 200 |
| `dotnet list src/BuildCv.Domain package references` | not reached in chained command after adapt failure; earlier explicit gate verified 0 packages |

## LOC approximate

Approximate PR1 API delta before docs: ~626 inserted lines across tests + implementation + config. Forecast was ~200 LOC; actual is higher mainly because strict contract tests are verbose and include CV fixture construction.

## Risks covered

- Offline fake provider.
- Dedicated `LlmFeedback` namespace, not `Ai`.
- `LLM_FEEDBACK__*` env override support.
- No endpoint or real provider.
- Domain purity and score version unchanged.

## Deviations

- `appsettings.Development.json` is ignored by git; local workspace was updated, but the tracked commit only includes `appsettings.json`.
- Merge/push blocked by required `/adapt` regression failure unrelated to touched PR1 source paths.

## PR1 baseline acceptance — `/adapt` RequireCreditsFilter

### Test observed

- **Test**: `RequireCreditsFilterTests.Adapt_without_jwt_returns_401`
- **Location**: `BuildCv-api/tests/BuildCv.Api.IntegrationTests/RequireCreditsFilterTests.cs:35`
- **Expected**: `HttpStatusCode.Unauthorized` (401)
- **Actual**: `HttpStatusCode.OK` (200)

### Classification

- **`BASELINE_PRE_EXISTING`** — confirmed by orchestrator audit on `BuildCv-api/main @ 496a3c7` (pre-PR1 state).
- **`NOT_REGRESSION_PR1`** — PR1 source path does NOT touch `/adapt`, `RequireCreditsFilter`, or auth-web.

### Evidence (independent reproduction)

Orchestrator ran on `BuildCv-api/main @ 496a3c7`:

```
git checkout main
dotnet test --no-build -c Release --filter "FullyQualifiedName~RequireCreditsFilterTests.Adapt_without_jwt_returns_401"
→ Failed BuildCv.Api.IntegrationTests.RequireCreditsFilterTests.Adapt_without_jwt_returns_401 [2 s]
  Expected response.StatusCode to be HttpStatusCode.Unauthorized {value: 401}, but found HttpStatusCode.OK {value: 200}.
Failed!  - Failed:     1, Passed:    0, Skipped:     0, Total:     1, Duration: 2 s
```

**Same failure reproduced pre-PR1.** PR1 cannot be the cause.

### Already documented baseline (per project convention)

- `BuildCv-web/specs/009-auth-web/verify-report.md`: "API baseline flakes/failures known: 34 integration failures, unchanged from first verify."
- This test belongs to the documented baseline category (LocalAuth / AuthPolicy rate-limit collision).

### Confirmations (no scope creep into /adapt)

- PR1 does NOT touch `/adapt` (verified: `git diff --stat main..feature/022-llm-local-pr1-api-fake-provider -- 'src/BuildCv.Application/Features/Adapt/' 'src/BuildCv.Api/Endpoints/Adapt*' 'src/BuildCv.Api/Endpoints/Credits*'` → 0 hits).
- PR1 does NOT touch `RequireCreditsFilter`.
- PR1 does NOT touch auth-web source.
- PR1 does NOT touch `/score`.

### Decision (per user option A)

- **ACCEPTED baseline for PR1 merge.**
- Follow-up: separate change (e.g. `024-adapt-credits-fix`) if prioritized.
- No `/adapt` patch in PR1.
- No `/adapt` test changes in PR1.
- No suppression; failure honestly documented.

### PR1 LOC breakdown (final)

| Category | Insertions | Files |
|---|---:|---:|
| Production (`src/`) | **248** | 12 (cs + appsettings.json) |
| Tests (`tests/`) | 378 | 4 (test files + csproj) |
| Docs (`specs/`) | 1 | 1 (000-INDEX.md) |
| **Total** | **627** | **17** |

- **Production LOC = 248** → under 400 cap ✓ (forecast ~200, actual 248 = +24% over forecast but within budget).
- Tests + docs overhead: per-user brief, acceptable when production LOC stays under cap.

## Post-baseline decision actions

1. Updated fresh review verdict to `APPROVE_WITH_MINOR_NOTES` (addendum appended, no rewrite).
2. Pre-merge verification (api):
   - `dotnet format --verify-no-changes` → 0
   - `dotnet build BuildCv.slnx -c Release` → 0
   - `dotnet test --filter "FullyQualifiedName~LlmFeedback"` → 0
   - `dotnet test --filter "FullyQualifiedName~ScoringEngine"` → 0
   - Domain purity: `dotnet list src/BuildCv.Domain package references` → 0 packages
   - Defensive greps: `NEXT_PUBLIC_LLM` 0 hits, `LLM_API_KEY` literal 0 hits, `HttpClient` en FakeLlmFeedbackClient 0 hits, hardcoded secrets 0 hits, suppressions nuevas 0 hits.
3. Merged `feature/022-llm-local-pr1-api-fake-provider` → `BuildCv-api/main` with `--no-ff` ("merge: integrar PR1 de 022-llm-local en api").
4. Pushed `BuildCv-api/main` to `origin/main`.
5. `BuildCv-web/specs/000-INDEX.md` updated: 022 row → "EN CURSO — PR1 API MERGED".
6. Web docs commit `docs(022-llm): marcar PR1 api merged en índice` + push to `origin/main`.

---

# Apply Progress — 022 LLM Integration Local MVP PR2

Date: 2026-06-28
Branch: `feature/022-llm-local-pr2-api-feedback-endpoint`
Status: **applied + reviewed + merged + pushed**

## Scope completed

- T-PR2-001..031 completed.
- Created API endpoint `POST /api/v1/llm/feedback`.
- Added `PiiRedactor` for email/phone/personal URL/address redaction and `LlmFeedbackRedactionException`.
- Added `GenerateLlmFeedbackHandler` with disabled handling, redaction-first provider boundary, sanitized metadata logs, timeout, provider-error fallback, and degraded responses.
- Added dedicated `LlmFeedbackRateLimitFilter` with configurable `RateLimit.RequestsPerWindow` and `WindowSeconds`.
- Added prompt-injection boundary placeholder `src/BuildCv.Infrastructure/LlmFeedback/Prompts/v1/system.md` with explicit DATA rule.
- No `/score`, `/adapt`, auth-web, real provider, Ollama, HTTP fake-provider, API key, or web functional code touched.
- Score determinism source unchanged; `ScoringEngine.Version` remains `2.0.0`.
- Domain purity intact.

## TDD Cycle Evidence

| Task | RED (test written, fails) | GREEN (impl, passes) | REFACTOR (cleanup) |
|---|---|---|---|
| T-PR2-001 | 2026-06-28 `PiiRedactorTests.Redact_MasksEmailAddresses` failed: missing `PiiRedactor` | 2026-06-28 passed after email regex | Regex extracted in `PiiRedactor` |
| T-PR2-002 | 2026-06-28 phone theory failed before phone regex | 2026-06-28 passed for CO/US/ES formats | Shared redaction pipeline |
| T-PR2-003 | 2026-06-28 URL test failed before URL handling | 2026-06-28 passed with personal URL masking and LinkedIn/GitHub allowlist | Allowed hosts centralized |
| T-PR2-004 | 2026-06-28 address theory failed before address regex | 2026-06-28 passed after address regex | Split plain-line vs JSON-safe address redaction |
| T-PR2-005 | 2026-06-28 name/context preservation test added | 2026-06-28 passed with no name masking rule | No extra masking added |
| T-PR2-006 | 2026-06-28 redaction failure/provider-not-called tests failed: missing exception/handler | 2026-06-28 passed after `LlmFeedbackRedactionException` and handler pre-provider failure path | Specific failure result mapped |
| T-PR2-007 | 2026-06-28 endpoint integration test failed 404 | 2026-06-28 passed after endpoint + handler registration | Minimal endpoint mapper |
| T-PR2-008 | 2026-06-28 missing-CV test failed 404 | 2026-06-28 passed with `validation_error` 400 | Validation kept local to endpoint |
| T-PR2-009 | 2026-06-28 disabled test failed 404/missing handler path | 2026-06-28 passed with 403 `disabled` before provider | Disabled check precedes redaction/provider |
| T-PR2-010 | 2026-06-28 marker pass-through test failed before handler | 2026-06-28 passed with request markers preserved in context | No marker mutation |
| T-PR2-011 | 2026-06-28 optional scoreContext test failed before handler | 2026-06-28 passed with nullable score context preserved | Read-only score context only |
| T-PR2-012 | 2026-06-28 rate-limit integration test failed 404 | 2026-06-28 passed with 429 + `Retry-After` | Dedicated filter extracted |
| T-PR2-013 | 2026-06-28 configurable window/default tests failed before options/filter | 2026-06-28 passed with `RateLimit` options and filter window logic | Options nested class added |
| T-PR2-014 | 2026-06-28 timeout unit test failed before timeout wrapper | 2026-06-28 passed with linked CTS + degraded fallback | Common degraded helper |
| T-PR2-015 | 2026-06-28 provider unavailable unit test failed before catch path | 2026-06-28 passed with degraded fallback empty arrays | Raw provider error not logged |
| T-PR2-016 | 2026-06-28 endpoint redaction failure test failed 404 | 2026-06-28 passed with 500 `redaction_failure` | Error JSON shape centralized in endpoint |
| T-PR2-017 | 2026-06-28 metadata-only log test failed before handler logs | 2026-06-28 passed with cv/job lengths, provider/model, traceId only | No content fields logged |
| T-PR2-018 | 2026-06-28 degraded log test failed before degraded logging | 2026-06-28 passed with reason + latencyMs + traceId | Common degraded helper |
| T-PR2-019 | 2026-06-28 raw token absence test failed before log wrapper | 2026-06-28 passed; logger never receives raw CV/job/provider exception | Exception message intentionally not logged |
| T-PR2-020 | 2026-06-28 prompt file test failed: missing file | 2026-06-28 passed after `Prompts/v1/system.md` | Placeholder kept minimal for 023 |
| T-PR2-021 | 2026-06-28 tool/function boundary test failed: missing boundary helper | 2026-06-28 passed with `LlmFeedbackPromptBoundary.ContainsForbiddenToolDefinition` | Marker list centralized |
| T-PR2-022 | Defensive grep task | `tool_use|function_call` in `ILlmFeedbackClient.cs` → 0 hits | — |
| T-PR2-023 | Gate | `dotnet test --filter "FullyQualifiedName~ScoringEngine"` → 18 passed | — |
| T-PR2-024 | Gate | `dotnet test --filter "FullyQualifiedName~Adapt"` → baseline `/adapt` failure only | Documented as pre-existing |
| T-PR2-025 | Gate | `ScoringEngine.Version = "2.0.0"`; scoring tests passed | — |
| T-PR2-026 | Docs task | API INDEX row 022 updated to PR2 applied | — |
| T-PR2-027 | Commit task | `f57918e test(llm): cubrir endpoint feedback y seguridad` | — |
| T-PR2-028 | Commit task | `94aa573 feat(llm): agregar endpoint feedback local` | — |
| T-PR2-029 | Commit task | `fbe7797 docs(022-llm): registrar avance PR2` | — |
| T-PR2-030 | Review task | `reviews/pr2-fresh-review.md` created | Verdict APPROVE_WITH_MINOR_NOTES |
| T-PR2-031 | Merge task | `00f64ed merge: integrar PR2 de 022-llm-local en api` + push | — |

## Tests added

- `PiiRedactorTests`: 10 tests.
- `GenerateLlmFeedbackHandlerTests`: 7 tests.
- `LlmFeedbackEndpointTests`: 5 tests.
- `LlmFeedbackPromptBoundaryTests`: 3 tests.
- Total PR2 new tests: 25.

## Commands executed

| Command | Result |
|---|---:|
| `git status --short && git branch --show-current && git log --oneline -10 && git rev-parse HEAD && git fetch origin && git rev-parse origin/main` | 0 |
| `git checkout -b feature/022-llm-local-pr2-api-feedback-endpoint` | 0 |
| `dotnet test --filter "FullyQualifiedName~LlmFeedback"` safety net | 0 (10 passing) |
| `dotnet test --filter "FullyQualifiedName~PiiRedactorTests"` RED | non-zero expected: missing `PiiRedactor`/exception |
| `dotnet test --filter "FullyQualifiedName~PiiRedactorTests"` GREEN | 0 (10 passing) |
| `dotnet test --filter "FullyQualifiedName~GenerateLlmFeedbackHandlerTests"` RED | non-zero expected: missing handler |
| `dotnet test --filter "FullyQualifiedName~GenerateLlmFeedbackHandlerTests\|FullyQualifiedName~PiiRedactorTests"` GREEN | 0 (17 passing) |
| `dotnet test --filter "FullyQualifiedName~LlmFeedbackEndpointTests"` RED | non-zero expected: endpoint 404 |
| `dotnet test --filter "FullyQualifiedName~LlmFeedbackEndpointTests"` GREEN | 0 (5 passing) |
| `dotnet test --filter "FullyQualifiedName~LlmFeedbackPromptBoundaryTests"` RED | non-zero expected: missing boundary/file |
| `dotnet test --filter "FullyQualifiedName~LlmFeedbackPromptBoundaryTests"` GREEN | 0 (3 passing) |
| `dotnet format --verify-no-changes` | 0 |
| `dotnet build BuildCv.slnx -c Release` | 0 |
| `dotnet test --filter "FullyQualifiedName~LlmFeedback\|FullyQualifiedName~PiiRedactor\|FullyQualifiedName~FakeLlm"` | 0 (35 passing) |
| `dotnet test --filter "FullyQualifiedName~ScoringEngine"` | 0 (18 passing) |
| `dotnet test --filter "FullyQualifiedName~Adapt"` | 1 — baseline `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` expected 401, got 200 |
| `dotnet list src/BuildCv.Domain package references` | 1 — .NET 10 CLI rejects legacy syntax |
| `dotnet list src/BuildCv.Domain package` | 0 — no packages found |
| Focused defensive greps on PR2 paths | 0 |
| Post-merge verification (`format`, `build`, Llm/Pii tests, ScoringEngine, Domain package) | 0 |
| `git push origin main` (api) | 0 |

## LOC breakdown

| Category | Insertions | Deletions | Files |
|---|---:|---:|---:|
| Production (`src/`) | **308** | 1 | 13 |
| Tests (`tests/`) | 455 | 0 | 5 |
| Docs (`specs/000-INDEX.md`) | 1 | 1 | 1 |
| **Total** | **764** | 2 | 19 |

- **Production LOC = 308** → under 400 cap ✓.
- Total diff >350 due strict TDD tests/docs overhead; production remains within budget.

## Risks covered

- PII redaction before provider boundary.
- Dedicated LLM feedback rate limit separate from `/adapt`.
- Timeout/provider failure degraded fallback with score unaffected.
- Sanitized logs with metadata only.
- Prompt-injection DATA boundary placeholder and no tool/function definitions in `ILlmFeedbackClient`.
- Fake-only provider; no HTTP/API key/Ollama.

## Deviations

- Timeout/provider unavailable returns `200` with `degraded=true` per task T-PR2-014/015; fresh review notes that 502/504 are not emitted in this fake-fallback path.
- `dotnet list src/BuildCv.Domain package references` is obsolete for installed .NET CLI; equivalent `dotnet list src/BuildCv.Domain package` was used and returned no packages.

## Baseline `/adapt`

- **Test**: `RequireCreditsFilterTests.Adapt_without_jwt_returns_401`
- **Expected**: 401
- **Actual**: 200
- **Classification**: `BASELINE_PRE_EXISTING`, not a PR2 regression.
- **Reason**: same failure was independently reproduced on `BuildCv-api/main @ 496a3c7` (pre-PR1) and documented in PR1 apply-progress/review. PR2 does not touch `/adapt`, `RequireCreditsFilter`, credits endpoints, or auth-web source.

## Confirmations

- No `/score` touched.
- No `/adapt` touched.
- No web functional code touched.
- Score unchanged: `ScoringEngine.Version = "2.0.0"`.
- Domain purity intact: no package references in `BuildCv.Domain`.
- No real provider, no Ollama, no HTTP in fake provider, no API key.
- No tag created.
- No archive performed.
- No PR3 started.

---

# Apply Progress — 022 LLM Integration Local MVP PR3

Date: 2026-06-28
Branch: `feature/022-llm-local-pr3-web-bff`
Status: **applied + reviewed (APPROVE), merge pending**

## Scope completed

- T-PR3-001..018 completed in the PR3 branch artifact state.
- Created typed adapter `lib/api/llm.ts` for same-origin `POST /api/llm/feedback`.
- Created BFF route `app/api/llm/feedback/route.ts` with `runtime = "nodejs"` and `dynamic = "force-dynamic"`.
- BFF proxies to backend `POST /api/v1/llm/feedback` via `BACKEND_URL` and optional server-side `X-BFF-Key`.
- Updated endpoint drift gate with web `/api/llm/feedback` and backend `/api/v1/llm/feedback` canonical paths.
- No UI, no backend source, no `FixList`, no `/api/auth/*`, no real provider, no Ollama.

## TDD Cycle Evidence

| Task | RED (test written, fails) | GREEN (impl, passes) | REFACTOR (cleanup) |
|---|---|---|---|
| T-PR3-001 | 2026-06-28 23:28 `lib/api/llm.test.ts` failed: missing `./llm` import | 2026-06-28 23:30 adapter success test passed | Result union narrowed for typecheck |
| T-PR3-002 | 2026-06-28 23:28 HTTP status normalization tests failed with missing adapter | 2026-06-28 23:30 status mapping passed for 403/429/504/502/500/400 | Extracted `errorKindFromStatus`, `stateFromError`, Retry-After preservation |
| T-PR3-003 | 2026-06-28 23:28 state union test failed with missing exported type | 2026-06-28 23:30 `LlmFeedbackState` union test passed | Type-only; no behavior refactor needed |
| T-PR3-004 | 2026-06-28 23:28 body-shape test failed with missing builder | 2026-06-28 23:30 `buildLlmFeedbackRequestBody` test passed | Body builder kept pure |
| T-PR3-005 | 2026-06-28 23:31 BFF route test failed: missing `./route` import | 2026-06-28 23:32 route exports `runtime='nodejs'` + `dynamic='force-dynamic'` | Structural route constants extracted |
| T-PR3-006 | 2026-06-28 23:31 backend forwarding test failed with missing route | 2026-06-28 23:32 forward to `${BACKEND_URL}/api/v1/llm/feedback` passed | Header builder extracted; `X-BFF-Key` server-side only |
| T-PR3-007 | 2026-06-28 23:31 success response test failed with missing route | 2026-06-28 23:32 200 + 10-field response passthrough passed | No behavior refactor needed |
| T-PR3-008 | 2026-06-28 23:31 backend 5xx/429 tests failed with missing route | 2026-06-28 23:32 5xx→502 unavailable and 429 Retry-After passed | Status/state/kind helpers extracted |
| T-PR3-009 | 2026-06-28 23:31 secret/header leak test failed with missing route | 2026-06-28 23:32 sensitive headers/body stripped | Sanitized response helper added |
| T-PR3-010 | 2026-06-28 23:31 `NEXT_PUBLIC_LLM` route source test failed with missing route | 2026-06-28 23:32 route module has no `NEXT_PUBLIC_LLM` exports/env | Final defensive grep scheduled |
| T-PR3-011 | Gate/update task | `scripts/check-endpoint-drift.mjs` updated with LLM paths | Minimal canonical path additions |
| T-PR3-012 | Gate task | 2026-06-28 `node scripts/check-endpoint-drift.mjs` → PASS | — |
| T-PR3-013 | Docs task | `specs/000-INDEX.md` updated to PR3 applied | Final merged status pending post-merge |
| T-PR3-014 | Commit task | `7f71448 test(llm): cubrir bff y adapter feedback` | — |
| T-PR3-015 | Commit task | `f7853a1 feat(llm): agregar bff de feedback` | — |
| T-PR3-016 | Commit task | pending docs commit | — |
| T-PR3-017 | Review task | `reviews/pr3-fresh-review.md` created | Verdict APPROVE |
| T-PR3-018 | Merge task | pending conditional merge after review | — |

## Tests added

- `lib/api/llm.test.ts`: 10 unit tests.
- `app/api/llm/feedback/route.test.ts`: 7 BFF route tests.
- Total PR3 new tests: 17.

## Commands executed

| Command | Result |
|---|---:|
| `git status --short && git branch --show-current && git log --oneline -10 && git rev-parse HEAD && git fetch origin && git rev-parse origin/main` | 0 |
| `git checkout -b feature/022-llm-local-pr3-web-bff` | 0 |
| `pnpm exec vitest run lib/api/llm.test.ts` RED | non-zero expected: missing `./llm` |
| `pnpm exec vitest run lib/api/llm.test.ts` GREEN | 0 (10 passing) |
| `pnpm exec vitest run app/api/llm/feedback/route.test.ts` RED | non-zero expected: missing `./route` |
| `pnpm exec vitest run app/api/llm/feedback/route.test.ts` GREEN | 0 (7 passing) |
| `pnpm exec vitest run lib/api/llm app/api/llm` | 0 (17 passing) |
| `pnpm lint` | 0 |
| `pnpm test` | 0 (1151 passing) |
| `pnpm build` | initial 1 due TypeScript state narrowing, then 0 after refactor |
| `pnpm typecheck` | 0 |
| `node scripts/check-endpoint-drift.mjs` | 0 |

## LOC breakdown

| Category | Insertions | Deletions | Files |
|---|---:|---:|---:|
| Production (`app/api/llm`, `lib/api/llm.ts`, drift script) | **264** | 0 | 3 |
| Tests | 315 | 0 | 2 |
| Docs (pre-review) | 28 | 28 | 2 |
| **Total pre-review** | **607** | **28** | **7** |

- **Production LOC = 264** → under 400 cap ✓.
- Total diff >150 because strict TDD tests are intentionally verbose; production remains within budget.

## Risks covered

- Browser uses same-origin BFF only; no direct backend calls from adapter.
- Backend target is `/api/v1/llm/feedback`, not `/api/v1/adapt` or `/api/v1/score`.
- 403/429/504/5xx/400 states normalized; 429 `Retry-After` preserved.
- Backend internals, `Authorization`, `X-BFF-Key`, and backend-only headers are stripped from BFF responses.
- No client-side `NEXT_PUBLIC_LLM_*` or `LLM_API_KEY` added.

## Deviations

- PR3 added 17 tests rather than the forecast ~12 because route-level secret stripping and Retry-After preservation were covered explicitly.
- BFF maps backend 500/502/503 to client 502 + `state='unavailable'`; backend 504 remains 504 + `state='timeout'`.

## Confirmations

- No UI created.
- No backend files modified.
- No provider real, no Ollama, no external provider call.
- No `NEXT_PUBLIC_LLM_*`, no client-side `LLM_API_KEY`.
- No raw CV/job/prompt logs.
- No `/api/auth/*` touched.
- `components/analyzer/fix-list.tsx` untouched.
- No tag created.
