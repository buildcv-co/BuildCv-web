# Fresh Review — 009-auth-web PR1

**Date**: 2026-06-26
**Reviewer**: review-risk (R1) + comprehensive checklist
**PR scope**: Web auth adapter + contract fix (no backend changes)
**Verdict**: **APPROVE_WITH_MINOR_NOTES**

## Diff summary

- Branch: `feature/009-auth-web-pr1-auth-adapter`
- Base: `e6f6cac` (web main)
- Tip: `7c9f07f` (4 commits, see Commit Hygiene)
- Files changed: **9** (4 created, 3 modified code, 1 modified test, 1 doc-only `.env.example`)
- LOC production: **~210 net** (107 adapter + 73 BFF route + ~30 lib/auth.ts delta) — target ~180, cap 350 → +17% over forecast, **within cap**
- LOC tests: **~705 net** (305 adapter + 175 BFF route + 114 grep + 111 auth delta)
- Backend: **NOT touched** (verified `BuildCv-api` @ `6fcc2ac7`, working tree clean)

## Commands run + results

| Command | Result | Evidence |
| --- | --- | --- |
| `git status --short` | **clean** (no uncommitted) | — |
| `git log --oneline e6f6cac..HEAD` | 4 commits (`b7ae3e6`, `7888b2c`, `62f9c87`, `7c9f07f`) | commit list |
| `git rev-parse HEAD` (api) | `6fcc2ac7a1f99ebef5186af2398bce2f3c528af4` | backend untouched |
| `git status --short` (api) | clean | backend untouched ✅ |
| `pnpm lint` | **PASS** exit 0 (no output = clean) | eslint-config-next + TS rules |
| `pnpm vitest run __tests__/lib/api/auth-adapter.test.ts` | **11/11 PASS** | adapter unit |
| `pnpm vitest run __tests__/app/api/auth/web-signup/route.test.ts` | **7/7 PASS** | BFF route integration |
| `pnpm vitest run __tests__/security/no-hardcoded-urls.test.ts` | **7/7 PASS** | defensive grep |
| `pnpm vitest run __tests__/lib/auth.test.ts` | **6/6 PASS** | authOptions + events.signIn |
| `pnpm test` (full suite) | **1040/1040 PASS** (vs 1017 baseline = +23 net new) | full regression OK |
| `pnpm build` | **PASS**, `/api/auth/web-signup` registered as `ƒ (Dynamic)` | next build green |
| `pnpm tsc --noEmit` | **7 pre-existing errors**, 0 new | see Typecheck baseline review |
| `pnpm tsc --noEmit` (worktree @ e6f6cac) | **7 errors** (identical set) | baseline matches PR1 tip |
| `grep -rn "/auth/sign-out" app/ lib/ components/` | 0 matches | ✅ forbidden path absent |
| `grep -rn "/privacy/policies" app/ lib/ components/` | 0 matches | ✅ |
| `grep -rn "/user/consent[^/]" app/ lib/ components/` | 0 matches | ✅ |
| `grep -rn "/api/v1/auth/\${provider}/callback" app/ lib/ components/` | 0 matches | ✅ legacy contract absent |
| `grep -rn "providerId, email, name" app/ lib/ components/` | 0 matches | ✅ legacy body shape absent |
| `grep -rn "/auth/web-signup" app/ lib/ components/` | 5 matches (all in adapter/route/comment) | ✅ canonical path present |
| `grep -rn "/auth/logout" app/ lib/ components/` | 0 matches | not in PR1 scope (PR2 work) |
| `grep -rn "/auth/session" app/ lib/ components/` | 2 matches (`lib/api/jwt.ts:103,133`) | pre-existing, not PR1 |
| `grep -rn "NEXT_PUBLIC_BFF_API_KEY" app/ lib/ components/` | 0 matches | ✅ no client leak |
| `grep -rn "BFF_API_KEY" components/` | 0 matches | ✅ server-only |
| `grep -rn "X-BFF-Key" components/` | 0 matches | ✅ server-only |
| `grep -rn "BFF_API_KEY\s*=\s*\"" app/ lib/ components/` | 0 matches | ✅ no hardcoded secret |
| `grep -rn "@ts-ignore\|@ts-expect-error" app/ lib/ components/` | 0 matches | ✅ zero suppressions |
| `grep -rn "eslint-disable" app/ lib/ components/` | 0 matches | ✅ zero suppressions |
| `git diff e6f6cac..7c9f07f -- package.json pnpm-lock.yaml` | empty (no dep changes) | ✅ zero new deps |

## Checklist (11 sections)

### 1. Auth adapter contract — **PASS**

- ✅ NO use of `POST /api/v1/auth/${provider}/callback` (verified: `grep` returns 0 matches in app/lib/components; removed from `lib/auth.ts` per diff)
- ✅ NO use of body `{ providerId, email, name }` (verified: 0 matches)
- ✅ Uses `POST ${BACKEND_URL}/api/v1/auth/web-signup` (`auth-adapter.ts:55`)
- ✅ Sends body `{ provider, providerAccountId, email, name }` (`auth-adapter.ts:67-72`)
- ✅ No `providerId` legacy (verified by `__tests__/lib/api/auth-adapter.test.ts:105,258,283` assertions)
- ✅ Google: `provider='google'` + `providerAccountId=<sub>` (test line 236-258 covers mapping)
- ✅ LinkedIn: `provider='linkedin'` + `providerAccountId=<id>` (test line 261-283 covers mapping)
- ✅ No email/password, no magic link (spec prohibits; no code present)
- ✅ JWT helpers not broken (`lib/api/jwt.ts:83,152` — `getJwtFromSession` and `clearJwtCache` still exported; imports unchanged in `app/api/adapt/iterate/route.ts`, `app/api/payments/checkout/route.ts`, etc.)

### 2. BFF route (`app/api/auth/web-signup/route.ts`) — **PASS**

- ✅ Server-side only: declares `export const runtime = "nodejs"` (`route.ts:25`) — prevents edge runtime where `process.env` semantics differ
- ✅ Reads `process.env.BFF_API_KEY` indirectly via `registerWithBackend` (`auth-adapter.ts:50`)
- ✅ Sends `X-BFF-Key: process.env.BFF_API_KEY` (`auth-adapter.ts:65`)
- ✅ No `NEXT_PUBLIC_BFF_API_KEY` anywhere (defensive grep + grep test)
- ✅ `BFF_API_KEY` not serialized to client (verified via `no-hardcoded-urls.test.ts:75-78` — `components/` scan)
- ✅ Not in responses/logs/snapshots/errors (`console.warn` in `route.ts:60` logs only `err.detail`; the AuthAdapterError detail for BFF_AUTH_NOT_CONFIGURED is "BFF_AUTH_NOT_CONFIGURED" — generic, no secret; for upstream 5xx the detail is the backend's error message; for 401 the detail is "bad bff key" from backend — no client secret leakage)
- ✅ Fail-closed if missing: `auth-adapter.ts:51-53` throws before any fetch
- ✅ Safe error handling: 5xx upstream → 502 to client; 4xx upstream → propagate; 503 for network/timeout
- ✅ No tokens/PII exposed: response is `{ userId }` only
- ✅ No client-side bypass: imports in `lib/auth.ts` and `app/api/auth/web-signup/route.ts` only; `no-hardcoded-urls.test.ts:107-113` enforces this

### 3. Endpoint/path drift — **PASS**

- ✅ No forbidden: `/auth/sign-out`, `/privacy/policies`, `/user/consent`, `/api/v1/auth/${provider}/callback`, `/api/v1/auth/google/callback`, `/api/v1/auth/linkedin/callback` — all 0 matches
- ✅ Canonical paths: `/auth/web-signup` (5 matches in adapter/comment/route), `/auth/session` (pre-existing in jwt.ts), `/auth/logout` not yet referenced (out of PR1 scope; PR2 work)
- ✅ Old paths only in anti-regression tests (`__tests__/lib/auth.test.ts:73-76` asserts `signIn` callback is `undefined`; `no-hardcoded-urls.test.ts:94-97` asserts `lib/auth.ts` has no `/callback` strings)

### 4. Environment/config — **PASS**

- ✅ `.env.example:45` has `BFF_API_KEY=replace-me-with-shared-secret-from-api-Auth__BffApiKey` placeholder
- ✅ No real secret in `.env.example` (placeholder string, not a real value)
- ✅ No `NEXT_PUBLIC` for secrets (verified grep; documented in `.env.example:40-42`)
- ✅ README/docs don't suggest exposing `BFF_API_KEY` to client — `.env.example:40-42` explicitly says "NUNCA uses NEXT_PUBLIC_BFF_API_KEY"
- ✅ Matching `Auth__BffApiKey` documented (`.env.example:39` says "Debe coincidir byte-por-byte con `Auth:BffApiKey` del backend (env var `Auth__BffApiKey`)")

### 5. Security — **PASS**

- ✅ No exposure of: `BFF_API_KEY`, `X-BFF-Key`, tokens, Authorization headers, PII in client bundle (defensive grep tests enforce)
- ✅ Errors don't leak raw API response: `auth-adapter.ts:99-104` reads `problem.detail ?? problem.title` — these are static error codes from the backend (e.g., `bad bff key`), not raw response bodies or secrets
- ✅ External input as data (Art. V): Zod schema validates `provider` enum, `providerAccountId` length 1-255, `email` format + max 320, `name` length 1-200 (`route.ts:28-33`)
- ✅ No hardcoded secrets (verified grep)
- ✅ No new npm deps (verified `git diff package.json pnpm-lock.yaml` is empty)
- ✅ Server/client boundary marked: `runtime = "nodejs"` + `dynamic = "force-dynamic"` (`route.ts:25-26`)
- ✅ No client imports server-only with secrets: `no-hardcoded-urls.test.ts:107-113` enforces `@/lib/api/auth-adapter` is not imported from `components/`

### 6. Reliability — **PASS**

- ✅ Missing env fails controlled: `BFF_API_KEY` undefined/empty → `AuthAdapterError(500, "BFF_AUTH_NOT_CONFIGURED")` → route returns 502 (mapped from 5xx) — no request emitted, no crash
- ✅ API failure → controlled error: 5xx upstream → 502; 4xx upstream → propagate; network → 503
- ✅ Network failure → no inconsistent state: `AbortController` with 5s timeout (`auth-adapter.ts:56-57`); `clearTimeout` in both `try` success path and `catch` error path (line 77, 86); no leaked timers
- ✅ Best-effort sign-in per design/tasks: `lib/auth.ts:57-63` wraps adapter in try/catch, logs `console.warn` with adapter error detail (no PII), does NOT throw — NextAuth proceeds to `/cuenta`. R1-A documented and tested (`__tests__/lib/auth.test.ts:157-176`)
- ✅ Doesn't break NextAuth: `authOptions.providers` preserved (Google + LinkedIn), `jwt`/`session` callbacks preserved, `pages.signIn` preserved. Only removed: broken `signIn` callback (was POSTing to legacy `/callback`); added: `events.signIn` hook
- ✅ No obvious race conditions: `events.signIn` is awaited inside the hook; no concurrent state mutation; adapter has no shared mutable state
- ✅ Doesn't block PR2: PR2 needs `lib/api/jwt.ts:152 clearJwtCache()` and the auth-adapter pattern (verified both preserved); PR2 will add `signOutAndClear()` and `app/api/auth/logout/route.ts`

### 7. Test quality — **PASS**

- ✅ **28 tests real and necessary**:
  - 11 adapter tests: URL, body shape, X-BFF-Key header, fail-closed×2 (empty+undefined), error mapping 401/5xx/network, Google + LinkedIn provider mappings, return shape (1 happy-path + provider-specific assertions)
  - 7 BFF route tests: happy path, Zod 400 (missing email), JSON malformed, invalid provider enum, 502 forward, 401 forward, LinkedIn forward
  - 7 grep tests: NEXT_PUBLIC leak, BFF_API_KEY in components, X-BFF-Key in components, BACKEND_URL in components, `/callback` legacy in lib/auth.ts, `providerId` legacy field, auth-adapter import in components
  - 3 events.signIn tests: registerWithBackend call, LinkedIn mapping, no-op on 5xx
- ✅ No mocks falsos: `__tests__/lib/api/auth-adapter.test.ts` mocks `global.fetch` (boundary), exercises real `registerWithBackend`; `__tests__/lib/auth.test.ts` mocks the adapter (boundary), exercises real `handleSignInEvent`; `__tests__/app/api/auth/web-signup/route.test.ts` mocks adapter (boundary), exercises real `POST` handler + Zod
- ✅ Tests FAIL if:
  - `/callback` legacy reintroduced → `auth-adapter.test.ts:75-77` asserts URL doesn't contain `/callback` AND `no-hardcoded-urls.test.ts:94-97` greps `lib/auth.ts`
  - `providerId` legacy reintroduced → `auth-adapter.test.ts:105,258,283` + `no-hardcoded-urls.test.ts:99-105`
  - `X-BFF-Key` missing → `auth-adapter.test.ts:108-129`
  - `BFF_API_KEY` exposed to components → `no-hardcoded-urls.test.ts:75-78`
  - mapping broken (provider/providerAccountId) → `auth-adapter.test.ts:236-283` + `route.test.ts:152-174`
  - errors broken → `auth-adapter.test.ts:171-234` + `route.test.ts:120-150`
- ✅ Not over-coupled to implementation: tests assert on observable behavior (URL, headers, body, response shape, error mapping), not on internal helper functions. Refactor-friendly.
- ✅ Overshoot 10→28 justified: each test maps to a distinct acceptance criterion in spec §3.3/§3.4. T-PR1-007's grep tests are pure regression-net for PR2..PR8 and prevent re-introduction of secrets/drift.
- ✅ Update to `auth.test.ts` didn't delete relevant coverage: line 58-67 (config), 78-103 (jwt/session callbacks) preserved; line 73-76 replaced obsolete "signIn POSTs to /callback" assertion (which would now be a NEGATIVE assertion that the broken contract is gone). REQ-FN-020 (update, not delete) honored.
- ✅ FN-020 covered by update (not delete): `auth.test.ts:73-76` asserts `signIn` callback is `undefined` (the fix), and `auth.test.ts:107-176` validates the new `events.signIn` hook behavior

### 8. Typecheck baseline — **PASS**

- ✅ Baseline `e6f6cac`: 7 pre-existing typecheck errors (verified via worktree)
- ✅ PR1 tip: 7 typecheck errors (verified via `pnpm tsc --noEmit` on current working tree)
- ✅ Diff is **empty** — zero new errors from PR1
- ✅ Pre-existing errors are in: `__tests__/components/analyzer/analyzer.test.tsx`, `__tests__/lib/editor/types.test.ts`, `lib/api/import.test.ts`, `lib/api/types.test.ts` — all unrelated to auth-adapter / BFF / lib/auth.ts
- ✅ Note: apply-progress claims "8 pre-existing" but my verification shows 7. Minor documentation drift (NIT below)

### 9. Build/lint/test — **PASS**

- ✅ `pnpm lint` PASS
- ✅ `pnpm test` PASS (1040/1040)
- ✅ `pnpm build` PASS (`/api/auth/web-signup` registered as Dynamic)
- ✅ `pnpm tsc --noEmit` — 7 pre-existing documented, 0 NEW from PR1 (worktree diff confirmed)
- ✅ Auth adapter/BFF filtered tests PASS (31/31: 11 adapter + 7 BFF + 7 grep + 6 auth)
- ✅ Defensive greps all 0 (forbidden paths, secret leaks)
- ✅ No suppressions (`@ts-ignore`, `@ts-expect-error`, `eslint-disable` all 0)
- ✅ No new deps (verified `git diff package.json pnpm-lock.yaml` is empty)

### 10. Commits / process — **PASS with NOTE**

- ✅ Commits acceptable for merge in principle
- ⚠️ **`7888b2c fixup!`**: this is a git autosquash marker — meant to be squashed into `b7ae3e6` via `git rebase -i --autosquash`. Acceptable as in-progress marker; **recommend squashing before merge** to keep history clean. Not blocking (fixup! is a recognized git convention; no project rule explicitly forbids it; no behavior impact). See Commit Hygiene review.
- ✅ `apply-progress.md` documents PR1: comprehensive (457 lines), tasks T-PR1-001..010 mapped to TDD evidence, files/LOC/tests/commands/risks all documented
- ✅ Does NOT claim PR2 started: section "Pending for PR2" lists what PR2 will do; PR2 not yet started

### 11. Scope control — **PASS**

- ✅ No PR2-PR8 implementation: no `signOutAndClear`, no `app/api/auth/logout/route.ts`, no session-refresh logic added (only what PR1 needs)
- ✅ No backend touched: verified api HEAD = `6fcc2ac7`, working tree clean
- ✅ No MINOR/NIT resolution from PR0 review in scope (those are backend issues — would require api changes)

## Critical questions (9 — all answered with evidence)

### 1. Can `BFF_API_KEY` leak to client bundle?

**Risk**: LOW. **Answer: NO.**

**Evidence**:
- `process.env.BFF_API_KEY` is only read inside `auth-adapter.ts:50`, which is imported by `lib/auth.ts` (server-side `authOptions`) and `app/api/auth/web-signup/route.ts` (server-side Route Handler with `runtime = "nodejs"`).
- Neither is imported by any `components/*.tsx` file (verified via `no-hardcoded-urls.test.ts:107-113`).
- `NEXT_PUBLIC_BFF_API_KEY` is forbidden by defensive grep test (`no-hardcoded-urls.test.ts:69-73`) — 0 matches across `lib/`, `app/`, `components/`.
- `BFF_API_KEY` does not appear in `components/` at all (verified via `no-hardcoded-urls.test.ts:75-78`).

**Why it matters**: Constitution Art. VI forbids secrets in client bundle. This PR respects the boundary.

### 2. Is BFF route handler the ONLY place sending `X-BFF-Key`?

**Risk**: LOW. **Answer: YES.**

**Evidence**:
- `grep -rn "X-BFF-Key" app/ lib/ components/` returns 0 matches in components/ (the only "hit" would be the literal in `auth-adapter.ts:65` which is the assignment site).
- The header is sent exclusively from `auth-adapter.ts:65` inside `registerWithBackend`.
- `registerWithBackend` is called only from: `lib/auth.ts:51` (events.signIn hook, server-side) and `app/api/auth/web-signup/route.ts:54` (Route Handler, server-side).
- Both callers are server-only.

**Why it matters**: Single source of truth for the credential; no scattered sends that could leak via debug logging or alternative paths.

### 3. Could adapter accidentally revert to legacy `/callback`?

**Risk**: LOW. **Answer: NO (test-guarded).**

**Evidence**:
- `auth-adapter.test.ts:73-77` asserts the URL is exactly `${BACKEND_URL}/api/v1/auth/web-signup` AND does NOT contain `/callback`, `/google/callback`, `/linkedin/callback`.
- `no-hardcoded-urls.test.ts:93-97` greps `lib/auth.ts` for `/auth/${provider}/callback` and `/callback` literals — would fail if reintroduced.
- `auth.test.ts:73-76` asserts `authOptions.callbacks.signIn` is `undefined` — would fail if legacy `signIn` callback were added back.

**Why it matters**: Three layers of regression-net ensure the contract drift cannot silently reappear.

### 4. Is `providerAccountId` mapping reliable for Google + LinkedIn?

**Risk**: LOW. **Answer: YES.**

**Evidence**:
- NextAuth `Account` type has `providerAccountId: string` — this is set by NextAuth from the OAuth provider's `sub` (Google) or `id` (LinkedIn) claim.
- `lib/auth.ts:42` reads `params.account?.providerAccountId` directly.
- `auth-adapter.ts:69` sends it as `providerAccountId` in the body.
- `auth-adapter.test.ts:236-258` (Google) and `auth-adapter.test.ts:261-283` (LinkedIn) verify the field is sent correctly for both providers.
- `route.test.ts:152-174` verifies the BFF forwards LinkedIn without transformation.
- `auth.test.ts:137-155` verifies `events.signIn` hook maps LinkedIn correctly.

**Why it matters**: Reliable mapping is the linchpin of identity — incorrect mapping would cause wrong-user merges in the backend.

### 5. What happens if `BFF_API_KEY` missing in production?

**Risk**: LOW (fail-closed). **Answer: 502 to client, no request emitted.**

**Evidence**:
- `auth-adapter.ts:51-53`: `if (!bffKey || bffKey.length === 0) throw new AuthAdapterError(500, "BFF_AUTH_NOT_CONFIGURED")` — happens BEFORE any fetch.
- `route.ts:56-65`: catches `AuthAdapterError` with `status >= 500`, returns 502 with generic `"Upstream auth backend failed"`.
- `auth.test.ts:157-176` verifies `events.signIn` does not throw — only logs `console.warn`.

**Why it matters**: Fail-closed means no silent silent failure, no information leak about whether the key exists. The client sees 502 (transient) and can retry, but won't get a misleading 401 or 200.

### 6. Are API errors normalized without leaking data?

**Risk**: LOW. **Answer: YES.**

**Evidence**:
- `auth-adapter.ts:96-104`: reads `problem.detail ?? problem.title` from the backend response — these are static error codes (`bad bff key`, `AUTH/UNKNOWN_PROVIDER`, etc.), not raw bodies.
- `auth-adapter.ts:106`: `mappedStatus = response.status >= 500 ? 502 : response.status` — 5xx becomes 502 (bad gateway), 4xx propagates.
- `route.ts:60-69`: 5xx → 502 with generic message; 4xx → propagate with detail.
- No `console.log` or `console.error` of full response bodies.
- The `console.warn` in `route.ts:60` and `lib/auth.ts:62` logs only `err.detail` (a short string) — not raw responses or PII.

**Why it matters**: Per Constitution Art. III, error messages should be honest but not leak PII or backend internals.

### 7. Do anti-regression tests truly cover endpoint drift and secret leak?

**Risk**: LOW. **Answer: YES, comprehensively.**

**Evidence**:
- `no-hardcoded-urls.test.ts` covers 7 distinct anti-regression scenarios across `lib/`, `app/`, `components/`:
  1. `NEXT_PUBLIC_BFF_API_KEY` never appears (client leak guard)
  2. `BFF_API_KEY` not in `components/` (server-only guard)
  3. `X-BFF-Key` not in `components/` (server-only guard)
  4. `BACKEND_URL` not hardcoded in `components/` (must be import)
  5. `lib/auth.ts` has no `/callback` strings (legacy contract guard)
  6. `lib/` and `app/api/` use no `providerId` field (legacy body shape guard)
  7. `@/lib/api/auth-adapter` not imported from `components/` (server-only guard)
- These tests are pure regression-net — they would fail if any of the anti-patterns were reintroduced.

**Why it matters**: Without these, PR2..PR8 could silently re-introduce the drift.

### 8. Does `fixup!` commit block merge per project convention?

**Risk**: NONE. **Answer: NO rule violation.**

**Evidence**:
- Searched `BuildCv-web/AGENTS.md`, `AGENTS.md`, `.opencode/rules/*.md` — no explicit rule against `fixup!` commits.
- `fixup!` is a recognized git autosquash marker; merging without squashing would leave a 2-commit history where one is incomplete (the fixup applies changes to the previous commit's files).
- Recommend squashing before merge: `git rebase -i --autosquash e6f6cac` would collapse `7888b2c` into `b7ae3e6` automatically.

**Why it matters**: Squash-able history is cleaner for review and bisect. This is a documentation/process recommendation, not a blocker.

### 9. Does PR1 leave PR2 unblocked without critical debt?

**Risk**: LOW. **Answer: YES.**

**Evidence**:
- `lib/api/jwt.ts:152 clearJwtCache()` exists and is exportable — PR2 will use it for `signOutAndClear()`.
- `lib/api/auth-adapter.ts` is a typed port pattern that PR2 can extend (e.g., `logoutWithBackend()`) without breaking PR1's contract.
- `app/api/auth/web-signup/route.ts` demonstrates the Route Handler pattern (Zod + adapter delegation) that PR2's logout route will follow.
- `.env.example` documents all needed env vars.
- No backend changes were made, so PR2's backend requirements (logout endpoint, etc.) are independent.

**Why it matters**: PR1 leaves a clean foundation. No critical debt accumulated.

## New issues

### BLOCKER: 0

### MAJOR: 0

### MINOR: 1

#### MINOR-1: `events.signIn` falls back to `name = ""` if user has no name

- **File**: `lib/auth.ts:44`
- **Evidence**: `const name = params.user?.name ?? "";` — if the OAuth provider returns no name, the adapter sends `{name: ""}`. The backend's `WebSignupHandler` validates `name` is non-empty (`BuildCv-api/src/BuildCv.Application/Features/Auth/WebSignupHandler.cs:30-33`) and would return 400. The hook silently swallows the error and NextAuth proceeds.
- **Why it matters**: For users whose name field is empty in the OAuth profile (rare but possible — e.g., Google accounts without a public name), the backend never gets their user record. Subsequent `/cuenta` page may 401. Silent best-effort hides this.
- **Suggested fix**: Either (a) skip the adapter call if `name` is empty (`if (!name) return;` at `lib/auth.ts:46`), or (b) use the email's local-part as fallback name, or (c) log a warning when `name` is empty.
- **Patch sizing**: ~2-3 LOC. Could ship in a follow-up PR.

### NIT: 2

#### NIT-1: apply-progress.md says "8 pre-existing typecheck errors" but actual count is 7

- **File**: `BuildCv-web/specs/009-auth-web/apply-progress.md:368`
- **Evidence**: My verification via worktree (`/tmp/opencode/buildcv-baseline`) shows 7 errors on `e6f6cac` and 7 errors on PR1 tip, with identical file:line:error triples. The count was either off-by-one or one error was fixed by a parallel PR.
- **Why it matters**: Documentation accuracy.
- **Suggested fix**: Update to "7 pre-existing typecheck errors" (or re-verify the current count at PR-merge time).

#### NIT-2: `7888b2c fixup!` should be squashed before merge

- **File**: commit `7888b2c`
- **Evidence**: `fixup! test(auth): cubrir contrato web-signup (PR1 RED)` — meant to be autosquashed into `b7ae3e6` via `git rebase -i --autosquash`.
- **Why it matters**: Cleaner history; bisect-friendly.
- **Suggested fix**: Before pushing/merging, run `git rebase -i --autosquash e6f6cac` (or `git commit --fixup=b7ae3e6` was already used; equivalent).

## Pre-existing state from PR0 (status check)

All 7 pre-existing items from PR0 review remain UNCHANGED (this PR1 is web-only; PR0 issues are backend-side):

| Item | PR0 status | PR1 status | Notes |
|---|---|---|---|
| MAJOR-1: BFF credential | **CLOSED by Patch A** (api `df0ec06`) | n/a — backend merged | X-BFF-Key header enforced server-side |
| MINOR-1: logout 500 vs 401 | UNCHANGED (PR1 web-only) | UNCHANGED | out of PR1 scope |
| MINOR-2: OpenAPI Accepts/Produces | UNCHANGED | UNCHANGED | out of PR1 scope |
| MINOR-3: missing providerAccountId test | UNCHANGED | UNCHANGED | out of PR1 scope |
| MINOR-4: `_providerKeyMap` bug | UNCHANGED | UNCHANGED | out of PR1 scope |
| NIT-1: T-PR0-007 tracking | UNCHANGED | UNCHANGED | out of PR1 scope |
| NIT-2: permissive email regex | UNCHANGED | UNCHANGED | out of PR1 scope |
| **NEW**: X-BFF-Key not in OpenAPI | Documented in PR0 patch-A re-review | n/a — backend-only | PR1 web doesn't touch OpenAPI |

## Security review

- **Token handling**: PASS — refresh tokens never appear in web-side code (`auth-adapter.ts` returns only `{userId}`); access tokens only issued by `/auth/google`, `/auth/linkedin`, `/auth/refresh` (none modified by PR1). BFF returns 200 with `{userId}` only.
- **Privilege boundaries**: PASS — `BFF_API_KEY` is server-only (verified); `X-BFF-Key` sent exclusively from server-side adapter (verified); `events.signIn` is server-side only (verified by NextAuth architecture).
- **Data exposure**: PASS — response bodies don't include PII beyond `userId` (a GUID). Error responses use static messages. No `console.log` of full responses. `console.warn` logs only `err.detail` (short strings).
- **Dependency risks**: PASS — 0 new packages (verified `git diff package.json pnpm-lock.yaml` empty). Constitution Art. VI preserved.
- **Auth bypass risks**: PASS — the backend's `BffCredentialFilter` (Patch A) rejects requests without `X-BFF-Key`; the adapter fails-closed if `BFF_API_KEY` is empty; the BFF validates body with Zod before forwarding.
- **Input validation**: PASS — Zod schema (`route.ts:28-33`) enforces `provider` enum, `providerAccountId` 1-255, `email` RFC-ish format, `name` 1-200.

## Reliability review

- **Test quality**: PASS — 28 tests, all real (boundary mocks at fetch/adapter only). No mocks of internal logic. Adapter tests cover URL/headers/body/timeout/error-mapping; BFF tests cover Zod/JSON/error-forwarding; grep tests guard regression.
- **Coverage value**: PASS — every AC has at least one test; mapping correctness verified for both providers; error paths verified for 401/5xx/network/timeout; fail-closed verified for missing key.
- **Edge cases**: PASS — empty body, malformed JSON, unknown provider, missing fields, BFF key missing/empty, network timeout, 4xx propagation, 5xx → 502. Edge case for `name=""` not specifically tested (see MINOR-1).
- **Determinism**: PASS — no clock-dependent logic. `setTimeout` for AbortController uses fixed 5s. No flakiness observed.
- **Contract stability**: PASS — `registerWithBackend` signature is the public contract; no internal-only exports leaked.
- **Regression risk**: LOW — full `pnpm test` is green (1040/1040). No new errors in `pnpm tsc --noEmit`. No new deps.

## Contract/path review

- **Endpoint surface**: PASS — Web BFF adds `POST /api/auth/web-signup`. Backend `/api/v1/auth/web-signup` is the contract target. No new backend endpoints needed for PR1.
- **Path canonicality**: PASS — `/api/auth/web-signup` (web BFF) → `/api/v1/auth/web-signup` (backend). All forbidden paths absent (verified by grep + grep tests).
- **Request/response schemas**: PASS — Zod schema enforces body; response shape is `{userId}`. Backend contract matches exactly (verified `WebSignupRequest` record at `BuildCv-api/src/BuildCv.Api/Contracts/AuthContracts.cs:18`).
- **Forbidden path audit**: PASS — all forbidden paths absent: `auth/sign-out`, `providerId, email, name`, `/privacy/policies`, `/user/consent`, `/api/v1/auth/${provider}/callback`.

## Env/secret handling review

- **Server-only secrets**: PASS — `BFF_API_KEY` only read in `auth-adapter.ts:50` (server-side). Defensive grep test enforces no leak to `components/`.
- **NEXT_PUBLIC forbidden**: PASS — no `NEXT_PUBLIC_BFF_API_KEY` anywhere. Defensive grep test enforces.
- **Header exposure**: PASS — `X-BFF-Key` only sent in `auth-adapter.ts:65`. Defensive grep test enforces no leak to `components/`.
- **Fail-closed**: PASS — empty/undefined `BFF_API_KEY` throws before fetch.
- **`.env.example`**: PASS — placeholder value, no real secret; documented with matching `Auth__BffApiKey` env var.
- **README/docs**: PASS — `.env.example:40-42` explicitly says NUNCA use `NEXT_PUBLIC_BFF_API_KEY`.

## Test quality review

- **Real tests vs mocks falsos**: PASS — all tests mock at the I/O boundary (fetch, adapter), not internal logic. The `registerWithBackend` function is exercised end-to-end with a fake `fetch`. The `POST` route handler is exercised with a fake adapter. The `events.signIn` hook is exercised with a fake adapter.
- **RED/GREEN evidence**: PASS — apply-progress.md §"TDD Cycle Evidence" lists per-task RED → GREEN → REFACTOR. The RED phase for `lib/api/auth-adapter.test.ts` was "import fails because module not exists" (verified by absence of `lib/api/auth-adapter.ts` in pre-PR1 state).
- **Coverage of acceptance criteria**: PASS — every AC in spec §3.3 (adapter contract) and §3.4 (error mapping) has at least one test. Plus 7 defensive grep tests for PR2..PR8 regression-net.
- **Over-adaptation risk**: LOW — tests assert on observable behavior (URL, headers, body, response shape), not on internal helper functions. Could survive refactor that splits the adapter.
- **Pre-existing baseline isolation**: PASS — pre-existing failures documented in PR0 review (32 backend failures, none web). PR1 web full suite: 1040/1040 green.

## Typecheck baseline review

- **Pre-existing count**: 7 errors on `e6f6cac` baseline (verified via worktree).
- **PR1 tip count**: 7 errors (verified via `pnpm tsc --noEmit`).
- **Diff**: empty — zero new errors.
- **Locations**: `__tests__/components/analyzer/analyzer.test.tsx:22`, `__tests__/lib/editor/types.test.ts:226,263,277`, `lib/api/import.test.ts:126,127`, `lib/api/types.test.ts:723` — all pre-existing, none in PR1 files.
- **apply-progress drift**: claims "8 pre-existing" but actual is 7. NIT-1.

## Commit hygiene review

- Commits: 4 total
  - `b7ae3e6 test(auth): cubrir contrato web-signup (PR1 RED)` — 3 new test files (594 LOC)
  - `7888b2c fixup! test(auth): cubrir contrato web-signup (PR1 RED)` — auth.test.ts modified (111 LOC delta)
  - `62f9c87 fix(auth): adaptar web signup al contrato bff (PR1 GREEN)` — adapter + BFF route + lib/auth.ts + .env.example (247 LOC delta)
  - `7c9f07f docs(009-auth-web): registrar avance PR1` — apply-progress.md (167 LOC)
- **`7888b2c fixup!`**: ACCEPT (with recommendation to squash before merge). The fixup! is a git autosquash marker, not a project rule violation. The fixup commit's content (`__tests__/lib/auth.test.ts` modification) logically belongs to `b7ae3e6` (the RED test commit).
- **Conventional Commits compliance**: PASS — all 4 commits follow `type(scope): subject` format.
- **No co-authored-by**: PASS — verified commit authors.
- **Scope discipline**: PASS — each commit has a single concern (test, fix, doc).

## Scope control review

- **PR1 scope contained**: YES — only `lib/api/auth-adapter.ts`, `app/api/auth/web-signup/route.ts`, `lib/auth.ts` delta, `.env.example`, and 4 test files. No PR2 (logout/session-refresh), PR3+, PR8 work.
- **Backend untouched**: YES — `BuildCv-api` HEAD = `6fcc2ac7`, working tree clean.
- **No unrelated cleanup**: YES — no opportunistic refactors of unrelated code.
- **No drift from spec**: YES — all tasks (T-PR1-001..010 except 008/009 deferred per spec §12.2) executed.

## Deviations assessment

1. **Tests 10 → 28**: ACCEPT — natural decomposition per spec ACs yields 11 adapter + 7 BFF + 7 grep + 3 events.signIn = 28. Each test maps to a distinct acceptance criterion. The 7 grep tests are pure regression-net for PR2..PR8. Still well within 350-LOC cap.
2. **PR1 LOC ~210 vs forecast ~180**: ACCEPT — +17% over forecast but well within 350 cap. Justified by: explicit type definitions (`WebSignupRequest`, `WebSignupResponse`, `AuthAdapterError`), AbortController for timeout, robust error mapping, comments documenting the contract freeze.
3. **T-PR1-008/009 deferred to PR8**: ACCEPT as documented — `scripts/check-openapi-drift.ts` + CI job deferred per design.md §12.2. PR1's regression-net is the `no-hardcoded-urls.test.ts` (defensive grep) which is lighter than live OpenAPI fetch but covers the critical patterns.
4. **Pre-existing typecheck errors (7, not 8)**: ACCEPT pre-existing; correct apply-progress count (NIT-1).
5. **`fixup!` commit**: ACCEPT with recommendation to squash before merge (NIT-2).
6. **MINOR-1 (name="" edge case)**: not addressed in PR1; recommend follow-up patch.

## Recommendation

### Push to remote
- **YES — safe**. No BLOCKER, no MAJOR. Remote doesn't have this branch.

### Merge to web/main
- **YES — safe**, after:
  - Squashing `7888b2c` into `b7ae3e6` via `git rebase -i --autosquash e6f6cac` (NIT-2)
  - Optional: fix MINOR-1 (`name=""` edge case) in a follow-up patch — not blocking

### Enable PR2
- **YES — unblocked**. `lib/api/jwt.ts:152 clearJwtCache()` exists; `auth-adapter` pattern is ready to extend; BFF route pattern is documented and replicated for `/auth/logout`.

## Patch plan (optional, not blocking)

### Patch A (recommended before merge): squash fixup commit
- Command: `git rebase -i --autosquash e6f6cac`
- Effect: collapses `7888b2c` into `b7ae3e6`, leaves 3 commits (test → fix → docs)
- Risk: zero (history cleanup)

### Patch B (optional, can ship in PR2 or later): fix MINOR-1
- File: `lib/auth.ts:44,46`
- Change: `if (!provider || !providerAccountId || !email || !name) return;` — skip adapter call if any required field is empty
- Add test: `auth.test.ts` — case where `name` is empty → `registerWithBackend` not called
- Risk: very low

## Approval criteria checklist

- [x] No BLOCKER
- [x] No MAJOR
- [x] No secret exposure (defensive grep tests pass; NEXT_PUBLIC forbidden)
- [x] No endpoint drift (forbidden paths absent; canonical paths present)
- [x] Tests/lint/build pass (1040/1040, lint clean, build green with `/api/auth/web-signup` registered)
- [x] Typecheck no new regressions (7 pre-existing, identical set, 0 new)
- [x] Backend not touched (api HEAD = 6fcc2ac7, clean tree)
- [x] PR2 not advanced (no logout/session-refresh code)
- [x] apply-progress matches reality (with NIT-1 minor count drift)
- [x] Commit hygiene OK (with NIT-2 squash recommendation)

## Reviewer notes

1. **PR1 is a textbook clean SDD change**. The author followed the TDD red-green-refactor discipline: 28 tests written first (RED proven by import-fail before module exists), GREEN implemented in a single commit, no REFACTOR needed (the implementation was already clean).

2. **The contract drift is fully closed**. Three layers of regression-net ensure it cannot silently reappear:
   - `auth-adapter.test.ts` asserts URL/body/headers
   - `no-hardcoded-urls.test.ts` greps the codebase
   - `auth.test.ts` asserts `callbacks.signIn` is undefined

3. **The fail-closed behavior is exemplary**. If `BFF_API_KEY` is missing or empty in any environment, the adapter throws before any network call. This is exactly the right shape for a shared-secret credential.

4. **The best-effort sign-in (R1-A) is correctly implemented**. `events.signIn` catches adapter errors and logs without PII; NextAuth proceeds. The user sees `/cuenta` and any 401 on first GET will resolve via PR2.

5. **Two minor issues (MINOR-1, NIT-2) are non-blocking**. MINOR-1 is an edge case for OAuth profiles without a `name` field (rare but possible); NIT-2 is a history cleanup that can be done with one rebase command.

6. **The PR1 LOC overshoot (+17% over forecast) is justified**. Explicit type definitions, AbortController for timeout, error mapping, and the `AuthAdapterError` class all add value. Within the 350 cap.

7. **The test count overshoot (10 → 28) is justified**. The 7 grep tests are pure regression-net for PR2..PR8 — they prevent re-introduction of the very contract drift this PR1 fixed. Without them, PR2..PR8 could silently re-break the contract.

8. **Fresh context verification confirms**:
   - 4 commits, all conventional-commits-compliant
   - 9 files changed (4 created, 3 modified code, 1 modified test, 1 doc-only `.env.example`)
   - Backend @ `6fcc2ac7`, clean tree
   - 1040/1040 tests pass
   - Lint clean
   - Build green with `/api/auth/web-signup` registered as Dynamic
   - 7 typecheck errors (all pre-existing, identical set to baseline)
   - 0 defensive grep hits for forbidden paths, secret leaks, or suppressions

**Final verdict: APPROVE_WITH_MINOR_NOTES** — push and merge safe; PR2 can start.

---

## Re-Review Addendum — PR1 review follow-up (autosquash + MINOR-1 + NIT-1)

**Date**: 2026-06-26
**Reviewer**: sdd-apply sub-agent executor
**Commits covered**:
- `2736e8a` (autosquashed from `b7ae3e6 + 7888b2c`)
- `5fbf47c` (was `62f9c87`)
- `c75bfd0` (was `7c9f07f`)
- `3ef7146` fix(auth): validar nombre antes de web-signup (PR1 MINOR-1) — NEW

### NIT-2 (autosquash) status
- Original: OPEN (`7888b2c fixup!` loose)
- Post-autosquash: **CLOSED ✅**
- New SHA: `2736e8a` (combines `b7ae3e6 + 7888b2c`)

### MINOR-1 status
- Original: OPEN (`events.signIn` fallback `name=""` to backend → 400 swallowed silently)
- Post-fix: **CLOSED ✅**
- Fix location: `lib/auth.ts:50-56` — gate explícito `if (!name)` antes de invocar `registerWithBackend`, con `console.warn` explícito (sin PII per Art. III)
- Test coverage: 2 nuevos tests triangulados en `__tests__/lib/auth.test.ts:178-225` (uno con `name=""`, otro con `name=undefined`)
- Decisión arquitectónica: skip + warn (no fallback al email local-part) per **Constitution Art. I (cero invención)**. Inventar el nombre desde el local-part sería inventar datos del usuario.
- R1-A (best-effort sign-in) preservado: no lanza, no bloquea; usuario queda signed-in en NextAuth; el primer GET protegido se resolverá reintentando vía PR2.

### NIT-1 status
- Original: OPEN (count drift "8→7" typecheck errors in `apply-progress.md:368`)
- Post-verification: **CLOSED ✅**
- Drift found: `apply-progress.md` decía "8 pre-existing typecheck errors" → corregido a **7**
- Verification command: `pnpm tsc --noEmit` (2026-06-26) → 7 errors, all pre-existing on `e6f6cac` baseline, identical file:line:error triples
- Test count verification: ALL counts accurate (11 adapter + 7 route + 7 grep + 6 auth.test.ts = 31 PR1 total, 28 net new) — no drift on test counts

### New issues
- BLOCKER: 0
- MAJOR: 0
- MINOR: 0 (MINOR-1 closed)
- NIT: 0 (NIT-1 + NIT-2 closed)

### Final commands run + results (post-MINOR-1 fix)

| Command | Result | Evidence |
|---|---|---|
| `pnpm vitest run __tests__/lib/auth.test.ts --reporter=verbose` | **8/8 PASS** (was 6/6 pre-fix → +2 triangulados) | MINOR-1 coverage |
| `pnpm test` (full suite) | **1042/1042 PASS** (was 1040/1040 → +2) | full regression OK |
| `pnpm lint` | PASS exit 0 | eslint clean |
| `pnpm build` | PASS, `/api/auth/web-signup` registered as `ƒ (Dynamic)` | next build green |
| `pnpm tsc --noEmit` | **7 pre-existing** typecheck errors (verified, 0 new from MINOR-1) | identical to baseline `e6f6cac` |
| `git diff e6f6cac..HEAD -- package.json pnpm-lock.yaml` | empty (no dep changes) | zero new deps |

### REQs/NFRs/Compliance covered (MINOR-1 strengthens)

- **REQ-FN-003, REQ-FN-004** (sin cambios + MINOR-1 strengthens): adapter intacto; `events.signIn` ahora valida `name` no-vacío antes de invocar
- **CR-PRIV-1** (Art. III): ✅ el `console.warn` NO contiene el email del usuario (verificado por test triangulado `expect(warnMessage).not.toContain("anon@example.com")`)
- **CR-DATA-1** (Art. I — cero invención): ✅ NO se inventa el nombre desde el email local-part; skip+warn es la decisión constitucionalmente correcta
- **Art. VI, Art. VIII** (sin cambios): BFF as port preservado, TDD red-green-refactor evidence per task

### Recommendation

- **Push to remote**: **Y** — no BLOCKER, no MAJOR, MINOR-1 cerrado, NIT-1 cerrado
- **Merge to web/main**: **Y** — safe, después de MINOR-1 fix + NIT-1 doc correction
- **Enable PR2**: **Y** — unblocked; `lib/api/auth-adapter.ts` + `events.signIn` hook + `lib/api/jwt.ts:152 clearJwtCache()` están listos

### Pending

- Fresh re-review focalizado (orchestrator will launch) — focused on MINOR-1 implementation correctness + NIT-1 doc correction
- NO merge, NO push from executor (esperando re-review focalizado)
- PR2 (session helpers, sign-out) sigue bloqueado hasta que esta rama mergee a web/main