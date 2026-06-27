# Fresh Re-Review — 009-auth-web PR7 patch (MAJOR-1 + MAJOR-2)

**Date**: 2026-06-27  
**Reviewer**: review-risk (focalized)  
**Scope**: patch only (NOT full PR7 re-review)  
**Verdict**: APPROVE_WITH_MINOR_NOTES

## MAJOR-1 verification

- CLOSED ✅ — `LandingNav` gates `IS_LOCAL` before the session-aware branch (`components/landing/landing-nav.tsx:32-38`). In local mode it renders `LandingNavContent status="unauthenticated"` and does not call `useUserMenu()`. The hook remains isolated in `LandingNavWithSession` (`components/landing/landing-nav.tsx:40-43`).
- Test evidence: local-mode regression asserts `useUserMenu` is not called and the controlled signed-out nav renders (`components/landing/landing-nav.test.tsx:148-160`).
- RED evidence by inspection: before the patch, `LandingNav` called `useUserMenu()` unconditionally (`c9a5b2f:components/landing/landing-nav.tsx:31-34`), so the new local-mode test would fail.

## MAJOR-2 verification

- CLOSED ✅ — `UserMenu` now tracks local sign-out state and controlled sign-out errors (`components/header/user-menu.tsx:25-26`, `52-53`). On success it closes the dialog and flips to signed-out UI (`components/header/user-menu.tsx:92-99`). On failure it sets a fixed copy string only (`components/header/user-menu.tsx:99-101`, `155-159`).
- Test evidence: success asserts the sign-in CTA appears and the email disappears (`__tests__/components/header/user-menu.test.tsx:195-215`); failure asserts controlled alert text, no raw token/error leakage, and signed-in trigger preserved (`__tests__/components/header/user-menu.test.tsx:217-237`).
- RED evidence by inspection: before the patch, `handleSignOut` only executed `void signOut().catch(() => undefined)` (`c9a5b2f:components/header/user-menu.tsx:87-89`), so both new visible-state tests would fail.

## LOC verification

- Patch production: +32 net (`components/header/user-menu.tsx` +18, `components/landing/landing-nav.tsx` +13, `lib/copy/es.ts` +1).
- PR7 total: 249 / 350 cap ✅.
- LOC deviation from forecast: matches sub-agent claim (~32); acceptable.

## Commands run + results

| Command | Result |
|---|---|
| `git branch --show-current` | ✅ `feature/009-auth-web-pr7-user-menu` |
| `git log --oneline -8` | ✅ PR7 patch commits present: `1918a42`, `d140e22`, `cbad854` |
| `git show 1918a42 --stat` | ✅ test commit, 2 files, 68 insertions / 1 deletion |
| `git show d140e22 --stat` | ✅ fix commit, 3 files, 41 insertions / 9 deletions |
| `git show cbad854 --stat` | ✅ docs commit, 3 files, 314 insertions |
| `git diff c9a5b2f..HEAD --stat/--shortstat` | ✅ 8 files, 423 insertions / 10 deletions |
| API `git rev-parse HEAD` | ✅ `6fcc2ac7a1f99ebef5186af2398bce2f3c528af4` |
| API `git status --short` | ✅ clean |
| `pnpm lint` | ✅ pass |
| `pnpm test` | ✅ 119 files / 1134 tests pass |
| Requested `pnpm test --filter ...` commands | ⚠️ command form fails in this Vitest setup with Node lifecycle error; equivalent positional filters were run |
| `pnpm test user-menu` | ✅ 3 files / 18 tests pass |
| `pnpm test use-user-menu` | ✅ 1 file / 5 tests pass |
| `pnpm test site-header` | ✅ 1 file / 10 tests pass |
| `pnpm test landing-nav` | ✅ 1 file / 18 tests pass |
| `pnpm test cuenta` | ✅ 1 file / 4 tests pass |
| `pnpm test session` | ✅ 2 files / 9 tests pass |
| `pnpm test sign-out` | ✅ 1 file / 6 tests pass |
| `pnpm build` | ✅ pass |
| `pnpm tsc --noEmit` | ⚠️ 7 pre-existing type errors; none in patch files |
| Defensive greps | ✅ no new patch leak/drift; hits are pre-existing canonical-path comments/server-side docs |
| `git diff c9a5b2f..HEAD -- package.json pnpm-lock.yaml` | ✅ empty; no deps changed |

## Focused checklist (10 sections)

1. MAJOR-1 fix verification: ✅ pass — local mode avoids session hook; authenticated mode still uses it.
2. MAJOR-2 fix verification: ✅ pass — success clears visible state; failure keeps signed-in UI and shows controlled error.
3. Test quality: ✅ pass — 3 targeted regression tests added; RED inferred from pre-patch code; GREEN verified.
4. Secret/token/PII: ✅ pass — no BFF key/client header/token exposure added; error UI does not echo raw errors.
5. Endpoint/path drift: ✅ pass — no new forbidden/legacy paths in patch production code.
6. Typecheck baseline: ⚠️ note — 7 pre-existing errors remain; patch files are not implicated.
7. Build/lint/test: ✅ pass — lint, full tests, focused equivalents, build pass; no suppressions/deps added.
8. Scope control: ✅ pass — no ARCO/PR3/PR5/PR8/backend/`lib/auth.ts` changes.
9. Size verification: ✅ pass — patch +32 production net; PR7 total 249/350.
10. Commit hygiene: ✅ pass — 3 conventional Spanish commits; no `fixup!`; no AI attribution observed.

## Critical questions (6)

1. Does the MAJOR-1 patch correctly prevent session calls in local mode? ✅ Yes. `IS_LOCAL` returns before `LandingNavWithSession` and the test proves `useUserMenu` is not called.
2. Does the MAJOR-2 patch correctly handle sign-out success and failure? ✅ Yes. Success flips to local unauthenticated state; failure shows fixed copy and preserves authenticated UI.
3. Are the 3 new tests proven RED → GREEN? ✅ Yes by pre-patch evidence plus GREEN runs. The pre-patch code lacked the guarded branch/state/error handling needed for the new assertions.
4. Are PR4/PR6/PR2/PR1 regressions all preserved? ✅ Yes. Full suite passes; focused `cuenta`, `session`, `sign-out`, `site-header`, `user-menu`, and `landing-nav` equivalents pass.
5. Is the LOC deviation (+32) acceptable for the patch size? ✅ Yes. Focused and within PR7 cap.
6. Are the NITs from original review still tracked? ✅ Yes. They remain open/unchanged and are non-blocking for this patch.

## New issues

### BLOCKER: 0

### MAJOR: 0

### MINOR: 0

### NIT: 0 new

## Original NITs status

- NIT-1: OPEN/UNCHANGED — future typed error state for `useUserMenu` remains outside this patch.
- NIT-2: OPEN/UNCHANGED — requested `pnpm test --filter` command form remains incompatible; equivalent Vitest positional filters work.

## Test quality

- RED → GREEN evidence: `LandingNav` pre-patch unconditionally called `useUserMenu`; `UserMenu` pre-patch swallowed sign-out failures and did not update visible state. The new assertions target those exact seams and pass on HEAD.
- Assertions are real UI behavior checks: no session-hook call in local nav, sign-in CTA after successful sign-out, controlled alert/no raw token text after failed sign-out.

## Secret/token/PII review

Pass. No `NEXT_PUBLIC_BFF_API_KEY`, client `BFF_API_KEY`, client `X-BFF-Key`, bearer/access/refresh token output, raw sign-out error echo, or PII logging added by the patch. React default escaping is used for displayed email.

## Endpoint/path review

Pass. Defensive grep hits are existing canonical-path comments/server-side auth docs, not new patch drift. Patch production code preserves `/auth/signin` and `/cuenta` only.

## Typecheck baseline

`pnpm tsc --noEmit` reports 7 pre-existing errors in `__tests__/components/analyzer/analyzer.test.tsx`, `__tests__/lib/editor/types.test.ts`, `lib/api/import.test.ts`, and `lib/api/types.test.ts`. New patch files are not present in the errors.

## Scope control review

Contained. Patch modifies only web UserMenu/LandingNav/copy/tests/docs. Backend is at expected commit `6fcc2ac7a1f99ebef5186af2398bce2f3c528af4` and clean. No `lib/auth.ts`, dependency, ARCO, PR3, PR5, or PR8 changes.

## Size deviation review

Acceptable. Patch production net is +32; PR7 total is 249/350.

## Commit hygiene

Acceptable. Three conventional Spanish commits: test, fix, docs. No loose `fixup!` and no AI attribution observed.

## Recommendation

- Push: Y
- Merge to web/main: Y
- Enable next steps: PR0 hardening / PR8 may proceed after normal branch/CI handling.

## Approval criteria checklist

- [x] MAJOR-1 CLOSED
- [x] MAJOR-2 CLOSED
- [x] BLOCKER 0
- [x] MAJOR 0
- [x] No secret/token/PII leak
- [x] No endpoint drift
- [x] Tests/lint/build pass
- [x] Typecheck no new regressions
- [x] Backend untouched
- [x] PR4/PR6/PR2/PR1 regression preserved
