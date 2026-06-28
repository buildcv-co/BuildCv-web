# Archive Report — 022-llm-integration-local-mvp

## 1. Summary

- **Change**: `022-llm-integration-local-mvp`
- **Final status**: **SHIPPED + ARCHIVED**
- **Verify verdict**: `PASS_WITH_NOTES`
- **MVP_BLOCKER**: 0
- **SHOULD_FIX_BEFORE_LAUNCH**: 0
- **READY_FOR_TAG**: yes
- **Tag cross-repo**: `022-llm-integration-local-mvp-v1.0` at SHIP commits (`00f64ed` api, `bb81e02` web).
- **Tag date**: 2026-06-28.

## 2. Shipped Scope

Cross-repo MVP shipped in 4 PRs:

- **PR1 api** (`85c85de`): contracts `LlmFeedback` + port + `FakeLlmFeedbackClient` + options + tests.
- **PR2 api** (`00f64ed`): endpoint `POST /api/v1/llm/feedback` + `PiiRedactor` + sanitized logs + dedicated rate limit + timeout/fallback + contract tests.
- **PR3 web** (`66757f4`): BFF `/api/llm/feedback` + `lib/api/llm.ts` adapter + 17 Vitest tests.
- **PR4 web** (`bb81e02` / `824df2b` INDEX): `<LlmFeedbackPanel>` with 9 states + `useSessionToggle` (`sessionStorage`) + a11y basics + e2e fake provider smoke + `FixList` unchanged regression.

Total production LOC across 4 PRs: ~1038 (api 556 + web 482). Tests added: ~73 (api 35 + web 38).

## 3. Commits Archived

- **BuildCv-api SHIP commit**: `00f64ed` — `merge: integrar PR2 de 022-llm-local en api`.
- **BuildCv-web SHIP commit**: `bb81e02` — `merge: integrar PR4 de 022-llm-local en web`.
- **Archive commit**: pending until committed.
- **Tag target**: SHIP commits, NOT archive commit (per 009/021 rule confirmed by INDEX convention).

## 4. Verification Evidence

Summary from `verify-report.md` (`PASS_WITH_NOTES`):

- 22/22 REQs PASS.
- 10/10 NFRs PASS.
- 9/9 Compliance PASS.
- 29 PASS + 3 PASS_WITH_NOTES of 32 AC (0 FAIL).
- 0 BLOCKER, 0 MVP_BLOCKER, 0 SHOULD_FIX_BEFORE_LAUNCH.
- 7 SAFE_DEFER_POST_MVP preserved.
- All runtime gates green: backend smoke (200/403/429/400), web smoke, 009 regression (11 pass, 5 skip), 021 regression (25 pass), endpoint drift PASS, defensive greps 0 actionable hits, `FixList` unchanged (0 changes), `ScoringEngine.Version=2.0.0` preserved.
- No secrets/tokens/PII in logs/console.

Archive-time note: `tasks.md` still contains stale unchecked planning/acceptance checkboxes from earlier phases, but `apply-progress.md`, `verify-report.md`, merge commits, and fresh reviews prove PR1-PR4 are complete. This archive followed the explicit orchestrator instruction to close 022 without functional changes and without editing task artifacts beyond the requested archive report and INDEX sync.

## 5. Deferred Post-MVP (SAFE_DEFER_POST_MVP — 7 items)

1. **023-ollama-real-provider** (PR5 Ollama + PR6 verify post-Ollama).
2. **Multi-provider feedback** (Anthropic, OpenAI, Minimax adapters for feedback).
3. **External billing/cost credits** (when an external provider is enabled).
4. **Persistent user LLM preference** (storage backend, cookies/db).
5. **Advanced prompt-injection adversarial suite** (if PR4 does not cover it).
6. **Production deploy smoke** (post-Render deployment).
7. **009 PR3 `/privacidad`** + **009 PR5 consent UI** (privacy policy + consent management).

## 6. Risks & Accepted Deviations

- **PR1 size deviation**: production 248 LOC, forecast ~200, +24% but under cap 400.
- **PR2 size deviation**: production 308 LOC, forecast ~350, under cap 400.
- **PR3 size deviation**: production 264 LOC, forecast ~150, +76% over forecast but under cap 400.
- **PR4 size deviation**: production 218 LOC, forecast ~350, -38% under forecast.
- 4 fresh reviews: PR1+PR2 `APPROVE_WITH_MINOR_NOTES`, PR3+PR4 `APPROVE`.
- Baseline `/adapt` pre-existing accepted: `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` reproduced on api/main @ `496a3c7` pre-022; NOT a 022 regression; follow-up post-MVP.
- Verify notes (3 `PASS_WITH_NOTES`):
  - NIT-1: API INDEX had stale 022 PR2-applied wording; fixed during archive sync.
  - NIT-2: broad grep false positives outside 022 paths (acceptable).
  - NIT-3: existing 009 local-mode skips tracked (info only).

## 7. Rollback / Follow-up

### Rollback high-level

- Revert `BuildCv-web` main to the previous tag/commit before 022 (pre-022, `9f71e9f` post-009-NIT) if a critical post-launch regression appears.
- Revert `BuildCv-api` main to the commit before PR2 (`85c85de^`) if a critical API regression appears.
- After rollback, re-apply PR1 + PR2 + PR0 hardening (009) as needed to keep gates green.

### Kill switch

- `LlmFeedback:Enabled=false` disables endpoint + UI immediately (without deploy).
- `LlmFeedback:Provider=fake` switches away from any future real provider without code changes.

### Follow-up backlog (not started)

- PR3 `/privacidad` (009).
- PR5 consent UI (009).
- 010-payments-web frontend (api shipped).
- 020-a11y-automated-audit.
- 023-ollama-real-provider (post-MVP).
- `_providerKeyMap` bug pre-existing.
- T-PR0-007 tracking gap closure.

## 8. Final Recommendation

- **archived**: yes (change 022 MVP shipped + archived).
- **tag final**: yes (cross-repo at SHIP commits, NOT archive commit):
  - `git tag -a 022-llm-integration-local-mvp-v1.0 00f64ed -m "022-llm-integration-local-mvp v1.0"` (api).
  - `git tag -a 022-llm-integration-local-mvp-v1.0 bb81e02 -m "022-llm-integration-local-mvp v1.0"` (web).
- **next change recommended**: 023-ollama-real-provider (continuation of deferred post-MVP), 010-payments-web (frontend), or 020-a11y-automated-audit (pre-launch reinforcement).
- **MVP launch status**: code-side READY; operational deploy requires Render env vars (pre-launch actions documented in 009 smoke-report).
