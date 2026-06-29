# Proposal: 024-minimax-real-provider

## 1. Intent

Enable optional MiniMax cloud feedback after 022 fake MVP. Owner has no GPU, so MiniMax is viable. Success = foundation for real feedback when paid/credits config is enabled.

## 2. Scope

### In Scope
- **PR1 api**: `MinimaxLlmFeedbackClient`, options (`BaseUrl`, `ApiKey`, `MaxInputLength`, `MaxOutputTokens`), conditional DI, appsettings, handler unit tests.
- **PR2 api**: endpoint dispatch by `Provider=minimax`, max-input validation, integration + contract tests.
- **PR3 web (optional)**: type-only if BFF needs `provider/model` widening.

### Out of Scope
- 023 Ollama; multi-provider real; streaming; thinking blocks; persistent preference.
- 009 privacy/consent UI; external billing UI; 010 payments; 020 a11y.
- 009 auth-web changes; 022 fake breakage; mandatory deploy.

## 3. Capabilities

### New Capabilities
- `llm-feedback-minimax-provider`: optional MiniMax provider for `LlmFeedbackResponse` v2: config, Anthropic text-only, degraded fallback, cost controls.

### Modified Capabilities
- `llm-feedback`: minimal spec change; handler adds optional `Provider=minimax`; default `Provider=fake` intact.

## 4. Approach

Reuse 022: port, options, handler, `PiiRedactor`, rate-limit, logs, DATA boundary. Add `MinimaxLlmFeedbackClient` via `IHttpClientFactory`. POST non-streaming Anthropic subset to `{BaseUrl}/v1/messages`: `{model,max_tokens,system,messages:[{role:"user",content:[{type:"text",text}]}]}`. Parse text blocks as JSON, stamp `provider="minimax"`, configured model, ISO time, `degraded=false`; ignore reasoning; reject tools/malformed. DI only for `Provider=minimax`. Web unchanged. Tests: handler/WireMock.Net; no real provider in CI.

## 5. Affected Areas

| Area | Impact | Description |
|---|---|---|
| `BuildCv-api/src/BuildCv.Application/Features/LlmFeedback/LlmFeedbackOptions.cs` | Modified | Add BaseUrl/ApiKey/caps. |
| `BuildCv-api/src/BuildCv.Application/Features/LlmFeedback/GenerateLlmFeedbackHandler.cs` | Modified | Dispatch/validation. |
| `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/MinimaxLlmFeedbackClient.cs` | NEW | HTTP adapter. |
| `BuildCv-api/src/BuildCv.Infrastructure/DependencyInjection.cs` | Modified | Conditional client + HttpClient. |
| `BuildCv-api/src/BuildCv.Api/appsettings.json` | Modified | Safe defaults; no key. |
| `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/Prompts/v1/system.md` | Optional | Structured JSON prompt. |
| `BuildCv-api/tests/BuildCv.Infrastructure.Tests/LlmFeedback/MinimaxLlmFeedbackClientTests.cs` | NEW | Unit tests. |
| `BuildCv-api/tests/BuildCv.Api.IntegrationTests/LlmFeedbackEndpointMinimaxTests.cs` | NEW | Endpoint tests. |
| `BuildCv-web/lib/api/llm.ts` | UNCHANGED | Reuse. |
| `BuildCv-web/app/api/llm/feedback/route.ts` | UNCHANGED | Reuse. |
| `BuildCv-web/components/analyzer/llm-feedback-panel.tsx` | UNCHANGED | Reuse. |

## 6. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| PII leak | Med | `PiiRedactor`; sanitized logs. |
| Cost overrun | Low | 32000 chars, 1024 tokens, rate limit, timeout. |
| MiniMax outage | Med | degraded; score intact. |
| Key leak | Low | env/server only; no `NEXT_PUBLIC_*`. |
| Hallucination | Med | AI disclaimer; score deterministic. |
| Prompt injection | Low | DATA boundary; no tools. |
| Model drift | Low | configurable model + logs. |
| Rate limit hit | Med | 429 mapping + `Retry-After`. |
| Timeout | Med | `CancellationToken` + degraded. |
| Malformed response | Low | strict parser + degraded. |

## 7. Rollback Plan

- Revert PRs independently.
- Operate kill switch: `LlmFeedback:Enabled=false`; default remains false.
- MiniMax failure returns `degraded=true`, empty arrays, summary `AI feedback no disponible`; score intact.
- Critical rollback: API tag `022-llm-integration-local-mvp-v1.0` (`00f64ed`). Web unchanged; fake remains.

## 8. Dependencies

- 022: `ILlmFeedbackClient`, fake provider, `PiiRedactor`, `LlmFeedbackRateLimitFilter`.
- Constitution v1.2.0, especially Art. II/III/V/IX.
- Existing `IAiClient`/`MinimaxAiClient` patterns only, not direct reuse.
- MiniMax Anthropic Messages text-only; paid/credits assumption.
- Owner config: `LlmFeedback__Provider=minimax`, `LlmFeedback__ApiKey`, optional `BaseUrl`/`Model`.

## 9. Success Criteria

- [ ] `Provider=minimax` activates conditional DI.
- [ ] ApiKey env-only; no tracked secrets or `NEXT_PUBLIC_*`.
- [ ] Defaults: `BaseUrl=https://api.minimax.io/anthropic`, `Model=MiniMax-M2.7`, `MaxInputLength=32000`, `MaxOutputTokens=1024`.
- [ ] Adapter reuses `ILlmFeedbackClient`, `PiiRedactor`, sanitized logger.
- [ ] Request is Anthropic Messages text-only; no streaming/tools/thinking mapping.
- [ ] Response maps `LlmFeedbackResponse` v2, `provider="minimax"`, model.
- [ ] Errors: 401 unavailable; 429 rate_limited + `Retry-After`; 5xx/timeout/malformed unavailable/degraded.
- [ ] Failure returns degraded empty arrays + summary; score `2.0.0` intact.
- [ ] Tests use handler/MSW/WireMock only; no real MiniMax CI.
- [ ] 022 fake + 009 auth-web intact; zero suppressions/fake mocks.
- [ ] Gates green: format/build/test/typecheck/endpoint-drift; reviews approve; verify passes.
