# Verification Report — 024 MiniMax Real Provider

## 1. Summary

| Field | Value |
|---|---|
| Change | `024-minimax-real-provider` |
| Final status | SHIPPED in 3 merged+pushed PRs |
| Verify verdict | `PASS_WITH_NOTES` |
| MVP_BLOCKER | 0 |
| SHOULD_FIX_BEFORE_LAUNCH | 0 |
| READY_FOR_ARCHIVE | yes |
| READY_FOR_TAG | yes, post-archive |
| Tag target | SHIP commits: api `98995c3`, web `1a0a563`; not archive commit |

Notes: all deterministic, fake, web, regression, type, drift, and secret gates passed. MiniMax missing-key runtime is safe fail-fast at startup, not endpoint `502`; design §5/§17 allows startup fail, but the user smoke expected endpoint `502`, so this is recorded as WARNING, not a blocker.

## 2. Scope Verified

- PR1 api `8b83cba`: `MinimaxLlmFeedbackClient`, options (`BaseUrl`, `ApiKey`, `Model`, caps), conditional DI, safe appsettings, 22 tests.
- PR2 api `98995c3`: handler dispatch, `MaxInputLength`, `MaxOutputTokens`, sanitized mapping, endpoint integration, 7 tests.
- PR3 web `1a0a563`: type-only contract fix in `lib/api/llm.ts` (`provider: "fake" | "minimax"`, `model: string`) + 2 tests.

## 3. Command Evidence

| Repo | Command | Exit | Result |
|---|---:|---:|---|
| api | `git status && rev-parse && tag *024*` | 0 | clean, HEAD `98995c3`, no 024 tag |
| web | same | 0 | clean before report, HEAD `3da2231`, no 024 tag |
| api | `dotnet build BuildCv.slnx -c Release` | 0 | 0 warnings/errors |
| api | `dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~Minimax"` | 0 | 64 passed |
| api | `dotnet test --filter ScoringEngine` | 0 | 18 passed |
| api | `dotnet test --filter PiiRedactor` | 0 | 10 passed |
| api | `dotnet test --filter Adapt` | 1 | known baseline: 139 passed, 1 failed `/adapt` auth test |
| api | `dotnet list src/BuildCv.Domain package` | 0 | no packages |
| web | `pnpm typecheck` | 0 | clean |
| web | `pnpm test` | 0 | 1164 passed |
| web | `pnpm build` | 0 | Next build passed |
| web | `vitest lib/api/llm.test.ts -t MiniMax` | 0 | 1 passed |
| web | endpoint drift | 0 | PASS |
| web | 009 Playwright suite | 0 | 11 passed, 5 skipped |
| web | 021 landing suite | 0 | 25 passed |

## 4. Runtime Evidence

| Check | Evidence | Status |
|---|---|---|
| API minimax no key | startup fails fast: `LlmFeedback provider minimax requires a server-side API key`; no key value leaked | PASS_WITH_NOTES |
| API fake smoke | `POST /api/v1/llm/feedback` → 200, v2 response, `provider=fake`, `model=fake-local-v1` | PASS |
| Web BFF smoke | API fake + `BACKEND_URL=http://localhost:5080`; `POST /api/llm/feedback` → 200 passthrough | PASS |
| 009 regression | Playwright 11 passed, 5 skipped | PASS |
| 021 regression | Playwright landing 25 passed | PASS |
| Greps | no actionable 024 secret/client/suppression/logging hits; broad historical false positives documented | PASS_WITH_NOTES |
| Score | `ScoringEngine.Version = "2.0.0"`; 18 tests passed | PASS |
| Tags | 009 targets api `66fcaf1`/web `9f71e9f`; 022 targets api `00f64ed`/web `bb81e02`; no 024 tag | PASS |

## 5. Spec Compliance Matrix (26 FRs)

| REQ | Description | Evidence | Status |
|---|---|---|---|
| FR-001..002 | `fake|minimax` provider selection | PR1/PR2 DI+endpoint tests; fake runtime 200 | PASS |
| FR-003..007 | MiniMax config: BaseUrl, ApiKey server-only, model, caps | options/appsettings/tests; no tracked key | PASS |
| FR-008..011 | Anthropic text-only, DATA prompt, PII before provider | client request tests, redaction tests, greps | PASS |
| FR-012..014 | v2 parse/stamp/degraded | client tests + endpoint minimax contract | PASS |
| FR-015 | 401/403/missing-key sanitized | tests pass; missing key is startup fail-fast not endpoint 502 | PASS_WITH_NOTES |
| FR-016 | 429 + `Retry-After` | endpoint/provider tests; 429 header preserved | PASS |
| FR-017..018 | 5xx/timeout degraded/sanitized | tests + handler mapping | PASS |
| FR-019..021 | non-streaming/no thinking/no real CI | request tests, fake handler, greps | PASS |
| FR-022..026 | score, `/adapt`, 022 fake, 009, web intact | regressions + diff/inspection | PASS_WITH_NOTES (`/adapt` baseline) |

## 6. NFR Coverage Matrix (11 NFRs)

| NFR | Evidence | Status |
|---|---|---|
| SEC | no tracked/client keys; greps clean | PASS |
| PRIV | redaction-first; metadata logs | PASS |
| DET | scoring tests 18; v2 constant unchanged | PASS |
| REL | degraded/sanitized provider errors | PASS |
| COST | 32000/1024, 30/60, no aggressive retry | PASS |
| PERF | 5000ms timeout tests | PASS |
| OBS | logs lengths/provider/model only | PASS |
| TEST | fake HTTP handlers; no real CI provider | PASS |
| BC | 022/009/021 regression suites pass | PASS |
| MAINT | Domain no packages; port/adapter layering | PASS |
| CONFIG | `LlmFeedback__*` env-configurable | PASS |

## 7. Compliance Coverage Matrix (8 CRs)

| CR | Article | Evidence | Status |
|---|---|---|---|
| CR-II | deterministic score | no score code touched; tests pass | PASS |
| CR-III | privacy/minimize | PII redactor before provider; no raw logs | PASS |
| CR-V | input is DATA | system prompt + no tools | PASS |
| CR-VI | Clean Architecture | Application port, Infrastructure adapter, Domain pure | PASS |
| CR-IX | Habeas/ARCO no regression | 009 e2e pass | PASS |
| CR-SECRETS | no tracked/client keys | greps/appsettings clean | PASS |
| CR-CI | no real MiniMax CI | fake handlers only | PASS |
| CR-NO-ASSUMPTIONS | no M3/free-tier/exact-limit claims | docs/config reviewed | PASS |

## 8. Acceptance Criteria Coverage (20 ACs)

| AC | Description | PR | Status |
|---|---|---|---|
| AC-001..002 | fake and minimax dispatch | PR1/2 | PASS |
| AC-003 | missing key sanitized | PR1/2 | PASS_WITH_NOTES: safe startup fail, not endpoint 502 |
| AC-004..006 | bad config, valid 200, malformed degraded | PR1/2 | PASS |
| AC-007..010 | 401/403, 429, 5xx, timeout | PR1/2 | PASS |
| AC-011..014 | input cap, max tokens, PII, metadata logs | PR1/2 | PASS |
| AC-015..016 | no public secrets; no CI real HTTP | PR1/2 | PASS |
| AC-017 | 022 fake tests/runtime | PR2/verify | PASS |
| AC-018 | ScoringEngine tests | verify | PASS |
| AC-019 | 009 auth e2e | verify | PASS |
| AC-020 | gates green | verify | PASS_WITH_NOTES |

## 9. Correctness Table

| Check | Status |
|---|---|
| handler dispatch fake/minimax | ✓ |
| injectable MiniMax client + fake handler tests | ✓ |
| PII before provider | ✓ |
| `MaxInputLength` / `MaxOutputTokens` | ✓ |
| 401/403/429/5xx/timeout/malformed mapping | ✓ |
| `Retry-After` preserved | ✓ |
| no key leak / sanitized logs | ✓ |
| score deterministic | ✓ |
| web types fixed | ✓ |
| 022 BFF/UI intact | ✓ |

## 10. Design Coherence Table

| Design item | Evidence | Status |
|---|---|---|
| D1..D8 architecture decisions | new adapter, Anthropic subset, `LlmFeedback:*`, server secrets, fake default, no Domain changes, degraded fallback, fake tests | PASS |
| §17 error matrix | implemented via typed exceptions/handler; provider 429 as HTTP 429 | PASS |
| 3 PR plan | delivered and reviewed | PASS |
| Minimal web drift | PR3 production change 2 lines | PASS |

## 11. Issues

### CRITICAL

- 0.

### WARNING

1. `BASELINE_PRE_EXISTING`: `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` expected 401, actual 200. Pre-existing, not 024.
2. `RUNTIME_DEVIATION`: MiniMax `Enabled=true` + missing `ApiKey` fails at startup instead of returning endpoint 502. Safe fail-fast, no key leak; design allows startup fail.

### SUGGESTION

- API INDEX row still says PR2 applied/branch; fix during archive sync.

## 12. MVP Readiness

| Metric | Value |
|---|---:|
| MVP_BLOCKER | 0 |
| SHOULD_FIX_BEFORE_LAUNCH | 0 |
| SAFE_DEFER_POST_MVP | 18 |
| READY_FOR_ARCHIVE | yes |
| READY_FOR_TAG | yes, post-archive |

SAFE_DEFER_POST_MVP: 023 Ollama; streaming; thinking; multi-provider UI; persistent preference; billing dashboard; advanced cost analytics; model listing; real MiniMax CI smoke; payments; A11y global audit; deploy automation; baseline `/adapt`; 009 `/privacidad`; 009 consent UI; 022 UI changes unless drift; ScoreEngine changes; MiniMax-M3/free-tier/exact-limit assumptions.

## 13. Risks & Accepted Deviations + Deferred + Open Questions

| Risk | Mitigation | Status |
|---|---|---|
| PII, cost, outage, key leak, hallucination, injection, model drift, provider 429, timeout/malformed | redaction, caps, fallback, server-only key, separate panel, DATA prompt, configurable model, 429 mapping, timeout/degraded parser | COVERED |

Deferred items: the 18 listed in §12. Open questions remain non-blocking: model availability, RPM/TPM, pricing. Reviews: PR1/PR2 `APPROVE_WITH_MINOR_NOTES`, PR3 `APPROVE`. Production LOC: PR1 244 + PR2 35 + PR3 2 = ~281 changed production lines; tests added: 22 + 7 + 2 = 31.
