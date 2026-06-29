# Exploration: 024 — MiniMax Real Provider for LLM Feedback

> Change: `024-minimax-real-provider`  
> Artifact home: `BuildCv-web/specs/024-minimax-real-provider/`  
> Scope: exploration only. No code, proposal, spec, design, or tasks created.  
> Constitution: `BuildCv-api/.specify/memory/constitution.md` v1.2.0 applies, especially Art. II, III, V, VI, VII, IX.  
> Security note: no API keys or secret values are stored in this artifact.

## 1. Current State (from 022)

022 shipped and archived an optional LLM feedback MVP with a clean feedback-only path separated from deterministic scoring. The shipped API path is `POST /api/v1/llm/feedback`; the shipped web path is same-origin `POST /api/llm/feedback`. The browser never talks directly to the backend and never sees provider secrets.

The current abstraction is ready for a real provider. `ILlmFeedbackClient` in `BuildCv-api/src/BuildCv.Application/Features/LlmFeedback/ILlmFeedbackClient.cs` exposes one method: `Task<LlmFeedbackResponse> GenerateAsync(LlmFeedbackContext context, CancellationToken ct = default)`. The handler depends only on that port, not on MiniMax, Anthropic, OpenAI, SDK types, or HTTP details. This preserves Clean Architecture (Art. VI): Application owns the port and Infrastructure owns provider adapters.

The shipped provider is `FakeLlmFeedbackClient`. It is deterministic, offline, and has no HTTP or API key. It builds a 10-field `LlmFeedbackResponse` with `summary`, `strengths`, `risks`, `suggestions`, `missingKeywords`, `questions`, `provider`, `model`, `generatedAt`, and `degraded`. It uses confidence markers from 021: `user_confirmed` and `explicit` markers become strengths; `inferred` markers become risks; missing job requirements become suggestions. It uses `ILlmFeedbackClock` for `generatedAt` so tests stay deterministic.

`LlmFeedbackOptions` currently contains `Enabled`, `Provider`, `Model`, `TimeoutMs`, `RateLimit`, and `RedactionEnabled`. Defaults in `appsettings.json` are disabled fake: `Enabled=false`, `Provider=fake`, `Model=fake-local-v1`, `TimeoutMs=5000`, `RedactionEnabled=true`, and `RateLimit={RequestsPerWindow:30, WindowSeconds:60}`. There is no `LlmFeedback:ApiKey`, `LlmFeedback:BaseUrl`, `LlmFeedback:MaxInputLength`, or `LlmFeedback:MaxOutputTokens` yet. Those are the configuration gap for 024.

Security and resilience are already in place. `PiiRedactor` redacts email, phone, non-allowlisted URLs, and likely physical addresses before the provider boundary. Names are intentionally not redacted to preserve professional context. If redaction fails or input exceeds the current hard cap (`100_000` characters inside `PiiRedactor`), the handler returns `redaction_failure` 500 and never calls the provider. The prompt template `BuildCv.Infrastructure/LlmFeedback/Prompts/v1/system.md` states that CV and job content are DATA and that embedded instructions must not be followed.

`GenerateLlmFeedbackHandler` already implements the main fallback behavior: disabled/session toggle returns 403, redaction failure returns 500, provider timeout or provider exception returns HTTP 200 with `degraded=true`, empty arrays, and summary `AI feedback no disponible`. The deterministic score remains intact (Art. II). Current implementation catches broad provider exceptions instead of using a full typed exception hierarchy; 024 can either keep this simple result model or introduce typed provider exceptions only where they pay their cost.

`LlmFeedbackRateLimitFilter` implements the dedicated feedback rate limit: 30 requests per 60 seconds by authenticated user id or IP fallback, with 429 and `Retry-After`. Logging is metadata-only: redacted CV/job lengths, provider, model, latency/failure category, and trace id. It must not log CV content, job content, prompts, provider response text, token bodies, raw provider errors, API keys, Authorization headers, or PII.

The Web side should need no functional change for 024. `BuildCv-web/app/api/llm/feedback/route.ts` proxies to the API and sanitizes errors. `BuildCv-web/lib/api/llm.ts` maps success/degraded/disabled/rate-limited/timeout/unavailable/error states. `components/analyzer/llm-feedback-panel.tsx` renders provider/model metadata from the backend response. If 024 changes provider string from literal `fake` to `minimax`, TypeScript type widening may be needed later, but the BFF and panel architecture already fit.

Provider real gap: 022 intentionally shipped fake-only. `DependencyInjection.RegisterLlmFeedbackClient` accepts only `fake` and throws for any other `LlmFeedback:Provider`. 024’s core work is to add an Infrastructure adapter for `Provider=minimax`, new server-side config, and tests with no real MiniMax calls in CI.

## 2. MiniMax Integration Options

| Option | Approach | Pros | Cons | Complexity |
|---|---|---|---|---|
| A | Reuse existing `BuildCv.Infrastructure.Ai.MinimaxAiClient` from `/adapt` | Existing MiniMax implementation, existing `HttpClient` pattern, existing `MinimaxSettings`, already knows model/max token config shape, lower apparent code volume | It implements `IAiClient`, not `ILlmFeedbackClient`; it targets `/adapt`, JSON mode, OpenAI-compatible `/v1/chat/completions`, and `Ai:*` config; coupling feedback to adaptation would blur bounded contexts and config namespaces | Medium if wrapped; riskier architecture |
| B | Create new `MinimaxLlmFeedbackClient` implementing `ILlmFeedbackClient` | Clean separation; reuses 022 feedback port, redaction, timeout, fallback, rate-limit, logging; can target MiniMax Anthropic-compatible API exactly; no `/adapt` coupling; easiest to test with fake `HttpMessageHandler` | Some duplication with existing `MinimaxAiClient` request/response/error parsing patterns; new config keys and DI branch required | Medium |
| C | Direct HTTP client with no SDK, purpose-built for feedback | Full control over request, headers, parsing, error mapping, no extra NuGet dependency; aligns with current `MinimaxAiClient` direct HTTP style | Must manually parse response blocks, status codes, malformed response, token usage, and future compatibility; more tests needed | Medium-High |
| D | Use Anthropic SDK external dependency pointed at MiniMax base URL | Less manual request construction; MiniMax docs explicitly support Anthropic SDK via `ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic`; SDK understands Messages API concepts | Adds/expands SDK dependency surface; .NET SDK may not expose MiniMax-specific `thinking`/base URL behavior as cleanly; current `/adapt` already has Anthropic SDK but not for MiniMax; harder to keep provider-specific errors sanitized | Medium |

The existing `MinimaxAiClient` is important as a pattern, not as the direct implementation for feedback. It uses `HttpClient`, `PostAsJsonAsync`, `ReadFromJsonAsync`, `IOptions<MinimaxSettings>`, and metadata-only success logging. It currently defaults to `MiniMax-Text-01`, posts to `/v1/chat/completions`, sends `Authorization: Bearer <Ai:ApiKey>` via `DependencyInjection`, and validates structured output for `/adapt`. For 024, MiniMax docs now recommend the Anthropic-compatible path for this use case: base URL `https://api.minimax.io/anthropic` for SDKs, which corresponds to raw endpoint `https://api.minimax.io/anthropic/v1/messages`. The raw OpenAPI also documents `/anthropic/v1/messages` on server `https://api.minimax.io`.

## 3. Affected Areas (reuse from 022)

- `BuildCv-api/src/BuildCv.Application/Features/LlmFeedback/ILlmFeedbackClient.cs` — existing port; no shape change required.
- `BuildCv-api/src/BuildCv.Application/Features/LlmFeedback/LlmFeedbackOptions.cs` — add `BaseUrl`, `ApiKey`, `MaxInputLength`, and `MaxOutputTokens`; keep existing defaults safe.
- `BuildCv-api/src/BuildCv.Application/Features/LlmFeedback/GenerateLlmFeedbackHandler.cs` — keep redaction-first and timeout/fallback; optionally validate `MaxInputLength` before provider call; ensure degraded provider metadata uses configured provider/model rather than hardcoded `fake` when provider is `minimax`.
- `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/MinimaxLlmFeedbackClient.cs` — new adapter implementing `ILlmFeedbackClient`.
- `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/PiiRedactor.cs` — likely no behavior change required, except deciding whether `MaxInputLength` belongs here or in handler/options validation. Current redactor hard cap is 100,000 chars.
- `BuildCv-api/src/BuildCv.Infrastructure/LlmFeedback/Prompts/v1/system.md` — review and likely expand for structured JSON response, DATA boundary, no tools, no invention, and no score mutation. Do not include secrets or examples with real personal data.
- `BuildCv-api/src/BuildCv.Infrastructure/DependencyInjection.cs` — register `MinimaxLlmFeedbackClient` when `LlmFeedback:Provider=minimax`; add `HttpClient` registration with safe headers and base URL.
- `BuildCv-api/src/BuildCv.Api/appsettings.json` — add tracked safe defaults only: empty `ApiKey`, configurable `BaseUrl`, `MaxInputLength`, `MaxOutputTokens`; never include a secret value.
- `BuildCv-api/src/BuildCv.Api/appsettings.Development.json` — can contain local values only because `BuildCv-api/.gitignore` ignores `appsettings.Development.json`; still prefer user-secrets or env vars to avoid accidental exposure.
- `BuildCv-api/tests/BuildCv.Infrastructure.Tests/LlmFeedback/MinimaxLlmFeedbackClientTests.cs` — new unit/contract tests with a fake HTTP handler; no real MiniMax.
- `BuildCv-api/tests/BuildCv.Api.IntegrationTests/LlmFeedbackEndpointMinimaxTests.cs` — endpoint tests using `WebApplicationFactory` and injected fake provider or fake HTTP server/handler.
- `BuildCv-web/lib/api/llm.ts` — likely no behavior change; may need type widening from `provider: "fake"`, `model: "fake-local-v1"` to string or provider union.
- `BuildCv-web/app/api/llm/feedback/route.ts` and `components/analyzer/llm-feedback-panel.tsx` — no expected runtime changes.

## 4. Required Configuration

Required new/modified config keys:

```json
{
  "LlmFeedback": {
    "Enabled": false,
    "Provider": "fake",
    "BaseUrl": "https://api.minimax.io/anthropic",
    "Model": "fake-local-v1",
    "ApiKey": "",
    "TimeoutMs": 5000,
    "MaxInputLength": 32000,
    "MaxOutputTokens": 1024,
    "RateLimit": {
      "RequestsPerWindow": 30,
      "WindowSeconds": 60
    },
    "RedactionEnabled": true
  }
}
```

`LlmFeedback:Provider` already exists with default `fake`; 024 adds `minimax` as a valid value. `LlmFeedback:BaseUrl` is new and should default to `https://api.minimax.io/anthropic`, matching MiniMax Anthropic SDK docs. Raw HTTP should post to `{BaseUrl}/v1/messages`, so this default resolves to `https://api.minimax.io/anthropic/v1/messages`. If implementation instead stores `https://api.minimax.io` as base URL, the path must be `/anthropic/v1/messages`; choose one convention and test it.

`LlmFeedback:Model` already exists. For MiniMax it must be owner-configurable. Do not hardcode `MiniMax-M3` as a product decision. Docs list supported Anthropic-compatible models including `MiniMax-M3`, `MiniMax-M2.7`, `MiniMax-M2.7-highspeed`, `MiniMax-M2.5`, `MiniMax-M2.5-highspeed`, `MiniMax-M2.1`, `MiniMax-M2.1-highspeed`, and `MiniMax-M2`. The default model for real MiniMax should be explicitly chosen by the owner before design/apply.

`LlmFeedback:ApiKey` is new and server-side only. It must be empty in tracked config, supplied via `LlmFeedback__ApiKey`, user-secrets, Render env vars, or gitignored local development config. Never use `NEXT_PUBLIC_MINIMAX_API_KEY`, `NEXT_PUBLIC_LLM_API_KEY`, or any browser-exposed key.

`LlmFeedback:MaxInputLength` is new. Suggested default is 32,000 characters for redacted CV+job payload budget control. `LlmFeedback:MaxOutputTokens` is new. Suggested default is 1024 for feedback. MiniMax docs allow much larger outputs, but BuildCV feedback does not need that cost surface.

The existing custom env aliases are `LLM_FEEDBACK:*` in `DependencyInjection.ApplyEnvironmentAlias`, while .NET also naturally supports `LlmFeedback__ApiKey` / `LlmFeedback__BaseUrl` / `LlmFeedback__Model`. 024 should document and test the canonical .NET env format requested by the owner: `LlmFeedback__Provider=minimax`, `LlmFeedback__ApiKey`, `LlmFeedback__BaseUrl`, `LlmFeedback__Model`.

## 5. Security Model

- API key is server-side only. It lives in `LlmFeedback:ApiKey` resolved by backend configuration; never in web code, `NEXT_PUBLIC_*`, specs, snapshots, comments, or test fixtures.
- Tracked `appsettings.json` must contain only empty or safe defaults. `appsettings.Development.json` is gitignored in `BuildCv-api/.gitignore`, but user-secrets or env vars are safer for local development.
- Render/prod secrets should be configured outside the repo through environment variables: `LlmFeedback__ApiKey`, `LlmFeedback__BaseUrl`, `LlmFeedback__Model`, `LlmFeedback__Provider=minimax`.
- The redaction-first invariant from 022 remains mandatory (Art. III). CV and job are serialized, redacted, then passed to the provider boundary. If redaction fails, fail before provider call.
- Logs remain metadata-only: provider, model, latency, degraded/failure category, trace id, redacted payload lengths, and optionally token counts. No prompt text, response text, raw provider error body, Authorization header, API key, CV/job content, or PII.
- The prompt must treat CV/job as DATA and include no tool definitions. MiniMax supports tool use, but 024 must not send `tools` or `tool_choice:auto`; if tool_choice is sent, use `none` only if required.
- Cost controls are security controls: dedicated 30/60 local rate limit, provider timeout, input length cap, output token cap, and 0 aggressive retries.
- Constitution Art. IX requires honest privacy copy if a cloud provider receives CV/job content. Do not claim ZDR or “provider does not retain data” unless contractually verified.

## 6. Provider Contract

`MinimaxLlmFeedbackClient` should implement `ILlmFeedbackClient.GenerateAsync(LlmFeedbackContext context, CancellationToken ct)`. It should assume the handler already enforced `LlmFeedback:Enabled`, redaction, and timeout, but it should still fail fast when `Provider` is not `minimax`, `ApiKey` is missing, `BaseUrl` is invalid, `Model` is blank, or input exceeds `MaxInputLength` if that validation is placed in the adapter.

MiniMax docs confirm Anthropic-compatible Messages API. SDK docs use `ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic`; raw OpenAPI documents `POST /anthropic/v1/messages` on server `https://api.minimax.io`. For BuildCV config, use `LlmFeedback:BaseUrl=https://api.minimax.io/anthropic` and POST `BaseUrl + /v1/messages`.

Request body should be non-streaming and text-only:

```json
{
  "model": "<LlmFeedback:Model>",
  "max_tokens": 1024,
  "thinking": { "type": "disabled" },
  "system": "<prompt template v1>",
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "<redacted CV/job/score context as DATA>" }
      ]
    }
  ],
  "metadata": { "user_id": "<optional hashed/stable non-PII id if available>" }
}
```

Headers: `content-type: application/json`; API key as `x-api-key: <api_key>` or `Authorization: Bearer <api_key>`. MiniMax docs state both are accepted and Authorization takes precedence; Anthropic-compatible docs specifically list `x-api-key`, while broader OpenAPI recommends Bearer. Pick one and test it. If using `x-api-key`, do not log headers.

Response mapping: parse `content[]`. Use `text` blocks for the assistant answer. Ignore `thinking` blocks; never expose them to the UI or logs. Treat any `tool_use` block as malformed/unavailable because 024 sends no tools. The preferred response format is for the model to return strict JSON that maps to `LlmFeedbackResponse` fields: summary, strengths, risks, suggestions, missingKeywords, questions. The adapter then stamps `provider="minimax"`, `model=<configured or response model>`, `generatedAt=<clock.UtcNow or provider response time if trustworthy>`, and `degraded=false`.

Error mapping:

- 400 / 413: invalid or too large request. Map to validation or unavailable depending on whether the cause is local input validation or provider rejection.
- 401 / 403: missing/invalid key or permission/model access. Map to unavailable/degraded; do not reveal key details to the user.
- 404: model does not exist. Map to unavailable/degraded and log category `model_not_found` metadata only.
- 429: provider rate limit. Map to provider rate-limited/degraded. The existing endpoint-local 429 remains handled by `LlmFeedbackRateLimitFilter`; provider 429 should not leak provider body.
- 500 / 529: provider outage/overload. Map to unavailable/degraded.
- `OperationCanceledException` caused by timeout: existing handler maps to degraded `timeout`.
- Malformed JSON, missing text block, tool_use, invalid structured feedback: map to unavailable/degraded.

## 7. Failure / Fallback Behavior

When MiniMax fails, BuildCV should return 200 with `degraded=true`, empty arrays, and `summary="AI feedback no disponible"`. The deterministic score, keyword analysis, fix list, and engine version remain unchanged (Art. II). The UI already has degraded/unavailable states and a separate panel, so failure does not hide or alter deterministic output.

There must be no fallback from MiniMax to fake. This is a locked product decision: if the owner explicitly enables `LlmFeedback:Provider=minimax`, a fake response would be misleading. The fake provider remains available only when `Provider=fake` is configured.

`LlmFeedback:Enabled=false` is the kill switch for both fake and real provider states. It should return disabled behavior quickly without any provider call. `Provider=fake` remains a safe operational switch away from MiniMax if the real provider is unreliable or cost-risky.

Logs should record sanitized categories such as `timeout`, `provider_rate_limited`, `authentication_failed`, `model_not_found`, `malformed_response`, or `provider_unavailable`, plus provider/model/latency/traceId. Do not log provider raw body; MiniMax error bodies can include request details that should not become logs.

## 8. Testing Strategy (no provider real en CI)

- Unit tests: `BuildCv-api/tests/BuildCv.Infrastructure.Tests/LlmFeedback/MinimaxLlmFeedbackClientTests.cs` with a fake `HttpMessageHandler` or equivalent in-process handler. Validate URL, method, headers, body shape, system prompt inclusion, `max_tokens`, model, no tools, and no streaming.
- Response mapping tests: text block with valid JSON maps to `LlmFeedbackResponse`; thinking blocks are ignored; tool_use block fails; malformed JSON fails; missing content fails.
- Error mapping tests: 401, 403, 404, 429, 500, 529, timeout/cancellation, and 413. Tests assert sanitized exception/result categories and no raw body exposure.
- Integration tests: `BuildCv-api/tests/BuildCv.Api.IntegrationTests/LlmFeedbackEndpointMinimaxTests.cs` using `WebApplicationFactory` plus injected fake `ILlmFeedbackClient` or fake HTTP handler. No network calls.
- Config tests: binding for `LlmFeedback:Provider=minimax`, `BaseUrl`, `ApiKey`, `MaxInputLength`, and `MaxOutputTokens`; missing API key fails fast in the provider registration/client path when enabled.
- Contract tests: request shape compatible with MiniMax Anthropic Messages API (`model`, `system`, `messages`, `max_tokens`, optional `thinking.disabled`) and response shape stable for Web’s 10-field contract.
- Defensive greps: no secret-looking values in tracked code/specs; no `NEXT_PUBLIC_MINIMAX_API_KEY`; no `NEXT_PUBLIC_LLM_API_KEY`; no API key values in snapshots/comments; no tests hitting `api.minimax.io`.
- Manual smoke only: local owner-run `dotnet run` + curl with env vars outside repo, post-deploy smoke if needed. CI never uses real MiniMax and never requires an API key.

## 9. Cost Controls

- Reuse dedicated 022 rate limit: default 30 requests / 60 seconds, configurable via `LlmFeedback:RateLimit`.
- Reuse timeout: default `TimeoutMs=5000`; provider must honor `CancellationToken`.
- Add `MaxInputLength=32000` characters default for redacted CV+job+score prompt payload. Recommendation: return validation error before provider call rather than truncating silently, because truncation can produce misleading feedback. If truncation is chosen later, document the UI copy and log only lengths.
- Add `MaxOutputTokens=1024` default. MiniMax docs permit far larger limits, but feedback panel should be concise.
- No aggressive retries. Default 0 retries. A single retry only for transient 529/5xx could be considered later, but it doubles cost risk and should not be in MVP unless explicitly justified.
- Use standard service tier; do not set `service_tier=priority` by default because MiniMax pricing documents priority as 1.5x standard.
- Optional post-MVP: log token usage metadata (`input_tokens`, `output_tokens`, cache tokens) when returned by MiniMax, with no prompt/response content.
- Optional preflight: MiniMax supports token estimation at `POST /anthropic/v1/messages/count_tokens` for some models, but that adds an extra paid/latency surface. Character cap is enough for 024 MVP.

## 10. Risks

| Risk | Likelihood | Mitigation |
|---|---:|---|
| PII leak to MiniMax | Med | Reuse `PiiRedactor`; fail before provider on redaction failure; no raw logs |
| Cost overrun | Low | `MaxInputLength`, `MaxOutputTokens`, 30/60 rate limit, timeout, no aggressive retries |
| MiniMax outage or overload | Med | Degraded fallback; deterministic score remains available |
| API key leaked | Low | Server-side only config, env vars/user-secrets, gitignored dev config, defensive greps |
| Hallucination / non-deterministic text | Med | UI disclaimer; separate panel; score remains deterministic (Art. II) |
| Prompt injection from CV/job | Low | System prompt DATA boundary; no tools; redacted content blocks; no execution |
| Model drift | Low | Configurable `LlmFeedback:Model`; log provider/model metadata; owner controls default |
| Rate limit hit | Med | Local rate limit returns 429 + `Retry-After`; provider 429 degrades safely |
| Timeout | Med | `CancellationToken` + `TimeoutMs` degraded response |
| Malformed provider response | Low | Strict parser/contract tests; map to degraded unavailable |

## 11. Open Questions

1. What MiniMax model should be the owner-approved default for CV feedback? Docs currently list `MiniMax-M3` and M2.x variants, but 024 should keep `LlmFeedback:Model` configurable and not hardcode M3 without approval.
2. Does the owner want pay-as-you-go or Token Plan for production? MiniMax docs show pay-as-you-go LLM pricing and token plans, but this is an operational/billing decision.
3. Should the raw HTTP implementation send `x-api-key` or `Authorization: Bearer`? MiniMax accepts both; docs say Authorization takes precedence, while Anthropic compatibility examples use `ANTHROPIC_API_KEY` semantics.
4. Should response shaping use strict JSON in a text block, Anthropic-compatible tool use, or plain text parsed heuristically? Recommendation: strict JSON text block with no tools for 024.
5. Should `thinking` be explicitly disabled? For MiniMax-M3, docs say omitted means thinking off by default; for M2.x thinking cannot be disabled. Recommendation: send `thinking:{type:"disabled"}` where accepted and ignore any thinking blocks.
6. Should over-limit input be rejected with validation error or truncated? Recommendation: reject before provider call for honesty and cost predictability.

## 12. Recommendation

Recommended approach: **Option B — new `MinimaxLlmFeedbackClient` parallel to the existing `/adapt` `MinimaxAiClient`**.

Reasoning:

- It preserves 022’s feedback abstraction. `ILlmFeedbackClient` already models exactly what the feedback path needs.
- It avoids coupling `/llm/feedback` to `/adapt`. The existing `MinimaxAiClient` is scoped to `IAiClient`, adaptation prompts, structured output for CV adaptation, `Ai:*` config, and OpenAI-compatible chat completions. Feedback uses a different contract, rate/cost profile, prompt, and config namespace.
- It follows Clean Architecture (Art. VI): Application port stays stable; Infrastructure adds one adapter.
- It can still reuse patterns from `MinimaxAiClient`: typed settings via options, `HttpClient`, JSON serialization, DataAnnotations/strict DTO validation if useful, and metadata-only logging.
- It aligns with current MiniMax docs for Anthropic compatibility: `https://api.minimax.io/anthropic` plus `/v1/messages`, supported models list, `system`, `messages`, `max_tokens`, `thinking`, response `content[]`, and documented 401/403/429/529 error behavior.
- It is testable without real MiniMax by injecting a fake `HttpMessageHandler`, fake clock, and fake options.

Effort estimate: Medium, roughly 350 production LOC plus tests. Main production pieces are options additions, DI branch, provider DTOs/parser, prompt payload builder, and small handler metadata adjustments. No web runtime change expected beyond possible TypeScript type widening for provider/model.

Suggested PR breakdown:

1. **PR1 api — provider adapter foundation**: `LlmFeedbackOptions` updates, safe appsettings defaults, DI branch for `Provider=minimax`, `MinimaxLlmFeedbackClient`, prompt review, unit tests for request/response/error mapping.
2. **PR2 api — endpoint integration and resilience**: handler dispatch/metadata fixes, max input validation, integration tests through `POST /api/v1/llm/feedback`, defensive greps, no-real-provider CI guard.
3. **PR3 web — optional type-only follow-up**: only if needed, widen `LlmFeedbackResponse.provider/model` types and add adapter/panel tests that accept non-fake metadata. No BFF behavior change expected.

## 13. Ready for sdd-propose

Yes — ready for `sdd-propose`.

022 abstractions are sufficient: port, options, fake provider pattern, redaction-first handler, dedicated rate limit, timeout/degraded fallback, metadata-only logging, prompt DATA boundary, web BFF, adapter, and panel are all in place. The existing `/adapt` `MinimaxAiClient` confirms MiniMax is already integrated in the codebase, but it should be treated as an implementation pattern rather than reused directly for feedback.

Open questions to carry into proposal/design: 6. They are mostly owner/operational decisions around default model, billing mode, auth header convention, structured response mode, thinking behavior, and input-over-limit behavior.

The recommended 024 scope is backend-first and intentionally narrow: add optional MiniMax cloud provider for `LlmFeedback` only, behind `LlmFeedback:Provider=minimax`, with API key server-side only, no real provider in CI, no fallback to fake, no Ollama work, and no deterministic score changes.
