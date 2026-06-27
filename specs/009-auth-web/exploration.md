# 009-auth-web — Exploration

> **Change**: 009-auth-web · **Project**: `BuildCv-web/` (Next.js 16 frontend) · **Mode**: hybrid (openspec + engram) · **Strict TDD**: ACTIVE
> **Spec artifact format reference**: `specs/006-web-cv-editor/spec.md` (mirrors Constitution Articles explicitly), `specs/019-navigation-onboarding/spec.md` (REQ/NFR/Compliance pattern, chained-PR forecast)
> **Constitution (ley suprema)**: `../BuildCv-api/.specify/memory/constitution.md` v1.2.0 (Art. I–IX)
> **Created**: 2026-06-26

---

## Goal

Integrate backend `009-auth` into `BuildCv-web`. Backend is **already shipped** (47 tasks, 290 tests, 100% in-memory, per `BuildCv-api/specs/009-auth/tasks.md`). The web currently has **partial OAuth scaffolding** (NextAuth + signin page) and **a working BFF session-exchange helper**, but it is **not production-ready**: the OAuth callback posts a payload shape the backend doesn't accept, there is no `/cuenta` page, no consent flow UI, no ARCO UI, no logout button, no route protection, no middleware, and the existing tests are happy-path only.

This change makes the web a real consumer of backend auth so that users can:

1. Sign in via Google/LinkedIn (NextAuth, same as today) **and** get a backend JWT (via `/api/v1/auth/session`).
2. Read the privacy policy, grant/revoke consent per purpose, view consent status.
3. Exercise ARCO rights: view their data, rectify, delete.
4. Sign out cleanly (revokes refresh token + clears NextAuth session).
5. See an auth-aware header (user menu / sign-in CTA) instead of a static `Cuenta → /auth/signin` link.

---

## Backend surface area (mapped from `BuildCv-api/`)

> Cross-checked against `AuthEndpoints.cs`, `UserDataEndpoints.cs`, `PrivacyEndpoints.cs`, `SessionEndpoint.cs`, `RateLimiting.cs`, `JwtTokenAdapter.cs`, `NextAuthJwtValidator.cs`, `InMemoryUserDataStore.cs`, `LocalAuthMiddleware.cs`, integration tests in `tests/BuildCv.Api.IntegrationTests/{AuthEndpointTests,SessionEndpointTests,ConsentEndpointTests,ArcoEndpointTests}.cs`.

### Endpoints

| Method | Path | Auth | Rate-limit | Purpose |
|---|---|---|---|---|
| POST | `/api/v1/auth/google` | none (anti-abuse) | `auth` 30/min/IP | Exchange OAuth `code` for backend `accessToken` + `refreshToken` + `UserProfile`. |
| POST | `/api/v1/auth/linkedin` | none | `auth` 30/min/IP | Same as above for LinkedIn. |
| GET  | `/api/v1/auth/me` | bearer JWT | `auth` 30/min/IP | Returns `{userId, provider, email, name}` from claims. |
| POST | `/api/v1/auth/refresh` | none (refresh token is the credential) | `auth` 30/min/IP | Rotates refresh token (old token invalidated). |
| POST | `/api/v1/auth/logout` | bearer JWT (refresh token in body) | `auth` 30/min/IP | Revokes refresh token. Returns `{message: "Logged out successfully"}`. |
| GET  | `/api/v1/auth/session` | NextAuth HS256 JWT bearer | none | **Web BFF entry point.** Exchanges NextAuth session JWT → 15min backend JWT + user info. Returns `{jwt, expiresAt, user:{id,email,name}}`. |
| GET  | `/api/v1/privacy-policy` | none | none | Public. Returns `{version, content, effectiveDate, dataCategories[], purposes[]}`. |
| POST | `/api/v1/user/data/consent` | bearer JWT | `consent` 10/min/IP | Grant consent for `{purpose}`. Returns `{message, consentId}`. 409 if already granted. |
| POST | `/api/v1/user/data/consent/revoke` | bearer JWT | `consent` 10/min/IP | Revoke consent for `{purpose}`. Returns `{message}`. |
| GET  | `/api/v1/user/data` | bearer JWT | `consent` 10/min/IP | ARCO: Access. Returns `UserDataResponse {userId, provider, email, name, createdAt, lastLoginAt}`. |
| PUT  | `/api/v1/user/data` | bearer JWT | `consent` 10/min/IP | ARCO: Rectification. Body `{email?, name?}`. Returns updated `UserDataResponse`. |
| DELETE | `/api/v1/user/data` | bearer JWT | `consent` 10/min/IP | ARCO: Cancellation. **Drops user from in-memory store + writes audit log** (`InMemoryUserDataStore.DeleteAsync`). Returns `{message}`. |

> **Contract vs implementation drift (call out — resolve in sdd-spec).** The 009 spec contract docs (`specs/009-auth/contracts/{auth-api,user-data-api}.md`) describe the consent paths as `/auth/google/callback` and `/user/consent` (no `/data/` segment). **The actual shipped endpoints** are `/auth/google` (no `/callback` suffix) and `/user/data/consent` (verified in `UserDataEndpoints.cs` lines 88/114 + `ConsentEndpointTests.cs` lines 29/65 + `ArcoEndpointTests.cs` line 178). The web's existing `lib/auth.ts:46` POSTs to `/api/v1/auth/${provider}/callback` with `{providerId, email, name}` — **neither path nor body matches the shipped endpoints**. This must be fixed in PR1.

### Session strategy

- **Backend access token**: HS256 JWT, **15-minute TTL** (`JwtTokenAdapter.cs:48, 67`), claims `{sub=userId, email, name?, jti}`.
- **Backend refresh token**: 64 random bytes, base64, **7-day TTL** (`JwtTokenAdapter.cs:76-79`, `InMemoryRefreshTokenStore.cs`). **Rotated on every use** (`RefreshTokenHandler` invalidates the presented refresh token after issuing a new one — verified by `AuthEndpointTests.Refresh_token_rotation_old_token_invalidated` line 116).
- **NextAuth (web) session JWT**: HS256, 7-day TTL (`lib/auth.ts:33`, maxAge = 7×24×60×60). Signed with `NEXTAUTH_SECRET` (must be ≥32 chars; `NextAuthJwtValidator.cs:23` enforces this). Stored in `next-auth.session-token` cookie (or `__Secure-` variant in prod).
- **Bridge**: `GET /api/v1/auth/session` validates the NextAuth JWT (`NextAuthJwtValidator.TryExtractUserId`), looks up the user, and returns a fresh 15-minute backend JWT. The BFF caches this per `userId` for `JWT_CACHE_TTL_SECONDS` (default 300s, env-driven, see `lib/api/jwt.ts:24-35`).
- **Issuer/audience pairing** (must match byte-for-byte between web and backend):
  - Web: `NEXTAUTH_ISSUER=buildcv-web`, `NEXTAUTH_AUDIENCE=buildcv-api` (`.env.example:24-25`).
  - Backend dev: `appsettings.Development.json:55-56` mirrors exactly.
  - Backend prod: `appsettings.json:42-44` defaults to `buildcv-web`/`buildcv-api` — same.

### Auth providers

- **OAuth 2.0 only**: Google + LinkedIn. No email/password, no magic link, no SMS.
- **Flow**: NextAuth handles the redirect dance client-side (`signIn("google", {callbackUrl})` in `app/auth/signin/page.tsx:23`). On success, NextAuth's `signIn` callback in `lib/auth.ts:38-59` calls the backend — **but with the wrong contract today** (see Contract drift above).
- **The backend has its own OAuth adapters** (`GoogleOAuthAdapter`, `LinkedInOAuthAdapter`, `CompositeOAuthAdapter` in `src/BuildCv.Infrastructure/Auth/`) that call the providers' `token` + `userinfo` endpoints with the backend's own client credentials. The web's NextAuth uses **the web's own client credentials**. This means there are two sets of OAuth credentials to manage per environment:
  - Backend: `Authentication:Google:{ClientId,ClientSecret}` + `Authentication:LinkedIn:{ClientId,ClientSecret}` (per `quickstart.md:13-16`).
  - Web: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` (`.env.example:28-35`).
  - **Redirect URI mismatch risk:** Backend expects `${BACKEND_URL}/api/v1/auth/{google|linkedin}/callback` (per `quickstart.md:35,42`) but the actual endpoints are `/auth/{google|linkedin}` without `/callback` — backend's redirect-URI config in its OAuth adapters needs to be aligned with this. Worth verifying in `GoogleOAuthAdapter.cs` during sdd-spec.

### ARCO support

- **Access** (`GET /user/data`): returns flat `UserDataResponse` (not the nested `profile/consents/treatmentLogs` shape shown in the contract doc — actual response per `UserDataEndpoints.cs:149-150` and `UserDataContracts.cs:3-8`).
- **Rectification** (`PUT /user/data`): updates `email`/`name`; writes audit log.
- **Cancellation** (`DELETE /user/data`): drops user from `InMemoryUserDataStore.DeleteAsync` (real deletion, not soft-delete); writes audit log; revokes consents. After this call, the user's NextAuth JWT still resolves but `NextAuthJwtValidator` finds no user → `SessionEndpoint` returns 401 → web BFF cache invalidates and sign-in is required (tested by `SessionEndpointTests.GetSession_Returns401_WhenUserDeleted_ArcoCompliance` line 113).
- **Opposition**: implemented as consent revocation (no separate endpoint). Any purpose can be revoked.

### Rate limits (per `RateLimiting.cs`)

| Policy | Limit | Applied to |
|---|---|---|
| `auth` | 30/min/IP fixed-window | `POST /auth/google`, `POST /auth/linkedin`, `GET /auth/me`, `POST /auth/refresh`, `POST /auth/logout` |
| `consent` | 10/min/IP fixed-window | `GET /user/data`, `PUT /user/data`, `DELETE /user/data`, `POST /user/data/consent`, `POST /user/data/consent/revoke` |
| (none) | — | `GET /auth/session` (called BFF→backend, not user-facing) |

### Feature flags

- `LocalAuth:Enabled` (`appsettings.Development.json:46`) — when `true`, `LocalAuthMiddleware` injects a synthetic user (`00000000-0000-0000-0000-000000000001`, `local@buildcv.dev`) into `HttpContext.User`. Web mirrors this with `NEXT_PUBLIC_LOCAL_MODE=true` and signs a local NextAuth JWT in `lib/api/jwt.ts:70-81`. **Both must be enabled together in dev** (`docs/local-setup.md:36-43`).
- `Credits:Enabled` — gates `/api/v1/credits/*`. Not part of this change.
- No auth-specific feature flag (no staged rollout).

---

## Current web auth state (mapped from `BuildCv-web/`)

### Existing files

| Path | Lines | Status | Summary |
|---|---|---|---|
| `lib/auth.ts` | 81 | **partial** | NextAuth `authOptions` (Google + LinkedIn providers, JWT strategy, 7-day maxAge). **`signIn` callback posts to wrong backend path** (`/api/v1/auth/${provider}/callback` with `{providerId, email, name}` — backend expects `/api/v1/auth/${provider}` with `{code, state}`). |
| `lib/api/jwt.ts` | 163 | **working** | BFF helper. `getJwtFromSession()` reads NextAuth cookie, exchanges via `/api/v1/auth/session`, caches backend JWT per `userId` with TTL. Local-mode path signs its own NextAuth JWT. **The good code** — already integrated with `app/api/credits/balance/route.ts:9-21`. |
| `app/api/auth/[...nextauth]/route.ts` | 6 | **working** | NextAuth handler: `export { handler as GET, handler as POST }`. |
| `app/auth/signin/page.tsx` | 48 | **working** | Client page with Google/LinkedIn buttons (`signIn("google")` / `signIn("linkedin")`). Local mode auto-redirects to `/analizar` (per 019 REQ-LOCAL-001). |
| `__tests__/lib/auth.test.ts` | 91 | **happy-path only** | 3 tests: providers registered, `signIn` callback hits backend with `{providerId,email,name}` (matches the broken shape — test is green but tests the wrong contract), `jwt`/`session` callbacks propagate `sub` as `user.id`. |
| `e2e/auth-flow.spec.ts` | 110 | **stub-only** | 4 Playwright tests that **bypass OAuth** by encoding a NextAuth cookie directly with `next-auth/jwt`. Asserts only that the cookie is present after page load. **No test actually exercises `signIn("google")` end-to-end** — relies on Playwright's cookie injection. |
| `docs/local-setup.md` | 87 | current | Documents `NEXT_PUBLIC_LOCAL_MODE`, `NEXTAUTH_SECRET`, the BFF→backend session exchange flow. |

### What's missing (concrete deliverables for this change)

| Capability | Status | Notes |
|---|---|---|
| Working OAuth callback → backend user creation | ❌ | `lib/auth.ts:38-59` posts the wrong payload to the wrong URL. |
| `/cuenta` account page | ❌ | No route exists. 019 references `/auth/signin` as the `Cuenta` href for anonymous users (line 89) — placeholder for future auth. |
| User menu in header (signed-in dropdown with name, sign-out) | ❌ | `<SiteHeader>` (`components/landing/site-header.tsx`) has an `<HeaderExtras>` slot at line 14, but it is never wired to anything. `<LandingNav>` always shows `Cuenta → /auth/signin`. |
| Sign-out button | ❌ | No `signOut()` call anywhere in the codebase (`grep "signOut" BuildCv-web/ -r --include="*.tsx"` → 0 matches outside tests/docs). |
| Consent UI (grant/revoke + status) | ❌ | No page, no component. Backend endpoints exist and return `{message, consentId}`. |
| ARCO UI (access/rectify/cancel) | ❌ | No page, no component. Backend endpoints exist. |
| Privacy policy page | ❌ | No `/privacidad` route. Backend `GET /api/v1/privacy-policy` returns markdown. |
| Route protection (logged-out → `/auth/signin`) | ❌ | No `middleware.ts` at the web root (`find BuildCv-web -maxdepth 2 -name middleware.ts` → 0 results). Anonymous users can hit `/analizar` (works), `/suscripciones` (already shows empty-state CTA via 019), `/importar` (works) — no protection is needed for v0.5, but `/cuenta` and consent pages **must** redirect anonymous → `/auth/signin`. |
| `useSession` hook usage | ❌ | `grep "useSession" BuildCv-web/ -r --include="*.tsx"` → 0 matches. Components can't currently know "am I signed in?" without re-fetching `getServerSession` (which `lib/api/jwt.ts` does for BFF, but client components have no path). |
| `useUser` / `useUserMenu` hook | ❌ | No client-side `useSession()` wrapper that exposes `{status: 'loading'|'authenticated'|'unauthenticated', user, signOut}`. |
| Tests for the above | ❌ | 0 tests for `lib/api/jwt.ts`'s local-mode path (only the regular `getServerSession` path is tested — see `__tests__/lib/api/jwt.test.ts`). 0 tests for `/api/auth/session` BFF error handling. 0 tests for ARCO. 0 tests for consent. |

### Dependencies installed (from `BuildCv-web/package.json`)

| Package | Version | Already installed |
|---|---|---|
| `next-auth` | `^4.24.7` | ✅ |
| `zod` | `^3.25.76` | ✅ |
| `@types/node` | `^20` | ✅ (provides `node:crypto` types — `lib/api/jwt.ts:1` already imports it) |
| `@playwright/test` | `^1.60.0` | ✅ |
| `vitest` + `@vitest/coverage-v8` | `^2.1.9` | ✅ |
| `react-error-boundary` | `^5` | ✅ (can wrap `/cuenta` and consent UIs for friendly errors) |

**No new dependencies needed** for this change. Everything required (`next-auth`, `node:crypto` for HS256 signing, `zod` for input validation) is already in `package.json`.

---

## Gap analysis

| Capability | Backend has | Web has | Gap | Concretely needed |
|---|---|---|---|---|
| Sign in with Google (real OAuth) | ✅ `POST /auth/google` accepts OAuth `code` | ⚠️ Half — `signIn("google")` triggers NextAuth which handles the redirect, then `lib/auth.ts:38` posts `{providerId, email, name}` to `/api/v1/auth/google/callback` (wrong path, wrong body) | **Path + payload** | Either (a) drop the `signIn` callback's backend call entirely and let `GET /api/v1/auth/session` do the user creation on first BFF hit, OR (b) call `/api/v1/auth/${provider}` with `{code, state}` (but NextAuth doesn't expose `code` easily), OR (c) have NextAuth do the OAuth dance and rely on `SessionEndpoint` to lazy-create users. **Recommended: (c) — drop the `signIn` callback's backend POST**; `NextAuthJwtValidator` already looks up users in `IUserDataStore` and would 401 if the user doesn't exist, so we'd need to seed. See Risks §3. |
| Sign in with LinkedIn | ✅ `POST /auth/linkedin` accepts OAuth `code` | ⚠️ Same as Google | Same | Same fix |
| Persistent sign-in (7-day session) | ✅ `SessionEndpoint` returns 15-min backend JWT | ✅ NextAuth cookie (7 days) + BFF cache (default 300s) | None | None — already works |
| Backend JWT for protected endpoints | ✅ Required via `Authorization: Bearer` | ✅ `lib/api/jwt.ts` returns `{jwt, userId}` | None | None — already works |
| Refresh backend JWT when expired | ✅ `POST /auth/refresh` rotates token | ⚠️ BFF returns `null` on 401 but doesn't auto-refresh | **Auto-refresh on 401** | BFF helper that retries once after refreshing (or just surfaces 401 to client) |
| Logout | ✅ `POST /auth/logout` revokes refresh token | ❌ No sign-out button anywhere | **Sign-out button + handler** | Client `signOut()` from `next-auth/react` + a BFF route that posts to `/api/v1/auth/logout` + clears `getJwtFromSession` cache |
| User menu (signed-in state) | ✅ `GET /auth/me` returns `{userId, provider, email, name}` | ❌ No client hook, no UI | **`useSession()` wrapper + `<UserMenu>` component** | `<UserMenu>` consumes `<HeaderExtras>` slot in `<SiteHeader>`, shows avatar initial + dropdown with email + "Mi cuenta" + "Cerrar sesión" |
| Account page (`/cuenta`) | n/a (backend has no account profile endpoint beyond `GET /auth/me`) | ❌ No route | **New page** | Server component reading NextAuth session → renders profile (email, name, provider), consent status, links to ARCO actions |
| Privacy policy (`/privacidad`) | ✅ Public `GET /privacy-policy` returns markdown v1+v2 | ❌ No page | **New page** | Server component fetches once (cache 1h), renders markdown via `react-markdown` OR plain preformatted `<pre>` (project convention: no UI library) |
| Consent UI | ✅ `POST /user/data/consent`, `POST /user/data/consent/revoke` | ❌ No UI | **New UI** | Inside `/cuenta`: list of purposes (`scoring`, `adapt`, `export`, `cv-storage`) with current state + grant/revoke buttons |
| ARCO: Access | ✅ `GET /user/data` | ❌ No UI | **New UI** | Inside `/cuenta`: "Ver mis datos" panel that fetches and shows the JSON |
| ARCO: Rectify | ✅ `PUT /user/data` | ❌ No UI | **New UI** | Inside `/cuenta`: editable name/email form with "Guardar cambios" |
| ARCO: Cancel | ✅ `DELETE /user/data` | ❌ No UI | **New UI** | Inside `/cuenta`: red "Eliminar mi cuenta" with double-confirm modal (constitution Art. IV — encuadre honesto: copy must say "eliminaremos tu perfil y tus consentimientos") |
| Anonymous user can read `/cuenta` | n/a | ❌ | **Route guard** | `/cuenta` redirects to `/auth/signin?callbackUrl=/cuenta` if no NextAuth session |
| Anonymous user can read `/privacidad` | ✅ | ❌ | **None — public route** | Page is public |
| Sign-out clears BFF cache | n/a | ❌ | **Wire `clearJwtCache()` into sign-out flow** | `lib/api/jwt.ts:152-154` already exports `clearJwtCache()` — call it after `signOut()` |
| Audit log of sign-in attempts (Art. III) | ✅ Backend logs metadata only | ❌ Web logs nothing about auth | **Optional**: client-side `logError` calls for OAuth errors via existing `app/api/log/route.ts` (already imported in some places) | Low-priority — backend logs are sufficient |
| Test: end-to-end OAuth callback | n/a | ⚠️ e2e bypasses OAuth via cookie injection | **Real OAuth test (Playwright)** | Use Playwright's request context to mock Google's token endpoint; OR add a "test provider" the backend respects (no — backend doesn't support that). Recommended: keep the cookie-injection pattern for the existing tests + add ONE new test that mocks the backend `/api/v1/auth/session` and asserts the full `/cuenta` flow works after the cookie is set. |
| Tests: ARCO UI happy path | n/a | ❌ | **New** | Vitest component tests for `/cuenta` ARCO sections with mocked `lib/api/user-data` |
| Tests: consent grant/revoke | n/a | ❌ | **New** | Vitest component tests for consent panel |
| Tests: privacy-policy rendering | n/a | ❌ | **New** | Vitest snapshot + content test |

---

## Edge cases & risks

1. **Contract drift (CRITICAL — must resolve in PR1).** The backend's shipped endpoints are `/api/v1/auth/google` (no `/callback` suffix) and `/api/v1/user/data/consent`. The web's `lib/auth.ts:46` calls `/api/v1/auth/${provider}/callback` and posts `{providerId,email,name}`. Three plausible fixes:
   - **(c) Recommended**: drop the `signIn` callback's backend POST entirely. NextAuth handles OAuth end-to-end client-side. On first BFF call to a protected route, `getJwtFromSession()` calls `/api/v1/auth/session` → backend's `NextAuthJwtValidator` extracts `userId` from JWT → backend looks up `IUserDataStore.GetByIdAsync` → if not found, returns 401 → BFF returns null → web redirects to `/auth/signin`. **Problem:** the backend would never seed the user. We need `NextAuthJwtValidator` to lazy-create on miss (one-line change in backend) — OR the web sends a separate "register me" call after NextAuth confirms login (a new BFF route `POST /api/v1/auth/web-signup` that the backend exposes).
   - **(a) Backend's original design**: web posts OAuth `code` to `/api/v1/auth/google`, backend calls Google's token endpoint itself. Requires NextAuth to expose `code` to the `signIn` callback, which it does not (NextAuth exchanges `code` for tokens before calling the callback). **Not feasible without ditching NextAuth.**
   - **(b) Don't use NextAuth for the OAuth dance**: implement Google/LinkedIn redirects manually with `next/navigation` + a server-side exchange. **Throws away the working NextAuth scaffolding.**
   - **Decision must be locked in sdd-propose.**

2. **In-memory backend → user vanishes on API restart.** `InMemoryUserDataStore` is `ConcurrentDictionary`-backed. Every backend restart wipes every user. The web's NextAuth cookie survives (7-day TTL), but on next BFF call the backend returns 401 and the user is silently signed out. **No DB until 010-persistence ships.** This is acceptable for dev/local but must be documented in the `/cuenta` page's footer ("Tu cuenta se guarda en memoria durante esta sesión de desarrollo"). Production rollout requires 010-persistence.

3. **`NextAuthJwtValidator` lazy-create or not?** Currently the validator only does `GetByIdAsync` (returns 401 if user not found). With approach (1c), the backend needs to upsert on miss. Without that change, no user can ever sign in. Either: (i) backend change (small PR to 009-auth, requires constitutional impact assessment), OR (ii) web sends a "register" payload after NextAuth confirms login.

4. **OAuth `signIn` callback timing.** NextAuth's `signIn` callback runs server-side before the JWT is signed. If the callback throws, the user gets a generic error. The current code returns `false` on backend failure — user sees "No pudimos iniciar sesión: OAuthCallback" via the `?error=` query param. We need a friendly error mapping.

5. **Backend JWT expiry vs. NextAuth session expiry.** Backend JWT is 15 min, cached 5 min by BFF. After ~5 min idle, BFF re-fetches. After ~15 min, the cached JWT is expired but cache says it's still valid until `expiresAt`. Mitigation: `lib/api/jwt.ts:114-117` clamps cache TTL to `min(backend.expiresAt, now + JWT_CACHE_TTL_SECONDS)` — correct. But on a backend 401, the cache is NOT invalidated automatically (`jwt.ts:107-109` only checks `response.ok`); a stale JWT could persist until the cache entry's `expiresAt`. Low risk (5-min max staleness), worth a Vitest test.

6. **`RefreshTokenRequest` payload shape.** The web's `signOut` flow needs to call `/api/v1/auth/logout` with `{refreshToken}`. But the **refresh token lives only on the backend** (it's never sent to the browser — NextAuth cookie carries its own session token, BFF exchanges for backend JWT, backend JWT is the bearer). The web has no way to obtain a refresh token. **Two options:**
   - **A**: Backend's `/api/v1/auth/logout` accepts just the backend JWT (which has `sub=userId`) and revokes ALL refresh tokens for that user. Requires a backend change.
   - **B**: Backend exposes a "logout" path that just clears its in-memory user store entry for the JWT's `sub` claim. Equivalent semantics for an in-memory backend. Requires a backend change.
   - **C**: Don't bother revoking refresh tokens in the in-memory backend — they're lost on restart anyway. Just clear NextAuth cookie + BFF cache. Acceptable for dev, **NOT acceptable for production**. Flag this as a follow-up when 010-persistence lands.

7. **Two OAuth client credentials per environment.** Web needs Google/LinkedIn client IDs/secrets (for NextAuth's redirect dance). Backend ALSO needs them (for its own `GoogleOAuthAdapter` / `LinkedInOAuthAdapter`). Two sets of redirect URIs to register per provider console. Document this in `quickstart.md`.

8. **`SignInPage` error UX.** Current copy (`lib/copy/es.ts:547-552`) shows the raw `error` query param. Need to map NextAuth error codes to friendly Spanish strings (Art. IV — encuadre honesto): `"OAuthCallback" → "No pudimos completar el inicio de sesión con el proveedor. Probá de nuevo."`

9. **ARCO delete is irreversible (Art. III, V).** In-memory backend, yes — but a confirmation modal with explicit copy is required. "Esta acción elimina tu perfil y todos tus consentimientos. No se puede deshacer." + require the user to type their email before the button enables.

10. **Privacy policy has TWO versions (`v1`, `v2`)** — `PrivacyPolicyQueryHandler.cs:22` defines v2 effective `2026-06-25` covering credits/ARCO/Wompi. The web should render the current version with a "Ver versión anterior" link to v1.

11. **Anonymous users on `/suscripciones`** — 019 already handles this with an empty-state CTA pointing to `/auth/signin` (REQ-EMPTY-001 line 158). With 009-auth-web, anonymous `/cuenta` visits should also redirect to `/auth/signin` (NOT show an empty state — there's no decision paralysis, just no access).

12. **`useSession()` race on initial render.** NextAuth's client-side `useSession()` returns `{status: 'loading'}` on first paint. The `<UserMenu>` must render a skeleton or nothing during this window (avoid layout shift). Use the existing `min-h-16` pattern in `<SiteHeader>`.

13. **Rate-limit 429 on `/auth/google` (30/min)** — easy to hit during dev manual testing. The signin page must show a "Estás haciendo demasiados intentos. Esperá un minuto." message on 429. BFF should surface `Retry-After` header.

14. **WCAG 2.2 AA on the dropdown.** The user-menu dropdown must be a native `<details>`/`<summary>` or a `<button aria-expanded>` + `<dialog>` or `<ul role="menu">` with arrow-key navigation. Project convention (`019-navigation-onboarding` REQ-NAV-003/004) prefers native `<dialog>`. Accessibility skill (`~/.config/opencode/skills/accessibility/SKILL.md`) covers the pattern.

15. **Spanish copy centralization.** All new copy MUST live in `lib/copy/es.ts` under new namespaces (`copy.account.*`, `copy.consent.*`, `copy.arco.*`, `copy.privacy.*`, `copy.userMenu.*`). `019-navigation-onboarding` REQ-COPY-001 establishes this as a hard rule.

16. **Constitution Art. III (privacy).** The web MUST NOT persist anything new on the server side. The BFF cache (`lib/api/jwt.ts:24`) is in-memory per Node process — acceptable. No new `localStorage`/`IndexedDB` keys beyond what `006-web-cv-editor` already does. The `/cuenta` page must NOT log the user's email/name to console.

17. **Constitution Art. V (entrada como dato).** The privacy policy content is rendered as markdown. If the backend ever returns markdown with user-influenced content (it does not today — content is hardcoded in `PrivacyPolicyQueryHandler.cs`), we'd need sanitization. Today: no risk.

18. **Constitution Art. VII (v0 sin fricción).** Local-mode already works without any sign-in. After this change, local mode must still bypass ALL auth UI (no `/auth/signin` redirect, no user menu flicker). The 019 `LocalModePill` is the existing escape hatch — verify it covers the new pages.

19. **Constitution Art. VIII (TDD).** Strict TDD is active. Every new component ships with co-located Vitest tests BEFORE implementation. Every new BFF route handler ships with a Vitest test that mocks `global.fetch`. Every new Playwright scenario goes into `e2e/auth-flow.spec.ts` (or a new `e2e/account-flow.spec.ts`). 0 suppressions (no `it.skip`, no `vi.skip`).

20. **Constitution Art. IX (Habeas Data).** The `/cuenta` page is the user-facing ARCO interface. Backend enforces server-side; web must surface the privacy policy BEFORE grant-consent (Art. IX FR-053). Add a `<ConsentGrantModal>` that requires the user to scroll the privacy policy to the bottom + click a checkbox "He leído la política de privacidad" before the grant button enables.

---

## Constitution compliance

### Art. III — Privacidad primero

- **In-memory backend stores** (`InMemoryUserDataStore`) are the only persistence today — wipes on restart. Documented. **PASS** (with caveat for production).
- **No new server-side persistence on web.** BFF cache is per-process in-memory. No new `localStorage`/`IndexedDB`/cookie. **PASS.**
- **No PII in logs.** Web `lib/observability/error-reporter.ts` already exists — verify it doesn't leak email/name. **PASS** (TBD: add a Vitest asserting no email in `console.error` calls from `/cuenta` handlers).
- **Privacy policy must be accessible before consent.** Add `/privacidad` page reachable from `/auth/signin` (footer link) AND from the consent-grant modal. **PASS** (deliverable).

### Art. V — Entrada como dato

- **Privacy policy content** comes from backend's hardcoded markdown — no user input flows through it. **PASS.**
- **OAuth `state` parameter** is server-generated by NextAuth (CSRF protection built-in). **PASS.**
- **Anti-brute-force**: backend's `auth` rate limit (30/min/IP) + `consent` rate limit (10/min/IP) are server-enforced. Web must surface 429 to the user with `Retry-After` copy. **PASS** (deliverable: error mapping in signin page + `/cuenta` actions).
- **ARCO delete double-confirmation**: type-email-to-confirm pattern before button enables. **PASS** (deliverable).

### Art. VIII — TDD

Plan (red-green-refactor, no suppressions, ≥90% coverage on new code):

| Layer | Test files (planned) | Estimated test count |
|---|---|---|
| BFF helpers (`lib/api/user-data.ts`, `lib/api/consent.ts`, `lib/api/privacy.ts`) | `__tests__/lib/api/user-data.test.ts`, `consent.test.ts`, `privacy.test.ts` | ~20 |
| BFF routes (`app/api/auth/logout/route.ts`, etc.) | co-located `route.test.ts` OR `__tests__/app/api/auth/logout.test.ts` | ~6 |
| Sign-out flow (`lib/auth-client.ts`) | `__tests__/lib/auth-client.test.ts` | ~5 |
| `useUserMenu` hook | `__tests__/lib/use-user-menu.test.ts` | ~4 |
| `<UserMenu>` component | `components/header/user-menu.test.tsx` | ~6 |
| `<ConsentPanel>` component | `components/account/consent-panel.test.tsx` | ~8 |
| `<ArcoPanel>` component (access + rectify + delete with confirm) | `components/account/arco-panel.test.tsx` | ~8 |
| `<PrivacyPolicyView>` (markdown rendering + version selector) | `components/privacy/privacy-policy-view.test.tsx` | ~4 |
| `/cuenta` page | `app/cuenta/page.test.tsx` | ~5 |
| `/privacidad` page | `app/privacidad/page.test.tsx` | ~3 |
| `lib/auth.ts` fix (`signIn` callback + new `signOut` helper) | extend `__tests__/lib/auth.test.ts` | ~4 (replacing 1 obsolete test) |
| E2E: full sign-in → /cuenta → consent → ARCO view | new `e2e/account-flow.spec.ts` | ~6 scenarios |
| E2E: privacy policy render | extend `e2e/auth-flow.spec.ts` | ~2 |
| **Total new tests** | | **~81** |

Existing tests to **update** (not break):
- `__tests__/lib/auth.test.ts:38-63` — the "signIn posts to backend" test is now obsolete (we're dropping that POST). Replace with "signIn callback returns true after NextAuth verifies the account (no backend call)".
- `__tests__/lib/api/jwt.test.ts:78-103` — currently asserts BFF calls `/api/v1/auth/session` once. Still valid.
- `e2e/auth-flow.spec.ts` — all 4 existing tests still valid (they bypass OAuth via cookie injection).

### Art. VI — Clean Architecture (frontend)

- New BFF modules are ports: `lib/api/{user-data,consent,privacy}.ts` expose typed functions, no direct `fetch` from components. **PASS.**
- Components stay presentational; state lives in hooks (`useUserMenu`, `useConsent`). **PASS.**
- No new third-party UI library. **PASS.**

### Art. IV — Encuadre honesto

- All copy through `lib/copy/es.ts`. No "garantizado", "perfecto", "100% seguro". **PASS** (deliverable: copy review in PR description).
- ARCO delete copy explicitly says what gets deleted ("perfil, consentimientos; las facturas ya emitidas se conservan por ley"). **PASS** (deliverable: copy in PR).
- `/auth/signin` error messages don't blame the user. **PASS.**

### Art. I — Cero invención

- The web does NOT compute or display auth tokens, refresh tokens, or user IDs in the UI. Only `email`, `name`, `provider`. **PASS.**

### Art. II — Determinismo

- No scoring involvement. **PASS.**

### Art. VII — v0 sin fricción

- Local mode (`NEXT_PUBLIC_LOCAL_MODE=true`) must still skip ALL auth UI. Verify with a test that local-mode build never renders `<UserMenu>` and never redirects to `/auth/signin`. **PASS** (deliverable: Vitest).

### Art. IX — Habeas Data

- Consent modal requires privacy-policy read + explicit checkbox before grant. **PASS** (deliverable).
- ARCO delete writes audit log server-side; web confirms success. **PASS.**
- Opposition = revoke (covered by consent UI). **PASS.**

---

## PR recommendation

> **Total estimated scope:** ~1,800 LOC across 5 PRs (chained on `main`, each ≤ 400-line budget, each mergeable in isolation). 81 new tests. **Risk: medium** (contract-drift discovery + sign-out flow needs backend change for refresh-token revocation).

### Decision needed before apply: Yes (the contract-drift resolution from Risks §1)

### Chained PRs recommended: Yes

### Chain strategy: feature-branch-chain (each PR targets previous PR's branch; final merges to `main`)

### 400-line budget risk: Medium (each PR ≤ 400 lines if scoped tightly)

| PR | Scope | Approx LOC | Tests added | Backend dep? |
|---|---|---|---|---|
| **PR 1: Fix OAuth callback contract + sign-out helper** | Drop the broken `signIn`-callback POST in `lib/auth.ts`; add `signOutFromBackend()` helper that calls `/api/v1/auth/logout` with the backend JWT (backend accepts just the bearer — see Risks §6 for backend change needed); add `lib/api/privacy.ts` (single function `getPrivacyPolicy(version?)`); update unit tests; add a new backend contract test that asserts logout-from-bearer works. | ~250 | ~12 | **Yes** — small backend change: make `/api/v1/auth/logout` accept just bearer JWT and revoke ALL refresh tokens for the user. |
| **PR 2: `/privacidad` page + privacy-policy BFF** | New `app/privacidad/page.tsx` (server component), renders markdown via `<pre>` (no extra dep). New `app/api/privacy/route.ts` proxying `GET /api/v1/privacy-policy`. New `components/privacy/privacy-policy-view.tsx`. Copy keys in `lib/copy/es.ts`. Vitest snapshot + integration. | ~200 | ~9 | No |
| **PR 3: `/cuenta` page + consent UI** | New `app/cuenta/page.tsx` (server component, redirect anonymous → `/auth/signin?callbackUrl=/cuenta`). New `lib/api/consent.ts`. New `app/api/consent/{grant,revoke}/route.ts` BFF handlers. New `components/account/consent-panel.tsx` (list of purposes with grant/revoke). New `components/consent-grant-modal.tsx` (privacy-policy read + checkbox gate). Copy keys. Vitest. | ~400 | ~20 | No |
| **PR 4: ARCO UI + `/cuenta` integration** | New `lib/api/user-data.ts` (getRectify, deleteAccount). New `app/api/user/{data,data/rectify,data/delete}/route.ts`. New `components/account/arco-panel.tsx` (access view, rectify form, delete-with-confirm). Wire into `/cuenta` page (consent panel + arco panel as tabs or stacked sections). Copy keys for ARCO. Vitest with type-email-to-confirm tested. | ~400 | ~20 | No |
| **PR 5: `<UserMenu>` in header + sign-out wiring + e2e** | New `components/header/user-menu.tsx` (avatar initial + dropdown with `<dialog>`). New `lib/auth-client.ts` (wraps `useSession` from `next-auth/react` + exposes `signOutAndClear`). Modify `app/layout.tsx` to inject `<UserMenu>` via `<SiteHeader extras>`. Modify `components/landing/landing-nav.tsx` to hide the `Cuenta` link when authenticated (use `useSession` status). New `e2e/account-flow.spec.ts` (full sign-in → /cuenta → consent grant → ARCO view → sign-out). Vitest for hook + component. | ~350 | ~20 | No |

**Work-units within each PR** (per `work-unit-commits` skill convention):
- PR1 commit 1: tests for new `signOutFromBackend` (RED)
- PR1 commit 2: implementation (GREEN)
- PR1 commit 3: drop broken `signIn` callback POST + update test
- PR1 commit 4: backend change for bearer-only logout (separate commit if multi-repo)
- (similar pattern for PR2–PR5)

**Per-PR gates** (all must pass):
1. `pnpm lint` — 0 errors, 0 warnings.
2. `pnpm build` — 0 errors.
3. `pnpm test` — all Vitest unit + integration tests pass; new tests pass; no suppressions.
4. `pnpm test:e2e` — Playwright passes (chromium only).
5. Backend `dotnet build BuildCv.slnx -c Release` + `dotnet test` — green (for PR1's backend change).
6. Constitution check: every PR description cites Art. III/V/VI/VIII/IX as applicable.

---

## Estimated scope

| Metric | Estimate |
|---|---|
| **LOC** (incl. tests) | ~1,800 |
| **New files** | ~18 |
| **Modified files** | ~8 (`lib/auth.ts`, `lib/api/jwt.ts`, `app/layout.tsx`, `components/landing/landing-nav.tsx`, `lib/copy/es.ts`, `__tests__/lib/auth.test.ts`, `e2e/auth-flow.spec.ts`, backend `AuthEndpoints.cs`) |
| **New tests** | ~81 |
| **Risk level** | **Medium** (contract-drift discovery + sign-out needs backend change; ARCO + consent UI has WCAG surface area; OAuth e2e remains flaky in CI) |
| **Sprint budget** | 5 PRs, ~1 sprint at project pace (each PR ≈ 0.5–1 day of focused work given existing scaffolding) |
| **Backend coupling** | 1 small backend change (PR1 only: make logout accept bearer-only) — flagged as 009-auth follow-up |

---

## Open clarifications (for sdd-propose to lock)

1. **Contract-drift resolution (Risks §1).** Lock to approach **(c)**: drop `signIn`-callback POST + lazy-create user in `NextAuthJwtValidator` on miss. OR lock to approach **(b2)**: add a web-side `POST /api/v1/auth/web-signup` BFF route that the backend exposes (no backend `NextAuthJwtValidator` change). The orchestrator + owner must pick one — affects PR1 scope.
2. **Refresh-token revocation strategy (Risks §6).** For the in-memory backend, is "don't bother" (approach C) acceptable for v0.5, or must we add the backend change (approach A) before shipping? Affects sign-out UX copy ("Tu sesión local se cerrará, pero el backend olvidará tu cuenta en su próximo reinicio." vs "Tu cuenta ha sido eliminada del servidor.").
3. **Privacy policy version selector.** Show v1 (effective 2025-01-01) and v2 (effective 2026-06-25) as separate pages, or just v2 with a "Histórico" link? Affects `PrivacyPolicyView` UX.
4. **Consent purposes list.** Backend accepts any string `{purpose}` (no enum). What purposes does the web ship? `["scoring", "adapt", "export", "cv-storage"]` is reasonable but unconfirmed. Affects `consent-panel.tsx` data.
5. **`Cuenta` href for anonymous users** (per 019 REQ-NAV-002). Currently `/auth/signin`. After 009-auth-web, it should be `/cuenta` for authenticated users and `/auth/signin` for anonymous. `<LandingNav>` needs to read `useSession()` — confirm this is acceptable (currently it's pure presentational per 019 REQ-NAV-PILL). Affects PR5.
6. **Rate-limit UX.** On 429 from `/api/v1/auth/google` (30/min), show inline error on signin page? On 429 from consent/ARCO (`/api/consent/grant` etc., 10/min), show toast? Pick one pattern for consistency.
7. **Web analytics for auth events.** Sign-in success/failure counts. Out of scope per Constitution Art. III, but worth confirming.

---

## References

- **Backend spec (root)**: `BuildCv-api/specs/009-auth/spec.md` · `plan.md` · `tasks.md` · `data-model.md` · `research.md`
- **Backend contracts**: `BuildCv-api/specs/009-auth/contracts/{auth-api,user-data-api}.md` (note: stale on path names — see Risks §1)
- **Backend endpoints (canonical)**: `BuildCv-api/src/BuildCv.Api/Endpoints/{AuthEndpoints,UserDataEndpoints,PrivacyEndpoints,SessionEndpoint}.cs`
- **Backend handlers**: `BuildCv-api/src/BuildCv.Application/Features/Auth/*` (29 handlers + commands) · `BuildCv.Application/Features/Consent/{PrivacyPolicyQuery,PrivacyPolicyQueryHandler}.cs`
- **Backend infrastructure**: `BuildCv-api/src/BuildCv.Infrastructure/Auth/{GoogleOAuthAdapter,LinkedInOAuthAdapter,JwtTokenAdapter,NextAuthJwtValidator,InMemoryRefreshTokenStore,CompositeOAuthAdapter}.cs`
- **Backend security**: `BuildCv-api/src/BuildCv.Api/Security/RateLimiting.cs` · `BuildCv.Api/Auth/{AuthPolicies,LocalAuthMiddleware}.cs`
- **Backend tests (290)**: `BuildCv-api/tests/BuildCv.Api.IntegrationTests/{AuthEndpointTests,SessionEndpointTests,ConsentEndpointTests,ArcoEndpointTests}.cs`
- **Web existing**: `BuildCv-web/lib/auth.ts` · `BuildCv-web/lib/api/jwt.ts` · `BuildCv-web/app/auth/signin/page.tsx` · `BuildCv-web/app/api/auth/[...nextauth]/route.ts` · `BuildCv-web/__tests__/lib/auth.test.ts` · `BuildCv-web/__tests__/lib/api/jwt.test.ts` · `BuildCv-web/e2e/auth-flow.spec.ts` · `BuildCv-web/docs/local-setup.md` · `BuildCv-web/.env.example` · `BuildCv-web/components/landing/site-header.tsx` · `BuildCv-web/components/landing/landing-nav.tsx` · `BuildCv-web/components/credits/credit-badge.tsx`
- **Web spec format reference**: `BuildCv-web/specs/019-navigation-onboarding/spec.md` (REQ/NFR/Compliance table) · `BuildCv-web/specs/006-web-cv-editor/spec.md` (Constitution table)
- **Constitution**: `BuildCv-api/.specify/memory/constitution.md` v1.2.0
- **Web AGENTS**: `BuildCv-web/AGENTS.md` (no UI library, copy centralization, 0 suppressions, WCAG via accessibility skill)
- **Accessibility skill**: `~/.config/opencode/skills/accessibility/SKILL.md`
- **Frontend-design skill**: `BuildCv-web/.agents/skills/frontend-design/SKILL.md`
- **Backend AGENTS**: `BuildCv-api/AGENTS.md`

---

## Next

→ **`sdd-propose`** — lock the 7 open clarifications, write proposal.md with intent/scope/approach/risks, recommend PR1 start.

OR

→ **`sdd-ff`** (fast-forward) if the orchestrator + owner have already aligned on all 7 clarifications inline.