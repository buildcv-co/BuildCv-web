# Fresh Re-Review — 009-auth-web PR1 MINOR-1 + NIT-1

**Date**: 2026-06-26
**Reviewer**: review-risk
**Mode**: FRESH CONTEXT — focused re-review on PR1 follow-up (MINOR-1 patch + NIT-1 doc fix + autosquash)
**Scope**: NOT a full re-review of PR1. Only follow-up commits (`3ef7146`, `be2f257`) and history hygiene.
**Verdict**: **APPROVE**

## Diff summary

- Branch: `feature/009-auth-web-pr1-auth-adapter`
- Base: `e6f6cac` (web main)
- Tip: `be2f257`
- Commits: **5 total** on top of base (3 PR1 + 2 follow-up)
- Backend: **NOT touched** (api @ `6fcc2ac7`, working tree clean)
- Total PR1+follow-up vs base: 10 files, +1901/-48 LOC
- Dependency changes: 0 (`git diff e6f6cac..HEAD -- package.json pnpm-lock.yaml` empty)

## Autosquash verification (NIT-2)

| Pre-autosquash SHA | Post-autosquash SHA | Message |
|---|---|---|
| `b7ae3e6` + `7888b2c fixup!` | `2736e8a` | `test(auth): cubrir contrato web-signup (PR1 RED)` |
| `62f9c87` | `5fbf47c` | `fix(auth): adaptar web signup al contrato bff (PR1 GREEN)` |
| `7c9f07f` | `c75bfd0` | `docs(009-auth-web): registrar avance PR1` |

- `git log --format='%s' e6f6cac..HEAD | grep -i "fixup\|squash"` → **0 matches** ✅
- History clean: 3 commits (test → fix → docs)
- SHAs rewritten as expected (`2736e8a` / `5fbf47c` / `c75bfd0` in place of `b7ae3e6` / `62f9c87` / `7c9f07f`)
- Status: **CLOSED ✅**

## MINOR-1 verification

**Implementation choice**: A (skip + warn) — chose per Constitution Art. I (no invent user data).

**Implementation location**: `lib/auth.ts:62-67` (gate after provider check, before adapter call)

```ts
if (!name) {
  console.warn(
    "[auth/events.signIn] skipping web-signup: provider profile missing required `name` field (MINOR-1 fix; per Constitution Art. I we do NOT invent the name from email local-part)",
  );
  return;
}
```

**Constitution compliance**:

- ✅ **Art. I (cero invención)**: explicit comment "we do NOT invent the name from email local-part". Decision rationale documented in commit body and JSDoc at `lib/auth.ts:40-50`.
- ✅ **Art. III (privacidad)**: `console.warn` message contains NO PII (verified by test triangulado `__tests__/lib/auth.test.ts:202-205`: `expect(warnMessage).not.toContain("anon@example.com")` and `expect(warnMessage.toLowerCase()).toContain("name")`).
- ✅ **Art. V (input validation)**: `name` validated alongside `provider`/`providerAccountId`/`email` (gate after provider check, before adapter call).
- ✅ **R1-A (best-effort sign-in)**: no throw, no block — NextAuth proceeds; `registerWithBackend` is NOT called with `name=""` (verified: `expect(adapterMock.registerWithBackend).not.toHaveBeenCalled()` + `expect(fetchMock).not.toHaveBeenCalled()`).

**TDD evidence (verified in worktree)**:

| Phase | Result | Evidence |
|---|---|---|
| RED (without fix) | **2 fail / 6 pass** | Worktree at `be2f257` with `lib/auth.ts` reverted to `5fbf47c` version. New tests fail with `expected "spy" to not be called at all, but actually been called 1 times` — adapter IS invoked with `{name: ""}`. Confirms bug exists. |
| GREEN (with fix) | **8 pass** | Re-applying `3ef7146`'s `lib/auth.ts` change → all 8 tests pass. Confirms fix is sufficient. |

**RED test messages** (from worktree, raw output):
```
FAIL  __tests__/lib/auth.test.ts > events.signIn hook (PR1 — adapter wiring) >
      `events.signIn` NO llama `registerWithBackend` cuando `name` es `undefined` (claim ausente en el profile OAuth)
AssertionError: expected "spy" to not be called at all, but actually been called 1 times
Received:
  1st spy call:
    Array [
      Object {
        "email": "u@example.com",
        "name": "",            ← BUG: undefined fell through to ""
        "provider": "linkedin",
        ...
      },
    ]
```

The second RED (empty string) followed the same pattern. Both bugs are real, both are fixed.

**Test coverage**:

- 2 triangulated tests added in `__tests__/lib/auth.test.ts:178-225`:
  - `name=""` → adapter NOT called + `console.warn` called once + warning does NOT contain email
  - `name=undefined` → adapter NOT called + `console.warn` called once
- Both tests are honest: `registerWithBackend` is `vi.fn()` (mock), `global.fetch` is also mocked → assertion is real, not over-coupled.

**Triangulation quality**: Both tests assert the same observable behavior but cover two distinct entry points in NextAuth's profile-mapping path (explicit empty string vs. undefined claim). This is genuine triangulation per TDD discipline, not duplication.

**Status**: **CLOSED ✅**

## NIT-1 verification (doc correction)

**Drift type**: typecheck count "8→7" (off-by-one in `apply-progress.md`)

**Resolution**: corrected in `apply-progress.md:369` from `8 pre-existing` to `7 pre-existing`. Verified by re-running `pnpm tsc --noEmit` (2026-06-26):

```
__tests__/components/analyzer/analyzer.test.tsx(22,34): error TS2305
__tests__/lib/editor/types.test.ts(226,11): error TS2353
__tests__/lib/editor/types.test.ts(263,11): error TS2740
__tests__/lib/editor/types.test.ts(277,11): error TS2740
lib/api/import.test.ts(126,19): error TS2339
lib/api/import.test.ts(127,19): error TS2339
lib/api/types.test.ts(723,3): error TS2322
```

Count: **7 errors**, all pre-existing on `e6f6cac` baseline, 0 new from PR1 or MINOR-1 fix.

**New section**: `apply-progress.md:461` adds "PR1 — review follow-up (MINOR-1 + NIT-1)" section (~175 LOC) with TDD evidence, commands run, REQs/NFRs/Compliance covered.

**Addendum**: `reviews/pr1-fresh-review.md:477-541` appended (~64 LOC). Status correctly reports:

- NIT-2: **CLOSED ✅** (line 489)
- MINOR-1: **CLOSED ✅** (line 494)
- NIT-1: **CLOSED ✅** (line 502)
- New issues: BLOCKER=0, MAJOR=0, MINOR=0, NIT=0
- Recommendation: push=Y, merge=Y, enable PR2=Y

**Status**: **CLOSED ✅**

## Commands run + results

| Command | Result |
|---|---|
| `git status --short` (web) | clean |
| `git branch --show-current` | `feature/009-auth-web-pr1-auth-adapter` |
| `git log --oneline e6f6cac..HEAD` | 5 commits (clean, no `fixup!` loose) |
| `git rev-parse HEAD` (api) | `6fcc2ac7` (untouched) |
| `git status --short` (api) | clean |
| `pnpm lint` | exit 0 (clean, no output) |
| `pnpm vitest run __tests__/lib/auth.test.ts` | **8/8 PASS** (was 6, +2 triangulados) |
| `pnpm test` (full suite) | **1042/1042 PASS** (was 1040, +2 net) |
| `pnpm build` | PASS, `/api/auth/web-signup` registered as `ƒ (Dynamic)` |
| `pnpm tsc --noEmit` | **7 pre-existing** errors (verified; 0 new) |
| `grep -rn "/api/v1/auth/\${provider}/callback" app/ lib/ components/` | 0 matches |
| `grep -rn "providerId" app/ lib/ components/` | 0 matches |
| `grep -rn "/auth/sign-out" app/ lib/ components/` | 0 matches |
| `grep -rn "/privacy/policies" app/ lib/ components/` | 0 matches |
| `grep -rn "/user/consent[^/]" app/ lib/ components/` | 0 matches |
| `grep -rn "NEXT_PUBLIC_BFF_API_KEY" app/ lib/ components/` | 0 matches |
| `grep -rn "BFF_API_KEY" components/` | 0 matches |
| `grep -rn "X-BFF-Key" components/` | 0 matches |
| `grep -rn "@ts-ignore\|@ts-expect-error" app/ lib/ components/` | 0 matches |
| `grep -rn "eslint-disable" app/ lib/ components/` | 0 matches |
| `git diff e6f6cac..HEAD -- package.json pnpm-lock.yaml` | empty (no dep changes) |
| RED worktree test (without fix) | 2 fail / 6 pass (real RED evidence) |
| GREEN worktree test (with fix) | 8 pass |

## Focused checklist

### Autosquash (NIT-2)
- [x] `7888b2c fixup!` collapsed into `2736e8a test(auth)`
- [x] History is 3 PR1 commits clean: test → fix → docs
- [x] No `fixup!` loose in history (`grep -i fixup` → 0)
- [x] SHAs are new (autosquash rewrote them, as expected)

### MINOR-1 (events.signIn fallback)
- [x] Implementation choice documented: option A (skip + warn)
- [x] Implementation matches Constitution Art. I (no invent user data) — explicit comment, no fallback to email local-part
- [x] Implementation matches Constitution Art. III (no PII in logs) — `console.warn` contains NO email
- [x] 2 RED tests added (empty + undefined name), triangulated
- [x] Both tests FAIL before implementation (verified in worktree)
- [x] Both tests PASS after implementation
- [x] Adapter does NOT call backend with `name=""` (verified by `expect(adapterMock.registerWithBackend).not.toHaveBeenCalled()`)
- [x] Warn message does NOT leak email/PII (verified by `expect(warnMessage).not.toContain("anon@example.com")`)
- [x] Existing 11+7+7+6 tests still pass (no regression) — full suite 1042/1042
- [x] Total tests: 1042/1042 (was 1040, +2 net)

### NIT-1 (doc correction)
- [x] `apply-progress.md:369` corrected from "8 pre-existing" to "7 pre-existing"
- [x] Drift verified (re-running `pnpm tsc --noEmit` shows exactly 7 errors)
- [x] `apply-progress.md:461` has new "PR1 — review follow-up (MINOR-1 + NIT-1)" section
- [x] `pr1-fresh-review.md:477-541` has addendum appended (after original content)
- [x] Addendum reports NIT-2 CLOSED ✅, MINOR-1 CLOSED ✅, NIT-1 CLOSED ✅

### Auth contract regression
- [x] NO use of legacy `/callback` (grep 0)
- [x] NO use of `providerId` legacy field (grep 0)
- [x] Body still `{ provider, providerAccountId, email, name }` (verified by existing test at `__tests__/lib/auth.test.ts:122-128`)
- [x] `X-BFF-Key` still sent server-side only (grep 0 in components/)
- [x] No new endpoint drift

### Secret leak check
- [x] No `NEXT_PUBLIC_BFF_API_KEY` exposed (grep 0)
- [x] No `BFF_API_KEY` in client components (grep 0 in components/)
- [x] No `X-BFF-Key` in client-side code (grep 0 in components/)

### Backend untouched
- [x] api main still @ `6fcc2ac7`
- [x] api working tree clean
- [x] No api files in PR1+follow-up diff (`git diff e6f6cac..HEAD` is web-only)

### Commit hygiene
- [x] 5 commits total: `2736e8a` (test) → `5fbf47c` (fix) → `c75bfd0` (docs) → `3ef7146` (fix MINOR-1) → `be2f257` (docs follow-up)
- [x] Conventional format (`test(auth):`, `fix(auth):`, `docs(009-auth-web):`)
- [x] Spanish messages (all body text in Spanish)
- [x] No AI attribution (`grep -iE "co-authored|claude|gpt|anthropic|openai"` → 0)
- [x] No `fixup!` loose

## Critical questions (8)

### 1. Does MINOR-1 implementation honor Constitution Art. I (no user data invention)?

**YES.** Explicit `console.warn` message states "per Constitution Art. I we do NOT invent the name from email local-part". No fallback to derived data. Decision documented in JSDoc (`lib/auth.ts:40-50`) and commit body of `3ef7146`.

### 2. Does MINOR-1 implementation honor Constitution Art. III (no PII in logs)?

**YES.** `console.warn` message is static: `"[auth/events.signIn] skipping web-signup: provider profile missing required \`name\` field (MINOR-1 fix; per Constitution Art. I we do NOT invent the name from email local-part)"`. Contains NO email, NO providerAccountId, NO provider name. Verified by `__tests__/lib/auth.test.ts:202-205` (`expect(warnMessage).not.toContain("anon@example.com")`).

### 3. Does the RED test prove the bug (would FAIL without the fix)?

**YES.** Worktree verification: at `be2f257` HEAD with `lib/auth.ts` reverted to `5fbf47c` version (no MINOR-1 gate), both new tests FAIL:

- `name=""` test: `registerWithBackend` called with `{name: ""}` → assertion fails
- `name=undefined` test: `?? ""` defaults to empty → `registerWithBackend` called with `{name: ""}` → assertion fails

This is real RED evidence, not vacuous.

### 4. Does the GREEN test pass after the fix?

**YES.** Re-applying `3ef7146`'s `lib/auth.ts` change → all 8 tests pass. Plus full suite 1042/1042.

### 5. Does the addendum correctly append (not rewrite) the original review?

**YES (with one minor honesty note below).** The original PR1 review (lines 1-444 of `pr1-fresh-review.md`) is preserved verbatim — same verdict, same MINOR-1/NIT-1/NIT-2 descriptions, same 11-section checklist, same critical questions, same recommendation. The addendum (lines 477-541) is clearly demarcated with `---` separator and labeled "## Re-Review Addendum — PR1 review follow-up (autosquash + MINOR-1 + NIT-1)".

**Honesty note (SUGGESTION, not NIT)**: The file `specs/009-auth-web/reviews/pr1-fresh-review.md` was DELETED at some point in history (not present in `e6f6cac` base, not in `c75bfd0` PR1 docs commit). The commit `be2f257` recreates the file with the original content + addendum. The git diff shows `new file mode 100644`. The commit message claims "addendum al final del archivo (sin reescribir el original)" — strictly speaking this is inaccurate because the file did not exist in the parent commit. However, the SUBSTANCE is preserved (original review content is intact, addendum appended). This is functionally equivalent to an addendum. The substance matches the intent; only the commit message wording overstates the continuity.

### 6. Does autosquash preserve all changes (just combines commits)?

**YES.** SHAs changed (`2736e8a` in place of `b7ae3e6` + `7888b2c`) but content is the same: tests added in RED + fix added + delta from fixup! both now in single `2736e8a` commit. Total LOC delta is identical (10 files, +1901/-48) before and after autosquash.

### 7. Are test counts now accurate in apply-progress.md?

**YES.** Re-verified all counts against current state:

| Suite | Claimed | Actual | Status |
|---|---|---|---|
| `auth-adapter.test.ts` | 11 | 11 | ✅ |
| `web-signup/route.test.ts` | 7 | 7 | ✅ |
| `no-hardcoded-urls.test.ts` | 7 | 7 | ✅ |
| `auth.test.ts` (post-PR1) | 6 | 6 | ✅ |
| `auth.test.ts` (post-MINOR-1) | 8 (added 2) | 8 | ✅ |
| **Full suite** | 1042 (was 1040) | 1042 | ✅ |
| **Typecheck pre-existing** | 7 (corrected from 8) | 7 | ✅ |

### 8. Did the follow-up break any existing tests (regression)?

**NO.** All existing tests pass:
- `auth-adapter.test.ts`: 11/11 PASS
- `web-signup/route.test.ts`: 7/7 PASS
- `no-hardcoded-urls.test.ts`: 7/7 PASS
- `auth.test.ts` existing tests: 6/6 PASS (was 6, now 6+2=8)
- Full suite: 1042/1042 PASS (was 1040, now +2)

## New issues found

### BLOCKER: 0

### MAJOR: 0

### MINOR: 0

### NIT: 0 (technical)

### SUGGESTION: 1 (cosmetic, optional)

**SUGGESTION**: `be2f257` commit message claims "addendum al final del archivo (sin reescribir el original)" but `pr1-fresh-review.md` did not exist in the parent commit (`3ef7146`) — it was a `new file` recreation that included the original content + addendum. Practically equivalent (substance preserved), but technically a rewrite of a deleted file rather than an addendum to an existing one.

- **File**: `specs/009-auth-web/reviews/pr1-fresh-review.md` (540 lines, exists in `be2f257` but not in `c75bfd0` or `e6f6cac`)
- **Evidence**: `git log --oneline --all --diff-filter=A -- specs/009-auth-web/reviews/pr1-fresh-review.md` → only `be2f257`. `git ls-tree -r c75bfd0 -- specs/009-auth-web/reviews/` → no `pr1-fresh-review.md`.
- **Why it matters**: Documentation integrity / commit message accuracy. Substance is intact; only the framing is slightly inaccurate.
- **Fix**: Optional. Either (a) accept as-is (functional outcome matches intent), (b) clarify in commit message of any future follow-up that `pr1-fresh-review.md` was recreated from archive, or (c) note in PR1 addendum that the file was recreated for continuity.

**Not blocking.** The intent and substance of the addendum are preserved. Reviewers and future readers will see the full original + addendum with proper status updates.

## Auth contract regression

**PASS.** All legacy contract elements remain absent (`/callback`, `providerId`, `/auth/sign-out`, `/privacy/policies`, `/user/consent[^/]`). Canonical contract `{ provider, providerAccountId, email, name }` intact. `X-BFF-Key` header still server-side only. PR1+follow-up does not introduce any endpoint drift.

## Secret leak check

**PASS.** `NEXT_PUBLIC_BFF_API_KEY`, `BFF_API_KEY` (in components/), and `X-BFF-Key` (in components/) all return 0 grep matches. MINOR-1 implementation only adds a `console.warn` with static text (no dynamic values, no PII, no secret material). Defensive grep tests at `no-hardcoded-urls.test.ts` continue to enforce.

## Backend untouched

**PASS.** `BuildCv-api` HEAD still `6fcc2ac7`, working tree clean, no api files in `git diff e6f6cac..HEAD`. PR1 is web-only.

## Commit hygiene

**PASS.**

- 5 commits total: `2736e8a` (test) → `5fbf47c` (fix) → `c75bfd0` (docs) → `3ef7146` (fix MINOR-1) → `be2f257` (docs follow-up)
- All use conventional format (`test(auth):`, `fix(auth):`, `docs(009-auth-web):`)
- All Spanish messages
- No AI attribution (`grep -iE "co-authored|claude|gpt|anthropic|openai"` → 0)
- No `fixup!` loose
- MINOR-1 commit body is exemplary: documents RED/GREEN/REFACTOR phases, Constitution rationale, file:line references, REQ IDs

## Test counts post-follow-up

| Suite | Tests |
|---|---|
| `auth-adapter.test.ts` | 11 |
| `route.test.ts` (web-signup) | 7 |
| `no-hardcoded-urls.test.ts` | 7 |
| `auth.test.ts` | 8 (was 6 + 2 MINOR-1 triangulados) |
| **PR1 net new** | 30 (28 + 2 MINOR-1) |
| **Full suite** | **1042** (was 1040, +2 net) |

## Recommendation

- **Push to remote**: **Y** — no BLOCKER, no MAJOR, all NITs/MINORs closed, history clean, tests green, lint clean, build green, typecheck no new regressions, no secret leak, no endpoint drift, backend untouched
- **Merge to web/main**: **Y** — safe after MINOR-1 + NIT-1 follow-up
- **Enable PR2**: **Y** — unblocked; `lib/api/auth-adapter.ts` + `events.signIn` hook (with MINOR-1 gate) + `lib/api/jwt.ts:152 clearJwtCache()` are ready

## Approval criteria checklist

- [x] MINOR-1 CLOSED (real RED + GREEN evidence in worktree)
- [x] NIT-2 CLOSED (autosquash verified: 0 loose `fixup!`, SHAs rewritten correctly)
- [x] NIT-1 CLOSED (apply-progress.md corrected, addendum appended)
- [x] No BLOCKER
- [x] No MAJOR
- [x] No new MINOR
- [x] Tests/lint/build pass (1042/1042, lint clean, build green)
- [x] Typecheck no new regressions (7 pre-existing, 0 new)
- [x] No secret leak (defensive greps all 0)
- [x] No endpoint drift (forbidden paths absent)
- [x] Backend untouched (api @ `6fcc2ac7`, clean tree)
- [x] Commit hygiene clean (5 commits, conventional, Spanish, no AI attribution, no `fixup!` loose)
- [x] Constitution Art. I honored (no invent user data)
- [x] Constitution Art. III honored (no PII in logs — verified by test)

## Reviewer notes

1. **MINOR-1 fix is exemplary TDD discipline**. RED was real (verified in worktree: 2 tests fail without the fix because adapter is invoked with `name=""`). GREEN is minimal (6 LOC including justification comment). Triangulation is genuine (covers `name=""` and `name=undefined` as two distinct entry points in NextAuth's profile-mapping path).

2. **Constitution alignment is explicit, not implicit**. The implementation comment literally cites Art. I ("we do NOT invent the name from email local-part") and the JSDoc spells out the privacy tradeoff. This is the kind of constitutional reasoning that should be model for future MINOR decisions.

3. **Documentation fidelity has one minor cosmetic blemish** (SUGGESTION above) — the addendum to `pr1-fresh-review.md` is technically a recreation of a deleted file rather than an addendum to an existing one. The substance is preserved, so this is non-blocking. Future follow-ups might want to be more precise in commit messages about file lifecycle.

4. **The follow-up is fully aligned with the user's decision (option B: autosquash + fix MINOR-1 + merge)**. No deferring, no scope creep, no PR2 code, no new dependencies. Clean SDD execution.

5. **Worktree-based RED verification was the right call**. A reviewer who only reads the diff can confirm tests were added but cannot prove they would fail without the fix. Doing the worktree swap (`git show 5fbf47c:lib/auth.ts > /tmp/worktree/lib/auth.ts` → `pnpm vitest run`) is what turns "TDD discipline" from a claim into evidence.

## Files reviewed (this re-review)

- `lib/auth.ts:62-67` — MINOR-1 gate
- `__tests__/lib/auth.test.ts:178-225` — 2 triangulated RED tests
- `specs/009-auth-web/apply-progress.md:369,461-633` — NIT-1 correction + new section
- `specs/009-auth-web/reviews/pr1-fresh-review.md:477-541` — addendum

## Files NOT re-reviewed (out of scope)

- `lib/api/auth-adapter.ts` (unchanged from PR1 GREEN)
- `app/api/auth/web-signup/route.ts` (unchanged from PR1 GREEN)
- `__tests__/lib/api/auth-adapter.test.ts`, `__tests__/app/api/auth/web-signup/route.test.ts`, `__tests__/security/no-hardcoded-urls.test.ts` (unchanged from PR1 base)
- `.env.example` (unchanged from PR1 base)
- `.opencode/`, `lib/api/jwt.ts`, all other web code (unchanged)

PR1 base review (`pr1-fresh-review.md:1-444`) and PR0 review are reference material, not re-reviewed.
