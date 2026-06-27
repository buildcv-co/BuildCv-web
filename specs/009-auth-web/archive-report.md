# Archive Report — 009-auth-web

## 1. Summary

- **change**: `009-auth-web`
- **final status**: SHIPPED + ARCHIVED
- **verify verdict**: `PASS_WITH_NOTES`
- **MVP_BLOCKER**: 0
- **SHOULD_FIX_BEFORE_LAUNCH**: 0
- **READY_FOR_TAG**: yes
- **tag target**: SHIP commits cross-repo — web `9f71e9f`, api `66fcaf1`
- **tag name**: `009-auth-web-v1.0`

## 2. Shipped Scope

Cross-repo scope shipped as part of change `009-auth-web`:

- PR0 api initial auth + Patch A: `POST /api/v1/auth/web-signup`, `IRefreshTokenStore.RevokeAllForUserAsync`, bearer-only logout, and `BffCredentialFilter` with `X-BFF-Key`.
- PR0 hardening api: logout 401, missing `providerAccountId` test, and email regex hardening. 7 new tests. NET +16 LOC.
- PR1 web auth adapter + contract fix + BFF `/api/auth/web-signup`.
- PR2 web 3 BFF routes `/api/auth/{session,refresh,logout}` + helpers. NET 417 LOC.
- PR4 web `/cuenta` skeleton + BFF `/api/user/data` GET + 4 components. NET 714 LOC.
- PR6a web BFF PUT/DELETE `/api/user/data` + `lib/use-arco.ts` (R16 email-rotation). NET 254 LOC.
- PR6b web `<ArcoPanel>` + `<ArcoCancelModal>` (type-email-to-confirm) + types. NET 449 LOC.
- PR7 web `<UserMenu>` + `useUserMenu` + site-header integration.
- PR8 web e2e (16 tests) + in-house a11y + `scripts/check-endpoint-drift.mjs` + CI step.
- PR8 NIT cleanup web: unused `MOCK_USER` import removed.
- Verify-fixes batch web: typecheck drift + ARCO cancel redirect fix in `app/auth/signin/page.tsx:15-17`. 4 commits on the feature branch + 1 merge commit.

## 3. Commits Archived

- **BuildCv-web SHIP commit**: `9f71e9f788f59f0fdc687b71d2b70629145eb1ad` — `merge: integrar fixes de verify 009-auth-web en web`.
- **BuildCv-api SHIP commit**: `66fcaf1a13d511eb088ae93443f255c376459ebf` — `merge: integrar hardening PR0 de 009-auth-web en api`.
- **Archive commit**: pending at report creation; created by this archive flow.
- **Tag target**: SHIP commit, not archive commit.
- **Local commit existence**: confirmed with `git rev-parse` during archive preflight for both SHIP commits.

## 4. Verification Evidence

Summary from `verify-report.md`:

- Verdict: `PASS_WITH_NOTES`.
- BLOCKER 0, MAJOR 0, MINOR 0; residual NITs documented.
- Gates passing:
  - `pnpm lint`: 0 warnings.
  - `pnpm typecheck`: 0 errors.
  - `pnpm test`: 1134/1134 unit/component/integration tests.
  - `pnpm build`: success.
  - `pnpm exec playwright e2e`: 11/16 passed (5 local-mode skips pre-existing).
  - Critical test `Arco_CancelConfirmSignsOut`: PASS.
  - `node scripts/check-endpoint-drift.mjs`: PASS (Web canonical / Backend canonical / Web forbidden: PASS).
  - `dotnet format --verify-no-changes`: PASS (api not touched by verify-fixes).
  - `dotnet build BuildCv.slnx -c Release`: PASS (api not touched by verify-fixes).
  - Auth / Logout / Web-Signup API tests: PASS (api not touched by verify-fixes).
  - Domain purity check api: PASS (no Domain refs to AspNetCore / EF / MediatR).
- No endpoint drift.
- No secret, token, header, or PII leak.
- 0 false mocks, 0 suppressions introduced.

## 5. Deferred Post-MVP

Explicit `SAFE_DEFER_POST_MVP` items:

1. **PR3 `/privacidad`** — privacy policy UI page; privacy v3 backend shipped (effective 2026-06-25), UI is not blocking for MVP.
2. **PR5 consent UI** — consent purposes (`functional`, `analytics`) management in `/cuenta`; placeholder slot shipped in PR4.
3. **OpenAPI polish** — drift gate catches surface-level drift; full OpenAPI client regeneration deferred.
4. **`_providerKeyMap` bug pre-existing** — internal NextAuth adapter legacy mapping; does not block MVP.
5. **T-PR0-007 tracking gap** — analytics event for web-signup; no business critical path.
6. **axe-core/Lighthouse upgrade** — in-house a11y sufficient for MVP (PR8); CI upgrade deferred post-launch.
7. **Full e2e CI expansion** — current e2e uses default local mode (`NEXT_PUBLIC_LOCAL_MODE=true`); CI with `NEXT_PUBLIC_LOCAL_MODE=false` deferred.

## 6. Risks & Accepted Deviations

- **PR2 size deviation** accepted: +99 LOC over cap 350, within formal 400 budget, documented justification.
- **PR4 size deviation** accepted: +364 LOC; 4 accepted deviations via fresh review: `SIZE_DEVIATION`, `SLOT_PLACEHOLDERS`, `SHARED_UTILS`, `COPY_EXPANSION`.
- **PR6 split process deviation** accepted post-facto: sub-agent split PR6 autonomously; user accepted.
- **PR6b size deviation** accepted: +99 LOC over cap.
- **PR8 workers:1 stabilization** accepted as a root-cause fix for e2e flake caused by shared mutable mock backend state.
- **Verify-fixes typecheck drift fixed**: accumulated fixtures/tests drift, not a direct PR8 regression.
- **Verify-fixes ARCO cancel redirect fixed**: `app/auth/signin/page.tsx` local-mode redirect previously overwrote the `reason` query param.
- **Residual NITs**:
  - Broad grep allowlist hits in tests/comments/scripts are non-blocking and documented; `check-endpoint-drift.mjs` is authoritative.
  - `useArco.cancel()` caveat is pre-existing: it can navigate even if DELETE ARCO fails because it does not propagate the error. Not fixed pre-launch.

## 7. Rollback / Follow-up

### Rollback high-level

- Revert `BuildCv-web` main to the previous pre-009 tag/commit (pre-009, `d33bebf^` or the tag before the first 009 merge) if a critical post-launch regression appears.
- Revert `BuildCv-api` main to the commit before PR0 (before `6fcc2ac`) if a critical api regression appears.
- If rolling back api below PR0, re-apply PR0 hardening (`66fcaf1`) afterward as needed to keep the endpoint drift gate green for the web change.

### Follow-up backlog (not started)

- PR3 `/privacidad`
- PR5 consent UI
- 010-payments-web (api backend already shipped; frontend remains)
- 020-a11y-automated-audit
- `_providerKeyMap` bug fix
- T-PR0-007 tracking gap closure
- axe-core/Lighthouse upgrade + full e2e CI

## 8. Final Recommendation

- **archived**: yes
- **tag final**: yes — cross-repo on SHIP commits
- **next change recommended**: 010-payments-web (complete frontend for the already-shipped backend payment flow) or 020-a11y-automated-audit (strengthen accessibility gates), depending on user priority. A deploy/manual smoke MVP pass is also valid before taking more changes.
