# Proposal: 019-navigation-onboarding — Discoverable, Accessible Navigation Across the App

## Status

[Proposal] — Pending spec (no `spec.md` / `design.md` / `tasks.md` exist yet).
**WEB-only change.** No API changes expected (`BuildCv-api/` is untouched). Counterpart artifact: none.

## Context

**The problem.** BuildCv-web ships with a working product (analizar, importar, editar, diff, iterate, suscripciones, auth) but the navigation surface is **incomplete**: `LandingNav` is rendered **only on `/`** (the home page) at `BuildCv-web/app/page.tsx:32`. As soon as the user moves off `/`, the nav disappears. The local-mode (`NEXT_PUBLIC_LOCAL_MODE=true`) auth flow then auto-redirects from `/` → `/auth/signin` → `/analizar/iterate` (`BuildCv-web/app/auth/signin/page.tsx:41`). The user lands on the **deepest leaf of the wizard** (`/analizar/iterate`) with no nav visible and no way to discover `/importar`, `/suscripciones`, or `/auth/signin` without typing a URL.

**User feedback (verbatim).** *"Todo dever ser intuitivo y facil de usar, el usario no deve aprenderce urls."* The user picked **Option C** (full SDD feature with spec/design/tasks) over a 15-minute redirect fix or a 1-2 hour nav-promote hack because the gap is symptomatic: nav is missing everywhere except home, there are no empty-state CTAs, and there is no discoverable entry point in local mode.

**Why now.** All primitives exist (002 score, 003 adapt, 004 export, 005 import, 006 editor, 006b diff, 018 iteration). The product is feature-complete for v0.5.1 but **not discoverable**: a Colombian recruiter opening the link in local mode sees a CV-uploading form with no breadcrumb, no "go back to home", and no way to load a CV file first. This blocks user testing (the user's own quote), the v1 launch (auth + payments), and the portfolio signal (Art. VI's "seniority": an invisible nav in a portfolio piece is a self-inflicted wound).

**Constitutional pressure.** This change touches the visible surface of the product, so it sits at the intersection of several articles. Most relevant: **Art. III** (the nav must NOT introduce new persistence; local-mode state stays in localStorage only); **Art. IV** (nav labels must describe what the user actually does — "Importar CV", not "Uploads"; never "ATS" or "garantizado"); **Art. VI** (nav is a presentational component, not a container of business logic; no API calls, no auth state derivation inside the nav itself); **Art. VII** (the change must not regress the v0 "no friction" promise — usable with zero clicks past the landing); **Art. VIII** (every new component ships with co-located tests; full Playwright e2e for the nav-discovery flow).

## Intent

After 019 ships, **any visitor — whether arriving at `/`, `/analizar`, `/importar`, `/auth/signin`, or `/analizar/iterate` — sees the same persistent header with a discoverable path to every other screen**, can navigate the full app by keyboard alone (Tab/Shift+Tab + Enter/Space), and lands on an entry point that explains what the next step is. Local-mode users in particular get a clear "you are in local mode, no account needed" indicator and a discoverable home link.

**Success criteria.**
- The nav is rendered on **every authenticated route** AND **every public route** (including iterate, signin, suscripciones, not-found, error pages).
- Keyboard-only users can reach every primary action in ≤ 2 Tab presses from page load.
- A screen reader announces the page name and the primary CTA on every screen (WCAG 2.2 §2.4.6 Headings and Labels, §2.4.1 Bypass Blocks).
- Local-mode redirect from `/auth/signin` lands on a **discoverable entry point** (currently `/analizar/iterate` is a leaf), not a wizard halfway through.
- Every page that requires prior state (CV loaded, vacancy loaded, subscription active) shows an **empty state with a single primary CTA** explaining the next concrete step.
- Lighthouse Accessibility score ≥ 95 on `/`, `/analizar`, `/analizar/iterate`, `/importar`, `/auth/signin`.
- Playwright e2e covers: `land on / → see nav → click Importar → see Importar → use browser back → see previous nav active state`. Coverage is the gate, not aspirational.

## Scope

### In Scope (Must-have, shipped in this feature)

1. **Promote `LandingNav` to root layout.** Move from `app/page.tsx:32` (per-page) to `app/layout.tsx` so every route renders the same header.
2. **Expand nav to the actual product surface.** Add the missing primary entries: `Inicio` (`/`), `Analizar` (`/analizar`), `Importar CV` (`/importar`), `Suscripciones` (`/suscripciones`, auth-only), `Iniciar sesión` / `Cuenta` (`/auth/signin` or session menu).
3. **Local-mode discoverability fix.** Change the local-mode redirect target from `/analizar/iterate` to `/analizar` (the analyzer root, with a discoverable "Importar CV" CTA in the empty state). Also expose a small "Modo local" indicator pill in the nav when `IS_LOCAL === true` so the user knows why no auth is required.
4. **Empty states on every screen that needs prior state.** `/analizar` (no CV/vacancy) → "Pegá tu CV y la vacante para empezar". `/analizar/iterate` (no inputs) → "Importá un CV o pegá texto + la vacante". `/importar` already has an idle state; keep it. `/suscripciones` (no auth) → "Iniciá sesión para ver tu plan". Each empty state ends with **one** primary CTA.
5. **Keyboard navigation + screen reader support (WCAG 2.2 AA).** Skip-to-content link already exists at `app/layout.tsx:31-36`. Extend: `aria-current="page"` on the active nav item (already done in `LandingNav`); `aria-label` on icon-only controls; `:focus-visible` ring everywhere; minimum 24×24 CSS px target size on every nav link and button (WCAG 2.5.8); mobile menu (if hamburger) is a real `<button>` with `aria-expanded` and `aria-controls`.
6. **Responsive nav (mobile-friendly).** Below 640px (`sm`), collapse to a hamburger button that opens a `<dialog>` or accessible sheet. Above 640px, render the inline pill list (current behavior).
7. **E2E tests (Playwright chromium).** One spec per critical path: landing → import → back; landing → analyze → empty state CTA; local-mode nav indicator visible; keyboard-only nav traversal; mobile menu open/close + focus trap.
8. **Copy centralization.** All new nav labels, empty-state titles, and CTA buttons go into `BuildCv-web/lib/copy/es.ts` under a new `nav.global` and `emptyStates.*` namespace. Zero hardcoded Spanish in components.

### Should-have (proposed, marked nice-to-have — ship if budget allows)

- **Subtle wizard breadcrumbs** on `/analizar/iterate` and `/analizar/diff` showing "Paso 2 de 3: Adaptar con IA" using semantic `<nav aria-label="Progreso">` + `<ol>`. WCAG 2.2 §2.4.8 (Location, AAA) — useful for users but not blocking.
- **Cross-route context preservation.** When the user has typed text into `/analizar` and navigates to `/importar`, offer "Importá un CV y lo precargamos aquí" instead of dropping the input. Reuse the existing `ICvStore` port (Art. VI approved). Behind a feature flag if it risks the 400-line budget.
- **Reduced-motion respect.** Already handled globally in `globals.css`, but verify the new mobile menu sheet animation honors `prefers-reduced-motion`.

### Out of Scope (Won't do in this feature — defer explicitly)

- **Full multi-step wizard with persistent progress bar.** That's a product redesign; defer to v1.5.
- **Onboarding tooltips / coach-marks (e.g., userpilot, intro.js).** Adds a dep, is decorative, and bakes a vendor into the codebase. Defer.
- **A/B testing the CTA copy.** We don't have analytics infra; defer to v1 (post-payments).
- **Bottom-nav for mobile.** Top hamburger is enough for 5 nav items. Don't add a second navigation paradigm.
- **Search / command palette.** Out of scope; we have 5 primary routes, not 50.
- **Auth state derivation in the nav.** The nav stays a dumb presentational component. Session/credit state lives in dedicated components (`<CreditBadge>`, `<UserMenu>`) consumed by the layout but not by `<LandingNav>` itself. This is a Clean Architecture boundary (Art. VI) — the nav knows nothing about auth.

## Approach (high-level design)

### Architecture

**Promote, don't replace.** `LandingNav` is already 46 lines, well-typed, well-tested (`landing-nav.test.tsx`), and accessible (`aria-current`, `aria-label`, `:focus-visible`). Promoting it to the root layout is a 1-line move + a small extension to the `NAV_ITEMS` array. No new dependencies, no architectural change.

**Layout composition.** The root `app/layout.tsx` (line 22-43) currently renders `<body>{children}</body>`. We add a `<SiteHeader>` (a thin wrapper around `<LandingNav>` + the brand mark + the mobile menu) before `{children}`, and keep the skip-to-content link (already present at line 31). The brand mark and nav are pulled out of `app/page.tsx` (lines 25-33) into the layout so the home page header doesn't double-render.

**Empty-state pattern.** A new `<EmptyState>` presentational component (`components/common/empty-state.tsx`) with props `{ icon, title, description, primaryCta }`. Used in `/analizar`, `/analizar/iterate`, `/suscripciones`. No business logic; receives everything via props.

**Mobile menu.** A separate `<MobileNav>` component (`components/landing/mobile-nav.tsx`) that owns the dialog state (`useState` + `useRef`), renders only on `<sm`, and uses the native `<dialog>` element (handled focus trap, Esc-to-close, backdrop click — Art. VI: prefer platform primitives over libraries). Tested with `@testing-library/user-event` for keyboard interactions and with Playwright for the e2e click path.

**Local-mode indicator.** A new `<LocalModePill>` (3 lines of JSX) rendered inside `<SiteHeader>` when `IS_LOCAL` is true. Visible only when meaningful (local-mode users; production users don't see it).

**Auth/credits state separation.** Per Art. VI (clean architecture boundary), the nav does not import `lib/auth.ts` or read the session. A separate `<HeaderExtras>` slot in `<SiteHeader>` is the composition point: it accepts React children. The auth-aware components (`<CreditBadge>`, `<UserMenu>`) live in `components/auth/` and `components/credits/` and are passed as children by the layout or by route-level `layout.tsx` files. This keeps `<LandingNav>` and `<MobileNav>` pure and reusable across authenticated and anonymous contexts.

### Files to touch

| Path | Action | Why |
|---|---|---|
| `app/layout.tsx` | Modify | Add `<SiteHeader>` and remove the now-duplicated header from `app/page.tsx` |
| `app/page.tsx` | Modify | Remove inline `<header>` + `<LandingNav>` (now in layout) |
| `components/landing/landing-nav.tsx` | Modify | Extend `NAV_ITEMS` from 2 to 4-5; the active-state logic stays unchanged |
| `components/landing/site-header.tsx` | **New** | Composes brand mark + `<LandingNav>` + `<MobileNav>` + `<LocalModePill>` + `<HeaderExtras>` slot |
| `components/landing/mobile-nav.tsx` | **New** | Hamburger button + native `<dialog>` for sm- screens |
| `components/landing/local-mode-pill.tsx` | **New** | 3-line pill rendered only when `IS_LOCAL === true` |
| `components/common/empty-state.tsx` | **New** | Reusable empty-state presentational component |
| `app/analizar/page.tsx` | Modify | Use `<EmptyState>` when no CV/vacancy is loaded |
| `app/analizar/iterate/page.tsx` | Modify | Use `<EmptyState>` when inputs are empty + fix discoverability |
| `app/suscripciones/page.tsx` | Modify | Empty-state when not authenticated |
| `app/auth/signin/page.tsx` | Modify | Change local-mode redirect target from `/analizar/iterate` to `/analizar` |
| `lib/copy/es.ts` | Modify | New keys: `nav.global.*`, `emptyStates.*`, `localModePill.*` |
| `__tests__/components/landing/landing-nav.test.tsx` | Modify | Add tests for new nav items + active-state across routes |
| `__tests__/components/landing/site-header.test.tsx` | **New** | Composition test (renders nav + extras + local pill conditionally) |
| `__tests__/components/landing/mobile-nav.test.tsx` | **New** | Keyboard interaction tests (Esc closes, Tab traps inside dialog) |
| `__tests__/components/common/empty-state.test.tsx` | **New** | Snapshot + interaction tests |
| `e2e/navigation.spec.ts` | **New** | Playwright e2e for the discoverability flow across all routes |

### Out of bounds (do not touch)

- `BuildCv-api/` — no API changes.
- `lib/storage/icv-store.ts` — the local storage port is reused, not modified.
- `lib/auth.ts` — `IS_LOCAL` is read here; we only consume the constant in a presentational component, we don't modify the auth module.
- `app/api/*` — no BFF route changes.

## Decisions (locked)

| # | Decision | Rationale | Constitution |
|---|---|---|---|
| **1** | **Promote, don't rewrite.** Move existing `<LandingNav>` to layout; extend the same component's `NAV_ITEMS`. | 46-line component, already tested, already accessible. Zero new deps, zero architectural risk. "No sobre-ingeniería" (Art. VI). | Art. VI |
| **2** | **Nav stays dumb.** `<LandingNav>` and `<MobileNav>` know nothing about auth, credits, or the API. They receive an array of `{href, label}` and render. Auth-aware UI lives in `<HeaderExtras>` composed by the layout. | Clean Architecture boundary: nav is a pure presentational component; session/credit logic is in dedicated ports (`useSession`, `useCredits`) consumed elsewhere. Nav becomes reusable for future white-label contexts. | Art. VI |
| **3** | **Nav items: 5.** `Inicio`, `Analizar`, `Importar CV`, `Suscripciones` (auth-gated, hidden if not authed), `Iniciar sesión` / `Cuenta` (auth-dependent). Never `Mi CV`, never `Dashboard` — keep it concrete. | WCAG 2.4.4 (Link Purpose) + Art. IV (honest framing). Names describe what the user actually does. | Art. IV |
| **4** | **Mobile menu uses native `<dialog>`.** No Headless UI, no Radix, no shadcn. | Platform primitives handle focus trap, Esc, and backdrop natively. Reuse > reimplement. Aligns with the project's no-external-UI-library rule and Art. VI "no sobre-ingeniería". | Art. VI |
| **5** | **Local-mode redirect changes from `/analizar/iterate` to `/analizar`.** | `/analizar/iterate` is the wizard's deepest leaf — landing there with no CV is the bug. `/analizar` is the root with a clear empty state and a single "Importá un CV" CTA. Discoverable, not magic. | Art. IV (honest framing — don't hide steps from users) + Art. VII (v0 must be usable without friction) |
| **6** | **Local-mode pill is visible.** A small "Modo local" badge in the header when `IS_LOCAL === true`. | Transparency: users in local mode should know they're not in production (it changes expectations about auth, rate limits, and persistence). No new persistence; the constant is read from env. | Art. III (transparency about data handling) + Art. IV (honest about state) |
| **7** | **No new dependencies.** Pure Tailwind v4 + native `<dialog>` + the existing component library. | Art. VI "no sobre-ingeniería". No `react-aria`, no `radix-ui`, no `headlessui`. The platform is enough. | Art. VI |
| **8** | **Empty states are concrete and CTAs are singular.** One title, one description, one primary button per empty state. Never "Browse docs or contact support". | WCAG 2.4.6 (Headings and Labels) + Art. VII (v0 usable with zero friction). The user said "no debe aprenderse URLs" — empty states are the safety net. | Art. IV + Art. VII |
| **9** | **Active nav state preserved across route changes.** `<LandingNav>` already does this via `usePathname()`. Verify it works in the new layout context (it should, no change needed). | WCAG 2.4.8 (Location, AAA — bonus). Users always know where they are. | Art. IV |
| **10** | **Tests first, per Art. VIII.** Vitest unit for every new component; Playwright e2e for the cross-route flow. Zero suppressions globally. | Hard rule. Coverage on new components ≥ 90%; e2e covers at minimum: land on `/` → see nav with 4 items → click `Importar CV` → land on `/importar` → press browser back → return to `/` with `Inicio` highlighted. | Art. VIII |
| **11** | **No keyboard shortcuts.** Tab order is enough. Don't introduce `Cmd+K` palettes, hotkeys, or focus-stealing behaviors in this slice. | "No sobre-ingeniería" (Art. VI). Keep the surface small; add shortcuts later if usage signals demand them. | Art. VI |

## Constitution Alignment (per article)

| Article | How 019 complies |
|---|---|
| **I — Cero invención** | Nav contains no IA-generated content. Empty-state copy is hand-written in `lib/copy/es.ts` and reviewed by the owner. No suggestion of fabricated skills, jobs, or experiences. The nav itself is informational, not generative. |
| **II — Puntaje determinista** | Unchanged. 019 does not touch the scoring engine or any algorithm. The nav does not display numbers; empty states do not contain invented metrics. |
| **III — Privacidad primero** | **No new persistence.** Nav uses no `localStorage`, no `IndexedDB`, no cookies. The local-mode pill reads `NEXT_PUBLIC_LOCAL_MODE` (already public). Auth-aware nav items use the existing session/credit ports; no new data is collected. **No CV/job content** flows through the nav (it never did, but we make this explicit). |
| **IV — Encuadre honesto** | Nav labels describe what the user actually does: "Analizar" (analyzes), "Importar CV" (imports a CV), "Suscripciones" (manages subscriptions). Never "ATS", "Score oficial", "Match garantizado", "Boost your career". The empty-state copy is honest about state ("No hay CV cargado todavía") rather than aspirational ("¡Empezá tu viaje!"). The local-mode pill is honest about the mode ("Modo local — sin autenticación") rather than hidden. |
| **V — Entrada como dato** | Unchanged. 019 does not touch the AI pipeline. The nav is pure UI. |
| **VI — Clean Architecture (frontend)** | **Nav is a presentational component**, no business logic, no API calls, no auth derivation inside. The component receives an array of `{href, label}` and renders. Auth-aware parts live in separate components composed by the layout (composition > coupling). **No new dependencies** (Tailwind v4 + native `<dialog>` only). **No sobre-ingeniería**: promote, don't rewrite; native dialog, not a library. |
| **VII — v0 sin fricción** | The local-mode redirect now lands on `/analizar` (an empty state with a clear CTA), not on `/analizar/iterate` (a wizard leaf). Users can still paste CV + vacancy directly on `/analizar` (the existing flow). The nav is visible everywhere, so users are never stranded. No new gate, no new friction — strictly less. |
| **VIII — TDD / tests-first** | All new components ship with co-located Vitest unit tests before implementation. Playwright e2e covers the cross-route navigation flow. 0 suppressions. Accessibility is tested via `@testing-library/jest-dom` (toHaveAccessibleName) and via Lighthouse in the e2e suite. |
| **IX — Habeas Data** | Unchanged. No new data is collected or persisted. No PII in the nav. The local-mode pill is informational, not consent-gated (it's an indicator of state the user already chose via the env var). |

**Verdict: PASSES all nine articles without amendment.**

## Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| **1** | **Header composition causes double-rendering on `/` if the inline `<header>` in `app/page.tsx` is not removed.** The current home page has its own `<header>` block with the brand + nav. If we add the layout-level header but forget to strip the page-level one, we double-render the brand and double-render the nav (broken UI, broken a11y, broken Lighthouse). | Med | Spec/design phase explicitly diffs `app/page.tsx` to remove lines 25-33. Unit test asserts the home page contains exactly one `<header>` and exactly one `<nav aria-label="Navegación principal">`. E2E test asserts nav item count == 4 on every route. |
| **2** | **Active-state logic breaks for nested routes.** `LandingNav`'s `isActive` (`landing-nav.tsx:17-20`) uses `startsWith` to mark `/analizar` as active for `/analizar/iterate`. If we add a new `/analizar-archive` route, it would also be marked active. Also, adding `/importar` means the active state for `/importar` is set, but `/importar/algo` would also be active — fine, but verify no collision. | Low-Med | Unit test with a parametrized table of (pathname, expected active href) pairs covering all 5 primary routes + their known children. Document the active-state rule in code comment-less (the test is the spec). |
| **3** | **Mobile menu dialog focus trap is wrong.** Native `<dialog>` handles focus trap, but our open/close logic may not properly restore focus to the trigger button on close. WCAG 2.4.3 (Focus Order) requires focus return. | Med | E2E test: open mobile menu, Tab to last item, Esc to close, assert `document.activeElement === hamburgerButton`. Use the native `showModal()` / `close()` API, not `display: none`. |
| **4** | **`/auth/signin` redirect change breaks a test or breaks a deployed link.** Some Playwright test expects the redirect to `/analizar/iterate`. The change moves it to `/analizar`. The existing test must be updated. | Low | Update the affected test in the same PR (the spec/test change is part of the deliverable). Verify with `pnpm test:e2e` before merge. |
| **5** | **Empty states look generic / "AI slop".** Risk of producing `EmptyState` cards with low-effort copy ("¡Ups! Nada aquí todavía"). The frontend-design skill explicitly warns against generic AI aesthetics. | Med | All empty-state copy is written in the proposal, reviewed by the owner, and tested for tone (hand-rolled, not LLM-generated). Cite this skill's principles in the spec. |
| **6** | **Scope creep into auth flow rework.** Tempting to also fix auth UX (error states, sign-out, etc.) in this slice. | Med | Explicit non-goal: 019 is **navigation + empty states + discoverability only**. Auth UX is its own future feature. The proposal's "Out of Scope" list is binding. |
| **7** | **Lighthouse regression on mobile.** The mobile menu and the new header may shift CLS (Cumulative Layout Shift) if not properly sized. | Low-Med | Reserve space for the header (`min-h-16` on the header wrapper). Avoid layout shifts when the mobile menu opens (sheet overlay, not inline push). Verify with Lighthouse in the e2e suite. |

## Alternatives Considered

### Option A — Quick redirect fix (~15 min)

Change `app/auth/signin/page.tsx:41` from `redirect("/analizar/iterate")` to `redirect("/analizar")`. Done. **No nav change. No empty states. No a11y improvements. No tests.**

- **Pro:** 1-line change, ships today.
- **Con:** Solves 1 of 5 user problems (discoverable entry point). Leaves the nav invisible on every other route. Leaves empty states broken. Leaves no a11y improvements. Leaves no tests. Doesn't address the user's actual feedback ("no debe aprenderse URLs") — it just moves the URL the user is forced to learn.

### Option B — Promote nav to layout, nothing else (~1-2 hours)

Move `<LandingNav>` from `app/page.tsx:32` into `app/layout.tsx`. Add 2-3 nav items. No mobile menu, no empty states, no local-mode pill, no a11y improvements, no tests.

- **Pro:** Faster than Option C. Solves the "nav is missing on every route" problem (the largest one).
- **Con:** Half-measure. No mobile responsive nav (broken on phones — Art. VII requires mobile). No empty states (still no discoverable "Import CV" CTA). No a11y improvements. No tests (Art. VIII requires tests-first). The local-mode pill is missing (transparency cost). Ship-now-but-fix-later creates tech debt that the user already explicitly rejected.

### Option C — Full SDD feature (this proposal) (~3-5 hours across spec/design/apply)

Promotion + mobile menu + empty states + local-mode pill + a11y + tests + e2e. Follows the project's SDD discipline.

- **Pro:** Resolves all 5 user problems in one coherent slice. Aligns with Art. VI (clean architecture — nav is dumb presentational), Art. VIII (tests-first), Art. VII (mobile-friendly). Matches the user's explicit request ("todo deve ser intuitivo"). Self-contained PR with full test coverage. Becomes the v1 launch's foundation (nav won't have to be re-promoted in 6 months).
- **Con:** Higher upfront cost than A or B. Requires spec/design/tasks discipline. Risk of scope creep (mitigated by the explicit non-goals).

### Decision

**Option C wins** because the user's feedback is product-level ("todo deber ser intuitivo y facil de usar"), not a quick-fix ticket. The half-measures (A, B) leave known gaps that the user has already called out. The SDD cost (~3-5 hours) is acceptable for a feature this central to the product's discoverability and the v1 launch.

## Dependencies

- **`BuildCv-web/lib/copy/es.ts`** — owner must approve new copy keys (`nav.global.*`, `emptyStates.*`, `localModePill.*`) before spec phase locks the strings. This is a review dependency, not a code dependency.
- **Tailwind v4 + native `<dialog>`** — both available in the current stack. No new packages needed.
- **Playwright e2e setup** — already exists (`BuildCv-web/playwright.config.ts`). No infra change.
- **None on the backend.** 019 is strictly web-side. `BuildCv-api/` is untouched.
- **None on other web features.** The nav promotes existing routes; no new endpoint is consumed.

## Delivery Strategy

**2 chained PRs (web-only), each green, each ≤ 400 lines diff.**

| PR | Scope | Approx lines | Work units |
|---|---|---|---|
| **PR1** | Root layout promotion + nav expansion + local-mode pill + copy keys. Files: `app/layout.tsx`, `app/page.tsx`, `components/landing/landing-nav.tsx` (extend `NAV_ITEMS`), `components/landing/site-header.tsx` (new), `components/landing/local-mode-pill.tsx` (new), `lib/copy/es.ts` (new keys), unit tests for `LandingNav` (extended) and `SiteHeader`. | ~250 | 5-6 commits: extend NAV_ITEMS → add SiteHeader → add LocalModePill → add copy → strip page-level header → tests + format |
| **PR2** | Mobile menu + empty states + signin redirect fix + Playwright e2e. Files: `components/landing/mobile-nav.tsx` (new), `components/common/empty-state.tsx` (new), `app/analizar/page.tsx` (empty state), `app/analizar/iterate/page.tsx` (empty state + fix discoverability), `app/suscripciones/page.tsx` (empty state), `app/auth/signin/page.tsx` (redirect target change), `e2e/navigation.spec.ts` (new), unit tests for MobileNav and EmptyState. | ~300 | 6-7 commits: MobileNav → EmptyState → apply to routes → signin redirect fix → e2e spec → format + docs |

**Work on `main`**, direct merge per project rules. Each PR's `main` is the previous PR's `main`.

**Per PR gates (must all pass):**
1. `pnpm lint` — 0 errors, 0 warnings.
2. `pnpm build` — 0 errors.
3. `pnpm test` — all Vitest unit + integration tests pass; new tests pass.
4. `pnpm test:e2e` — Playwright e2e passes (chromium only, per v0.5 contract).
5. `constitution-check.sh` — no Art. I–IX violations (the table above is the gate).
6. Lighthouse Accessibility ≥ 95 on `/`, `/analizar`, `/analizar/iterate`, `/importar`, `/auth/signin` (run via Playwright + `@axe-core/playwright`).

## Open Questions (for proposal-review time)

1. **Nav item count: 4 or 5?** The proposal lists 5 primary items (Inicio, Analizar, Importar CV, Suscripciones, Cuenta/Sign-in). At 5, the mobile hamburger is necessary. At 4, an inline nav might fit on small screens. **Default: 5.** User may prefer 4 (drop Suscripciones from the primary nav and surface it via the Cuenta menu).
2. **Where does the brand mark live when the nav is in the layout?** Today the brand mark is in the page-level `<header>` (left of the nav). Two options: (a) brand stays left in the layout header (current visual preserved); (b) brand moves to a top utility bar above the nav. **Default: (a) — preserve current visual, just promote.**
3. **`<HeaderExtras>` slot composition.** The layout will receive children for `<CreditBadge>` and `<UserMenu>` once those components exist (009-auth-web, 010-payments-web). Should the slot be optional in PR1, or should we scaffold a placeholder in PR1? **Default: scaffold a `HeaderExtras` slot in PR1 that renders nothing if no children are passed; auth-web PR fills it later.**
4. **`/auth/signin` redirect target in local mode.** The proposal says `/analizar`. Alternative: `/` (true landing) so the user sees the full discoverability story. **Default: `/analizar`** (closer to the user's apparent goal; the nav now makes `/` discoverable from there).
5. **Auth-gating `Suscripciones` in the nav.** Show the link always (current pattern) or only when authenticated? **Default: always visible, with a "Iniciá sesión" empty state on click when not authed** (more discoverable than hiding).
6. **Empty-state iconography.** The proposal calls for an `icon` prop on `<EmptyState>`. SVG icons (current project pattern, in `components/icons/` or inline) or omit icons entirely (cleaner)? **Default: optional icon prop; ship one or two icons with the new component; spec phase decides which.**

## Next

`sdd-spec` → write `spec.md` with 10+ requirements (R1: nav visible on all routes, R2: mobile menu, R3: empty states, R4: local-mode indicator, R5: local-mode redirect fix, R6: keyboard a11y, R7: skip-to-content preserved, R8: WCAG 2.2 AA compliance, R9: zero new dependencies, R10: copy centralization, R11: Playwright e2e coverage) + scenarios using `Given/When/Then`.

Then `sdd-design` → component contracts, prop interfaces, copy key schema, Playwright selector conventions.

Then `sdd-tasks` → forecast 400-line budget per PR, lock work-unit commits per PR, recommend 2 chained PRs.

Then `sdd-apply` → 2 chained PRs, each green, each mergeable on `main`.

## References

- **Existing landing nav:** `BuildCv-web/components/landing/landing-nav.tsx` (46 lines), tests at `__tests__/components/landing/landing-nav.test.tsx`.
- **Root layout (where to inject):** `BuildCv-web/app/layout.tsx` (43 lines, has skip-to-content already at lines 31-36).
- **Home page (where to strip the inline header):** `BuildCv-web/app/page.tsx` (lines 25-33 hold the duplicated header + nav).
- **Local-mode redirect (the bug):** `BuildCv-web/app/auth/signin/page.tsx:41` (`redirect("/analizar/iterate")`).
- **Copy centralization:** `BuildCv-web/lib/copy/es.ts` (482 lines, full Spanish copy).
- **Routes shipped to date:** `/` (landing), `/analizar`, `/analizar/iterate`, `/analizar/diff`, `/analizar/editar`, `/importar`, `/auth/signin`, `/suscripciones`. See `BuildCv-web/specs/000-INDEX.md`.
- **Constitution (ley suprema):** `BuildCv-api/.specify/memory/constitution.md` v1.2.0 (Art. III, IV, VI, VII, VIII most relevant to this proposal).
- **Prior proposal format reference:** `BuildCv-api/specs/018-cv-iteration-loop/proposal.md` (mirrored for sections, tone, depth).
- **Web project rules:** `BuildCv-web/AGENTS.md` (no external UI libs, copy centralization, 0 suppressions, WCAG via accessibility skill).
- **Accessibility skill:** `~/.config/opencode/skills/accessibility/SKILL.md` (WCAG 2.2 AA criteria, 24×24 target size, focus management).
- **Frontend-design skill:** `BuildCv-web/.agents/skills/frontend-design/SKILL.md` (distinctive UI, no AI slop, intentional aesthetic).
- **SEO skill:** `BuildCv-web/.agents/skills/seo/SKILL.md` (will inform the navigation's link semantics and structure).