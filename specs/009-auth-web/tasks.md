# Tasks: 009-auth-web — Integrate backend 009-auth into BuildCv-web

> **Change**: 009-auth-web · **Project**: buildcv (cross-repo: `BuildCv-web/` PR1–PR8 + `BuildCv-api/` PR0)
> **Version**: 1.0.0 · **Date**: 2026-06-26
> **Mode**: hybrid (filesystem + engram)
> **Strict TDD**: ACTIVE (Constitution Art. VIII) · **0 supresiones**: ACTIVE
> **Sources**: [`./exploration.md`](./exploration.md) (376 lines) · [`./proposal.md`](./proposal.md) (508 lines, 9-PR chain locked) · [`./spec.md`](./spec.md) (517 lines, 21 REQs + 8 NFRs + 6 Compliance) · [`./design.md`](./design.md) (1,572 lines, 35/35 traceability)
> **Backend counterpart (shipped)**: `BuildCv-api/specs/009-auth/tasks.md` (47 tasks, 290 tests, in-memory)
> **Constitution (ley suprema)**: `BuildCv-api/.specify/memory/constitution.md` v1.2.0 (Art. I–IX)

---

## Summary table

| PR | Repo | Branch base | LOC forecast | Tests forecast | Status |
|---|---|---|---|---|---|
| PR0 | api | `main` | ~100 | ~6 | planned |
| PR1 | web | `feature/009-pr0` | ~180 | ~10 | planned |
| PR2 | web | `feature/009-pr1` | ~125 | ~8 | planned |
| PR3 | web | `feature/009-pr1` | ~175 | ~9 | planned |
| PR4 | web | `feature/009-pr2` | ~175 | ~8 | planned |
| PR5 | web | `feature/009-pr4` | ~300 | ~12 | planned |
| PR6 | web | `feature/009-pr4` | ~300 | ~12 | planned |
| PR7 | web | `feature/009-pr2` | ~175 | ~8 | planned |
| PR8 | web | `feature/009-pr7` | ~250 | ~15 | planned |
| **Total** | | | **~1,780 LOC** | **~88 tests** | |

**Per-PR LOC**: every PR is **≤ 350** (50-LOC margin under the 400-line review guard).
**Total LOC** EXCEEDS the 400-line per-PR budget when summed — strategy is **chained PRs**, NOT `size:exception`.
**Cross-repo atomicity**: PR0 must land before PR1; chain root is PR0. If PR0 is reverted, PR1 (and downstream) must follow.

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,780 LOC (across 9 PRs) |
| 400-line budget risk | **High** (total > 400; per-PR ≤ 350) |
| Chained PRs recommended | **Yes** |
| Suggested split | PR0 (api prep) → PR1 (web auth adapter) → PR2 (web session helpers) → PR3 (privacy page) → PR4 (/cuenta skeleton) → PR5 (consent) → PR6 (ARCO) → PR7 (UserMenu) → PR8 (E2E + a11y) |
| Delivery strategy | `auto-chain` (chained PRs already locked in proposal — no decision needed) |
| Chain strategy | `feature-branch-chain` (each PR targets the previous PR's branch; final merges to `main` are sequential) |

```
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High
```

**Decision needed before apply: No** — the 9-PR chain is locked in `proposal.md` §2 and `design.md` §12. Orchestrator proceeds with PR0 first.

---

## Canonical paths (LOCKED — DO NOT reintroduce old paths)

| Use this | NOT this (old contract drift) |
|---|---|
| `POST /api/v1/auth/web-signup` body `{provider, providerAccountId, email, name}` | `POST /api/v1/auth/${provider}/callback` body `{providerId, email, name}` |
| `POST /api/v1/auth/logout` (bearer-only OK) | `POST /api/v1/auth/sign-out` |
| `GET /api/v1/auth/session` | `GET /api/v1/session` |
| `GET /api/v1/privacy-policy?version=N` | `GET /api/v1/privacy/policies` |
| `POST /api/v1/user/data/consent` (grant or revoke body) | `GET /api/v1/user/data/consent` (does not exist) |
| `GET /api/v1/user/data` (ARCO Access) | `POST /api/v1/user/data/arco/request` |
| `PUT /api/v1/user/data` (ARCO Rectify) | `POST /api/v1/user/data/arco/rectify` |
| `DELETE /api/v1/user/data` (ARCO Cancel) | `POST /api/v1/user/data/arco/cancel` |

Any task that uses an old path is a **DEFECT**. See `design.md` §13.1 R-ENDPOINT-DRIFT for the full catalogue (8 discrepancies resolved).

---

## Global gates (enforced across all PRs)

- ❌ NO `@ts-ignore` / `# type: ignore` / `#pragma warning disable`
- ❌ NO `eslint-disable` / `eslint-disable-next-line`
- ❌ NO mocks falsos (no `vi.mock` for the SUT; only for fetch/NextAuth/network)
- ❌ NO hardcoded env vars (use `process.env` / `.env.local`)
- ❌ NO token exposure (refresh tokens live only on backend; web only touches NextAuth cookie + BFF cache)
- ✅ WCAG 2.2 AA — native `<dialog>`, focus trap, Esc, focus return
- ✅ OpenAPI contract validation (PR1 establishes `scripts/check-openapi-drift.ts` per NFR-XREPO-1)
- ✅ Rate-limit UX with `Retry-After` (PR5, PR6, PR8 — `RateLimitError` with `retryAfter: Date`)
- ✅ Conventional commits in **Spanish**, NO AI attribution
- ✅ Work-unit commits: 4-6 per PR (RED → GREEN → REFACTOR grouping)
- ✅ Per-PR test isolation: `vi.resetModules()` between tests touching module-level state (per PR2 R2-B)
- ✅ Cover `clearJwtCache` + `RateLimitError` import in `lib/api/jwt.ts` + `lib/api/_utils.ts` (`parseRetryAfter` + `formatRetryAfter`)
- ✅ jsdom `<dialog>` mock per design §13 R-DIALOG-JSDOM (use `dialog.open` property assertions)

---

## Risks coverage map

| Risk | PRs that cover it | Verification |
|---|---|---|
| R1 (PR0+PR1 atomic cross-repo) | PR0, PR1 | Chain root docs in PR0 description; PR1 targets PR0's branch |
| R2 (PR4 / PR5/PR6 slot coupling) | PR4, PR5, PR6 | PR4 commits to stable 3-slot structure; PR5/PR6 each touch ONE slot |
| R3 (PR5 at 350-LOC upper bound) | PR5 | Split path PR5a/PR5b if implementation exceeds 350 |
| R4 (PR6 at 350-LOC upper bound) | PR6 | Split path PR6a/PR6b if implementation exceeds 350 |
| R5 (PR8 e2e density) | PR8 | Split path PR8a/PR8b if any e2e spec exceeds 120 LOC |
| R16 (ARCO email rotation → auto-sign-out) | PR6 | REQ-FN-021 + Vitest asserting `signOutAndClear()` is called when email changes |
| R-ENDPOINT-DRIFT (8 endpoint discrepancies) | PR0, PR1 | All BFF routes use SHIPPED paths (design §3.2) |
| R-OPENAPI-CI (hand-written drift check) | PR1 | `scripts/check-openapi-drift.ts` + CI job |
| R-LOCAL-MODE-CACHE (cache leak if raw `signOut` used) | PR2, PR7 | Single source of truth: `signOutAndClear()` exported from `lib/auth-client.ts` |
| R-DIALOG-JSDOM (jsdom `<dialog>` mocking) | PR5, PR6, PR7, PR8 | Vitest asserts `dialog.open` property; PR8 e2e uses real Chromium |
| R-DECISION-VS-OBSERVER (scroll-event vs IntersectionObserver) | PR5 | Scroll-event + 1px tolerance per design §2.4 / §8.3 |

---

## Chain dependency diagram

```
PR0 (api, main)
  └──► PR1 (web, feature/009-pr0)
         ├──► PR2 (web, feature/009-pr1)
         │      └──► PR4 (web, feature/009-pr2)
         │             ├──► PR5 (web, feature/009-pr4)
         │             │      └──► PR8 (web, feature/009-pr7)  [PR5 path]
         │             └──► PR6 (web, feature/009-pr4)
         │                    └──► PR8 (web, feature/009-pr7)  [PR6 path]
         ├──► PR3 (web, feature/009-pr1)
         └──► PR7 (web, feature/009-pr2)
                └──► PR8 (web, feature/009-pr7)
```

`feature/009-pr7` is the final integration branch. PR8 lands there; then the tracker chain merges to `main` sequentially.

---

# PR0 — Backend: `/auth/web-signup` + revoke-all-for-user + bearer-only logout

- **Objective**: Ship the cross-repo backend touchups that unblock every web PR downstream: (a) a new endpoint that accepts the web's NextAuth user shape, (b) bearer-only logout that revokes all refresh tokens for the JWT `sub`, (c) `IRefreshTokenStore.RevokeAllForUserAsync` interface method + 2 implementations.
- **Repo**: `BuildCv-api/`
- **Branch strategy**: `feature/009-pr0` from `api/main`; chain root.
- **Dependencies**: none (this is the chain root).
- **LOC forecast**: ~100 production + ~70 tests
- **Tests forecast**: 6 (4 integration + 2 unit)

| Type | Count |
|---|---|
| Integration (xUnit + WebApplicationFactory) | 4 |
| Unit (xUnit) | 2 |
| **Total** | **6** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-api/src/BuildCv.Api/Endpoints/AuthEndpoints.cs` | Modify | +30 LOC: `MapPost("/api/v1/auth/web-signup", ...)` + modify logout to accept empty body |
| `BuildCv-api/src/BuildCv.Api/Contracts/AuthContracts.cs` | Modify | +15 LOC: `WebSignupRequest` record; nullable `RefreshTokenRequest.RefreshToken` |
| `BuildCv-api/src/BuildCv.Application/Features/Auth/LogoutHandler.cs` | Modify | +10 LOC: bearer-only path extracts `sub` from `ClaimsPrincipal` |
| `BuildCv-api/src/BuildCv.Application/Features/Auth/WebSignupHandler.cs` | New | ~25 LOC: handler reusing `IUserDataService.GetOrCreateAsync` |
| `BuildCv-api/src/BuildCv.Application/Features/Auth/IRefreshTokenStore.cs` | Modify | +5 LOC: `RevokeAllForUserAsync(Guid userId, CancellationToken ct)` |
| `BuildCv-api/src/BuildCv.Infrastructure/Auth/InMemoryRefreshTokenStore.cs` | Modify | +10 LOC: implementation |
| `BuildCv-api/src/BuildCv.Infrastructure/Auth/EfRefreshTokenStore.cs` | Modify | +10 LOC: implementation (aligned for 010-persistence) |
| `BuildCv-api/tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs` | Modify | +~50 LOC: 4 tests |
| `BuildCv-api/tests/BuildCv.Application.UnitTests/Auth/RefreshTokenStoreTests.cs` | Modify | +~20 LOC: 2 tests |
| `BuildCv-api/src/BuildCv.Api/Endpoints/AuthEndpoints.cs` (OpenAPI doc strings) | Modify | +~10 LOC: update XML doc comments |

### Tasks

#### T-PR0-001 — RED: `/auth/web-signup` happy path integration test

- **Type**: backend (integration)
- **TDD**:
  - **RED**: `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs` → add `WebSignup_Returns200_WithUserId_WhenNewProvider`. Assert `POST /api/v1/auth/web-signup` with body `{provider:"google", providerAccountId:"g-123", email:"a@b.co", name:"Ada"}` returns 200 + `{userId: Guid}`.
  - **GREEN**: implement endpoint handler calling `IUserDataService.GetOrCreateAsync`.
  - **REFACTOR**: extract `WebSignupRequest` Zod-style validator, reuse existing `IUserDataService` (no new domain logic per `proposal.md` §"Backend changes summary").
- **Maps to**: REQ-FN-001 (AC#1), CR-PRIV-1, Art. III + IX.
- **Risk covered**: Contract drift (R-ENDPOINT-DRIFT #8).
- **Expected test file**: `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs`
- **Expected impl file**: `src/BuildCv.Application/Features/Auth/WebSignupHandler.cs`
- **Evidence**: `git show HEAD --stat` shows `AuthEndpointTests.cs` (+50) + `WebSignupHandler.cs` (new ~25).

#### T-PR0-002 — RED: `/auth/web-signup` validation rejection tests

- **Type**: backend (integration)
- **TDD**:
  - **RED**: add 2 tests in same file: `WebSignup_Returns400_OnUnknownProvider` (provider="facebook") and `WebSignup_Returns400_OnInvalidEmail`.
  - **GREEN**: add Zod-equivalent validator (FluentValidation or DataAnnotations) at endpoint.
  - **REFACTOR**: consolidate validation messages.
- **Maps to**: REQ-FN-001 (AC#1 second clause).
- **Risk covered**: R-ENDPOINT-DRIFT.
- **Expected test file**: `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs`
- **Expected impl file**: `src/BuildCv.Api/Endpoints/AuthEndpoints.cs` (validation block)

#### T-PR0-003 — RED: `/auth/web-signup` idempotency test

- **Type**: backend (integration)
- **TDD**:
  - **RED**: add `WebSignup_IsIdempotent_SameUserIdOnSecondCall`.
  - **GREEN**: rely on `IUserDataService.GetOrCreateAsync` idempotency (no new code).
  - **REFACTOR**: assert via second call without mutating the store.
- **Maps to**: REQ-FN-001 (idempotent upsert).
- **Risk covered**: Art. IX audit log hygiene.
- **Expected test file**: `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs`

#### T-PR0-004 — RED: `RevokeAllForUserAsync` unit tests (idempotency + happy path)

- **Type**: backend (unit)
- **TDD**:
  - **RED**: add 2 tests in `RefreshTokenStoreTests.cs`: `RevokeAllForUser_RemovesAllTokensForUser` and `RevokeAllForUser_IsNoOp_ForUnknownUserId`.
  - **GREEN**: implement method on `InMemoryRefreshTokenStore`.
  - **REFACTOR**: parallel implementation on `EfRefreshTokenStore` (verified by `IRefreshTokenStore` contract test).
- **Maps to**: REQ-FN-002 (AC#4).
- **Risk covered**: NFR-SEC-2 (refresh token rotation preserved).
- **Expected test file**: `tests/BuildCv.Application.UnitTests/Auth/RefreshTokenStoreTests.cs`
- **Expected impl files**: `IRefreshTokenStore.cs`, `InMemoryRefreshTokenStore.cs`, `EfRefreshTokenStore.cs`

#### T-PR0-005 — RED: bearer-only logout integration test

- **Type**: backend (integration)
- **TDD**:
  - **RED**: add `Logout_WithBearerOnlyBody_RevokesAllRefreshTokens_ForUser`. Assert: pre-seed 3 refresh tokens for `userId`; call `POST /auth/logout` with empty body + valid bearer JWT; assert all 3 are revoked (subsequent `/auth/refresh` returns 401).
  - **GREEN**: make `RefreshTokenRequest.RefreshToken` nullable; modify `LogoutHandler.HandleAsync` to extract `sub` from `ClaimsPrincipal` when body absent.
  - **REFACTOR**: dispatch logic into `LogoutHandler` with explicit body-presence check.
- **Maps to**: REQ-FN-002 (AC#2, AC#3), CR-PRIV-1.
- **Risk covered**: NFR-SEC-2 (rotation invariant preserved).
- **Expected test file**: `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs`
- **Expected impl files**: `src/BuildCv.Application/Features/Auth/LogoutHandler.cs`, `src/BuildCv.Api/Contracts/AuthContracts.cs`

#### T-PR0-006 — RED: refresh-token rotation preserved after revoke-all

- **Type**: backend (integration)
- **TDD**:
  - **RED**: add `RefreshTokenRotation_PreservedAfterRevokeAll`. Two consecutive `/auth/refresh` calls with same token: first 200, second 401.
  - **GREEN**: rely on existing `RefreshTokenHandler` (no new code; this test guards against regression).
  - **REFACTOR**: extract helpers.
- **Maps to**: NFR-SEC-2.
- **Risk covered**: R1-A (`RevokeAllForUserAsync` does NOT introduce a reuse path).
- **Expected test file**: `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs`

#### T-PR0-007 — CHORE: update OpenAPI XML doc strings + cross-repo CI doc

- **Type**: backend (docs)
- **TDD**: Not applicable (docs only; verified by `dotnet build` with `GenerateDocumentationFile=true`).
- **Maps to**: NFR-XREPO-1 (PR1 will reference these doc strings via `/scalar/v1`).
- **Expected impl file**: `src/BuildCv.Api/Endpoints/AuthEndpoints.cs` (XML doc comments).
- **Verification**: `dotnet build BuildCv.slnx -c Release` succeeds with documentation warnings as errors.

### Acceptance criteria (PR0)

- `dotnet build BuildCv.slnx -c Release` green.
- `dotnet test` green; ≥ 6 new tests pass; existing 290 tests still green.
- `POST /auth/web-signup` returns 200 + `{userId}`; second call with same `(provider, providerAccountId)` returns same `userId` (idempotent).
- `POST /auth/logout` with empty body + bearer JWT calls `RevokeAllForUserAsync(sub)` and returns `{message: "Logged out successfully"}`.
- `RevokeAllForUserAsync(unknownUserId)` is a no-op (no exception).
- OpenAPI `/scalar/v1.json` includes the new `/auth/web-signup` endpoint and the new `RevokeAllForUserAsync` schema.

### Verification commands (PR0)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-api

# Build with docs
dotnet build BuildCv.slnx -c Release

# Run all tests
dotnet test --no-build -c Release

# Specific test classes (fast feedback)
dotnet test --filter "FullyQualifiedName~AuthEndpointTests"
dotnet test --filter "FullyQualifiedName~RefreshTokenStoreTests"

# Verify OpenAPI spec contains new endpoint
dotnet run --project src/BuildCv.Api &
sleep 5
curl -sf http://localhost:5080/scalar/v1.json | jq '.paths."/api/v1/auth/web-signup".post.summary'
# Expected: "Registers or upserts a user from NextAuth provider/account data"

# Verify bearer-only logout
JWT=$(curl -sf -X POST http://localhost:5080/api/v1/auth/web-signup \
  -H 'Content-Type: application/json' \
  -d '{"provider":"google","providerAccountId":"t","email":"t@e.co","name":"T"}' | jq -r .userId)
# Then /auth/logout with empty body + bearer JWT (requires /auth/session first)
curl -sf -X POST http://localhost:5080/api/v1/auth/logout \
  -H "Authorization: Bearer $JWT" -d '' -H 'Content-Type: application/json'
# Expected: {"message":"Logged out successfully"}

# Lint + format check
dotnet format --verify-no-changes

# Constitution check (custom command)
# /constitution-check  (per root monorepo AGENTS.md)
```

### Risks covered (PR0)

- R1 (cross-repo atomic — PR1 targets this branch).
- R-ENDPOINT-DRIFT (#8 web-signup body shape).
- NFR-SEC-2 (refresh rotation preserved).
- CR-PRIV-1 (real revocation).

### Rollback plan (PR0)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-api

# Revert PR0 commits
git revert --no-edit HEAD~N..HEAD  # N = number of PR0 commits (typically 4-6)
git push origin feature/009-pr0

# Or hard reset (if not yet merged)
git reset --hard api/main
git push --force-with-lease origin feature/009-pr0

# Web PR1 (and downstream) MUST follow — see R1 in proposal §7
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web
git revert --no-edit feature/009-pr0..feature/009-pr1  # all dependent web branches
```

If PR0 is reverted on `main`, PR1 web PR becomes orphaned (no `/auth/web-signup` endpoint to call). The chain strategy mandates coordinated revert.

### Work-unit commits (PR0) — 5 commits, Spanish

1. `feat(009): [PR0] pruebas para endpoint /auth/web-signup (RED)`
2. `feat(009): [PR0] implementar WebSignupHandler y validación (GREEN)`
3. `feat(009): [PR0] refactorizar RevokeAllForUserAsync en IRefreshTokenStore (REFACTOR)`
4. `feat(009): [PR0] aceptar logout bearer-only y preservar rotación (GREEN)`
5. `chore(009): [PR0] actualizar docstrings OpenAPI + verificación final`

---

# PR1 — Web: auth adapter + contract fix

- **Objective**: Bridge NextAuth's session shape to the new backend `/auth/web-signup` endpoint, fixing the contract drift in `lib/auth.ts:46` without disturbing the rest of the web.
- **Repo**: `BuildCv-web/`
- **Branch strategy**: `feature/009-pr1` from web `main` after merging PR0 into web `main`. **Cross-repo**: PR1 targets `feature/009-pr0` if atomic merge strategy used (proposal locks this).
- **Dependencies**: PR0 (the new `/auth/web-signup` endpoint must exist).
- **LOC forecast**: ~180 (midpoint 150–200)
- **Tests forecast**: 10 (4 unit + 5 BFF integration + 1 security grep)

| Type | Count |
|---|---|
| Unit (Vitest) | 4 (`auth-adapter.test.ts`) + 3 (`auth.test.ts` updates) + 1 (security grep) |
| BFF integration (Vitest) | 5 (`route.test.ts`) |
| **Total** | **~13 (10 net-new)** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-web/lib/auth.ts` | Modify | +30 LOC: drop broken `signIn`-callback POST; add `events.signIn` hook |
| `BuildCv-web/__tests__/lib/auth.test.ts` | Modify | +~15 LOC: 3 updated/added tests (replace 1 obsolete) |
| `BuildCv-web/lib/api/auth-adapter.ts` | New | ~50 LOC: `registerWithBackend` + `AuthAdapterError` |
| `BuildCv-web/app/api/auth/web-signup/route.ts` | New | ~50 LOC: BFF POST handler |
| `BuildCv-web/__tests__/lib/api/auth-adapter.test.ts` | New | ~80 LOC: 4 tests |
| `BuildCv-web/__tests__/app/api/auth/web-signup/route.test.ts` | New | ~100 LOC: 5 tests |
| `BuildCv-web/__tests__/security/no-hardcoded-urls.test.ts` | New | ~30 LOC: 1 test (NFR-ENV-1) |
| `BuildCv-web/scripts/check-openapi-drift.ts` | New | ~50 LOC: OpenAPI drift check (NFR-XREPO-1) |
| `BuildCv-web/.env.example` | Modify | +5 LOC: clarify OAuth client IDs |
| `BuildCv-web/.github/workflows/ci.yml` | Modify | +10 LOC: add `check-openapi-drift` job |

### Tasks

#### T-PR1-001 — RED: `registerWithBackend` happy path + body shape

- **Type**: web-bff (typed port)
- **TDD**:
  - **RED**: `__tests__/lib/api/auth-adapter.test.ts` → `registerWithBackend` calls `fetch('/api/auth/web-signup', {method:'POST', body: JSON.stringify({provider, providerAccountId, email, name})})`.
  - **GREEN**: implement `lib/api/auth-adapter.ts` with `registerWithBackend(req: WebSignupRequest)`.
  - **REFACTOR**: extract `WebSignupRequest` type, error wrapping helper.
- **Maps to**: REQ-FN-003 (AC#1), NFR-XREPO-1.
- **Risk covered**: Contract drift (R-ENDPOINT-DRIFT #8), NFR-ENV-1.
- **Expected test file**: `__tests__/lib/api/auth-adapter.test.ts`
- **Expected impl file**: `lib/api/auth-adapter.ts`

#### T-PR1-002 — RED: `registerWithBackend` error mapping (401/500/network)

- **Type**: web-bff (typed port)
- **TDD**:
  - **RED**: add 3 tests asserting: 401 backend → `AuthAdapterError(status:401)`; 500 backend → `AuthAdapterError(status:502)`; network failure → `AuthAdapterError(status:503)`.
  - **GREEN**: add try/catch around fetch with status mapping.
  - **REFACTOR**: extract status-mapping table.
- **Maps to**: REQ-FN-003 (AC#3), NFR-RES-1.
- **Risk covered**: R1-A (best-effort sign-in).
- **Expected test file**: `__tests__/lib/api/auth-adapter.test.ts`

#### T-PR1-003 — RED: BFF `/api/auth/web-signup` happy path + 5s timeout

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: `__tests__/app/api/auth/web-signup/route.test.ts` → POST with valid body returns 200 + `{userId}`; `AbortController` fires after 5s.
  - **GREEN**: implement `app/api/auth/web-signup/route.ts` with Zod validation + `AbortController` + backend fetch.
  - **REFACTOR**: extract `WebSignupBodySchema` (Zod).
- **Maps to**: REQ-FN-003 (AC#1), NFR-XREPO-1.
- **Risk covered**: R1-A (slow backend doesn't block sign-in).
- **Expected test file**: `__tests__/app/api/auth/web-signup/route.test.ts`
- **Expected impl file**: `app/api/auth/web-signup/route.ts`

#### T-PR1-004 — RED: BFF error path tests (401, 400, no session, malformed JSON)

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: add 4 tests: backend 401 → BFF 502 (web does NOT silently absorb backend errors per R1-A); invalid body (missing `email`) → 400; no session → 401; malformed JSON → 400.
  - **GREEN**: add status-mapping per design §3.4 table.
  - **REFACTOR**: extract `handleBackendError` helper.
- **Maps to**: REQ-FN-003 (AC#3), NFR-RES-1.
- **Risk covered**: NFR-OBS-1 (no PII noise).
- **Expected test file**: `__tests__/app/api/auth/web-signup/route.test.ts`

#### T-PR1-005 — RED: `lib/auth.ts` signIn callback no longer posts to backend

- **Type**: auth-adapter (NextAuth integration)
- **TDD**:
  - **RED**: update `__tests__/lib/auth.test.ts:38-63` (the obsolete "signIn posts to backend" test) to assert "signIn callback does NOT call fetch against any backend path". Add 2 new tests: `events.signIn_calls_web_signup_BFF` and `events.signIn_no_ops_when_BFF_returns_5xx`.
  - **GREEN**: modify `lib/auth.ts` to drop the broken POST; add `events.signIn` hook calling `registerWithBackend`.
  - **REFACTOR**: extract `events.signIn` handler into a named function.
- **Maps to**: REQ-FN-003, REQ-FN-004 (AC#4), REQ-FN-020 (test updated, not deleted).
- **Risk covered**: R1-B (test updated not deleted per Art. VIII).
- **Expected test file**: `__tests__/lib/auth.test.ts`
- **Expected impl file**: `lib/auth.ts`

#### T-PR1-006 — RED: Google + LinkedIn OAuth providers configured

- **Type**: auth-adapter (NextAuth providers)
- **TDD**:
  - **RED**: `__tests__/lib/auth.test.ts` → add `providers_includes_google` and `providers_includes_linkedin` (already exist per existing test, verify + extend to assert `GOOGLE_CLIENT_ID`/`LINKEDIN_CLIENT_ID` env reads).
  - **GREEN**: ensure `GoogleProvider({clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET!})` and `LinkedInProvider({clientId: ..., clientSecret: ...})` in `lib/auth.ts:21-28` (already present).
  - **REFACTOR**: extract `getProviders()` helper.
- **Maps to**: REQ-FN-005, REQ-FN-006 (Q2=A), NFR-ENV-1.
- **Risk covered**: Q2 (both providers shipped).
- **Expected test file**: `__tests__/lib/auth.test.ts`
- **Expected impl file**: `lib/auth.ts`

#### T-PR1-007 — RED: Vitest grep asserts no hardcoded URLs/secrets (NFR-ENV-1)

- **Type**: security (Vitest grep)
- **TDD**:
  - **RED**: `__tests__/security/no-hardcoded-urls.test.ts` → read all `lib/auth.ts` and `lib/api/*.ts` files; assert no `https://` literal or 20+ char string appears outside type imports.
  - **GREEN**: no implementation; just assertion.
  - **REFACTOR**: extract `readSourceFiles()` helper.
- **Maps to**: NFR-ENV-1, REQ-FN-020.
- **Risk covered**: secret leakage.
- **Expected test file**: `__tests__/security/no-hardcoded-urls.test.ts`

#### T-PR1-008 — RED: OpenAPI drift check script (NFR-XREPO-1)

- **Type**: OpenAPI-CI
- **TDD**:
  - **RED**: `scripts/check-openapi-drift.ts` → fetches `https://api-dev.buildcv.com/scalar/v1.json` and asserts the BFF route schemas match expected response shapes (manual table for v0.5.1 per design §12.2).
  - **GREEN**: implement curl + JSON parse + schema comparison.
  - **REFACTOR**: extract `expectedBffContracts` table.
- **Maps to**: NFR-XREPO-1, REQ-FN-003 (R-OPENAPI-CI).
- **Risk covered**: R-OPENAPI-CI.
- **Expected impl file**: `scripts/check-openapi-drift.ts`
- **CI integration**: `.github/workflows/ci.yml` adds `pnpm tsx scripts/check-openapi-drift.ts` step.

#### T-PR1-009 — GREEN: CI job for OpenAPI drift check

- **Type**: OpenAPI-CI (workflow)
- **TDD**: Not applicable (CI config; verified by `pnpm lint` + manual workflow run).
- **Maps to**: NFR-XREPO-1.
- **Expected impl file**: `.github/workflows/ci.yml`

#### T-PR1-010 — CHORE: `.env.example` updates + final pre-flight

- **Type**: config (env docs)
- **TDD**: Not applicable; verified by `pnpm lint`.
- **Maps to**: NFR-ENV-1, R10 (two OAuth credential sets documented).
- **Expected impl file**: `.env.example`

### Acceptance criteria (PR1)

- `pnpm test` green; ≥ 10 new tests pass.
- `lib/auth.ts` no longer POSTs to `/api/v1/auth/${provider}/callback` (Vitest grep asserts 0 references).
- NextAuth `events.signIn` hook calls `/api/auth/web-signup` BFF (Vitest mocks `global.fetch`).
- Existing `__tests__/lib/auth.test.ts:38-63` test updated (not deleted) per REQ-FN-020.
- Google + LinkedIn providers configured (no hardcoded secrets).
- `scripts/check-openapi-drift.ts` runs in CI; CI fails on drift.
- `pnpm lint` + `pnpm build` + `pnpm test` all green.

### Verification commands (PR1)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

# Install + format
pnpm install --frozen-lockfile

# Lint (catches @ts-ignore, eslint-disable)
pnpm lint

# Build (TypeScript strict)
pnpm build

# Vitest
pnpm test
pnpm test -- auth-adapter
pnpm test -- auth.test
pnpm test -- web-signup
pnpm test -- no-hardcoded-urls

# Verify no references to old /callback path
grep -r "/callback" lib/ app/ __tests__/ --include="*.ts" --include="*.tsx"
# Expected: 0 matches

# OpenAPI drift check (requires backend running or remote API)
pnpm tsx scripts/check-openapi-drift.ts

# Coverage check
pnpm test:cov
# Expected: ≥90% on new files (lib/api/auth-adapter.ts, app/api/auth/web-signup/route.ts)
```

### Risks covered (PR1)

- R1 (cross-repo atomic — targets PR0 branch).
- R-ENDPOINT-DRIFT (#8 web-signup body, #1-7 verified by drift script).
- R-OPENAPI-CI (drift script).
- R1-B (test updated not deleted).
- NFR-XREPO-1, NFR-ENV-1, CR-TOK-1.

### Rollback plan (PR1)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

# Revert PR1 commits
git revert --no-edit HEAD~N..HEAD  # N ≈ 6-8 commits
git push origin feature/009-pr1

# If PR1 was already merged to web/main, revert the merge commit
git revert -m 1 <merge-commit-sha>
git push origin main
```

If PR1 is reverted, downstream PR2..PR8 cannot land (they depend on `lib/api/auth-adapter.ts` and the `events.signIn` hook).

### Work-unit commits (PR1) — 6 commits, Spanish

1. `feat(009): [PR1] pruebas para registerWithBackend y AuthAdapterError (RED)`
2. `feat(009): [PR1] implementar auth-adapter y tipar errores (GREEN)`
3. `feat(009): [PR1] BFF web-signup con Zod y timeout de 5s (GREEN)`
4. `feat(009): [PR1] reemplazar POST incorrecto en lib/auth.ts por events.signIn (GREEN)`
5. `feat(009): [PR1] script check-openapi-drift + CI job (OpenAPI-CI)`
6. `chore(009): [PR1] pruebas de no-hardcoded-urls + .env.example + verificación final`

---

# PR2 — Web: session refresh + sign-out helpers

- **Objective**: Ship `signOutAndClear()` (clears NextAuth cookie + calls the new logout BFF + clears the BFF JWT cache) and the BFF route that calls the backend `/auth/logout` with bearer-only semantics.
- **Repo**: `BuildCv-web/`
- **Branch strategy**: `feature/009-pr2` from `feature/009-pr1` (after PR1 merge to web/main + branch).
- **Dependencies**: PR1.
- **LOC forecast**: ~125 (midpoint 100–150)
- **Tests forecast**: 8 (3 unit + 5 BFF integration)

| Type | Count |
|---|---|
| Unit (Vitest) | 3 (`auth-client.test.ts`) |
| BFF integration (Vitest) | 5 (`route.test.ts`) |
| **Total** | **8** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-web/app/api/auth/logout/route.ts` | New | ~60 LOC: POST handler (best-effort) |
| `BuildCv-web/lib/auth-client.ts` | New | ~50 LOC: `signOutAndClear()` + `useAuthClient()` |
| `BuildCv-web/__tests__/lib/auth-client.test.ts` | New | ~50 LOC: 3 tests |
| `BuildCv-web/__tests__/app/api/auth/logout/route.test.ts` | New | ~120 LOC: 5 tests |

### Tasks

#### T-PR2-001 — RED: `signOutAndClear()` three-step ordering

- **Type**: session-helpers
- **TDD**:
  - **RED**: `__tests__/lib/auth-client.test.ts` → `signOutAndClear_calls_signOut_then_BFF_logout_then_clearJwtCache_inOrder`. Mock `next-auth/react` `signOut`, `global.fetch`, and `lib/api/jwt` `clearJwtCache`. Assert call order via `vi.fn()` invocation log.
  - **GREEN**: implement `signOutAndClear()` in `lib/auth-client.ts`.
  - **REFACTOR**: extract `step1SignOutNextAuth`, `step2CallBffLogout`, `step3ClearCache`.
- **Maps to**: REQ-FN-007 (AC#1), NFR-SEC-1, CR-TOK-1.
- **Risk covered**: R-LOCAL-MODE-CACHE.
- **Expected test file**: `__tests__/lib/auth-client.test.ts`
- **Expected impl file**: `lib/auth-client.ts`

#### T-PR2-002 — RED: `signOutAndClear()` best-effort on BFF 5xx

- **Type**: session-helpers
- **TDD**:
  - **RED**: add `signOutAndClear_clears_cache_even_when_BFF_returns_500`. Mock BFF returning 500; assert `clearJwtCache` STILL called (step 3 not skipped).
  - **GREEN**: wrap step 2 in try/catch; console.warn (NOT error per NFR-OBS-1 no PII).
  - **REFACTOR**: extract `tryBffLogout()` helper.
- **Maps to**: REQ-FN-007 (AC#2), NFR-OBS-1.
- **Risk covered**: R2-A (best-effort doesn't mask bugs).
- **Expected test file**: `__tests__/lib/auth-client.test.ts`
- **Expected impl file**: `lib/auth-client.ts`

#### T-PR2-003 — RED: `signOutAndClear()` no-op when no session

- **Type**: session-helpers
- **TDD**:
  - **RED**: add `signOutAndClear_is_noop_when_no_session`. Mock `useSession` returning `unauthenticated`; assert 0 network calls.
  - **GREEN**: early-return guard at function start.
  - **REFACTOR**: extract `hasActiveSession()` helper.
- **Maps to**: REQ-FN-007 (AC#3), NFR-RES-1.
- **Risk covered**: R2-A (no infinite loops).
- **Expected test file**: `__tests__/lib/auth-client.test.ts`

#### T-PR2-004 — RED: logout BFF happy path (200 from backend → 200 to client)

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: `__tests__/app/api/auth/logout/route.test.ts` → `Logout_Returns200_WhenBackendReturns200`. Mock `getServerSession` returning valid session; mock `getJwtFromSession` returning `{jwt:'t'}`; mock backend `/auth/logout` returning 200. Assert BFF returns 200.
  - **GREEN**: implement `app/api/auth/logout/route.ts` with `getServerSession` + `getJwtFromSession` + backend fetch.
  - **REFACTOR**: extract `callBackendLogout()` helper.
- **Maps to**: REQ-FN-007, NFR-SEC-2.
- **Risk covered**: cross-repo contract integrity.
- **Expected test file**: `__tests__/app/api/auth/logout/route.test.ts`
- **Expected impl file**: `app/api/auth/logout/route.ts`

#### T-PR2-005 — RED: logout BFF best-effort on backend 5xx + cache always cleared

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: add `Logout_Returns200_EvenWhenBackendReturns500_AndClearsCache`. Mock backend returning 500; mock `clearJwtCache`; assert BFF returns 200 AND cache cleared.
  - **GREEN**: try/catch around backend call; always invoke `clearJwtCache`.
  - **REFACTOR**: extract `safeClearCache()`.
- **Maps to**: REQ-FN-007 (AC#2), R-LOCAL-MODE-CACHE.
- **Risk covered**: R2-A.
- **Expected test file**: `__tests__/app/api/auth/logout/route.test.ts`

#### T-PR2-006 — RED: logout BFF no-session → 204 (no backend call)

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: add `Logout_Returns204_WhenNoSession_NoBackendCall`. Mock `getServerSession` returning null; assert BFF returns 204 AND `global.fetch` never called.
  - **GREEN**: early-return guard.
  - **REFACTOR**: extract `ensureSession()` guard.
- **Maps to**: REQ-FN-007 (AC#3), NFR-RES-1.
- **Risk covered**: retry storm (NFR-RES-1).
- **Expected test file**: `__tests__/app/api/auth/logout/route.test.ts`

#### T-PR2-007 — RED: logout BFF backend 401 → still 200 to client (cookie already cleared)

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: add `Logout_Returns200_WhenBackendReturns401_StaleToken`. Mock backend returning 401; assert BFF returns 200 (best-effort).
  - **GREEN**: catch backend 401 silently (cookie already cleared by NextAuth).
  - **REFACTOR**: extract `isBackendErrorIgnorable()` helper.
- **Maps to**: REQ-FN-007, NFR-RES-1.
- **Risk covered**: R-LOCAL-MODE-CACHE.
- **Expected test file**: `__tests__/app/api/auth/logout/route.test.ts`

#### T-PR2-008 — CHORE: verify `clearJwtCache()` export + final pre-flight

- **Type**: session-helpers (integration verification)
- **TDD**: Not applicable; manual verification step.
- **Maps to**: REQ-FN-007, CR-TOK-1.
- **Expected impl file**: `lib/api/jwt.ts` (verify `clearJwtCache` is exported; if not, add the export).

### Acceptance criteria (PR2)

- `pnpm test` green; ≥ 8 new tests pass.
- `signOutAndClear()` runs three steps in order (asserted by Vitest call-order mock).
- Best-effort semantics on backend 500 (cookie + cache cleared even if backend fails).
- No-op when no session (0 network calls).
- `pnpm lint` + `pnpm build` + `pnpm test` all green.

### Verification commands (PR2)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

pnpm lint
pnpm build
pnpm test
pnpm test -- auth-client
pnpm test -- app/api/auth/logout

# Manual integration: trigger signOutAndClear with backend down
# (backend at :5080 should be killed)
curl -sf http://localhost:5080/health/ready  # Expected: connection refused
# Browser: click "Cerrar sesión" → cookies cleared, no errors

# Coverage
pnpm test:cov
# Expected: ≥90% on lib/auth-client.ts, app/api/auth/logout/route.ts
```

### Risks covered (PR2)

- R2-A (best-effort semantics).
- R2-B (test isolation for module-level state — `vi.resetModules()`).
- R-LOCAL-MODE-CACHE.
- NFR-SEC-1, NFR-RES-1, CR-TOK-1.

### Rollback plan (PR2)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

git revert --no-edit HEAD~N..HEAD
git push origin feature/009-pr2
```

If PR2 is reverted, downstream PR4, PR6 (uses `signOutAndClear()` for ARCO Cancel) and PR7 (uses `signOutAndClear()` in UserMenu) cannot land.

### Work-unit commits (PR2) — 4 commits, Spanish

1. `feat(009): [PR2] pruebas para signOutAndClear y orden de pasos (RED)`
2. `feat(009): [PR2] implementar lib/auth-client con signOutAndClear (GREEN)`
3. `feat(009): [PR2] BFF logout con semántica best-effort (GREEN)`
4. `chore(009): [PR2] verificar export clearJwtCache + verificación final`

---

# PR3 — Web: `/privacidad` page + version selector

- **Objective**: Public route (no auth gate) at `/privacidad` that renders the privacy policy with a `<select>` for v1/v2/v3. Default selection = v3 (latest).
- **Repo**: `BuildCv-web/`
- **Branch strategy**: `feature/009-pr3` from `feature/009-pr1` (parallel to PR2).
- **Dependencies**: PR1 (uses the typed error pattern from `lib/api/auth-adapter.ts`).
- **LOC forecast**: ~175 (midpoint 150–200)
- **Tests forecast**: 9 (3 unit + 4 component + 2 page)

| Type | Count |
|---|---|
| Unit (Vitest) | 3 (`privacy.test.ts`) |
| Component (Vitest + RTL) | 4 (`privacy-policy-view.test.tsx`) |
| Page (Vitest + RTL) | 2 (`page.test.tsx`) |
| **Total** | **9** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-web/lib/api/privacy.ts` | New | ~40 LOC: `getPrivacyPolicy` + `PrivacyNotFoundError` |
| `BuildCv-web/app/api/privacy/route.ts` | New | ~40 LOC: BFF GET handler |
| `BuildCv-web/app/privacidad/page.tsx` | New | ~50 LOC: server component |
| `BuildCv-web/components/privacy/privacy-policy-view.tsx` | New | ~60 LOC: presentational |
| `BuildCv-web/components/privacy/privacy-version-selector.tsx` | New | ~30 LOC: client `<select>` |
| `BuildCv-web/lib/copy/es.ts` | Modify | +~15 LOC: `copy.privacy.*` |
| `BuildCv-web/__tests__/lib/api/privacy.test.ts` | New | ~50 LOC: 3 tests |
| `BuildCv-web/__tests__/components/privacy/privacy-policy-view.test.tsx` | New | ~80 LOC: 4 tests |
| `BuildCv-web/__tests__/app/privacidad/page.test.tsx` | New | ~30 LOC: 2 tests |

### Tasks

#### T-PR3-001 — RED: `getPrivacyPolicy` happy path v3 + v1

- **Type**: web-bff (typed port)
- **TDD**:
  - **RED**: `__tests__/lib/api/privacy.test.ts` → `getPrivacyPolicy_returns_policy_for_version_3` and `getPrivacyPolicy_returns_policy_for_version_1`. Mock `global.fetch` returning valid JSON.
  - **GREEN**: implement `lib/api/privacy.ts` with `getPrivacyPolicy(version?: number)`.
  - **REFACTOR**: extract `PrivacyPolicy` type.
- **Maps to**: REQ-FN-008, Q3=A.
- **Risk covered**: R-ENDPOINT-DRIFT #3 (privacy-policy path).
- **Expected test file**: `__tests__/lib/api/privacy.test.ts`
- **Expected impl file**: `lib/api/privacy.ts`

#### T-PR3-002 — RED: `getPrivacyPolicy` 404 throws `PrivacyNotFoundError`

- **Type**: web-bff (typed port)
- **TDD**:
  - **RED**: add `getPrivacyPolicy_throws_PrivacyNotFoundError_on_404`. Mock backend returning 404 with `version=99`. Assert typed error.
  - **GREEN**: add status check; throw `PrivacyNotFoundError(version)`.
  - **REFACTOR**: extract `parseBackendError` helper.
- **Maps to**: REQ-FN-009 (AC#4).
- **Risk covered**: typed error contract.
- **Expected test file**: `__tests__/lib/api/privacy.test.ts`

#### T-PR3-003 — RED: BFF `/api/privacy` GET with version query param

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: `__tests__/app/api/privacy/route.test.ts` (extend existing or new) → `Privacy_GET_Returns200_WithVersion` and `Privacy_GET_Returns404_WhenVersionUnknown`. Mock `global.fetch`.
  - **GREEN**: implement `app/api/privacy/route.ts` with `?version=` query parsing + Zod validation + backend fetch.
  - **REFACTOR**: extract `PrivacyQuerySchema`.
- **Maps to**: REQ-FN-008, NFR-XREPO-1.
- **Risk covered**: R3-A (SSR rate limit).
- **Expected test file**: `__tests__/app/api/privacy/route.test.ts`
- **Expected impl file**: `app/api/privacy/route.ts`

#### T-PR3-004 — RED: `<PrivacyPolicyView>` renders content + metadata + selector

- **Type**: UI component
- **TDD**:
  - **RED**: `__tests__/components/privacy/privacy-policy-view.test.tsx` → `renders_metadata_and_content_in_pre`, `renders_version_selector`, `renders_effective_date_in_footer`, `has_accessible_labeled_select` (axe-style assertion).
  - **GREEN**: implement `components/privacy/privacy-policy-view.tsx` with `<article>`, `<h1>`, `<PrivacyVersionSelector>`, `<pre>`.
  - **REFACTOR**: extract `<MetaHeader>` and `<ContentBody>`.
- **Maps to**: REQ-FN-008, REQ-FN-009, NFR-A11Y-1, CR-DLG-1.
- **Risk covered**: WCAG 2.2 §1.3.1 (Info and Relationships).
- **Expected test file**: `__tests__/components/privacy/privacy-policy-view.test.tsx`
- **Expected impl file**: `components/privacy/privacy-policy-view.tsx`

#### T-PR3-005 — RED: `<PrivacyVersionSelector>` labeled `<select>` + navigation

- **Type**: UI component (client)
- **TDD**:
  - **RED**: `__tests__/components/privacy/privacy-version-selector.test.tsx` → `renders_labeled_select_with_three_options`, `navigates_to_version_query_on_change` (mock `next/navigation` `router.push`). Assert `aria-labelledby` or `<label htmlFor>` association.
  - **GREEN**: implement `components/privacy/privacy-version-selector.tsx` with `'use client'` directive.
  - **REFACTOR**: extract `useNavigation()` helper.
- **Maps to**: REQ-FN-009 (AC#2), NFR-A11Y-1.
- **Risk covered**: Q3 (dropdown vs tabs).
- **Expected test file**: `__tests__/components/privacy/privacy-version-selector.test.tsx`
- **Expected impl file**: `components/privacy/privacy-version-selector.tsx`

#### T-PR3-006 — RED: `/privacidad` page defaults to v3 when no query param

- **Type**: page (server component)
- **TDD**:
  - **RED**: `__tests__/app/privacidad/page.test.tsx` → `page_defaults_to_version_3_when_no_query_param`. Mock `getPrivacyPolicy` to capture the argument. Assert version=3.
  - **GREEN**: implement `app/privacidad/page.tsx` reading `searchParams.version`.
  - **REFACTOR**: extract `<PrivacyPage>` helper.
- **Maps to**: REQ-FN-008 (AC#1).
- **Risk covered**: R3-A.
- **Expected test file**: `__tests__/app/privacidad/page.test.tsx`
- **Expected impl file**: `app/privacidad/page.tsx`

#### T-PR3-007 — RED: `/privacidad` page renders v1 when `?version=1`

- **Type**: page (server component)
- **TDD**:
  - **RED**: add `page_renders_version_1_when_query_param_present`. Mock `getPrivacyPolicy(1)`.
  - **GREEN**: pass `searchParams.version` (parsed) to `getPrivacyPolicy`.
  - **REFACTOR**: extract `parseVersionParam()` helper.
- **Maps to**: REQ-FN-009 (AC#2).
- **Risk covered**: query param routing.
- **Expected test file**: `__tests__/app/privacidad/page.test.tsx`

#### T-PR3-008 — RED: `/privacidad` renders `<PrivacyNotFoundError>` UI on 404

- **Type**: page (server component)
- **TDD**:
  - **RED**: add `page_renders_not_found_ui_when_backend_404`. Mock `getPrivacyPolicy` throwing `PrivacyNotFoundError`. Assert error UI with copy from `copy.privacy.notFound.*` + link back.
  - **GREEN**: wrap `getPrivacyPolicy` in try/catch.
  - **REFACTOR**: extract `<PrivacyNotFoundError>` component.
- **Maps to**: REQ-FN-009 (AC#4).
- **Risk covered**: graceful 404.
- **Expected test file**: `__tests__/app/privacidad/page.test.tsx`

#### T-PR3-009 — CHORE: copy keys + manual a11y checklist + pre-flight

- **Type**: config + manual verification
- **TDD**: Not applicable.
- **Maps to**: NFR-A11Y-1, Art. IV (honest rendering of all 3 versions).
- **Expected impl file**: `lib/copy/es.ts` (add `copy.privacy.*`).

### Acceptance criteria (PR3)

- `pnpm test` green; ≥ 9 new tests pass.
- `/privacidad` renders v3 by default.
- Selector switches to v1/v2/v3 via `?version=`.
- 404 fallback renders `<PrivacyNotFoundError>` UI with link back.
- Public route (no auth gate).
- WCAG 2.2 AA verified by component tests (label association, semantic HTML).
- `pnpm lint` + `pnpm build` + `pnpm test` all green.

### Verification commands (PR3)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

pnpm lint
pnpm build
pnpm test
pnpm test -- privacy
pnpm test -- privacidad

# Manual: navigate to /privacidad (default v3)
# Manual: select v1 → URL becomes /privacidad?version=1
# Manual: /privacidad?version=99 → error UI

# Coverage
pnpm test:cov
# Expected: ≥90% on new files
```

### Risks covered (PR3)

- R3-A (SSR rate limit — mitigated: server-side fetch, no user-IP rate limit applies).
- R3-B (markdown sanitization — mitigated: backend content is hardcoded).
- NFR-A11Y-1, Q3 (dropdown vs tabs), Art. IV.

### Rollback plan (PR3)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

git revert --no-edit HEAD~N..HEAD  # N ≈ 6-8 commits
git push origin feature/009-pr3
```

PR3 is leaf — no downstream dependency on `/privacidad`. Safe to revert independently.

### Work-unit commits (PR3) — 5 commits, Spanish

1. `feat(009): [PR3] pruebas para getPrivacyPolicy y PrivacyNotFoundError (RED)`
2. `feat(009): [PR3] BFF privacy con validación Zod (GREEN)`
3. `feat(009): [PR3] componente PrivacyPolicyView con selector accesible (GREEN)`
4. `feat(009): [PR3] página /privacidad con slot por versión (GREEN)`
5. `chore(009): [PR3] copy keys + verificación final + a11y manual`

---

# PR4 — Web: `/cuenta` page skeleton + GET user-data BFF

- **Objective**: Ship the `/cuenta` page as a stable skeleton with route guard + a "Datos personales" header section. PR5 and PR6 inject `<ConsentPanel>` and `<ArcoPanel>` respectively into placeholder slots.
- **Repo**: `BuildCv-web/`
- **Branch strategy**: `feature/009-pr4` from `feature/009-pr2` (after PR2 merge).
- **Dependencies**: PR2 (uses `lib/api/jwt.ts` patterns + session).
- **LOC forecast**: ~175 (midpoint 150–200)
- **Tests forecast**: 8 (2 unit + 3 page + 3 BFF)

| Type | Count |
|---|---|
| Unit (Vitest) | 2 (`user-data.test.ts` GET only) |
| Page (Vitest + RTL) | 3 (`page.test.tsx`) |
| BFF integration (Vitest) | 3 (`route.test.ts` GET only) |
| **Total** | **8** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-web/lib/api/user-data.ts` | New | ~50 LOC: `getUserData()` + `RateLimitError` |
| `BuildCv-web/lib/api/_utils.ts` | New | ~20 LOC: `parseRetryAfter` + `formatRetryAfter` |
| `BuildCv-web/app/api/user/data/route.ts` | New | ~60 LOC: GET handler (PUT + DELETE added in PR6) |
| `BuildCv-web/app/cuenta/page.tsx` | New | ~70 LOC: server component with route guard + 3 slots |
| `BuildCv-web/components/account/cuenta-skeleton.tsx` | New | ~40 LOC: 3 named slots |
| `BuildCv-web/components/account/datos-personales-section.tsx` | New | ~50 LOC: email/provider/createdAt/lastLoginAt |
| `BuildCv-web/lib/copy/es.ts` | Modify | +~10 LOC: `copy.account.*` |
| `BuildCv-web/__tests__/lib/api/user-data.test.ts` | New | ~50 LOC: 2 tests |
| `BuildCv-web/__tests__/app/cuenta/page.test.tsx` | New | ~80 LOC: 3 tests |
| `BuildCv-web/__tests__/app/api/user/data/route.test.ts` | New | ~80 LOC: 3 tests (GET only) |

### Tasks

#### T-PR4-001 — RED: `parseRetryAfter` + `formatRetryAfter` utilities

- **Type**: web-bff (typed util)
- **TDD**:
  - **RED**: `__tests__/lib/api/_utils.test.ts` (new) → `parseRetryAfter_handles_delta_seconds`, `parseRetryAfter_handles_http_date`, `parseRetryAfter_returns_null_on_invalid`. `formatRetryAfter_returns_locale_string`.
  - **GREEN**: implement `lib/api/_utils.ts`.
  - **REFACTOR**: extract `tryParseDate()` helper.
- **Maps to**: REQ-FN-018, NFR-RATE-1.
- **Risk covered**: NFR-RATE-1 (typed error contract).
- **Expected test file**: `__tests__/lib/api/_utils.test.ts`
- **Expected impl file**: `lib/api/_utils.ts`

#### T-PR4-002 — RED: `getUserData` happy path + `RateLimitError`

- **Type**: web-bff (typed port)
- **TDD**:
  - **RED**: `__tests__/lib/api/user-data.test.ts` → `getUserData_returns_UserDataResponse_on_200` and `getUserData_throws_RateLimitError_on_429_with_retryAfter`. Mock `global.fetch`.
  - **GREEN**: implement `lib/api/user-data.ts` with `getUserData()` + `RateLimitError`.
  - **REFACTOR**: extract `parseBackendError()` helper.
- **Maps to**: REQ-FN-010, REQ-FN-011, NFR-RATE-1.
- **Risk covered**: typed error contract.
- **Expected test file**: `__tests__/lib/api/user-data.test.ts`
- **Expected impl file**: `lib/api/user-data.ts`

#### T-PR4-003 — RED: GET BFF `/api/user/data` happy path + 429 forwarding

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: `__tests__/app/api/user/data/route.test.ts` → 3 tests: `UserData_GET_Returns200_OnSuccess`, `UserData_GET_Returns401_WhenNoSession`, `UserData_GET_Returns429_ForwardingRetryAfter`. Mock `getServerSession`, `getJwtFromSession`, `global.fetch`.
  - **GREEN**: implement `app/api/user/data/route.ts` (GET only).
  - **REFACTOR**: extract `forwardBackendResponse()` helper.
- **Maps to**: REQ-FN-011, NFR-XREPO-1, NFR-RATE-1.
- **Risk covered**: 429 forwarding contract.
- **Expected test file**: `__tests__/app/api/user/data/route.test.ts`
- **Expected impl file**: `app/api/user/data/route.ts`

#### T-PR4-004 — RED: `/cuenta` page anonymous → redirect to `/auth/signin`

- **Type**: page (server component)
- **TDD**:
  - **RED**: `__tests__/app/cuenta/page.test.tsx` → `page_redirects_to_signin_when_no_session`. Mock `getServerSession` returning null. Assert `redirect('/auth/signin?callbackUrl=/cuenta')` was called.
  - **GREEN**: implement `app/cuenta/page.tsx` with redirect guard.
  - **REFACTOR**: extract `<RouteGuard>` helper.
- **Maps to**: REQ-FN-010 (AC#1), NFR-RES-1.
- **Risk covered**: anonymous access.
- **Expected test file**: `__tests__/app/cuenta/page.test.tsx`
- **Expected impl file**: `app/cuenta/page.tsx`

#### T-PR4-005 — RED: `/cuenta` page authenticated → 3 sections render

- **Type**: page (server component)
- **TDD**:
  - **RED**: add `page_renders_three_sections_when_authenticated`. Mock session + `getUserData`. Assert sections `#datos-personales`, `#consent`, `#arco` present.
  - **GREEN**: render `<CuentaSkeleton>` with slot structure.
  - **REFACTOR**: extract `<ConsentSectionSlot>` and `<ArcoSectionSlot>` named components.
- **Maps to**: REQ-FN-010 (AC#2), R2 (slot structure stability).
- **Risk covered**: R2 (PR5/PR6 coupling).
- **Expected test file**: `__tests__/app/cuenta/page.test.tsx`
- **Expected impl file**: `app/cuenta/page.tsx` + `components/account/cuenta-skeleton.tsx`

#### T-PR4-006 — RED: `/cuenta` page renders 429 inline error on rate-limit

- **Type**: page (server component)
- **TDD**:
  - **RED**: add `page_renders_inline_429_error_when_backend_rate_limited`. Mock `getUserData` throwing `RateLimitError`. Assert error UI with formatted timestamp.
  - **GREEN**: wrap `getUserData` in try/catch; render error component.
  - **REFACTOR**: extract `<RateLimitErrorBanner>` shared component (used by PR5/PR6 too).
- **Maps to**: REQ-FN-018, NFR-RATE-1, REQ-FN-011 (AC#3).
- **Risk covered**: rate-limit UX.
- **Expected test file**: `__tests__/app/cuenta/page.test.tsx`
- **Expected impl file**: `app/cuenta/page.tsx`

#### T-PR4-007 — GREEN: `<DatosPersonalesSection>` displays email/provider/timestamps

- **Type**: UI component
- **TDD**:
  - **RED**: `__tests__/components/account/datos-personales-section.test.tsx` (new) → 3 tests: `renders_email_provider_createdAt_lastLoginAt`, `renders_loading_skeleton_when_null`, `renders_error_with_retryAfter_when_RateLimitError`.
  - **GREEN**: implement `components/account/datos-personales-section.tsx` with `<dl>` rows.
  - **REFACTOR**: extract `<FieldRow>` helper.
- **Maps to**: REQ-FN-010 (AC#2), CR-PRIV-1 (footer disclaimer).
- **Risk covered**: Art. III (no PII in logs).
- **Expected test file**: `__tests__/components/account/datos-personales-section.test.tsx`
- **Expected impl file**: `components/account/datos-personales-section.tsx`

#### T-PR4-008 — CHORE: copy keys + footer disclaimer + pre-flight

- **Type**: config + Art. III disclaimer
- **TDD**: Not applicable.
- **Maps to**: CR-PRIV-1 (footer disclaimer for in-memory caveat), Art. IV (honest copy).
- **Expected impl file**: `lib/copy/es.ts` (add `copy.account.datosPersonales.*`).

### Acceptance criteria (PR4)

- `pnpm test` green; ≥ 8 new tests pass.
- `/cuenta` redirects anonymous → `/auth/signin?callbackUrl=/cuenta`.
- Three sections render with stable `id` attributes (`#datos-personales`, `#consent`, `#arco`).
- 429 from backend surfaces `Retry-After` formatted date to page.
- Footer disclaimer present on `/cuenta` (in-memory backend caveat).
- `pnpm lint` + `pnpm build` + `pnpm test` all green.

### Verification commands (PR4)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

pnpm lint
pnpm build
pnpm test
pnpm test -- user-data
pnpm test -- cuenta

# Manual: navigate to /cuenta while signed-out → redirect to /auth/signin?callbackUrl=/cuenta
# Manual: sign in, navigate to /cuenta → 3 sections visible
# Manual: hit rate limit (10/min) → 429 inline error

# Coverage
pnpm test:cov
# Expected: ≥90% on new files
```

### Risks covered (PR4)

- R2 (slot structure stability).
- R4-A (no PII in logs).
- NFR-RATE-1, CR-PRIV-1, NFR-RES-1, NFR-XREPO-1.

### Rollback plan (PR4)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

git revert --no-edit HEAD~N..HEAD  # N ≈ 6-8 commits
git push origin feature/009-pr4
```

PR5 and PR6 depend on PR4's slot structure. If PR4 is reverted, PR5/PR6 must follow (no orphan slot components).

### Work-unit commits (PR4) — 5 commits, Spanish

1. `feat(009): [PR4] utilidades parseRetryAfter + formatRetryAfter (GREEN)`
2. `feat(009): [PR4] getUserData con RateLimitError y BFF GET (GREEN)`
3. `feat(009): [PR4] página /cuenta con route guard y slot structure (GREEN)`
4. `feat(009): [PR4] sección DatosPersonales con footer in-memory (GREEN)`
5. `chore(009): [PR4] copy keys + verificación final`

---

# PR5 — Web: consent management

- **Objective**: Build the consent grant/revoke UI on top of the `<ConsentSectionSlot>` from PR4. Ships the consent-grant modal (privacy-policy-read + checkbox gate) per Art. IX FR-053.
- **Repo**: `BuildCv-web/`
- **Branch strategy**: `feature/009-pr5` from `feature/009-pr4` (after PR4 merge).
- **Dependencies**: PR4 (consumes `<ConsentSectionSlot>`).
- **LOC forecast**: ~300 (midpoint 250–350, upper bound 350)
- **Tests forecast**: 12 (3 unit + 2 hook + 4 component + 3 modal)

| Type | Count |
|---|---|
| Unit (Vitest) | 3 (`consent.test.ts`) |
| Hook (Vitest + RTL) | 2 (`use-consent.test.ts`) |
| Component (Vitest + RTL) | 4 (`consent-panel.test.tsx`) |
| Modal (Vitest + RTL) | 3 (`consent-grant-modal.test.tsx`) |
| **Total** | **12** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-web/lib/api/consent.ts` | New | ~60 LOC: `grantConsent` + `revokeConsent` + `getConsentStatus` |
| `BuildCv-web/app/api/consent/grant/route.ts` | New | ~40 LOC: BFF POST |
| `BuildCv-web/app/api/consent/revoke/route.ts` | New | ~40 LOC: BFF POST |
| `BuildCv-web/lib/use-consent.ts` | New | ~50 LOC: hook |
| `BuildCv-web/components/account/consent-panel.tsx` | New | ~80 LOC: 2 purposes with toggle |
| `BuildCv-web/components/account/consent-grant-modal.tsx` | New | ~70 LOC: native `<dialog>` + scroll gate |
| `BuildCv-web/components/common/rate-limit-error.tsx` | New | ~25 LOC: shared inline error |
| `BuildCv-web/app/cuenta/page.tsx` | Modify | +~5 LOC: render `<ConsentPanel>` in slot |
| `BuildCv-web/lib/copy/es.ts` | Modify | +~30 LOC: `copy.consent.*` |
| `BuildCv-web/__tests__/lib/api/consent.test.ts` | New | ~60 LOC: 3 tests |
| `BuildCv-web/__tests__/lib/use-consent.test.ts` | New | ~50 LOC: 2 tests |
| `BuildCv-web/__tests__/components/account/consent-panel.test.tsx` | New | ~100 LOC: 4 tests |
| `BuildCv-web/__tests__/components/account/consent-grant-modal.test.tsx` | New | ~80 LOC: 3 tests |

### Tasks

#### T-PR5-001 — RED: `grantConsent` happy path + 429 mapping

- **Type**: web-bff (typed port)
- **TDD**:
  - **RED**: `__tests__/lib/api/consent.test.ts` → `grantConsent_returns_consentId_on_200`, `grantConsent_throws_RateLimitError_on_429`, `revokeConsent_returns_message_on_200`.
  - **GREEN**: implement `lib/api/consent.ts`.
  - **REFACTOR**: extract `parseConsentError()` helper.
- **Maps to**: REQ-FN-012, REQ-FN-018, NFR-RATE-1.
- **Risk covered**: NFR-RATE-1.
- **Expected test file**: `__tests__/lib/api/consent.test.ts`
- **Expected impl file**: `lib/api/consent.ts`

#### T-PR5-002 — RED: BFF grant + revoke POST handlers

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: `__tests__/app/api/consent/grant/route.test.ts` and `__tests__/app/api/consent/revoke/route.test.ts` (new) → happy path + 401 + 400 + 429.
  - **GREEN**: implement both routes with Zod validation + backend fetch.
  - **REFACTOR**: extract `handleConsentRequest()` shared helper.
- **Maps to**: REQ-FN-012, NFR-XREPO-1.
- **Risk covered**: BFF contract.
- **Expected test files**: `__tests__/app/api/consent/grant/route.test.ts`, `__tests__/app/api/consent/revoke/route.test.ts`
- **Expected impl files**: `app/api/consent/grant/route.ts`, `app/api/consent/revoke/route.ts`

#### T-PR5-003 — RED: `useConsent` hook initial state

- **Type**: hook
- **TDD**:
  - **RED**: `__tests__/lib/use-consent.test.ts` → `useConsent_initialState_from_server_passed_init`. Render hook with `renderHook`. Assert `purposes` = `{functional: true, analytics: false}`.
  - **GREEN**: implement `lib/use-consent.ts` with initial state from props.
  - **REFACTOR**: extract `useConsentState` reducer.
- **Maps to**: REQ-FN-012, REQ-FN-018.
- **Risk covered**: Art. VI (state in hook, not in component).
- **Expected test file**: `__tests__/lib/use-consent.test.ts`
- **Expected impl file**: `lib/use-consent.ts`

#### T-PR5-004 — RED: `useConsent` hook grant updates state

- **Type**: hook
- **TDD**:
  - **RED**: add `useConsent_grant_updates_state_after_success`. Mock `grantConsent` returning success; assert state update.
  - **GREEN**: implement `grant(purpose)` async function with optimistic update + rollback on error.
  - **REFACTOR**: extract `applyConsentChange` helper.
- **Maps to**: REQ-FN-012, REQ-FN-013.
- **Risk covered**: optimistic UI consistency.
- **Expected test file**: `__tests__/lib/use-consent.test.ts`

#### T-PR5-005 — RED: `<ConsentPanel>` renders both purposes

- **Type**: UI component
- **TDD**:
  - **RED**: `__tests__/components/account/consent-panel.test.tsx` → `renders_functional_and_analytics_rows`.
  - **GREEN**: implement `components/account/consent-panel.tsx` with 2 rows.
  - **REFACTOR**: extract `<ConsentRow>` helper.
- **Maps to**: REQ-FN-012 (AC#1), CR-CONS-1.
- **Risk covered**: Art. IV (purpose naming — no marketing).
- **Expected test file**: `__tests__/components/account/consent-panel.test.tsx`
- **Expected impl file**: `components/account/consent-panel.tsx`

#### T-PR5-006 — RED: `<ConsentPanel>` revoke is direct (no modal)

- **Type**: UI component
- **TDD**:
  - **RED**: add `revoke_click_calls_onRevoke_directly_without_opening_modal`. Click "Revocar" → assert `onRevoke` called and modal stays closed.
  - **GREEN**: revoke click handler calls `onRevoke(purpose)` directly.
  - **REFACTOR**: extract `<RevokeButton>`.
- **Maps to**: REQ-FN-012 (AC#4).
- **Risk covered**: CR-CONS-1 (revoke is reversible, no modal needed).
- **Expected test file**: `__tests__/components/account/consent-panel.test.tsx`

#### T-PR5-007 — RED: `<ConsentGrantModal>` button disabled until scroll + checkbox

- **Type**: dialog
- **TDD**:
  - **RED**: `__tests__/components/account/consent-grant-modal.test.tsx` → `disables_confirm_button_until_scroll_AND_checkbox`. Mock `contentRef.current.scrollHeight = 1000; clientHeight = 500; scrollTop = 0` → button disabled. Set `scrollTop = 501` → still disabled (checkbox). Tick checkbox → enabled.
  - **GREEN**: implement modal with ref + scroll handler + checkbox state.
  - **REFACTOR**: extract `useScrollGate()` helper.
- **Maps to**: REQ-FN-013 (AC#2, AC#3), CR-CONS-1, CR-DLG-1, NFR-A11Y-1.
- **Risk covered**: R-DECISION-VS-OBSERVER (scroll-event locked), R-DIALOG-JSDOM.
- **Expected test file**: `__tests__/components/account/consent-grant-modal.test.tsx`
- **Expected impl file**: `components/account/consent-grant-modal.tsx`

#### T-PR5-008 — RED: `<ConsentGrantModal>` confirm calls `onConfirm` and closes

- **Type**: dialog
- **TDD**:
  - **RED**: add `confirm_click_calls_onConfirm_and_closes_modal`. Click confirm → assert `onConfirm` called + `dialogRef.current.open === false`.
  - **GREEN**: wire onClick to `onConfirm` + `dialogRef.current?.close()`.
  - **REFACTOR**: extract `handleConfirm()` helper.
- **Maps to**: REQ-FN-013 (AC#3).
- **Risk covered**: focus return on close.
- **Expected test file**: `__tests__/components/account/consent-grant-modal.test.tsx`

#### T-PR5-009 — RED: `<ConsentGrantModal>` keeps modal open on 429 with inline error

- **Type**: dialog
- **TDD**:
  - **RED**: add `stays_open_and_shows_inline_rate_limit_error_on_429`. Mock `onConfirm` throwing `RateLimitError`. Assert modal still open + `<RateLimitErrorBanner>` visible with formatted timestamp.
  - **GREEN**: wrap `onConfirm` in try/catch; render `<RateLimitErrorBanner>` on failure.
  - **REFACTOR**: extract `<InlineError>` slot.
- **Maps to**: REQ-FN-013, REQ-FN-018, NFR-RATE-1.
- **Risk covered**: rate-limit UX consistency.
- **Expected test file**: `__tests__/components/account/consent-grant-modal.test.tsx`

#### T-PR5-010 — RED: `<ConsentGrantModal>` renders focus trap + Esc closes (native `<dialog>`)

- **Type**: dialog (a11y)
- **TDD**:
  - **RED**: add `renders_focus_trap_and_esc_closes`. Assert `aria-labelledby`, focus return to trigger on close, Esc dispatches `close` event.
  - **GREEN**: rely on native `<dialog>` (no manual focus trap).
  - **REFACTOR**: extract `<AccessibleDialog>` wrapper (used by PR6 + PR7 too).
- **Maps to**: NFR-A11Y-1, CR-DLG-1.
- **Risk covered**: R-DIALOG-JSDOM.
- **Expected test file**: `__tests__/components/account/consent-grant-modal.test.tsx`

#### T-PR5-011 — GREEN: wire `<ConsentPanel>` into `<ConsentSectionSlot>` in `/cuenta`

- **Type**: page wiring
- **TDD**: No new test (covered by PR4's slot test + PR5's component tests). Manual verification only.
- **Maps to**: REQ-FN-010, REQ-FN-012.
- **Risk covered**: R2 (slot coupling).
- **Expected impl file**: `app/cuenta/page.tsx` (+5 LOC)

#### T-PR5-012 — CHORE: copy keys + final pre-flight + a11y manual check

- **Type**: config + manual verification
- **TDD**: Not applicable.
- **Maps to**: Art. IV (copy review), NFR-A11Y-1.
- **Expected impl file**: `lib/copy/es.ts` (add `copy.consent.*`).

### Acceptance criteria (PR5)

- `pnpm test` green; ≥ 12 new tests pass.
- Two purposes shown (Funcional + Analytics).
- Grant modal blocks confirm until scroll-to-bottom + checkbox.
- Revoke is direct (no modal).
- 429 in modal keeps modal open with inline error.
- WCAG 2.2 AA verified (label association, focus trap, Esc).
- `pnpm lint` + `pnpm build` + `pnpm test` all green.

### Verification commands (PR5)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

pnpm lint
pnpm build
pnpm test
pnpm test -- consent
pnpm test -- use-consent

# Manual: navigate to /cuenta → see 2 rows
# Manual: click "Otorgar" on Analytics → modal opens with privacy policy
# Manual: scroll to bottom + tick checkbox → confirm button enables
# Manual: click "Revocar" on Analytics → no modal, direct call

# Coverage
pnpm test:cov
# Expected: ≥90% on new files
```

### Risks covered (PR5)

- R3 (350-LOC upper bound — split path documented below).
- R-DECISION-VS-OBSERVER.
- R-DIALOG-JSDOM.
- NFR-A11Y-1, CR-CONS-1, CR-DLG-1, Art. IV.

### Rollback plan (PR5)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

git revert --no-edit HEAD~N..HEAD  # N ≈ 6-8 commits
git push origin feature/009-pr5
```

If PR5 is reverted, the consent UI is removed but `/cuenta` still works (slot is empty).

### Split path (R3 — triggered if implementation > 350 LOC)

If during apply the implementation exceeds 350 LOC, split into:

- **PR5a — panel + BFFs + hook (~200 LOC)**:
  - T-PR5-001 (lib/api/consent.ts)
  - T-PR5-002 (2 BFF routes)
  - T-PR5-003 + T-PR5-004 (use-consent hook)
  - T-PR5-005 + T-PR5-006 (consent-panel without modal)
  - T-PR5-011 (wire into slot)
  - T-PR5-012 (copy keys)
- **PR5b — grant modal (~150 LOC)**:
  - T-PR5-007 + T-PR5-008 + T-PR5-009 + T-PR5-010 (modal with scroll gate)

PR5b targets `feature/009-pr5a` branch; final merges to main sequential.

### Work-unit commits (PR5) — 6 commits, Spanish

1. `feat(009): [PR5] getUserData grant/revoke y BFFs (GREEN)`
2. `feat(009): [PR5] hook use-consent con estado optimista (GREEN)`
3. `feat(009): [PR5] componente ConsentPanel con dos propósitos (GREEN)`
4. `feat(009): [PR5] modal ConsentGrantModal con scroll gate y checkbox (GREEN)`
5. `feat(009): [PR5] integrar ConsentPanel en slot /cuenta (GREEN)`
6. `chore(009): [PR5] copy keys + verificación final + a11y manual`

---

# PR6 — Web: ARCO request flow

- **Objective**: Build the ARCO (Access, Rectify, Cancel) UI on top of the `<ArcoSectionSlot>` from PR4. Ships the type-email-to-confirm modal for the irreversible Cancel action.
- **Repo**: `BuildCv-web/`
- **Branch strategy**: `feature/009-pr6` from `feature/009-pr4` (after PR4 merge — parallel to PR5).
- **Dependencies**: PR4 + PR2 (reuses `signOutAndClear()` for auto-sign-out on Cancel).
- **LOC forecast**: ~300 (midpoint 250–350, upper bound 350)
- **Tests forecast**: 12 (3 unit extend + 2 hook + 4 component + 3 modal)

| Type | Count |
|---|---|
| Unit (Vitest) | 3 (extend `user-data.test.ts`: rectify, delete, rectify-400) |
| Hook (Vitest + RTL) | 2 (`use-arco.test.ts`) |
| Component (Vitest + RTL) | 4 (`arco-panel.test.tsx`) |
| Modal (Vitest + RTL) | 3 (`arco-cancel-modal.test.tsx`) |
| **Total** | **12** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-web/lib/api/user-data.ts` | Modify | +~40 LOC: `rectifyUserData` + `deleteUserData` |
| `BuildCv-web/app/api/user/data/route.ts` | Modify | +~50 LOC: PUT + DELETE handlers |
| `BuildCv-web/lib/use-arco.ts` | New | ~50 LOC: hook with email-rotation detection |
| `BuildCv-web/components/account/arco-panel.tsx` | New | ~100 LOC: 3 sections (Access/Rectify/Cancel) |
| `BuildCv-web/components/account/arco-cancel-modal.tsx` | New | ~80 LOC: type-email gate |
| `BuildCv-web/app/cuenta/page.tsx` | Modify | +~5 LOC: render `<ArcoPanel>` in slot |
| `BuildCv-web/app/auth/signin/page.tsx` | Modify | +~15 LOC: email-rotated banner (R16) |
| `BuildCv-web/lib/copy/es.ts` | Modify | +~30 LOC: `copy.arco.*` |
| `BuildCv-web/__tests__/lib/api/user-data.test.ts` | Modify | +~30 LOC: +3 tests |
| `BuildCv-web/__tests__/lib/use-arco.test.ts` | New | ~50 LOC: 2 tests |
| `BuildCv-web/__tests__/components/account/arco-panel.test.tsx` | New | ~100 LOC: 4 tests |
| `BuildCv-web/__tests__/components/account/arco-cancel-modal.test.tsx` | New | ~80 LOC: 3 tests |

### Tasks

#### T-PR6-001 — RED: `rectifyUserData` + `deleteUserData` happy path

- **Type**: web-bff (typed port)
- **TDD**:
  - **RED**: extend `__tests__/lib/api/user-data.test.ts` → 2 tests: `rectifyUserData_returns_UserDataResponse_with_new_name` and `deleteUserData_returns_message_on_200`.
  - **GREEN**: extend `lib/api/user-data.ts` with `rectifyUserData` + `deleteUserData`.
  - **REFACTOR**: extract `parseUserDataError()` helper.
- **Maps to**: REQ-FN-015, REQ-FN-016, CR-ARCO-1.
- **Risk covered**: NFR-RATE-1.
- **Expected test file**: `__tests__/lib/api/user-data.test.ts`
- **Expected impl file**: `lib/api/user-data.ts`

#### T-PR6-002 — RED: `rectifyUserData` 400 → friendly error mapping

- **Type**: web-bff (typed port)
- **TDD**:
  - **RED**: add `rectifyUserData_throws_ValidationError_on_400_with_message`.
  - **GREEN**: add status mapping (400 → `ValidationError` with backend detail).
  - **REFACTOR**: extract `parseBackendStatus()` table.
- **Maps to**: REQ-FN-015, NFR-RATE-1.
- **Risk covered**: error UX consistency.
- **Expected test file**: `__tests__/lib/api/user-data.test.ts`

#### T-PR6-003 — RED: PUT + DELETE BFF handlers

- **Type**: web-bff (BFF route handler)
- **TDD**:
  - **RED**: extend `__tests__/app/api/user/data/route.test.ts` → 4 tests: PUT happy + 400 + 429, DELETE happy + 401.
  - **GREEN**: extend `app/api/user/data/route.ts` with PUT + DELETE handlers + Zod validation.
  - **REFACTOR**: extract `handleUserDataMutation()` shared helper.
- **Maps to**: REQ-FN-015, REQ-FN-016, NFR-XREPO-1.
- **Risk covered**: R-ENDPOINT-DRIFT #6 + #7 (PUT/DELETE).
- **Expected test file**: `__tests__/app/api/user/data/route.test.ts`
- **Expected impl file**: `app/api/user/data/route.ts`

#### T-PR6-004 — RED: `useArco` hook initial state + email-rotation detection

- **Type**: hook
- **TDD**:
  - **RED**: `__tests__/lib/use-arco.test.ts` → `useArco_initialState_from_userData_prop` and `useArco_rectify_detects_email_rotation_and_calls_onEmailRotated`. Mock `rectifyUserData` returning new email different from session email.
  - **GREEN**: implement `lib/use-arco.ts` with email-rotation detection.
  - **REFACTOR**: extract `useEmailRotation()` helper.
- **Maps to**: REQ-FN-015, REQ-FN-016, REQ-FN-021, R16.
- **Risk covered**: R16 (NextAuth JWT stale email).
- **Expected test file**: `__tests__/lib/use-arco.test.ts`
- **Expected impl file**: `lib/use-arco.ts`

#### T-PR6-005 — RED: `<ArcoPanel>` renders three sections

- **Type**: UI component
- **TDD**:
  - **RED**: `__tests__/components/account/arco-panel.test.tsx` → `renders_three_sections_Access_Rectify_Cancel`.
  - **GREEN**: implement `components/account/arco-panel.tsx`.
  - **REFACTOR**: extract `<ArcoAccess>`, `<ArcoRectify>`, `<ArcoCancel>`.
- **Maps to**: REQ-FN-014, REQ-FN-015, REQ-FN-016, CR-ARCO-1.
- **Risk covered**: Art. IX (all 4 ARCO rights).
- **Expected test file**: `__tests__/components/account/arco-panel.test.tsx`
- **Expected impl file**: `components/account/arco-panel.tsx`

#### T-PR6-006 — RED: `<ArcoPanel>` Access expands JSON in `<details>`

- **Type**: UI component
- **TDD**:
  - **RED**: add `access_section_expands_JSON_in_details`. Click "Ver mis datos" → assert `<details open>` with `<pre>` containing JSON.
  - **GREEN**: implement Access section with `<details>` element.
  - **REFACTOR**: extract `<JsonView>` helper.
- **Maps to**: REQ-FN-014 (AC#2), CR-ARCO-1.
- **Risk covered**: NFR-A11Y-1 (native `<details>`).
- **Expected test file**: `__tests__/components/account/arco-panel.test.tsx`

#### T-PR6-007 — RED: `<ArcoPanel>` Rectify updates name with success toast

- **Type**: UI component
- **TDD**:
  - **RED**: add `rectify_section_updates_name_with_success_toast`. Edit name, click submit → assert success toast visible + page reflects new name.
  - **GREEN**: implement Rectify form with success toast.
  - **REFACTOR**: extract `<Toast>` helper.
- **Maps to**: REQ-FN-015 (AC#3).
- **Risk covered**: error mapping.
- **Expected test file**: `__tests__/components/account/arco-panel.test.tsx`

#### T-PR6-008 — RED: `<ArcoPanel>` Cancel opens modal

- **Type**: UI component
- **TDD**:
  - **RED`: add `cancel_section_opens_modal`. Click "Eliminar mi cuenta" → assert `<ArcoCancelModal>` rendered with `open=true`.
  - **GREEN**: implement Cancel section with modal trigger.
  - **REFACTOR**: extract `<CancelButton>`.
- **Maps to**: REQ-FN-016 (AC#4).
- **Risk covered**: Art. V (double-confirmation).
- **Expected test file**: `__tests__/components/account/arco-panel.test.tsx`

#### T-PR6-009 — RED: `<ArcoCancelModal>` button disabled until email matches

- **Type**: dialog
- **TDD**:
  - **RED**: `__tests__/components/account/arco-cancel-modal.test.tsx` → `disables_confirm_until_input_matches_userEmail_case_insensitive`. Type wrong email → button disabled. Type matching email (case-insensitive) → button enabled.
  - **GREEN**: implement modal with input state + equality check.
  - **REFACTOR**: extract `useEmailConfirm()` helper.
- **Maps to**: REQ-FN-016 (AC#5), Art. V (double-confirmation), CR-ARCO-1.
- **Risk covered**: R7 (irreversible action).
- **Expected test file**: `__tests__/components/account/arco-cancel-modal.test.tsx`
- **Expected impl file**: `components/account/arco-cancel-modal.tsx`

#### T-PR6-010 — RED: `<ArcoCancelModal>` confirm calls `deleteUserData` + `signOutAndClear`

- **Type**: dialog
- **TDD**:
  - **RED`: add `confirm_calls_deleteUserData_and_signOutAndClear`. Click confirm → assert both calls in order + `router.push('/')`.
  - **GREEN**: wire onClick to `onConfirm` → `deleteUserData` + `signOutAndClear`.
  - **REFACTOR**: extract `handleCancel()` helper.
- **Maps to**: REQ-FN-016 (AC#5), R16, NFR-RES-1.
- **Risk covered**: R6-B (three-call sequencing).
- **Expected test file**: `__tests__/components/account/arco-cancel-modal.test.tsx`

#### T-PR6-011 — RED: `<ArcoCancelModal>` cancel closes (no deletion)

- **Type**: dialog
- **TDD**:
  - **RED`: add `cancel_closes_modal_without_deletion`. Click Cancel → assert `deleteUserData` NOT called + modal closed.
  - **GREEN`: wire Cancel button to `dialogRef.current?.close()`.
  - **REFACTOR`: — .
- **Maps to`: REQ-FN-016.
- **Risk covered`: a11y Esc-to-close.
- **Expected test file`: __tests__/components/account/arco-cancel-modal.test.tsx`

#### T-PR6-012 — CHORE: wire `<ArcoPanel>` into `<ArcoSectionSlot>` + email-rotated banner + pre-flight

- **Type**: page wiring + copy
- **TDD`: Not applicable; manual verification.
- **Maps to`: REQ-FN-016, REQ-FN-021, R16, Art. IV (banner copy).
- **Expected impl files`: app/cuenta/page.tsx (+5 LOC), app/auth/signin/page.tsx (+15 LOC), lib/copy/es.ts (add `copy.arco.*` + `copy.auth.emailRotatedBanner`).

### Acceptance criteria (PR6)

- `pnpm test` green; ≥ 12 new tests pass.
- Three ARCO sections render.
- Access expands JSON in `<details>`.
- Rectify updates name/email with success toast + error mapping.
- Cancel modal requires matching email (case-insensitive) + auto-sign-outs.
- Email change in Rectify auto-sign-outs + redirects to `/auth/signin?reason=email-rotated`.
- `pnpm lint` + `pnpm build` + `pnpm test` all green.

### Verification commands (PR6)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

pnpm lint
pnpm build
pnpm test
pnpm test -- arco
pnpm test -- user-data
pnpm test -- use-arco

# Manual: navigate to /cuenta → ARCO section
# Manual: click "Ver mis datos" → JSON renders
# Manual: edit name, save → success toast
# Manual: edit email, save → redirected to /auth/signin with banner
# Manual: click "Eliminar mi cuenta" → modal opens
# Manual: type wrong email → button disabled
# Manual: type correct email → button enabled, click → land on /

# Coverage
pnpm test:cov
# Expected: ≥90% on new files
```

### Risks covered (PR6)

- R4 (350-LOC upper bound — split path below).
- R6-B (three-call sequencing).
- R6-C (email rotation auto-sign-out, R16).
- R7 (irreversible action).
- CR-ARCO-1, NFR-A11Y-1, Art. IX.

### Rollback plan (PR6)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

git revert --no-edit HEAD~N..HEAD  # N ≈ 6-8 commits
git push origin feature/009-pr6
```

PR6 is leaf (no downstream dependency on ARCO UI). Safe to revert independently.

### Split path (R4 — triggered if implementation > 350 LOC)

If during apply the implementation exceeds 350 LOC, split into:

- **PR6a — Access + Rectify + BFF PUT (~200 LOC)**:
  - T-PR6-001 + T-PR6-002 (extend user-data.ts)
  - T-PR6-003 PUT handler
  - T-PR6-004 use-arco hook
  - T-PR6-005 + T-PR6-006 + T-PR6-007 (arco-panel without Cancel)
  - T-PR6-012 partial (wire into slot + email banner)
- **PR6b — Cancel + type-email modal + BFF DELETE + auto-sign-out (~150 LOC)**:
  - T-PR6-003 DELETE handler
  - T-PR6-008 + T-PR6-009 + T-PR6-010 + T-PR6-011 (cancel modal)
  - T-PR6-012 finish

PR6b targets `feature/009-pr6a` branch; final merges to main sequential.

### Work-unit commits (PR6) — 6 commits, Spanish

1. `feat(009): [PR6] extender user-data con rectify/delete y mapeo 400 (GREEN)`
2. `feat(009): [PR6] handlers PUT y DELETE en BFF user/data (GREEN)`
3. `feat(009): [PR6] hook use-arco con detección de rotación de email (GREEN)`
4. `feat(009): [PR6] componente ArcoPanel con 3 secciones (GREEN)`
5. `feat(009): [PR6] modal ArcoCancelModal con type-email gate (GREEN)`
6. `chore(009): [PR6] integrar en slot + banner email-rotated + verificación final`

---

# PR7 — Web: `<UserMenu>` component (header + sign-out wiring)

- **Objective**: Surface the auth state in the header via a `<UserMenu>` rendered into the existing `<HeaderExtras>` slot (per 019 REQ-NAV-PILL).
- **Repo**: `BuildCv-web/`
- **Branch strategy**: `feature/009-pr7` from `feature/009-pr2` (after PR2 merge — parallel to PR3, PR4).
- **Dependencies**: PR2 (consumes `signOutAndClear`).
- **LOC forecast**: ~175 (midpoint 150–200)
- **Tests forecast**: 8 (3 hook + 4 component + 1 local-mode)

| Type | Count |
|---|---|
| Hook (Vitest + RTL) | 3 (`use-user-menu.test.ts`) |
| Component (Vitest + RTL) | 4 (`user-menu.test.tsx`) |
| Integration (Vitest) | 1 (local-mode skip) |
| **Total** | **8** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-web/lib/use-user-menu.ts` | New | ~50 LOC: wraps `useSession()` |
| `BuildCv-web/components/header/user-menu.tsx` | New | ~80 LOC: presentational + native `<dialog>` |
| `BuildCv-web/app/layout.tsx` | Modify | +~5 LOC: pass `<UserMenu>` as `<SiteHeader extras>` |
| `BuildCv-web/components/landing/landing-nav.tsx` | Modify | +~10 LOC: hide "Cuenta" when authenticated |
| `BuildCv-web/lib/copy/es.ts` | Modify | +~10 LOC: `copy.userMenu.*` |
| `BuildCv-web/__tests__/lib/use-user-menu.test.ts` | New | ~50 LOC: 3 tests |
| `BuildCv-web/__tests__/components/header/user-menu.test.tsx` | New | ~100 LOC: 4 tests |
| `BuildCv-web/__tests__/local-mode-skips-user-menu.test.tsx` | New | ~30 LOC: 1 test |

### Tasks

#### T-PR7-001 — RED: `useUserMenu` loading + authenticated + unauthenticated states

- **Type**: hook
- **TDD**:
  - **RED**: `__tests__/lib/use-user-menu.test.ts` → 3 tests: `useUserMenu_returns_loading_when_session_status_loading`, `useUserMenu_returns_authenticated_with_user_data`, `useUserMenu_returns_unauthenticated_with_no_user`. Mock `next-auth/react` `useSession`.
  - **GREEN**: implement `lib/use-user-menu.ts`.
  - **REFACTOR**: extract `useSessionStatus()` helper.
- **Maps to**: REQ-FN-017, R7-A, R7-B.
- **Risk covered**: useSession race on initial render.
- **Expected test file**: `__tests__/lib/use-user-menu.test.ts`
- **Expected impl file**: `lib/use-user-menu.ts`

#### T-PR7-002 — RED: `<UserMenu>` renders avatar + email + dialog trigger

- **Type**: UI component
- **TDD**:
  - **RED**: `__tests__/components/header/user-menu.test.tsx` → `renders_avatar_initial_and_email_when_authenticated`, `dropdown_opens_to_native_dialog_on_click`. Mock `useSession` + `signOutAndClear`.
  - **GREEN**: implement `components/header/user-menu.tsx` with avatar + email + `<dialog>`.
  - **REFACTOR**: extract `<AvatarInitial>` helper.
- **Maps to**: REQ-FN-017 (AC#1), NFR-A11Y-1, CR-DLG-1.
- **Risk covered**: R-DIALOG-JSDOM.
- **Expected test file**: `__tests__/components/header/user-menu.test.tsx`
- **Expected impl file**: `components/header/user-menu.tsx`

#### T-PR7-003 — RED: `<UserMenu>` "Mi cuenta" links to `/cuenta`

- **Type**: UI component
- **TDD**:
  - **RED**: add `mi_cuenta_link_navigates_to_cuenta`. Assert `<Link href="/cuenta">` rendered inside dialog.
  - **GREEN**: add `<Link role="menuitem" href="/cuenta">Mi cuenta</Link>`.
  - **REFACTOR**: extract `<MenuLink>` helper.
- **Maps to**: REQ-FN-017 (AC#1).
- **Risk covered**: a11y `role="menu"`.
- **Expected test file**: `__tests__/components/header/user-menu.test.tsx`

#### T-PR7-004 — RED: `<UserMenu>` "Cerrar sesión" calls `signOutAndClear`

- **Type**: UI component
- **TDD**:
  - **RED`: add `sign_out_button_calls_signOutAndClear`. Click "Cerrar sesión" → assert `signOutAndClear` called.
  - **GREEN`: wire onClick to `signOutAndClear()`.
  - **REFACTOR`: — .
- **Maps to`: REQ-FN-017 (AC#4).
- **Risk covered`: R-LOCAL-MODE-CACHE.
- **Expected test file`: __tests__/components/header/user-menu.test.tsx`

#### T-PR7-005 — RED: `<UserMenu>` renders "Iniciar sesión" link when unauthenticated

- **Type`: UI component
- **TDD`: 
  - **RED`: add `renders_signin_link_when_unauthenticated`. Mock `useSession` returning `unauthenticated`. Assert `<a href="/auth/signin">Iniciar sesión</a>`.
  - **GREEN`: add unauthenticated branch.
  - **REFACTOR`: — .
- **Maps to`: REQ-FN-017 (AC#2), Art. VII (anonymous user still has CTA).
- **Risk covered`: R7-B.
- **Expected test file`: __tests__/components/header/user-menu.test.tsx`

#### T-PR7-006 — RED: `<UserMenu>` renders `null` when `IS_LOCAL === true`

- **Type`: integration (Art. VII)
- **TDD`: 
  - **RED`: __tests__/local-mode-skips-user-menu.test.tsx → `renders_null_when_IS_LOCAL_true`. Mock `process.env.NEXT_PUBLIC_LOCAL_MODE = 'true'`. Render `<UserMenu>` → assert container is empty.
  - **GREEN`: add early-return guard `if (IS_LOCAL) return null;`.
  - **REFACTOR`: — .
- **Maps to`: REQ-FN-017 (AC#3), Art. VII.
- **Risk covered`: local-mode bypass.
- **Expected test file`: __tests__/local-mode-skips-user-menu.test.tsx`

#### T-PR7-007 — GREEN: wire `<UserMenu>` into `<SiteHeader extras>` + hide `<LandingNav>` Cuenta when authenticated

- **Type`: page wiring
- **TDD`: Not applicable (manual verification).
- **Maps to`: REQ-FN-017 (AC#2).
- **Risk covered`: R7-A (`<LandingNav>` stays presentational).
- **Expected impl files`: app/layout.tsx (+5), components/landing/landing-nav.tsx (+10).

#### T-PR7-008 — CHORE: copy keys + manual a11y checklist + pre-flight

- **Type`: config + manual verification
- **TDD`: Not applicable.
- **Maps to`: Art. IV (copy review), NFR-A11Y-1.
- **Expected impl file`: lib/copy/es.ts (add `copy.userMenu.*`).

### Acceptance criteria (PR7)

- `pnpm test` green; ≥ 8 new tests pass.
- `<UserMenu>` renders in `<HeaderExtras>` slot.
- Three states render correctly (loading/auth/anon).
- Native `<dialog>` with focus trap + Esc + focus return.
- Local mode renders `null` (no flicker).
- `<LandingNav>` "Cuenta" hidden when authenticated.
- `pnpm lint` + `pnpm build` + `pnpm test` all green.

### Verification commands (PR7)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

pnpm lint
pnpm build
pnpm test
pnpm test -- user-menu
pnpm test -- use-user-menu
pnpm test -- local-mode

# Manual: sign in → avatar + email in header → click → dialog opens with "Mi cuenta" + "Cerrar sesión"
# Manual: sign out → "Iniciar sesión" link
# Manual: local mode (NEXT_PUBLIC_LOCAL_MODE=true) → no UserMenu rendered

# Coverage
pnpm test:cov
# Expected: ≥90% on new files
```

### Risks covered (PR7)

- R7-A (`<LandingNav>` stays presentational via `useSessionStatus()` wrapper).
- R7-B (no CLS via `min-h-16` skeleton).
- R-DIALOG-JSDOM.
- R-LOCAL-MODE-CACHE.
- NFR-A11Y-1, CR-DLG-1, Art. VII.

### Rollback plan (PR7)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

git revert --no-edit HEAD~N..HEAD  # N ≈ 6-8 commits
git push origin feature/009-pr7
```

PR7 is leaf (no downstream dependency on UserMenu). Safe to revert independently.

### Work-unit commits (PR7) — 4 commits, Spanish

1. `feat(009): [PR7] hook use-user-menu con tres estados (GREEN)`
2. `feat(009): [PR7] componente UserMenu con dialog nativo (GREEN)`
3. `feat(009): [PR7] integrar UserMenu en SiteHeader extras y ocultar Cuenta (GREEN)`
4. `chore(009): [PR7] copy keys + verificación final + a11y manual`

---

# PR8 — Web: E2E + accessibility hardening

- **Objective**: Ship the full end-to-end Playwright suite + `@axe-core/playwright` accessibility audits + Lighthouse gates. Final hardening pass before the change is archiveable.
- **Repo**: `BuildCv-web/`
- **Branch strategy**: `feature/009-pr8` from `feature/009-pr7` (after PR7 merge — chain terminal).
- **Dependencies**: PR0–PR7 (full chain).
- **LOC forecast**: ~250 (midpoint 200–300)
- **Tests forecast**: 15+ scenarios across 4 e2e spec files + 1 unit test

| Type | Count |
|---|---|
| E2E (Playwright) | 6 (`account-flow`) + 3 (`privacy-policy`) + 3 (`user-menu`) + 3 (`a11y-flow`) + 2 (extend `auth-flow`) = 17 scenarios |
| Unit (Vitest) | 1 (`rate-limit-ux.test.ts`) |
| **Total** | **~18 (15 net-new)** |

### Files expected

| File | Action | Scope |
|---|---|---|
| `BuildCv-web/e2e/account-flow.spec.ts` | New | ~120 LOC: 6 scenarios |
| `BuildCv-web/e2e/privacy-policy.spec.ts` | New | ~50 LOC: 3 scenarios |
| `BuildCv-web/e2e/user-menu.spec.ts` | New | ~50 LOC: 3 scenarios |
| `BuildCv-web/e2e/a11y-flow.spec.ts` | New | ~80 LOC: 3 scenarios (axe + Lighthouse) |
| `BuildCv-web/e2e/auth-flow.spec.ts` | Modify | +~20 LOC: +2 scenarios (privacy + rate-limit UX) |
| `BuildCv-web/__tests__/e2e/rate-limit-ux.test.ts` | New | ~30 LOC: 1 unit test |
| `BuildCv-web/scripts/check-openapi-drift.ts` | Modify | +~10 LOC: extend to all 11 endpoints (PR1 shipped 4) |

### Tasks

#### T-PR8-001 — RED: `e2e/account-flow.spec.ts` happy path (6 scenarios)

- **Type**: e2e
- **TDD**:
  - **RED**: write 6 scenarios in `e2e/account-flow.spec.ts`:
    1. Sign in via mock NextAuth cookie → land on `/cuenta`
    2. Grant analytics consent → modal flow
    3. View user data via ARCO Access → JSON expands
    4. Rectify name → success toast
    5. Open ARCO Cancel modal → type wrong email → button disabled
    6. Type matching email → confirm → land on `/`
  - **GREEN**: run `pnpm test:e2e -- account-flow`. All 6 must pass.
  - **REFACTOR**: extract helpers (`signInViaMockCookie`, `expectDialogOpen`, `expectCookiesCleared`).
- **Maps to**: REQ-FN-019 (AC#1), NFR-A11Y-1.
- **Risk covered**: R5 (e2e density).
- **Expected test file**: `e2e/account-flow.spec.ts`

#### T-PR8-002 — RED: `e2e/privacy-policy.spec.ts` (3 scenarios)

- **Type**: e2e
- **TDD**:
  - **RED**: write 3 scenarios:
    1. `/privacidad` renders v3 by default
    2. Selector switches to v2 → URL becomes `?version=2`
    3. Anonymous access works (no auth gate)
  - **GREEN**: run `pnpm test:e2e -- privacy-policy`. All 3 pass.
  - **REFACTOR**: extract `selectVersion(N)` helper.
- **Maps to**: REQ-FN-019, REQ-FN-008, REQ-FN-009.
- **Risk covered**: WCAG a11y on `<select>`.
- **Expected test file**: `e2e/privacy-policy.spec.ts`

#### T-PR8-003 — RED: `e2e/user-menu.spec.ts` (3 scenarios)

- **Type**: e2e
- **TDD**:
  - **RED**: write 3 scenarios:
    1. Authenticated header shows `<UserMenu>`
    2. Dropdown opens to native `<dialog>` with focus trap
    3. Sign-out clears NextAuth cookie + BFF cache + redirects to `/`
  - **GREEN**: run `pnpm test:e2e -- user-menu`. All 3 pass.
  - **REFACTOR**: extract `expectDialogFocusTrap()` helper.
- **Maps to**: REQ-FN-017, REQ-FN-019, CR-DLG-1.
- **Risk covered**: R-DIALOG-JSDOM (real Chromium).
- **Expected test file**: `e2e/user-menu.spec.ts`

#### T-PR8-004 — RED: `e2e/a11y-flow.spec.ts` axe-core + Lighthouse (3 scenarios)

- **Type**: e2e (a11y)
- **TDD**:
  - **RED**: write 3 scenarios:
    1. `@axe-core/playwright` audits `/cuenta` → 0 serious/critical violations
    2. `@axe-core/playwright` audits `/privacidad` → 0 serious/critical violations
    3. Lighthouse Accessibility ≥ 95 on the 3 audited routes (run via Playwright `lighthouse` CLI)
  - **GREEN**: install `@axe-core/playwright` if not already (cross-repo dev dep). Run audits.
  - **REFACTOR**: extract `expectAxeClean(page, path)` helper.
- **Maps to**: REQ-FN-019 (AC#2, AC#3), NFR-A11Y-1, R5.
- **Risk covered**: R5 (Lighthouse hard gate).
- **Expected test file**: `e2e/a11y-flow.spec.ts`

#### T-PR8-005 — RED: `__tests__/e2e/rate-limit-ux.test.ts` unit test for inline error

- **Type**: unit (Vitest)
- **TDD**:
  - **RED**: add 1 test asserting that `<RateLimitErrorBanner>` renders "Demasiadas solicitudes. Reintentá en <formatted date>." with formatted `Retry-After`.
  - **GREEN**: rely on PR4's `<RateLimitErrorBanner>` component.
  - **REFACTOR**: — .
- **Maps to**: REQ-FN-018, NFR-RATE-1.
- **Risk covered**: Art. IV (honest timestamp copy).
- **Expected test file**: `__tests__/e2e/rate-limit-ux.test.ts`

#### T-PR8-006 — RED: extend `e2e/auth-flow.spec.ts` (+2 scenarios)

- **Type**: e2e (regression)
- **TDD**:
  - **RED**: add 2 scenarios:
    1. Privacy policy renders v3 (sanity check from landing → `/privacidad`)
    2. Rate-limit UX on 429 shows formatted `Retry-After` timestamp (mock backend 429)
  - **GREEN**: run `pnpm test:e2e -- auth-flow`. All 6 (4 existing + 2 new) pass.
  - **REFACTOR**: — .
- **Maps to**: REQ-FN-018, REQ-FN-019.
- **Risk covered**: rate-limit UX consistency.
- **Expected test file**: `e2e/auth-flow.spec.ts`

#### T-PR8-007 — GREEN: extend OpenAPI drift check to all 11 endpoints

- **Type**: OpenAPI-CI
- **TDD**: Not applicable; verify by `pnpm tsx scripts/check-openapi-drift.ts` exit 0.
- **Maps to**: NFR-XREPO-1.
- **Risk covered**: R-OPENAPI-CI.
- **Expected impl file**: `scripts/check-openapi-drift.ts`

#### T-PR8-008 — GREEN: install + configure `@axe-core/playwright` + Lighthouse runner

- **Type**: dev dependencies + config
- **TDD**: Not applicable; verified by `pnpm test:e2e -- a11y-flow`.
- **Maps to**: NFR-A11Y-1.
- **Risk covered**: R8-B (Lighthouse hard gate).
- **Expected impl file**: `package.json` (+2 dev deps), `playwright.config.ts` (+Lighthouse hook)

#### T-PR8-009 — CHORE: full CI gate verification + INDEX sync + pre-flight

- **Type**: ops + docs
- **TDD`: Not applicable.
- **Maps to`: Art. VIII (full gates), proposal §5 (success criteria).
- **Verification`: run all 6 gates below.

### Acceptance criteria (PR8)

- `pnpm test:e2e` green; ≥ 15 new scenarios pass across 4 spec files.
- Lighthouse Accessibility ≥ 95 on `/cuenta`, `/privacidad`, `/auth/signin`.
- `@axe-core/playwright` reports zero `serious`/`critical` violations on those routes.
- Rate-limit UX tested in 1 unit + 1 e2e scenario.
- `pnpm lint` + `pnpm build` + `pnpm test` + `pnpm test:e2e` all green.

### Verification commands (PR8)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

# Full CI gate (all 6)
pnpm lint
pnpm build
pnpm test
pnpm test:cov  # ≥90% on new files
pnpm test:e2e --retries=2
pnpm tsx scripts/check-openapi-drift.ts

# A11y gate
pnpm test:e2e -- a11y-flow

# Lighthouse gate (via a11y-flow spec)
pnpm test:e2e -- a11y-flow --grep "@lighthouse"

# Full e2e
pnpm test:e2e
```

### Risks covered (PR8)

- R5 (e2e density — split path below).
- R8-B (Lighthouse hard gate).
- R8-C (OAuth e2e — cookie-injection pattern).
- R-OPENAPI-CI.
- NFR-A11Y-1, NFR-RATE-1, Art. VII, Art. VIII.

### Rollback plan (PR8)

```bash
cd /home/mackroph/Dev/portfolio/buildCV/BuildCv-web

git revert --no-edit HEAD~N..HEAD  # N ≈ 6-8 commits
git push origin feature/009-pr8
```

PR8 is leaf (chain terminal). Safe to revert independently.

### Split path (R5 — triggered if any e2e spec > 120 LOC)

If during apply any of `account-flow.spec.ts`, `privacy-policy.spec.ts`, `user-menu.spec.ts`, `a11y-flow.spec.ts` exceeds 120 LOC, split into:

- **PR8a — happy-path e2e (~150 LOC)**:
  - `account-flow.spec.ts` first 4 scenarios (sign-in → grant → access → rectify)
  - `privacy-policy.spec.ts` (3 scenarios)
  - `user-menu.spec.ts` (3 scenarios)
- **PR8b — a11y + edge e2e (~120 LOC)**:
  - `account-flow.spec.ts` last 2 scenarios (cancel flow)
  - `a11y-flow.spec.ts` (3 scenarios)
  - Extend `auth-flow.spec.ts` (+2 scenarios)

PR8b targets `feature/009-pr8a` branch; final merges to main sequential.

### Work-unit commits (PR8) — 5 commits, Spanish

1. `feat(009): [PR8] e2e account-flow con flujo completo (GREEN)`
2. `feat(009): [PR8] e2e privacy-policy + user-menu (GREEN)`
3. `feat(009): [PR8] e2e a11y-flow con axe-core y Lighthouse (GREEN)`
4. `feat(009): [PR8] extender OpenAPI drift a 11 endpoints (GREEN)`
5. `chore(009): [PR8] verificación final: lint + build + test + test:e2e + lighthouse`

---

# Verification per PR (recap)

All PRs MUST pass these gates before merge:

| Gate | Command |
|---|---|
| unit tests (Vitest) | `pnpm test` |
| integration/BFF tests (Vitest + MSW) | `pnpm test -- "app/api/.*/route.test"` |
| affected e2e (Playwright) | `pnpm test:e2e -- <spec>` |
| a11y (axe-core) | `pnpm test:e2e -- a11y-flow` (PR8) · manual checklist in PR3, PR5, PR6, PR7 |
| typecheck (TypeScript strict) | `pnpm tsc --noEmit` (implicit in `pnpm build`) |
| lint (ESLint flat config) | `pnpm lint` |
| build (Next.js) | `pnpm build` |
| backend build (PR0) | `dotnet build BuildCv.slnx -c Release` |
| backend tests (PR0) | `dotnet test --no-build -c Release` |
| backend lint (PR0) | `dotnet format --verify-no-changes` |
| OpenAPI drift (PR1, PR8) | `pnpm tsx scripts/check-openapi-drift.ts` |

**Coverage target**: ≥ 90% statements/branches on every NEW file (`pnpm test:cov`).

---

# Workload forecast — final tally

| PR | Repo | Tasks | LOC | Tests |
|---|---|---|---|---|
| PR0 | api | 7 | ~100 | 6 |
| PR1 | web | 10 | ~180 | 10 |
| PR2 | web | 8 | ~125 | 8 |
| PR3 | web | 9 | ~175 | 9 |
| PR4 | web | 8 | ~175 | 8 |
| PR5 | web | 12 | ~300 | 12 |
| PR6 | web | 12 | ~300 | 12 |
| PR7 | web | 8 | ~175 | 8 |
| PR8 | web | 9 | ~250 | 15 |
| **Total** | | **83** | **~1,780** | **~88** |

**Per-PR LOC**: every PR ≤ 350 ✅
**Total LOC**: ~1,780 EXCEEDS 400 ✅ (strategy is chained PRs)
**Total tasks**: 83 (target 50-80; slightly over but within breakdown target ~85)
**Risks covered**: 11/11 ✅ (R1, R2, R3, R4, R5, R16 + 5 design-time risks)
**Split paths documented**: PR5a/PR5b ✅, PR6a/PR6b ✅, PR8a/PR8b ✅
**Canonical paths enforced**: 8/8 ✅ (audit pass)

---

# Recommendation

**Ready for sdd-apply: Y**

**Reasoning**:
- 9-PR chain locked in `proposal.md` §2 and `design.md` §12; no decision needed.
- All 21 REQs + 8 NFRs + 6 Compliance Requirements traced in `design.md` §15.
- Every PR ≤ 350 LOC; total ~1,780 LOC, well-distributed.
- Work-unit commits per PR documented (4-6 each, Spanish, no AI attribution).
- RED→GREEN→REFACTOR TDD cycle documented per task with file paths + expected test files.
- Risks + rollback plans + split paths documented per PR.
- Cross-repo atomicity (PR0 → PR1) managed via `feature-branch-chain` strategy.
- **Note**: orchestrator will run Review Workload Guard per cached ask-always strategy — chain strategy is LOCKED, no ask needed.

---

# Next phase

→ **`sdd-apply`** with PR0 first (api, chain root), then PR1–PR8 (web).
