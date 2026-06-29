# Apply Progress — 024 MiniMax Real Provider PR1

Date: 2026-06-29  
Branch: `feature/024-minimax-pr1-api-client`  
Base commit: `BuildCv-api/main @ 1f74917`  
Status: **applied + reviewed + merged + pushed**

## Scope completed

- T-PR1-001..034 completed.
- Added `MinimaxLlmFeedbackClient` implementing `ILlmFeedbackClient`.
- Extended `LlmFeedbackOptions` with MiniMax `BaseUrl`, server-side `ApiKey`, `MaxInputLength`, and `MaxOutputTokens`.
- Added conditional DI for `Provider=minimax`; `Provider=fake` remains default.
- Updated `BuildCv-api/src/BuildCv.Api/appsettings.json` with safe MiniMax defaults and no `LlmFeedback:ApiKey` value.
- Added 22 new/expanded infrastructure tests for config, request shape, response parsing, errors, timeout, redacted payload, logs, and DI.
- No endpoint handler dispatch; no web functional code; no `/adapt`; no `/score`; no 009 auth-web; no real MiniMax calls.

## TDD Cycle Evidence

| Task | RED (test written, fails) | GREEN (impl, passes) | REFACTOR (cleanup) |
|---|---|---|---|
| T-PR1-001 | 2026-06-29 `LlmFeedbackConfigurationTests`/`MinimaxLlmFeedbackClientTests` referenced missing `BaseUrl`, `ApiKey`, `MaxInputLength`, `MaxOutputTokens` | 2026-06-29 options/config tests passed after `LlmFeedbackOptions` extension | Defaults centralized in options/appsettings |
| T-PR1-002 | 2026-06-29 env override assertions failed before canonical binding | 2026-06-29 env binding passed via standard `LlmFeedback__*` configuration | Kept existing `LLM_FEEDBACK__*` aliases |
| T-PR1-003 | 2026-06-29 provider-selection tests failed before `minimax` branch | 2026-06-29 provider tests passed for fake/minimax/invalid | Validation helper extracted |
| T-PR1-004 | 2026-06-29 appsettings default test failed before new safe defaults | 2026-06-29 appsettings test passed; no `LlmFeedback:ApiKey` stored | Test reads tracked appsettings only |
| T-PR1-005 | 2026-06-29 missing-key fail-fast test failed before validation | 2026-06-29 sanitized startup failure passed | Error text contains no key value |
| T-PR1-006 | 2026-06-29 client tests failed: missing `MinimaxLlmFeedbackClient` | 2026-06-29 constructor + interface tests passed | Injected `HttpClient`, options, clock, logger |
| T-PR1-007 | 2026-06-29 request-shape test failed before client/request builder | 2026-06-29 body shape passed | DTOs kept text-only/minimal |
| T-PR1-008 | 2026-06-29 header assertions failed before request builder | 2026-06-29 `Content-Type`, `x-api-key`, `anthropic-version`, no Authorization passed | No header logging added |
| T-PR1-009 | 2026-06-29 over-limit test failed before max input guard | 2026-06-29 validation exception before HTTP passed | Guard runs before request construction |
| T-PR1-010 | 2026-06-29 `max_tokens` assertion failed before option wiring | 2026-06-29 request body used configured `MaxOutputTokens` | Kept request DTO explicit |
| T-PR1-011 | 2026-06-29 cancellation test failed before timeout mapping | 2026-06-29 `LlmFeedbackTimeoutException` test passed | Linked CTS used with configured timeout |
| T-PR1-012 | 2026-06-29 serializer test failed before DTO boundary existed | 2026-06-29 forbidden request keys absent | Parser checks forbidden block type without serializing request keys |
| T-PR1-013 | 2026-06-29 valid 200 response test failed before parser | 2026-06-29 10-field v2 mapping passed | Suggestion severity parser extracted |
| T-PR1-014 | 2026-06-29 malformed response theories failed before fallback parser | 2026-06-29 degraded fallback tests passed | Shared degraded response helper |
| T-PR1-015 | 2026-06-29 reasoning-block test failed before text-block selection | 2026-06-29 text-block-only parsing passed | Non-text blocks ignored unless forbidden |
| T-PR1-016 | 2026-06-29 401/403 tests failed before status mapping | 2026-06-29 unavailable exceptions passed with no key leak | Sanitized exception messages |
| T-PR1-017 | 2026-06-29 429 test failed before retry metadata | 2026-06-29 rate-limited exception preserved `Retry-After` | Typed exception carries `TimeSpan?` |
| T-PR1-018 | 2026-06-29 500-504 tests failed before status mapping | 2026-06-29 unavailable exception tests passed | Raw provider body not read/logged |
| T-PR1-019 | 2026-06-29 network exception test failed before catch path | 2026-06-29 sanitized unavailable exception passed | Raw exception message not exposed |
| T-PR1-020 | 2026-06-29 redacted payload test failed before request builder | 2026-06-29 captured HTTP body used `RedactedCvText`/`RedactedJobText` only | No raw CV/job fields serialized |
| T-PR1-021 | 2026-06-29 log-capture test failed before client logging | 2026-06-29 metadata-only log test passed | Logs include provider/model/length/latency only |
| T-PR1-022 | 2026-06-29 DI selection tests failed before minimax registration | 2026-06-29 fake/minimax DI tests passed | Typed `HttpClient` registration added |
| T-PR1-023 | Refactor task covered by green client tests | 2026-06-29 focused tests stayed green | Request/response helpers extracted inside client |
| T-PR1-024 | Gate | 2026-06-29 `dotnet list src/BuildCv.Domain package` → no packages | — |
| T-PR1-025 | Gate | 2026-06-29 focused grep `NEXT_PUBLIC_MINIMAX_API_KEY` → 0 hits | — |
| T-PR1-026 | Gate | 2026-06-29 focused grep `NEXT_PUBLIC_LLM_API_KEY` → 0 hits | — |
| T-PR1-027 | Gate | 2026-06-29 focused grep `LLM_API_KEY` in production paths → 0 hits | — |
| T-PR1-028 | Gate | 2026-06-29 focused grep secret-looking `sk-` in PR1 paths → 0 hits | — |
| T-PR1-029 | Docs task | 2026-06-29 API INDEX row 024 added as PR1 API APPLIED | — |
| T-PR1-030 | Commit task | `fca3de4 test(llm): cubrir cliente minimax y configuración` | — |
| T-PR1-031 | Commit task | `d81477b feat(llm): agregar cliente minimax de feedback` | — |
| T-PR1-032 | Commit task | `2e14848 chore(llm): defaults appsettings minimax` | — |
| T-PR1-033 | Review task | `reviews/pr1-fresh-review.md` created | Verdict `APPROVE_WITH_MINOR_NOTES` |
| T-PR1-034 | Merge task | `8b83cba merge: integrar PR1 de 024-minimax en api` + push | Post-merge gates passed |

## Tests added

- `MinimaxLlmFeedbackClientTests`: 14 tests.
- `LlmFeedbackConfigurationTests`: expanded from 4 to 12 tests (+8).
- Total PR1 added/expanded tests: 22.

## Commands executed

| Command | Result |
|---|---:|
| API preflight: status/branch/log/head/fetch/origin/tags | 0; clean main at `1f74917`; no 024 tags |
| `git checkout -b feature/024-minimax-pr1-api-client` | 0 |
| RED `dotnet test ... MinimaxLlmFeedbackClientTests` | non-zero expected: missing client/options/exceptions; later infra `/tmp` full was resolved by clearing temp cache |
| GREEN `dotnet test tests/BuildCv.Infrastructure.Tests/... MinimaxLlmFeedbackClientTests|LlmFeedbackConfigurationTests` | 0 (26 passed) |
| `dotnet format --verify-no-changes` | 0 |
| `dotnet build BuildCv.slnx -c Release` | 0 |
| `dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~Minimax"` | 0 (57 passed across matching projects) |
| `dotnet test --filter "FullyQualifiedName~ScoringEngine"` | 0 (18 passed) |
| `dotnet test --filter "FullyQualifiedName~Adapt"` | 1 — baseline `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` expected 401, got 200 |
| `dotnet test --filter "FullyQualifiedName~PiiRedactor"` | 0 (10 passed) |
| `dotnet list src/BuildCv.Domain package` | 0; no packages found |
| Focused defensive greps for PR1 paths | 0 forbidden hits |
| `git merge --no-ff feature/024-minimax-pr1-api-client` | 0; merge `8b83cba` |
| Post-merge `format`, `build`, Llm/Minimax tests, ScoringEngine, Domain package | 0 |
| `git push origin main` (api) | 0 |

## LOC breakdown

| Category | Insertions | Deletions | Files |
|---|---:|---:|---:|
| Production/config/API docs (`BuildCv-api/src` + `appsettings.json` + API INDEX) | **244** | 4 | 6 |
| Tests (`BuildCv-api/tests`) | 390 | 4 | 2 |
| Web SDD docs (`tasks.md`, review, apply-progress, INDEX) | pending final commit | pending | 4 |
| API total before web docs | **634** | **8** | **8** |

- Production LOC = 244 → under 400 cap ✓.
- Total diff exceeds the ~250 forecast due strict TDD tests and docs overhead; production remains under cap.

## Risks covered

- API key remains server-side and absent from tracked `LlmFeedback` config.
- No real provider calls in CI; tests use in-process `HttpMessageHandler` fakes.
- Request is Anthropic-compatible text-only and non-streaming.
- 401/403/429/5xx/network/timeout mappings are sanitized.
- PII-redacted context is the provider payload.
- Logs are metadata-only.
- Fake provider, score, Domain purity, `/adapt`, 009 auth-web, and web functional code are unchanged.

## Deviations

- `dotnet list src/BuildCv.Domain package references` is no longer accepted by the installed .NET CLI; equivalent `dotnet list src/BuildCv.Domain package` was used and returned no packages.
- `/adapt` filter test failure is pre-existing baseline from 022; not a PR1 regression.
- Broad repo greps still show historical `sk-` examples in docs and EF-generated migration suppressions; focused PR1 paths are clean.

## Confirmations

- NO provider real in CI: yes.
- NO secrets tracked: yes.
- NO web functional code touched: yes.
- 022 fake intact: yes.
- Score unchanged: yes (`ScoringEngine.Version = "2.0.0"`).
- Domain purity intact: yes.
- No `/adapt` source touched: yes.
- No tag created: yes.

## Next step

Recommended: `sdd-apply 024 PR2` for endpoint dispatch, max-input integration, provider error mapping at endpoint level, and integration tests.

---

# Apply Progress — 024 MiniMax Real Provider PR2

Date: 2026-06-29  
Branch: `feature/024-minimax-pr2-api-dispatch`  
Base commit: `BuildCv-api/main @ 8b83cbaad5e1d7738c12b01eb0b8adb1d54ed2d3`  
Status: **applied + reviewed + merged + pushed**

## Scope completed

- T-PR2-001..032 completed in implementation/review scope.
- Preserved fake provider endpoint behavior and existing 022 contract.
- Added handler max-input validation before provider invocation.
- Added explicit redaction toggle coverage.
- Mapped typed provider exceptions: validation → 400, unavailable → 502 sanitized, provider rate-limit → 429 with optional `Retry-After`.
- Preserved MiniMax provider metadata in degraded fallback instead of misleading `provider="fake"`.
- Added endpoint minimax contract tests with in-process fake `ILlmFeedbackClient`; no real provider calls.
- No web functional code, `/adapt`, `/score`, 009 auth-web, secrets, tags, or real MiniMax calls.

## TDD Cycle Evidence

| Task | RED (test written, fails) | GREEN (impl, passes) | REFACTOR (cleanup) |
|---|---|---|---|
| T-PR2-001 | 2026-06-29 existing fake endpoint contract protects provider=fake | 2026-06-29 `LlmFeedbackEndpointTests` passed with fake provider | Kept fake path unchanged |
| T-PR2-002 | 2026-06-29 endpoint minimax contract test added | 2026-06-29 minimax endpoint contract passed via in-process fake provider | No network seam added |
| T-PR2-003 | 2026-06-29 invalid provider remains covered by PR1 DI validation | 2026-06-29 Llm/Minimax suite green | No extra branch needed |
| T-PR2-004 | 2026-06-29 disabled path already asserted no provider call | 2026-06-29 handler tests green | Enabled check remains first |
| T-PR2-005 | 2026-06-29 unavailable provider test failed before typed mapping | 2026-06-29 sanitized 502 passed | Error body centralized |
| T-PR2-006 | 2026-06-29 max-input handler test failed before validation | 2026-06-29 validation 400 before provider passed | Uses redacted CV+job lengths |
| T-PR2-007 | 2026-06-29 PR1 `max_tokens` request test remained as safety net | 2026-06-29 Minimax tests green | No duplicate prod path |
| T-PR2-008 | 2026-06-29 redaction-disabled test added | 2026-06-29 raw serialized input passed only when config disables redaction | No default change |
| T-PR2-009 | 2026-06-29 endpoint minimax success test added | 2026-06-29 HTTP 200 + provider/model minimax passed | Contract DTO reused |
| T-PR2-010 | 2026-06-29 PR1 malformed response tests retained | 2026-06-29 Llm/Minimax suite green | No endpoint signature change |
| T-PR2-011 | 2026-06-29 sanitized unavailable test failed before mapping | 2026-06-29 502 body excludes key terms | Raw exception not exposed |
| T-PR2-012 | 2026-06-29 same unavailable mapping covers forbidden provider errors | 2026-06-29 Llm/Minimax suite green | — |
| T-PR2-013 | 2026-06-29 provider-rate-limit endpoint test added | 2026-06-29 HTTP 429 + Retry-After 42s passed | Header set only when metadata exists |
| T-PR2-014 | 2026-06-29 no-RetryAfter handler test added | 2026-06-29 429 with null retry metadata passed | Endpoint omits header when null |
| T-PR2-015 | 2026-06-29 PR1 5xx client tests retained | 2026-06-29 unavailable mapping and suite green | Sanitized detail reused |
| T-PR2-016 | Gate | 2026-06-29 fake endpoint contract green | — |
| T-PR2-017 | Gate | 2026-06-29 ScoringEngine tests: 18 passed | — |
| T-PR2-018 | Gate | 2026-06-29 Adapt test shows accepted baseline failure only | `/adapt` untouched |
| T-PR2-019 | Gate | 2026-06-29 022 v2 endpoint contract unchanged | — |
| T-PR2-020 | Gate | 009 auth-web not touched | — |
| T-PR2-021 | Gate | 021 structured input not touched; scoring regression green | — |
| T-PR2-022 | Refactor | 2026-06-29 typed mapping centralized in handler/result | Tests stayed green |
| T-PR2-023..028 | Defensive gates | 2026-06-29 focused PR2 paths clean; broad historical false positives documented | — |
| T-PR2-029 | Docs | API INDEX row updated to PR2 API APPLIED | — |
| T-PR2-030 | Commit | `0990a43 test(llm): cubrir dispatch minimax y errores provider` | — |
| T-PR2-031 | Commit | `6f0334e feat(llm): integrar provider minimax en feedback` | — |
| T-PR2-032 | Review + merge | `reviews/pr2-fresh-review.md` created; merge `98995c3` pushed to api/main | Verdict `APPROVE_WITH_MINOR_NOTES` |

## Tests added

- `GenerateLlmFeedbackHandlerTests`: +5 tests for max input, redaction toggle, 429 with/without retry metadata, and sanitized unavailable mapping.
- `LlmFeedbackEndpointTests`: +2 tests for minimax endpoint success and provider 429 `Retry-After` preservation.
- Total PR2 tests added: 7.

## Commands executed

| Command | Result |
|---|---:|
| API preflight status/checkout/log/head/fetch/origin/tags | 0; clean main at `8b83cba`; no 024 tags |
| `git checkout -b feature/024-minimax-pr2-api-dispatch` | 0 |
| RED `dotnet test --filter "FullyQualifiedName~GenerateLlmFeedbackHandlerTests"` | non-zero expected: missing `RetryAfter` result metadata |
| GREEN `dotnet test --filter "FullyQualifiedName~GenerateLlmFeedbackHandlerTests"` | 0 (12 passed) |
| RED/GREEN `dotnet test --filter "FullyQualifiedName~LlmFeedbackEndpointTests"` | initial rate-limit isolation failure, then 0 (7 passed) |
| `dotnet format --verify-no-changes` | 0 |
| `dotnet build BuildCv.slnx -c Release` | 0 |
| `dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~Minimax"` | 0 (64 passed across matching projects) |
| `dotnet test --filter "FullyQualifiedName~ScoringEngine"` | 0 (18 passed) |
| `dotnet test --filter "FullyQualifiedName~Adapt"` | 1 — accepted baseline `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` expected 401, actual 200 |
| `dotnet test --filter "FullyQualifiedName~PiiRedactor"` | 0 (10 passed) |
| `dotnet list src/BuildCv.Domain package` | 0; no packages found |
| `git merge --no-ff feature/024-minimax-pr2-api-dispatch -m "merge: integrar PR2 de 024-minimax en api"` | 0; merge `98995c3` |
| Post-merge `format`, `build`, Llm/Minimax tests, ScoringEngine, Domain package | 0 |
| Post-merge `dotnet test --filter "FullyQualifiedName~Adapt"` | 1 — same accepted baseline failure |
| Post-merge `dotnet test --filter "FullyQualifiedName~PiiRedactor"` | 0 |
| `git push origin main` (api) | 0 |

## LOC breakdown

| Category | Insertions | Deletions | Files |
|---|---:|---:|---:|
| Production/API docs (`src/` + API INDEX) | **35** | 4 | 5 |
| Tests (`tests/`) | 159 | 3 | 2 |
| Web SDD docs (`tasks.md`, review, apply-progress, INDEX) | pending final docs commit | pending | 4 |

- Production LOC = 35 → under 400 cap ✓.

## Baseline `/adapt`

- **Test**: `RequireCreditsFilterTests.Adapt_without_jwt_returns_401`
- **Expected**: 401
- **Actual**: 200
- **Classification**: `BASELINE_PRE_EXISTING`, not PR2 regression.
- **Reason**: documented and accepted since 022; PR2 did not touch `/adapt`, credits filters, or auth-web source.

## Deviations

- Provider 429 is now an explicit HTTP 429 instead of degraded 200, matching PR2 lock and design matrix.
- `dotnet list src/BuildCv.Domain package references` remains unsupported by installed .NET CLI; equivalent `dotnet list src/BuildCv.Domain package` was used.
- Broad greps still show historical non-PR2 matches outside feedback PR2 paths; focused PR2 paths are clean.

## Confirmations

- Provider=minimax dispatch: yes.
- Provider=fake intact: yes.
- MaxInputLength: yes.
- MaxOutputTokens: yes, retained in PR1 request test.
- Provider error mapping: yes.
- No provider real in CI: yes.
- No API key real: yes.
- No secrets tracked: yes.
- No `NEXT_PUBLIC_*`: yes.
- No stream/tool_use/thinking request fields: yes.
- PII redacted by default: yes.
- Logs sanitized: yes.
- Score unchanged: yes (`ScoringEngine.Version = "2.0.0"`).
- `/adapt` untouched: yes.
- Domain purity intact: yes.
- No web functional code touched: yes.
- No tag created: yes.

## Next step

Recommended: evaluate optional PR3 web drift, or proceed directly to `sdd-verify 024` if no web contract drift is found.
