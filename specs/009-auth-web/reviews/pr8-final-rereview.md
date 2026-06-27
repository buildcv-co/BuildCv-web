# Fresh Final Re-Review — 009-auth-web PR8 root-cause fixes

**Date**: 2026-06-27  
**Reviewer**: review-risk (focalized)  
**Scope**: 3 patches for MINOR-1 + MINOR-2 from previous re-review  
**Verdict**: APPROVE_WITH_MINOR_NOTES

## Diff summary

- Branch: `feature/009-auth-web-pr8-e2e-a11y-openapi`
- Previous tip: `2da1d33`
- New tip: `12b56d7f6a818e35d8db776da295a54947e4597b`
- Commits added: 3 (2 fixes + 1 docs)
- Files modified: 2 code (`playwright.config.ts`, `e2e/a11y-auth-pr8.spec.ts`) + 2 docs (`apply-progress.md`, `reviews/pr8-minors-rereview.md`)

## Stability evidence (3 consecutive runs)

- Run 1: 16/16 passed (22.0s)
- Run 2: 16/16 passed (21.9s)
- Run 3: 16/16 passed (22.4s)

## MINOR-1 verification

- workers:1 fix: REAL ROOT-CAUSE FIX ✅ — local and CI now both serialize Playwright workers, removing the shared mutable mock-backend race.
- strict-mode scope fix: REAL BUG FIX ✅ — assertion is scoped to `arco-cancel-modal`, avoiding the UserMenu email aria-label collision.
- Status: CLOSED ✅

## MINOR-2 verification

- MVP Final Readiness Checkpoint: still aligned to 10-question schema.
- Status: CLOSED ✅ (no regression)

## Commands run + results

| Command | Result |
|---|---|
| `git branch --show-current` | PASS — `feature/009-auth-web-pr8-e2e-a11y-openapi` |
| `git log --oneline -10` | PASS — expected 3 new commits on top of `2da1d33` |
| `git show bc4390c --stat` | PASS — `playwright.config.ts` only |
| `git show 752bf7c --stat` | PASS — `e2e/a11y-auth-pr8.spec.ts` only |
| `git show 12b56d7 --stat` | PASS — docs update |
| `git diff 2da1d33..HEAD --stat` | PASS — 4 files, `+130/-15` |
| API `git rev-parse HEAD` | PASS — `66fcaf1a13d511eb088ae93443f255c376459ebf` |
| API `git status --short` | PASS — clean |
| `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e -- account-flow user-menu-pr8 a11y-auth-pr8 endpoint-drift` run 1 | PASS — 16/16 |
| Same focused command run 2 | PASS — 16/16 |
| Same focused command run 3 | PASS — 16/16 |
| `pnpm test` | PASS — 119 files / 1134 tests |
| `node scripts/check-endpoint-drift.mjs` | PASS — web canonical, backend canonical, drift check pass |
| `pnpm lint` | PASS with 1 warning — unused `MOCK_USER` import in changed a11y spec |
| `pnpm build` | PASS |
| `pnpm tsc --noEmit` | BASELINE FAIL — same 7 known pre-existing test typing errors; no PR8 file appears |
| `grep -A 2 "retries:" playwright.config.ts` | PASS — `workers: 1` unconditional |
| `grep -rn "/auth/sign-out" ...` / `grep -rn "providerId, email, name" ...` | PASS with known noise — comments + drift denylist only |

## Focused checklist (7 sections)

1. **workers:1 fix** — ✅ pass. `playwright.config.ts:11` has unconditional `workers: 1`; 3/3 focused runs passed; this is not a test relaxation, it removes parallel access to singleton mock state.
2. **strict-mode scope fix** — ✅ pass. `e2e/a11y-auth-pr8.spec.ts:57-60` scopes the email input assertion to the modal and still verifies the confirmation input is visible.
3. **docs update** — ✅ pass. `apply-progress.md:1778-1796` documents root cause, both fixes, 3/3 evidence, and `RESOLVED` verdict.
4. **No regression** — ✅ pass. Vitest 1134/1134, focused PR8 16/16, drift gate pass, backend untouched. ARCO stale UI fix remains present in `components/account/arco-panel.tsx` via `displayedUserData` and `arco-rectify-success`.
5. **Typecheck baseline** — ✅ pass with baseline note. The same 7 pre-existing errors reproduce; none are in PR8 files.
6. **Build/lint/test** — ⚠️ note. `pnpm test`, `pnpm build`, and focused e2e pass. `pnpm lint` exits 0 but reports one new unused import warning in `e2e/a11y-auth-pr8.spec.ts`.
7. **Drift gate** — ✅ pass. `scripts/check-endpoint-drift.mjs` passes.

## Critical questions (6)

1. **Do the 3 consecutive runs truly pass 16/16 with no flakes?** Yes. Independent rerun evidence: 16/16, 16/16, 16/16.
2. **Is `workers: 1` a root-cause fix or just masking the flake?** Root-cause fix for this test infrastructure: the mock backend has shared mutable singleton state, so serializing workers removes the actual race and aligns local with CI.
3. **Is the strict-mode scope fix actually correct?** Yes. It narrows the locator to the ARCO modal and still asserts the confirmation input is visible; it does not weaken the behavior under test.
4. **Is PR8 now truly READY FOR sdd-verify 009?** Yes, with the lint-warning cleanup as a non-blocking note.
5. **Are PR1-PR7 functional tests still all passing?** Yes by `pnpm test` baseline: 1134/1134 unit/integration tests passed. Full non-local E2E remains intentionally not the all-suite mode per prior reviews.
6. **Is the doc update honest and complete?** Yes. It changed the prior baseline-flake language to root-cause RESOLVED and includes both commits plus 3-run evidence.

## New issues

### BLOCKER: 0

### CRITICAL: 0

### WARNING: 0

### SUGGESTION: 1

#### SUGGESTION: Remove unused `MOCK_USER` import from the scoped a11y test

- **Affected file**: `e2e/a11y-auth-pr8.spec.ts:2`
- **Evidence**: `pnpm lint` exits 0 but reports `MOCK_USER is defined but never used` after the selector was changed from `page.getByLabel(new RegExp(MOCK_USER.email))` to `modal.getByTestId("arco-confirm-email")`.
- **Why it matters**: Non-blocking, but it leaves review noise in the final gate and is directly caused by the strict-mode fix.

## Security review

No findings.

## Recommendation

- Push: **Y**
- Merge to web/main: **Y** after optional lint-warning cleanup or if warning-only lint is accepted by the project gate
- Enable sdd-verify 009: **Y**

## Approval criteria checklist

- [x] workers:1 root-cause fix verified
- [x] strict-mode scope fix verified
- [x] 3/3 runs stable 16/16
- [x] No regression in PR1-PR7 functional tests
- [x] No secret/token/PII leak
- [x] No endpoint drift
- [x] Backend untouched
- [x] Typecheck no new regressions
- [x] Docs update honest and complete
- [x] MINOR-1 CLOSED
- [x] MINOR-2 CLOSED
- [x] MVP Final Readiness Checkpoint: READY FOR sdd-verify 009
