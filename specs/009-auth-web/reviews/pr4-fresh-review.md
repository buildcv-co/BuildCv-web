# Fresh Review — 009-auth-web PR4

**Date**: 2026-06-26
**Reviewer**: review-risk (fresh context)
**PR scope**: Web `/cuenta` skeleton + GET user-data BFF (no backend changes)
**Verdict**: **APPROVE_WITH_MINOR_NOTES**

## LOC VERIFICATION (CRITICAL — sub-agent arithmetic was wrong)

| Metric | Value | Source |
|---|---|---|
| Production LOC (verified by `wc -l`) | **714** | `app/cuenta/page.tsx` 90 · `app/api/user/data/route.ts` 109 · `lib/api/user-data.ts` 142 · `lib/api/_utils.ts` 60 · `components/account/cuenta-skeleton.tsx` 55 · `components/account/datos-personales-section.tsx` 157 · `components/account/consent-section-slot.tsx` 35 · `components/account/arco-section-slot.tsx` 32 · `lib/copy/es.ts` +34 |
| Production LOC (sub-agent claim) | 722 | Off by 8 from `wc -l` (formatting artifacts: trailing-newline counts differ). Order of magnitude same. |
| Total diff (verified `git diff --shortstat`) | **1680 insertions / 0 deletions, 15 files** | Sub-agent said 1402 across 14 — **WRONG** on both counts (they excluded `apply-progress.md` 278 LOC and missed 1 file). |
| Forecast | ~175 (proposal.md L48 + tasks.md L20) | |
| Cap | 350 (delivery_strategy review_budget_lines) | |
| **CORRECTION OF SUB-AGENT REPORT** | **+72 over cap claim is WRONG.** Actual over cap = **+364 LOC (104%)**. Sub-agent confused forecast-vs-actual with actual-vs-cap arithmetic. User's math (722 − 350 = +372) is correct in direction; verified `wc -l` shows +364. Either way, **clearly NOT +72**. |
| Test count (verified by `grep -c "it("`) | **23** | 5 + 4 + 4 + 6 + 4 across 5 files |
| Test LOC | 680 | `__tests__/lib/api/_utils.test.ts` 80 · `__tests__/lib/api/user-data.test.ts` 177 · `__tests__/app/api/user/data/route.test.ts` 177 · `__tests__/app/cuenta/page.test.tsx` 154 · `__tests__/components/account/datos-personales-section.test.tsx` 92 |
| Tests overshoot vs forecast | 8 → 23 = **+187% (2.875×)** | |

### Sub-agent justification (quoted from `apply-progress.md` line 1073-1082)

> "**Deviation**: +1203 over the 175-LOC forecast. Justified: Test overhead (~680 LOC): TDD strict + 23 net-new tests… Component skeleton + slot structure (~125 LOC across 3 components)… `_utils.ts` shared util (61 LOC)… 1402 LOC is ~3.5× the 400-line PR-review guard… split into PR4a (BFF + page + datos-personales, ~600 LOC) + PR4b (slots + _utils, ~120 LOC) — but the split is artificial since the slots MUST ship with the page for R2 stability."

The justification mentions split option but recommends acceptance. The split is plausible, but the slots genuinely must ship with the page for R2 (documented in `proposal.md` §R4-A + `design.md` §4.8). Verification confirms.

---

## 4 DEVIATION DECISIONS

### Decision 1: SIZE_DEVIATION — **ACCEPT_SIZE_DEVIATION**

- **Production LOC**: 714 (verified)
- **Cap**: 350 → **+364 over cap** (104%)
- **Forecast**: ~175 → **+539 over forecast** (308%)
- **Reasoning**:
  1. **Cohesion**: The PR is one logical unit — `/cuenta` page + GET BFF + DatosPersonalesSection + slot structure. Splitting would force PR5/PR6 to merge a "slot foundation PR" that touches the same files, doubling review effort and creating the very merge conflicts R2 is designed to prevent.
  2. **Tests are real** (defensive greps all pass; tests assert non-derivable behavior: HTTP calls, Bearer header, 429 forwarding, error mapping, HTML output structure with stable IDs).
  3. **PR2 precedent**: PR2 was 417 LOC (+67 over cap, +292 over forecast) and was accepted with minor notes — same pattern.
  4. **MVP launch urgency**: user needs to launch; splitting adds 1-2 PRs to the chain with no functional benefit.
  5. **Decomposable if needed**: A clean split exists (`PR4a` BFF+page+datos-personales+_utils ~530 LOC · `PR4b` slots+consent/arco copy ~185 LOC) — but cost of split > merge cost.
- **Risk if accepted**: Reviewer must read 714 LOC production + 680 LOC tests in one shot. Mitigated by file boundaries: each file has clear single-responsibility + docstring header with spec citations.
- **Risk if split**: PR5 (consent) and PR6 (ARCO) cannot land until both PR4a and PR4b merge, extending chain by 1-2 PRs and re-introducing R2 risk (slot structure could drift between PR4a and PR4b).

### Decision 2: SLOT_PLACEHOLDERS — **ACCEPT_SLOT_PLACEHOLDERS**

- `consent-section-slot.tsx` (35 LOC) + `arco-section-slot.tsx` (32 LOC) = 67 LOC total
- **Reasoning**:
  1. **R2 contract** (`proposal.md` §R4-A + `design.md` §4.8): PR4 commits to stable 3-slot structure (`#datos-personales`, `#consent`, `#arco`). PR5 touches ONE slot, PR6 touches ONE slot. Diff is non-overlapping.
  2. **Anchor stability**: Slots provide `id="consent"` and `id="arco"` for PR7 `<UserMenu>` anchors and PR8 e2e selectors. Without slots in PR4, PR7/PR8 cannot target those sections.
  3. **Honest copy**: Placeholders say "Próximamente vas a poder gestionar tus consentimientos acá" / "Próximamente vas a poder ver, rectificar y eliminar tu cuenta acá" — no false compliance promises, no fake buttons.
  4. **Zero fake logic**: Verified — slots are pure `<section>` with title + message. No consent grant, no ARCO form, no modal. PR5/PR6 must replace the slot contents.
  5. **No data exposed**: Slots don't receive `userData`; they only render placeholder copy.
- **Risk if accepted**: Some users see "Próximamente" placeholder text for ~1-2 PR cycles. Acceptable.
- **Risk if REQUEST_SPLIT_TO_PR6 (move ARCO slot to PR6)**: PR6 would need to add its own slot, conflicting with PR4's committed 3-slot structure. R2 contract violated.

### Decision 3: SHARED_UTILS — **ACCEPT_SHARED_UTILS**

- `lib/api/_utils.ts` (60 LOC): `parseRetryAfter` + `formatRetryAfter` per RFC 7231 §7.1.3
- **Reasoning**:
  1. **DRY**: 4+ BFFs need the same RFC 7231 parsing logic (PR4 GET, PR5 consent grant/revoke, PR6 PUT/DELETE, PR8 health check). Centralizing prevents bug-propagation.
  2. **Testable in isolation**: 6 dedicated unit tests cover delta-seconds, HTTP-date, invalid input, zero/negative, locale formatting, null. The helpers don't touch session/JWT/backend URL, so isolation is clean.
  3. **Tipado fuerte**: Returns `Date | null` (not string), so callers can't accidentally stringify it.
  4. **Constitution Art. VI**: "no sobre-ingeniería" — but this util removes over-engineering, not adds it. Each BFF should NOT reimplement RFC 7231 parsing.
  5. **No secret leak risk**: Module imports nothing from session/auth/jwt/backend. Verified by `grep`.
- **Risk if accepted**: Adds 60 LOC not in original `tasks.md` PR4 forecast. Mitigated by clear docstring justifying reuse + 6 tests proving correctness.
- **Risk if REQUEST_MOVE_TO_PR8 (defer to PR8 hardening)**: PR4 would inline the parsing in `lib/api/user-data.ts` and BFF route. PR5/PR6 would need to extract it later. Net negative.
- **Risk if REQUEST_INLINE**: Each BFF reimplements — high bug-propagation risk (date parsing edge cases: `-5`, `12abc`, etc.).

### Decision 4: COPY_EXPANSION — **ACCEPT_COPY_EXPANSION**

- `lib/copy/es.ts` +34 LOC: `copy.account.{title, inMemoryNotice, datosPersonales.*, consentSlot.*, arcoSlot.*, errors.*}`
- **Reasoning**:
  1. **Required for PR4**:
     - `copy.account.title` + `inMemoryNotice` — page title + footer (CR-PRIV-1 disclaimer)
     - `copy.account.datosPersonales.{title, loadingAria, providerGoogle, providerLinkedIn, labels.*}` — DatosPersonalesSection renders email/provider/dates
     - `copy.account.errors.{rateLimit, rateLimitWithDate, loadFailed, unauthenticated}` — error banner in PR4's BFF path
  2. **Honest slot copy**: `consentSlot.placeholderMessage` ("Próximamente…") and `arcoSlot.placeholderMessage` ("Próximamente…") are the truthful messages the slots MUST render in PR4. Removing them would leave the slot empty (no `<h2>` text) — bad UX.
  3. **Constitution AGENTS.md rule**: "Copy centralizado — todo texto visible al usuario en `lib/copy/es.ts`, nunca hardcodeado en componentes." PR4 follows this.
  4. **No PR5/PR6 leakage**: Verified by `git diff` — only `consentSlot.placeholderMessage` and `arcoSlot.placeholderMessage` are placeholder copy. No real consent/ARCO UI copy leaked.
- **Risk if accepted**: 24 extra LOC beyond forecast (~10). Marginal.
- **Risk if REQUEST_TRIM (defer non-PR4 keys)**: Slot titles would have to be hardcoded in components — violates AGENTS.md rule. Error keys MUST stay for the BFF error banner.

---

## Diff summary

- Branch: `feature/009-auth-web-pr4-account-user-data`
- Base: `738d816` (post-PR2 web/main)
- Tip: `866c1b1`
- Commits: 3 (`a6fed6b` tests · `8c3e641` impl · `866c1b1` docs+checkpoint)
- Files: **15** (9 prod + 5 test + 1 doc)
- Production LOC: **714** (verified by `wc -l`)
- Test LOC: **680** (5 files, 23 tests)
- Doc LOC: **278** (`apply-progress.md` PR4 + MVP Auth+Account Readiness Checkpoint)
- Total diff: **1680 insertions / 0 deletions**
- Backend: NOT touched (api @ `6fcc2ac`, clean working tree)
- PR1+PR2 not regressed: web-signup + auth-adapter + session + sign-out test files unmodified; all 1089 tests pass

---

## Commands run + results

| Command | Result |
|---|---|
| `git status` (BuildCv-web) | ✅ clean (3 commits ahead of base) |
| `git rev-parse HEAD` (BuildCv-api) | ✅ `6fcc2ac` (api NOT touched) |
| `git diff 738d816..866c1b1 --shortstat` | ✅ 15 files changed, 1680 insertions(+), 0 deletions(-) |
| `git diff 738d816..866c1b1 --stat` | ✅ matches apply-progress (except test counts and apply-progress delta) |
| `pnpm lint` | ✅ exit 0 (0 warnings, 0 errors) |
| `pnpm tsc --noEmit` (at HEAD) | ⚠️ 7 pre-existing errors (verified identical on baseline `738d816` via fresh `git worktree add`); **0 new from PR4** |
| `pnpm test` | ✅ 1089/1089 passing (was 1066 pre-PR4 = +23 net new) |
| `pnpm build` | ✅ next build green; 2 new routes registered (`ƒ /api/user/data`, `ƒ /cuenta`); no warnings |
| `grep -rn "/auth/sign-out" app/ lib/ components/` | ✅ 0 code matches (2 comments explain negative — PR2 pattern) |
| `grep -rn "/session[^/a-z]" app/ lib/ components/` | ✅ 0 code matches (only backend `/api/v1/auth/session` calls) |
| `grep -rn "/privacy/policies" app/ lib/ components/` | ✅ 0 matches |
| `grep -rn "/user/consent[^/]" app/ lib/ components/` | ✅ 0 matches |
| `grep -rn "/user/data/consent" app/ lib/ components/` | ✅ 0 code matches (2 comments explain negative — PR5 path) |
| `grep -rn "/api/v1/auth/${provider}/callback"` | ✅ 0 matches |
| `grep -rn "/api/v1/auth/google/callback"` | ✅ 0 matches |
| `grep -rn "/api/v1/auth/linkedin/callback"` | ✅ 0 matches |
| `grep -rn "providerId, email, name"` | ✅ 0 matches |
| `grep -rn "/auth/web-signup"` | ✅ 3 matches (PR1 expected files only) |
| `grep -rn "/auth/session"` | ✅ 4 matches (PR2 expected files only) |
| `grep -rn "/auth/logout"` | ✅ 3 matches (PR2 expected files only) |
| `grep -rn "/user/data"` | ✅ 6 matches (PR4 new + 1 PR1 comment + 1 PR2 comment) |
| `grep -rn "NEXT_PUBLIC_BFF_API_KEY"` | ✅ 0 matches (no client leak) |
| `grep -rn "BFF_API_KEY" components/` | ✅ 0 matches (server-only) |
| `grep -rn "X-BFF-Key" components/` | ✅ 0 matches (server-only) |
| `grep -rn "Authorization: Bearer"` | ✅ 0 code matches (5 comments explain BFF proxy pattern) |
| `grep -rn "access_token\|refresh_token"` | ✅ 0 matches (tokens never on client) |
| `grep -rn "@ts-ignore\|@ts-expect-error"` | ✅ 0 matches |
| `grep -rn "eslint-disable"` | ✅ 0 matches |
| `console.*` in `app/cuenta/` + `app/api/user/` | ✅ Only server-side `console.warn` for upstream failures, no user email/name (Art. III / NFR-OBS-1 verified) |
| `git diff 738d816..866c1b1 -- package.json pnpm-lock.yaml` | ✅ 0 changes (NO new deps) |
| Baseline tsc errors (`git worktree add 738d816`) | ✅ 7 errors, all in `__tests__/components/analyzer`, `__tests__/lib/editor/types.test.ts`, `lib/api/import.test.ts`, `lib/api/types.test.ts` (none in PR4 files) |

---

## Checklist (13 sections)

### 1. `/cuenta` page — ✅ pass
- `app/cuenta/page.tsx` exists and renders required states (verified)
- States: loading skeleton (4 `<dd>` rows with `aria-busy`) + loaded (dl with email/provider/dates) + error rate-limit (`data-error-kind="rate-limit"`) + error generic (`data-error-kind="generic"`) — all 4 verified by tests
- Does NOT implement ARCO real logic — slot is pure `<section>` + title + placeholder
- Does NOT implement consent real logic — slot is pure `<section>` + title + placeholder
- Placeholders don't have hidden PR5/PR6 logic — verified by reading source (35 LOC and 32 LOC, all visual)
- No tokens/headers/secrets exposed — verified (no `NEXT_PUBLIC_*`, no `BFF_API_KEY`, no `Authorization: Bearer`)
- Personal data shown minimally: email, provider (Google/LinkedIn), createdAt, lastLoginAt — exactly what PR6 needs

### 2. GET user-data BFF — ✅ pass
- `app/api/user/data/route.ts` uses backend canonical `GET /user/data` (verified: `fetch(`${BACKEND_URL}/api/v1/user/data`)`)
- Does NOT use `GET /user/data/consent` or `/user/consent` (defensive greps pass)
- Server-side only (no 'use client' directive, uses `getServerSession`)
- Does NOT expose: access token, refresh token, Authorization header, BFF_API_KEY, X-BFF-Key (all grep'd to 0)
- Handles: success (200 + JSON forward) + 401 (no session) + 401 (cache empty) + 429 (Retry-After forward verbatim) + 502 (5xx upstream) + network error (502 + console.warn)
- No PII in logs: server-side `console.warn` for upstream failures only — no email/name leakage
- No raw error forwarding with sensitive data: 502 response body is always `{ error: "Upstream backend failed" }` — `detail` is logged server-side only

### 3. Session integration — ✅ pass
- Uses PR2 helpers: `getServerSession(authOptions)` (page + BFF) + `getJwtFromSession()` (BFF + typed port) — no duplication
- No duplicated session logic (verified by `diff lib/api/session.ts lib/api/user-data.ts`)
- No PR2 regression: `git diff 738d816..866c1b1` shows NO modifications to PR2's `lib/api/{session,sign-out,jwt}.ts` or their test files
- PR2 tests still pass: 1089/1089 (24 PR2 tests + 28 PR1 tests + 23 PR4 tests + others)

### 4. Endpoint/path drift — ✅ pass
- Forbidden paths (all 0 matches in code): `/auth/sign-out`, `/session`, `/privacy/policies`, `/user/consent`, `/user/data/consent`, `/api/v1/auth/${provider}/callback`, `/api/v1/auth/google/callback`, `/api/v1/auth/linkedin/callback`, `providerId, email, name`
- Canonical paths present: `/auth/web-signup` (3), `/auth/session` (4), `/auth/logout` (3), `/user/data` (6)

### 5. Secret/token/PII handling — ✅ pass
- No `BFF_API_KEY` exposure in `components/`
- No `X-BFF-Key` in client code
- No access/refresh token leaks
- No Authorization header leaks
- No PII in logs/errors (verified by reading BFF handler — `detail` only in `console.warn`, never in response body)
- No `NEXT_PUBLIC_BFF_API_KEY`
- Client components don't import server-only with secrets (verified by grep — `BACKEND_URL` only in `lib/api/{user-data,jwt}.ts` and `app/api/*/route.ts`)
- User data treated as personal data, not trusted input (typed `UserDataResponse` with literal provider type `"google" | "linkedin"` and runtime validation)

### 6. Shared utils review — ✅ pass
- `lib/api/_utils.ts` contents reviewed: `parseRetryAfter` (RFC 7231 §7.1.3) + `formatRetryAfter` (locale string)
- Not premature abstraction: BOTH helpers are used in PR4 itself (`user-data.ts` line 95 + `datos-personales-section.tsx` line 51)
- Not mixing responsibilities: only `Retry-After` parsing/formatting, no auth/IO
- No secret leaks: module imports nothing from session/auth/jwt/backend
- Doesn't break server/client boundary: pure functions, no Node-only APIs (uses `Date` + `toLocaleString` which work in browser too)
- Actually reduces duplication: PR5 + PR6 will reuse the same helpers
- **DECISION**: **ACCEPT_SHARED_UTILS** ✅

### 7. Slot placeholders review — ✅ pass
- `consent-section-slot.tsx` contents reviewed (35 LOC): pure `<section id="consent" aria-labelledby="consent-title">` + title + placeholder
- `arco-section-slot.tsx` contents reviewed (32 LOC): pure `<section id="arco" aria-labelledby="arco-title">` + title + placeholder
- No consent real logic in slot (verified by reading)
- No ARCO real logic in slot (verified by reading)
- No misleading copy: "Próximamente vas a poder gestionar tus consentimientos acá" / "Próximamente vas a poder ver, rectificar y eliminar tu cuenta acá"
- No false sense of compliance: placeholder has no `<button>`, no `<form>`, no action
- R2 technical justification documented in `proposal.md` §R4-A + `design.md` §4.8
- Doesn't block PR6 (PR6 will replace slot content with `<ArcoPanel>`)
- **DECISION**: **ACCEPT_SLOT_PLACEHOLDERS** ✅

### 8. Test quality — ✅ pass
- 23 tests are real (not mocks falsos): each test asserts HTTP behavior (URL, headers, status codes), error class types, or HTML output structure
- Tests would FAIL if: `/user/data/consent` was used (defensive `expect(calledUrl).not.toContain("/consent")`), token leaked (`expect(headers["Authorization"]).not.toBe("Bearer undefined")`), missing states (skeleton + loaded + error all tested), broken PR2 (no PR2 files modified), legacy paths used
- Tests not over-coupled to implementation: tests assert outputs (HTTP response, HTML string, typed error class), not internal implementation details
- Overshoot 8 → 23 justified: tasks.md T-PR4-001 alone has 4 tests, T-PR4-002 has 2, T-PR4-003 has 3, T-PR4-004/5/6 add 1 each (3 total), T-PR4-007 has 3 → total 15 minimum; actual 23 due to defensive grep assertions (URL not containing /consent, etc.) + extra error-mapping triangulation
- PR1+PR2 regression tests pass (1089/1089)

### 9. Size deviation review — ✅ ACCEPT_SIZE_DEVIATION
- **VERIFIED LOC**: production = 714 (via `wc -l`) or 722 (per sub-agent, +8 due to wc -l formatting)
- **VERIFIED DIFF**: 1680 insertions / 0 deletions, 15 files (sub-agent's 1402/14 is wrong — they excluded `apply-progress.md`)
- Forecast: ~175
- Cap: 350
- **CORRECTION**: sub-agent's "+72 over cap" is WRONG. Actual is **+364 over cap (104%)** verified by `wc -l`. Sub-agent confused "over forecast" with "over cap".
- **DECISION**: **ACCEPT_SIZE_DEVIATION** ✅
- Justification: cohesion + cost of splitting > merge cost (PR2 precedent + R2 stability + MVP urgency)

### 10. Typecheck baseline — ✅ pass
- 7 pre-existing errors in baseline `738d816` (verified via clean `git worktree add 738d816`)
- PR4 doesn't add NEW typecheck errors (verified — `pnpm tsc --noEmit` shows same 7 errors at HEAD)

### 11. Build/lint/test — ✅ pass
- `pnpm lint` PASS (0 warnings, 0 errors)
- `pnpm test` PASS (1089/1089)
- `pnpm build` PASS (2 new routes registered)
- `pnpm tsc --noEmit` 7 pre-existing, 0 new
- All defensive greps return 0
- No `@ts-ignore`, no `eslint-disable`
- No new npm deps (git diff on package.json + pnpm-lock.yaml = 0 changes)

### 12. Scope control — ✅ pass
- No PR3 /privacidad (no files in `app/privacidad/`)
- No PR5 consent management (slots are placeholders, no `<ConsentPanel>` import)
- No PR6 ARCO implementation (slot is pure placeholder, no `<ArcoPanel>` import, no PUT/DELETE in BFF)
- No PR7 UserMenu (no `<UserMenu>` import)
- No PR8 e2e/a11y (no new `e2e/` tests)
- Backend not touched (verified `git rev-parse HEAD` of api = `6fcc2ac`)
- No PR0 hardening resolution

### 13. MVP checkpoint review — ✅ pass
- "MVP Auth + Account Readiness Checkpoint" section exists (apply-progress.md lines 1130-1230)
- Answers 1-10 are real and verifiable:
  1. Signup/sign-in: confirmed by PR1 tests + `git diff 738d816..866c1b1` showing no changes to PR1 files
  2. Session consultable/renovable: confirmed by PR2 tests + no changes
  3. Sign-out: confirmed by PR2 tests + no changes
  4. /cuenta with controlled states: confirmed by 4 page tests (T-PR4-004/5/6)
  5. /cuenta consults user data via BFF GET /user/data: confirmed by 4 user-data tests + backend at `6fcc2ac`
  6. BFF protects tokens/secrets, no PII leak: confirmed by all defensive greps
  7. Datos mínimos para PR6 disponibles: confirmed by shape test `expect(result).toEqual({...full shape...})`
  8. PR6 desbloqueado técnicamente: confirmed — `_utils.ts` reusable, slot has stable `id="arco"` + `aria-labelledby`, BFF route.ts ready for PUT/DELETE
  9. MVP_BLOCKERS post-PR4: correctly identifies PR6 as the only blocker (Constitution Art. IX)
  10. Siguiente paso MVP: PR6 (correct)
- `/cuenta` really unlocks PR6: yes — slot has `id="arco"` + `aria-labelledby="arco-title"`, BFF file already exists, typed port has the shape PR6 needs
- PR6 still MVP_BLOCKER: correct (Art. IX Habeas Data requires user-accessible account deletion)
- PR3/PR5 safe-defer without contradicting Art. IX: correct — for v0.5 with in-memory backend, consent grants aren't enforced yet (Art. IX applies at monetization, Art. IX v1)
- PR7/PR8 SHOULD_FIX (not blockers): correct — MVP can ship with temporary "Cerrar sesión" link in DatosPersonalesSection as fallback (but that's PR7 work, not PR4)
- PR0 hardening classification appropriate: yes (logout 500/401 + missing test + email regex are backend-side, not PR4 scope)
- Launch path correct (PR6 next): yes

---

## Critical questions (8)

### 1. Is the 722 LOC (or 714 verified) production code really cohesive, or could PR4 be split cleanly?

**Cohesive.** The split would be PR4a (BFF + page + datos-personales + _utils ~530 LOC) + PR4b (slots + consent/arco copy ~185 LOC). The split is **plausible** but the slots MUST ship with the page for R2 stability. Splitting adds 1 PR to the chain without functional benefit. PR2 was accepted at +67 over cap; PR4 at +364 over cap is bigger but follows the same pattern. **Cost of split > merge cost.**

### 2. Do the slot placeholders add real value for PR6, or are they premature?

**Real value.** PR6 must inject `<ArcoPanel>` into `<ArcoSectionSlot>` — if the slot doesn't exist, PR6 has to add it (creating a 2-commit chain for PR6 itself). With the slot pre-built in PR4, PR6 is purely additive (1 file diff). R2 risk (PR5/PR6 merge conflicts on the page file) is also mitigated because each PR touches ONE slot. The placeholder copy is honest ("Próximamente…"), no false compliance promises.

### 3. Does `_utils.ts` belong in PR4 or should it be deferred?

**Belongs in PR4.** `user-data.ts` and `route.ts` already need it. Moving it to PR8 forces PR4 to inline the RFC 7231 parsing, which is non-trivial (delta-seconds vs HTTP-date vs invalid input). PR5/PR6 reuse the same helpers — deferring means PR5 re-extracts. The util is testable in isolation (6 unit tests with no Next.js/server deps). **Net negative to defer.**

### 4. Is the copy expansion necessary for PR4 or does it leak into PR5/PR6?

**Necessary for PR4.** Required keys: `account.{title, inMemoryNotice, datosPersonales.*, errors.*}` — all consumed by PR4's page + DatosPersonalesSection. Optional keys: `consentSlot.placeholderMessage` + `arcoSlot.placeholderMessage` — only 2 strings, both placeholder ("Próximamente…"), no real PR5/PR6 UI copy leaked. **Could defer the 2 placeholder strings to PR5/PR6**, but the slot section would render with empty title — bad UX. Marginal.

### 5. Are 23 tests real and necessary, or are some over-tested?

**Real and justified.** Each test asserts behavior (HTTP call URL + headers, response status codes, HTML structure with stable IDs, typed error class with `retryAfter: Date`). The defensive grep tests (`expect(calledUrl).not.toContain("/consent")`, etc.) are constitutional safeguards against endpoint drift — they're "cheap insurance" against a future PR5/PR6/PR8 regression. Tasks.md undercounted: T-PR4-001 alone has 4 tests (delta-seconds, HTTP-date, invalid, zero/negative), T-PR4-007 has 3, etc. — natural decomposition yields 15 minimum, defensive greps + extra triangulation → 23.

### 6. Does PR6 really depend on PR4's slots, or could PR6 build its own slot?

**Depends on PR4's slots.** The `<ArcoSectionSlot>` slot has `id="arco" aria-labelledby="arco-title" data-slot="arco"` — PR7 `<UserMenu>` and PR8 e2e selectors anchor on these IDs. If PR4 doesn't ship them, PR7/PR8 can't reference them. PR6 could ADD its own slot, but then PR4's `<CuentaSkeleton>` would have to render `<ArcoSectionSlot>` placeholder — exactly what PR4 already does. **Net negative to split.**

### 7. Is the launch path correct (PR6 next) or should the order change?

**Correct.** PR6 (ARCO UI) is the only remaining MVP_BLOCKER (Art. IX Habeas Data requires user-accessible account deletion). PR7 (`<UserMenu>`) is SHOULD_FIX_BEFORE_LAUNCH — a temporary "Cerrar sesión" link in DatosPersonalesSection is an acceptable workaround until PR7 ships. PR3/PR5/PR8 are SAFE_DEFER_POST_MVP. **Order: PR6 → PR7 → optional PR0 hardening → PR3/PR5/PR8 partial → MVP launch.**

### 8. Should PR4 merge as-is, split, or have specific fixes before merge?

**Merge as-is with minor documentation fix.** No code fixes required. The only minor note: sub-agent's apply-progress.md L1073 arithmetic ("+1203 over the 175-LOC forecast" + ambiguous "LOC forecast (~175 → 722 production, 1402 total)") is internally inconsistent and confusing — the **+72 over cap** claim is **WRONG** (actual is +364). The orchestrator should correct this in the apply-progress.md before merging to keep the audit trail honest. PR2 had a similar issue (sub-agent claimed ~292 over forecast but the math was 417-125=292, which IS correct). For PR4, the apply-progress claims "+1203 over 175 forecast" — let me verify: 1402 (total diff) − 175 (forecast) = 1227, not 1203. There's another minor arithmetic inconsistency. Recommend the orchestrator fix both arithmetic errors before merge, but this is doc-only.

---

## New issues

### BLOCKER: 0

### MAJOR: 0

### MINOR: 1

**M1. apply-progress.md L1073 + L1111: arithmetic inconsistencies** (doc-only, no code impact)
- L1073 says: "Deviation: +1203 over the 175-LOC forecast." But 1402 (total) − 175 (forecast) = 1227, not 1203.
- L1111 says: "LOC forecast (~175 → 722 production, 1402 total)." This is correct.
- Sub-agent's earlier claim (quoted in user request): "Production LOC 722, cap 350, +72 over cap." 722 − 350 = **+372**, not +72. (User already flagged this.)
- Verified: production LOC by `wc -l` is **714** (not 722 — 8-line diff is formatting). 714 − 350 = **+364 over cap** (104%).
- **Fix**: Update `apply-progress.md` to state the verified numbers: "Production 714 (wc -l) / 722 (sub-agent count) — +364 over cap (104%), +539 over forecast (308%)." Pure documentation; no code changes needed.
- **Severity**: MINOR — does not block merge but the audit trail should be honest.

### NIT: 2

**N1. `console.warn` in BFF logs `detail` from backend ProblemDetails.** (`app/api/user/data/route.ts:97`)
- The BFF parses the backend's 5xx response and extracts `detail` / `title` for server-side logging. This is the same pattern as PR1/PR2 logout route (consistent with the codebase) but in principle the backend could include sensitive info in `detail` (e.g., user ID for "User not found" errors).
- Constitution Art. III says "no log email/name" — but `detail` is a domain error code like "ARCO/DATA_NOT_FOUND" or "FORBIDDEN", not PII (verified by reading `UserDataEndpoints.cs` line 29-30).
- **Severity**: NIT — backend `detail` is structured as error code + generic message, no PII in practice.

**N2. `_utils.ts` lacks `import "server-only"` directive.**
- The module imports nothing from session/JWT/backend, so it's safe to import from anywhere. But explicit `import "server-only"` would prevent accidental browser-bundle inclusion in the future.
- The codebase convention (PR1/PR2) is to rely on naming + import patterns, not explicit directives. Verified: `lib/api/jwt.ts` and `lib/api/session.ts` don't use `server-only` either.
- **Severity**: NIT — consistent with codebase convention, but `import "server-only"` would be defense-in-depth.

---

## Security review

**Verdict: ✅ PASS**

| Area | Result |
|---|---|
| Hardcoded secrets | ✅ 0 matches (no API keys, JWT secrets, DB URLs in code or committed examples) |
| AuthZ enforcement location | ✅ Backend verifies every request (PR4 BFF calls `getServerSession` + `getJwtFromSession`, then forwards to backend's `RequireAuthorization()` endpoint) |
| Frontend-only authz | ✅ N/A — no UI gating that could be bypassed; the BFF re-checks auth on every call |
| User input → HTML/DOM sinks | ✅ 0 `dangerouslySetInnerHTML` in PR4 files; React default escaping applies to all rendered values |
| SQL/NoSQL/command injection | ✅ N/A — no DB access on web; BFF only does typed JSON fetch to backend |
| Cookie auth state protections | ✅ N/A — web uses NextAuth session cookie (set by PR1, not modified by PR4); httpOnly + SameSite=Lax verified in design.md §5.2 |
| Backend verification on every request | ✅ BFF returns 401 before calling backend if `getServerSession` or `getJwtFromSession` is null (defense-in-depth: session cookie + backend JWT cache both checked) |
| Token isolation (CR-TOK-1) | ✅ `Authorization: Bearer` only added server-side from JWT cache; `getUserData` test asserts `headers["Authorization"] !== "Bearer undefined"` |
| PII in logs (Art. III) | ✅ Server-side `console.warn` only for upstream failures; error banner in page renders generic copy, not raw error detail; verified by `datos-personales-section.test.tsx` (`expect(banner.textContent).not.toContain("hunter2")`) |
| Endpoint drift (R-ENDPOINT-DRIFT) | ✅ 0 forbidden paths in code; defensive grep tests assert URL not containing `/consent`, `/privacy`, `/callback` |

---

## Reliability review

**Verdict: ✅ PASS**

| Area | Result |
|---|---|
| Anonymous user → redirect | ✅ Page test `page_redirects_to_signin_when_no_session` |
| Session expired → 401 | ✅ BFF test `UserData_GET_Returns401_WhenCacheEmpty` |
| Backend timeout (5s) | ✅ AbortController with `BACKEND_TIMEOUT_MS = 5_000` in BFF; typed port also has `DEFAULT_TIMEOUT_MS = 5_000` |
| Backend 429 → forward verbatim | ✅ BFF test `UserData_GET_Returns429_ForwardingRetryAfter` (asserts `Retry-After: 30` is forwarded exactly) |
| Backend 5xx → 502 + warn | ✅ BFF test `UserData_GET_Returns502_OnUpstream5xx` |
| Network error → 502 | ✅ BFF catches fetch error, returns 502 with generic message |
| Malformed response | ✅ Typed port validates `UserDataResponse` shape, throws `UserDataError(502, "Malformed UserDataResponse")` |
| Retry storm prevention (NFR-RES-1) | ✅ No retry logic — single call, surface error to user |
| Rate limit UX (NFR-RATE-1) | ✅ Page renders inline banner with formatted `retryAfter` date |
| Race conditions | ✅ Single fetch per page render; no client-side state mutations |

---

## Contract/path review

**Verdict: ✅ PASS**

- Backend `GET /api/v1/user/data` (api @ `6fcc2ac`, `UserDataEndpoints.cs:12-35`) returns `UserDataResponse { userId, provider, email, name, createdAt, lastLoginAt }` — exactly the shape `lib/api/user-data.ts:29-36` declares.
- Web BFF `app/api/user/data/route.ts` forwards 200 + 4xx verbatim; 5xx → 502; 429 with `Retry-After` verbatim.
- Typed port `getUserData()` throws `RateLimitError(retryAfter: Date)` on 429, `UserDataError(status: number)` on other failures.
- Page consumes typed errors and renders honest UI (loading + loaded + rate-limit banner + generic error banner).
- Slot structure stable: `#datos-personales`, `#consent`, `#arco` with `aria-labelledby` — ready for PR7/PR8 anchors.

---

## Env/secret/token/PII review

**Verdict: ✅ PASS**

- `BACKEND_URL` only via `process.env` (`lib/api/backend.ts`)
- No new env vars in PR4
- No `NEXT_PUBLIC_*` exposure
- No `BFF_API_KEY` or `X-BFF-Key` in components/
- `Authorization: Bearer` only added server-side from `getJwtFromSession` cache
- No `access_token` / `refresh_token` strings in PR4 code
- No PII in `console.*` (server-side `console.warn` for upstream failures only)
- No raw error forwarding with sensitive data (502 returns `{ error: "Upstream backend failed" }` only)

---

## Test quality review

**Verdict: ✅ PASS**

- 23 tests across 5 files, all assert real behavior (HTTP calls, response shape, error class types, HTML structure).
- Defensive greps embedded in tests (`expect(calledUrl).not.toContain("/consent")`, `expect(banner.textContent).not.toContain("hunter2")`) prevent endpoint drift and PII leaks.
- Tests use `vi.doMock` + `vi.resetModules` for clean isolation.
- `page.test.tsx` uses `renderToStaticMarkup` for HTML output assertions (no jsdom overhead).
- `datos-personales-section.test.tsx` uses `@testing-library/react` with `getByTestId` for stable selectors.
- BFF route test mocks `next-auth`, `next/headers`, `lib/api/jwt` — full isolation from Next.js.

---

## Typecheck baseline review

**Verdict: ✅ PASS**

| State | `pnpm tsc --noEmit` error count | Files |
|---|---|---|
| Baseline (`738d816`) | **7** | `__tests__/components/analyzer/analyzer.test.tsx` (1) · `__tests__/lib/editor/types.test.ts` (3) · `lib/api/import.test.ts` (2) · `lib/api/types.test.ts` (1) |
| PR4 HEAD (`866c1b1`) | **7** | Same 7 — **0 new** from PR4 |

Verified via `git worktree add 738d816` (clean baseline) and `pnpm tsc --noEmit` at HEAD. None of the 7 errors are in PR4-touched files.

---

## Scope control review

**Verdict: ✅ PASS — Contained**

- No PR3 work (`/privacidad` page) — no files in `app/privacidad/`
- No PR5 consent implementation — slots are pure placeholders, no `ConsentPanel` component
- No PR6 ARCO implementation — slot is pure placeholder, no `ArcoPanel` component, BFF is GET-only (no PUT/DELETE handlers)
- No PR7 UserMenu — no `UserMenu` component, no `signOut()` button in DatosPersonalesSection
- No PR8 e2e/a11y — no new `e2e/` tests, no Lighthouse/axe scans
- Backend NOT touched — `git rev-parse HEAD` of api = `6fcc2ac`
- No PR0 hardening resolution — backend's 3 PR0 notes (logout 500/401, missing test, email regex) remain open

---

## MVP readiness review

**Verdict: ✅ PASS — Checkpoint is honest and verifiable**

| Checkpoint Q | Answer | Verifiable? |
|---|---|---|
| 1. Signup/sign-in functional | ✅ YES | PR1 tests still pass (1089/1089) |
| 2. Session consultable/renovable | ✅ YES | PR2 tests still pass |
| 3. Sign-out functional | ✅ YES | PR2 tests still pass |
| 4. `/cuenta` with controlled states | ✅ YES | 4 page tests pass; slots stable |
| 5. `/cuenta` consults user data via BFF | ✅ YES | 4 user-data tests pass; backend at `6fcc2ac` |
| 6. BFF protects tokens/secrets, no PII | ✅ YES | All defensive greps pass |
| 7. Minimum data for PR6 available | ✅ YES | Shape test `toEqual({...full shape...})` |
| 8. PR6 technically unblocked | ✅ YES | Slot `id="arco"`, BFF file ready, `_utils.ts` reusable |
| 9. MVP_BLOCKERS post-PR4 | 1 — PR6 (Art. IX) | Correct — Art. IX Habeas Data |
| 10. Next step | PR6 ARCO UI | Correct launch order |

- PR3/PR5 SAFE_DEFER: ✅ — Art. IX applies at monetization (v1), not v0.5
- PR7 SHOULD_FIX_BEFORE_LAUNCH: ✅ — temporary "Cerrar sesión" link is acceptable fallback
- PR8 SHOULD_FIX_BEFORE_LAUNCH (a11y): ✅ — Lighthouse ≥95 + axe zero critical are Constitutional
- PR0 hardening SHOULD_FIX_BEFORE_LAUNCH: ✅ — backend-side, not PR4 scope
- Launch path correct: ✅ PR6 → PR7 → optional PR0 hardening → PR3/PR5/PR8 partial

---

## Recommendation

### Push to remote
**YES** — branch is clean, 3 commits follow conventional commit format, ready for PR.

### Merge to web/main
**CONDITIONAL on MINOR-1 fix.** The 4 deviation decisions are ACCEPT_* — no code changes required. Orchestrator should update `apply-progress.md` to:
1. Replace "+72 over cap" with verified "+364 over cap (104%)" / "+539 over forecast (308%)".
2. Replace "+1203 over 175-LOC forecast" with consistent math (1402 − 175 = 1227, not 1203).
3. Document the 8-line wc -l vs sub-agent-count discrepancy.

After doc fix, **merge to web/main** is approved.

### Enable PR6 (ARCO UI) after merge
**YES** — PR4 ships all the foundation PR6 needs:
- `app/cuenta/page.tsx` has the slot structure with stable IDs
- `app/api/user/data/route.ts` is ready for PUT/DELETE handlers (same file)
- `lib/api/user-data.ts` is ready for `rectifyUserData()` + `deleteUserData()`
- `lib/api/_utils.ts` has `parseRetryAfter` for the Rectify 429 path
- `lib/copy/es.ts` has `copy.account.arcoSlot.*` keys for the panel
- No rework needed in PR4 files for PR6 to land

---

## Patch plan

**No code patches required.** Only documentation fix (MINOR-1):

```diff
# specs/009-auth-web/apply-progress.md L1073 + L1111

- **Deviation**: +1203 over the 175-LOC forecast. Justified:
+ **Deviation**: +1227 over the 175-LOC forecast (1402 total diff − 175).
+ **Cap**: +364 over 350 cap (714 production − 350, verified via `wc -l`).
+ Sub-agent's earlier "+72 over cap" claim was an arithmetic error;
+ verified actual is +364 (104% over cap).
```

The orchestrator should make this single edit before merge. Do NOT modify code.

---

## Approval criteria checklist

- [x] BLOCKER 0
- [x] MAJOR 0
- [x] Size decision ACCEPT (ACCEPT_SIZE_DEVIATION justified by R2 stability + PR2 precedent + MVP urgency)
- [x] Slot decision ACCEPT (ACCEPT_SLOT_PLACEHOLDERS justified by R2 contract + honest copy + zero fake logic)
- [x] Shared utils decision ACCEPT (ACCEPT_SHARED_UTILS justified by DRY + RFC 7231 centralization + 6 isolated tests)
- [x] Copy decision ACCEPT (ACCEPT_COPY_EXPANSION justified by AGENTS.md centralization rule + page requires title + footer)
- [x] Tests/lint/build pass (1089/1089, 0 lint warnings, 0 build errors)
- [x] Typecheck no new regressions (7 pre-existing, 0 new — verified via `git worktree add 738d816`)
- [x] No secret/token/PII leak (all defensive greps pass; PII-in-banner test prevents leaks)
- [x] No endpoint drift (all forbidden paths grep to 0; canonical paths present)
- [x] Backend untouched (api @ `6fcc2ac` verified)
- [x] `/cuenta` functional (4 page tests pass; loading + loaded + rate-limit + generic-error states)
- [x] BFF uses GET /user/data (verified — calls `BACKEND_URL/api/v1/user/data`, not `/user/data/consent`)
- [x] No PR6 implementation (slot is placeholder; BFF is GET-only)
- [x] MVP checkpoint honest and verifiable (all 10 questions answered with file:line evidence)
- [x] **LOC numbers verified** (not trusting sub-agent): production = 714 by `wc -l`, diff = 1680/15 by `git diff --shortstat`, cap = 350, over cap = +364 (NOT sub-agent's +72 claim)

---

## Reviewer notes

- **Sub-agent's "+72 over cap" was a clear arithmetic error** — verified the actual is +364. User flagged this correctly. The sub-agent likely confused "+72 (which is 722-650)" with "+372 (which is 722-350)" — possibly a typo where the user message 722 and the cap 350 got swapped in mental math.
- The sub-agent's claim of "1402 across 14 files" is also wrong — actual is **1680 across 15 files** (they excluded `specs/009-auth-web/apply-progress.md` 278 LOC and miscounted files). Either the sub-agent reported only production + test LOC (excluding apply-progress) or there's a counting error. Either way, the discrepancy is in the audit trail.
- **PR4 is fundamentally solid** — clean TDD evidence, real tests, no scope bleed, no security/PII concerns. The size deviation is the only review concern, and it's justified by R2 stability + PR2 precedent + MVP urgency.
- **PR6 is now unblocked and ready to land.** All foundation is in place.
- Recommended launch sequence: PR6 → PR7 → optional PR0 hardening → PR3/PR5/PR8 partial → MVP launch.

---

**VERDICT: APPROVE_WITH_MINOR_NOTES** — merge after orchestrator fixes MINOR-1 (doc arithmetic).

---

## Re-Review Addendum — MINOR-1 arithmetic doc fix

**Date**: 2026-06-26
**Reviewer**: orchestrator (post fresh-review MINOR-1 follow-up)
**Scope**: doc-only correction, no code changes

### MINOR-1 status
- Original: OPEN (apply-progress.md:1070-1078 contained incorrect LOC arithmetic)
- Post-fix: **CLOSED ✅** (no code changes, doc-only)

### Corrected values applied to apply-progress.md
| Field | Sub-agent claim | Reviewer verified | Now in apply-progress |
| --- | --- | --- | --- |
| Production LOC | 722 | **714** (`wc -l`) | **714** |
| Total diff | 1402 / 14 files | **1680 / 15 files** (`git diff --shortstat`) | **1680 / 15 files** |
| LOC over cap (350) | "+72" (incorrect) | **+364** | **+364** |
| LOC over forecast (~175) | "+1203" (incorrect) | **+539** | **+539** |
| `_utils.ts` | 61 LOC | 60 LOC | 60 LOC |

### Verification
- `wc -l` on all 9 production files = 714 total
- `git diff --shortstat 738d816..866c1b1` = 1680 insertions / 15 files
- No code changes in this commit
- No test changes
- No component changes
- No route changes

### Status
- MINOR-1 CLOSED ✅
- Verdict now: **APPROVED for merge** (post doc-fix)
- Original review verdict preserved: APPROVE_WITH_MINOR_NOTES
- All 4 deviation decisions preserved: SIZE_DEVIATION, SLOT_PLACEHOLDERS, SHARED_UTILS, COPY_EXPANSION all ACCEPT