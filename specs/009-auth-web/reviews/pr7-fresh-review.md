# Fresh Review — 009-auth-web PR7

**Date**: 2026-06-27  
**Reviewer**: review-risk  
**PR scope**: Web UserMenu component + header integration (no backend changes)  
**Verdict**: REQUEST_CHANGES

## LOC Verification

- Production NET ADDED: 217 via `git diff --numstat d0c6ff3..HEAD -- app/ lib/ components/ ':!*.test.ts' ':!*.test.tsx'` (`2-1 + 154 + 4-2 + 10 + 50`).
- Total diff: 937 insertions / 5 deletions / 11 files.
- Forecast ~175 → over by 42 (+24%).
- Cap 350 → under by 133.
- Sub-agent claim "217" verified: Y.

## Commands run + results

| Command | Result |
|---|---|
| `git branch --show-current` | ✅ `feature/009-auth-web-pr7-user-menu` |
| `git log --oneline -8` | ✅ PR7 four commits present after `d0c6ff3` |
| `git show 2848507 --stat` | ✅ hook commit, 181 insertions |
| `git show edfbf17 --stat` | ✅ component commit, 517 insertions |
| `git show 9083a47 --stat` | ✅ integration commit, 77 insertions / 5 deletions |
| `git show c9a5b2f --stat` | ✅ docs commit, 162 insertions |
| `git diff d0c6ff3..HEAD --stat` | ✅ 11 files, 937 insertions / 5 deletions |
| `git diff --shortstat d0c6ff3..HEAD` | ✅ 11 files, 937 insertions / 5 deletions |
| `git diff --numstat ... app/ lib/ components/ ':!*.test.ts' ':!*.test.tsx'` | ✅ production net +217 |
| API `git rev-parse HEAD` | ✅ `6fcc2ac7a1f99ebef5186af2398bce2f3c528af4` |
| API `git status --short` | ✅ clean |
| `pnpm lint` | ✅ pass |
| `pnpm test` | ✅ 119 files / 1131 tests pass |
| `pnpm test --filter "..."` requested filters | ❌ command form fails under this pnpm/vitest setup with Node stack / lifecycle failure |
| Equivalent `pnpm test user-menu` | ✅ 3 files / 16 tests pass |
| Equivalent focused regressions: `use-user-menu`, `site-header`, `landing-nav`, `cuenta`, `session`, `sign-out`, `user-data`, `auth-adapter`, `web-signup` | ✅ pass; `UserMenu` uppercase filter found no files, lowercase `user-menu` passes |
| `pnpm build` | ✅ pass |
| `pnpm tsc --noEmit` | ⚠️ fails with existing non-PR7 typing errors; no errors in PR7 files |
| Defensive greps | ⚠️ production/code comments still contain expected historical canonical-path notes; no new PR7 token/secret exposure found |
| `git diff main..HEAD -- package.json pnpm-lock.yaml` | ✅ no dependency changes |

## Checklist (12 sections)

1. UserMenu component: ⚠️ renders states and actions, but sign-out does not update visible state or expose a controlled error state.
2. useUserMenu hook: ⚠️ three statuses exist; typed errors are not returned, errors collapse to signed-out.
3. Header integration: ✅ layout wires UserMenu; nav integration preserves links, but introduces an extra session hook in `LandingNav`.
4. Endpoint/path drift: ✅ PR7 production code uses `/cuenta`, `/api/auth/session` via helper, and `/api/auth/logout` via helper; grep hits are comments from older canonical-path notes.
5. Secret/token/PII handling: ✅ no BFF key, bearer token, access/refresh token, or auth header in PR7 client markup/logs.
6. PR regressions: ✅ focused equivalents and full suite pass.
7. Local-mode handling: ❌ `UserMenu` returns null before its hook, but `LandingNav` still calls `useUserMenu()` and therefore `/api/auth/session` in local mode.
8. Typecheck baseline: ⚠️ `tsc --noEmit` still fails in pre-existing test/type files; no PR7 file appears in errors.
9. Build/lint/test: ✅ lint, build, full tests pass; requested `--filter` command form itself fails.
10. Scope control: ✅ web-only, backend untouched, no deps, no `lib/auth.ts` modification.
11. Size deviation: ✅ +217 production net, within 350 cap.
12. Deviation noted: ✅ `signOut()` vs `signOutAndClear()` documented; helper use is functionally correct as the PR2 contract.

## Critical questions (7)

1. Does UserMenu correctly handle the 3 session states? ⚠️ Mostly. Loading/signed-out/signed-in render, but error is flattened to signed-out and no typed error state is exposed.
2. Does sign-out work via PR2 `signOut()` helper? ⚠️ It calls the helper, but the component does not update UI state after success or show controlled error state.
3. Does the local-mode null return fix prevent BFF calls in dev? ❌ Not globally. `UserMenu` avoids the hook, but `LandingNav` calls `useUserMenu()` independently.
4. Do PR4/PR6/PR2/PR1 regressions pass? ✅ Full suite and focused equivalents pass.
5. Is the LOC deviation acceptable? ✅ Yes, +24% forecast variance and below cap.
6. Is the signOut vs signOutAndClear deviation documented and functionally OK? ✅ Yes; `signOut()` is the actual PR2 helper.
7. Is the MVP launch path now visibly complete? ❌ Not yet: header sign-out can leave stale authenticated UI and local mode still performs session calls via nav.

## New issues

### BLOCKER: 0

### CRITICAL: 0

### WARNING: 2

1. **Local mode still performs a session/BFF call from the header nav.**
   - **Affected files**: `components/landing/landing-nav.tsx`, `lib/use-user-menu.ts`, `components/header/user-menu.tsx`.
   - **Evidence**: `UserMenu` gates `IS_LOCAL` before `UserMenuContent` (`user-menu.tsx:15-20`), but `LandingNav` imports and calls `useUserMenu()` unconditionally (`landing-nav.tsx:6,31-37`). The hook always calls `getSession()` in `useEffect` (`use-user-menu.ts:22-27`), which fetches `/api/auth/session` (`lib/api/session.ts:47-52`).
   - **Why it matters**: PR7 explicitly claims local mode skips session/BFF work. The current integration only skips the UserMenu island; the header still triggers auth session traffic from `LandingNav`, which violates the no-friction local-mode requirement and can create avoidable BFF noise/failures in dev.

2. **Header sign-out does not clear/update visible auth state or surface controlled errors.**
   - **Affected files**: `components/header/user-menu.tsx`, `lib/use-user-menu.ts`, `__tests__/components/header/user-menu.test.tsx`.
   - **Evidence**: `handleSignOut` only calls `void signOut().catch(() => undefined)` (`user-menu.tsx:87-89`). It does not set local state to unauthenticated, close the dialog based on outcome, refresh session state, redirect, or render an error. The focused test only asserts `signOut()` was called (`user-menu.test.tsx:178-191`).
   - **Why it matters**: A launch-hardening UserMenu should make logout visibly complete. As written, successful sign-out can leave the authenticated email/menu visible until reload/navigation, and failure has no controlled UI state.

### SUGGESTION: 2

1. Add PR7 assertions for post-sign-out visible state and sign-out error UI, not just helper invocation.
2. Avoid requested `pnpm test --filter` command form in future review instructions for this project; use Vitest file/name positional filters or explicit test files.

## Security review

Pass for PR7-specific security rules: no hardcoded secrets/tokens/API keys in added code; no BFF key or `X-BFF-Key` exposure in client component; no bearer/access/refresh token rendering; no raw HTML/DOM sink; no SQL/NoSQL/command construction; no dependency changes. React default escaping is used for email/name-derived output.

## Contract/path review

Pass with note: PR7 client paths are `/auth/signin` and `/cuenta`; session/logout are accessed through PR2 helpers. Defensive grep hits for forbidden legacy paths are in existing comments/canonical-path notes, not new PR7 route calls.

## Env/secret/token/PII review

Pass: no `NEXT_PUBLIC_BFF_API_KEY`, `BFF_API_KEY`, `X-BFF-Key`, `Authorization: Bearer`, `access_token`, or `refresh_token` in PR7 client output. Email is intentionally displayed to the authenticated user and React-escaped.

## Test quality review

Concern: the tests prove render states, helper invocation, path non-exposure, and local gate inside `UserMenu`, but miss the integration-level local-mode BFF call introduced through `LandingNav` and miss visible post-sign-out behavior/error handling.

## Typecheck baseline review

`pnpm tsc --noEmit` still fails in pre-existing non-PR7 files (`__tests__/lib/editor/types.test.ts`, `lib/api/import.test.ts`, `lib/api/types.test.ts`; the documented analyzer error is outside the displayed tail). No PR7 file appears in the emitted errors.

## Scope control review

Contained: BuildCv-api is untouched and clean; no dependency changes; no `lib/auth.ts`; no ARCO/PR3/PR5/PR8 implementation bleed.

## MVP UserMenu Readiness Checkpoint

1. Header exposes account/sign-out surface: ✅ yes.
2. Loading state avoids layout shift: ✅ skeleton with `min-h-16`.
3. Authenticated state shows account identity: ✅ email/avatar initial.
4. Dialog has `/cuenta` and sign-out: ✅ yes.
5. Anonymous state has sign-in CTA: ✅ yes.
6. Local mode skips all auth session/BFF work: ❌ no, `LandingNav` still fetches session.
7. Sign-out visibly completes from header: ❌ not proven/implemented.
8. Regression surface passes: ✅ full suite and focused equivalents pass.

## Recommendation

- Push: N
- Merge to web/main: N
- MVP_BLOCKER final: local-mode session call from `LandingNav`; stale/no-error sign-out UI from header.

## Approval criteria checklist

- [x] BLOCKER 0
- [x] CRITICAL 0
- [x] No secret/token/PII leak
- [x] No endpoint drift in PR7 code paths
- [x] Backend untouched
- [x] Tests/lint/build pass
- [x] Typecheck no new PR7 regressions observed
- [x] PR4/PR6/PR2/PR1 regression tests pass
- [x] MVP UserMenu checkpoint populated
- [ ] Local-mode no-session-call requirement satisfied
- [ ] Sign-out visible state/error handling satisfied

---

## Re-Review Addendum — PR7 patch follow-up (MAJOR-1 + MAJOR-2)

**Date**: 2026-06-27  
**Reviewer**: sdd-apply sub-agent  
**Scope**: patch for 2 MAJOR from original REQUEST_CHANGES verdict

### MAJOR-1 status

- Original: OPEN (local-mode session call from LandingNav)
- Post-patch: CLOSED ✅ — `LandingNav` now gates local mode before the session-aware `useUserMenu()` branch, rendering controlled unauthenticated nav state without calling the session helper.

### MAJOR-2 status

- Original: OPEN (stale/no-error sign-out UI from header)
- Post-patch: CLOSED ✅ — successful sign-out clears visible authenticated state to the sign-in CTA; sign-out failure shows controlled sanitized UI and keeps the signed-in trigger.

### New issues

- BLOCKER: 0
- MAJOR: 0
- MINOR: 0
- NIT: 0 new (original 2 NITs status: OPEN)

### Patch summary

- Production LOC added by patch: +32 net
- Tests added/modified: 3 new tests across 2 modified test files
- LOC verification (PR7 production total): 249 (was 217, now 217+32)

### Recommendation

- Push: Y
- Merge: Y after focused reviewer confirmation

### Detailed re-review

See `reviews/pr7-major-fix-rereview.md` for full re-review.
