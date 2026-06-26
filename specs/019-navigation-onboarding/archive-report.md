# Archive Report — 019-navigation-onboarding

## Date
2026-06-25

## Status
**CLOSED ✅** — Full SDD cycle complete (proposal → spec → design → tasks → apply → verify → archive).

## Tags

| Tag | SHA | Points to |
|-----|-----|-----------|
| `019-navigation-onboarding-pr1-v1.0` | `1719666` | End of PR1 (site header promotion + local-mode pill) |
| `019-navigation-onboarding-pr2-v1.0` | `0a5e4f0` | End of PR2 (mobile menu + empty states + signin redirect) |
| `019-navigation-onboarding-v1.0` | `20044ec` | Combined: HEAD at end of PR2 + master index update |

All 3 tags pushed to `git@github.com:buildcv-co/BuildCv-web.git`.

## Final commit on main
`63719f2` — docs(019): add 019-navigation-onboarding entry to master index

## Total diff stats (estimated, from verify report)
- **Files touched**: ~31 (12 new + 19 modified)
- **New components**: 5 (`SiteHeader`, `MobileNav`, `LocalModePill`, `EmptyState`, `Icons`)
- **Modified pages**: 6 (layout + 5 pages with inline header stripped)
- **Commits**: 15 atomic work-unit commits + 1 docs commit (index update)
- **Tests added**: +54 automated checks (35 unit + 19 e2e)

## Test results (post-verify)
- **Unit**: 820/820 across 83 files ✅
- **E2E (019-relevant)**: 26/26 ✅ (9 header-invariant + 6 cross-route + 4 mobile + 2 signin + 5 axe-core)
- **E2E (auth-flow regression)**: 4/4 ✅
- **Lint**: 0 errors, 0 warnings ✅
- **Build**: 0 errors ✅

## Requirements compliance
**16/16 PASS** per verify-report.md matrix. 41/45 scenarios have direct test coverage; 3 are static-check only (REQ-A11Y-002 contrast — requires design-time check); 1 is unit + manual (REQ-MOBILE-001.S2 landscape).

## Constitution compliance
**9/9 PASS** (Art. I–IX). No amendment needed. Specific verifications:
- Art. III: `grep -E "localStorage|sessionStorage|fetch|document.cookie"` in new components = 0 matches
- Art. IV: `grep` for forbidden claims (ATS, garantizado, etc.) = 0 violations
- Art. VI: nav is pure presentational; auth-aware pieces isolated in `<HeaderExtras>` slot
- Art. VIII: 0 suppressions across all new code

## Open WARNINGs (deferred to future features)

| ID | Description | Severity | Follow-up feature |
|----|-------------|----------|-------------------|
| WARNING-1 | `<EmptyState>` secondary CTA prop is unused surface (dead code path) | WARNING | Drop the prop (S, ~5 min) in 019 follow-up |
| WARNING-2 | `@axe-core/playwright` not wired for automated WCAG contrast checks | WARNING | New feature: `020-a11y-automated-audit` (M) |

## Recommended next feature

**`020-a11y-automated-audit`** — wires `@axe-core/playwright` for automated WCAG 2.2 AA scans across all routes, closes WARNING-2 from 019, and provides defense-in-depth for future accessibility work. Medium effort (M).

Alternative: **`019b-followups`** (smaller) — drops the unused `secondaryCta` prop from `<EmptyState>` (closes WARNING-1), adds 1 missing test for landscape mobile orientation. Small effort (S).

## Open SUGGESTIONs
- SUGGESTION-1: Extract `<CreditArea>` into `<HeaderExtras>` slot when `009-auth-web` ships (so the header can show user credits when authenticated). Low effort (S), naturally fits in 009.

## Artifacts
- `proposal.md` (31364 bytes) — Intent, scope, approach, alternatives
- `spec.md` (48946 bytes) — 16 REQs, 45 scenarios
- `design.md` (36482 bytes) — Architecture, components, test strategy
- `tasks.md` (48011 bytes) — 15 atomic commits across 2 PRs
- `apply-progress.md` (10894 bytes) — Implementation handoff
- `verify-report.md` (37819 bytes) — 16/16 PASS, 0 CRITICAL, 2 WARNING
- `archive-report.md` (this file) — Final closure

## Lessons learned (for next SDD cycles)

1. **Worktrees + native primitives**: native `<dialog>` for mobile menu worked great — zero new deps, full a11y. Recommend for similar dropdowns/modals.
2. **Header promotion is structural**: it touches multiple files (layout + each page with inline header). T1.5 bundled them atomically to prevent double-render regression. Pattern: any "promote to layout" change should bundle the cleanup.
3. **Empty state design must be opinionated**: 1 primary CTA only (no secondary competing for attention). The `secondaryCta` prop turned out to be unused — design lesson: don't ship unused props.
4. **React 19 + Next.js 16 quirks**: `useSession()` breaks static prerender → use `getServerSession()` + `force-dynamic`. `set-state-in-effect` rule needs lazy `useState` initializer. Document these in 009-auth-web plan.
5. **jsdom 29 lacks `HTMLDialogElement.showModal/close`**: required polyfill in `vitest.setup.ts`. Document this for future component tests that use `<dialog>`.

## Feature state
**SHIPPED + ARCHIVED** — change is closed. No further work expected on 019 unless WARNINGs trigger a follow-up.
