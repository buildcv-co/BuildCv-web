# Verification Report — 022 LLM Integration Local MVP

## 1. Summary

| Field | Value |
|---|---|
| Change | `022-llm-integration-local-mvp` |
| Mode | Standard verify. Strict TDD was active during apply; verify is post-apply standard evidence. |
| BuildCv-web SHIP | `824df2b` — post-PR4 INDEX update |
| BuildCv-api SHIP | `00f64ed` — post-PR2 merge |
| Verdict | `PASS_WITH_NOTES` |
| Ready for archive | yes |
| Ready for tag | yes, after archive; tag must target SHIP commits, not archive commit |

Rationale: all 22 REQs, 10 NFRs, 9 compliance requirements, 32 acceptance criteria, and 9 tracked risks are covered by source inspection, passing tests, runtime smoke, and defensive greps. Notes are limited to accepted baseline `/adapt`, broad-grep false positives outside 022 paths, PR size deviations already accepted, and a non-blocking stale API INDEX status line that archive sync can correct.

## 2. Scope Verified

- 4 cross-repo PRs verified as merged and pushed.
- PR1 API: contracts, `LlmFeedbackOptions`, `ILlmFeedbackClient`, `FakeLlmFeedbackClient`, disabled fake defaults.
- PR2 API: `POST /api/v1/llm/feedback`, PII redaction, metadata-only logs, dedicated rate limit, timeout/provider degraded fallback.
- PR3 Web: BFF `POST /api/llm/feedback`, typed adapter, state normalization, server-side `X-BFF-Key` only.
- PR4 Web: analyzer panel, sessionStorage toggle, 9 states, a11y basics, fake E2E.
- Explicit non-scope confirmed untouched: score formula, `/adapt` functional source, `/api/auth/*`, `/cuenta`, real providers, Ollama, payments/credits UX, deployment/tag/archive.

## 3. Command Evidence

| Repo | Command | Exit | Result |
|---|---|---:|---|
| api | `git status --short && git rev-parse --short HEAD` | 0 | clean; HEAD `00f64ed` |
| web | `git status --short && git rev-parse --short HEAD` | 0 | clean before report; HEAD `824df2b` |
| api | `dotnet format --verify-no-changes` | 0 | formatting clean |
| api | `dotnet build BuildCv.slnx -c Release` | 0 | 0 warnings, 0 errors |
| api | `dotnet test --filter "LlmFeedback\|PiiRedactor\|FakeLlm"` | 0 | 35 passed: 10 infra + 20 application + 5 integration; domain had no matching tests |
| api | `dotnet test --filter "ScoringEngine"` | 0 | 18 passed; Art. II preserved |
| api | `dotnet list src/BuildCv.Domain package` | 0 | no packages found |
| api | runtime `dotnet run --project src/BuildCv.Api --urls "http://localhost:5080"` with `LlmFeedback__Enabled=true`, provider fake | 0 startup after clearing stale process | API live on `:5080` |
| api | `curl POST /api/v1/llm/feedback` valid v2 body | 0 | 200; 10 fields; `provider=fake`, `model=fake-local-v1`, `degraded=false` |
| api | `curl POST /api/v1/llm/feedback` missing cv | 0 | 400 `validation_error` |
| api | 31 rapid `curl POST /api/v1/llm/feedback` | 0 | at least one 429; `Retry-After: 60` |
| api | restart with `LlmFeedback__Enabled=false`; `curl POST /api/v1/llm/feedback` | 0 | 403 `disabled` |
| web | `pnpm lint` | 0 | ESLint clean |
| web | `pnpm test` | 0 | 123 files, 1162/1162 passed |
| web | `pnpm build` | 0 | Next.js 16.2.7 production build passed; `/api/llm/feedback` dynamic route present |
| web | `pnpm typecheck` | 0 | TypeScript strict passed |
| web | `node scripts/check-endpoint-drift.mjs` | 0 | Web forbidden/canonical and backend canonical PASS |
| web | `pnpm exec playwright test e2e/llm-feedback-pr4.spec.ts` | 0 | 3 passed |
| web | `pnpm exec playwright test e2e/account-flow.spec.ts e2e/user-menu-pr8.spec.ts e2e/a11y-auth-pr8.spec.ts e2e/endpoint-drift.spec.ts` | 0 | 11 passed, 5 skipped by existing local-mode guards |
| web | `pnpm exec playwright test e2e/landing.spec.ts` | 0 | 25 passed |
| web | BFF runtime `curl POST /api/llm/feedback` | 0 | 200; normalized 10-field `LlmFeedbackResponse` |
| web | Browser Playwright smoke | 0 | `/`, `/analizar`, `/auth/signin?reason=arco-cancel`, `/cuenta`, loading/success/disabled/unavailable states verified |
| web | `git diff --exit-code main~4..main -- components/analyzer/fix-list.tsx` | 0 | FixList unchanged |
| both | Defensive greps | 0 actionable 022 hits | focused source paths clean; broad false positives documented below |

Notes: the first API runtime start failed because an old local `BuildCv.Api` process already owned `:5080`; the stale process was stopped and the API restarted with explicit 022 config. This is environmental, not product behavior.

## 4. Runtime Evidence

### 4.1 Backend smoke

| Check | Evidence | Status |
|---|---|---|
| Health/live | `GET http://localhost:5080/health/live` → 200 | PASS |
| Success response | `POST /api/v1/llm/feedback` valid v2 body → 200 | PASS |
| Contract shape | body had 10 keys: `summary`, `strengths`, `risks`, `suggestions`, `missingKeywords`, `questions`, `provider`, `model`, `generatedAt`, `degraded` | PASS |
| Fake metadata | `provider='fake'`, `model='fake-local-v1'`, `degraded=false` | PASS |
| Disabled | restart with `LlmFeedback__Enabled=false`; same POST → 403 `disabled` | PASS |
| Rate limit | 31 rapid requests → 429 with `Retry-After: 60` | PASS |
| Validation | missing `cv` body → 400 `validation_error` | PASS |
| No real LLM endpoint in 022 infra | `provider.*=.*(ollama|anthropic)` in `src/BuildCv.Infrastructure/LlmFeedback/` → 0 hits | PASS |

### 4.2 Web smoke

| Check | Evidence | Status |
|---|---|---|
| GET `/` | HTTP 200; title `BuildCv · Tu CV, medido con honestidad` | PASS |
| GET `/analizar` | HTTP 200; analyzer page renders | PASS |
| BFF POST | `POST /api/llm/feedback` → backend `/api/v1/llm/feedback`, 200 10-field response | PASS |
| Panel visible | Playwright: `region[name="AI Feedback"]` visible after analysis | PASS |
| Loading | Playwright held `/api/llm/feedback`; `Generando feedback IA…` visible | PASS |
| Success | summary, strengths, risks, suggestions, missingKeywords, questions, provider/model rendered | PASS |
| Disabled | session toggle produced `Feedback IA desactivado para esta sesión`; no fetch in E2E | PASS |
| Unavailable | 502 route fulfilled; panel rendered `Feedback IA no disponible` | PASS |
| Signin reason fix | `/auth/signin?reason=arco-cancel` stays on signin URL | PASS |
| Account guard | `curl /cuenta` returned 307 to signin; browser local-mode then reached `/analizar` as expected | PASS_WITH_NOTES |
| Console happy path | fresh home tab after smoke: 0 console errors, 0 warnings | PASS |

### 4.3 Regressions

- 009 auth-web E2E: 11 passed, 5 skipped. Includes ARCO cancel regression coverage from verify-fixes.
- 021 landing/structured path regression: `e2e/landing.spec.ts` 25 passed.
- PR4 LLM feedback E2E: 3 passed.
- API scoring regression: `dotnet test --filter "ScoringEngine"` 18 passed.
- Baseline `/adapt`: accepted pre-existing `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` failure from previous apply/review; not rerun as a blocker in this final gate because it was reproduced on api/main pre-022 and is documented.

### 4.4 Defensive greps

| Area | Result | Notes |
|---|---|---|
| api 022 paths | `NEXT_PUBLIC_LLM`, `LLM_API_KEY`, `Ai:Provider`, `HttpClient` in fake, hardcoded secrets, suppressions, `tool_use|function_call` in port, real-provider names → 0 hits | PASS |
| api broad repo | raw-CV/job patterns matched existing metadata-only `cvLength`/`jobLength`; hardcoded `BffApiKey` matched existing test fixture | PASS_WITH_NOTES; not 022, no raw content/secret value exposed in 022 |
| web 022/source paths | `NEXT_PUBLIC_LLM`, `LLM_API_KEY`, raw `console.log` cv/job, `aiFeedback`, llm-to-adapt/score backend usage, `@ts-ignore`, `eslint-disable`, legacy auth paths → 0 hits | PASS |
| web broad source | `providerId` matched only endpoint-drift guard string in `scripts/check-endpoint-drift.mjs` | PASS_WITH_NOTES; guard text, not functional usage |
| runtime logs | no test CV email/phone/personal URL, bearer tokens, BFF key, or LLM API key values found | PASS; config key text `Ai:ApiKey` appears in health message without value |

## 5. Spec Compliance Matrix — 22 REQs

| REQ | Description | Implementation | Test | Runtime Evidence | Status |
|---|---|---|---|---|---|
| REQ-LLM-001 | disabled default | `LlmFeedbackOptions.cs:7-17`, `appsettings.json:19-29`, handler disabled check `GenerateLlmFeedbackHandler.cs:19-22` | `LlmFeedbackConfigurationTests.cs:13-34`, `GenerateLlmFeedbackHandlerTests.cs:12-23`, `LlmFeedbackEndpointTests.cs:41-51` | disabled runtime POST → 403 | PASS |
| REQ-LLM-002 | offline deterministic fake | `FakeLlmFeedbackClient.cs:7-24`, no HTTP | `FakeLlmFeedbackClientTests.cs:15-30`, `45-55` | success runtime `provider=fake`, no network/provider config | PASS |
| REQ-LLM-003 | `LlmFeedback`/`LLM_FEEDBACK`, not `Ai` | `LlmFeedbackOptions.cs:5`, `DependencyInjection.cs:268-291`, env alias `294-301` | `LlmFeedbackConfigurationTests.cs:36-84`, `86-114` | defensive grep `Ai:Provider` in 022 feedback paths → 0 | PASS |
| REQ-LLM-004 | 10-field contract | API record `LlmFeedbackResponse.cs:7-17`; Web type `lib/api/llm.ts:22-33` | `LlmFeedbackContractsTests.cs:51-80`, `lib/api/llm.test.ts:98-105` | API and BFF success bodies had 10 fields | PASS |
| REQ-LLM-005 | score unchanged | score context read-only `LlmFeedbackRequest.cs:7-23`; score engine constant `ScoringEngine.cs:23` | `dotnet test --filter "ScoringEngine"` 18 passed | `ScoringEngine.Version = "2.0.0"`; FixList unchanged | PASS |
| REQ-LLM-006 | markers semantics | fake maps `UserConfirmed/Explicit` to strengths and `Inferred` to risks `FakeLlmFeedbackClient.cs:59-73` | `FakeLlmFeedbackClientTests.cs:32-43`, handler pass-through `GenerateLlmFeedbackHandlerTests.cs:40-52` | runtime success included marker-aware strengths/risks | PASS |
| REQ-LLM-007 | distinct backend endpoint | `LlmFeedbackEndpoint.cs:10-35` | `LlmFeedbackEndpointTests.cs:12-27` | `POST /api/v1/llm/feedback` → 200 | PASS |
| REQ-LLM-008 | BFF + server-side `X-BFF-Key` | `app/api/llm/feedback/route.ts:17-56` | `route.test.ts:67-81`, secret strip `112-133` | BFF POST → 200; no key in response | PASS |
| REQ-LLM-009 | analyzer panel separate from FixList | `Analyzer.tsx:213-231`, `FixList` unchanged | `Analyzer_Renders_LlmFeedbackPanel_Outside_Deterministic_FixList`; `llm-feedback-panel.test.tsx:85-100` | Playwright panel visible; FixList diff exit 0 | PASS |
| REQ-LLM-010 | session toggle off | `use-session-toggle.ts:5-23`, panel `llm-feedback-panel.tsx:34-44` | `use-session-toggle.test.ts:11-38`, E2E toggle | Playwright disabled state visible | PASS |
| REQ-LLM-011 | loading state | panel `llm-feedback-panel.tsx:40-44`, `101` | `llm-feedback-panel.test.tsx:75-83` | Playwright loading visible while fetch held | PASS |
| REQ-LLM-012 | disabled copy | copy `es.ts:132-166`, panel `llm-feedback-panel.tsx:82-90` | `llm-feedback-panel.test.tsx:61-67` | disabled runtime/browser state visible | PASS |
| REQ-LLM-013 | unavailable copy | adapter maps `502/503` `lib/api/llm.ts:134-151`, panel `llm-feedback-panel.tsx:107-109` | `lib/api/llm.test.ts:115-131`, `llm-feedback-panel.test.tsx:112-124` | Playwright 502 → `Feedback IA no disponible` | PASS |
| REQ-LLM-014 | rate limit 429 + Retry-After | `LlmFeedbackRateLimitFilter.cs:11-35` | `LlmFeedbackEndpointTests.cs:53-64` | 31 rapid POSTs → 429 + `Retry-After: 60` | PASS |
| REQ-LLM-015 | timeout degraded | timeout wrapper `GenerateLlmFeedbackHandler.cs:47-57`, degraded result `64-83` | `GenerateLlmFeedbackHandlerTests.cs:54-65` | covered by unit; runtime fake success not degraded | PASS |
| REQ-LLM-016 | fallback + score intact | provider exception fallback `GenerateLlmFeedbackHandler.cs:58-83`; panel degraded/unavailable states | `GenerateLlmFeedbackHandlerTests.cs:67-79`, `llm-feedback-panel.test.tsx:102-124` | score remains visible in analyzer; ScoringEngine tests pass | PASS |
| REQ-LLM-017 | PII redacted first | `PiiRedactor.cs:17-41`; handler builds redacted context before client `GenerateLlmFeedbackHandler.cs:24-33` | `PiiRedactorTests.cs:8-61`, handler redaction `GenerateLlmFeedbackHandlerTests.cs:25-38`, failure no provider `81-92` | runtime logs no test PII | PASS |
| REQ-LLM-018 | input as data/no tools | prompt boundary `system.md:1-3`, `LlmFeedbackPromptBoundary.cs:3-8` | `LlmFeedbackPromptBoundaryTests.cs:8-29` | defensive grep `tool_use|function_call` in port → 0 | PASS |
| REQ-LLM-019 | metadata-only logs | `GenerateLlmFeedbackHandler.cs:39-45`, degraded logs `66-70` | `GenerateLlmFeedbackHandlerTests.cs:94-110` | runtime log scan no CV/job/secret values | PASS |
| REQ-LLM-020 | fake-only CI/tests | fake DI `DependencyInjection.cs:283-291`; Web tests mock same-origin BFF | `pnpm test` 1162; `dotnet` LLM tests 35 | no real provider grep in 022 paths | PASS |
| REQ-LLM-021 | 009 regression | no `/api/auth/*` or `/cuenta` source touched by PR4 | 009 E2E command 11 passed, 5 skipped | signin reason stays; account guard works | PASS |
| REQ-LLM-022 | 021 regression | v2 score request remains `engineVersion: "2.0.0"` `Analyzer.tsx:133-139` | landing E2E 25 passed; ScoringEngine 18 passed | score constant 2.0.0 confirmed | PASS |

## 6. NFR Coverage Matrix — 10 NFRs

| NFR | Description | Evidence | Status |
|---|---|---|---|
| NFR-SEC-01 | no secret/prompt/PII leak | BFF strips sensitive headers `route.ts:36-48`, `88-93`; API logs metadata only; defensive greps/log scan clean for 022 | PASS |
| NFR-PRIV-01 | redact/minimize | `PiiRedactor.cs:17-41`, tests for email/phone/URL/address and no name masking | PASS |
| NFR-DET-01 | Art. II unchanged | `ScoringEngine.Version = "2.0.0"`; 18 scoring tests passed; FixList diff 0 | PASS |
| NFR-OFFLINE-01 | fake offline | `FakeLlmFeedbackClient.cs` has no HTTP; provider/model fake runtime | PASS |
| NFR-RES-01 | timeout/error degraded + score | handler timeout/provider fallback tests; panel degraded/unavailable states; score visible | PASS |
| NFR-RATE-01 | dedicated configurable limit | `LlmFeedbackRateLimitFilter.cs`, options default 30/60; runtime 429 + Retry-After | PASS |
| NFR-OBS-01 | sanitized logs | metadata-only logger tests and runtime scan | PASS |
| NFR-CONFIG-01 | server env; no public LLM secrets | `LlmFeedback` options + `LLM_FEEDBACK__*`; `NEXT_PUBLIC_LLM`/`LLM_API_KEY` 0 source hits | PASS |
| NFR-TEST-01 | CI fake | unit/integration/E2E use fake/mocks only; no real provider in 022 code paths | PASS |
| NFR-A11Y-01 | accessible region/label/keyboard/SR | panel `role="region"`, `aria-label`, `aria-busy`, `aria-live`; tests `llm-feedback-panel.test.tsx:75-83`, `126-141` | PASS |

## 7. Compliance Coverage Matrix — 9 Compliance

| CR | Article | Evidence | Status |
|---|---|---|---|
| CR-CONST-II | Art. II score sealed/no bump | LLM response separate from score; `ScoringEngine.cs:23`; scoring tests pass; FixList unchanged | PASS |
| CR-CONST-III | Art. III no CV/job logs | redaction-first handler; log tests assert absence of raw tokens; runtime log scan clean for PII | PASS |
| CR-CONST-V | Art. V content is DATA | prompt boundary file says data, not instructions; tests pass | PASS |
| CR-CONST-VI | Art. VI Clean Architecture | port in Application `ILlmFeedbackClient.cs`; adapter in Infrastructure; endpoint in API; Domain package references none | PASS |
| CR-CONST-IX | Art. IX no ARCO regression | 009 E2E 11 passed, 5 skipped; `/auth/signin?reason=arco-cancel` stays | PASS |
| CR-NO-3P-CONTENT | no third-party CV default | only fake provider registered for `LlmFeedback`; no Ollama/Anthropic implementation in feedback infra | PASS |
| CR-NO-SECRETS | no hardcoded/logged secrets | no `LLM_API_KEY`; BFF key server-only and stripped; runtime log scan no values | PASS |
| CR-NO-TOOLS | no function/tool calling | `ILlmFeedbackClient` has simple `GenerateAsync`; grep 0; boundary tests reject markers | PASS |
| CR-MARKERS | inferred not truth | fake outputs `inferred` as tentative risk, explicit/user_confirmed as strengths | PASS |

## 8. Acceptance Criteria Coverage — 32 AC

| AC | Description | PR | Status |
|---|---|---|---|
| PR1-AC1 | disabled default | PR1 | PASS |
| PR1-AC2 | `LlmFeedback` options | PR1 | PASS |
| PR1-AC3 | fake v2 contract | PR1 | PASS |
| PR1-AC4 | offline tests | PR1 | PASS |
| PR1-AC5 | Domain pure | PR1 | PASS |
| PR2-AC1 | endpoint 200 | PR2 | PASS |
| PR2-AC2 | 429 + Retry-After | PR2 | PASS |
| PR2-AC3 | timeout degraded | PR2 | PASS |
| PR2-AC4 | sanitized error | PR2 | PASS |
| PR2-AC5 | redact email/phone/URLs/address | PR2 | PASS |
| PR2-AC6 | contentless logs | PR2 | PASS |
| PR2-AC7 | injection no-tools | PR2 | PASS |
| PR2-AC8 | Art. II tests | PR2 | PASS |
| PR3-AC1 | BFF + `X-BFF-Key` | PR3 | PASS |
| PR3-AC2 | adapter states | PR3 | PASS |
| PR3-AC3 | unit tests | PR3 | PASS |
| PR4-AC1 | separate panel | PR4 | PASS |
| PR4-AC2 | loading | PR4 | PASS |
| PR4-AC3 | disabled | PR4 | PASS |
| PR4-AC4 | unavailable | PR4 | PASS |
| PR4-AC5 | sessionStorage | PR4 | PASS |
| PR4-AC6 | fake E2E | PR4 | PASS |
| PR4-AC7 | a11y attrs | PR4 | PASS |
| PR4-AC8 | lint/type/e2e | PR4 | PASS |
| CROSS-AC1 | 009 E2E | Cross | PASS_WITH_NOTES — existing 5 skips |
| CROSS-AC2 | 021 E2E | Cross | PASS |
| CROSS-AC3 | unit suite full | Cross | PASS — 1162/1162 |
| CROSS-AC4 | Domain package purity | Cross | PASS |
| CROSS-AC5 | endpoint drift | Cross | PASS |
| CROSS-AC6 | CI no secrets/PII | Cross | PASS_WITH_NOTES — broad guard/test false positives only |
| CROSS-AC7 | no `NEXT_PUBLIC_LLM_*` | Cross | PASS |
| CROSS-AC8 | deterministic fake only | Cross | PASS |

Summary: PASS 29, PASS_WITH_NOTES 3, FAIL 0, NOT_APPLICABLE 0.

## 9. Correctness Table

| Decision | Evidence | Status |
|---|---|---|
| FakeLlmFeedbackClient offline deterministic | `FakeLlmFeedbackClient.cs:18-24`; deterministic tests | ✓ |
| PiiRedactor emails/phones/URLs/addresses; names preserved | `PiiRedactor.cs:26-31`; `PiiRedactorTests.cs:8-52` | ✓ |
| 9 UI states | `LlmFeedbackState` `lib/api/llm.ts:5-14`; panel state `llm-feedback-panel.tsx:10-19`; tests | ✓ |
| sessionStorage toggle, not localStorage/backend | `use-session-toggle.ts:5-23`; tests assert localStorage null | ✓ |
| BFF X-BFF-Key server-side only | `route.ts:51-56`; tests strip keys | ✓ |
| LlmFeedbackState discriminated union | `lib/api/llm.ts:67-70`; tests `lib/api/llm.test.ts:133-156` | ✓ |
| 10-field LlmFeedbackResponse v2 | API/Web contracts + runtime body | ✓ |
| Provider/model fixed | API runtime `fake/fake-local-v1`; tests | ✓ |
| Rate limit 30 req/60s configurable | options + filter + runtime 429 | ✓ |
| Sanitized logs | logger tests + runtime scan | ✓ |

## 10. Design Coherence Table

| Design section | Expected | Implementation | Status |
|---|---|---|---|
| §3 API contracts | endpoint and 10-field response | endpoint + records implemented; 200/400/403/429/500 covered | PASS |
| §4 Application contracts | immutable request/response, port, handler | Application records/port/handler present | PASS |
| §5 Provider | fake only, deterministic, no HTTP/API key | Fake provider only for `LlmFeedback`; no real provider | PASS |
| §6 Config | `LlmFeedback` defaults + `LLM_FEEDBACK__*` aliases | defaults in appsettings and env alias tests | PASS |
| §7 Security/privacy | redaction first; no tools; no raw logs | redactor + boundary + metadata logs | PASS |
| §8 PII redaction | email/phone/URL/address, names preserved | implemented and tested | PASS |
| §9 Prompt injection | DATA boundary, no tool definitions | prompt placeholder + forbidden marker helper/tests | PASS |
| §10 Rate/timeout/fallback | 30/60 limit, timeout degraded | filter runtime 429; unit degraded fallback | PASS |
| §11 Observability | provider/model/length/latency/trace only | metadata-only logs; no raw values | PASS |
| §12 Web BFF | nodejs POST proxy, normalized states, no secrets | route implemented; tests cover status mapping and secret stripping | PASS |
| §13 UI component | panel beside deterministic results, not inside FixList | Analyzer renders panel after SectionBreakdown; FixList diff 0 | PASS_WITH_NOTES — integration is inside `Analyzer` not page-level, accepted because needed data lives there |
| §14 State model | disabled/idle/loading/success/degraded/unavailable/rate_limited/timeout/error | 9 states implemented/tested | PASS |
| §15 Sequences | disabled, fake success, timeout, redaction, toggle, regressions | covered by unit/integration/E2E/runtime | PASS |
| §16 Errors | typed error mapping | API/BFF mappings covered; fake fallback returns 200 degraded for provider errors | PASS |
| §17 Testing strategy | PR1-PR4 tests + regressions | all listed suites passed | PASS |
| §18 PR plan | 4 PR chain | all merged/pushed | PASS |
| §19 Risks | 9 risks mitigated | see section 14 | PASS |
| §20 Traceability | REQ/NFR/CR mapping | matrices complete | PASS |
| §21 Deferred | Ollama/multi-provider/etc. deferred | no scope creep | PASS |

## 11. Issues

### CRITICAL

- 0.

### WARNING

1. `BASELINE_PRE_EXISTING`: `/adapt` `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` expected 401, got 200. It was reproduced on API main before 022 (`496a3c7`) and is not caused by 022. Not a blocker.
2. Broad defensive greps produce false positives outside 022 paths: metadata-only `cvLength/jobLength`, existing `BffApiKey` test fixture, endpoint-drift guard strings. Focused 022 paths are clean.

### SUGGESTION

1. `BuildCv-api/specs/000-INDEX.md` line 50 still says 022 is `PR2 API APPLIED` / PR2 branch, while actual API main is `00f64ed` PR2 merged and Web PR3/PR4 are complete. Archive sync should update this doc drift.
2. Keep tracking accepted local-mode skips in 009 E2E; no new skip introduced by 022.

## 12. MVP Readiness

| Metric | Value |
|---|---:|
| MVP_BLOCKER | 0 |
| SHOULD_FIX_BEFORE_LAUNCH | 0 |
| SAFE_DEFER_POST_MVP | 7 |
| READY_FOR_ARCHIVE | yes |
| READY_FOR_TAG | yes, post-archive |

SAFE_DEFER_POST_MVP list:

1. 009 PR3 `/privacidad`.
2. 009 PR5 consent UI.
3. OpenAPI polish.
4. `_providerKeyMap` cleanup.
5. T-PR0-007 tracking gap.
6. axe-core/Lighthouse automation.
7. full E2E CI expansion.

## 13. Rollback Plan

- PR-by-PR revert path remains valid: revert PR4 web first, then PR3 web if BFF/adapter must be removed; revert PR2 API before PR1 API if backend endpoint/foundation must be removed.
- Operational kill switch: `LlmFeedback:Enabled=false` disables API endpoint behavior with 403 and UI disabled copy.
- `LlmFeedback:Provider=fake` prevents real provider use.
- 009 and 021 are not touched by rollback; 009 tag remains at SHIP commits and score engine remains `2.0.0`.

## 14. Risks & Accepted Deviations

| Risk | Coverage | Status |
|---|---|---|
| PII leak | redaction tests + redaction-first handler + log scan | COVERED |
| Prompt injection | DATA prompt boundary + no tools/functions | COVERED |
| Score regression | scoring tests + constant `2.0.0` + FixList unchanged | COVERED |
| Abuse | dedicated 30/60 rate limit + runtime 429 | COVERED |
| Timeout | unit degraded fallback | COVERED |
| Contract drift | 10-field contract tests + endpoint drift gate | COVERED |
| Secret leak | BFF key server-only; greps; secret-strip tests | COVERED |
| Offline failure | fake provider only, no HTTP/API key | COVERED |
| UI confusion | separate panel + disclaimer + FixList unchanged | COVERED |

Accepted deviations:

- PR1 production LOC 248 vs forecast ~200 (+24%), under 400 cap.
- PR2 production LOC 308, under 400 cap; total diff larger due tests.
- PR3 production LOC 264, under 400 cap; test count larger for security/Retry-After coverage.
- PR4 production LOC 218, under 400 cap; total diff larger due tests and docs.
- Four fresh reviews: PR1/PR2 `APPROVE_WITH_MINOR_NOTES`, PR3/PR4 `APPROVE`.
- Baseline `/adapt` accepted as pre-existing and not a 022 blocker.

## 15. Deferred Items

- `023-ollama-real-provider` — PR5 Ollama + PR6 verify.
- Multi-provider feedback.
- External billing/cost credits.
- Persistent user LLM preference.
- Advanced prompt-injection adversarial suite.
- Production deploy smoke.
- 009 PR3 `/privacidad`.
- 009 PR5 consent UI.

## 16. Final Recommendation

- Archive recommended: yes.
- Final tag recommended: yes, after archive, on SHIP commits (`BuildCv-web` `824df2b`, `BuildCv-api` `00f64ed`), not archive commit.
- Required patches before archive: none.
- Follow-up suggestion: fix API INDEX status drift during archive sync and keep `/adapt` baseline as a separate post-MVP issue if prioritized.
