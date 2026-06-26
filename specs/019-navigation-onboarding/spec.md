# Spec: 019-navigation-onboarding — Persistent, Accessible Navigation Across the App

**Feature**: 019-navigation-onboarding
**Hito**: v0.5.1
**Status**: [Spec] — Pending design
**Created**: 2026-06-25
**Proposal**: [./proposal.md](./proposal.md) (11 decisions locked)
**Constitution**: v1.2.0 (ley suprema, applies cross-cutting)

> **WEB-only change.** No API counterpart. Backend `BuildCv-api/` is untouched.
> **INDEX global:** [../000-INDEX.md](../000-INDEX.md)
> **Reuses (zero new domain logic):** `LandingNav` (007-landing-ui), `lib/copy/es.ts`, `lib/auth.ts` (`IS_LOCAL`), `lib/storage/icv-store.ts`.

---

## Overview

A persistent site header rendered on every authenticated and anonymous route of `BuildCv-web`, exposing five discoverable primary destinations (`Inicio`, `Analizar`, `Importar CV`, `Suscripciones`, `Cuenta`) with a mobile hamburger fallback, a non-intrusive local-mode indicator pill, and a typed `<HeaderExtras>` slot for future auth-aware UI (credit badge, user menu). The local-mode auto-redirect from `/auth/signin` lands on `/analizar` (a discoverable entry point with empty state), not `/analizar/iterate` (the wizard's deepest leaf). Every page that requires prior state (CV loaded, vacancy loaded, subscription active) renders an `<EmptyState>` with one singular CTA. Mobile menu uses the native `<dialog>` for focus trap, Esc-to-close, and backdrop dismiss without a third-party UI library. No new persistence, no new dependencies, no auth derivation inside the nav (Art. VI clean architecture boundary).

---

## Glossary

| Term | Definition |
|---|---|
| **SiteHeader** | The new layout-level component (`components/landing/site-header.tsx`) that composes the brand mark, `<LandingNav>`, `<MobileNav>`, `<LocalModePill>`, and the `<HeaderExtras>` slot. |
| **LandingNav** | The promoted existing component (`components/landing/landing-nav.tsx`) that renders the inline pill-list nav for ≥ `sm` viewports. Receives an array of `{href, label}` and renders. |
| **MobileNav** | The new component (`components/landing/mobile-nav.tsx`) that renders only below `sm` (640px). Contains a real `<button>` hamburger + a native `<dialog>` with the same nav items. |
| **EmptyState** | The new presentational component (`components/common/empty-state.tsx`) with props `{ icon?, title, description, primaryCta }`. Used on routes with unmet state preconditions. |
| **LocalModePill** | The new component (`components/landing/local-mode-pill.tsx`) that renders a non-intrusive `Modo local` indicator when `IS_LOCAL === true`. |
| **HeaderExtras** | The typed React-node slot in `<SiteHeader>`. Default `null`. Consumed by the layout or by route-level `layout.tsx` files to inject `<CreditBadge>`, `<UserMenu>`, etc. without coupling `<LandingNav>` to auth state. |
| **IS_LOCAL** | The existing boolean constant from `lib/auth.ts` that mirrors the `NEXT_PUBLIC_LOCAL_MODE` env var. Read at module load (public env, safe to consume in client components). |
| **Discoverable entry point** | A route that, when reached with no prior state, explains the next concrete step via `<EmptyState>` and offers one primary CTA. `/analizar` qualifies; `/analizar/iterate` does not (deepest wizard leaf). |
| **Native `<dialog>`** | The HTML element with `showModal()` / `close()` API. Browsers handle focus trap, Esc-to-close, and backdrop interaction natively — no JS library needed. |
| **`aria-current="page"`** | The accessible attribute set on the nav link whose `href` matches the current route (or a parent of it), per WCAG 2.4.8 (Location, AAA — bonus). |

---

## Requirements

### REQ-NAV-001: Persistent header on every route

**SHALL** render a single `<SiteHeader>` on every route of `BuildCv-web` (both authenticated and anonymous, including `/`, `/analizar`, `/analizar/iterate`, `/analizar/diff`, `/analizar/editar`, `/importar`, `/suscripciones`, `/auth/signin`, `not-found`, and `error` boundaries).

**Rationale.** Today the nav is rendered only on `/` (`app/page.tsx:32`), so users leaving the landing lose every entry point. Promotion to the root layout fixes this for free (Art. VII — discoverability). **Maps to**: Constitution Art. VI (composition over coupling), Art. VII (no friction, no user-stuck moments).

**Scenario: Home page renders the layout-level header**
- **Given** the user navigates to `/`
- **When** the page renders
- **Then** `<SiteHeader>` is visible in the rendered DOM
- **And** the page contains exactly **one** `<header>` element (the layout-level one)
- **And** the page contains exactly **one** `<nav aria-label="Navegación principal">` element

**Scenario: Analyze page renders the layout-level header**
- **Given** the user navigates to `/analizar`
- **When** the page renders
- **Then** `<SiteHeader>` is visible at the top of the page
- **And** the previously page-local `<header>` block on `/analizar` (`app/analizar/page.tsx:14-22`) is **removed** (consolidated into the layout-level header; no duplicate brand mark)

**Scenario: Wizard sub-route renders the layout-level header**
- **Given** the user navigates to `/analizar/iterate`
- **When** the page renders
- **Then** `<SiteHeader>` is visible
- **And** the user can reach `/importar` and `/` via the header without typing a URL

**Scenario: Auth page renders the layout-level header**
- **Given** the user navigates to `/auth/signin`
- **When** the page renders (whether IS_LOCAL is true or false)
- **Then** `<SiteHeader>` is visible
- **And** the sign-in form is reachable without losing the nav context

---

### REQ-NAV-002: Exactly one `<nav>` with N items

**SHALL** render exactly one `<nav aria-label="Navegación principal">` element per page, containing exactly **N=5** nav items by default: `Inicio` (`/`), `Analizar` (`/analizar`), `Importar CV` (`/importar`), `Suscripciones` (`/suscripciones`), `Cuenta` (`/auth/signin` for anonymous; `/cuenta` for authenticated — content of this last item is owned by future auth features and is not changed in 019).

**Rationale.** A single, semantic `<nav>` with an explicit `aria-label` is the WCAG 2.4.1 (Bypass Blocks) and 2.4.6 (Headings and Labels) contract. Five items is the locked proposal default (Decision #3). The `Suscripciones` link is always visible (locked Decision in proposal Open Question #5) — anonymous users get an empty-state CTA on click rather than a hidden link, because hiding reduces discoverability. **Maps to**: Constitution Art. IV (honest naming), Art. VI (clean nav surface).

**Scenario: Header contains exactly five nav items**
- **Given** the user is on any route (anonymous or authenticated)
- **When** `<SiteHeader>` renders
- **Then** `screen.getAllByRole("link", { name: /inicio|analizar|importar cv|suscripciones|cuenta/i })` returns exactly 5 links
- **And** `screen.getByRole("navigation", { name: /navegación principal/i })` returns exactly 1 element

**Scenario: All five items have hrefs matching their routes**
- **Given** the header is rendered
- **When** a test inspects each link's `href`
- **Then** `Inicio.href === "/"`, `Analizar.href === "/analizar"`, `Importar CV.href === "/importar"`, `Suscripciones.href === "/suscripciones"`, `Cuenta.href === "/auth/signin"` (anonymous) or `Cuenta.href === "/cuenta"` (authenticated — placeholder URL in PR1, owned by future auth features)

---

### REQ-NAV-003: Mobile hamburger opens a native `<dialog>`

**SHALL** display a hamburger `<button>` (with `aria-expanded`, `aria-controls`, and accessible name) below 640px (`sm` breakpoint in Tailwind v4). Tapping the hamburger opens a native `<dialog>` element containing the same five nav items as the desktop nav, rendered as a vertical list. The hamburger button is hidden at ≥ 640px (where the inline `<LandingNav>` is visible instead). The desktop `<LandingNav>` is hidden at < 640px.

**Rationale.** Native `<dialog>` handles focus trap, Esc-to-close, and backdrop interaction per platform convention — no third-party UI library (Art. VI: "no sobre-ingeniería"). Below 640px, five inline pills overflow horizontally and crowd the viewport, so a sheet-style overlay is the appropriate responsive pattern. **Maps to**: Constitution Art. VI (reuse platform primitives), Art. VII (mobile-friendly by default).

**Scenario: Mobile viewport shows the hamburger button**
- **Given** the viewport is `< 640px` wide (e.g., 375 × 812 iPhone)
- **When** `<SiteHeader>` renders
- **Then** exactly one `<button aria-label="Abrir menú">` is visible
- **And** the desktop `<LandingNav>` is not visible (it is hidden via Tailwind `sm:flex` / default-hidden utility classes)
- **And** the `<dialog>` element is in the DOM but is not `open` (no visible items)

**Scenario: Tapping the hamburger opens the dialog**
- **Given** the viewport is `< 640px` and the hamburger is focused
- **When** the user activates the hamburger (click / Enter / Space)
- **Then** `dialog.showModal()` is called (native open)
- **And** the dialog now displays the same 5 nav items as a vertical list
- **And** `aria-expanded="true"` is set on the hamburger button
- **And** focus moves to the first interactive element inside the dialog (the close button or the first link)

**Scenario: Desktop viewport hides the hamburger**
- **Given** the viewport is `≥ 640px` wide (e.g., 1280 × 800)
- **When** `<SiteHeader>` renders
- **Then** the hamburger button is not visible (Tailwind `sm:hidden` or equivalent)
- **And** the inline `<LandingNav>` pill list is visible with all 5 items

---

### REQ-NAV-004: Focus trap and restore on mobile dialog

**SHALL** trap focus inside the mobile `<dialog>` while it is open, and restore focus to the hamburger button when the dialog closes (via Esc, backdrop click, or the close button). Tab cycling stays within the dialog (no Tab can reach elements behind the modal). Shift+Tab from the first focusable item also stays inside.

**Rationale.** WCAG 2.4.3 (Focus Order) requires a logical focus order and WCAG 2.1.2 (No Keyboard Trap) requires the trap to be dismissible. Native `<dialog>` provides the trap, but focus restoration to the trigger is our responsibility. **Maps to**: WCAG 2.2 §2.4.3, §2.1.2; Constitution Art. VII (keyboard-only operable).

**Scenario: Esc closes the dialog and restores focus to the hamburger**
- **Given** the mobile dialog is open and focus is on the third nav link inside
- **When** the user presses Escape
- **Then** `dialog.close()` is called
- **And** `document.activeElement === hamburgerButton` (focus restored)
- **And** `aria-expanded="false"` is set on the hamburger

**Scenario: Tab cycles inside the dialog**
- **Given** the mobile dialog is open and focus is on the last nav link
- **When** the user presses Tab
- **Then** focus moves to the close button (or wraps back to the first focusable element inside the dialog)
- **And** focus never reaches elements behind the dialog

**Scenario: Backdrop click closes the dialog**
- **Given** the mobile dialog is open
- **When** the user clicks the backdrop (outside the dialog content)
- **Then** `dialog.close()` is called and focus restores to the hamburger

**Scenario: Close button activates correctly**
- **Given** the mobile dialog is open and focus is on the close button (X icon)
- **When** the user activates it (click / Enter / Space)
- **Then** the dialog closes and focus restores to the hamburger

---

### REQ-EMPTY-001: Empty states on every route with unmet preconditions

**SHALL** render a single `<EmptyState>` component on any route whose state preconditions are unmet. Each `<EmptyState>` has exactly one primary CTA and an optional decorative `icon`. Concrete application:
- `/analizar` with empty CV textarea AND empty vacancy textarea → "Pegá tu CV y la vacante para empezar" + primary CTA "Ver cómo importar un CV" (links to `/importar`).
- `/analizar/iterate` with no inputs in `ICvStore` → "Importá un CV o pegá texto + la vacante" + primary CTA "Importar CV" (links to `/importar`).
- `/suscripciones` with no authenticated session → "Iniciá sesión para ver tu plan" + primary CTA "Iniciar sesión" (links to `/auth/signin`).
- Other routes (`/analizar/diff`, `/analizar/editar`) ship their own pre-existing empty/error states unchanged in 019.

**Rationale.** Empty states are the discoverability safety net (Art. IV — honest framing; Art. VII — never strand the user). One CTA per empty state avoids decision paralysis (locked Decision #8). **Maps to**: Constitution Art. IV, Art. VII; WCAG 2.4.6 (Headings and Labels).

**Scenario: Empty analyzer shows the empty state with one CTA**
- **Given** the user is on `/analizar`
- **And** both the CV textarea and the vacancy textarea are empty
- **When** the page renders
- **Then** `<EmptyState>` is visible with the analyze-specific title and description
- **And** exactly one primary CTA button is rendered
- **And** that CTA links to `/importar`

**Scenario: Empty iterate page shows the empty state**
- **Given** the user lands on `/analizar/iterate` (e.g., via direct URL or stale bookmark)
- **And** the `ICvStore` contains no CV text
- **When** the page renders
- **Then** `<EmptyState>` is visible with the iterate-specific copy
- **And** the primary CTA links to `/importar`

**Scenario: Anonymous subscriptions page shows the sign-in CTA**
- **Given** the user is anonymous and navigates to `/suscripciones`
- **When** the page renders
- **Then** `<EmptyState>` is visible with the sign-in prompt
- **And** the primary CTA links to `/auth/signin`
- **And** no subscription data or pricing table is rendered

**Scenario: EmptyState renders one, not many, CTAs**
- **Given** any `<EmptyState>` is rendered
- **When** a test counts the primary CTA buttons (e.g., `getAllByRole("link", { name: /importar|cargar|iniciar/i })`)
- **Then** exactly **one** primary CTA is present (no secondary buttons in PR1)

---

### REQ-LOCAL-001: Local-mode redirect target is `/analizar`

**SHALL** change the `IS_LOCAL`-guarded redirect in `app/auth/signin/page.tsx` from `/analizar/iterate` to `/analizar`. The page-level guard remains (still auto-redirects in local mode to skip the sign-in form), but the target is now a discoverable entry point instead of a wizard leaf.

**Rationale.** `/analizar/iterate` is the deepest leaf of the wizard — landing there with no CV is the user-visible bug. `/analizar` has a clear empty state (REQ-EMPTY-001) with a primary CTA to `/importar` (Art. IV honest framing; Art. VII no friction). **Maps to**: Constitution Art. IV, Art. VII; proposal Decision #5.

**Scenario: Local-mode sign-in redirects to /analizar**
- **Given** `IS_LOCAL === true` (i.e., `NEXT_PUBLIC_LOCAL_MODE === "true"`)
- **When** the user navigates to `/auth/signin`
- **Then** the page performs `redirect("/analizar")`
- **And** the URL bar shows `/analizar`, not `/analizar/iterate`

**Scenario: Non-local sign-in still renders the sign-in form**
- **Given** `IS_LOCAL === false`
- **When** the user navigates to `/auth/signin`
- **Then** the sign-in form renders (no redirect)
- **And** the Google and LinkedIn buttons are visible

**Scenario: Existing test that expects /analizar/iterate is updated**
- **Given** any e2e or unit test that asserts `redirect("/auth/signin")` ends at `/analizar/iterate`
- **When** the change ships
- **Then** that test is updated in the same PR to assert the new target `/analizar` (per proposal Risk #4)

---

### REQ-LOCAL-002: Local-mode indicator pill in the header

**SHALL** render a `<LocalModePill>` (small `Modo local` badge) inside `<SiteHeader>` when `IS_LOCAL === true`. The pill is hidden in production builds (where `IS_LOCAL === false`). It must be non-intrusive: no animation, no dismissal, no modal — a static informational badge that explains why no auth is required.

**Rationale.** Transparency about runtime mode is an Art. III + Art. IV requirement: users in local mode should know they are not in production (it changes expectations about auth, rate limits, and persistence). The pill is not a consent gate — the env var is the gate. **Maps to**: Constitution Art. III, Art. IV; proposal Decision #6.

**Scenario: Local-mode pill is visible in local builds**
- **Given** `IS_LOCAL === true`
- **When** `<SiteHeader>` renders
- **Then** a `<LocalModePill>` element with text `Modo local` is visible
- **And** it has a non-decorative accessible name (e.g., `aria-label="Modo local activo, sin autenticación requerida"` or visible text)

**Scenario: Local-mode pill is hidden in production builds**
- **Given** `IS_LOCAL === false`
- **When** `<SiteHeader>` renders
- **Then** `<LocalModePill>` is not in the rendered DOM (not just visually hidden)

**Scenario: Pill does not block other nav elements**
- **Given** `IS_LOCAL === true`
- **When** the header renders at desktop viewport
- **Then** the pill is rendered alongside (not on top of) the nav items and brand mark
- **And** keyboard Tab order reaches nav items after the brand, not after the pill (or after the pill — the exact order is a design decision locked in `design.md`, but the pill must not trap or skip focus)

---

### REQ-A11Y-001: Keyboard operability and visible focus

**SHALL** make every interactive element in `<SiteHeader>`, `<LandingNav>`, `<MobileNav>`, `<LocalModePill>`, and `<EmptyState>` reachable via keyboard alone (Tab / Shift+Tab). Every interactive element SHALL have a visible `:focus-visible` outline. Every clickable element SHALL have a minimum target size of 24×24 CSS pixels (WCAG 2.5.8).

**Rationale.** Art. VII requires mobile-friendly AND keyboard-friendly. WCAG 2.4.7 (Focus Visible) and 2.5.8 (Target Size, new in 2.2) are the explicit criteria. **Maps to**: WCAG 2.2 §2.1.1, §2.4.7, §2.5.8; Constitution Art. VII.

**Scenario: All nav links reachable by Tab**
- **Given** the user is on `/` and has not yet pressed Tab
- **When** the user presses Tab repeatedly
- **Then** focus reaches: the skip-to-content link (already in `app/layout.tsx:31-36`), then the brand mark, then each of the 5 nav links in DOM order, then the `<LocalModePill>` (if visible) or the next focusable element on the page
- **And** every focused element displays a visible `:focus-visible` outline

**Scenario: Mobile hamburger has visible focus and 24x24 target**
- **Given** the viewport is `< 640px`
- **When** the hamburger button is focused via Tab
- **Then** a visible outline appears on the button
- **And** the button's bounding box is at least 24×24 CSS pixels

**Scenario: Empty-state CTA is keyboard activatable**
- **Given** an empty state is rendered on `/analizar`
- **When** the user Tabs to the primary CTA and presses Enter or Space
- **Then** navigation to `/importar` occurs (client-side route change)

---

### REQ-A11Y-002: Color contrast meets WCAG 2.2 AA

**SHALL** ensure all text and UI graphics in `<SiteHeader>`, `<LandingNav>`, `<MobileNav>`, `<LocalModePill>`, and `<EmptyState>` meet WCAG 2.2 AA contrast minimums: **4.5:1** for normal text (< 18px or < 14px bold), **3:1** for large text (≥ 18px or ≥ 14px bold), and **3:1** for UI components and graphical objects.

**Rationale.** WCAG 1.4.3 (Contrast Minimum) is the AA-level rule for text. 1.4.11 (Non-text Contrast) extends to UI components. **Maps to**: WCAG 2.2 §1.4.3, §1.4.11.

**Scenario: Active nav item meets 4.5:1 contrast**
- **Given** the user is on `/analizar` so `Analizar` is the active nav item
- **When** a contrast checker evaluates `text-accent` against the page background
- **Then** the contrast ratio is `≥ 4.5:1`

**Scenario: Local-mode pill text meets 4.5:1 contrast**
- **Given** the pill is rendered with its chosen background and text color
- **When** a contrast checker evaluates the pill text against its background
- **Then** the contrast ratio is `≥ 4.5:1`

**Scenario: Empty-state description text meets 4.5:1**
- **Given** `<EmptyState>` is rendered on `/analizar`
- **When** a contrast checker evaluates the description text against the page background
- **Then** the ratio is `≥ 4.5:1`

---

### REQ-PRIV-001: Nav does not read persistent storage

**SHALL NOT** read from `localStorage`, `IndexedDB`, `sessionStorage`, cookies, the backend API, or any other persistent store. `<SiteHeader>`, `<LandingNav>`, `<MobileNav>`, `<LocalModePill>`, and `<EmptyState>` SHALL be pure presentational components whose only data inputs are props, env vars consumed at module-load, or route-derived values from `usePathname`.

**Rationale.** Art. III (Privacidad primero) — v0 does not persist anything new. The nav must not introduce hidden read paths. **Maps to**: Constitution Art. III, Art. VI (no IO in presentational components).

**Scenario: Nav has no storage reads in its module graph**
- **Given** the build artifacts of `<SiteHeader>`, `<LandingNav>`, `<MobileNav>`, `<LocalModePill>`, and `<EmptyState>`
- **When** a static check greps for `localStorage`, `IndexedDB`, `sessionStorage`, `document.cookie`, or `fetch(` calls inside the components' files
- **Then** zero matches are found (except for an explicit allowed list, e.g., `IS_LOCAL` constant from `lib/auth.ts` which is itself a build-time env read)

**Scenario: EmptyState does not derive auth state internally**
- **Given** `<EmptyState>` is rendered on `/suscripciones` for an anonymous user
- **When** the test renders the component with no props related to auth
- **Then** it still renders the sign-in CTA — the auth state is owned by the page, not by `<EmptyState>`

---

### REQ-COPY-001: All user-visible strings live in `lib/copy/es.ts`

**SHALL** live every user-visible string used by 019 components in `lib/copy/es.ts` under new namespaces:
- `copy.nav.global.*` — labels for the 5 nav items (Inicio, Analizar, Importar CV, Suscripciones, Cuenta).
- `copy.nav.brand` — the brand mark text (reuses existing `copy.appName`).
- `copy.mobileNav.*` — hamburger button label, close button label, dialog aria-label.
- `copy.emptyStates.analyze.*`, `copy.emptyStates.iterate.*`, `copy.emptyStates.subscriptions.*` — title + description + CTA for each empty state.
- `copy.localModePill.*` — pill text and accessible description.
- `copy.headerExtras.*` — placeholder string for any future extras (optional, deferred).

Strings SHALL be in neutral/professional Spanish, Art. IV compliant: never "garantizado", "perfect match", "alto porcentaje de éxito", "ATS oficial". Component files SHALL NOT contain hardcoded Spanish strings in JSX, `aria-label`, or `title` props.

**Rationale.** Copy centralization is a project convention (per `BuildCv-web/AGENTS.md`) and supports future i18n. Art. IV compliance is enforced by routing every string through `lib/copy/es.ts` where the owner reviews tone before locking. **Maps to**: Constitution Art. IV; project conventions.

**Scenario: No Spanish strings in component JSX**
- **Given** the source files for `<SiteHeader>`, `<LandingNav>`, `<MobileNav>`, `<LocalModePill>`, and `<EmptyState>`
- **When** a static check greps for Spanish diacritics or common Spanish stop-words in JSX literals (`>`, `{`, `=` inside JSX)
- **Then** zero matches are found (every string is sourced from `copy.*`)

**Scenario: Copy keys are added before component renders**
- **Given** a component imports from `@/lib/copy/es.ts`
- **When** the test runs
- **Then** every `copy.*` key referenced by the component exists in `es.ts`
- **And** TypeScript `noUncheckedIndexedAccess` (or equivalent strict mode) reports zero errors

---

### REQ-MOBILE-001: Landscape, reduced-motion, and small-viewport handling

**SHALL** make the mobile nav dialog work correctly in landscape orientation (small height, wide width), honor `prefers-reduced-motion: reduce` (no slide/scale animation on open or close), and respect viewport sizes between 320px and 640px without overflow or clipping.

**Rationale.** WCAG 2.3.3 (Animation from Interactions, new in 2.2) requires honoring reduced-motion preferences. Landscape mobile users are common (e.g., a phone propped up while typing). **Maps to**: WCAG 2.2 §2.3.3, §1.4.4 (Resize Text).

**Scenario: Dialog honors prefers-reduced-motion**
- **Given** the user has `prefers-reduced-motion: reduce` enabled at the OS level
- **When** the mobile dialog opens
- **Then** no transition/animation runs (the dialog appears instantly)
- **And** on close, no transition/animation runs

**Scenario: Landscape viewport (568 × 320) shows the full dialog**
- **Given** the viewport is 568 × 320 (iPhone SE landscape)
- **When** the mobile dialog opens
- **Then** all 5 nav items + the close button are visible inside the dialog without scrolling the page
- **And** no element is clipped by the viewport edges

---

### REQ-NAV-PILL: HeaderExtras slot is typed, default null, rendered after nav

**SHALL** accept an optional `extras?: React.ReactNode` prop in `<SiteHeader>`. The slot SHALL be rendered after the nav items in DOM order (so future auth-aware components appear to the right of the inline nav on desktop, and at the bottom of the mobile list in the mobile dialog). Default value is `null`. The slot is **not** consumed by `<LandingNav>` or `<MobileNav>` directly — those stay pure presentational and accept no auth-derived data.

**Rationale.** Art. VI clean architecture boundary: `<LandingNav>` and `<MobileNav>` know nothing about auth, credits, or the API. Auth-aware UI is composed by the layout (or by future route-level `layout.tsx`) via `<HeaderExtras>`. This keeps the nav reusable for future white-label contexts. **Maps to**: Constitution Art. VI; proposal Decision #2.

**Scenario: SiteHeader accepts an extras prop**
- **Given** the layout renders `<SiteHeader extras={<CreditBadge />}>`
- **When** the header is rendered at desktop viewport
- **Then** `<CreditBadge>` is rendered after the nav items in DOM order
- **And** the nav items are still keyboard-reachable in the same order

**Scenario: Default extras is null (no auth-aware components in PR1)**
- **Given** the layout renders `<SiteHeader>` with no `extras` prop
- **When** the header renders
- **Then** no extras are rendered (the slot is empty, not a placeholder)
- **And** the nav still works end-to-end

**Scenario: LandingNav and MobileNav stay pure**
- **Given** the source of `<LandingNav>` and `<MobileNav>`
- **When** a static check greps for imports of `@/lib/auth`, `@/lib/api`, `useSession`, `useCredits`, or `next-auth`
- **Then** zero matches are found

---

### REQ-LANDING-001: Home page contains exactly one `<header>`

**SHALL** remove the inline `<header>` block at `app/page.tsx:25-33` (which currently contains the brand mark + `<LandingNav>`) once the layout-level header is in place. The home page SHALL contain exactly one `<header>` element (the layout-level one) and exactly one `<nav aria-label="Navegación principal">` (also the layout-level one).

**Rationale.** Promoting the header to the layout without stripping the page-level one causes double-rendering: brand mark and nav appear twice on `/`. This is broken UX, broken a11y (two `<nav>` elements, two `Saltar al contenido` paths), and broken Lighthouse (CLS, duplicate landmarks). **Maps to**: WCAG 2.4.1 (Bypass Blocks), HTML spec (one `<header>` per region).

**Scenario: Home page has one header and one nav**
- **Given** the layout-level `<SiteHeader>` is in place
- **When** the home page `/` renders
- **Then** `document.querySelectorAll("header").length === 1`
- **And** `document.querySelectorAll("nav[aria-label='Navegación principal']").length === 1`
- **And** `document.querySelectorAll("a[href='/']").length === 1` (only the layout-level brand link)

**Scenario: Analyze page no longer renders a duplicate header**
- **Given** the layout-level `<SiteHeader>` is in place
- **When** the analyze page `/analizar` renders
- **Then** `document.querySelectorAll("header").length === 1`
- **And** the page-local `<header>` block (`app/analizar/page.tsx:14-22`) is removed
- **And** the `<CreditArea>` component (if still present) is now composed via `<HeaderExtras>` in the layout OR moved into the page body — not duplicated into a second header

---

### REQ-SEO-001: Header uses semantic `<a href>` links

**SHALL** render every nav item as a `<Link>` (Next.js) that produces a real `<a href="...">` element in the DOM — **not** as `<button onClick={router.push(...)}>`. Crawlers must be able to discover the routes via the rendered HTML without executing JavaScript.

**Rationale.** SEO requires crawlable internal links. Buttons that navigate via JS are invisible to most crawlers and break the discoverability of `/importar`, `/suscripciones`, etc. WCAG 2.4.4 (Link Purpose) further requires that link purpose be discernible from the link text alone — which our Spanish labels satisfy. **Maps to**: SEO fundamentals; WCAG 2.4.4.

**Scenario: Nav items are real anchor tags**
- **Given** the header is rendered
- **When** a test inspects each nav link
- **Then** `link.tagName === "A"` for every nav item
- **And** each link has a non-empty `href` attribute that starts with `/`
- **And** `link.getAttribute("role") !== "button"`

**Scenario: Crawler can discover all routes from the home page HTML**
- **Given** the home page `/` is rendered (server-side)
- **When** a static crawler inspects the initial HTML
- **Then** the HTML contains `<a href="/analizar">`, `<a href="/importar">`, `<a href="/suscripciones">`, and `<a href="/auth/signin">`
- **And** no route requires JS execution to be discovered

---

### REQ-TEST-001: Tests ship before implementation, with e2e for nav promotion

**SHALL** ship co-located Vitest unit tests for every new component before the implementation lands (red-green-refactor). Tests SHALL cover:
- `<LandingNav>` (extended): 5 items render, `aria-current="page"` logic across all primary routes + nested children (parametrized table).
- `<SiteHeader>` (new): composition test (renders nav + extras + local-mode pill conditionally).
- `<MobileNav>` (new): keyboard interaction tests (Esc closes, Tab traps, focus restoration).
- `<EmptyState>` (new): snapshot + interaction tests (renders icon, title, description, CTA).
- `<LocalModePill>` (new): renders when `IS_LOCAL=true`, hidden otherwise.

**SHALL** ship a Playwright e2e spec (`e2e/navigation.spec.ts`) covering at minimum: (a) land on `/` → see nav with 5 items; (b) click `Importar CV` → land on `/importar` → press browser back → return to `/` with `Inicio` highlighted; (c) keyboard-only traversal (Tab through all nav items); (d) mobile viewport → hamburger opens dialog → Esc closes → focus restored to hamburger; (e) local-mode redirect from `/auth/signin` lands on `/analizar`; (f) local-mode pill visible in local build, hidden in production.

**Rationale.** Art. VIII — TDD / tests-first. Lighthouse Accessibility ≥ 95 on `/`, `/analizar`, `/analizar/iterate`, `/importar`, `/auth/signin` (gated by Playwright + `@axe-core/playwright`). Zero suppressions (`// @ts-ignore`, `// eslint-disable`, `it.skip`) — exceptions require constitutional amendment. **Maps to**: Constitution Art. VIII.

**Scenario: Vitest suite passes for all new components**
- **Given** the implementation is complete
- **When** `pnpm test` runs
- **Then** all unit tests pass (≥ 90% line coverage on new components)
- **And** zero suppressions exist in the test files (no `it.skip`, no `vi.skip`)

**Scenario: Playwright e2e covers the discoverability flow**
- **Given** the implementation is complete and `pnpm dev` is running
- **When** `pnpm test:e2e` runs the `e2e/navigation.spec.ts` spec
- **Then** all 6 scenarios above pass
- **And** Lighthouse Accessibility audit returns ≥ 95 on the 5 audited routes

**Scenario: Active-state parametrized table**
- **Given** the test file for `<LandingNav>`
- **When** the table-driven test runs for all 5 primary routes + their known children (`/`, `/analizar`, `/analizar/iterate`, `/importar`, `/importar/algomas`, `/suscripciones`, `/auth/signin`)
- **Then** exactly one link has `aria-current="page"` for each route, and that link's `href` is the expected active href per the `isActive` rule

---

## Non-functional requirements

### NFR-PERF-001: Header render budget

The layout-level `<SiteHeader>` SHALL contribute **< 5KB** of JS to the initial bundle (component code only, excluding React/Next runtime) and SHALL add **< 50ms** to Time-to-Interactive on the home page (measured via Lighthouse). The mobile dialog SHALL NOT trigger layout shifts when opening (CLS contribution = 0). Reserve space for the header with `min-h-16` (or equivalent) so the page does not jump when fonts load.

### NFR-A11Y-001: WCAG 2.2 AA compliance

All requirements marked REQ-A11Y-001, REQ-A11Y-002, REQ-MOBILE-001, REQ-NAV-003, and REQ-NAV-004 collectively enforce WCAG 2.2 AA conformance for the navigation surface. Specifically:
- **2.1.1 Keyboard** — every interactive element is keyboard-operable.
- **2.4.1 Bypass Blocks** — skip-to-content link preserved from `app/layout.tsx:31-36`.
- **2.4.3 Focus Order** — logical DOM order, focus restoration on dialog close.
- **2.4.6 Headings and Labels** — descriptive labels on icon buttons, headings in empty states.
- **2.4.7 Focus Visible** — `:focus-visible` outline on every interactive element.
- **2.5.8 Target Size (Minimum)** — 24×24 CSS px on every interactive element.
- **1.4.3 Contrast (Minimum)** — 4.5:1 normal, 3:1 large.
- **1.4.11 Non-text Contrast** — 3:1 for UI components and graphical objects.
- **2.3.3 Animation from Interactions** — honors `prefers-reduced-motion: reduce`.

### NFR-A11Y-002: Semantic HTML and ARIA only when needed

Every component SHALL prefer native HTML semantics (`<nav>`, `<a>`, `<button>`, `<dialog>`, `<header>`). ARIA roles SHALL only be used when no native element exists. `aria-label`, `aria-expanded`, `aria-controls`, and `aria-current` are used per the WAI-ARIA Authoring Practices. **No** `role="button"` on a `<div>`, **no** `role="navigation"` on a `<div>` (use `<nav>`).

### NFR-PRIV-001: Zero new persistence (Art. III)

REQ-PRIV-001 above codifies this. Verifying rule: after the change ships, `git diff main` for the navigation surface SHALL NOT introduce any of: `localStorage`, `IndexedDB`, `sessionStorage`, cookies via `document.cookie`, or new backend API calls. `IS_LOCAL` is consumed from `process.env.NEXT_PUBLIC_LOCAL_MODE` at build time (a public env var), which is not new persistence.

### NFR-I18N-001: Spanish (es-CO) copy

All user-visible copy lives in `lib/copy/es.ts` (REQ-COPY-001). The `<html lang="es-CO">` declaration in `app/layout.tsx:27` is preserved. No copy changes the language based on user locale (v0 is single-locale; i18n is deferred to v1.5).

### NFR-SEO-001: Crawlable internal linking

REQ-SEO-001 above codifies this. The header SHALL preserve the existing `<a href>` pattern. SEO meta tags (`metadata.title`, `metadata.description`) for non-landing pages are unchanged in 019 — the change does NOT alter per-page metadata. The home page keeps its existing JSON-LD (`app/page.tsx:20-23`).

---

## Component contracts (preview — locked in `design.md`)

### `<SiteHeader>` — `components/landing/site-header.tsx`

```ts
interface SiteHeaderProps {
  /** Optional React node rendered after the nav items. Used for auth-aware UI
   *  (CreditBadge, UserMenu) by the layout. Default: null. */
  readonly extras?: React.ReactNode;
}
```

### `<LandingNav>` — `components/landing/landing-nav.tsx` (existing, extended)

```ts
// No prop changes. NAV_ITEMS extended from 2 to 5 items (Decision #3).
// Items: Inicio, Analizar, Importar CV, Suscripciones, Cuenta.
```

### `<MobileNav>` — `components/landing/mobile-nav.tsx` (new)

```ts
// No props — owns its own dialog state via useState + useRef.
// Renders only below `sm` (Tailwind `md:hidden`).
```

### `<EmptyState>` — `components/common/empty-state.tsx` (new)

```ts
interface EmptyStateProps {
  /** Optional decorative icon (SVG node). Rendered as aria-hidden. */
  readonly icon?: React.ReactNode;
  /** Required heading text (rendered as <h2> or <h3> depending on context). */
  readonly title: string;
  /** Required body copy — explains the next concrete step. */
  readonly description: string;
  /** Required primary CTA: { label, href }. */
  readonly primaryCta: {
    readonly label: string;
    readonly href: string;
  };
}
```

### `<LocalModePill>` — `components/landing/local-mode-pill.tsx` (new)

```ts
// No props. Reads `IS_LOCAL` from `lib/auth.ts` at module load.
// Renders nothing when IS_LOCAL === false.
```

---

## Copy keys (preview — added to `lib/copy/es.ts`)

```ts
nav: {
  // Existing
  analyze: "Analizar mi CV",
  // New (proposal Decision #3)
  global: {
    home: "Inicio",
    analyze: "Analizar",
    import: "Importar CV",
    subscriptions: "Suscripciones",
    account: "Cuenta",
  },
  mobileNav: {
    openLabel: "Abrir menú",
    closeLabel: "Cerrar menú",
    dialogLabel: "Menú principal",
  },
  skipToContent: "Saltar al contenido", // moved from layout.tsx for centralization
},
emptyStates: {
  analyze: {
    title: "Empezá pegando tu CV y la vacante",
    description: "Solo texto. No guardamos nada; se procesa en memoria y se descarta al responder.",
    primaryCta: "Ver cómo importar un CV",
  },
  iterate: {
    title: "Necesitamos tu CV y la vacante para iterar",
    description: "Importá un CV o pegá el texto directamente junto con la descripción de la vacante.",
    primaryCta: "Importar CV",
  },
  subscriptions: {
    title: "Iniciá sesión para ver tu plan",
    description: "Las suscripciones y los créditos están vinculados a tu cuenta.",
    primaryCta: "Iniciar sesión",
  },
},
localModePill: {
  label: "Modo local",
  description: "Modo local activo, sin autenticación requerida.",
},
```

---

## Strategy

**2 chained PRs (web-only), each green, each ≤ 400 line diff.**

| PR | Scope | Approx lines | Tests |
|---|---|---|---|
| **PR1** | Root layout promotion + nav expansion + local-mode pill + copy keys + remove inline `<header>` from `app/page.tsx` and `app/analizar/page.tsx`. New files: `components/landing/site-header.tsx`, `components/landing/local-mode-pill.tsx`. Modified: `app/layout.tsx`, `app/page.tsx`, `app/analizar/page.tsx`, `components/landing/landing-nav.tsx`, `lib/copy/es.ts`. | ~250 | Vitest: extend `landing-nav.test.tsx` (5 items + active-state table), new `site-header.test.tsx`, new `local-mode-pill.test.tsx` |
| **PR2** | Mobile menu + `<EmptyState>` + signin redirect fix + Playwright e2e. New files: `components/landing/mobile-nav.tsx`, `components/common/empty-state.tsx`, `e2e/navigation.spec.ts`. Modified: `app/analizar/page.tsx` (use EmptyState), `app/analizar/iterate/page.tsx` (EmptyState + discoverability), `app/suscripciones/page.tsx` (EmptyState for anon), `app/auth/signin/page.tsx` (redirect target). | ~300 | Vitest: new `mobile-nav.test.tsx` (Esc/close/focus restoration), new `empty-state.test.tsx`. Playwright: `e2e/navigation.spec.ts` (6 scenarios from REQ-TEST-001). |

**Work on `main`**, direct merge per project rules. Each PR's `main` is the previous PR's `main`.

**Per PR gates (all must pass):**
1. `pnpm lint` — 0 errors, 0 warnings.
2. `pnpm build` — 0 errors.
3. `pnpm test` — all Vitest unit + integration tests pass; new tests pass.
4. `pnpm test:e2e` — Playwright e2e passes (chromium only, per v0.5 contract).
5. `constitution-check.sh` — no Art. I–IX violations (the table below is the gate).
6. Lighthouse Accessibility ≥ 95 on `/`, `/analizar`, `/analizar/iterate`, `/importar`, `/auth/signin` (run via Playwright + `@axe-core/playwright`).

---

## Compliance

| Article | How 019 complies |
|---|---|
| **I — Cero invención** | Nav contains no IA-generated content. Empty-state copy is hand-written in `lib/copy/es.ts` and reviewed by the owner. No suggestion of fabricated skills, jobs, or experiences. The nav itself is informational, not generative. |
| **II — Puntaje determinista** | Unchanged. 019 does not touch the scoring engine or any algorithm. The nav does not display numbers; empty states do not contain invented metrics. |
| **III — Privacidad primero** | **No new persistence.** Nav uses no `localStorage`, no `IndexedDB`, no cookies (REQ-PRIV-001). The local-mode pill reads `NEXT_PUBLIC_LOCAL_MODE` (already public). Auth-aware nav items use the existing session/credit ports; no new data is collected. **No CV/job content** flows through the nav. |
| **IV — Encuadre honesto** | Nav labels describe what the user actually does: "Analizar" (analyzes), "Importar CV" (imports a CV), "Suscripciones" (manages subscriptions). Never "ATS", "Score oficial", "Match garantizado", "Boost your career" (proposal Decision #3). Empty-state copy is honest about state ("Empezá pegando tu CV y la vacante") rather than aspirational. The local-mode pill is honest about the mode ("Modo local") rather than hidden (REQ-LOCAL-002). |
| **V — Entrada como dato** | Unchanged. 019 does not touch the AI pipeline. The nav is pure UI. |
| **VI — Clean Architecture (frontend)** | **Nav is a presentational component**, no business logic, no API calls, no auth derivation inside (REQ-NAV-PILL). The component receives an array of `{href, label}` and renders. Auth-aware parts live in separate components composed by the layout (composition > coupling). **No new dependencies** (Tailwind v4 + native `<dialog>` only). **No sobre-ingeniería**: promote, don't rewrite; native dialog, not a library. |
| **VII — v0 sin fricción** | The local-mode redirect now lands on `/analizar` (an empty state with a clear CTA), not on `/analizar/iterate` (a wizard leaf) — REQ-LOCAL-001. Users can still paste CV + vacancy directly on `/analizar` (the existing flow). The nav is visible everywhere, so users are never stranded. No new gate, no new friction — strictly less. |
| **VIII — TDD / tests-first** | All new components ship with co-located Vitest unit tests before implementation (REQ-TEST-001). Playwright e2e covers the cross-route navigation flow + mobile menu. 0 suppressions. Accessibility is tested via `@testing-library/jest-dom` (toHaveAccessibleName) and via Lighthouse + `@axe-core/playwright` in the e2e suite. |
| **IX — Habeas Data** | Unchanged. No new data is collected or persisted. No PII in the nav. The local-mode pill is informational, not consent-gated (it's an indicator of state the user already chose via the env var). |

**Verdict: PASSES all nine articles without amendment.**

---

## Acceptance criteria

- [ ] All 16 REQs pass with green tests (REQ-NAV-001 through REQ-TEST-001).
- [ ] All 4 NFRs pass (PERF, A11Y, PRIV, I18N, SEO).
- [ ] All 6 gates pass: lint, build, test, e2e, constitution-check, Lighthouse a11y.
- [ ] Test counts: **+30** (20 unit + 10 e2e scenarios in `navigation.spec.ts`) — matches forecast in PR plan.
- [ ] Home page contains exactly one `<header>` and exactly one `<nav aria-label="Navegación principal">` (REQ-LANDING-001).
- [ ] `/analizar`, `/analizar/iterate`, `/importar`, `/suscripciones`, `/auth/signin` all render the layout-level header (REQ-NAV-001).
- [ ] Mobile (≤ 640px) hamburger opens native `<dialog>` with focus trap and Esc-to-close restoring focus to the trigger (REQ-NAV-003, REQ-NAV-004).
- [ ] Local-mode `/auth/signin` redirects to `/analizar`, not `/analizar/iterate` (REQ-LOCAL-001).
- [ ] Local-mode pill visible in local builds, hidden in production builds (REQ-LOCAL-002).
- [ ] `<EmptyState>` renders on `/analizar` (empty CV+vacancy), `/analizar/iterate` (no inputs), `/suscripciones` (anonymous), each with one primary CTA (REQ-EMPTY-001).
- [ ] All new copy lives in `lib/copy/es.ts` under `nav.global.*`, `nav.mobileNav.*`, `emptyStates.*`, `localModePill.*` (REQ-COPY-001).
- [ ] Zero new dependencies in `package.json` (REQ-NAV-PILL — native `<dialog>` + Tailwind v4 only).
- [ ] Zero suppressions: no `// @ts-ignore`, no `// eslint-disable`, no `it.skip` (Art. VIII).
- [ ] Lighthouse Accessibility ≥ 95 on `/`, `/analizar`, `/analizar/iterate`, `/importar`, `/auth/signin`.

---

## Out of scope (deferred)

- **Full multi-step wizard with persistent progress bar.** That's a product redesign; defer to v1.5.
- **Onboarding tooltips / coach-marks (e.g., userpilot, intro.js).** Adds a dep, is decorative, and bakes a vendor into the codebase. Defer.
- **A/B testing the CTA copy.** We don't have analytics infra; defer to v1 (post-payments).
- **Bottom-nav for mobile.** Top hamburger is enough for 5 nav items. Don't add a second navigation paradigm.
- **Search / command palette.** Out of scope; we have 5 primary routes, not 50.
- **Auth state derivation in the nav.** The nav stays a dumb presentational component (REQ-NAV-PILL). Session/credit state lives in dedicated components (`<CreditBadge>`, `<UserMenu>`) consumed by the layout via `<HeaderExtras>`, not by `<LandingNav>` itself.
- **Subtle wizard breadcrumbs** on `/analizar/iterate` and `/analizar/diff` (proposal should-have #1). Defer; if budget allows in a follow-up.
- **Cross-route context preservation** (proposal should-have #2). Defer behind a feature flag.
- **`<HeaderExtras>` consumers** (`<CreditBadge>`, `<UserMenu>`). The slot is scaffolded empty in PR1 (Decision in proposal Open Question #3); future auth/payments features fill it.

---

## Open clarifications

None blocking. The 11 decisions in `proposal.md` are locked. The 6 proposal open questions were resolved at proposal-review time:
1. **Nav item count** → 5 (Decision #3).
2. **Brand placement** → layout-level header, brand stays left (Decision in proposal).
3. **`<HeaderExtras>` composition** → scaffolded empty in PR1, filled by future features (Decision).
4. **`/auth/signin` redirect target** → `/analizar` (REQ-LOCAL-001, Decision #5).
5. **Auth-gating `Suscripciones`** → always visible, empty-state CTA when anonymous (REQ-EMPTY-001).
6. **Empty-state iconography** → optional `icon` prop, ships with 1-2 inline SVG icons (Component Contracts).

Minor implementation detail still open (resolved in `design.md`):
- Exact Tailwind classes for the local-mode pill (background tint, text color, border). Locked to one of: amber-on-warm, neutral-on-warm, or accent-on-surface.
- Exact position of `<HeaderExtras>` on desktop (right of nav vs. far-right utility cluster).
- Whether the mobile dialog is `position: fixed` overlay or a `bottom-sheet` (project prefers fixed overlay per Art. VI platform primitives).

---

## Next

`sdd-design` → component contracts finalized, copy key schema complete, Tailwind utility classes locked, Playwright selector conventions, mobile dialog positioning decision.

Then `sdd-tasks` → forecast 400-line budget per PR, lock work-unit commits per PR (5-6 commits each), recommend 2 chained PRs.

Then `sdd-apply` → 2 chained PRs on `main`, each green, each mergeable.

Then `sdd-verify` → 6/6 gates green + 16/16 REQs PASS + 30/30 new tests.

Then `sdd-archive` → tag `019-navigation-onboarding-v1.0`.

---

## References

- **Proposal:** [./proposal.md](./proposal.md) (11 locked decisions, 5 locked defaults)
- **Existing landing nav:** `BuildCv-web/components/landing/landing-nav.tsx` (46 lines), tests at `components/landing/landing-nav.test.tsx`
- **Root layout (where to inject):** `BuildCv-web/app/layout.tsx` (43 lines, has skip-to-content already at lines 31-36)
- **Home page (where to strip the inline header):** `BuildCv-web/app/page.tsx` (lines 25-33 hold the duplicated header + nav)
- **Analyze page (where to strip the page-level header):** `BuildCv-web/app/analizar/page.tsx` (lines 14-22 hold the page-level header)
- **Local-mode redirect (the bug):** `BuildCv-web/app/auth/signin/page.tsx:41` (`redirect("/analizar/iterate")`)
- **Local-mode constant:** `BuildCv-web/lib/auth.ts` (`IS_LOCAL` boolean from `NEXT_PUBLIC_LOCAL_MODE`)
- **Copy centralization:** `BuildCv-web/lib/copy/es.ts` (482 lines, full Spanish copy)
- **Routes shipped to date:** `/`, `/analizar`, `/analizar/iterate`, `/analizar/diff`, `/analizar/editar`, `/importar`, `/auth/signin`, `/suscripciones` (see `BuildCv-web/specs/000-INDEX.md`)
- **Constitution (ley suprema):** `BuildCv-api/.specify/memory/constitution.md` v1.2.0 (Art. III, IV, VI, VII, VIII most relevant)
- **Prior spec format reference:** `BuildCv-api/specs/018-cv-iteration-loop/spec.md` (mirrored for sections, tone, depth)
- **Web project rules:** `BuildCv-web/AGENTS.md` (no external UI libs, copy centralization, 0 suppressions, WCAG via accessibility skill)
- **Accessibility skill:** `~/.config/opencode/skills/accessibility/SKILL.md` (WCAG 2.2 AA criteria, 24×24 target size, focus management, dialog patterns)
- **Frontend-design skill:** `BuildCv-web/.agents/skills/frontend-design/SKILL.md` (distinctive UI, no AI slop, intentional aesthetic)
- **SEO skill:** `BuildCv-web/.agents/skills/seo/SKILL.md` (crawlable semantic `<a href>` links, no JS-only navigation)