# Fresh Review — 022 PR1 API fake provider

Date: 2026-06-28
Branch: `feature/022-llm-local-pr1-api-fake-provider`

## Verdict

**BLOCKED** — implementation scope is correct, but merge is blocked because the required regression command `dotnet test --filter "FullyQualifiedName~Adapt"` failed in `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` (`expected 401`, `actual 200`). No merge to `api/main` was performed.

## Adversarial checklist

- BLOCKER 1 ✗ — required `/adapt` regression command failed.
- MAJOR 0 ✓ — PR1 implementation did not add public endpoint, real provider, HTTP, API key, or score mutation.
- fake provider determinista ✓
- config defaults correctos ✓ (`LlmFeedback:Enabled=false`, `Provider=fake`, `Model=fake-local-v1`, `TimeoutMs=5000`, `RedactionEnabled=true`)
- no provider real ✓
- no HTTP ✓ (`FakeLlmFeedbackClient.cs` has no `HttpClient`)
- no API key ✓
- Domain purity ✓ (`BuildCv.Domain` still has 0 package references)
- score unchanged ✓ (`ScoringEngine.Version = "2.0.0"`)
- no Art. II regression in implementation ✓
- no secret/PII leak in new LLM code ✓
- no scope creep ✓
- no endpoint creado todavía ✓

## Notes

- `appsettings.Development.json` is ignored by the API repository, so only tracked `appsettings.json` can be committed. The local ignored file was updated in the workspace but is not part of the branch diff.
- Defensive grep for suppressions reports pre-existing EF Core generated migration suppressions; no new suppressions were introduced by PR1.

## Addendum — 2026-06-28 (post-baseline-audit)

### Baseline failure independently reproduced on `api/main`

Orchestrator ran the failing test directly against `BuildCv-api/main @ 496a3c7` (pre-PR1 state) to confirm it is not a regression:

```
git checkout main
dotnet test --no-build -c Release --filter "FullyQualifiedName~RequireCreditsFilterTests.Adapt_without_jwt_returns_401"
→ Failed (expected 401, got 200) — SAME failure as on PR1 branch.
```

### Not attributable to PR1

- `git diff --stat main..feature/022-llm-local-pr1-api-fake-provider -- src/BuildCv.Application/Features/Adapt src/BuildCv.Api/Endpoints/Adapt src/BuildCv.Api/Endpoints/Credits src/BuildCv.Api/Filters/RequireCreditsFilter*` → 0 hits.
- PR1 source path does not touch `/adapt`, `RequireCreditsFilter`, auth-web, or `/score`.
- Baseline category already documented in `BuildCv-web/specs/009-auth-web/verify-report.md` ("34 known API integration failures, unchanged from first verify").

### Verdict (updated)

**APPROVE_WITH_MINOR_NOTES**

- **BLOCKER**: 0
- **MAJOR**: 0
- **MINOR**: 0
- **NIT**:
  - `/adapt` `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` failure is a pre-existing baseline, not introduced by PR1. Track as separate follow-up (`024-adapt-credits-fix` or similar) post-MVP if prioritized. Do NOT fix in PR1 (out of scope, would be scope creep).
  - `appsettings.Development.json` ignored by git (only tracked `appsettings.json` updated).
  - PR1 production LOC = 248 (forecast ~200, +24% but under 400 cap); test overhead from strict TDD cycle evidence.

### Notes

- Baseline failure should be tracked separately, not fixed in PR1.
- Merge + push approved (user option A: accept baseline + proceed).
