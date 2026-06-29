# Fresh Review — 024 MiniMax Real Provider PR1

Date: 2026-06-29  
Scope: `BuildCv-api` PR1 (`feature/024-minimax-pr1-api-client`) — options, `MinimaxLlmFeedbackClient`, DI, appsettings defaults, unit tests.

## Adversarial checklist

- BLOCKER 0 ✓
- MAJOR 0 ✓
- `MinimaxLlmFeedbackClient` implements `ILlmFeedbackClient` ✓
- `Provider=fake` default intact ✓
- `Provider=minimax` selects the MiniMax client via DI ✓
- ApiKey is server-side only ✓
- No real API key ✓
- No secrets tracked ✓
- No `NEXT_PUBLIC_*` secrets ✓
- No real provider in CI ✓
- Tests use in-process `HttpMessageHandler` fakes ✓
- Request shape is Anthropic-compatible text-only ✓
- No stream/tool-use/thinking/multimodal/OpenAI request fields ✓
- Response maps to `LlmFeedbackResponse` v2 ✓
- Error mapping is sanitized ✓
- PII-redacted payload is used before provider call ✓
- Logs are metadata-only ✓
- Score unchanged ✓
- Domain purity intact ✓
- `/adapt` untouched ✓
- 009 auth-web untouched ✓
- 022 fake provider intact ✓
- No scope creep ✓

## Notes

- `dotnet test --filter "FullyQualifiedName~Adapt"` still shows the accepted baseline failure `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` (expected 401, actual 200). This is documented from 022 as pre-existing and not caused by PR1; PR1 does not touch `/adapt` source.
- Broad repository greps still find historical `sk-` examples in docs and EF-generated migration suppressions. Focused PR1 source/test paths are clean.
- Production LOC remains under cap: 244 insertions in production/config/docs paths before merge.

## Verdict

APPROVE_WITH_MINOR_NOTES
