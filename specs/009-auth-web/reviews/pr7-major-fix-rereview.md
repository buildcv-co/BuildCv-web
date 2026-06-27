# Re-Review — PR7 major-fix patch

**Date**: 2026-06-27  
**Reviewer**: sdd-apply sub-agent  
**Scope**: Follow-up patch for MAJOR-1 and MAJOR-2 from `pr7-fresh-review.md`  
**Verdict**: APPROVE FOR RE-REVIEW

## Findings

### MAJOR-1 — CLOSED ✅

`LandingNav` now checks `IS_LOCAL` before rendering the session-aware branch. In local mode it renders `LandingNavContent status="unauthenticated"` and never calls `useUserMenu()`, matching the `UserMenu` local-mode guard pattern.

Evidence:
- `components/landing/landing-nav.tsx`
- `components/landing/landing-nav.test.tsx` local-mode regression
- Focused `landing-nav` tests pass.

### MAJOR-2 — CLOSED ✅

`UserMenu` now updates visible state after sign-out success and renders a controlled, sanitized `role="alert"` message on sign-out failure. Failure preserves the authenticated trigger and does not expose raw error content.

Evidence:
- `components/header/user-menu.tsx`
- `lib/copy/es.ts`
- `__tests__/components/header/user-menu.test.tsx` success + failure regressions
- Focused `user-menu` and `sign-out` tests pass.

## New issues

- BLOCKER: 0
- MAJOR: 0
- MINOR: 0
- NIT: 0 new
- Original 2 NIT/suggestions: OPEN (unchanged; out of this patch scope)

## Verification summary

| Check | Result |
|---|---|
| `pnpm lint` | ✅ pass |
| `pnpm test` | ✅ 119 files / 1134 tests pass |
| Focused PR7 regressions | ✅ user-menu, use-user-menu, site-header, landing-nav pass |
| PR4/PR2 regressions | ✅ cuenta, session, sign-out pass |
| `pnpm build` | ✅ pass |
| `pnpm tsc --noEmit` | ⚠️ 7 pre-existing typecheck errors; no PR7 patch files |
| LOC guard | ✅ 217 + 32 = 249 production LOC ≤350 |
| Backend touched | ✅ no |
| Dependencies changed | ✅ no |

## Recommendation

- Push: Y
- Merge: Y after reviewer confirms this focused patch
