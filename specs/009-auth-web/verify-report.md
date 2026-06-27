# Verification Report — 009-auth-web

**Date**: 2026-06-27  
**Change**: `009-auth-web`  
**Mode**: focused re-verify after verify-fixes branch  
**Verdict**: `PASS_WITH_NOTES`  
**Archive readiness**: ✅ Ready for `sdd-archive`  
**Tag readiness**: ✅ Ready after archive, per project rule  

---

## Summary

The first verification pass found two blocking web findings. Both are now closed on branch `feature/009-auth-web-verify-fixes`:

1. `pnpm typecheck` failed with 7 TypeScript errors in tests/fixtures.
2. `Arco_CancelConfirmSignsOut` redirected to `/analizar` instead of `/auth/signin?reason=arco-cancel`.

Verified repository baselines:

- `BuildCv-web` source baseline: `main` at `d33bebfcf4f5960aafa7e984ea044b7e7f8f4dd9`.
- `BuildCv-api` source baseline: `main` at `66fcaf1a13d511eb088ae93443f255c376459ebf`.
- `BuildCv-api` was not modified in this verify-fixes batch.

---

## Scope Verified

Merged PR chain already verified in the first pass:

1. PR0 backend auth prep.
2. PR1 web auth adapter / web-signup.
3. PR2 sign-out / logout BFF.
4. PR3 privacy page intentionally deferred post-MVP.
5. PR4 account page + user-data BFF.
6. PR5 consent UI intentionally deferred post-MVP.
7. PR6 ARCO hooks and BFF user data mutations.
8. PR6b ARCO UI and cancel modal.
9. PR7 UserMenu/header integration.
10. PR8 E2E/a11y/endpoint-drift hardening + NIT cleanup.

Verify-fixes applied in this branch:

- `fix(test): corregir tipos de fixtures PR8` — strict TypeScript fixture repair.
- `fix(arco): redirigir cancelación a signin` — local-mode sign-in redirect exception for reasoned post-sign-out flows.

---

## Requirements Coverage

| Requirement | State | Evidence |
|---|---:|---|
| REQ-FN-001 Backend `/auth/web-signup` | PASS | Previously merged API PR0; API untouched in verify-fixes. |
| REQ-FN-002 Backend bearer-only logout | PASS | Previously merged API PR0; web logout BFF remains unchanged. |
| REQ-FN-003 Web auth adapter | PASS | Unit suite 1134/1134 and endpoint drift pass. |
| REQ-FN-004 Contract drift fix | PASS | Endpoint drift script passes. |
| REQ-FN-005 Google provider | PASS | Existing auth tests pass. |
| REQ-FN-006 LinkedIn provider | PASS | Existing auth tests pass. |
| REQ-FN-007 Sign-out helpers | PASS | Existing sign-out tests pass; focused UserMenu E2E passed where enabled. |
| REQ-FN-008 `/privacidad` page | DEFERRED_POST_MVP | PR3 intentionally deferred. |
| REQ-FN-009 Privacy selector | DEFERRED_POST_MVP | PR3 intentionally deferred. |
| REQ-FN-010 `/cuenta` route guard + skeleton | PASS | `account-flow.spec.ts` focused suite passed. |
| REQ-FN-011 GET user-data BFF | PASS | Unit and focused E2E pass. |
| REQ-FN-012 Consent panel | DEFERRED_POST_MVP | PR5 intentionally deferred. |
| REQ-FN-013 Consent grant modal | DEFERRED_POST_MVP | PR5 intentionally deferred. |
| REQ-FN-014 ARCO Access | PASS | `Arco_AccessExpandsJsonWithUserData` passed. |
| REQ-FN-015 ARCO Rectify | PASS | `Arco_RectifyNameShowsSuccessAndUpdatedData` passed. |
| REQ-FN-016 ARCO Cancel auto-sign-out | PASS | `Arco_CancelConfirmSignsOut` passed 3/3 focused reruns and in the focused PR8 suite. |
| REQ-FN-017 UserMenu auth-aware state | PASS_WITH_NOTES | Focused suite passed enabled local-mode-compatible tests; non-local-mode OAuth-only cases remain skipped. |
| REQ-FN-018 Rate-limit UX | PASS | Existing unit tests and typed errors remain green. |
| REQ-FN-019 Local-mode behavior | PASS | `/auth/signin` still redirects to `/analizar` when no reason is present; reasoned post-sign-out URLs render. |
| REQ-FN-020 Endpoint drift guard | PASS | `node scripts/check-endpoint-drift.mjs` passed. |
| REQ-FN-021 Email rotation auto-sign-out | PASS | Existing tests pass; reasoned sign-in behavior preserved. |

---

## NFR Coverage

- Security: ✅ same-origin BFF pattern retained; no backend direct browser calls introduced.
- Env vars: ✅ no new env vars; no hardcoded secrets.
- No secret leak: ✅ no BFF key exposed to client components.
- No token/header leak: ✅ tokens remain server-side; sign-in page change only reads query `reason`.
- Accessibility: ✅ focused a11y PR8 suite passed all enabled tests.
- Endpoint drift: ✅ script passed.
- Reliability/error handling: ✅ ARCO cancel now preserves the reasoned redirect and avoids stale local-mode default redirect.
- CI/script gates: ✅ lint, unit, build, typecheck, endpoint-drift, focused E2E executed.

---

## Compliance Coverage

- Privacy: ✅ ARCO cancel remains explicit type-email confirmation; no PII logging added.
- Treatment of user data: ✅ DELETE `/api/v1/user/data` flow unchanged and verified by E2E passing through the BFF.
- ARCO/Habeas Data: ✅ regression closed; cancel redirects to `/auth/signin?reason=arco-cancel`.
- No exposure of tokens: ✅ no client token/header exposure added.
- Dialogs accessible: ✅ a11y modal tests passed.
- Input as data: ✅ ARCO confirmation input is compared as data only; no command interpretation.

---

## Command Evidence

| Command | Exit | Result | Counts / Notes |
|---|---:|---:|---|
| `pnpm typecheck 2>&1 \| tee /tmp/typecheck-before.txt` | 2 | FAIL before fix | 7 TS errors captured. |
| `pnpm typecheck 2>&1 \| tee /tmp/typecheck-after.txt` | 0 | PASS | 0 TS errors after fixture fix. |
| `pnpm exec playwright test e2e/account-flow.spec.ts -g "Arco_CancelConfirmSignsOut" --project=chromium --reporter=line 2>&1 \| tee /tmp/arco-before.txt` | 1 | FAIL before fix | Actual `/analizar`, expected `/auth/signin?reason=arco-cancel`. |
| `pnpm exec playwright test e2e/account-flow.spec.ts -g "Arco_CancelConfirmSignsOut" --project=chromium --reporter=line 2>&1 \| tee /tmp/arco-after-1.txt` | 0 | PASS | 1/1. |
| `pnpm exec playwright test e2e/account-flow.spec.ts -g "Arco_CancelConfirmSignsOut" --project=chromium --reporter=line 2>&1 \| tee /tmp/arco-after-2.txt` | 0 | PASS | 1/1. |
| `pnpm exec playwright test e2e/account-flow.spec.ts -g "Arco_CancelConfirmSignsOut" --project=chromium --reporter=line 2>&1 \| tee /tmp/arco-after-3.txt` | 0 | PASS | 1/1. |
| `pnpm lint` | 0 | PASS | 0 ESLint warnings/errors reported. |
| `pnpm test` | 0 | PASS | 119 files, 1134/1134 unit/component/integration tests. |
| `pnpm build` | 0 | PASS | Next.js production build succeeded. |
| `pnpm typecheck` | 0 | PASS | 0 errors post-fix. |
| `node scripts/check-endpoint-drift.mjs` | 0 | PASS | Web forbidden paths, web canonical paths, backend canonical paths pass. |
| `pnpm exec playwright test e2e/account-flow.spec.ts e2e/user-menu-pr8.spec.ts e2e/a11y-auth-pr8.spec.ts e2e/endpoint-drift.spec.ts --project=chromium --reporter=line` | 0 | PASS_WITH_NOTES | 11 passed, 5 skipped by existing local-mode guards. |
| Defensive greps (`/tmp/defensive-greps.txt`) | 0 | PASS_WITH_NOTES | 0 actionable new leaks/drift/suppressions; broad raw grep contains expected allowlist strings in tests/comments/drift script/server-only code. |
| `dotnet format/build/test` | n/a | Not touched | API repo unchanged in verify-fixes. Prior first-pass baseline remains: format/build pass; 34 known API integration failures. |
| Domain purity | n/a | Not touched | No backend/domain files changed. |

---

## Security & Privacy Verification

- `BFF_API_KEY` server-side only: ✅ unchanged (`lib/api/auth-adapter.ts` server path/tests only).
- `X-BFF-Key` no client-side exposure: ✅ unchanged; no component/client path added.
- Access/refresh tokens not exposed: ✅ no source changes touch token handling.
- Authorization headers not exposed to the browser: ✅ no client code added any Authorization header.
- PII not logged: ✅ no logging added in either patch.
- ARCO input handled as data: ✅ type-email confirmation remains a plain string equality check.

---

## Endpoint Drift Verification

Canonical paths found and/or exercised:

- Web BFF: `/api/auth/web-signup`, `/api/auth/logout`, `/api/auth/session`, `/api/auth/refresh`, `/api/user/data`.
- Backend via server-side ports/BFF: `/api/v1/auth/web-signup`, `/api/v1/auth/logout`, `/api/v1/auth/session`, `/api/v1/user/data`.

Legacy paths absent from functional implementation:

- `/auth/sign-out`
- `/privacy/policies`
- `/user/consent`
- `/user/data/consent` in web functional paths for this shipped reduced scope
- `POST /arco/request`, `POST /arco/rectify`, `POST /arco/cancel`
- `/api/v1/auth/google/callback`, `/api/v1/auth/linkedin/callback`
- legacy functional `providerId` adapter key

Authoritative gate: `node scripts/check-endpoint-drift.mjs` passed.

---

## MVP Readiness

- **MVP_BLOCKER**: 0
- **SHOULD_FIX_BEFORE_LAUNCH**: 0
- **SAFE_DEFER_POST_MVP**: 7
  1. PR3 `/privacidad`.
  2. PR5 consent UI.
  3. OpenAPI polish.
  4. Pre-existing `_providerKeyMap` issue.
  5. T-PR0-007 tracking gap.
  6. axe-core/Lighthouse upgrade.
  7. Full E2E CI expansion.
- **READY_FOR_ARCHIVE**: yes
- **READY_FOR_TAG**: yes, after archive per project rule

---

## Risks & Deviations

- PR2 size deviation accepted.
- PR4 size deviation accepted.
- PR6 split process deviation accepted post-facto.
- PR6b size deviation accepted.
- PR8 `workers: 1` E2E stabilization remains accepted.
- API baseline flakes/failures known: 34 integration failures, unchanged from first verify.
- New verify-fixes branch contains 2 patches with root causes documented:
  - typecheck fixture/type drift.
  - local-mode sign-in page overriding reasoned post-sign-out redirect.

---

## Findings — Post-Verify

### CLOSED — BLOCKER/MAJOR #1: typecheck fixture/type drift

Root cause: strict TypeScript checked test fixtures that had drifted from evolved contracts: `ScoreError` moved to `lib/api/score`, `LegacyCvDocument` requires full metadata, `ImportResponse` is a union requiring narrowing, and the V2 import fixture needed literal `ConfidenceMarker` typing.

Fix evidence:

- `__tests__/components/analyzer/analyzer.test.tsx:22-23` imports `ScoreError` from `@/lib/api/score`.
- `__tests__/lib/editor/types.test.ts:36-49` adds a complete `LegacyCvDocument` fixture helper.
- `lib/api/import.test.ts:3,127-128` narrows with `isImportResult` before reading legacy fields.
- `lib/api/types.test.ts:35,696` types the V2 fixture as `CvDocument`.
- `pnpm typecheck`: exit 0.

### CLOSED — BLOCKER/MAJOR #2: ARCO cancel redirect

Root cause: the ARCO flow already navigated to `/auth/signin?reason=arco-cancel`, but `app/auth/signin/page.tsx` unconditionally redirected all local-mode sign-in renders to `/analizar`, overriding the reasoned post-cancel URL.

Fix evidence:

- `app/auth/signin/page.tsx:9-17` now reads query params inside `SignInInner` and only applies the local-mode `/analizar` redirect when no `reason` query is present.
- `Arco_CancelConfirmSignsOut`: 3/3 focused reruns passed.
- Focused PR8 Playwright command: exit 0.

### Residual findings

- BLOCKER: 0
- MAJOR: 0
- MINOR: 0
- NIT: 2
  - Broad defensive grep output includes intentional allowlist strings in comments/tests/drift-script fixtures; endpoint-drift script remains authoritative and passes.
  - Focused PR8 E2E reports 5 existing local-mode skips; no new skip was introduced.

---

## Final Recommendation

- **Enable `sdd-archive`**: yes.
- **Enable final tag**: yes, after archive.
- **Required patches before archive**: none.
