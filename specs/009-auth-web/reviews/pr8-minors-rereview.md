# Fresh Re-Review — 009-auth-web PR8 MINORs patch

**Date**: 2026-06-27  
**Reviewer**: review-risk (focalized)  
**Scope**: patch for 2 MINORs + 2 NITs from original REQUEST_CHANGES  
**Verdict**: REQUEST_CHANGES

## Diff summary

- Branch: `feature/009-auth-web-pr8-e2e-a11y-openapi`
- Previous tip: `98bd81e`
- New tip: `2da1d33`
- Commits added: 1 docs commit (`docs(009-auth-web): cerrar notas de review PR8 (alinear readiness final)`)
- Files: 2 docs changed (`specs/009-auth-web/apply-progress.md` + `specs/009-auth-web/reviews/pr8-fresh-review.md`)
- **No code changes** verified: `git diff 98bd81e..HEAD -- app/ lib/ components/ e2e/ scripts/ playwright.config.ts package.json pnpm-lock.yaml` returned empty.

## MINOR-1 verification

- Flake documented as baseline: **yes**
- Evidence cited: **yes, but overstated** — doc cites CI `workers:1`, immediate rerun 16/16, and reset hooks.
- Independent rerun evidence: **not stable locally** — two default-worker focused runs failed before `--workers=1` passed.
- Verdict: **NOT CLOSED ❌**

## MINOR-2 verification

- 10 questions schema match: **yes** — the checkpoint has exactly 10 numbered questions.
- Classifications honest: **mostly yes, with one caveat** — `MVP_BLOCKER=0`, `SHOULD_FIX_BEFORE_LAUNCH=0`, `SAFE_DEFER_POST_MVP=7` are explicit and the SAFE_DEFER list is concrete. The `READY FOR sdd-verify 009` verdict is not justified while the focused PR8 gate is failing under the documented default local execution mode.
- Verdict (`READY FOR sdd-verify 009`): justified **no**

## NIT-1 verification

- Documented as review ergonomics limitation: **yes** — `pnpm test --filter ...` limitation and `pnpm test:e2e -- <pattern>` equivalent are documented.

## NIT-2 verification

- Documented as expected pattern: **yes** — comments/denylist grep noise and comment-stripping drift script behavior are documented.

## Commands run + results

| Command | Result |
|---|---|
| `git branch --show-current` | PASS — `feature/009-auth-web-pr8-e2e-a11y-openapi` |
| `git log --oneline -5` | PASS — `2da1d33` on top of `98bd81e` |
| `git show 2da1d33 --stat` | PASS — docs-only commit, 2 files, `+226/-12` |
| `git diff 98bd81e..HEAD --stat` | PASS — 2 docs files changed |
| `git diff 98bd81e..HEAD --shortstat` | PASS — 2 files changed, 226 insertions, 12 deletions |
| API `git rev-parse HEAD` | PASS — `66fcaf1a13d511eb088ae93443f255c376459ebf` |
| API `git status --short` | PASS — clean |
| `git diff 98bd81e..HEAD -- app/ lib/ components/ e2e/ scripts/ playwright.config.ts package.json pnpm-lock.yaml --stat/--shortstat` | PASS — empty output, no code/config/package changes |
| `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e -- account-flow user-menu-pr8 a11y-auth-pr8 endpoint-drift` | FAIL — 15 passed, 1 failed: `Arco_RectifyNameShowsSuccessAndUpdatedData` missing `arco-rectify-success` |
| Same focused command rerun | FAIL — 11 passed, 5 failed: `Arco_RectifyNameShowsSuccessAndUpdatedData`, 2 UserMenu/a11y trigger failures, `Arco_CancelConfirmSignsOut`, `UserMenu_AuthenticatedShowsEmailAndCuentaLink` |
| `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e --workers=1 -- account-flow user-menu-pr8 a11y-auth-pr8 endpoint-drift` | PASS — 16/16 |
| `pnpm test` | PASS — 119 files, 1134 tests passed |
| `node scripts/check-endpoint-drift.mjs` | PASS — web forbidden, web canonical, backend canonical paths pass |
| `pnpm tsc --noEmit` | FAIL — same 7 documented pre-existing errors |

## Focused checklist (8 sections)

1. **MINOR-1 flake documentation** — ❌ fail. Section exists and identifies the likely root cause, but the evidence claim is not sufficient: local default-worker reruns failed twice in this review.
2. **MINOR-2 checkpoint schema** — ⚠️ note. The schema and classifications are present, but the final `READY FOR sdd-verify 009` is premature while the focused gate fails under default workers.
3. **NIT-1 vitest filter** — ✅ pass. Ergonomics limitation and working Playwright equivalent documented.
4. **NIT-2 raw grep noise** — ✅ pass. Expected comments/denylist noise and drift script comment-stripping documented.
5. **No code changes verification** — ✅ pass. Code/config/package diff from `98bd81e..HEAD` is empty.
6. **Backend untouched** — ✅ pass. API remains at `66fcaf1` and clean.
7. **Suite verification** — ⚠️ note. Vitest 1134/1134 and drift gate pass; focused PR8 suite only passes with `--workers=1`, not default local worker mode.
8. **Typecheck baseline** — ✅ pass with baseline note. 7 pre-existing errors reproduced; no evidence they changed.

## Critical questions (7)

1. **Is the MINOR-1 flake documentation sufficient to close the MINOR?** No. It documents the suspected cause, but this review reproduced the instability twice. Risk: final verification could be red or nondeterministic unless run with CI-equivalent `workers=1` or the docs stop claiming reruns pass consistently.
2. **Does the MVP Final Readiness Checkpoint match the requested 10-question schema exactly?** Yes. It has 10 explicit numbered questions.
3. **Are the classifications honest and verifiable?** Mostly. The deferred list and counts are explicit; the only dishonest edge is using those counts to assert readiness while the focused PR8 gate is failing in default local mode.
4. **Is the `READY FOR sdd-verify 009` verdict justified?** No. It is justified only under `--workers=1`; the documented default focused command failed twice here.
5. **Are the NIT closures adequate?** Yes. Documentary fixes are acceptable for these NITs.
6. **Is the patch truly doc-only?** Yes. No app/lib/components/e2e/scripts/config/package diff from `98bd81e..HEAD`.
7. **Is PR8 ready to ship so sdd-verify 009 can proceed?** Not yet. The patch is doc-only, but MINOR-1 remains open because the focused PR8 gate is still unstable under the requested command.

## New issues

### BLOCKER: 0

### CRITICAL: 0

### WARNING: 1

#### WARNING: MINOR-1 is not closed — focused PR8 suite still fails under the requested command

- **Affected files**: `specs/009-auth-web/apply-progress.md:1778-1789`, `e2e/account-flow.spec.ts`, `e2e/a11y-auth-pr8.spec.ts`, `e2e/user-menu-pr8.spec.ts`, `playwright.config.ts`, `scripts/e2e-mock-backend.mjs`
- **Evidence**: `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e -- account-flow user-menu-pr8 a11y-auth-pr8 endpoint-drift` failed twice in this re-review. First run: 15/16 with `Arco_RectifyNameShowsSuccessAndUpdatedData` missing `arco-rectify-success`. Rerun: 11/16 with 5 failures across ARCO/UserMenu/a11y. CI-equivalent `--workers=1` passed 16/16.
- **Why it matters**: `apply-progress.md` says rerun passes consistently and uses that as evidence for `READY FOR sdd-verify 009`. The current evidence proves the default focused command remains flaky; that can make the final gate nondeterministic and the readiness verdict premature.

### SUGGESTION: 0

## Recommendation

- Push: **N**
- Merge to web/main: **N**
- Enable sdd-verify 009: **N**

## Approval criteria checklist

- [ ] MINOR-1 CLOSED
- [x] MINOR-2 CLOSED structurally, but readiness verdict needs correction while MINOR-1 is open
- [x] NITs CLOSED (documentary fixes acceptable)
- [x] No code changes verified
- [x] Backend untouched
- [ ] Suite stable under requested focused command
- [x] Drift gate still passes
- [x] Typecheck baseline unchanged
