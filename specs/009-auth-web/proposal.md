# Proposal: 009-auth-web — Integrate backend 009-auth into BuildCv-web

## 1. Goal

Integrate the shipped backend `009-auth` (47 tasks, 290 tests, in-memory) into `BuildCv-web` so that users can:

1. **Sign in** with Google or LinkedIn via NextAuth → receive a backend JWT for protected endpoints.
2. **Sign out** cleanly, revoking the backend refresh token + clearing the NextAuth cookie + invalidating the BFF cache.
3. **Read the privacy policy** at `/privacidad` with a side-by-side version selector for v1, v2, and v3.
4. **Grant / revoke consent** per data-processing purpose from `/cuenta`.
5. **Exercise ARCO rights** (Access, Rectify, Cancel) from `/cuenta`, with irreversible-delete confirmed by typing the user's email.
6. **See an auth-aware header** (signed-in user menu with name + sign-out, sign-in CTA for anonymous users).

The web currently has **partial scaffolding** (NextAuth, BFF session-exchange helper, signin page) but is **not production-ready**: the OAuth callback posts the wrong payload to the wrong URL (`lib/auth.ts:46`), there is no `/cuenta`, no consent UI, no ARCO UI, no logout button, no route protection, no user-menu, and tests are happy-path only.

---

## 2. Scope

### In scope — 11 missing capabilities

| # | Capability | Backend has | Web has today |
|---|---|---|---|
| 1 | Working OAuth callback → backend user creation | `POST /api/v1/auth/google`, `/linkedin` accept `{code}` from Google's own OAuth dance | ❌ `lib/auth.ts:46` posts `{providerId,email,name}` to wrong URL `/auth/google/callback` |
| 2 | Sign-out button + handler (full bearer-only revocation, **Q1=B**) | `POST /api/v1/auth/logout` accepts `{refreshToken}` only | ❌ No `signOut()` anywhere; web has no refresh token |
| 3 | `/cuenta` account page | `GET /api/v1/auth/me`, `GET /api/v1/user/data` | ❌ No route |
| 4 | User menu in header (signed-in state) | `GET /api/v1/auth/me` | ❌ `<SiteHeader>` has `<HeaderExtras>` slot (per 019) but never wired |
| 5 | Consent UI (grant/revoke per purpose) | `POST /api/v1/user/data/consent[revoke]` | ❌ No UI |
| 6 | ARCO UI (access + rectify + cancel) | `GET`, `PUT`, `DELETE /api/v1/user/data` | ❌ No UI |
| 7 | Privacy policy page (`/privacidad`) | `GET /api/v1/privacy-policy?version=N` returns v1/v2/v3 | ❌ No route |
| 8 | Route protection (`/cuenta` → anonymous → `/auth/signin`) | n/a | ❌ No `middleware.ts` |
| 9 | `useSession()` wrapper (`useUserMenu` hook) | n/a | ❌ Zero `useSession` usage in components |
| 10 | WCAG 2.2 AA user-menu dropdown (native `<dialog>`, per 019 convention) | n/a | ❌ No user menu |
| 11 | Tests for all of the above | n/a | ❌ Happy-path only; no ARCO / consent / privacy / user-menu tests |

### Refined scope — 9 chained PRs

> **Total estimated scope**: ~1,480–2,230 LOC, ~88–110 new tests. Cross-repo: **PR0 (api, backend prep) + PR1–PR8 (web)**.
> **Review budget**: each PR is ≤350 LOC (50-LOC margin under the 400-line review guard from session 021 cache).
> **Refinement rationale**: original 5-PR plan had PR3 (`/cuenta`+consent) and PR4 (ARCO) at the upper 400-LOC limit. Splitting `/cuenta` skeleton from consent and ARCO, separating auth adapter from session helpers, isolating the user menu, and parking e2e/hardening in a final PR gives 9 slices, each independently shippable, each green on `pnpm lint && pnpm build && pnpm test`.

| # | PR name | Repo | LOC target | Tests | Depends on |
|---|---|---|---|---|---|
| PR0 | Backend `/auth/web-signup` + revoke-all-for-user + bearer-only logout | api | ~100 | ~6 | — |
| PR1 | Web auth adapter + contract fix | web | ~180 | ~10 | PR0 |
| PR2 | Session refresh + sign-out helpers | web | ~125 | ~8 | PR1 |
| PR3 | `/privacidad` page + version selector | web | ~175 | ~9 | PR1 |
| PR4 | `/cuenta` page skeleton + GET user-data BFF | web | ~175 | ~8 | PR2 |
| PR5 | Consent management (panel + grant modal + BFFs) | web | ~300 | ~12 | PR4 |
| PR6 | ARCO request flow (panel + cancel modal + BFFs) | web | ~300 | ~12 | PR4 |
| PR7 | `<UserMenu>` component (header + sign-out wiring) | web | ~175 | ~8 | PR2 |
| PR8 | E2E + a11y hardening | web | ~250 | ~15 | PR0–PR7 |
| **Total** | | | **~1,780 LOC** | **~88 tests** | |

### Out of scope (deferred, do not touch in this change)

- **Password auth, SMS 2FA, email magic-link** — deferred to v0.6+ / 022-email-magic-link if needed.
- **Backend persistence** — `InMemoryUserDataStore` stays in-memory; 010-persistence ships later. Documented in `/cuenta` footer.
- **Lazy-create in `NextAuthJwtValidator`** — the backend's `IUserDataService.GetOrCreateAsync` already exists (verified `BuildCv.Application/Features/Auth/IUserDataService.cs:8`). We expose it via the new `/auth/web-signup` endpoint instead of mutating the validator. Keeps the validator's contract clean.
- **Refresh-token rotation on the web** — backend already rotates on `/auth/refresh`. The web's 15-min backend JWT (5-min BFF cache) is the only token the web touches. No auto-refresh needed in v0.5.
- **Auto-refresh on BFF 401** — exploration noted the cache staleness risk (item #5). Defer to v0.6: surface 401 to the client and let `<UserMenu>` re-render with `unauthenticated` state. Keeps PR2 bounded at ≤350 LOC.

---

## 3. Locked product decisions

### Q1 = B — Logout: full backend revocation
Refresh token revocation is server-side. The web calls a new BFF route (`app/api/auth/logout`, PR2), which calls the backend's `/api/v1/auth/logout`. **The backend must accept bearer-only** (no `refreshToken` in body) and revoke **all** refresh tokens for the user derived from the JWT `sub` claim. This requires a **small backend touchup** shipped in **PR0** — and is the cross-repo coupling point.

**Why B over A/C**: Art. III + Art. IX demand real revocation. Just clearing the NextAuth cookie leaves the refresh token valid for up to 7 days on the backend — a privacy leak. Option C (don't bother for in-memory backend) is unacceptable: even in dev, a 7-day orphan token is a defect.

### Q2 = A — OAuth providers: Google + LinkedIn (both in v0.5)
Both providers ship together. Already wired in `lib/auth.ts:21-28`. **No backend change** for providers; the backend already accepts both via `POST /api/v1/auth/{google|linkedin}`.

**Why both**: target user (Colombian recruiter) uses LinkedIn; technical users use Google. Locking to one would cut the funnel in half. The cost is 1 extra env var set + 1 extra redirect URI in Google/LinkedIn consoles (documented in PR1).

### Q3 = A — Privacy version selector: dropdown, v1/v2/v3 side-by-side
`/privacidad` always shows a `<select>` with the three versions. Default selection is the latest (v3). **NO backend change needed** — `PrivacyPolicyQueryHandler.cs:61-104` already ships v3 (effective `2026-06-25`, covers subscriptions). Verified.

**Why dropdown vs. tabs**: tabs hide v1 behind a click; the selector makes all three versions equally discoverable per Art. IX (transparency). WCAG 2.2 §1.3.1 (Info and Relationships) is satisfied with a labeled `<select>`. Implementation lives in PR3.

### Defaults proposed (not user-locked, picked per Constitution)

| Decision | Default | Justification |
|---|---|---|
| **Consent purposes shipped** | `["functional", "analytics"]` | Backend accepts any string `{purpose}` (free-form, no enum). **Functional** = essential (sign-in, ARCO). **Analytics** = opt-in, never auto-granted, never shared with third parties (per Art. III). **No marketing** — there is no marketing pipeline and Art. IV forbids speculative copy. Implementation in PR5. |
| **Rate-limit UX (429)** | Inline error with `Retry-After` timestamp on the affected page (signin page on auth 429; `/cuenta` toast on consent/ARCO 429) | Art. IV honesty: tell the user **exactly when** they can retry, not "intenta más tarde". Same pattern across both surfaces — consistency wins. Verified in PR5/PR6 (component-level) and PR8 (e2e). |
| **Local-mode auth bypass** | Local mode skips ALL auth UI (no `<UserMenu>`, no `/auth/signin` redirect, no `localStorage` of session). Verified by Vitest asserting local-mode build never renders `<UserMenu>`. | Art. VII (v0 usable without friction). Already partially wired via `IS_LOCAL` constant. Implementation note lives in PR7. |
| **Privacy policy rendering** | Plain `<pre>` with monospaced markdown (no extra dep like `react-markdown`) | Project rule: no external UI library. Markdown is hardcoded in backend, no user input flows through it. |
| **User-menu dropdown** | Native `<dialog>` element | 019 REQ-NAV-003/004 establishes this convention. Native handles focus trap + Esc + backdrop. Implementation in PR7. |
| **ARCO delete confirmation** | Type-email-to-confirm pattern (button enables only when input === user.email) | Irreversible action; the existing pattern in 006-web-cv-editor for "eliminar CV" uses the same gate. Implementation in PR6. |

---

## 4. Approach — 9 chained PRs

> **Strategy**: `feature-branch-chain` (each PR targets the previous PR's branch; final merges to `main`). Each PR ≤350 LOC, each mergeable in isolation, each with green tests. Backend PR0 first; web PR1 depends on PR0. Cross-repo atomicity: if PR0 is reverted, PR1 (and downstream) must follow — the chain is not parallel-safe across the repo boundary until PR0 lands.

---

### PR0 — Backend: `/auth/web-signup` + revoke-all-for-user + bearer-only logout

- **Repo affected**: `BuildCv-api/`
- **Objective**: Ship the cross-repo backend touchups that unblock every web PR downstream: (a) a new endpoint that accepts the web's NextAuth user shape, (b) bearer-only logout that revokes all refresh tokens for the JWT `sub`, (c) `IRefreshTokenStore.RevokeAllForUserAsync` interface method + 2 implementations.
- **Files touched** (estimated):
  - **Modified**: `src/BuildCv.Api/Endpoints/AuthEndpoints.cs` (+20 LOC for `/web-signup` endpoint, +15 LOC for logout optional body)
  - **Modified**: `src/BuildCv.Application/Features/Auth/LogoutHandler.cs` (+10 LOC: handle missing-refresh-token path by extracting `sub` from `ClaimsPrincipal`)
  - **Modified**: `src/BuildCv.Application/Features/Auth/IRefreshTokenStore.cs` (+5 LOC: new `RevokeAllForUserAsync(Guid userId)` method)
  - **Modified**: `src/BuildCv.Infrastructure/Auth/InMemoryRefreshTokenStore.cs` (+10 LOC: implementation)
  - **Modified**: `src/BuildCv.Infrastructure/Auth/EfRefreshTokenStore.cs` (+10 LOC: implementation, even though EF is unused in v0.5 — keeps the contract aligned for 010-persistence)
  - **Modified**: `src/BuildCv.Api/Contracts/AuthContracts.cs` (+10 LOC: new `WebSignupRequest` record + nullable `RefreshToken` on `RefreshTokenRequest`)
- **LOC estimate**: 80–120 LOC production code (midpoint ~100)
- **Tests expected**: ~6
  - `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs` (+~50 LOC, ~4 tests): `POST /auth/web-signup` happy path, unknown provider rejected, invalid email rejected, logout-without-body revokes-all-for-user
  - `tests/BuildCv.Application.UnitTests/Auth/RefreshTokenStoreTests.cs` (+~20 LOC, ~2 tests): `InMemoryRefreshTokenStore.RevokeAllForUserAsync` removes all entries for a `userId` and is a no-op for unknown `userId`
- **Risks specific to PR0**:
  - **R0-A**: `IRefreshTokenStore` interface change is a breaking change for `EfRefreshTokenStore` if its interface signature matters at runtime. Mitigated: 010-persistence is the only consumer, and we add the same method to both impls in this PR (no half-implementing).
  - **R0-B**: Making `RefreshTokenRequest.RefreshToken` nullable could regress callers that pass an empty string today. Verified by integration test asserting the current `string` payload still works.
- **Dependencies**: none (this is the chain root).
- **Acceptance criteria (Gherkin)**:
  - **Given** the backend is running, **When** the web POSTs `{provider, providerAccountId, email, name}` to `/api/v1/auth/web-signup`, **Then** the backend returns `{userId}` (and creates/updates the user via `IUserDataService.GetOrCreateAsync`).
  - **Given** an authenticated session (valid bearer JWT), **When** the web POSTs `/api/v1/auth/logout` with **no body**, **Then** the backend extracts `sub` from the JWT and calls `RevokeAllForUserAsync(sub)`, returning `{message: "Logged out successfully"}`.
  - **Given** a user has 3 active refresh tokens, **When** they call `/auth/logout` with bearer JWT (no body), **Then** all 3 are revoked and a subsequent `/auth/refresh` call returns 401.
  - **Given** `IRefreshTokenStore.RevokeAllForUserAsync(unknownUserId)` is called, **When** the method runs, **Then** it returns without throwing (idempotent).
- **Constitution articles touched**: **Art. III** (real revocation), **Art. V** (server-side rate limits + body validation), **Art. IX** (audit log entry on revoke-all).

---

### PR1 — Web: auth adapter + contract fix

- **Repo affected**: `BuildCv-web/`
- **Objective**: Bridge NextAuth's session shape to the new backend `/auth/web-signup` endpoint, fixing the contract drift (`lib/auth.ts:46`) without disturbing the rest of the web. The BFF route is the only place that knows about the backend contract.
- **Files touched**:
  - **Modified**: `lib/auth.ts` (+30 LOC: replace the broken `signIn` callback POST with a thin NextAuth `events.signIn` hook that calls our new BFF; keep the `jwt`/`session` callbacks untouched)
  - **Modified**: `__tests__/lib/auth.test.ts` (+~15 LOC, ~3 tests replace 1 obsolete test: "signIn does NOT post to backend", "events.signIn calls web-signup BFF", "events.signIn no-ops when BFF returns 5xx")
  - **New**: `lib/api/auth-adapter.ts` (~50 LOC): typed wrapper `registerWithBackend({provider, providerAccountId, email, name})` → calls `fetch('/api/auth/web-signup', {method: 'POST', body: JSON.stringify(...)})`; throws `AuthAdapterError` on non-2xx with the backend's `detail`.
  - **New**: `app/api/auth/web-signup/route.ts` (~50 LOC): POST handler that calls `BACKEND_URL/api/v1/auth/web-signup` with the request body; returns 200 on success, 502 on backend failure (the web does NOT silently absorb backend errors — the NextAuth `events.signIn` hook interprets 5xx as "user creation failed, still log them in but mark dirty" and surfaces a non-blocking warning).
  - **New**: `__tests__/lib/api/auth-adapter.test.ts` (~80 LOC, ~4 tests): success, backend 401, backend 500, network error.
  - **New**: `__tests__/app/api/auth/web-signup/route.test.ts` (~100 LOC, ~5 tests): happy path, backend 401 → 502, invalid body → 400, no session → 401, malformed JSON → 400.
- **LOC estimate**: 150–200 LOC (midpoint ~180; upper bound well under 350)
- **Tests expected**: ~10 (3 replaced + 4 + 5 = 12 total, of which ~10 are net-new)
- **Risks specific to PR1**:
  - **R1-A**: NextAuth's `events.signIn` runs on every successful sign-in. If the BFF is slow, login latency increases. Mitigated: BFF uses 5-second timeout and a non-blocking `try/catch` — failure to register does NOT block login (the user can still see `/cuenta`; the next BFF call will retry via PR2's session helper).
  - **R1-B**: The "broken test" in `__tests__/lib/auth.test.ts:38-63` must be updated, not deleted (per project TDD rules — never silently remove a green test). Documented in commit message.
- **Dependencies**: **PR0** (the new `/auth/web-signup` endpoint).
- **Acceptance criteria**:
  - **Given** a user signs in with Google via NextAuth, **When** the `events.signIn` hook fires, **Then** the web POSTs `{provider: "google", providerAccountId: "<googleId>", email, name}` to `/api/auth/web-signup`, which forwards to the backend.
  - **Given** the backend returns `{userId}`, **When** the BFF responds, **Then** the web's NextAuth session is established (no error), and the NextAuth JWT contains `sub = <googleId>`.
  - **Given** the backend `/auth/web-signup` returns 5xx, **When** the BFF responds, **Then** the web logs a warning to `console.warn` (NOT `console.error` — Art. III no PII noise) and proceeds with sign-in.
  - **Given** the existing `__tests__/lib/auth.test.ts:38-63` test (the "signIn posts to backend" assertion), **When** the new tests run, **Then** that test is updated in the SAME commit (not deleted silently) to assert "signIn does NOT post to backend directly".
- **Constitution articles touched**: **Art. VI** (BFF as port, components stay presentational), **Art. VIII** (TDD red-green-refactor on the auth-adapter).

---

### PR2 — Web: session refresh + sign-out helpers

- **Repo affected**: `BuildCv-web/`
- **Objective**: Ship `signOutAndClear()` (clears NextAuth cookie + calls the new logout BFF + clears the BFF JWT cache) and the BFF route that calls the backend `/auth/logout` with bearer-only semantics. This PR is the single source of truth for "log out of everything."
- **Files touched**:
  - **New**: `app/api/auth/logout/route.ts` (~60 LOC): POST handler that reads the NextAuth session via `getServerSession`, exchanges for a backend JWT via `getJwtFromSession`, calls `BACKEND_URL/api/v1/auth/logout` with `Authorization: Bearer`, returns 200 even on backend failure (best-effort — UX over correctness for an in-memory backend).
  - **New**: `lib/auth-client.ts` (~50 LOC): exports `signOutAndClear()` which (a) calls `signOut({callbackUrl: "/"})` from `next-auth/react`, (b) POSTs `/api/auth/logout`, (c) calls `clearJwtCache()` from `lib/api/jwt.ts:152`. Also exports `useAuthClient()` hook that wraps `useSession()` from `next-auth/react` and exposes `{status, user, signOutAndClear}`.
  - **Modified**: `lib/api/jwt.ts` (no new LOC — verify `clearJwtCache()` is already exported and tested; if not, add the export).
  - **New**: `__tests__/lib/auth-client.test.ts` (~50 LOC, ~3 tests): `signOutAndClear` order of operations (NextAuth signOut → BFF logout → cache clear), error in step (b) does NOT skip step (c), no session → no-op.
  - **New**: `__tests__/app/api/auth/logout/route.test.ts` (~120 LOC, ~5 tests): success, backend 401, backend 500, no session → 204, cache cleared in all paths (assert via `vi.mock` of `lib/api/jwt`).
- **LOC estimate**: 100–150 LOC (midpoint ~125)
- **Tests expected**: ~8 (3 + 5)
- **Risks specific to PR2**:
  - **R2-A**: The "best-effort" semantics on backend logout failure could mask real bugs. Mitigated: the backend's `/auth/logout` is idempotent and in-memory, so failures are dev-environment-only; we log to `console.warn` (NOT `console.error`) so the production observability dashboard stays clean.
  - **R2-B**: `clearJwtCache()` mutates module-level state — test isolation requires `vi.resetModules()` between tests. Documented in the test file's header comment.
- **Dependencies**: **PR1** (uses `lib/api/auth-adapter.ts` pattern for typed error wrapping).
- **Acceptance criteria**:
  - **Given** the user clicks "Cerrar sesión" in the header (rendered by PR7), **When** `signOutAndClear()` runs, **Then** the NextAuth session cookie is cleared, the BFF `/api/auth/logout` is called, and the BFF JWT cache is cleared — in that order.
  - **Given** the backend `/auth/logout` returns 500, **When** `signOutAndClear()` runs, **Then** the NextAuth cookie is still cleared, the JWT cache is still cleared, and `console.warn` records the backend failure.
  - **Given** no active session, **When** the user calls `signOutAndClear()`, **Then** the function is a no-op (returns immediately, no network calls).
- **Constitution articles touched**: **Art. III** (real revocation on the server side), **Art. VI** (BFF as port), **Art. VII** (no friction on sign-out — never blocks the user).

---

### PR3 — Web: `/privacidad` page + version selector

- **Repo affected**: `BuildCv-web/`
- **Objective**: Public route (no auth gate) at `/privacidad` that renders the privacy policy with a `<select>` for v1/v2/v3. Default selection = v3 (latest). Zero backend change.
- **Files touched**:
  - **New**: `lib/api/privacy.ts` (~40 LOC): `getPrivacyPolicy(version?: number)` calls BFF `GET /api/privacy?version=N`. Throws `PrivacyNotFoundError` on 404.
  - **New**: `app/api/privacy/route.ts` (~40 LOC): GET handler, accepts `?version=` query param, calls `BACKEND_URL/api/v1/privacy-policy`, returns the markdown + metadata as JSON.
  - **New**: `app/privacidad/page.tsx` (~50 LOC): server component. Reads `?version=` from `searchParams`. If absent, defaults to `3`. Fetches via `getPrivacyPolicy(version)` and renders `<PrivacyPolicyView>`.
  - **New**: `components/privacy/privacy-policy-view.tsx` (~60 LOC): presentational. Props: `{version, content, effectiveDate, dataCategories[], purposes[]}`. Renders the version selector + the markdown in a `<pre>` (monospace). Copy: "Política de privacidad — versión N (vigente desde DATE)".
  - **New**: `components/privacy/privacy-version-selector.tsx` (~30 LOC): client component. `<select>` with options for v1, v2, v3. On change, navigates to `?version=N` via `router.push`. WCAG: labeled `<label htmlFor="privacy-version">`.
  - **Modified**: `lib/copy/es.ts` (+~15 LOC: `copy.privacy.*` keys).
  - **New**: `__tests__/lib/api/privacy.test.ts` (~50 LOC, ~3 tests): success v3, success v1, 404 throws typed error.
  - **New**: `__tests__/components/privacy/privacy-policy-view.test.tsx` (~80 LOC, ~4 tests): renders all metadata, renders content in `<pre>`, shows version selector, accessibility tree has labeled select.
  - **New**: `__tests__/app/privacidad/page.test.tsx` (~30 LOC, ~2 tests): default version is 3, `?version=1` query renders v1.
- **LOC estimate**: 150–200 LOC (midpoint ~175)
- **Tests expected**: ~9 (3 + 4 + 2)
- **Risks specific to PR3**:
  - **R3-A**: Server component fetching per-request could blow the backend's rate limit. Mitigated: `app/privacidad/page.tsx` calls `getPrivacyPolicy` directly (server-side, no user-IP rate limit applies) — the only rate-limited path is the BFF, which is hit only by client navigation, not by the SSR pass.
  - **R3-B**: Privacy content is markdown rendered in `<pre>` (no sanitization). Mitigated: backend content is hardcoded (verified `PrivacyPolicyQueryHandler.cs:61-104`), no user input flows through it. Art. V risk = 0.
- **Dependencies**: **PR1** (uses the typed error pattern from `lib/api/auth-adapter.ts`).
- **Acceptance criteria**:
  - **Given** the user navigates to `/privacidad`, **When** the page renders, **Then** the privacy policy v3 is shown by default, with a labeled `<select>` offering v1, v2, v3.
  - **Given** the user selects v1 from the selector, **When** the navigation completes, **Then** the URL is `/privacidad?version=1` and the v1 content is shown.
  - **Given** an anonymous user navigates to `/privacidad`, **When** the page renders, **Then** no auth gate appears (route is public).
  - **Given** the backend returns 404 for `?version=99`, **When** the page renders, **Then** a `<PrivacyNotFoundError>` UI shows with copy "Versión no encontrada" + link back to `/privacidad` (defaults to v3).
- **Constitution articles touched**: **Art. III** (policy accessible before consent — consumed by PR5's grant modal), **Art. IV** (honest rendering of all 3 versions, not just v3), **Art. V** (no user input in markdown).

---

### PR4 — Web: `/cuenta` page skeleton + GET user-data BFF

- **Repo affected**: `BuildCv-web/`
- **Objective**: Ship the `/cuenta` page as a stable skeleton with route guard + a "Datos personales" header section. PR5 and PR6 inject `<ConsentPanel>` and `<ArcoPanel>` respectively into placeholder slots — this keeps the two surface-area PRs (consent and ARCO) from colliding on the same page.
- **Files touched**:
  - **New**: `lib/api/user-data.ts` (~50 LOC): `getUserData()` — calls BFF `GET /api/user/data`. Throws typed errors including `RateLimitError` (with `retryAfter`).
  - **New**: `app/api/user/data/route.ts` (~60 LOC for the GET handler only; PUT/DELETE are added in PR6): GET handler, calls `BACKEND_URL/api/v1/user/data`, returns the JSON.
  - **New**: `app/cuenta/page.tsx` (~70 LOC): server component. If no session → `redirect('/auth/signin?callbackUrl=/cuenta')`. Renders `<CuentaSkeleton>` with three sections: `<DatosPersonalesSection>` (filled now, reads user data via `getUserData()`), `<ConsentSectionSlot>` (empty placeholder, filled by PR5), `<ArcoSectionSlot>` (empty placeholder, filled by PR6). The slots are explicit named components so PR5 and PR6 each touch exactly one slot.
  - **New**: `components/account/cuenta-skeleton.tsx` (~40 LOC): presentational layout. Three `<section>` elements with stable `id` attributes (`#datos-personales`, `#consent`, `#arco`) — used as anchor targets from `<UserMenu>` (PR7) and e2e selectors (PR8).
  - **New**: `components/account/datos-personales-section.tsx` (~50 LOC): reads user data, shows email + provider + createdAt + lastLoginAt. Copy: "Tus datos personales".
  - **Modified**: `lib/copy/es.ts` (+~10 LOC: `copy.account.datosPersonales.*`).
  - **New**: `__tests__/lib/api/user-data.test.ts` (~50 LOC, ~2 tests): success, 429 throws `RateLimitError`.
  - **New**: `__tests__/app/cuenta/page.test.tsx` (~80 LOC, ~3 tests): anonymous → redirect, authenticated → renders skeleton, GET failure → friendly error.
  - **New**: `__tests__/app/api/user/data/route.test.ts` (~80 LOC, ~3 tests): success, no session → 401, backend 429 → 429 with `Retry-After` forwarded.
- **LOC estimate**: 150–200 LOC (midpoint ~175)
- **Tests expected**: ~8 (2 + 3 + 3)
- **Risks specific to PR4**:
  - **R4-A**: The skeleton must commit to a stable section structure (three named slots) so PR5 and PR6 don't conflict. Mitigated: PR5 and PR6 each touch exactly ONE slot (`<ConsentSectionSlot>` or `<ArcoSectionSlot>`), and the file diffs are reviewed for non-overlap.
  - **R4-B**: Adding `<ConsentPanel>` and `<ArcoPanel>` later means `/cuenta` page test snapshots need updating in PR5/PR6. Documented in PR5/PR6 acceptance criteria.
- **Dependencies**: **PR2** (uses `lib/api/jwt.ts` patterns for typed error wrapping + session).
- **Acceptance criteria**:
  - **Given** an anonymous user navigates to `/cuenta`, **When** the page renders, **Then** it redirects to `/auth/signin?callbackUrl=/cuenta`.
  - **Given** an authenticated user navigates to `/cuenta`, **When** the page renders, **Then** three sections are visible: "Tus datos personales" (filled), "Consentimientos" (empty placeholder with `<ConsentSectionSlot>`), "Derechos ARCO" (empty placeholder with `<ArcoSectionSlot>`).
  - **Given** the backend `/user/data` returns 429, **When** the BFF responds, **Then** the page renders an inline error with copy "Demasiadas solicitudes. Reintentá en N segundos." + the `retryAfter` value formatted as a date.
- **Constitution articles touched**: **Art. III** (no PII in logs — verified by Vitest), **Art. VII** (route guard never strands the user).

---

### PR5 — Web: consent management

- **Repo affected**: `BuildCv-web/`
- **Objective**: Build the consent grant/revoke UI on top of the `<ConsentSectionSlot>` from PR4. Ships the consent-grant modal (privacy-policy-read + checkbox gate) per Art. IX FR-053.
- **Files touched**:
  - **New**: `lib/api/consent.ts` (~60 LOC): `grantConsent(purpose)`, `revokeConsent(purpose)`, `getConsentStatus()` — typed wrappers around the BFF. Throws `RateLimitError` with `retryAfter` on 429.
  - **New**: `app/api/consent/grant/route.ts` (~40 LOC): POST handler, calls `BACKEND_URL/api/v1/user/data/consent`.
  - **New**: `app/api/consent/revoke/route.ts` (~40 LOC): POST handler, calls `BACKEND_URL/api/v1/user/data/consent/revoke`.
  - **New**: `lib/use-consent.ts` (~50 LOC): hook `{purposes, grant, revoke, error, isLoading, rateLimitRetryAt}`. Initializes from a server-passed list (`["functional", "analytics"]`).
  - **New**: `components/account/consent-panel.tsx` (~80 LOC): lists the two purposes. Each row shows the purpose name (functional/analytics) + a one-line description (from `copy.consent.purposes.*`) + a toggle button (Otorgar / Revocar). On grant → opens the `<ConsentGrantModal>`.
  - **New**: `components/account/consent-grant-modal.tsx` (~70 LOC): native `<dialog>`. Loads the privacy policy v3 via `getPrivacyPolicy(3)`. Requires scroll-to-bottom (event listener on the content's `scroll` event sets `hasScrolledToBottom = true`) + explicit checkbox tick. Confirm button disabled until both. On confirm → calls `useConsent.grant(purpose)` and closes the modal.
  - **Modified**: `app/cuenta/page.tsx` (+~5 LOC: render `<ConsentPanel>` inside `<ConsentSectionSlot>`).
  - **Modified**: `lib/copy/es.ts` (+~30 LOC: `copy.consent.purposes.*`, `copy.consent.modal.*`, `copy.consent.actions.*`).
  - **New**: `__tests__/lib/api/consent.test.ts` (~60 LOC, ~3 tests): grant success, revoke success, 429 throws typed error.
  - **New**: `__tests__/lib/use-consent.test.ts` (~50 LOC, ~2 tests): initial state, grant updates state.
  - **New**: `__tests__/components/account/consent-panel.test.tsx` (~100 LOC, ~4 tests): renders both purposes, revoke is direct, grant opens modal.
  - **New**: `__tests__/components/account/consent-grant-modal.test.tsx` (~80 LOC, ~3 tests): button disabled until scroll + checkbox, success path, cancel path.
- **LOC estimate**: 250–350 LOC (midpoint ~300; upper bound 350)
- **Tests expected**: ~12 (3 + 2 + 4 + 3)
- **Risks specific to PR5**:
  - **R5-A**: PR5 is at the upper 350-LOC budget. **If implementation exceeds 350, split into PR5a (panel + BFFs + hook, ~200 LOC) + PR5b (consent-grant modal with privacy-read gate, ~150 LOC)**. The split is mechanical — the modal depends on `useConsent.grant()` only, so PR5b can land independently.
  - **R5-B**: Scroll-to-bottom detection in the modal could be brittle (depends on content height). Mitigated: use a ref + scroll listener on the `<pre>` element; assert `scrollTop + clientHeight >= scrollHeight - 1` (1px tolerance). Tested with jsdom by mocking `scrollHeight` directly.
  - **R5-C**: The grant modal opens after revoke (per Art. IX FR-053, privacy must be read again — revoked consent cannot be silently re-granted). Mitigated: revoke does NOT open the modal; grant always does. Documented in component copy.
- **Dependencies**: **PR4** (consumes `<ConsentSectionSlot>`).
- **Acceptance criteria**:
  - **Given** an authenticated user is on `/cuenta`, **When** the page renders, **Then** `<ConsentPanel>` shows two rows: "Funcional" (essential — cannot be revoked) + "Analytics" (opt-in).
  - **Given** the user clicks "Otorgar" on Analytics, **When** the modal opens, **Then** the modal shows the privacy policy v3 in a scrollable region, a checkbox "He leído la política de privacidad v3", and a disabled confirm button.
  - **Given** the user scrolls to the bottom and ticks the checkbox, **When** the confirm button is enabled, **Then** clicking it calls `grantConsent("analytics")`, closes the modal, and updates the row's state to "Otorgado".
  - **Given** the backend returns 429, **When** the modal submit is clicked, **Then** an inline error appears with "Demasiadas solicitudes. Reintentá en N segundos." and the modal stays open.
- **Constitution articles touched**: **Art. III** (privacy-before-consent gate), **Art. IV** (honest copy: "Otorgar consentimiento" not "Acepto todo"), **Art. V** (rate-limit UX), **Art. IX** (FR-053: privacy read before grant).

---

### PR6 — Web: ARCO request flow

- **Repo affected**: `BuildCv-web/`
- **Objective**: Build the ARCO (Access, Rectify, Cancel) UI on top of the `<ArcoSectionSlot>` from PR4. Ships the type-email-to-confirm modal for the irreversible Cancel action.
- **Files touched**:
  - **Modified**: `lib/api/user-data.ts` (+~40 LOC: `rectifyUserData({email?, name?})`, `deleteUserData()`).
  - **Modified**: `app/api/user/data/route.ts` (+~50 LOC: PUT handler calls `BACKEND_URL/api/v1/user/data` with `{email?, name?}`; DELETE handler calls `BACKEND_URL/api/v1/user/data`).
  - **New**: `lib/use-arco.ts` (~50 LOC): hook `{userData, rectify, delete: {trigger, confirm, cancel}, error, isLoading, rateLimitRetryAt}`.
  - **New**: `components/account/arco-panel.tsx` (~100 LOC): three sections.
    - **Access**: "Ver mis datos" button → fetches and renders the `UserDataResponse` JSON in a `<details>` (collapsed by default).
    - **Rectify**: editable name + email form, "Guardar cambios" button, success toast, error mapping (400 → "Revisá el formato", 429 → "Demasiados intentos, esperá N segundos").
    - **Cancel**: red "Eliminar mi cuenta" button. Opens `<ArcoCancelModal>`.
  - **New**: `components/account/arco-cancel-modal.tsx` (~80 LOC): native `<dialog>`. Copy: "Vas a eliminar tu perfil y todos tus consentimientos. Las facturas ya emitidas se conservan por ley. Esta acción no se puede deshacer." Includes **type-email-to-confirm** input. Delete button enables only when input === `user.email`. On confirm → calls `deleteUserData()` + auto-sign-out (via PR2's `signOutAndClear()`).
  - **Modified**: `app/cuenta/page.tsx` (+~5 LOC: render `<ArcoPanel>` inside `<ArcoSectionSlot>`).
  - **Modified**: `lib/copy/es.ts` (+~30 LOC: `copy.arco.sections.*`, `copy.arco.cancel.*`).
  - **Modified**: `__tests__/lib/api/user-data.test.ts` (+~30 LOC, +2 tests): rectify success, delete success).
  - **New**: `__tests__/lib/use-arco.test.ts` (~50 LOC, ~2 tests): initial state, rectify updates state.
  - **New**: `__tests__/components/account/arco-panel.test.tsx` (~100 LOC, ~4 tests): renders three sections, rectify shows success toast, delete opens modal, access expands `<details>`.
  - **New**: `__tests__/components/account/arco-cancel-modal.test.tsx` (~80 LOC, ~3 tests): button disabled until email matches, success calls `deleteUserData` + `signOutAndClear`, cancel closes modal.
  - **New**: `__tests__/lib/api/user-data.test.ts` (+~20 LOC, +1 test): rectify 400 maps to friendly error.
- **LOC estimate**: 250–350 LOC (midpoint ~300; upper bound 350)
- **Tests expected**: ~12 (2 + 2 + 4 + 3 + 1)
- **Risks specific to PR6**:
  - **R6-A**: PR6 is at the upper 350-LOC budget. **If implementation exceeds 350, split into PR6a (Access + Rectify + BFF PUT, ~200 LOC) + PR6b (Cancel + type-email modal + BFF DELETE + auto-sign-out, ~150 LOC)**. The split is mechanical — Cancel depends on the hook from PR6a only.
  - **R6-B**: Auto-sign-out on Cancel must clear the NextAuth cookie AND the BFF cache AND revoke the backend tokens. Three calls in sequence. Mitigated: reuse PR2's `signOutAndClear()` — single source of truth.
  - **R6-C**: Rectify on `email` could orphan the NextAuth session if the email changes (NextAuth encodes the old email in the JWT). Mitigated: after rectify success, call `signOutAndClear()` and redirect to `/auth/signin` so the user re-auths with the new email. Documented in component copy.
- **Dependencies**: **PR4** (consumes `<ArcoSectionSlot>`) + **PR2** (reuses `signOutAndClear()` for auto-sign-out on Cancel).
- **Acceptance criteria**:
  - **Given** an authenticated user is on `/cuenta`, **When** the page renders, **Then** `<ArcoPanel>` shows three rows: "Ver mis datos", "Rectificar datos", "Eliminar mi cuenta".
  - **Given** the user clicks "Ver mis datos", **When** the row expands, **Then** the JSON response from `GET /user/data` is rendered in a `<details>` (collapsed by default, expanded on click).
  - **Given** the user edits name in the rectify form, **When** they click "Guardar cambios", **Then** the backend is called, a success toast appears, and the page reflects the new name.
  - **Given** the user clicks "Eliminar mi cuenta", **When** the modal opens, **Then** copy says "Vas a eliminar tu perfil y todos tus consentimientos. Las facturas ya emitidas se conservan por ley. Esta acción no se puede deshacer." The confirm input is required (button disabled until `input === user.email`).
  - **Given** the user types the matching email and confirms, **When** the modal submits, **Then** `deleteUserData()` runs, `signOutAndClear()` runs, and the user lands on `/` with all cookies cleared.
- **Constitution articles touched**: **Art. III** (ARCO rights fully accessible), **Art. IV** (honest copy about what gets deleted and what stays), **Art. V** (type-email double-confirmation), **Art. IX** (FR-052: ARCO Access/rectify/cancel complete).

---

### PR7 — Web: `<UserMenu>` component (header + sign-out wiring)

- **Repo affected**: `BuildCv-web/`
- **Objective**: Surface the auth state in the header via a `<UserMenu>` rendered into the existing `<HeaderExtras>` slot (per 019 REQ-NAV-PILL). The menu shows avatar initial + email + a native `<dialog>` dropdown with "Mi cuenta" + "Cerrar sesión" (wired to PR2's `signOutAndClear()`).
- **Files touched**:
  - **New**: `lib/use-user-menu.ts` (~50 LOC): wraps `useSession()` from `next-auth/react`. Exposes `{status: 'loading'|'authenticated'|'unauthenticated', user: {email, name}, signOutAndClear}`.
  - **New**: `components/header/user-menu.tsx` (~80 LOC): presentational. Loading state: skeleton `<div className="min-h-16" />` (no layout shift — Art. VII). Authenticated: avatar initial + email + `<button aria-expanded aria-controls>` trigger + native `<dialog>` with "Mi cuenta" link (`/cuenta`) + "Cerrar sesión" button (calls `signOutAndClear` from PR2). Unauthenticated: `<a href="/auth/signin">Iniciar sesión</a>` button. WCAG: focus trap (native `<dialog>`), Esc closes, focus returns to trigger, arrow-key navigation inside menu (`role="menu"`, `role="menuitem"`). **Skips entirely when `IS_LOCAL === true`** (Art. VII).
  - **Modified**: `app/layout.tsx` (+~5 LOC: pass `<UserMenu>` as `<SiteHeader extras>`).
  - **Modified**: `components/landing/landing-nav.tsx` (+~10 LOC: hide the "Cuenta" nav item when `useSession().status === 'authenticated'`; the `<UserMenu>` replaces it).
  - **Modified**: `lib/copy/es.ts` (+~10 LOC: `copy.userMenu.*`).
  - **New**: `__tests__/lib/use-user-menu.test.ts` (~50 LOC, ~3 tests): loading state, authenticated state, unauthenticated state.
  - **New**: `__tests__/components/header/user-menu.test.tsx` (~100 LOC, ~4 tests): renders avatar + email, dropdown opens, sign-out calls `signOutAndClear`, "Mi cuenta" links to `/cuenta`.
  - **New**: `__tests__/local-mode-skips-user-menu.test.tsx` (~30 LOC, ~1 test): local-mode build renders `<UserMenu>` as `null`.
- **LOC estimate**: 150–200 LOC (midpoint ~175)
- **Tests expected**: ~8 (3 + 4 + 1)
- **Risks specific to PR7**:
  - **R7-A**: `<LandingNav>` reads `useSession()`, which makes it non-pure-presentational. Mitigated: the read is gated behind a client component boundary (`'use client'` directive), and the 019 REQ-NAV-PILL invariant is preserved via a small `useSessionStatus()` wrapper that lives in `lib/use-user-menu.ts` (not in `<LandingNav>` itself). The `<LandingNav>` test snapshot updates in this PR.
  - **R7-B**: `useSession()` race on initial render returns `{status: 'loading'}`. Mitigated: the skeleton uses `min-h-16` to reserve space (no CLS). Documented in component header comment.
- **Dependencies**: **PR2** (consumes `signOutAndClear`).
- **Acceptance criteria**:
  - **Given** an authenticated user is on any route, **When** `<SiteHeader>` renders, **Then** `<UserMenu>` shows the avatar initial + email, and clicking it opens a `<dialog>` with "Mi cuenta" + "Cerrar sesión".
  - **Given** an anonymous user is on any route, **When** `<SiteHeader>` renders, **Then** `<UserMenu>` shows "Iniciar sesión" linking to `/auth/signin`, and the `<LandingNav>` "Cuenta" item is hidden.
  - **Given** `IS_LOCAL === true`, **When** `<SiteHeader>` renders, **Then** `<UserMenu>` renders `null` (no flicker, no placeholder).
  - **Given** the user clicks "Cerrar sesión", **When** the button activates, **Then** `signOutAndClear()` runs (per PR2): NextAuth cookie cleared, BFF logout called, JWT cache cleared.
- **Constitution articles touched**: **Art. III** (no PII in the avatar — initial only, no photo), **Art. VI** (consumes `<HeaderExtras>` slot — doesn't mutate `<LandingNav>` contract), **Art. VII** (local-mode skip + `min-h-16` no-CLS).

---

### PR8 — Web: E2E + accessibility hardening

- **Repo affected**: `BuildCv-web/`
- **Objective**: Ship the full end-to-end Playwright suite + `@axe-core/playwright` accessibility audits + Lighthouse gates. Final hardening pass before the change is archiveable.
- **Files touched**:
  - **New**: `e2e/account-flow.spec.ts` (~120 LOC, ~6 scenarios): sign in via mock NextAuth cookie → land on `/cuenta` → grant analytics consent → revoke functional consent → view user data via ARCO Access → rectify name → open ARCO Cancel modal → type wrong email (button disabled) → type correct email (button enabled) → confirm → land on `/` with cookies cleared.
  - **New**: `e2e/privacy-policy.spec.ts` (~50 LOC, ~3 scenarios): `/privacidad` renders v3 by default, selector switches to v2, anonymous access works (no auth gate).
  - **New**: `e2e/user-menu.spec.ts` (~50 LOC, ~3 scenarios): authenticated header shows `<UserMenu>`, dropdown opens to native `<dialog>`, sign-out clears NextAuth cookie + BFF cache.
  - **New**: `e2e/a11y-flow.spec.ts` (~80 LOC, ~3 scenarios): Lighthouse Accessibility ≥ 95 on `/cuenta`, `/privacidad`, `/auth/signin` via `@axe-core/playwright`.
  - **Modified**: `e2e/auth-flow.spec.ts` (+~20 LOC, +2 scenarios: privacy policy renders v3, rate-limit UX on 429 shows `Retry-After` timestamp).
  - **New**: `__tests__/e2e/rate-limit-ux.test.ts` (~30 LOC, ~1 unit test for the inline error component — 429 from BFF renders "Demasiadas solicitudes. Reintentá en DATE." copy).
- **LOC estimate**: 200–300 LOC (midpoint ~250)
- **Tests expected**: ~15 (6 + 3 + 3 + 3 + 2 = 17 scenarios; ~15 net-new if 2 are absorbed into existing specs)
- **Risks specific to PR8**:
  - **R8-A**: E2E spec files can balloon. Mitigated: split into 4 spec files (`account-flow`, `privacy-policy`, `user-menu`, `a11y-flow`) — each ≤120 LOC. **If any exceeds 120 LOC during implementation, split further into `*-2.spec.ts` files**.
  - **R8-B**: Lighthouse Accessibility ≥ 95 is a hard gate. If the in-app dialog/select components regress a11y (e.g., from PR5/PR6 changes), the build fails. Mitigated: PR5/PR6 include their own a11y unit tests; PR8's audit is a final safety net.
  - **R8-C**: OAuth e2e remains flaky in CI (real OAuth requires network + provider interaction). Mitigated: PR8 uses the same cookie-injection pattern as `e2e/auth-flow.spec.ts` (existing) — no real provider dance.
- **Dependencies**: **PR0–PR7** (full chain).
- **Acceptance criteria**:
  - **Given** `pnpm test:e2e` runs, **When** all 4 e2e specs execute, **Then** all 15+ scenarios pass.
  - **Given** `@axe-core/playwright` audits `/cuenta`, `/privacidad`, `/auth/signin`, **When** the audit completes, **Then** no `serious` or `critical` violations are reported.
  - **Given** Lighthouse audits the same 3 routes, **When** the audit completes, **Then** the Accessibility score is ≥ 95 on each.
  - **Given** a `429` response from the BFF, **When** the affected component renders, **Then** the inline error shows "Demasiadas solicitudes. Reintentá en <formatted Retry-After date>." (not "intenta más tarde").
- **Constitution articles touched**: **Art. VIII** (e2e + a11y gates), **Art. VII** (a11y audit confirms WCAG 2.2 AA), **Art. IV** (rate-limit UX is honest, not aspirational).

---

## 5. Success criteria

- [ ] All 11 missing capabilities ship and pass Vitest + Playwright in CI.
- [ ] `/api/v1/auth/web-signup` exists in backend (PR0); `lib/auth.ts` no longer posts the broken contract (PR1).
- [ ] `POST /api/v1/auth/logout` accepts bearer-only and revokes all refresh tokens for the user (PR0, verified by integration test).
- [ ] `/privacidad` renders v1, v2, v3 via `<select>` with `version=` query-param routing. Default = v3 (PR3).
- [ ] `/cuenta` requires auth; anonymous → redirect to `/auth/signin?callbackUrl=/cuenta` (PR4).
- [ ] Consent UI shows `functional` and `analytics` purposes with grant/revoke. Privacy-policy-read + checkbox gate before grant (PR5).
- [ ] ARCO Access shows the JSON; ARCO Rectify updates name/email with error mapping; ARCO Cancel requires type-email-to-confirm and triggers full sign-out (PR6).
- [ ] `<UserMenu>` shows on all routes when authenticated, hides in local mode, dropdown uses native `<dialog>` with WCAG 2.2 AA keyboard navigation (PR7).
- [ ] E2E suite covers sign-in → /cuenta → consent → ARCO → sign-out; Lighthouse Accessibility ≥ 95 on /cuenta, /privacidad, /auth/signin (PR8).
- [ ] Zero suppressions: no `// @ts-ignore`, no `it.skip`, no `vi.skip`. Every failing test gets fixed.
- [ ] `pnpm lint` + `pnpm build` + `pnpm test` + `pnpm test:e2e` green. Backend `dotnet build BuildCv.slnx -c Release` + `dotnet test` green for PR0.
- [ ] Copy for ARCO delete explicitly says "se eliminará tu perfil y tus consentimientos. Las facturas ya emitidas se conservan por ley" (Art. IV honesty).
- [ ] No new `localStorage` / `IndexedDB` / cookies beyond what 006-web-cv-editor already uses.
- [ ] Local mode (`NEXT_PUBLIC_LOCAL_MODE=true`) skips all new auth UI, verified by Vitest (PR7).
- [ ] Coverage ≥ 90% on new web code (`pnpm test:cov`); backend PR0 keeps existing ≥ 90%.
- [ ] Each PR is ≤350 LOC and ships green in isolation.

---

## 6. Constitution compliance

| Article | Compliance evidence (per PR) |
|---|---|
| **Art. III — Privacidad primero** | (a) No new server-side persistence on web (BFF cache stays in-memory per Node process). (b) No new `localStorage` / `IndexedDB` / cookies. (c) `/cuenta` does NOT log email/name; verified by Vitest asserting no PII in `console.error` (PR4). (d) Privacy policy accessible BEFORE consent grant (modal gate, PR5). (e) Backend in-memory caveat documented in `/cuenta` footer ("Tu cuenta se guarda en memoria durante esta sesión de desarrollo"). (f) PR0 bearer-only logout = real revocation. |
| **Art. IV — Encuadre honesto** | (a) All new copy through `lib/copy/es.ts` under `copy.{account,consent,arco,privacy,userMenu,auth}.*`. (b) ARCO delete copy explicit about what gets deleted and what stays (PR6). (c) Signin error mapping: `OAuthCallback` → "No pudimos completar el inicio de sesión con el proveedor. Probá de nuevo." (PR1). (d) No "garantizado", "perfecto", "100% seguro" anywhere. (e) Privacy-policy selector surfaces ALL three versions, not just the latest — transparency over marketing (PR3). (f) Rate-limit UX is honest: timestamp, not "intenta más tarde" (PR8). |
| **Art. V — Entrada como dato** | (a) Backend's privacy-policy content is hardcoded markdown, no user input flows through it (PR3). (b) OAuth `state` parameter is server-generated by NextAuth (CSRF protection built-in, PR1). (c) Anti-brute-force: backend enforces `auth` 30/min/IP + `consent` 10/min/IP. Web surfaces `Retry-After` to user inline (PR5/PR6/PR8). (d) ARCO delete double-confirmation via type-email (PR6). |
| **Art. VI — Clean Architecture (frontend)** | (a) New BFF modules are ports: `lib/api/{user-data,consent,privacy,auth-adapter}.ts` expose typed functions, no direct `fetch` from components (PR1–PR6). (b) Components stay presentational; state lives in hooks (`useUserMenu`, `useConsent`, `useArco`). (c) No new third-party UI library (native `<dialog>`). (d) `<LandingNav>` stays dumb presentational (per 019 REQ-NAV-PILL) — `<UserMenu>` lives in `<HeaderExtras>` slot, not inside the nav (PR7). |
| **Art. VII — v0 sin fricción** | (a) Local-mode bypass: Vitest asserts local-mode build never renders `<UserMenu>` and never redirects to `/auth/signin` (PR7). (b) No new gate, no new step — `/analizar` and `/importar` remain accessible without auth. (c) Rate-limit error UX is non-blocking (inline message with retry timestamp, PR8). (d) Sign-out is best-effort, never blocks the user (PR2). |
| **Art. VIII — TDD** | (a) Every new component ships with co-located Vitest tests BEFORE implementation (red-green-refactor). (b) Every new BFF route handler ships with a Vitest test mocking `global.fetch`. (c) `e2e/account-flow.spec.ts` covers full sign-in → /cuenta → consent → ARCO → sign-out (PR8). (d) 0 suppressions (`it.skip`, `vi.skip`, `# type: ignore`, etc.). (e) `work-unit-commits` skill convention: each PR is split into test-first + impl + format commits. |
| **Art. IX — Habeas Data** | (a) Privacy policy accessible before consent grant (modal gate, PR5). (b) Consent grants are explicit (checkbox after scroll-to-bottom, PR5). (c) ARCO Access shows the data; Rectify edits with success confirmation; Cancel is irreversible but type-email-confirmed (PR6). (d) Opposition = revoke (no separate endpoint, handled by revoke consent UI, PR5). (e) Backend audit log writes server-side on every consent + ARCO op; web confirms success. (f) After ARCO Cancel, user is auto-signed-out and BFF cache cleared (PR6 + PR2). |

---

## 7. Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| **1** | **PR0 + PR1 are an atomic cross-repo change.** If PR0 lands but PR1 is delayed, the web has no backend endpoint to call. If PR0 is reverted, PR1 (and downstream) must follow. | Med | Chain strategy `feature-branch-chain` keeps PR1 PR'd against PR0's branch; final merges to `main` are sequential. Document in PR0's PR description. |
| **2** | **PR4 `/cuenta` skeleton + PR5/PR6 integration coupling.** PR5 and PR6 both modify `app/cuenta/page.tsx` to inject their panel into the slots. If both ship in the same chain merge, diff conflicts are possible. | Med | PR4 commits to a stable slot structure (`<ConsentSectionSlot>`, `<ArcoSectionSlot>`). PR5 and PR6 each touch exactly ONE slot + ~5 LOC in the page file. Diff is non-overlapping. |
| **3** | **PR5 at 350-LOC upper bound.** Consent panel + grant modal + 2 BFFs + hook + 4 test files = bulky. | Med | Split path defined: **PR5a (panel + BFFs + hook, ~200 LOC) + PR5b (consent-grant modal, ~150 LOC)** if implementation exceeds 350. Same for PR6 (see #4). |
| **4** | **PR6 at 350-LOC upper bound.** ARCO panel with 3 sections + cancel modal + BFF PUT/DELETE + auto-sign-out + 4 test files = heaviest single PR. | Med | Split path defined: **PR6a (Access + Rectify + BFF PUT, ~200 LOC) + PR6b (Cancel + type-email modal + BFF DELETE + auto-sign-out, ~150 LOC)** if implementation exceeds 350. |
| **5** | **PR8 e2e spec density.** 15+ scenarios across 4 spec files is dense. | Low | Split path defined: each spec ≤120 LOC; if any exceeds, split into `*-2.spec.ts`. |
| **6** | **Q1=B backend coupling** (already mitigated in original proposal). `IRefreshTokenStore` lacks `RevokeAllForUserAsync` — adding it requires interface change + 2 implementations. | Low | All in PR0 (~30 LOC production + ~20 LOC tests). Single atomic backend PR. |
| **7** | **ARCO delete is irreversible.** In-memory backend wipes the user record. Even with type-email confirm, an accidental click on a shared device is a hard loss. | Med | (a) Type-email-to-confirm gate (PR6). (b) Backend already has `AnonymizeAsync` (DIAN compliance path) — but Cancel uses `DeleteAsync` (full delete). Document this in `/cuenta` copy: "Esta acción no se puede deshacer." (PR6) (c) When 010-persistence lands, Cancel becomes anonymize + cascade-delete with audit-log preservation. Flag as deferred work. |
| **8** | **WCAG 2.2 AA dropdown surface area.** Native `<dialog>` for `<UserMenu>` (PR7), ARCO confirm modal (PR6), and privacy version selector (PR3). Focus management, arrow-key nav, Esc-to-close all need explicit testing. | Med | (a) Accessibility skill (`~/.config/opencode/skills/accessibility/SKILL.md`) consulted at spec phase. (b) Vitest covers keyboard interaction per dialog. (c) Lighthouse + `@axe-core/playwright` in PR8 e2e suite (gate ≥ 95). |
| **9** | **Privacy policy v3 already ships in backend** (verified at `PrivacyPolicyQueryHandler.cs:61-104`). Q3=A is achievable with zero backend change. | n/a | n/a — confirmed during exploration. Web PR3 fetches v3 directly. |
| **10** | **Two OAuth client credential sets per environment** (web + backend each need Google/LinkedIn). Redirect URI mismatch risk. | Med | Document in `BuildCv-api/docs/quickstart.md` (cross-link from web's `.env.example`). PR1 PR description calls this out. |
| **11** | **Backend's `InMemoryUserDataStore` wipes on restart.** Production-unsuitable. Web's NextAuth cookie survives 7 days but on next BFF call backend returns 401 → user silently signed out. | Med | (a) Footer on `/cuenta`: "Tu cuenta se guarda en memoria durante esta sesión de desarrollo." (PR4). (b) Vitest asserts the silent-sign-out path. (c) Follow-up: 010-persistence. |
| **12** | **OAuth e2e is flaky in CI.** Real OAuth requires network + browser interaction with provider. | Med | (a) Existing pattern: cookie-injection via `next-auth/jwt` (used by `e2e/auth-flow.spec.ts`). (b) PR8 e2e follows same pattern (no real provider dance). (c) One Playwright test mocks the backend `/auth/session` and asserts `/cuenta` flow after cookie set — fully hermetic. |
| **13** | **In-memory refresh-token store: revocation after restart is automatic.** Even if the user "logs out", the refresh token is lost on backend restart anyway. Production rollout semantics differ. | Low | Document in `/cuenta` footer (PR4). Web calls `/api/v1/auth/logout` regardless — when persistence lands, the call has real effect. |
| **14** | **`useSession()` race on initial render.** Client components see `{status: 'loading'}` on first paint → layout shift if `<UserMenu>` is not pre-sized. | Low | Reserve `min-h-16` on the wrapper skeleton (matches existing 019 pattern in `<SiteHeader>`). PR7. |
| **15** | **PR5 consent-grant modal scroll-to-bottom detection.** Depends on content height + jsdom mocking `scrollHeight`. | Low | Use ref + scroll listener; assert `scrollTop + clientHeight >= scrollHeight - 1` (1px tolerance). Mock `scrollHeight` in jsdom tests. |
| **16** | **PR6 ARCO rectify changes the email in the backend but NextAuth cookie still has the old email.** Stale-session edge case. | Med | After rectify success, call `signOutAndClear()` and redirect to `/auth/signin`. Documented in PR6 component copy. |

---

## 8. Non-goals

Explicitly NOT in this change:

- **Password auth** (email + password) — deferred to v0.6+.
- **SMS-based 2FA** — deferred to v0.7+ (requires Twilio integration, out of scope).
- **Email magic-link** — deferred to 022-email-magic-link if added.
- **Backend persistence (010-persistence)** — `InMemoryUserDataStore` stays in-memory; EF Core migration deferred.
- **Refresh-token rotation on the web** — backend already rotates; web doesn't touch refresh tokens.
- **Auto-refresh on BFF 401** — exploration noted the cache staleness risk (item #5). Defer to v0.6: surface 401 to the client and let `<UserMenu>` re-render with `unauthenticated` state.
- **Multi-account linking** — one OAuth provider per user account. Linking deferred to v1.
- **Account recovery flows** — no "forgot password" (no passwords); no "lost OAuth access". Deferred.
- **Webhook signing for OAuth** — out of scope; NextAuth handles state.
- **Web analytics for auth events** — Art. III forbids, deferred to v1 if ever.
- **Local-mode OAuth bypass hardening** — local mode already works (009-auth ships with `LocalAuthMiddleware`); 009-auth-web only verifies it stays working (PR7).
- **`<UserMenu>` on mobile native-app wrapper** — web-only PWA, no native shell.
- **Privacy policy v4 / i18n** — Spanish only; future versions are backend's call.
- **Further PR splitting (PR5a/5b, PR6a/6b)** — only triggered if implementation exceeds the 350-LOC cap. Forecasted splits documented in §4 Risks for each PR.

---

## Backend changes summary (PR0 only)

> **Total backend touchup**: ~100 LOC production + ~70 LOC tests, **1 atomic backend PR** shipped before PR1 (web).

| Backend change | LOC | Why |
|---|---|---|
| New endpoint `POST /api/v1/auth/web-signup` | ~30 + ~50 tests | Contract drift fix — web's `events.signIn` callback needs a backend endpoint that accepts the NextAuth user shape. Reuses existing `IUserDataService.GetOrCreateAsync`. |
| New `IRefreshTokenStore.RevokeAllForUserAsync(Guid)` | ~25 + ~20 tests | Q1=B requires bearer-only revocation. InMemory + EF Core implementations. |
| Modify `POST /api/v1/auth/logout` to accept optional body | ~15 + ~30 tests | Same Q1=B. `LogoutHandler` falls back to JWT `sub` claim when no refresh token. |
| Make `RefreshTokenRequest.RefreshToken` nullable | ~5 | Type-safe optional body. |
| New `WebSignupRequest` record | ~5 | Contract DTO. |

**No backend changes needed for**:
- Privacy policy v3 (already ships).
- Consent endpoints (already shipped).
- ARCO endpoints (already shipped).
- OAuth providers (already shipped).
- `NextAuthJwtValidator` (no lazy-create — the new `/web-signup` endpoint handles user creation cleanly).

---

## Decomposition rationale

The original 5-PR plan (proposed in sdd-propose first pass, documented in engram topic `sdd/009-auth-web/proposal`) had PR3 (`/cuenta` + consent) and PR4 (ARCO) at the **upper 400-LOC limit** — exactly at the review budget with **zero margin**. PR5 (`<UserMenu>` + e2e) combined two unrelated concerns.

The refined 9-PR decomposition addresses this by:

1. **Splitting backend prep (PR0) from web adapter (PR1).** Cross-repo atomicity is preserved by the `feature-branch-chain` strategy: PR1 targets PR0's branch, both merge together. This makes the backend change reviewable as a single atomic PR while keeping the web adapter PR clean of backend diff noise.

2. **Splitting auth adapter (PR1) from session helpers (PR2).** PR1 owns the contract bridge (the broken `lib/auth.ts:46`); PR2 owns the lifecycle helpers (`signOutAndClear`, BFF logout). Independent failures, independent review.

3. **Splitting `/cuenta` skeleton (PR4) from consent (PR5) and ARCO (PR6).** PR4 commits to a stable three-slot structure (`#datos-personales`, `#consent`, `#arco`). PR5 fills `<ConsentSectionSlot>`, PR6 fills `<ArcoSectionSlot>`. The diffs are non-overlapping — no merge conflict at the page file.

4. **Isolating `<UserMenu>` (PR7).** The user menu is the highest-stakes a11y surface (native `<dialog>`, focus trap, Esc, arrow keys, local-mode skip). PR7 owns it in isolation, with PR8's a11y audit as the safety net.

5. **Parking e2e + a11y hardening (PR8) at the end.** Each upstream PR ships with co-located unit tests; PR8 wires them into a full e2e + Lighthouse audit gate. The split keeps every functional PR focused on product, not on test infrastructure.

**Why not 10+ PRs?** PR5 (consent) and PR6 (ARCO) are already at the 350-LOC cap. Splitting them further would land ~150-LOC PRs that depend on a shared hook (`useConsent` / `useArco`) — the marginal LOC saved is <50 per PR while the marginal coordination cost (more chains, more `main` merges) is high. The compromise: keep the forecast at 9 PRs with **explicit split paths defined in §4 Risks for PR5 and PR6** if implementation exceeds 350 LOC.

---

## References

- **Exploration (this change)**: `BuildCv-web/specs/009-auth-web/exploration.md` (376 lines, 7 open clarifications resolved)
- **Backend 009-auth spec**: `BuildCv-api/specs/009-auth/spec.md` (132 lines)
- **Backend canonical endpoints**: `BuildCv-api/src/BuildCv.Api/Endpoints/{AuthEndpoints,SessionEndpoint,UserDataEndpoints,PrivacyEndpoints}.cs`
- **Backend ports we'll reuse**: `BuildCv.Application/Features/Auth/IUserDataService.cs:8` (`GetOrCreateAsync` exists), `BuildCv.Application/Features/Auth/IRefreshTokenStore.cs` (new method added in PR0)
- **Backend privacy policy v3**: `BuildCv.Application/Features/Consent/PrivacyPolicyQueryHandler.cs:61-104` (already shipped)
- **Web existing scaffolding**: `BuildCv-web/lib/auth.ts`, `BuildCv-web/lib/api/jwt.ts`, `BuildCv-web/app/auth/signin/page.tsx`, `BuildCv-web/__tests__/lib/auth.test.ts`, `BuildCv-web/e2e/auth-flow.spec.ts`
- **Spec format references**: `BuildCv-web/specs/019-navigation-onboarding/proposal.md` (chain-PR format), `BuildCv-web/specs/006-web-cv-editor/spec.md` (Constitution table)
- **Constitution**: `BuildCv-api/.specify/memory/constitution.md` v1.2.0 (Art. I–IX)
- **Accessibility skill**: `~/.config/opencode/skills/accessibility/SKILL.md`
- **Frontend-design skill**: `BuildCv-web/.agents/skills/frontend-design/SKILL.md`
- **Work-unit-commits skill**: `BuildCv-web/.agents/skills/work-unit-commits/SKILL.md` (and the user-level equivalent)

---

## Next

→ **`sdd-spec`** — write `spec.md` following the 019 REQ/NFR/Compliance pattern: 16+ requirements with Given/When/Then scenarios, mapped to Constitution articles. Each PR's acceptance criteria (above) become seed material for the REQs. PR0's REQs land in a `009-auth-api` capability (cross-repo delta); PR1–PR8's REQs land in a `009-auth-web` capability (new spec).

Then `sdd-design` → component contracts finalized (`<UserMenu>`, `<ConsentPanel>`, `<ArcoPanel>`, `<ConsentGrantModal>`, `<ArcoCancelModal>`, `<PrivacyPolicyView>`), prop interfaces, copy key schema, Playwright selector conventions.

Then `sdd-tasks` → forecast per-PR work units (5–6 commits each), lock the 9-PR chain, recommend the merge order.

Then `sdd-apply` → 9 chained PRs (PR0 first, then PR1–PR8), each green, each mergeable.

Then `sdd-verify` → all gates green + 88+ new tests + Lighthouse ≥ 95 + 0 suppressions.

Then `sdd-archive` → sync delta specs + tag `009-auth-web-v1.0`.