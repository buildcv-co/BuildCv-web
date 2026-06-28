# Fresh Review — 022 PR2 API feedback endpoint

Date: 2026-06-28
Branch: `feature/022-llm-local-pr2-api-feedback-endpoint`

## Verdict

**APPROVE_WITH_MINOR_NOTES** — PR2 scope is implemented and reviewable. The required `/adapt` command still fails only in the already-documented baseline test `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` (`expected 401`, `actual 200`), reproduced before PR2 and not attributable to touched PR2 paths.

## Adversarial checklist

- BLOCKER 0 ✓
- MAJOR 0 ✓
- endpoint correcto ✓ — `POST /api/v1/llm/feedback`; covered statuses: 200, 400, 403, 429, 500; timeout/provider failures degrade to 200 with `degraded=true` per tasks.
- disabled default seguro ✓ — `LlmFeedback:Enabled=false` remains default.
- fake provider únicamente ✓ — only `FakeLlmFeedbackClient` is registered for `LlmFeedback:Provider=fake`.
- no HTTP ✓ — no `HttpClient` added to `FakeLlmFeedbackClient.cs`.
- redacción PII antes del provider ✓ — handler builds redacted CV/job text before provider boundary.
- redaction_failure no llama provider ✓ — unit test asserts provider calls remain 0.
- logs sanitizados ✓ — request/degraded logs use metadata only; tests assert raw CV/job tokens absent.
- dedicated rate limit ✓ — `LlmFeedbackRateLimitFilter`, separate from `/adapt` and named policies.
- timeout/fallback ✓ — linked cancellation token + degraded fallback with `degraded=true`.
- score unchanged ✓ — `ScoringEngine.Version = "2.0.0"` and scoring tests pass.
- no Art. II regression ✓ — no score engine source touched.
- no secret/PII leak ✓ — focused defensive greps on PR2 paths pass.
- no scope creep ✓ — no `/score`, `/adapt`, auth-web, real provider, Ollama, API key, or web functional code.
- no web funcional tocado ✓ — only SDD docs under `BuildCv-web/specs/022-...` changed.
- baseline `/adapt` not treated as regression ✓ — same known failure documented from PR1 baseline acceptance.

## Minor notes

- Broad defensive grep over the whole repository still reports pre-existing matches (`HttpClient` in unrelated auth/payments/invoicing adapters, EF-generated `#pragma warning disable`, historical `/user/consent` docs). Focused grep over PR2 new paths passes.
- `dotnet list src/BuildCv.Domain package references` is rejected by the installed .NET CLI syntax; equivalent .NET 10 command `dotnet list src/BuildCv.Domain package` returns no packages.

## Evidence

- `dotnet format --verify-no-changes` → 0
- `dotnet build BuildCv.slnx -c Release` → 0 warnings, 0 errors
- `dotnet test --filter "FullyQualifiedName~LlmFeedback|FullyQualifiedName~PiiRedactor|FullyQualifiedName~FakeLlm"` → 35 passing
- `dotnet test --filter "FullyQualifiedName~ScoringEngine"` → 18 passing
- `dotnet test --filter "FullyQualifiedName~Adapt"` → baseline failure only (`RequireCreditsFilterTests.Adapt_without_jwt_returns_401`)
- `dotnet list src/BuildCv.Domain package` → no packages
