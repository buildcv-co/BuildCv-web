# Proposal: 022-llm-integration-local-mvp

## Intent

Add optional local-first LLM feedback. Success = foundation, fake provider, flags, tests, no Art. II regression.

## Scope

### In Scope
- **PR1 api**: fake provider, `LLM_*` flags, config tests.
- **PR2 api**: endpoint, PII redaction, logs, fallback, rate limit.
- **PR3 web**: BFF route, `lib/api/llm.ts`, unit tests.
- **PR4 web**: “AI Feedback” panel, toggle, states, a11y, fake e2e.

### Out of Scope
- PR5/PR6; deferred to `023-ollama-real-provider`.
- Feedback providers: Anthropic, OpenAI, Minimax.
- External costs/billing.
- Persistent user LLM preference.

## Capabilities

### New Capabilities
- `llm-feedback`: fake provider, endpoint, BFF, panel, limit, flags, toggle, logs, PII redaction, fallback.

### Modified Capabilities
- **None** — Art. II protects `scoring-engine`; `adapt`/`auth-web` intact.

## Approach

Score stays deterministic C#; LLM emits `LlmFeedbackResponse`. Default fake/offline; Ollama later. BFF proxy, panel, session toggle, rate limit, timeout, fallback.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `BuildCv-api/src/BuildCv.Application/Features/LlmFeedback/` | New | Port, contracts |
| `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/` | New | Fake provider + DI |
| `BuildCv-api/src/BuildCv.Api/Endpoints/LlmFeedbackEndpoint.cs` | New | Feedback endpoint |
| `BuildCv-api/src/BuildCv.Api/Filters/LlmFeedbackRateLimit.cs` | New | LLM rate limit |
| `BuildCv-api/src/BuildCv.Api/appsettings*.json` | Modified | `LLM_*` flags |
| `BuildCv-web/app/api/llm/feedback/route.ts` | New | BFF proxy |
| `BuildCv-web/lib/api/llm.ts` | New | Client adapter |
| `BuildCv-web/components/analyzer/llm-feedback-panel.tsx` | New | UI panel |
| `BuildCv-web/lib/copy/es.ts` | Modified | Copy keys |
| `BuildCv-web/components/analyzer/fix-list.tsx` | UNCHANGED | Deterministic only |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| PII leak | Med | Redact; sanitized logs |
| Prompt injection | Med | DATA rule; no tools |
| Score regression | Low | Art. II tests |
| Abuse | Med | Conservative limit |
| Timeout | Med | Unavailable; score visible |
| Contract drift | Low | Schema tests |

## Rollback Plan

- **PR-by-PR revert**: independent reverts.
- **Kill switch**: `LLM_ENABLED=false` disables endpoint/UI.
- **API**: remove endpoint without touching `/score` or `/adapt`.
- **Web**: remove panel; `<FixList>` unchanged.
- **Score**: never changed under Art. II.

## Dependencies

- `021-structured-cv-import-and-job-input` — confidence markers.
- `009-auth-web` — session/BFF pattern.
- `IAiClient` — pattern only.
- Constitution v1.2.0 — compliance.

## Success Criteria

- [ ] `LLM_ENABLED=false` default.
- [ ] Fake provider offline.
- [ ] BFF timeout/retry/fallback.
- [ ] Panel loading/unavailable/disabled.
- [ ] Score unchanged; Art. II tests pass.
- [ ] No secrets/tokens/PII in logs.
- [ ] Rate-limit tests pass.
- [ ] Session toggle e2e passes.
- [ ] CI never calls real provider.
- [ ] Gates green: lint, test, build, typecheck, endpoint-drift.
- [ ] 009/021 regressions green.
- [ ] Fake MVP works end-to-end.
- [ ] PR5-6 marked out-of-scope.
