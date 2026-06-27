# Spec: 009-auth-web — Integrate backend 009-auth into BuildCv-web

**Feature**: 009-auth-web
**Hito**: v0.5.1
**Status**: [Spec] — Pending design
**Created**: 2026-06-26
**Proposal**: [./proposal.md](./proposal.md) (9 PRs locked, 6 product decisions locked)
**Exploration**: [./exploration.md](./exploration.md)
**Backend counterpart (shipped, contract drift resolved)**: `BuildCv-api/specs/009-auth/spec.md`
**Constitution**: `BuildCv-api/.specify/memory/constitution.md` v1.2.0 (ley suprema)
**Spec format reference**: [../019-navigation-onboarding/spec.md](../019-navigation-onboarding/spec.md) (REQ/NFR/Compliance pattern)

> **CROSS-REPO change.** Touches both `BuildCv-web/` (PR1–PR8) and `BuildCv-api/` (PR0). The 9-PR chain strategy is `feature-branch-chain`: each PR targets the previous PR's branch; final merges to `main` are sequential. PR0 is the chain root.

> **⚠ Contract drift, resolved by PR0/PR1.** The web's current `lib/auth.ts:46` POSTs `{providerId,email,name}` to `/api/v1/auth/${provider}/callback` — the backend's SHIPPED endpoint is `/api/v1/auth/${provider}` accepting `{code, state}`. Resolution: PR0 introduces a new endpoint `POST /api/v1/auth/web-signup` accepting `{provider, providerAccountId, email, name}` that reuses `IUserDataService.GetOrCreateAsync`; PR1 fixes the web to call it. Spec reflects the SHIPPED path. See §"Risks" → "Contract drift".

> **⚠ Consent path drift, resolved by spec.** Backend contract docs say `/user/consent`; shipped code (`UserDataEndpoints.cs:88,114`) is `/user/data/consent`. This spec uses the SHIPPED path everywhere.

---

## Overview

Make `BuildCv-web` a real consumer of the shipped backend `009-auth` (12 endpoints, in-memory, 290 tests). Users can sign in with Google or LinkedIn via NextAuth, exercise Habeas Data rights (consent grant/revoke, ARCO access/rectify/cancel) on `/cuenta`, read the privacy policy at `/privacidad` with a v1/v2/v3 selector, see an auth-aware `<UserMenu>` in the header, and sign out with full server-side token revocation. All through the same BFF same-origin port pattern (`app/api/*` → `BACKEND_URL/api/v1/*`). Zero new dependencies. Zero new persistence on the web. Local mode (`NEXT_PUBLIC_LOCAL_MODE=true`) keeps skipping all auth UI per Art. VII.

---

## Scope

1. Working OAuth callback that creates/updates the backend user via the new `/auth/web-signup` endpoint (fixes contract drift).
2. Sign-out with full backend revocation (bearer-only, revoke-all-for-user).
3. `/cuenta` account page (auth-gated) with three sections: Datos personales, Consentimientos, Derechos ARCO.
4. Consent grant/revoke UI per data-processing purpose (`functional`, `analytics`), with privacy-policy-read + checkbox gate before grant.
5. ARCO Access (view JSON), Rectify (edit name/email), Cancel (type-email-to-confirm + auto-sign-out).
6. `/privacidad` public page with v1/v2/v3 version selector (dropdown, default = v3).
7. `<UserMenu>` component (avatar initial + dropdown via native `<dialog>`) wired into `<SiteHeader>` `<HeaderExtras>` slot from 019.
8. Route guard: `/cuenta` anonymous → `/auth/signin?callbackUrl=/cuenta`.
9. Rate-limit UX: inline error surfacing `Retry-After` on 429 (Art. IV honesty).
10. Local-mode bypass for all new auth UI (Art. VII).
11. E2E + accessibility hardening (Lighthouse ≥ 95, `@axe-core/playwright`, no critical/serious violations).

---

## Out of Scope

- Password auth, SMS 2FA, email magic-link (deferred to v0.6+ / 022-email-magic-link).
- Backend persistence — `InMemoryUserDataStore` stays in-memory; 010-persistence ships later. Caveat documented in `/cuenta` footer.
- Auto-refresh on BFF 401 (defer to v0.6: surface 401 to client and let `<UserMenu>` re-render with `unauthenticated` state).
- Real OAuth provider dance in Playwright e2e (cookie-injection pattern remains; no real Google/LinkedIn round-trip in CI).
- Lazy-create in `NextAuthJwtValidator` (web uses new `/auth/web-signup` endpoint instead; backend validator contract stays clean).

---

## Assumptions

- `NEXT_PUBLIC_LOCAL_MODE=true` and backend `LocalAuth:Enabled=true` are set together in dev (existing `docs/local-setup.md` contract, unchanged).
- Backend 009-auth remains in-memory in v0.5.1 — every backend restart wipes every user. `/cuenta` footer says so.
- Backend publishes an OpenAPI spec at `/scalar/v1` (already exists). PR1's CI step validates the web's BFF typed wrappers against it before build (NFR-XREPO-1).
- Cross-repo PR chain: PR0 (api) → PR1 → PR2 → PR3 (web, on PR1's branch). PR4 targets PR2's branch. PR5/PR6 target PR4's branch. PR7 targets PR2's branch. PR8 targets the last-merged branch on `main`. Documentation in each PR's description.
- 019's `<HeaderExtras>` slot exists; PR7 only wires into it (no `<LandingNav>` mutation beyond hiding the `Cuenta` link when authenticated).
- 019's `IS_LOCAL` constant in `lib/auth.ts` is the source of truth for local-mode UI bypass.
- The backend's `IUserDataService.GetOrCreateAsync` (verified at `BuildCv.Application/Features/Auth/IUserDataService.cs:8`) accepts `(provider, providerAccountId, email, name)` and is reused by PR0's new endpoint — no new backend domain logic.

---

## Functional Requirements

> **Convention**: REQ-FN-NNN · Given/When/Then with SHARP scope (independently testable, no "and" chains of unrelated behaviors) · RFC 2119 keywords (SHALL, SHOULD, MAY) · PR mapping · Proposal AC source.

### REQ-FN-001 — Backend `/auth/web-signup` endpoint

The backend SHALL expose `POST /api/v1/auth/web-signup` accepting JSON body `{provider: "google"|"linkedin", providerAccountId: string, email: string, name: string}`. The handler SHALL reuse `IUserDataService.GetOrCreateAsync` to create or upsert the user, and SHALL return `200 OK` with `{userId: Guid}` on success. The endpoint SHALL reject unknown providers with `400`, invalid email format with `400`, and SHALL be subject to the `auth` rate limit (30/min/IP).

- **Given** the backend is running and a request `POST /api/v1/auth/web-signup` body `{provider: "google", providerAccountId: "g-123", email: "a@b.co", name: "Ada"}`
- **When** the handler runs
- **Then** it returns `200` with `{userId}` and the user exists in `IUserDataStore` keyed by `(provider, providerAccountId)`
- **And** a second call with the same `(provider, providerAccountId)` returns the same `userId` (idempotent upsert)
- **PR**: PR0 · **Repo**: api · **Source**: proposal §PR0 AC#1

### REQ-FN-002 — Backend bearer-only logout revokes all refresh tokens

The backend SHALL accept `POST /api/v1/auth/logout` with an empty body (or no body) and a valid bearer JWT in the `Authorization` header. The handler SHALL extract `sub` from the JWT claims and call `IRefreshTokenStore.RevokeAllForUserAsync(userId)`. The method SHALL be idempotent (no-op for unknown user). Both `InMemoryRefreshTokenStore` and `EfRefreshTokenStore` SHALL implement it. The endpoint SHALL continue to accept `{refreshToken}` in the body for backward compatibility.

- **Given** an authenticated session with bearer JWT, **when** `POST /api/v1/auth/logout` is sent with no body
- **Then** all refresh tokens for the JWT's `sub` user are revoked
- **And** the response is `200` with `{message: "Logged out successfully"}`
- **Given** a user with 3 active refresh tokens, **when** they call this endpoint
- **Then** all 3 are revoked and a subsequent `POST /api/v1/auth/refresh` with any of them returns `401`
- **Given** `RevokeAllForUserAsync(unknownUserId)`, **when** the method runs
- **Then** it returns without throwing
- **PR**: PR0 · **Repo**: api · **Source**: proposal §PR0 AC#2, AC#3, AC#4

### REQ-FN-003 — Web auth adapter wires NextAuth session to backend

The web SHALL provide `lib/api/auth-adapter.ts` exposing `registerWithBackend({provider, providerAccountId, email, name})` that POSTs to `/api/auth/web-signup` (a new same-origin BFF route at `app/api/auth/web-signup/route.ts`). The BFF SHALL forward the request to `BACKEND_URL/api/v1/auth/web-signup` with a 5-second timeout and SHALL return `502` on backend failure. The NextAuth `events.signIn` callback SHALL invoke this adapter and SHALL NOT block sign-in on adapter failure (logged via `console.warn`, not `console.error`, per Art. III no-PII-noise).

- **Given** a NextAuth `events.signIn` fires after Google sign-in
- **When** the adapter runs
- **Then** it POSTs `{provider: "google", providerAccountId, email, name}` to `/api/auth/web-signup`
- **And** the BFF forwards to `BACKEND_URL/api/v1/auth/web-signup`
- **Given** the backend returns `5xx`, **when** the BFF responds
- **Then** the adapter logs a `console.warn` and the user is still signed in
- **PR**: PR1 · **Repo**: web · **Source**: proposal §PR1 AC#1, AC#3

### REQ-FN-004 — Contract drift fix in `lib/auth.ts`

The web SHALL remove the broken `POST /api/v1/auth/${provider}/callback` call from `lib/auth.ts`. The existing Vitest at `__tests__/lib/auth.test.ts:38-63` SHALL be updated (not deleted, per Art. VIII TDD rules) to assert "signIn callback does NOT post to backend directly". The NextAuth `jwt` and `session` callbacks SHALL remain unchanged.

- **Given** `lib/auth.ts` is loaded
- **When** the NextAuth `signIn` callback runs
- **Then** it does NOT call `fetch` against any backend path
- **And** the obsolete test is replaced by a positive assertion of the above in the same commit
- **PR**: PR1 · **Repo**: web · **Source**: proposal §PR1 AC#4

### REQ-FN-005 — Google OAuth provider configured

The web SHALL configure the Google OAuth provider in NextAuth with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` read from `.env.local` (no hardcoded values, per NFR-ENV-1). The provider SHALL be registered with the existing redirect URI `${NEXTAUTH_URL}/api/auth/callback/google`.

- **Given** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- **When** `lib/auth.ts` is loaded
- **Then** Google appears in `authOptions.providers`
- **And** clicking "Continuar con Google" on `/auth/signin` initiates the OAuth dance
- **PR**: PR1 · **Repo**: web · **Source**: proposal §PR1 AC#2

### REQ-FN-006 — LinkedIn OAuth provider configured

The web SHALL configure the LinkedIn OAuth provider in NextAuth with `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` from `.env.local`. Same redirect URI pattern as Google, replacing `google` with `linkedin`.

- **Given** `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are set
- **When** `lib/auth.ts` is loaded
- **Then** LinkedIn appears in `authOptions.providers`
- **And** clicking "Continuar con LinkedIn" on `/auth/signin` initiates the OAuth dance
- **PR**: PR1 · **Repo**: web · **Source**: proposal §PR1 AC#2 (Q2=A)

### REQ-FN-007 — Sign-out helpers (full revocation)

The web SHALL provide `lib/auth-client.ts` exporting `signOutAndClear()` which performs three steps in order: (1) `signOut({callbackUrl: "/"})` from `next-auth/react` to clear the NextAuth session cookie; (2) `POST /api/auth/logout` to the new BFF route at `app/api/auth/logout/route.ts`; (3) `clearJwtCache()` from `lib/api/jwt.ts:152`. The BFF SHALL call `BACKEND_URL/api/v1/auth/logout` with `Authorization: Bearer` and no body. The BFF SHALL return `200` even on backend failure (best-effort, dev-environment caveat per Art. VII no-friction).

- **Given** the user clicks "Cerrar sesión" in `<UserMenu>`
- **When** `signOutAndClear()` runs
- **Then** the NextAuth cookie is cleared, the BFF logout endpoint is called, and the BFF JWT cache is cleared — in that order
- **Given** the backend returns `500` from `/auth/logout`, **when** `signOutAndClear()` runs
- **Then** the NextAuth cookie is still cleared, the cache is still cleared, and `console.warn` records the backend failure
- **Given** no active session, **when** `signOutAndClear()` is called
- **Then** it is a no-op (no network calls)
- **PR**: PR2 · **Repo**: web · **Source**: proposal §PR2 AC#1, AC#2, AC#3

### REQ-FN-008 — `/privacidad` page renders policy v3 by default

The web SHALL render a server component at `app/privacidad/page.tsx` that calls `getPrivacyPolicy(version)` from `lib/api/privacy.ts`. When no `?version=` query param is present, the page SHALL default to version `3`. The page SHALL be public (no auth gate). The BFF at `app/api/privacy/route.ts` SHALL call `BACKEND_URL/api/v1/privacy-policy?version=N` and SHALL return `404` if the version is unknown.

- **Given** the user navigates to `/privacidad` (no query param)
- **When** the page renders
- **Then** the privacy policy v3 content is shown
- **And** a labeled `<select>` offers v1, v2, v3
- **And** no auth redirect occurs
- **PR**: PR3 · **Repo**: web · **Source**: proposal §PR3 AC#1, AC#3

### REQ-FN-009 — Privacy policy version selector

The web SHALL render a `<PrivacyVersionSelector>` (client component) inside the privacy page that exposes a labeled `<select htmlFor="privacy-version">` with options v1, v2, v3. On change, the selector SHALL navigate via `router.push` to `?version=N`. The selector SHALL satisfy WCAG 2.2 §1.3.1 (Info and Relationships) with the `<label>` association.

- **Given** the user is on `/privacidad` with v3 selected
- **When** they choose v1 from the selector
- **Then** the URL becomes `/privacidad?version=1`
- **And** the v1 content is shown
- **Given** `?version=99` is requested, **when** the backend returns 404
- **Then** the page renders a "Versión no encontrada" UI with a link back to `/privacidad` (defaults to v3)
- **PR**: PR3 · **Repo**: web · **Source**: proposal §PR3 AC#2, AC#4 (Q3=A)

### REQ-FN-010 — `/cuenta` page skeleton with route guard

The web SHALL render `app/cuenta/page.tsx` as a server component. If no NextAuth session exists, the page SHALL `redirect('/auth/signin?callbackUrl=/cuenta')`. If authenticated, the page SHALL render a `<CuentaSkeleton>` with three named sections: `<DatosPersonalesSection>` (reads `getUserData()` from `lib/api/user-data.ts` via the BFF at `app/api/user/data/route.ts`), `<ConsentSectionSlot>` (empty placeholder, filled by PR5), `<ArcoSectionSlot>` (empty placeholder, filled by PR6). Each section SHALL have a stable `id` attribute (`#datos-personales`, `#consent`, `#arco`) used as anchor targets and e2e selectors.

- **Given** an anonymous user navigates to `/cuenta`
- **When** the page renders
- **Then** it redirects to `/auth/signin?callbackUrl=/cuenta`
- **Given** an authenticated user navigates to `/cuenta`
- **When** the page renders
- **Then** three sections are visible with the documented ids
- **And** `<DatosPersonalesSection>` shows email, provider, createdAt, lastLoginAt
- **PR**: PR4 · **Repo**: web · **Source**: proposal §PR4 AC#1, AC#2

### REQ-FN-011 — GET user-data BFF

The BFF at `app/api/user/data/route.ts` SHALL handle `GET` by calling `BACKEND_URL/api/v1/user/data` with the bearer backend JWT. On `429`, the BFF SHALL forward the `Retry-After` header and SHALL return `429` to the client (the page renders an inline error with the timestamp — see REQ-FN-018). On no session, the BFF SHALL return `401`.

- **Given** an authenticated session and a `GET /api/user/data`
- **When** the backend returns 200 with `UserDataResponse`
- **Then** the BFF returns the same JSON to the client
- **Given** the backend returns 429 with `Retry-After: 30`
- **When** the BFF responds
- **Then** the client receives 429 with `Retry-After: 30` forwarded
- **PR**: PR4 · **Repo**: web · **Source**: proposal §PR4 AC#3 (NFR-XREPO-1)

### REQ-FN-012 — Consent panel with two purposes

The web SHALL render `<ConsentPanel>` inside the `<ConsentSectionSlot>` from PR4. The panel SHALL list two purposes: `functional` (essential, not revocable) and `analytics` (opt-in). Each row SHALL show the purpose name + a one-line description from `lib/copy/es.ts` (`copy.consent.purposes.*`) + a toggle button ("Otorgar" / "Revocar"). On grant click, the panel SHALL open `<ConsentGrantModal>`. On revoke click, the panel SHALL call `revokeConsent(purpose)` directly (no modal — revoke is reversible).

- **Given** an authenticated user is on `/cuenta`
- **When** the page renders
- **Then** `<ConsentPanel>` shows two rows: Funcional (essential) + Analytics (opt-in)
- **Given** the user clicks "Otorgar" on Analytics
- **When** the action triggers
- **Then** `<ConsentGrantModal>` opens (see REQ-FN-013)
- **Given** the user clicks "Revocar" on Analytics (when granted)
- **When** the action triggers
- **Then** `revokeConsent("analytics")` is called directly without a modal
- **PR**: PR5 · **Repo**: web · **Source**: proposal §PR5 AC#1, AC#4

### REQ-FN-013 — Consent grant modal with privacy-read gate

The `<ConsentGrantModal>` SHALL be a native `<dialog>` element. On open, it SHALL fetch the privacy policy v3 via `getPrivacyPolicy(3)` and render it in a scrollable region. The confirm button SHALL remain disabled until BOTH conditions are met: (a) the user has scrolled the content to the bottom (`scrollTop + clientHeight >= scrollHeight - 1`), and (b) the user has ticked the checkbox "He leído la política de privacidad v3". On confirm, the modal SHALL call `grantConsent(purpose)` and close. On 429 from the backend, the modal SHALL stay open and display the inline rate-limit error (REQ-FN-018).

- **Given** the user opens the grant modal
- **When** the modal renders
- **Then** it shows the privacy policy v3 in a scrollable region + a checkbox + a disabled confirm button
- **Given** the user scrolls to the bottom AND ticks the checkbox
- **When** both conditions are true
- **Then** the confirm button is enabled
- **And** clicking it calls `grantConsent(purpose)`, closes the modal, and updates the row to "Otorgado"
- **PR**: PR5 · **Repo**: web · **Source**: proposal §PR5 AC#2, AC#3

### REQ-FN-014 — ARCO Access section shows user data

The `<ArcoPanel>` SHALL render three sections: Access, Rectify, Cancel. The Access section SHALL show a "Ver mis datos" button. On click, it SHALL fetch `GET /user/data` and render the JSON response inside a `<details>` (collapsed by default, expanded on click).

- **Given** an authenticated user is on `/cuenta`
- **When** the page renders
- **Then** `<ArcoPanel>` shows three rows: "Ver mis datos", "Rectificar datos", "Eliminar mi cuenta"
- **Given** the user clicks "Ver mis datos"
- **When** the row expands
- **Then** the JSON response from `GET /user/data` is rendered inside a `<details>` (collapsed by default)
- **PR**: PR6 · **Repo**: web · **Source**: proposal §PR6 AC#1, AC#2

### REQ-FN-015 — ARCO Rectify updates name/email

The Rectify section SHALL render an editable form with `name` and `email` inputs. On submit, it SHALL call `PUT /user/data` via `rectifyUserData({email?, name?})`. On success, a toast appears and the page reflects the new values. On `400`, the form shows "Revisá el formato". On `429`, the form shows the inline rate-limit error (REQ-FN-018). If the email was changed, `signOutAndClear()` SHALL run after success and redirect to `/auth/signin` (the NextAuth JWT still encodes the old email).

- **Given** the user edits the name field and clicks "Guardar cambios"
- **When** the form submits
- **Then** `rectifyUserData({name})` is called
- **And** a success toast appears and the page reflects the new name
- **Given** the user changes the email and saves
- **When** the backend returns 200
- **Then** `signOutAndClear()` runs and the user lands on `/auth/signin`
- **PR**: PR6 · **Repo**: web · **Source**: proposal §PR6 AC#3, R16

### REQ-FN-016 — ARCO Cancel with type-email confirmation and auto-sign-out

The Cancel section SHALL render a red "Eliminar mi cuenta" button. On click, it SHALL open `<ArcoCancelModal>` (native `<dialog>`). The modal SHALL show copy: "Vas a eliminar tu perfil y todos tus consentimientos. Las facturas ya emitidas se conservan por ley. Esta acción no se puede deshacer." The modal SHALL include a type-email-to-confirm input. The confirm button SHALL be disabled until `input === user.email`. On confirm, the modal SHALL call `deleteUserData()` followed by `signOutAndClear()`.

- **Given** the user clicks "Eliminar mi cuenta"
- **When** the modal opens
- **Then** it shows the documented copy + a required email input + a disabled confirm button
- **Given** the user types a wrong email
- **When** the input changes
- **Then** the confirm button remains disabled
- **Given** the user types the matching email
- **When** the input matches `user.email`
- **Then** the confirm button is enabled
- **And** clicking it calls `deleteUserData()` + `signOutAndClear()` and the user lands on `/` with all cookies cleared
- **PR**: PR6 · **Repo**: web · **Source**: proposal §PR6 AC#4, AC#5

### REQ-FN-017 — `<UserMenu>` component in header

The web SHALL render `<UserMenu>` (new component in `components/header/user-menu.tsx`) into the `<HeaderExtras>` slot of `<SiteHeader>` from 019. The menu SHALL expose three states: loading (skeleton with `min-h-16`, no CLS), authenticated (avatar initial + email + native `<dialog>` dropdown with "Mi cuenta" → `/cuenta` and "Cerrar sesión" → `signOutAndClear`), unauthenticated (`<a href="/auth/signin">Iniciar sesión</a>`). The dropdown SHALL use native `<dialog>` with focus trap, Esc-to-close, and arrow-key navigation (`role="menu"`, `role="menuitem"`). The component SHALL render `null` when `IS_LOCAL === true` (Art. VII). The `<LandingNav>` "Cuenta" link SHALL be hidden when authenticated.

- **Given** an authenticated user is on any route
- **When** `<SiteHeader>` renders
- **Then** `<UserMenu>` shows avatar initial + email
- **And** clicking the trigger opens a native `<dialog>` with "Mi cuenta" + "Cerrar sesión"
- **Given** an anonymous user, **when** `<SiteHeader>` renders
- **Then** `<UserMenu>` shows "Iniciar sesión" linking to `/auth/signin`
- **And** `<LandingNav>` "Cuenta" item is hidden
- **Given** `IS_LOCAL === true`, **when** `<SiteHeader>` renders
- **Then** `<UserMenu>` renders `null` (no flicker, no placeholder)
- **Given** the user clicks "Cerrar sesión"
- **When** the button activates
- **Then** `signOutAndClear()` runs (per REQ-FN-007)
- **PR**: PR7 · **Repo**: web · **Source**: proposal §PR7 AC#1, AC#2, AC#3, AC#4

### REQ-FN-018 — Rate-limit UX surfaces `Retry-After` timestamp

On `429` responses from any BFF endpoint, the affected component (signin page for auth 429; `/cuenta` toast for consent/ARCO 429) SHALL render an inline error with copy "Demasiadas solicitudes. Reintentá en <formatted Retry-After date>." The `Retry-After` value SHALL be parsed as either seconds (delta) or HTTP-date and formatted to the user's locale. The error SHALL NOT auto-retry; the user explicitly clicks "Reintentar" (or the action's primary button) to re-submit.

- **Given** the backend returns 429 with `Retry-After: 30`
- **When** the affected component renders
- **Then** it shows "Demasiadas solicitudes. Reintentá en <date 30s from now>."
- **Given** the user clicks "Reintentar"
- **When** the action resubmits
- **Then** the original endpoint is called again
- **PR**: PR5/PR6/PR8 · **Repo**: web · **Source**: proposal §Defaults (rate-limit UX), NFR-RATE-1

### REQ-FN-019 — E2E happy-path coverage

Playwright e2e suites SHALL cover, in separate spec files (each ≤ 120 LOC): (a) `e2e/account-flow.spec.ts` — sign in via mock NextAuth cookie → `/cuenta` → grant analytics consent → revoke functional consent (or note it's not revocable) → view user data via ARCO Access → rectify name → open ARCO Cancel modal → type wrong email (button disabled) → type correct email (button enabled) → confirm → land on `/`; (b) `e2e/privacy-policy.spec.ts` — `/privacidad` renders v3 by default, selector switches to v2, anonymous access works; (c) `e2e/user-menu.spec.ts` — authenticated header shows `<UserMenu>`, dropdown opens to native `<dialog>`, sign-out clears NextAuth cookie + BFF cache; (d) `e2e/a11y-flow.spec.ts` — `@axe-core/playwright` audits `/cuenta`, `/privacidad`, `/auth/signin` with zero `serious`/`critical` violations.

- **Given** `pnpm test:e2e` runs
- **When** all 4 specs execute
- **Then** all 15+ scenarios pass
- **And** Lighthouse Accessibility ≥ 95 on the 3 audited routes
- **PR**: PR8 · **Repo**: web · **Source**: proposal §PR8 AC#1, AC#2, AC#3

### REQ-FN-020 — Existing `lib/auth.ts` test updated, not deleted

The existing Vitest at `__tests__/lib/auth.test.ts:38-63` ("signIn posts to backend") SHALL be updated (in the same commit as the implementation change) to assert "signIn does NOT post to backend directly". The test SHALL remain in the file (per Art. VIII TDD rules — never silently remove a green test). A Vitest-level grep SHALL assert that no other test references the removed `/callback` path.

- **Given** `__tests__/lib/auth.test.ts` is loaded
- **When** the suite runs
- **Then** the updated test passes
- **And** zero tests reference `/api/v1/auth/${provider}/callback`
- **PR**: PR1 · **Repo**: web · **Source**: proposal §PR1 risk R1-B

### REQ-FN-021 — Auto-sign-out after ARCO email rotation

If ARCO Rectify changes the user's email, the web SHALL automatically invoke `signOutAndClear()` after a successful `PUT /user/data` response and redirect to `/auth/signin`. This covers the NextAuth JWT encoding the old email (R16). Documented in `<ArcoPanel>` component copy: "Si cambiás tu email, vas a tener que iniciar sesión de nuevo."

- **Given** the user changes email in the Rectify form and saves
- **When** `PUT /user/data` returns 200
- **Then** `signOutAndClear()` runs
- **And** the browser navigates to `/auth/signin`
- **PR**: PR6 · **Repo**: web · **Source**: proposal §PR6 risk R6-C, R16

---

## Non-Functional Requirements

### NFR-SEC-1 — Session security

Session tokens SHALL be stored in `httpOnly` cookies (`next-auth.session-token` or `__Secure-` variant in production). The `SameSite` attribute SHALL be `Lax` (default for NextAuth) or `Strict` (for high-sensitivity routes — verify in PR1 design). No tokens SHALL be stored in `localStorage`, `IndexedDB`, or `sessionStorage`. No token SHALL be exposed to client-side JavaScript beyond the NextAuth session callback's `user.email` and `user.name`.

### NFR-SEC-2 — Refresh token rotation on backend

The backend's `POST /api/v1/auth/refresh` SHALL rotate the refresh token (one-time use). PR0 SHALL preserve this invariant when adding `RevokeAllForUserAsync` (it MUST NOT introduce a code path that allows refresh-token reuse). A Vitest at the integration level SHALL assert that two consecutive refresh calls with the same token result in: first 200 (rotation), second 401 (re-use rejected).

### NFR-ENV-1 — No hardcoded environment variables

All configuration values SHALL be read from `process.env` (server) or `process.env.NEXT_PUBLIC_*` (client). No URL, secret, or client ID SHALL be hardcoded in source files. The web SHALL read `.env.local` in dev and `.env` in CI (Next.js convention). A Vitest-level grep SHALL assert that no `https://` URL or 20+ char string appears as a literal in `lib/auth.ts` or `lib/api/*.ts` (excluding type imports).

### NFR-A11Y-1 — WCAG 2.2 AA compliance

All new components SHALL satisfy WCAG 2.2 AA:
- **2.1.1 Keyboard** — every interactive element keyboard-operable.
- **2.4.3 Focus Order** — logical DOM order, focus restoration on dialog close.
- **2.4.7 Focus Visible** — `:focus-visible` outline on every interactive element.
- **2.5.8 Target Size (Minimum)** — 24×24 CSS px on every interactive element.
- **1.4.3 Contrast (Minimum)** — 4.5:1 normal text, 3:1 large text.
- **1.4.11 Non-text Contrast** — 3:1 for UI components.
- **2.3.3 Animation from Interactions** — honors `prefers-reduced-motion: reduce`.

Specifically: `<UserMenu>`, `<ConsentPanel>`, `<ConsentGrantModal>`, `<ArcoPanel>`, `<ArcoCancelModal>`, `<PrivacyVersionSelector>`, and `<CuentaSkeleton>` SHALL use native `<dialog>` (where modal), labeled `<select>` (where dropdown), and `<button>` (not `<div onClick>`).

### NFR-RATE-1 — Rate-limit handling

On `429` responses from any BFF endpoint, the web SHALL surface `Retry-After` to the user (see REQ-FN-018). The web SHALL NOT auto-retry in the background (avoids hidden load on backend). The web SHALL NOT swallow the error silently. A Vitest SHALL assert that for each BFF route, the typed error class (`RateLimitError` in `lib/api/*`) carries a parsed `retryAfter: Date` field.

### NFR-OBS-1 — Minimal observability

Auth events (sign-in success/failure, sign-out, ARCO operations, consent grant/revoke) SHALL be logged via the existing observability port (`lib/observability/error-reporter.ts` if present, else `console.warn` per Art. III no-PII-noise). The web SHALL NOT log the user's `email` or `name` in `console.error` — verified by a Vitest grep. Auth event logs SHALL include a correlation id (existing `traceId`/`Activity.Id` pattern from backend) when available.

### NFR-RES-1 — Resilience to auth errors

On auth-state errors (expired session, deleted user, backend 401), the web SHALL clear all auth-related client state (NextAuth cookie, BFF cache) and SHALL redirect to `/auth/signin` without infinite loops. Specifically: if `getServerSession` returns null on `/cuenta`, redirect (REQ-FN-010); if `getJwtFromSession` returns null after a session is established, the cache is invalidated and the next call retries. No retry storm SHALL occur (single retry max, with exponential backoff capped at 5s).

### NFR-XREPO-1 — Cross-repo consistency

PR1's CI step SHALL run a script that fetches the backend's OpenAPI spec from `/scalar/v1` (or `/openapi/v1.json`) and validates that the web's typed wrappers in `lib/api/*.ts` match the response shapes. The script SHALL fail the build on shape drift. The script SHALL run on PR1 merge and on every subsequent PR that modifies `lib/api/*.ts`. PR0 SHALL update the backend OpenAPI doc strings to reflect the new `/auth/web-signup` endpoint and the `RevokeAllForUserAsync` interface method.

---

## Compliance Requirements

### CR-PRIV-1 — Privacy (Art. III)

The web SHALL NOT persist any new user data on the server side (BFF cache is per-process in-memory, acceptable). The web SHALL NOT introduce new `localStorage`, `IndexedDB`, or `sessionStorage` keys. The web SHALL NOT log the user's email, name, or refresh token in any `console.*` call (verified by Vitest grep in PR4/PR5/PR6). The `/cuenta` page footer SHALL include the disclaimer "Tu cuenta se guarda en memoria durante esta sesión de desarrollo" (backend in-memory caveat).

### CR-CONS-1 — Consent

The web SHALL implement granular opt-in/opt-out per data-processing purpose. The shipped purposes are exactly `["functional", "analytics"]` (no marketing — Art. IV forbids speculative copy). Grant SHALL be explicit: privacy-policy-read + scroll-to-bottom + checkbox (REQ-FN-013). Revoke SHALL NOT require confirmation (it is reversible). Backend enforces re-consent on policy version bump.

### CR-ARCO-1 — ARCO rights (Art. IX)

The web SHALL expose all four ARCO rights through `/cuenta`:
- **Access** (`GET /user/data`) — REQ-FN-014.
- **Rectify** (`PUT /user/data`) — REQ-FN-015.
- **Cancel** (`DELETE /user/data`) — REQ-FN-016 with type-email-to-confirm.
- **Opposition** = consent revoke (no separate endpoint; covered by CR-CONS-1 and REQ-FN-012).

After ARCO Cancel, the user SHALL be auto-signed-out (REQ-FN-016) so the deleted user's NextAuth JWT cannot be reused. After ARCO Rectify on email, the user SHALL be auto-signed-out (REQ-FN-021) so the NextAuth JWT does not encode the stale email.

### CR-TOK-1 — Token isolation

Refresh tokens SHALL NEVER leave the backend. The web SHALL only ever hold: (a) the NextAuth session JWT (in httpOnly cookie), (b) the backend access JWT (in BFF in-memory cache, never sent to client). No refresh token SHALL appear in any BFF request body, response body, log line, or client-side state. A Vitest SHALL assert that `lib/api/*.ts` does not reference the literal string `refreshToken` in any exported function's signature.

### CR-DATA-1 — User data handling

The web SHALL minimize local storage of user data to the bare minimum required for UI rendering (email, name, avatar initial). The web SHALL NOT cache the full `UserDataResponse` in any persistent storage. After ARCO Cancel, the web SHALL clear all client-side auth state (cookie, cache) so no deleted-user data remains. The web SHALL NOT send PII to any third-party analytics provider (per NFR-OBS-1 and Art. III).

### CR-DLG-1 — Accessible UI

All modal dialogs (`<ConsentGrantModal>`, `<ArcoCancelModal>`, `<UserMenu>` dropdown, mobile `<MobileNav>` from 019) SHALL use the native `<dialog>` element with: focus trap (native), Esc-to-close (native), focus restoration to the trigger on close, `aria-label` or `aria-labelledby` pointing to the dialog title, and a visible close button. All form inputs SHALL have associated `<label htmlFor>` or `aria-label`. All error messages SHALL be linked to their input via `aria-describedby` or `aria-errormessage`.

---

## Acceptance Criteria (per PR)

| PR | Acceptance |
|---|---|
| **PR0** | `dotnet build BuildCv.slnx -c Release` green. `dotnet test` green (≥ 6 new tests). `POST /auth/web-signup` returns 200 with `{userId}`. `POST /auth/logout` with bearer-only body revokes all refresh tokens. `RevokeAllForUserAsync` is idempotent. |
| **PR1** | `pnpm test` green (≥ 10 new tests). `lib/auth.ts` no longer POSTs to `/callback`. The NextAuth `events.signIn` adapter calls `/auth/web-signup` BFF. The existing test is updated, not deleted. Google + LinkedIn providers configured. |
| **PR2** | `pnpm test` green (≥ 8 new tests). `signOutAndClear()` runs three steps in order. Best-effort semantics on backend 500. No-op when no session. |
| **PR3** | `pnpm test` green (≥ 9 new tests). `/privacidad` renders v3 by default. Selector switches to v1/v2 via `?version=`. 404 fallback renders error UI. Public route (no auth gate). |
| **PR4** | `pnpm test` green (≥ 8 new tests). `/cuenta` redirects anonymous → `/auth/signin?callbackUrl=/cuenta`. Three sections render with stable ids. 429 from backend surfaces `Retry-After` to page. |
| **PR5** | `pnpm test` green (≥ 12 new tests). Two purposes shown. Grant modal blocks confirm until scroll + checkbox. Revoke is direct (no modal). 429 in modal keeps modal open with inline error. |
| **PR6** | `pnpm test` green (≥ 12 new tests). Three ARCO sections render. Access expands JSON in `<details>`. Rectify updates name/email with success toast and error mapping. Cancel modal requires matching email and auto-sign-outs. Email change auto-sign-outs. |
| **PR7** | `pnpm test` green (≥ 8 new tests). `<UserMenu>` renders in `<HeaderExtras>`. Three states (loading/auth/anon) render correctly. Native `<dialog>` with focus trap + Esc. Local mode renders `null`. `<LandingNav>` "Cuenta" hidden when authenticated. |
| **PR8** | `pnpm test:e2e` green (≥ 15 new scenarios across 4 spec files). Lighthouse Accessibility ≥ 95 on `/cuenta`, `/privacidad`, `/auth/signin`. `@axe-core/playwright` reports zero `serious`/`critical` violations on those routes. Rate-limit UX tested in 1 unit + 1 e2e. |

---

## Traceability Matrix

| REQ-ID | PR | Repo | Proposal AC | Tests | Risk |
| --- | --- | --- | --- | --- | --- |
| REQ-FN-001 | PR0 | api | §PR0 AC#1 (web-signup endpoint) | 4 | contract drift |
| REQ-FN-002 | PR0 | api | §PR0 AC#2/3/4 (revoke-all + bearer-only) | 3 | R1 cross-repo |
| REQ-FN-003 | PR1 | web | §PR1 AC#1/3 (auth adapter + BFF) | 5 | contract drift |
| REQ-FN-004 | PR1 | web | §PR1 AC#4 (test update, not delete) | 2 | R1-B |
| REQ-FN-005 | PR1 | web | §PR1 AC#2 (Google provider) | 3 | Q2 |
| REQ-FN-006 | PR1 | web | §PR1 AC#2 (LinkedIn provider) | 3 | Q2 |
| REQ-FN-007 | PR2 | web | §PR2 AC#1/2/3 (sign-out helpers) | 8 | Q1, NFR-SEC-2 |
| REQ-FN-008 | PR3 | web | §PR3 AC#1/3 (privacy page render) | 5 | Q3 |
| REQ-FN-009 | PR3 | web | §PR3 AC#2/4 (version selector) | 5 | Q3 |
| REQ-FN-010 | PR4 | web | §PR4 AC#1/2 (/cuenta skeleton) | 4 | R2 |
| REQ-FN-011 | PR4 | web | §PR4 AC#3 (GET user-data BFF) | 4 | NFR-XREPO-1 |
| REQ-FN-012 | PR5 | web | §PR5 AC#1/4 (consent panel) | 6 | CR-CONS-1 |
| REQ-FN-013 | PR5 | web | §PR5 AC#2/3 (grant modal gate) | 6 | NFR-A11Y-1, R3 |
| REQ-FN-014 | PR6 | web | §PR6 AC#1/2 (ARCO Access) | 4 | CR-ARCO-1 |
| REQ-FN-015 | PR6 | web | §PR6 AC#3 (ARCO Rectify) | 4 | CR-ARCO-1 |
| REQ-FN-016 | PR6 | web | §PR6 AC#4/5 (ARCO Cancel + auto-sign-out) | 4 | R16, R4 |
| REQ-FN-017 | PR7 | web | §PR7 AC#1/2/3/4 (<UserMenu>) | 8 | NFR-A11Y-1 |
| REQ-FN-018 | PR5/PR6/PR8 | web | §Defaults (rate-limit UX) | 3 | NFR-RATE-1, R5 |
| REQ-FN-019 | PR8 | web | §PR8 AC#1/2/3 (e2e + a11y) | 15 | R5 |
| REQ-FN-020 | PR1 | web | §PR1 R1-B (test update) | 1 | R1-B |
| REQ-FN-021 | PR6 | web | §PR6 R6-C (email rotation auto-sign-out) | 1 | R16 |

**Totals**: 21 REQs · 8 NFRs · 6 Compliance Requirements · 9 PRs covered.

---

## Risks

| ID | Risk | Likelihood | Mitigation | Status |
|---|---|---|---|---|
| **R1** | PR0 (api) + PR1 (web) are atomic cross-repo. If PR0 lands but PR1 is delayed, the web has no backend endpoint to call. If PR0 is reverted, PR1 (and downstream) must follow. | Med | `feature-branch-chain` strategy: PR1 targets PR0's branch; final merges to `main` are sequential. Document in PR0's PR description. | Tracked |
| **R2** | PR4 `/cuenta` skeleton + PR5/PR6 integration coupling. PR5 and PR6 both modify `app/cuenta/page.tsx` to inject their panel into slots. | Med | PR4 commits to a stable slot structure (`<ConsentSectionSlot>`, `<ArcoSectionSlot>`). PR5 and PR6 each touch exactly ONE slot + ~5 LOC in the page file. | Tracked |
| **R3** | PR5 at 350-LOC upper bound. Consent panel + grant modal + 2 BFFs + hook + 4 test files. | Med | **Split path**: PR5a (panel + BFFs + hook, ~200 LOC) + PR5b (consent-grant modal, ~150 LOC) if implementation exceeds 350. The split is mechanical — modal depends on `useConsent.grant()` only. | Tracked (split on overflow only) |
| **R4** | PR6 at 350-LOC upper bound. ARCO panel with 3 sections + cancel modal + BFF PUT/DELETE + auto-sign-out + 4 test files. | Med | **Split path**: PR6a (Access + Rectify + BFF PUT, ~200 LOC) + PR6b (Cancel + type-email modal + BFF DELETE + auto-sign-out, ~150 LOC) if implementation exceeds 350. | Tracked (split on overflow only) |
| **R5** | PR8 e2e spec density. 15+ scenarios across 4 spec files is dense. | Low | Each spec ≤ 120 LOC; if any exceeds, split into `*-2.spec.ts`. Lighthouse a11y is a hard gate (PR8 stops the chain if any score < 95). | Tracked |
| **R16** | ARCO email-rotation → auto-sign-out + redirect. The NextAuth JWT encodes the old email; without auto-sign-out, the user sees stale identity. | Low | REQ-FN-021 explicitly mandates auto-sign-out after email change. Vitest asserts that `signOutAndClear()` is called when `PUT /user/data` returns 200 and the form's email differs from the session email. | Tracked (REQ-FN-021, REQ-FN-015) |
| **Contract drift** | Web `lib/auth.ts:46` posts to wrong path + wrong body. Backend shipped contract differs. | Resolved | PR0 introduces `POST /auth/web-signup` accepting `{provider, providerAccountId, email, name}`. PR1 fixes web to call it. REQ-FN-001 + REQ-FN-003 + REQ-FN-004 codify. The wrong path (`/callback`) is removed entirely; no backward compatibility. | **RESOLVED** |
| **Consent path drift** | Docs say `/user/consent`; shipped is `/user/data/consent`. | Resolved | Spec reflects SHIPPED path everywhere. No consumer needs the doc path. | **RESOLVED** |

---

## Open Questions / Deferred Items

| # | Question / Item | Status |
|---|---|---|
| OQ-1 | Auto-refresh on BFF 401 — defer to v0.6: surface 401 to client and let `<UserMenu>` re-render with `unauthenticated` state. | Deferred (out of scope §5) |
| OQ-2 | Real OAuth provider dance in Playwright e2e — keep cookie-injection pattern; no real Google/LinkedIn round-trip in CI. | Deferred (out of scope §5) |
| OQ-3 | `<UserMenu>` avatar source — start with first-letter initial (no profile photo upload); photo upload deferred to v1. | Deferred (within scope but minimal implementation) |
| OQ-4 | Privacy v3 effective date is `2026-06-25` per `PrivacyPolicyQueryHandler.cs:61-104`. If backend bumps to v4 mid-cycle, PR3's selector needs to be re-deployed. Tracked via backend 009-auth deploy log. | Operational |
| OQ-5 | Wompi / credits / payments surfaces are not touched in 009-auth-web. Subscription pages may show stale "Iniciar sesión" CTAs after this change. Verify 019 REQ-EMPTY-001 still applies for anonymous `/suscripciones`. | Verify in PR8 (e2e covers `/suscripciones` anonymous state) |

---

## Out of Scope (deferred)

- Password auth, SMS 2FA, email magic-link (deferred to v0.6+ / 022-email-magic-link).
- Backend persistence (`InMemoryUserDataStore` stays in-memory; 010-persistence ships later).
- Auto-refresh on BFF 401 (defer to v0.6).
- Real OAuth provider dance in Playwright e2e.
- Profile photo upload for `<UserMenu>` avatar (initial only in v0.5.1).
- Lazy-create in `NextAuthJwtValidator` (web uses `/auth/web-signup` instead).
- `<UserMenu>` "Settings" sub-menu (profile editing deferred to v1).
- Multi-device session management (defer to v1 with persistence).
- Refresh-token rotation on the web (backend already rotates on `/auth/refresh`; web does not need to).

---

## Next

`sdd-design` → component contracts finalized, copy key schema complete, Tailwind utility classes locked, BFF route handler signatures locked, scroll-to-bottom detection algorithm decided (ref + listener on `<pre>` element, `scrollTop + clientHeight >= scrollHeight - 1` tolerance).

Then `sdd-tasks` → forecast 350-LOC budget per PR (with split paths documented for R3/R4), lock work-unit commits per PR (4-6 commits each following `work-unit-commits` skill), recommend 9 chained PRs.

Then `sdd-apply` → 9 chained PRs (PR0 api, PR1-PR8 web), each green, each mergeable.

Then `sdd-verify` → 21/21 REQs PASS · 8/8 NFRs PASS · 6/6 Compliance Requirements PASS · 9/9 PRs shipped · all CI gates green.

Then `sdd-archive` → tag `009-auth-web-v1.0`.

---

## References

- **Proposal**: [./proposal.md](./proposal.md) (508 lines, 9 PRs locked, 6 product decisions locked, contract drift resolution)
- **Exploration**: [./exploration.md](./exploration.md) (cross-repo surface mapping, contract drift discovery)
- **Backend shipped spec**: `BuildCv-api/specs/009-auth/spec.md` (47 tasks, 290 tests, in-memory)
- **Spec format reference**: `BuildCv-web/specs/019-navigation-onboarding/spec.md` (REQ/NFR/Compliance pattern, 710 lines)
- **Constitution**: `BuildCv-api/.specify/memory/constitution.md` v1.2.0 (Art. I–IX)
- **Web project rules**: `BuildCv-web/AGENTS.md` (no external UI libs, copy centralization, 0 suppressions)
- **API project rules**: `BuildCv-api/AGENTS.md` (Clean Architecture, TDD, 0 suppressions)
- **Accessibility skill**: `~/.config/opencode/skills/accessibility/SKILL.md`
- **Frontend-design skill**: `BuildCv-web/.agents/skills/frontend-design/SKILL.md`
- **Existing web auth state**: `BuildCv-web/lib/auth.ts` (81 lines, partial scaffolding), `BuildCv-web/lib/api/jwt.ts` (163 lines, working)
- **Backend endpoint contracts (shipped)**: `BuildCv-api/src/BuildCv.Api/Endpoints/{AuthEndpoints,UserDataEndpoints,PrivacyEndpoints,SessionEndpoint}.cs`