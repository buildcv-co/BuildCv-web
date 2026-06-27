# Fresh Review — 009-auth-web verify-fixes

**Date**: 2026-06-27  
**Branch**: `feature/009-auth-web-verify-fixes`  
**Verdict**: `APPROVE_WITH_MINOR_NOTES`

---

## Scope Reviewed

This review focuses only on the two blocking findings from the first `sdd-verify 009-auth-web` pass and the updated verification report:

1. TypeScript fixture/typecheck failures.
2. ARCO cancel redirect regression.
3. `verify-report.md` coherence after re-verify.

No backend code, archive action, tag, dependency, or broader product scope was reviewed as changed in this branch.

---

## Typecheck Fix Review

### Assessment

The typecheck patch is correct and minimal.

- `__tests__/components/analyzer/analyzer.test.tsx` now imports `ScoreError` from `@/lib/api/score`, the module that actually exports it.
- `__tests__/lib/editor/types.test.ts` now builds complete `LegacyCvDocument` fixtures instead of partial object literals that only passed because runtime migration ignores the argument.
- `lib/api/import.test.ts` narrows `ImportResponse` with `isImportResult` before reading legacy fields.
- `lib/api/types.test.ts` types the V2 fixture as `CvDocument`, preserving literal confidence marker types without unsafe casts.

### Suppression / unsafe-cast check

- No `@ts-ignore`.
- No `eslint-disable`.
- No broad `as unknown as` cast.
- The existing tuple extraction in `lib/api/import.test.ts` was pre-existing and unrelated.

### Latent bug signal

The finding reveals test-fixture drift, not a runtime production bug. The drift was still blocking because `tsconfig.json` includes all `**/*.ts` and `**/*.tsx`, including tests, and `pnpm typecheck` is an independent gate.

**Result**: APPROVE.

---

## ARCO Cancel Redirect Fix Review

### Assessment

The ARCO patch is correct and minimal.

Root cause was not the DELETE path or the modal: `ArcoPanel` already called `arco.cancel()`, then `signOut()`, then pushed `/auth/signin?reason=arco-cancel`. The final page was wrong because `app/auth/signin/page.tsx` redirected every local-mode render to `/analizar` before preserving reasoned post-sign-out flows.

The fix moves local-mode redirect logic into `SignInInner`, after reading `reason`, and redirects only when `IS_LOCAL && !reason`.

### Spec fit

- Preserves default local-mode `/auth/signin` → `/analizar` behavior.
- Preserves `/auth/signin?reason=arco-cancel` after ARCO cancel.
- Preserves `/auth/signin?reason=email-rotated&email=...` banner behavior.
- Does not change the E2E expectation.
- Does not expose tokens, headers, or PII.

### Edge cases

- Cancel DELETE error/network error: unchanged; `useArco.cancel()` sets error and does not throw, so the current UI may still navigate after failed cancel. This behavior pre-existed and is a product hardening candidate, but not introduced by this fix and not the verified regression.
- Stale session: the reasoned sign-in page now avoids the local-mode redirect override. `signOut()` is still asynchronous and best-effort, as before.
- Non-local mode: unaffected; `IS_LOCAL` is false, so the page renders normally.

**Result**: APPROVE_WITH_MINOR_NOTES due the pre-existing cancel-error navigation caveat.

---

## Verify Report Review

The updated `verify-report.md` is coherent with the new evidence:

- Verdict changed from `NEEDS_WORK` to `PASS_WITH_NOTES`.
- Both original blocking findings are listed as CLOSED with root cause and file evidence.
- Command table includes before/after failing evidence, post-fix gates, focused 3x ARCO runs, full unit count, and endpoint drift.
- Deferred post-MVP list preserves the original 7 safe deferrals.
- Archive/tag readiness is correctly marked yes, with tag gated after archive.

Minor note: the defensive grep command is intentionally broad and catches allowlist strings in comments/tests/drift scripts. The report handles this as `PASS_WITH_NOTES` and relies on `check-endpoint-drift.mjs` as the authoritative endpoint-drift gate. That is acceptable.

---

## Regression / Leak / Drift Review

- New regressions introduced: none found.
- New token/header/PII leaks: none found.
- Endpoint drift: none found by authoritative script.
- Scope creep: none; changes are limited to test typing, sign-in redirect behavior, and SDD docs.
- Backend touched: no.
- Dependencies added: no.
- Test expectations relaxed: no.

---

## Readiness

- `sdd-archive`: APPROVE.
- Final tag: APPROVE after archive, per project rule.
- Required patches before archive: none.

## Findings

- BLOCKER: 0
- MAJOR: 0
- MINOR: 0
- NIT: 2
  1. Defensive grep raw output contains expected allowlist strings; no actionable drift.
  2. Pre-existing ARCO cancel error path can still navigate after failed DELETE because `useArco.cancel()` swallows errors; consider hardening post-MVP if product wants stricter destructive-action guarantees.
