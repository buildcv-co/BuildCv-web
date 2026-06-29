# Archive Report — 024-minimax-real-provider

## 1. Summary

- **Change**: `024-minimax-real-provider`
- **Final status**: **SHIPPED + ARCHIVED**
- **Verify verdict**: `PASS_WITH_NOTES`
- **MVP_BLOCKER**: 0
- **SHOULD_FIX_BEFORE_LAUNCH**: 0
- **READY_FOR_TAG**: yes
- **Tag cross-repo**: `024-minimax-real-provider-v1.0` at SHIP commits (`98995c3` api, `1a0a563` web).
- **Tag date**: 2026-06-29.

## 2. Shipped Scope

Cross-repo MVP shipped in 3 PRs:

- **PR1 api** (`8b83cba`): `MinimaxLlmFeedbackClient` + `LlmFeedbackOptions` updates (`BaseUrl`, `ApiKey`, `Model`, `MaxInputLength`, `MaxOutputTokens`) + DI conditional + appsettings defaults + 22 unit tests with `HttpMessageHandler` mock. Production LOC 245.
- **PR2 api** (`98995c3`): `GenerateLlmFeedbackHandler` dispatch `Provider=minimax` + `MaxInputLength` enforcement + `MaxOutputTokens` passthrough + error mapping integration + endpoint integration + regression tests. Production LOC 35.
- **PR3 web** (`1a0a563`): type-only contract fix in `lib/api/llm.ts` (`provider: "fake" | "minimax"`, `model: string`) + 2 new tests. Production LOC 2.

Total production: ~282 LOC (api 280 + web 2). Total tests added: 31.

## 3. Commits Archived

- **BuildCv-api SHIP commit**: `98995c3` — `merge: integrar PR2 de 024-minimax en api`.
- **BuildCv-web SHIP commit**: `1a0a563` — `merge: integrar PR3 de 024-minimax en web`.
- **Archive commit**: pending until committed.
- **Tag target**: SHIP commits, NOT archive commit (per 009/022 rule confirmed by INDEX convention).

## 4. Verification Evidence

Summary from `verify-report.md` (`PASS_WITH_NOTES`):

- 26/26 FRs PASS.
- 11/11 NFRs PASS.
- 8/8 CRs PASS.
- 20/20 ACs: 17 PASS + 3 PASS_WITH_NOTES.
- 0 MVP_BLOCKER, 0 SHOULD_FIX_BEFORE_LAUNCH, 18 SAFE_DEFER_POST_MVP.
- All runtime gates green: backend smoke (200 + safe no-key startup), web smoke (200), 009 regression (11 pass, 5 skip), 021 regression (25 pass), endpoint drift PASS, defensive greps 0 actionable hits, FixList unchanged.
- `ScoringEngine.Version = "2.0.0"` confirmed (Constitution Art. II preserved).
- Fresh reviews: PR1+PR2 `APPROVE_WITH_MINOR_NOTES`, PR3 `APPROVE`.
- Baseline `/adapt` documented as pre-existing, NOT a 024 regression.
- No provider real, no API key real, no `NEXT_PUBLIC_*` secrets, no tracked secrets.

## 5. Deferred Post-MVP (SAFE_DEFER_POST_MVP — 18 items)

1. **023-ollama-real-provider** (PR5 Ollama + PR6 verify post-Ollama).
2. **Multi-provider UI selector** (single provider per session in MVP).
3. **Streaming responses** (non-streaming sufficient in MVP).
4. **Thinking blocks mapping** (out of scope per locked decision).
5. **Persistent user LLM preference** (session-level only per 022).
6. **Advanced cost analytics dashboard**.
7. **Model listing UI** (owner consults external docs).
8. **MiniMax real smoke in CI** (prohibited by CR-CI-SAFETY).
9. **Payment integration / billing credits UI**.
10. **A11y global audit** (020 deferred).
11. **Deploy automation** (not applicable in this change).
12. **Fix baseline `/adapt` auth failure** (separate).
13. **009 PR3 `/privacidad`**.
14. **009 PR5 consent UI**.
15. **022 UI changes** (unless contract drift).
16. **ScoreEngine changes**.
17. **MiniMax-M3 assumption** (locked default `MiniMax-M2.7`).
18. **Free tier assumption** (locked “treat as paid”).

## 6. Risks & Accepted Deviations

- **Fresh reviews**: PR1+PR2 `APPROVE_WITH_MINOR_NOTES`, PR3 `APPROVE`.
- **Production LOC deviations**:
  - PR1: 245 vs forecast ~250 (-2% under).
  - PR2: 35 vs forecast ~150 (-77% under, very efficient by reusing PR1 exceptions/DI).
  - PR3: 2 vs forecast 0-100 (type-only fix).
- **Baseline `/adapt`**: `RequireCreditsFilterTests.Adapt_without_jwt_returns_401` (api). Classification: **BASELINE_PRE_EXISTING**, NOT a 024 regression, reproduced on api/main pre-024.
- **Minimax no-key startup-vs-502 deviation**: when backend starts with `Provider=minimax` + no `ApiKey`, startup fails fast (no endpoint 502). Accepted per design §3 startup validation (fail-safe at startup > runtime 502).
- **API INDEX stale 022/024 wording**: verify suggestion addressed during archive sync.
- **PR3 type drift** found pre-PR3: provider/model hardcoded literals in `lib/api/llm.ts` and matching test fixture. Resolved by PR3 minimal type fix.

## 7. Rollback / Follow-up

### Rollback high-level

- Revert `BuildCv-web` main to tag/commit before PR3 (for example `0ea8822` pre-PR3) if a critical post-launch regression appears.
- Revert `BuildCv-api` main to `8b83cba` PR1 merge or `496a3c7` pre-PR1 if a critical API regression appears.
- After rollback, re-apply PR1 + PR2 (api) + PR3 (web) to keep gates green.

### Operational kill switch (without rollback)

- `LlmFeedback:Enabled=false` disables real provider + fake provider (both unavailable). Default remains `Enabled=false` per 022.
- `LlmFeedback:Provider=fake` switches away from any real provider without code changes.
- Invalid `LlmFeedback:BaseUrl` fails fast at startup; no runtime request is sent.

### Safe fallback

- If `MinimaxLlmFeedbackClient` fails, the handler returns `degraded=true`, `summary="AI feedback no disponible"`, empty arrays, and leaves the deterministic score intact.
- The 022 fake provider remains intact as a deterministic fallback when explicitly configured.

### Rollback must not touch

- Deterministic score (`ScoringEngine.Version = "2.0.0"`).
- `/adapt` endpoint.
- 009 auth-web.

### Follow-up backlog (not started)

- 023 Ollama real provider.
- Multi-provider UI selector.
- Streaming responses.
- Persistent LLM preference.
- Billing dashboard.
- A11y global audit.
- Deploy automation.
- Fix baseline `/adapt`.
- 009 PR3 `/privacidad` + PR5 consent UI.
- 010 payments frontend.
- 020 a11y automated audit.

## 8. Final Recommendation

- **archived**: yes (change 024 MVP shipped + archived).
- **tag final**: yes (cross-repo at SHIP commits, NOT archive commit):
  - `git tag -a 024-minimax-real-provider-v1.0 98995c3 -m "024-minimax-real-provider v1.0"` (api).
  - `git tag -a 024-minimax-real-provider-v1.0 1a0a563 -m "024-minimax-real-provider v1.0"` (web).
- **next change recommended**: 023 Ollama real provider (continuation of deferred post-MVP), 010-payments-web frontend if the owner wants monetization, 020-a11y-automated-audit for pre-launch reinforcement, or manual MVP deploy smoke as an owner operational action.
- **MVP launch status**: code-side READY; operational deploy requires Render environment variables (pre-launch actions documented).
