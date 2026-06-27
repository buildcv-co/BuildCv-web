# Fresh Review — 009-auth-web PR8

**Date**: 2026-06-27  
**Reviewer**: review-risk  
**PR scope**: Web e2e + a11y + OpenAPI CI drift gate (last SHOULD_FIX)  
**Verdict**: REQUEST_CHANGES

## Diff summary

- Branch: `feature/009-auth-web-pr8-e2e-a11y-openapi`
- Base: `8752722`
- Tip: `98bd81e`
- Commits: 3 (`1055ba4` test, `da78eb5` fix, `98bd81e` chore)
- Files: 14 changed, `+584/-11`
- Production NET: `+6 LOC` by `git diff --numstat 8752722..HEAD -- components/account/arco-panel.tsx lib/use-arco.ts` (`+14/-8`). The sub-agent claim of `+11` was not reproduced, but the change remains far under the 350 LOC cap.
- Tests added: 16 PR8 Playwright tests (6 account/ARCO, 3 UserMenu, 4 a11y, 3 endpoint drift)
- Suite: Vitest `1134/1134` passing. PR8 focused Playwright suite passed on rerun with `NEXT_PUBLIC_LOCAL_MODE=false`, but one focused run failed first.

## Commands run + results

| Command | Result |
|---|---|
| `git branch --show-current` | PASS — `feature/009-auth-web-pr8-e2e-a11y-openapi` |
| `git log --oneline -10` | PASS — expected 3 PR8 commits on top of `8752722` |
| `git show 1055ba4 --stat` | PASS — e2e files + Playwright config/mock backend |
| `git show da78eb5 --stat` | PASS — ARCO UI fix in `arco-panel.tsx` + `use-arco.ts` |
| `git show 98bd81e --stat` | PASS — drift script, CI, package script, docs |
| `git diff 8752722..HEAD --stat` | PASS — 14 files, `+584/-11` |
| `git diff --shortstat 8752722..HEAD` | PASS — 14 files changed |
| API `git rev-parse HEAD` | PASS — `66fcaf1a13d511eb088ae93443f255c376459ebf` |
| API `git status --short` | PASS — clean |
| `pnpm lint` | PASS |
| `pnpm test` | PASS — 119 files, 1134 tests |
| `pnpm test --filter "e2e"` | FAIL — Vitest 2 does not support `--filter` through this script (`Unknown option --filter`) |
| `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e -- account-flow user-menu-pr8 a11y-auth-pr8 endpoint-drift` | FAIL once — 15 passed, `Arco_RectifyNameShowsSuccessAndUpdatedData` timed out waiting for success status |
| same PR8 focused command rerun | PASS — 16/16 |
| `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e -- account-flow` | PASS — 6/6 |
| `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e -- a11y-auth-pr8` | PASS — 4/4 |
| `pnpm test:e2e -- endpoint-drift` | PASS — 3/3 |
| `pnpm test:e2e -- account-flow user-menu-pr8 a11y-auth-pr8 endpoint-drift` | PASS with skips — 11 passed, 5 skipped because non-local mode was not enabled |
| `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e` | FAIL — 129 passed, 10 failed; expected because non-local mode breaks existing local-mode/subscription E2E assumptions |
| `pnpm build` | PASS |
| `pnpm tsc --noEmit` | FAIL — same 7 documented pre-existing typecheck errors |
| `node scripts/check-endpoint-drift.mjs` | PASS — exit 0 |
| Defensive endpoint greps | NOTE — raw grep finds legacy strings in comments and in `scripts/check-endpoint-drift.mjs` denylist; drift script itself strips comments and scans `app/lib/components` only |
| Secret/token/PII/suppression greps | PASS with notes — no client-code exposure found; raw hits were denylist/comment-only |
| `git diff main..HEAD -- package.json pnpm-lock.yaml` | PASS — only npm script added; no lockfile/dependency change |
| Web `git status --short` | PASS — clean except this review file after report creation |

## Checklist (12 sections)

1. **E2E smoke (SHIPPED features only)** — ⚠️ note. Coverage exists for `/cuenta`, ARCO, UserMenu, sign-out, and cancel confirmation. Focused 16-test run passed on rerun; first run failed once.
2. **ARCO stale UI fix (`da78eb5`)** — ✅ pass. Source evidence shows previous code rendered `JSON.stringify(userData)` from props and `rectify()` returned `void`; fix returns updated data and renders `displayedUserData`.
3. **In-house a11y (no new deps)** — ✅ pass. No `@axe-core/playwright` package diff; 4 PR8 a11y tests pass under non-local mode.
4. **Drift gate (source-based)** — ✅ pass. Script, npm script, and CI step exist; script validates canonical web/backend paths.
5. **Endpoint/path drift** — ⚠️ note. Drift gate passes. Raw grep commands are noisy because comments and denylist literals intentionally contain forbidden strings.
6. **Secret/token/PII** — ✅ pass. No client `BFF_API_KEY`/`X-BFF-Key`/`NEXT_PUBLIC_BFF_API_KEY`; no token leak in executable client code; no PII logging hit.
7. **Test quality** — ⚠️ note. Tests are real Playwright flows, not UI-only disabled-state checks. However the focused 16-test suite failed once locally, then passed.
8. **Typecheck baseline** — ✅ pass with baseline note. `pnpm tsc --noEmit` still has 7 known pre-existing errors; none are in PR8 files.
9. **Build/lint/test** — ⚠️ note. Lint, build, Vitest, focused a11y, endpoint-drift pass. Requested `pnpm test --filter ...` commands are invalid for current scripts.
10. **Scope control** — ✅ pass. No PR3 `/privacidad`, no PR5 consent UI, backend untouched, no tag/archive/sdd-verify.
11. **Size verification** — ✅ pass with correction. Production net is `+6` by numstat, not `+11`; still under cap by 344.
12. **MVP Final Readiness Checkpoint** — ⚠️ needs work. Section exists but has 8 numbered items, not the requested 10 questions; it lacks explicit `MVP_BLOCKER = 0`, `SHOULD_FIX_BEFORE_LAUNCH = 0`, `SAFE_DEFER_POST_MVP`, and `READY FOR sdd-verify 009` wording.

## Critical questions (7)

1. **Do the 16 e2e + a11y + drift tests provide real coverage of the MVP flow?** Yes, for shipped auth/UserMenu/ARCO/drift scope. Risk: one focused run failed once, so reliability needs tightening before using this as a final gate.
2. **Does the ARCO stale UI fix correctly address a real bug (RED proven)?** Yes by source evidence: the test added in `1055ba4` asserts updated Access JSON, while pre-fix code could only render the original prop. Risk: I did not checkout-and-run `1055ba4`; verification is source/diff based.
3. **Is the in-house a11y approach solid (no `@axe-core/playwright`)?** Adequate for reduced scope. It checks landmarks, headings, labelled controls, dialog names, focus return, and modal close behavior. It is not equivalent to axe/Lighthouse.
4. **Does the source-based drift gate actually prevent endpoint drift?** Mostly yes for hardcoded literals in `app/lib/components` after comment stripping and backend canonical presence. It does not scan `e2e/scripts`, by design, and is not a typed OpenAPI client.
5. **Are PR1-PR7 regression tests still all passing?** Vitest regression suite passes `1134/1134`. Full E2E under `NEXT_PUBLIC_LOCAL_MODE=false` is not a valid all-suite mode because it breaks existing local-mode tests.
6. **Is the MVP Final Readiness Checkpoint honest and verifiable?** Needs work. Current section is directionally honest but incomplete against the requested checkpoint schema.
7. **Is PR8 ready to ship so sdd-verify 009 can proceed?** Not yet. Code/security posture looks acceptable, but the final readiness artifact and focused test reliability should be cleaned up first.

## New issues

### BLOCKER: 0

### CRITICAL: 0

### WARNING: Focused PR8 suite failed once under the required non-local mode

- **Affected files**: `e2e/account-flow.spec.ts`, `e2e/auth-web-fixtures.ts`, `scripts/e2e-mock-backend.mjs`, `playwright.config.ts`
- **Evidence**: `NEXT_PUBLIC_LOCAL_MODE=false pnpm test:e2e -- account-flow user-menu-pr8 a11y-auth-pr8 endpoint-drift` first run: 15 passed, 1 failed at `Arco_RectifyNameShowsSuccessAndUpdatedData`, timeout waiting for `data-testid="arco-rectify-success"`. Immediate rerun passed 16/16.
- **Why it matters**: PR8 is intended to be the final confidence gate before `sdd-verify`; a flaky focused gate can mask regressions or waste CI/review cycles. The shared mutable mock backend plus `fullyParallel: true` is the likely risk area, although CI uses `workers: 1`.

### WARNING: MVP Final Readiness Checkpoint is incomplete against the requested schema

- **Affected files**: `specs/009-auth-web/apply-progress.md:1728-1741`
- **Evidence**: Section has 8 numbered items and a short “Ready for verification?” note. It does not explicitly answer 10 questions and does not list `MVP_BLOCKER = 0`, `SHOULD_FIX_BEFORE_LAUNCH = 0`, `SAFE_DEFER_POST_MVP`, or `READY FOR sdd-verify 009`.
- **Why it matters**: The checkpoint is the handoff artifact for final verification. If it is underspecified, the next reviewer cannot mechanically validate that all MVP launch risks were closed/deferred honestly.

### SUGGESTION: Focused command ergonomics are inconsistent with the requested verification commands

- **Affected files**: `package.json`
- **Evidence**: `pnpm test --filter "e2e"`, `pnpm test --filter "a11y"`, and `pnpm test --filter "endpoint-drift"` all fail with Vitest `Unknown option --filter`. The actual passing commands are Playwright invocations through `pnpm test:e2e -- ...`.
- **Why it matters**: Review and CI gates should be reproducible from documented commands, especially before `sdd-verify`.

### SUGGESTION: Raw defensive grep expectations are noisy

- **Affected files**: `app/api/auth/logout/route.ts`, `lib/api/sign-out.ts`, `app/api/user/data/route.ts`, `lib/api/user-data.ts`, `scripts/check-endpoint-drift.mjs`
- **Evidence**: Raw greps find forbidden endpoint strings in comments and in the drift script denylist itself. The drift gate passes because it strips comments and scans runtime web source dirs only.
- **Why it matters**: The current manual grep checklist says “all should be 0”, but the repo intentionally contains those literals as documentation/denylist entries. That creates false alarms during review.

## Security review

Pass. No evidence of hardcoded production secrets, client-exposed BFF keys, auth token leaks, PII logging, frontend-only authz changes, raw HTML sinks, SQL/NoSQL/command string concatenation, or auth cookies missing protections in changed PR8 code. The Playwright-only `NEXTAUTH_SECRET` is a test fixture secret, not production config.

## Endpoint/path review

Pass with grep-noise note. `scripts/check-endpoint-drift.mjs` passes and checks canonical web/backend paths. Forbidden raw-string greps match comments/denylist, not executable client calls.

## A11y review

Pass for reduced scope. The 4 in-house tests cover `/cuenta` landmarks/headings/labels, UserMenu accessible name and focus return, ARCO cancel modal accessible naming/label/close path, and header navigation landmark. No new a11y npm dependency was added.

## Drift gate review

Pass. Script is source-based and defensive, not a full OpenAPI client. CI includes `pnpm run check:endpoint-drift` before build.

## ARCO stale UI fix review

Bug is real and in scope. Pre-fix `ArcoPanel` rendered the original `userData` prop in Access JSON and `useArco.rectify()` returned `void`; post-fix code returns `UserDataResponse | null`, stores `displayedUserData`, and renders the updated object. The E2E assertion targets exactly this stale-UI behavior.

## MVP Final Readiness Checkpoint

Needs work. Existing checkpoint is useful but does not meet the requested “10 questions + explicit counts/deferred/verdict” format. It should be expanded before final handoff.

## Recommendation

- Push: N
- Merge to web/main: N
- Enable sdd-verify 009: N

## Approval criteria checklist

- [x] BLOCKER 0
- [x] CRITICAL 0
- [x] 16 tests pass on rerun under non-local mode
- [x] No endpoint drift by script
- [x] No secret/token/PII leak
- [x] No new npm deps
- [ ] MVP Final Readiness Checkpoint populated to requested schema
- [x] Lint/unit/build pass
- [x] Typecheck no new regressions identified; 7 known baseline errors remain
- [x] Backend untouched
- [x] No tag/archive/sdd-verify
