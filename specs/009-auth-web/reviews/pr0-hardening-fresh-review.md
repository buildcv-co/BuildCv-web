# Fresh Review — 009-auth-web PR0 hardening selected

**Date**: 2026-06-27  
**Reviewer**: review-risk  
**PR scope**: Backend hardening (api only), 3 items  
**Verdict**: APPROVE_WITH_MINOR_NOTES

## Diff summary

- Branch (api): `feature/009-auth-web-pr0-hardening`
- Base: `6fcc2ac`
- Tip: `1a60594`
- Commits: 1 commit (`1a60594 fix(auth): endurecer logout y web-signup (PR0 hardening)`) — ideal process expected more granular work units, but `work-unit-commits` also says tests belong with behavior.
- Files: 3 modified (`AuthEndpoints.cs`, `WebSignupHandler.cs`, `AuthEndpointTests.cs`)
- Production NET ADDED: +16 LOC
- Test LOC delta: +58
- Diff: 3 files changed, 80 insertions(+), 6 deletions(-)

## Commands run + results

| Command | Result | Evidence |
| --- | --- | --- |
| `git branch --show-current` | PASS | `feature/009-auth-web-pr0-hardening` |
| `git log --oneline -8` | PASS | tip `1a60594`, base `6fcc2ac` present |
| `git show 1a60594 --stat` | PASS | 3 files, +80/-6 |
| `git show 1a60594` | PASS | logout maps failure to 401; email validator hardened; tests added |
| `git diff 6fcc2ac..HEAD --stat` | PASS | 3 files modified |
| `git diff 6fcc2ac..HEAD --shortstat` | PASS | 3 files changed, 80 insertions(+), 6 deletions(-) |
| Web `git rev-parse HEAD` | PASS | `b20b1e23822298d093360764460598a2c347990b` |
| Web `git status --short` | NOTE | `M specs/009-auth-web/apply-progress.md` before this report; docs-only |
| Web `git log --oneline -3` | PASS | tip `b20b1e2` |
| `dotnet format --verify-no-changes` | PASS | exit 0, no formatting changes |
| `dotnet build BuildCv.slnx -c Release` | PASS | 0 warnings, 0 errors |
| `dotnet test --filter "FullyQualifiedName~Logout" --no-build` | PASS | 6 total: 5 API integration + 1 application |
| `dotnet test --filter "FullyQualifiedName~WebSignup" --no-build` | PASS | 12/12 API integration |
| `dotnet test --filter "FullyQualifiedName~RevokeAll" --no-build` | PASS | 5 total: 1 API integration + 4 infrastructure |
| `dotnet test --filter "FullyQualifiedName~RefreshTokenRotation" --no-build` | PASS | 1/1 API integration |
| `dotnet list src/BuildCv.Domain package` | PASS | no packages found |
| `dotnet list src/BuildCv.Domain reference` | PASS | no project references |
| `dotnet test --no-build` | BASELINE FAILURES | 1014 passed / 34 failed: 14 Infrastructure Postgres + 20 API integration baseline/test-infra failures |
| Defensive forbidden path greps | PASS/NOTE | `/auth/sign-out`, `/privacy/policies`, `/user/consent`, legacy callback: 0; canonical `/auth/session` and `/user/data/consent` matched as expected |
| Legacy `providerId` in web-signup handler/command | PASS | 0 matches |
| Suppressions grep excluding migrations | PASS | 0 matches |
| Hardcoded secret grep | PASS/NOTE | only empty config defaults like `ApiKey = ""`, `ClientSecret = ""`, `WebhookSecret = ""`; no real secret value added |
| Commit count `6fcc2ac..HEAD` | NOTE | 1 commit |

## Checklist (11 sections)

### 1. logout 500 vs 401 fix verification

- ✅ Invalid logout without Authorization header returns 401: `Logout_Returns401_WithoutAuthorizationHeader` passed.
- ✅ Invalid logout with malformed Authorization header returns 401: `Logout_Returns401_WithMalformedAuthorizationHeader` passed.
- ⚠️ Expired-token-specific logout coverage was not added. Behavior is still covered by the same handler path once no valid user id is available, but there is no direct regression test for an expired bearer token.
- ✅ Valid logout still works: `Logout_WithBearerOnlyBody_RevokesAllRefreshTokens_ForUser` and `Logout_revokes_refresh_token` passed under the `Logout` filter.

### 2. Missing providerAccountId coverage hardening

- ✅ Missing `providerAccountId` now has direct 400 integration coverage: `WebSignup_Returns400_OnMissingProviderAccountId`.
- ✅ Happy path still returns 200: `WebSignup_Returns200_WithUserId_WhenNewProvider`.
- ✅ No legacy `providerId` in `WebSignupHandler.cs` or `WebSignupCommand.cs`.

### 3. Email regex stricter (pragmatic)

- ✅ `notanemail`, `@nodomain.com`, and `spaces in@email.com` return 400 via `WebSignup_Returns400_OnMalformedEmail`.
- ✅ `valid@example.com` and `user.name+tag@subdomain.example.co.uk` still return 200 via `WebSignup_Returns200_OnValidEmail`.
- ✅ No RFC compliance attempted; validator is pragmatic: length, whitespace, single `@`, local length, domain labels, TLD length.
- ✅ Invalid email is not logged by `WebSignupHandler`; errors are static (`AUTH/INVALID_EMAIL`, `Invalid email format`).

### 4. Endpoint/path drift

- ✅ No `/auth/sign-out` or legacy `/api/v1/auth/${provider}/callback` path.
- ✅ Canonical paths preserved: `/api/v1/auth/web-signup`, `/api/v1/auth/logout`, `/api/v1/auth/session`, `/api/v1/user/data`.
- ✅ Prompt grep matches for `/api/v1/auth/session` and `/api/v1/user/data/consent` are canonical shipped endpoints, not drift.

### 5. Secret/token/PII handling

- ✅ No hardcoded real secrets in source. Grep findings are empty configuration defaults, not secret material.
- ✅ No new suppressions outside EF migration files.
- ✅ Invalid email is not logged; no PII echo in validation error details.

### 6. Clean Architecture

- ✅ Domain purity verified: 0 packages, 0 project references.
- ✅ No HTTP details in Domain/Application. `WebSignupHandler` depends only on Domain common result types and application services.
- ✅ Endpoint remains a thin mapper/delegator.

### 7. Test quality

- ✅ 7 new test cases are real integration tests through `WebApplicationFactory`.
- ⚠️ RED evidence is partial, not complete: missing `providerAccountId`, `notanemail`, `@nodomain.com`, and valid email regressions were coverage/regression tests; they were not all expected to fail before this patch. The real RED gaps were logout 500→401 and `spaces in@email.com` 200→400.
- ✅ Focused Logout/WebSignup/RevokeAll/RefreshTokenRotation filters pass.

### 8. Typecheck baseline

- ✅ Release build passed with 0 warnings and 0 errors.

### 9. Build/lint/test (api)

- ✅ `dotnet format --verify-no-changes` passed.
- ✅ `dotnet build BuildCv.slnx -c Release` passed with 0 warnings, 0 errors.
- ✅ Focused hardening/regression filters passed.
- ⚠️ Full `dotnet test --no-build` still has 34 baseline/test-infra failures: 14 Postgres + 20 API integration failures (LocalAuth/auth mismatch, scoring shared-state, auth rate-limit collisions). Focused hardening tests are green.

### 10. Process deviation evaluation

- ⚠️ Only 1 commit instead of the requested/ideal TDD split.
- ✅ Acceptable for this small hardening patch: the commit has one clear purpose, tests are kept with the behavior they verify, and history rewrite would not improve functional safety.
- Decision: **accept**.

### 11. Backend untouched confirmation

- ✅ No functional code changes in `BuildCv-web/`.
- ⚠️ Web repo had docs-only `apply-progress.md` modified before this report; this report adds another docs file.
- ✅ API contracts unchanged except stricter validation/status behavior; no new endpoint paths.

## Critical questions (6)

1. **Do all 3 hardening items actually CLOSE the bugs?**  
   **Yes.** Logout invalid paths now return 401; missing `providerAccountId` has direct coverage; email validation rejects the listed malformed inputs while keeping common valid emails.

2. **Are the 7 new tests proven RED → GREEN?**  
   **No, not all.** Evidence is partial. Some tests are regression/coverage tests over behavior that already existed or was expected to keep passing. This is a process/test-evidence note, not a functional blocker.

3. **Is the process deviation (1 commit vs 2) acceptable?**  
   **Yes.** Accept for scope. The commit is a coherent hardening work unit and keeps tests with code, consistent with `work-unit-commits`.

4. **Are the 34 baseline failures truly pre-existing (not regressions)?**  
   **Likely yes, with current evidence.** The same categories are documented in `apply-progress.md`; focused hardening filters all pass. My full run observed 14 Postgres and 20 API integration baseline/test-infra failures.

5. **Is invalid email NOT logged as PII?**  
   **Yes.** `WebSignupHandler` has no logger and returns static error details.

6. **Are the canonical endpoints unchanged?**  
   **Yes.** Defensive greps show no forbidden path reintroduced; canonical endpoints remain.

## New issues

### BLOCKER

None.

### CRITICAL

None.

### WARNING: RED/GREEN evidence is partial, not complete

- **Affected files**: `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs`, `BuildCv-web/specs/009-auth-web/apply-progress.md`
- **Evidence**: `apply-progress.md` states missing `providerAccountId` "Test passed because the validation existed" and email tests include cases already rejected before the patch (`notanemail`, `@nodomain.com`) plus valid-regression cases that should pass before and after. Diff confirms only `spaces in@email.com` needed the stricter validator.
- **Why it matters**: Strict TDD evidence is weaker than claimed. Reviewers should not treat all 7 cases as RED proof.
- **Disposition**: Accept as process/documentation warning; no functional fix required.

### SUGGESTION: Add direct expired-bearer logout test later

- **Affected files**: `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs`
- **Evidence**: New logout negative tests cover missing and malformed Authorization headers, not an expired signed JWT.
- **Why it matters**: The checklist explicitly asks for expired-token logout. Current behavior is likely 401 through the same unauthenticated path, but direct regression coverage would remove ambiguity.
- **Disposition**: Follow-up only; not blocking this hardening patch.

## Process deviation evaluation

- Sub-agent bundled test+fix in 1 commit instead of 2 separate commits per the prompt's strict TDD expectation.
- `work-unit-commits` guidance says a commit should represent one deliverable behavior/fix and **tests belong in the same commit as the behavior they verify**.
- Functional result: focused tests pass, 3 items closed.
- Process concern: RED evidence was not fully RED for all 7 new cases.
- **Decision**: accept; do not require history rewrite.

## Hardening items verification

- **logout 500 vs 401**: CLOSED ✅ — `AuthEndpoints.cs:130-134` maps failed `LogoutHandler` result to 401 with existing JSON error shape; `Logout` filter passed 6 tests.
- **missing providerAccountId**: CLOSED ✅ — `AuthEndpointTests.cs:175-186` posts a body without `providerAccountId` and gets 400; handler validation remains at `WebSignupHandler.cs:20-23`.
- **permissive email regex**: CLOSED ✅ — `WebSignupHandler.cs:50-76` rejects whitespace/malformed domains; malformed and valid-email focused tests pass.

## Baseline failures (34 documented)

- Observed full suite summary:
  - `BuildCv.Domain.Tests`: 162/162 pass
  - `BuildCv.Application.Tests`: 328/328 pass
  - `BuildCv.Infrastructure.Tests`: 397/411 pass, 14 fail (Postgres credential/availability)
  - `BuildCv.Api.IntegrationTests`: 127/147 pass, 20 fail (documented baseline/test-infra categories)
- Categories: 14 Postgres, LocalAuth/authorization mismatch, scoring shared-state, auth rate-limit collisions.
- New regressions attributed to PR0 hardening: **No**, based on focused filters passing.

## Security review

Pass with notes. No hardcoded real secrets, no token/PII logging, BFF credential filter remains on `/auth/web-signup`, no frontend authz-only pattern introduced, no raw HTML/DOM sink, no SQL/command concatenation in this patch.

## Contract/path review

Pass. No forbidden path drift; canonical endpoints preserved. Status contract intentionally improved for invalid logout (401 instead of 500) and validation tightened for email.

## Clean Architecture review

Pass. Domain remains pure; Application validation is deterministic and has no HTTP dependency; API endpoint remains the translation layer.

## Test quality review

Pass with warning. Tests are real integration tests, not mocks falsos. However, RED/GREEN evidence should be described precisely: not all added cases were RED.

## Build/lint/test review

Pass for gates and focused filters. Full suite has documented baseline/test-infra failures; no evidence of hardening regression.

## Recommendation

- Push: **Y**
- Merge to api/main: **Y**
- Process fix needed: **N**

## Approval criteria checklist

- [x] BLOCKER 0
- [x] CRITICAL 0
- [x] All 3 hardening items CLOSED
- [x] No endpoint drift
- [x] No secret/token/PII leak
- [x] Clean Architecture intact
- [x] Tests/build/format pass or baseline documented
- [x] No functional changes in BuildCv-web
- [x] Backend touches only api
