# Fresh Review — 024 MiniMax Real Provider PR2

Date: 2026-06-29  
Scope: `BuildCv-api` PR2 (`feature/024-minimax-pr2-api-dispatch`) — handler/endpoint dispatch integration, validation, provider error mapping, and regressions.

## Adversarial checklist

1. Provider=minimax dispatch covered by endpoint-level minimax contract test ✓
2. Provider=fake regression intact through existing endpoint contract ✓
3. `Provider=invalid` remains startup-safe via PR1 DI validation ✓
4. `Provider=minimax` + `Enabled=false` disabled path remains first ✓
5. Missing/unavailable provider errors map to sanitized 502 ✓
6. `MaxInputLength` is enforced before provider boundary ✓
7. `MaxOutputTokens` remains covered by PR1 request tests ✓
8. `RedactionEnabled=false` bypasses PII redaction only by config ✓
9. MiniMax endpoint success returns 200 + v2 contract ✓
10. Malformed MiniMax response remains degraded in client tests ✓
11. 401/403 stay sanitized and do not expose key values ✓
12. Provider 429 maps to HTTP 429 and preserves `Retry-After` ✓
13. Provider 429 without retry metadata maps to 429 without retry metadata ✓
14. 500-504 stay sanitized through unavailable mapping ✓
15. 022 fake provider unchanged ✓
16. ScoringEngine regression green; `ScoringEngine.Version = "2.0.0"` unchanged ✓
17. `/adapt` source untouched; known baseline test failure preserved, not PR2 regression ✓
18. 009 auth-web untouched ✓
19. 021 structured input untouched ✓
20. No real MiniMax provider calls in CI ✓
21. No API key, no `NEXT_PUBLIC_*`, no tracked secret ✓
22. Domain purity intact; no Domain package references ✓

## Notes

- `dotnet test --filter "FullyQualifiedName~Adapt"` still fails on the accepted baseline `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` (expected 401, actual 200). PR2 does not touch `/adapt`, credits filters, or auth-web.
- Broad defensive greps still find historical/non-PR2 matches: tool/function markers in 022 prompt-boundary/adapt code, OpenAI references in `/adapt`, and EF-generated migration suppressions. Focused PR2 feedback paths are clean for new forbidden additions.
- Production LOC impact is 33 insertions / 3 deletions, well below the 400 LOC cap.

## Verdict

APPROVE_WITH_MINOR_NOTES
