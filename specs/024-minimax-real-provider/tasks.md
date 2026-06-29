# Tasks: 024 — MiniMax Real Provider

> Change: `024-minimax-real-provider` · Artifact home: `BuildCv-web/specs/024-minimax-real-provider/` · Cross-repo: `BuildCv-api/` + optional `BuildCv-web/`  
> Constitution: `BuildCv-api/.specify/memory/constitution.md` v1.2.0 · Implementation: none in this phase.

## 1. Execution Strategy

- Strict TDD per Constitution Art. VIII: every behavior task runs RED → GREEN → REFACTOR.
- Atomic micro-batches: options/config → client request/response → errors/DI → handler integration → optional web drift.
- Fresh review is mandatory between PRs; do not continue child PR scope until parent review feedback is resolved.
- Chain strategy: `feature-branch-chain` cross-repo. No code, no `apply-progress`, no `sdd-apply` in this phase.

## 2. Branch Strategy

| PR | Repo | Branch | Base | Target (final) |
|---|---|---|---|---|
| PR1 | api | `feature/024-minimax-pr1-api-client` | api/main @ `1f74917` | api/main |
| PR2 | api | `feature/024-minimax-pr2-api-dispatch` | api PR1 branch | api/main |
| PR3 | web | `feature/024-minimax-pr3-web-contract` | web/main @ `a2faf2d` | web/main (optional) |

Dependencies: PR2 → PR1. PR3 → PR1+PR2 only if web changes; PR3 standalone/docs-only if web is unchanged. Retarget/rebase if a child PR shows parent changes.

## 3. Review Workload Forecast

Decision needed before apply: No (PR scope already split into PR1-2 MVP + PR3 optional web by owner; each PR forecast ≤ 400 LOC)
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Low (PR1 ~250, PR2 ~150, PR3 0-100; all below cap; split paths documented per PR)

| Field | Value |
|---|---|
| Estimated changed lines | ~400 LOC production total (PR1 ~250 + PR2 ~150, PR3 0-100 optional) |
| 400-line budget risk per PR | Low (PR1 250, PR2 150, PR3 0-100 all <400) |
| Chained PRs recommended | Yes (chain PR1→PR2 in api, PR3 standalone in web) |
| Delivery strategy | ask-on-risk (default; user already chose scope conservative MVP) |
| Chain strategy | feature-branch-chain cross-repo |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | options + `MinimaxLlmFeedbackClient` + DI + appsettings + unit tests | PR1 api | base: api/main; depends on 022 abstractions |
| 2 | handler dispatch + max input + error mapping + integration tests | PR2 api | base: api PR1 branch; depends on PR1 |
| 3 | BFF/panel contract type-only if needed, otherwise skipped | PR3 web | base: web/main; only if drift found |

## 4. PR1 API Tasks — Minimax client/options/DI/unit tests

### Phase 1.1: Options & Contracts
- [x] **T-PR1-001 RED**: Test `LlmFeedbackOptions` binding for `BaseUrl`, `ApiKey`, `Model`, `MaxInputLength`, `MaxOutputTokens`, `TimeoutMs` defaults.
- [x] **T-PR1-001 GREEN**: Extend `LlmFeedbackOptions.cs`; validate positive caps and timeout.
- [x] **T-PR1-002 RED**: Test env var binding for `LlmFeedback__BaseUrl`, `LlmFeedback__Model=MiniMax-M2.7`, `LlmFeedback__ApiKey`, caps.
- [x] **T-PR1-002 GREEN**: Support canonical .NET env overrides via options binding.
- [x] **T-PR1-003 RED**: Test provider values `fake|minimax|invalid`.
- [x] **T-PR1-003 GREEN**: Add provider validation with startup-safe failure for invalid.
- [x] **T-PR1-004 RED**: Test tracked `appsettings.json` has no `ApiKey` value; only safe defaults.
- [x] **T-PR1-004 GREEN**: Update `appsettings.json`: disabled fake default, MiniMax BaseUrl/model/caps/timeout/rate limit only.
- [x] **T-PR1-005 RED**: Test `Provider=minimax` + `Enabled=true` + empty `ApiKey` fails fast with sanitized error.
- [x] **T-PR1-005 GREEN**: Add DI/options startup validation for required MiniMax `ApiKey`.

### Phase 1.2: Client request contract
- [x] **T-PR1-006 RED**: Test `MinimaxLlmFeedbackClient` constructor accepts injectable `HttpClient`, options, clock/logger seams.
- [x] **T-PR1-006 GREEN**: Create `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/MinimaxLlmFeedbackClient.cs` implementing `ILlmFeedbackClient`.
- [x] **T-PR1-007 RED**: Test Anthropic Messages text-only body: `{model,max_tokens,system,messages[{role:"user",content:[{type:"text",text}]}]}`.
- [x] **T-PR1-007 GREEN**: Implement request builder; no tools, multimodal, OpenAI format, beta fields, thinking, or streaming.
- [x] **T-PR1-008 RED**: Test headers: `Content-Type: application/json`, `x-api-key`, `anthropic-version: 2023-06-01`; no `Authorization`.
- [x] **T-PR1-008 GREEN**: Implement safe header setup without logging secrets.
- [x] **T-PR1-009 RED**: Test `MaxInputLength=32000` rejects or throws before HTTP call.
- [x] **T-PR1-009 GREEN**: Enforce input length in `GenerateAsync` before send.
- [x] **T-PR1-010 RED**: Test `MaxOutputTokens` becomes request `max_tokens`.
- [x] **T-PR1-010 GREEN**: Wire `MaxOutputTokens` into request builder.
- [x] **T-PR1-011 RED**: Test timeout/cancellation maps to `LlmFeedbackTimeoutException` or equivalent typed category.
- [x] **T-PR1-011 GREEN**: Honor `CancellationToken` and `TimeoutMs` around send/read.
- [x] **T-PR1-012 RED**: Serializer test asserts no `tool_use`, `thinking`, multimodal, OpenAI fields, or `stream=true` keys.
- [x] **T-PR1-012 GREEN**: Keep DTOs minimal so forbidden keys cannot serialize.

### Phase 1.3: Response Parsing
- [x] **T-PR1-013 RED**: Test 200 valid response maps to 10-field `LlmFeedbackResponse` v2 with `provider="minimax"`, configured model, ISO time, `degraded=false`.
- [x] **T-PR1-013 GREEN**: Implement parser for text blocks containing structured JSON.
- [x] **T-PR1-014 RED**: Test malformed/missing JSON returns degraded fallback: empty arrays + `AI feedback no disponible`.
- [x] **T-PR1-014 GREEN**: Add defensive parsing with controlled degraded response.
- [x] **T-PR1-015 RED**: Test provider `thinking` blocks are discarded and never exposed.
- [x] **T-PR1-015 GREEN**: Parse only `type="text"`; ignore reasoning blocks.
- [x] **T-PR1-016 RED**: Test 401/403 maps to unavailable/auth category with no key in exception/logs.
- [x] **T-PR1-016 GREEN**: Map 401/403 safely.
- [x] **T-PR1-017 RED**: Test 429 maps to provider rate-limited with optional `Retry-After` preserved.
- [x] **T-PR1-017 GREEN**: Preserve `Retry-After` metadata without raw provider body.

### Phase 1.4: Error Handling & DI
- [x] **T-PR1-018 RED**: Test 500-504 maps to unavailable/degraded category.
- [x] **T-PR1-018 GREEN**: Map 5xx safely.
- [x] **T-PR1-019 RED**: Test DNS/reset/`HttpRequestException` maps to network unavailable category.
- [x] **T-PR1-019 GREEN**: Catch network exceptions with sanitized messages.
- [x] **T-PR1-020 RED**: Test redacted payload is used before MiniMax HTTP call.
- [x] **T-PR1-020 GREEN**: Consume `LlmFeedbackContext.RedactedCvText/RedactedJobText` only.
- [x] **T-PR1-021 RED**: Log-capture test: no key, prompts, raw CV/job, raw response, tokens; metadata only.
- [x] **T-PR1-021 GREEN**: Extend 022 logging pattern with provider/model/latency/category/lengths/traceId only.
- [x] **T-PR1-022 RED**: Test DI registers MiniMax only when `LlmFeedback:Provider=minimax`; fake remains default.
- [x] **T-PR1-022 GREEN**: Add conditional typed `HttpClient` registration in `DependencyInjection.cs`.
- [x] **T-PR1-023 REFACTOR**: Extract request/response helpers only if duplication appears.

### Phase 1.5: Quality Gates
- [x] **T-PR1-024**: Verify Domain purity: `dotnet list src/BuildCv.Domain package references` → 0 packages.
- [x] **T-PR1-025**: Defensive grep `NEXT_PUBLIC_MINIMAX_API_KEY` → 0 hits.
- [x] **T-PR1-026**: Defensive grep `NEXT_PUBLIC_LLM_API_KEY` → 0 hits.
- [x] **T-PR1-027**: Defensive grep `LLM_API_KEY` literal in tracked production paths → 0 hits.
- [x] **T-PR1-028**: Defensive grep secret-looking `sk-` values → 0 hits.

### Phase 1.6: Docs + commit + review
- [x] **T-PR1-029**: Update `BuildCv-api/specs/000-INDEX.md` row 024 PR1 status.
- [x] **T-PR1-030**: Commit `test(llm): cubrir cliente minimax y configuración`.
- [x] **T-PR1-031**: Commit `feat(llm): agregar cliente minimax de feedback`.
- [x] **T-PR1-032**: Optional commit `chore(llm): defaults appsettings minimax` if separate.
- [x] **T-PR1-033**: Fresh review before merge.
- [x] **T-PR1-034**: Merge api PR1 → api/main with `--no-ff`.

### PR1 verification commands
```bash
dotnet format --verify-no-changes
dotnet build BuildCv.slnx -c Release
dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~MinimaxLlmFeedback"
dotnet test --filter "FullyQualifiedName~ScoringEngine"
dotnet test --filter "FullyQualifiedName~Adapt"
dotnet list src/BuildCv.Domain package references
```

### PR1 acceptance criteria
- [ ] MiniMax activates only with `Provider=minimax`; fake still works.
- [ ] Missing key/invalid BaseUrl fail safely; no key leaks.
- [ ] Anthropic Messages text-only request; no tools/thinking/multimodal/OpenAI/streaming.
- [ ] Valid 200 maps to v2; malformed/5xx/network/timeout degrade safely.
- [ ] 401/403 sanitized; 429 preserves `Retry-After` when present.
- [ ] PII-redacted context is sent; metadata-only logs; 0 tracked secrets; no real MiniMax in CI.

## 5. PR2 API Tasks — Handler dispatch/max input/error mapping/integration tests

### Phase 2.1: Handler Dispatch
- [ ] **T-PR2-001 RED**: Test `GenerateLlmFeedbackHandler` invokes fake when `Provider=fake` (022 regression).
- [ ] **T-PR2-001 GREEN**: Preserve fake path unchanged.
- [ ] **T-PR2-002 RED**: Test handler/DI invokes MiniMax when `Provider=minimax`.
- [ ] **T-PR2-002 GREEN**: Add provider dispatch/factory as needed.
- [ ] **T-PR2-003 RED**: Test invalid provider fails startup or controlled config validation.
- [ ] **T-PR2-003 GREEN**: Enforce provider validation.
- [ ] **T-PR2-004 RED**: Test `Provider=minimax` + `Enabled=false` returns 403 `disabled` without provider call.
- [ ] **T-PR2-004 GREEN**: Keep enabled check first.
- [ ] **T-PR2-005 RED**: Test missing key maps to sanitized 502/unavailable.
- [ ] **T-PR2-005 GREEN**: Validate key before provider invocation.

### Phase 2.2: Input Validation
- [ ] **T-PR2-006 RED**: Test over `MaxInputLength` redacted CV+job returns 400 or documented truncation.
- [ ] **T-PR2-006 GREEN**: Add handler validation using `LlmFeedbackOptions.MaxInputLength`.
- [ ] **T-PR2-007 RED**: Integration test proves `MaxOutputTokens=1024` reaches provider request.
- [ ] **T-PR2-007 GREEN**: Pass option through provider context/request.
- [ ] **T-PR2-008 RED**: Test `RedactionEnabled=false` skips redaction only by config.
- [ ] **T-PR2-008 GREEN**: Keep 022 redaction toggle behavior explicit.

### Phase 2.3: Error Mapping Integration
- [ ] **T-PR2-009 RED**: Endpoint success with MiniMax fake handler returns HTTP 200 + v2 response.
- [ ] **T-PR2-009 GREEN**: Wire success path through endpoint unchanged.
- [ ] **T-PR2-010 RED**: Malformed MiniMax response returns recommended 200 degraded.
- [ ] **T-PR2-010 GREEN**: Map malformed to degraded fallback.
- [ ] **T-PR2-011 RED**: 401 from provider returns 502 or degraded with no `ApiKey` in body/logs.
- [ ] **T-PR2-011 GREEN**: Add auth error mapping.
- [ ] **T-PR2-012 RED**: 403 from provider returns sanitized 502/degraded.
- [ ] **T-PR2-012 GREEN**: Add forbidden mapping.
- [ ] **T-PR2-013 RED**: 429 with `Retry-After` returns HTTP 429 and preserves header.
- [ ] **T-PR2-013 GREEN**: Preserve provider retry metadata.
- [ ] **T-PR2-014 RED**: 429 without `Retry-After` returns 429 without header.
- [ ] **T-PR2-014 GREEN**: Gracefully omit header.
- [ ] **T-PR2-015 RED**: 500-504 returns 502 or degraded per design without raw provider body.
- [ ] **T-PR2-015 GREEN**: Add server error mapping.

### Phase 2.4: Cross-Repo Regression
- [ ] **T-PR2-016 RED**: Re-run fake provider endpoint contract tests unchanged.
- [ ] **T-PR2-016 GREEN**: Fix only if 024 regressed fake behavior.
- [ ] **T-PR2-017 RED**: Run `dotnet test --filter ScoringEngine`; Art. II must stay green.
- [ ] **T-PR2-017 GREEN**: Do not touch scoring logic.
- [ ] **T-PR2-018 RED**: Run `/adapt` tests; accepted baseline failures only.
- [ ] **T-PR2-018 GREEN**: No `/adapt` source coupling.
- [ ] **T-PR2-019 RED**: Snapshot/contract test: 022 response shape unchanged for fake.
- [ ] **T-PR2-019 GREEN**: Keep v2 response contract stable.
- [ ] **T-PR2-020 RED**: Run 009 auth-web e2e regression.
- [ ] **T-PR2-020 GREEN**: No auth-web changes.
- [ ] **T-PR2-021 RED**: Run 021 structured input regression.
- [ ] **T-PR2-021 GREEN**: No structured input regression.
- [ ] **T-PR2-022 REFACTOR**: Remove duplicate error mapping after tests are green.

### Phase 2.5: Quality Gates + Docs + Commit
- [ ] **T-PR2-023**: Defensive grep `NEXT_PUBLIC_MINIMAX*` → 0 new hits.
- [ ] **T-PR2-024**: Defensive grep `LLM_API_KEY` tracked source → 0 new hits.
- [ ] **T-PR2-025**: Defensive grep logged `Authorization`/`x-api-key` → 0 new hits.
- [ ] **T-PR2-026**: Defensive grep `tool_use|thinking` in `MinimaxLlmFeedbackClient.cs` → 0 hits.
- [ ] **T-PR2-027**: Defensive grep `stream=true` → 0 hits.
- [ ] **T-PR2-028**: Defensive grep OpenAI chat format in feedback provider → 0 hits.
- [ ] **T-PR2-029**: Update `BuildCv-api/specs/000-INDEX.md` row 024 PR2 status.
- [ ] **T-PR2-030**: Commit `test(llm): cubrir dispatch minimax y errores provider`.
- [ ] **T-PR2-031**: Commit `feat(llm): integrar provider minimax en feedback`.
- [ ] **T-PR2-032**: Fresh review + merge api PR2 → api/main with `--no-ff`.

### PR2 verification commands
```bash
dotnet format --verify-no-changes
dotnet build BuildCv.slnx -c Release
dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~Minimax"
dotnet test --filter "FullyQualifiedName~ScoringEngine"
dotnet test --filter "FullyQualifiedName~Adapt"
dotnet test --filter "FullyQualifiedName~PiiRedactor"
```

### PR2 acceptance criteria
- [ ] MiniMax dispatch works; fake regression unchanged.
- [ ] `MaxInputLength`, `MaxOutputTokens`, redaction toggle, retry-after, timeout, and all provider error mappings work.
- [ ] Score `2.0.0`, `/adapt`, 009 auth-web, 021 structured input, and 022 endpoint contract remain intact.

## 6. PR3 Web Tasks — Optional type/display drift or skip

### Default: SKIPPED unless drift is found
- [ ] **T-PR3-000 INSPECT**: Inspect BFF, `lib/api/llm.ts`, and `<LlmFeedbackPanel>` for provider/model literal drift.
- [ ] **T-PR3-001 DECISION**: If web already accepts provider/model, mark PR3 SKIPPED.
- [ ] **T-PR3-002 DOCS**: If skipped, commit `docs(024-minimax): registrar PR3 omitido por contrato web intacto`.
- [ ] **T-PR3-003 ALTERNATE**: If drift exists, run conditional tasks.

### Conditional tasks only if drift detected
- [ ] **T-PR3-003 RED**: Test `LlmFeedbackResponse.provider` accepts `minimax` or string union.
- [ ] **T-PR3-004 RED**: Test panel displays provider/model from backend without assuming fake.
- [ ] **T-PR3-005 GREEN**: Widen `BuildCv-web/lib/api/llm.ts` provider/model types.
- [ ] **T-PR3-006 GREEN**: Optional UI label for MiniMax, preserving copy honesty.
- [ ] **T-PR3-007 REFACTOR**: Remove duplication.
- [ ] **T-PR3-008**: Commit `test(llm): cubrir contrato minimax en web` if needed.
- [ ] **T-PR3-009**: Commit `feat(llm): ajustar contrato web para minimax` if needed.
- [ ] **T-PR3-010**: Fresh review + merge web PR3 → web/main with `--no-ff`.

### PR3 verification if executed
```bash
pnpm lint
pnpm test
pnpm build
pnpm typecheck
node scripts/check-endpoint-drift.mjs
pnpm exec playwright test e2e/account-flow.spec.ts e2e/user-menu-pr8.spec.ts e2e/a11y-auth-pr8.spec.ts e2e/endpoint-drift.spec.ts
```

### PR3 acceptance criteria
- [ ] Web contract remains compatible if drift exists.
- [ ] 009 e2e + 021 landing regression green.
- [ ] Endpoint drift clean.

## 7. RED → GREEN → REFACTOR Plan

| Stage | Action |
|---|---|
| RED | Write the failing test first; compile failure counts as RED. |
| GREEN | Implement the minimum behavior to pass. |
| REFACTOR | Clean names/location/duplication without behavior changes. |

Discipline: no GREEN without RED; no suppressions (`@ts-ignore`, `eslint-disable`, `pragma warning disable`, `[Skip]`). Avoid loose mocks; use deterministic fakes or a hardcoded `HttpMessageHandler` test double.

## 8. Cross-Repo Gates

- [ ] **G-1**: 022 fake provider unchanged.
- [ ] **G-2**: `LlmFeedback:Provider=fake` default safe.
- [ ] **G-3**: `Provider=minimax` requires server-side `ApiKey`.
- [ ] **G-4**: 0 `NEXT_PUBLIC_MINIMAX_API_KEY`.
- [ ] **G-5**: 0 `NEXT_PUBLIC_LLM_API_KEY`.
- [ ] **G-6**: 0 real MiniMax HTTP calls in CI.
- [ ] **G-7**: 0 secrets tracked.
- [ ] **G-8**: PII redacted before provider call.
- [ ] **G-9**: Logs sanitized metadata-only.
- [ ] **G-10**: Score deterministic intact (`ScoringEngine.Version=2.0.0`).
- [ ] **G-11**: `/adapt` untouched.
- [ ] **G-12**: 009 auth-web untouched.
- [ ] **G-13**: 022 BFF/UI unchanged unless PR3 needed.
- [ ] **G-14**: Endpoint drift clean.
- [ ] **G-15**: Domain purity intact.

## 9. Verification Commands

### BuildCv-api
```bash
git status --short
dotnet format --verify-no-changes
dotnet build BuildCv.slnx -c Release
dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~Minimax"
dotnet test --filter "FullyQualifiedName~ScoringEngine"
dotnet test --filter "FullyQualifiedName~Adapt"
dotnet test --filter "FullyQualifiedName~PiiRedactor"
dotnet list src/BuildCv.Domain package references
```

### Defensive greps (api)
```bash
grep -rn "NEXT_PUBLIC_MINIMAX_API_KEY" src/BuildCv.Application/ src/BuildCv.Infrastructure/ src/BuildCv.Api/
grep -rn "NEXT_PUBLIC_LLM_API_KEY" src/BuildCv.Application/ src/BuildCv.Infrastructure/ src/BuildCv.Api/
grep -rn "LLM_API_KEY" src/BuildCv.Application/ src/BuildCv.Infrastructure/ src/BuildCv.Api/
grep -rn "sk-" src/BuildCv.Application/ src/BuildCv.Infrastructure/ src/BuildCv.Api/
grep -rn "ApiKey=" src/BuildCv.Application/ src/BuildCv.Infrastructure/ src/BuildCv.Api/
grep -rn "Authorization\|x-api-key" src/BuildCv.Infrastructure/LlmFeedback/ src/BuildCv.Application/
grep -rn "LogInformation.*Cv\b\|LogInformation.*Job\b\|LogInformation.*Prompt\b" src/BuildCv.Infrastructure/LlmFeedback/
grep -rn "tool_use\|function_call\|stream=true\|OpenAI" src/BuildCv.Infrastructure/LlmFeedback/
grep -rn "pragma warning disable\|SuppressMessage\|FakeItEasy\|Moq" src/BuildCv.Application/ src/BuildCv.Infrastructure/ src/BuildCv.Api/
```

### BuildCv-web (if PR3 executed)
```bash
pnpm lint
pnpm test
pnpm build
pnpm typecheck
pnpm exec vitest run lib/api/llm
node scripts/check-endpoint-drift.mjs
pnpm exec playwright test e2e/account-flow.spec.ts e2e/user-menu-pr8.spec.ts e2e/a11y-auth-pr8.spec.ts e2e/endpoint-drift.spec.ts
grep -rn "NEXT_PUBLIC_MINIMAX\|NEXT_PUBLIC_LLM" app/ lib/ components/
grep -rn "@ts-ignore\|eslint-disable" app/ lib/ components/
```

## 10. Security / Secret Gates

- [ ] **S-1**: 0 API keys in repo, tracked configs, tests, comments, snapshots, specs.
- [ ] **S-2**: `appsettings.Development.json` remains untracked/gitignored.
- [ ] **S-3**: 0 `NEXT_PUBLIC_*` LLM/provider secrets.
- [ ] **S-4**: 0 provider calls in CI; fake handler only.
- [ ] **S-5**: 0 raw prompts/CV/job/provider bodies in logs.
- [ ] **S-6**: 0 leaked old MiniMax key reference; revoked key is never reused.
- [ ] **S-7**: `ApiKey` only from backend env/user-secrets/gitignored local config.
- [ ] **S-8**: Exceptions/responses never reveal key status/value beyond sanitized unavailable.
- [ ] **S-9**: Headers are never logged.
- [ ] **S-10**: Specs contain no secret values.

## 11. Rollback Plan

- **PR1 api**: revert merge with `git revert -m 1 <merge-sha>` or reset before push/shared use only.
- **PR2 api**: revert PR2 first, then PR1 if the foundation is unsafe.
- **PR3 web**: revert only if applied.
- Kill switches: `LlmFeedback:Enabled=false` disables feedback; `LlmFeedback:Provider=fake` disables real provider without code.
- Safe fallback: MiniMax failure returns degraded `AI feedback no disponible`; score, `/adapt`, 009 auth-web, and 022 fake remain untouched.

## 12. Traceability Matrix

| Req ID | Description | PR | Tasks | Tests | Gates | Risk Mitigated |
|---|---|---|---|---|---|---|
| FR-001..002 | fake/minimax dispatch | PR1+PR2 | T-PR1-022, T-PR2-001..005 | unit+integration | G-1..G-3 | wrong provider |
| FR-003..007 | BaseUrl/ApiKey/Model/caps | PR1 | T-PR1-001..011 | options/request | G-3,G-7 | hardcoded/secrets |
| FR-008..011 | Anthropic text-only + redaction | PR1 | T-PR1-006..008,T-PR1-020 | request+redaction | G-8 | PII/tools |
| FR-012..014 | v2 parsing + degraded | PR1 | T-PR1-013..015 | parser | G-9 | contract drift |
| FR-015..021 | error mapping/no real CI | PR1+PR2 | T-PR1-016..019,T-PR2-009..015 | error tests | G-4..G-7,G-15 | leak/outage |
| FR-022..026 | score/adapt/022/009/web intact | verify | T-PR2-016..021 | regression | G-1,G-10..G-14 | BC break |
| NFR-SEC/PRIV | no secrets, PII minimization | PR1+PR2 | T-PR1-020..028,T-PR2-023..028,S-1..S-10 | grep+logs | G-4..G-9 | secret/PII leak |
| NFR-DET/BC | deterministic score + regressions | verify | T-PR2-017..021 | scoring/e2e | G-10..G-13 | Constitution |
| NFR-COST/PERF | caps, rate limit, timeout, no retries | PR1+PR2 | T-PR1-009..011,T-PR2-006..015 | cost/error | G-6,G-15 | cost/timeout |
| CR-CONST-II..IX | Constitution compliance | verify | all regression gates | build/test/review | all gates | legal/product |
| AC-001..020 | acceptance criteria | PR1+PR2(+PR3) | all tasks | all tests | all gates | all risks |

## 13. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| PII leak | Med | PiiRedactor + sanitized logs + no prompts in logs |
| Cost overrun | Low | 32000 input, 1024 output, 30/60 rate limit, 0 retries |
| MiniMax outage | Med | degraded fallback + score intact |
| API key leaked | Low | server env only + greps + no `NEXT_PUBLIC_*` |
| Hallucination | Med | separate panel/disclaimer + deterministic score source of truth |
| Prompt injection | Low | DATA prompt + no tools + text-only |
| Model drift | Low | configurable `LlmFeedback:Model` |
| Provider 429 | Med | local rate limit + preserve provider `Retry-After` |
| Timeout | Med | cancellation + degraded response |
| Malformed response | Low | strict parser + degraded fallback |
| CI live call | Low | fake `HttpMessageHandler` + no secret CI |
| 022 regression | Low | fake regression tests and default fake |
| 009 regression | Low | auth-web e2e and no scope creep |

## 14. Deferred / Out of Scope

- 023 Ollama real provider.
- Streaming responses.
- Thinking block mapping.
- Multi-provider UI selector.
- Persistent user LLM preference.
- Advanced cost analytics dashboard.
- Model listing UI.
- MiniMax real smoke in CI.
- Payment integration / billing credits UI.
- A11y global audit 020.
- Deploy automation.
- Baseline `/adapt` auth failure fix.
- 009 auth-web changes.
- 022 UI changes unless contract drift.
- ScoreEngine changes.
- MiniMax-M3 default assumption.
- Free tier assumption.
- Exact MiniMax RPM/TPM assumption.

## 15. Ready Checklist

- [x] Tasks concrete enough for `sdd-apply 024 PR1`: YES.
- [x] Blocking questions: NO; 3 non-blocking owner-configurable questions remain (model availability, RPM/TPM, pricing).
- [x] Owner decision needed before apply: NO; 12 decisions locked.
- [x] Split paths documented: PR1a config/DI/options + PR1b client/parser/tests if >400; PR2a dispatch/validation + PR2b error/regression if >400.
- [x] Security gates explicit: YES (S-1..S-10, G-1..G-15).
- [x] PRs under 400 production LOC forecast: YES (PR1 ~250, PR2 ~150, PR3 0-100).
- [x] Provider real disabled from CI: YES (fake `HttpMessageHandler`, no secrets).
- [x] Fake provider preserved: YES (default fake + 022 regression tests).
- [x] 022 archived state preserved: YES (no tags changed, no archive/report rewrite).

**Conclusion**: Ready for `sdd-apply 024 PR1`.
