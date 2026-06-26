# Design: 019-navigation-onboarding — Persistent Site Header, Mobile Menu, Empty States

## Status

[Design] — Pending tasks (locked architecture; ready for `sdd-tasks`). WEB-only.
Proposal: `BuildCv-web/specs/019-navigation-onboarding/proposal.md` (5 locked decisions; this design follows them verbatim).

## Context

BuildCv-web renders `<LandingNav>` only on `/` (`app/page.tsx:32`). On every other route the nav is invisible, and the local-mode sign-in flow auto-redirects users into `/analizar/iterate` (the wizard's deepest leaf) with no discoverable entry point. 019 promotes the nav into the root layout, adds a mobile hamburger using the native `<dialog>` element, ships a reusable `<EmptyState>` for screens that need prior state, surfaces a local-mode pill, and fixes the local-mode redirect target. **No new dependencies.** No backend changes. No persistence changes (Art. III).

## Architecture overview

**Composition pattern (root layout + slot for auth-aware extras):**

```
app/layout.tsx (root)
  └─ <body>
      ├─ <a href="#contenido"> "Saltar al contenido"            (already at L31-36)
      ├─ <SiteHeader>                                            (NEW in PR1)
      │    ├─ <BrandMark />                                     (Link to "/", copy.appName)
      │    ├─ <LandingNav items={NAV_ITEMS} />                  (existing, extended)
      │    ├─ <LocalModePill />                                 (NEW, renders only when IS_LOCAL)
      │    ├─ <HeaderExtras>{children}</HeaderExtras>           (slot, null by default in PR1)
      │    └─ <MobileNav items={NAV_ITEMS} />                   (NEW in PR2, < sm only)
      ├─ <main id="contenido">{children}</main>
      └─ <WebVitalsReporter /> <DevErrorOverlay />
```

**State boundaries (Art. VI: nav stays dumb):**

- `<LandingNav>` and `<MobileNav>` are pure presentational. They receive `items: ReadonlyArray<NavItem>` and render. No `lib/auth` import. No `lib/storage/icv-store` import. No API calls.
- `<SiteHeader>` is the composition root for header-level UI. It reads `IS_LOCAL` (one boolean) and passes it to `<LocalModePill>`. It accepts an `extras?: React.ReactNode` slot for future `<CreditBadge>` / `<UserMenu>` (those land in 009-auth-web / 010-payments-web, not 019).
- `<LocalModePill>` reads `NEXT_PUBLIC_LOCAL_MODE` (already exposed in `lib/auth.ts:7` via `IS_LOCAL`) and renders a small non-intrusive badge. No state, no effects.
- `<EmptyState>` is a pure presentational component used by route-level pages. The pages decide when to render it (when their own state derivation says "no CV", "no auth", etc.). `<EmptyState>` itself does no fetching.

**Why composition over coupling:** the nav must remain testable in isolation (`landing-nav.test.tsx` already mocks `usePathname` and `next/link`). Mixing auth into the nav would force every test of the nav to mock the session, which is the boundary violation Art. VI prohibits. The `<HeaderExtras>` slot is the escape hatch: route-level layouts (e.g., a future `app/(authenticated)/layout.tsx`) pass `<UserMenu />` as a child; `<SiteHeader>` just composes them.

**Empty-state usage (where each route decides "show me the empty state"):**

| Route | Show empty state when | CTA target |
|---|---|---|
| `/analizar` | `cvText` and `jobText` are both empty AND no CV in `ICvStore` | `/importar` (Importar CV) |
| `/analizar/iterate` | `cvText` empty AND no CV in `ICvStore` | `/importar` |
| `/suscripciones` | not authenticated | `/auth/signin?callbackUrl=/suscripciones` |
| `/importar` | (no change — already has its idle state) | n/a |

**Local-mode redirect fix (`app/auth/signin/page.tsx:41`):** change `redirect("/analizar/iterate")` → `redirect("/analizar")` so the user lands on the analyzer root with a discoverable "Importar CV" empty-state CTA instead of the wizard's deepest leaf.

## Architecture decisions

### Decision: Promote `<LandingNav>` into root layout, don't rewrite

**Choice**: Move the existing 46-line `<LandingNav>` (with `NAV_ITEMS` extended from 2 → 5) into a new `<SiteHeader>` wrapper rendered in `app/layout.tsx` between the skip-link and `{children}`. Remove the inline `<header>` + `<LandingNav>` at `app/page.tsx:25-33`.
**Alternatives considered**: (a) Rewrite the nav with a new abstraction layer (header config provider, dynamic menu registry) — rejected: 46-line component is already typed, tested, accessible. Adding indirection violates Art. VI "no sobre-ingeniería". (b) Keep nav per-page and just copy-paste into each route's `<header>` — rejected: breaks DRY, breaks active-state consistency, doubles the regression surface.
**Rationale**: promotion is a 1-line move + extension. Existing tests pass unchanged except for the count assertion (2 → 5 nav items).

### Decision: Native `<dialog>` for the mobile menu

**Choice**: Use the platform's `<dialog>` element with `dialog.showModal()` / `dialog.close()`. No headless-ui, no radix-ui, no shadcn. The browser provides focus trap, `Escape` to close, and inert-background for free.
**Alternatives considered**: (a) Radix `Dialog` — rejected: adds ~12 KB gzipped + an abstraction we don't otherwise need. (b) Hand-rolled focus trap with `useEffect` + `keydown` listener — rejected: re-invents what the platform already does. Native dialog also restores focus to the previously-focused element automatically when closed (WCAG 2.4.3 satisfied by the platform).
**Rationale**: aligns with the project's "no external UI library" rule (AGENTS.md L77) and Art. VI "no sobre-ingeniería". Implementation pattern:

```tsx
// components/landing/mobile-nav.tsx (sketch)
"use client";
export function MobileNav({ items }: { items: ReadonlyArray<NavItem> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = useCallback(() => dialogRef.current?.showModal(), []);
  const close = useCallback(() => {
    dialogRef.current?.close();
    triggerRef.current?.focus(); // explicit focus return for screen readers
  }, []);

  // Visible only < sm
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={copy.nav.mobileMenuOpen}
        aria-expanded={open ? "true" : "false"} // see state note below
        aria-controls="mobile-nav-dialog"
        onClick={open}
        className="sm:hidden ...">
        <HamburgerIcon aria-hidden="true" />
      </button>
      <dialog
        id="mobile-nav-dialog"
        ref={dialogRef}
        aria-label={copy.nav.mobileMenuLabel}
        className="..."
        onClose={() => triggerRef.current?.focus()}>
        <nav aria-label="Navegación móvil">
          {items.map((item) => (
            <Link key={item.href} href={item.href} onClick={close}>{item.label}</Link>
          ))}
        </nav>
        <button type="button" onClick={close} aria-label={copy.nav.mobileMenuClose}>
          <CloseIcon aria-hidden="true" />
        </button>
      </dialog>
    </>
  );
}
```

`aria-expanded` sync: use a `useState(false)` that toggles in `open` / `close` / `onClose`. Render `aria-expanded={isOpen}` from state, not derived from the dialog's `.open` property (avoids a forced reflow each render). Focus return is explicit in `close()` and in the dialog's `onClose` handler for belt-and-suspenders (covers the Esc case). The native dialog's built-in `inert` on the rest of the page satisfies WCAG 2.4.3 Focus Order; the explicit focus return on close satisfies WCAG 2.4.3 Focus Return.

### Decision: `<HeaderExtras>` slot is scaffolded empty in PR1

**Choice**: `<SiteHeader>` accepts `extras?: React.ReactNode`. When undefined or null, renders nothing. The `app/layout.tsx` does NOT pass any extras in PR1 — the slot exists so future feature PRs (009-auth-web, 010-payments-web) can pass `<UserMenu />` and `<CreditBadge />` without modifying `<SiteHeader>` again.
**Alternatives considered**: (a) Add a placeholder `<span>slot</span>` for visual QA — rejected: ships dead DOM. (b) Skip the slot entirely and let each route render its own extras — rejected: defeats the composition purpose.
**Rationale**: zero-cost extension point. Tests assert that when `extras` is omitted, no extras wrapper element exists in the DOM (no orphan `<div>`).

### Decision: `<LocalModePill>` reads `IS_LOCAL` directly

**Choice**: The pill component imports `IS_LOCAL` from `@/lib/auth` and renders `null` when `IS_LOCAL === false`. This is the ONLY auth-related coupling in the new components (and it's read-only — no session state, no JWT, no user data).
**Alternatives considered**: (a) Pass `isLocal` as a prop from the layout — rejected: requires the layout to import `lib/auth`, which it currently doesn't. The layout's job is composition, not state derivation. The pill is the one component that owns "I am the local-mode indicator". (b) Use `process.env.NEXT_PUBLIC_LOCAL_MODE` directly — rejected: `lib/auth.ts` already exposes `IS_LOCAL` as the canonical accessor (single source of truth).
**Rationale**: `IS_LOCAL` is a build-time constant, not runtime state. Importing it is equivalent to reading an env var. The component remains trivially testable (mock `lib/auth` to flip the value).

### Decision: Generic `<EmptyState>` with optional icon

**Choice**: One component, props-driven, no business logic. `EmptyStateProps = { title; description; ctaLabel?; ctaHref?; icon? }`. Renders a `<section>` with semantic markup (`<h2>` for title, `<p>` for description, optional `<Link>` for CTA, optional `<span aria-hidden="true">` for icon). Ships with **2 inline SVG icons** (document-icon for `/importar`, user-icon for `/suscripciones`) co-located in `components/common/icons.tsx` — no new files outside the component's neighborhood.
**Alternatives considered**: (a) Per-route empty-state components (`<AnalyzeEmptyState>`, `<SubscriptionsEmptyState>`) — rejected: duplicates layout, copy centralization harder, harder to keep visual consistency. (b) Empty state via `<EmptyState />` with internal copy — rejected: violates copy centralization (AGENTS.md L78). Props-driven keeps all Spanish in `lib/copy/es.ts`.
**Rationale**: a single presentational component, used in 3 routes, keeps the surface small and the visual language consistent. Icons are inlined SVG (no external import, no extra request).

## File changes

| File | Action | Lines / scope | Why |
|---|---|---|---|
| `app/layout.tsx` | Modify | +6, -0 (insert `<SiteHeader>` after skip-link) | Hosts the persistent header on every route |
| `app/page.tsx` | Modify | -9 (remove `<header>` block at L25-33) | Avoid double-render of brand + nav on `/` |
| `app/analizar/page.tsx` | Modify | +20, -8 (add `<EmptyState>` branch above `<Analyzer>`) | Discoverable empty state when no CV/vacancy |
| `app/analizar/iterate/page.tsx` | Modify | +18, -10 (add `<EmptyState>` branch when inputs empty) | Currently form is always shown — needs the "Importá un CV" CTA |
| `app/suscripciones/page.tsx` | Modify | +22, -2 (gate behind auth; render `<EmptyState>` when anon) | Discoverable "Iniciá sesión" CTA |
| `app/auth/signin/page.tsx` | Modify | -1, +1 (L41 redirect target: `/analizar/iterate` → `/analizar`) | Fix local-mode discoverability bug |
| `app/importar/page.tsx` | Modify | -8 (remove inline `<header>` at L16-23) | Brand mark now in layout header |
| `app/analizar/page.tsx`, `app/analizar/editar/page.tsx`, `app/analizar/diff/page.tsx` | Modify | -8 each (remove per-page inline header) | Same reason; brand mark moves to layout |
| `components/landing/landing-nav.tsx` | Modify | +5, -2 (extend `NAV_ITEMS` from 2 → 5; add `requiresAuth` flag) | Surface 5 product routes, gate Suscripciones |
| `components/landing/landing-nav.test.tsx` | Modify | +20, -5 (update count assertion 2-3 → 5; add parametrized active-state test) | Cover 5 routes + nested-route active state |
| `components/landing/site-header.tsx` | **New** | ~80 LoC | Composes brand + nav + mobile nav + pill + extras slot |
| `components/landing/site-header.test.tsx` | **New** | ~50 LoC | Composition tests (renders nav, pill when IS_LOCAL, slot when children, no extras wrapper when null) |
| `components/landing/local-mode-pill.tsx` | **New** | ~25 LoC | Reads `IS_LOCAL`, renders small badge or `null` |
| `components/landing/local-mode-pill.test.tsx` | **New** | ~30 LoC | Renders pill when IS_LOCAL true, null when false, accessible name |
| `components/landing/mobile-nav.tsx` | **New** | ~80 LoC | Hamburger button + native `<dialog>` for `< sm` |
| `components/landing/mobile-nav.test.tsx` | **New** | ~80 LoC | Keyboard interactions (Esc closes, Tab stays inside, focus return on close), aria-expanded sync, click outside closes |
| `components/common/empty-state.tsx` | **New** | ~60 LoC | Generic empty-state presentational component |
| `components/common/empty-state.test.tsx` | **New** | ~70 LoC | Snapshot + interaction tests (CTA renders Link with href, icon renders when provided, semantic structure) |
| `components/common/icons.tsx` | **New** | ~30 LoC | Two inline SVG icons (`DocumentIcon`, `UserIcon`) |
| `lib/copy/es.ts` | Modify | +25, -0 (add `nav.global.*`, `nav.mobileMenu*`, `emptyStates.*`, `localModePill.*`) | Centralize new copy per AGENTS.md L78 |
| `e2e/navigation.spec.ts` | **New** | ~150 LoC | Playwright e2e for cross-route discovery flow |

**Deleted**: nothing. The inline `<header>` blocks in `app/page.tsx:25-33` and the per-page `<header>` blocks in `app/importar/page.tsx`, `app/analizar/page.tsx`, `app/analizar/diff/page.tsx`, `app/analizar/editar/page.tsx` are REMOVED (in-place), not deleted as separate files.

## Component contracts

### `<SiteHeader>` — `components/landing/site-header.tsx` (new, PR1)

```ts
interface SiteHeaderProps {
  /**
   * Optional right-side slot for auth-aware UI (UserMenu, CreditBadge).
   * When undefined or null, no wrapper element is rendered.
   * Composed by the layout, NOT by SiteHeader — the header is a presentational boundary.
   */
  extras?: React.ReactNode;
}

// Behavior:
// - Always renders <header role="banner"> with brand mark + <LandingNav>.
// - Renders <LocalModePill /> when IS_LOCAL === true (otherwise renders null).
// - Renders <MobileNav /> on viewports < 640px (sm: breakpoint).
// - extras renders inside a <div data-testid="header-extras"> wrapper when provided.
// - No client-side state; renders identically on server and client.
```

### `<LandingNav>` — `components/landing/landing-nav.tsx` (modify, PR1)

```ts
interface NavItem {
  readonly href: string;
  readonly label: string;
  /**
   * When true, the link is rendered with aria-hidden="true" and tabIndex={-1}
   * if the user is not authenticated (caller decides via filter).
   * Reserved for v1 (auth-web) — PR1 always passes all items visible.
   */
  readonly requiresAuth?: boolean;
}

// Behavior:
// - Renders <nav aria-label="Navegación principal"> with <Link> for each item.
// - Active item receives aria-current="page" via existing isActive() logic.
// - All links meet WCAG 2.5.8 (24x24 CSS px target via padding).
// - Focus-visible ring via global :focus-visible rule (already in globals.css).
// - "Iniciar sesión" / "Cuenta" is the last item, ALWAYS visible (links to /auth/signin
//   or /cuenta — spec phase decides which).
//
// NAV_ITEMS (extended):
//   { href: "/",              label: "Inicio" }
//   { href: "/analizar",      label: "Analizar" }
//   { href: "/importar",      label: "Importar CV" }
//   { href: "/suscripciones", label: "Suscripciones" }   // always visible in PR1
//   { href: "/auth/signin",   label: "Iniciar sesión" }  // hidden when session present (v1)
```

### `<MobileNav>` — `components/landing/mobile-nav.tsx` (new, PR2)

```ts
interface MobileNavProps {
  items: ReadonlyArray<NavItem>;
}

// Behavior:
// - Hidden via `sm:hidden` (Tailwind utility: display:none >= 640px).
// - Hamburger button: <button type="button" aria-label="Abrir menú" aria-expanded={isOpen} aria-controls="mobile-nav-dialog">.
// - <dialog ref={dialogRef}> opened via .showModal() (native modal, focus trap built-in).
// - onClose handler returns focus to triggerRef.current.
// - Click on a nav <Link> calls close() so navigation proceeds AND the dialog closes.
// - Esc key closes the dialog (native behavior) AND triggers focus return (onClose handler).
// - Respects prefers-reduced-motion: backdrop fade is conditional on media query.
// - Edge case: if user navigates with browser back/forward, dialog state must reset — handled
//   by `usePathname()` effect that calls close() on pathname change.
```

### `<LocalModePill>` — `components/landing/local-mode-pill.tsx` (new, PR1)

```ts
// No props. Reads IS_LOCAL from @/lib/auth internally.
// Returns null when IS_LOCAL === false.
// Renders <span role="status" aria-label="Modo local activo" data-testid="local-mode-pill">
// with copy.localModePill.label. Visually: small rounded badge, accent border, mono font.
// Lives in the header's right area, before extras or MobileNav.
```

### `<EmptyState>` — `components/common/empty-state.tsx` (new, PR2)

```ts
interface EmptyStateProps {
  /** Rendered as <h2>. Should be short and descriptive (WCAG 2.4.6 Headings and Labels). */
  readonly title: string;
  /** Rendered as <p>. One or two sentences explaining the next concrete step. */
  readonly description: string;
  /** When both ctaLabel and ctaHref are provided, renders a single <Link> as primary CTA. */
  readonly ctaLabel?: string;
  readonly ctaHref?: string;
  /** Optional decorative SVG. Marked aria-hidden="true" — the title is the accessible name. */
  readonly icon?: React.ReactNode;
}

// Behavior:
// - Wraps content in <section aria-labelledby="empty-state-title-{id}"> with a stable id.
// - Title element: <h2 id="empty-state-title-{id}">.
// - CTA: when ctaLabel + ctaHref present, renders <Link href={ctaHref}>{ctaLabel}</Link>.
// - Icon: when present, renders inside <span aria-hidden="true"> before the title.
// - Edge case: when neither ctaLabel nor ctaHref is provided, no CTA renders (pure info).
//   Title and description are always required (no fallback content).
```

## Data flow

```
                ┌─────────────────────────────────────┐
                │   Build-time env: NEXT_PUBLIC_LOCAL_MODE │
                └─────────────────────┬───────────────┘
                                      │ read at module load
                                      ▼
                       ┌──────────────────────────┐
                       │   lib/auth.ts → IS_LOCAL │
                       └────────────┬─────────────┘
                                    │ imported by
                ┌───────────────────┼────────────────────┐
                ▼                   ▼                    ▼
        LocalModePill           SiteHeader (PR1)    signin/page.tsx (PR2)
        (renders || null)       (composes pill)     (redirect target)
                                                          │
                                                          │  IS_LOCAL → /analizar
                                                          │  !IS_LOCAL → shows sign-in form
                                                          ▼
                                                   /analizar (analyzer root)
                                                          │
                                                          │  route decides
                                                          ▼
                                                   <EmptyState cta="/importar" />
                                                   or <Analyzer /> (existing)
```

**State ownership:**

| State | Owner | Why |
|---|---|---|
| Active nav item | `<LandingNav>` via `usePathname()` | Already implemented; route-derived |
| Mobile dialog open | `<MobileNav>` via `useState` | Local UI concern |
| `IS_LOCAL` | `lib/auth.ts` (module-level) | Build-time constant from env |
| Empty-state visibility | Each route page (`/analizar`, `/analizar/iterate`, `/suscripciones`) | Page knows its own inputs (CV text, vacancy, session) |
| Auth session (v1, out of scope) | `next-auth/react` `useSession()` | Will compose into `<HeaderExtras>` later |

**No cross-component state.** No Redux, no Zustand, no React Context for this slice. The composition is done at the layout level (`<SiteHeader extras={...} />`), which is the React-idiomatic place for it.

## Type system additions

**No new files in `lib/types/`** — per the project's co-location convention (existing `NavItem` lives in `components/landing/landing-nav.tsx:7-10`), types stay next to their primary consumer:

| Type | File | Visibility | Used by |
|---|---|---|---|
| `NavItem` (extended with `requiresAuth?`) | `components/landing/landing-nav.tsx` | module-local export | `<LandingNav>`, `<MobileNav>` |
| `SiteHeaderProps` | `components/landing/site-header.tsx` | module-local export | `app/layout.tsx` |
| `EmptyStateProps` | `components/common/empty-state.tsx` | module-local export | `/analizar`, `/analizar/iterate`, `/suscripciones` pages |
| `MobileNavProps` | `components/landing/mobile-nav.tsx` | module-local export | `<SiteHeader>` |

**Rationale**: only 4 types, each used by 1-2 components. Extracting to `lib/types/nav.ts` would add indirection without payoff (Art. VI). If 019.1 (auth-web) needs to re-use `NavItem`, promote it then.

**Constraints:**
- All props are `readonly`. Arrays are `ReadonlyArray<T>`. No mutable state types.
- No `any`. No `// @ts-ignore`. No `// eslint-disable`. No `as` casts except the well-justified `(e.target as HTMLDialogElement)` patterns in event handlers.
- Discriminated unions over enums where shape matters (none needed in this slice).

## Test strategy

| Layer | Scope | Approach | Approx count |
|---|---|---|---|
| Unit (Vitest + RTL + user-event) | `<LandingNav>` extended | Update existing `landing-nav.test.tsx` count assertion (2-3 → 5); add parametrized active-state table for 5 routes × nested paths; keyboard navigation test (Tab order, Enter activates) | +6 |
| Unit | `<LocalModePill>` | `renders nothing when IS_LOCAL is false`; `renders pill with accessible name when IS_LOCAL is true`; mock `@/lib/auth` per-test | 4 |
| Unit | `<SiteHeader>` | Renders brand + nav + pill (when local) + mobile nav; does NOT render extras wrapper when `extras` undefined; renders extras wrapper with children when provided; exactly one `<header>` in DOM | 5 |
| Unit | `<MobileNav>` | `aria-expanded` toggles on open/close; `Escape` closes (via user-event); focus returns to trigger on close (via `screen.getByRole('button', { name: /abrir menú/i })`); Tab order stays inside dialog (use `userEvent.tab()` and assert focus on each link then back to close button); hidden ≥ 640px (assert `display: none` via computed style) | 8 |
| Unit | `<EmptyState>` | Snapshot with all props; renders CTA `<Link>` with `href`; renders icon when provided; aria-labelledby points to title; `aria-hidden="true"` on icon | 6 |
| Integration (Vitest + RTL) | `<SiteHeader>` composition with all children | Asserts the rendered HTML matches expected DOM shape across viewports (mock matchMedia for `sm:`); assert no orphan wrappers | 2 |
| E2E (Playwright chromium) | Cross-route discovery flow | `land on / → see nav with 5 items → click "Importar CV" → land on /importar → press browser back → return to / with Inicio highlighted`; `on /analizar with empty localStorage → see EmptyState → click CTA → land on /importar`; `in local mode → see local-mode pill in header on every route` | 6 |
| E2E (Playwright) | Mobile menu (chromium mobile viewport 375x812) | `open hamburger → dialog visible → Tab through nav links → focus stays inside dialog → Esc → dialog closed → focus returns to hamburger button`; `click outside (backdrop) → dialog closed`; `prefers-reduced-motion: reduce → no slide animation` | 4 |
| E2E (Playwright) | Signin local-mode redirect | `set NEXT_PUBLIC_LOCAL_MODE=true → visit /auth/signin → redirected to /analizar (NOT /analizar/iterate) → see EmptyState with "Importar CV" CTA` | 2 |
| E2E (Playwright) | Header invariants across routes | For each of `/`, `/analizar`, `/analizar/iterate`, `/analizar/diff`, `/analizar/editar`, `/importar`, `/suscripciones`, `/auth/signin`, `/not-found`: assert exactly one `<header>` element and exactly one `<nav aria-label*="principal">` (or one `<nav aria-label*="móvil">` on mobile). Avoids the double-render regression. | 1 (parametrized) |
| E2E (Playwright) | a11y (axe) | `@axe-core/playwright` scan on `/`, `/analizar`, `/analizar/iterate`, `/importar`, `/auth/signin` — zero violations of WCAG 2.2 AA | 5 |

**Coverage target:** ≥ 90% statements/branches on each new component (per AGENTS.md + Art. VIII).

**Zero suppressions:** no `// @ts-ignore`, no `.skip()`, no `// eslint-disable-next-line`. If a test is flaky, fix the test or fix the component — never silence.

## Migration / rollout

**2 chained PRs, each green, each ≤ 400 line diff.** Work directly on `main` per project rules (no `main` protection on this repo). Each PR's `main` is the previous PR's `main`.

### PR1 — Layout promotion + nav expansion + local-mode pill (~250 lines, 5-6 commits)

1. `feat(019): copy — add nav.global, nav.mobileMenu, localModePill keys to es.ts` (new keys, no consumer yet)
2. `feat(019): landing-nav — extend NAV_ITEMS to 5 items (Inicio, Analizar, Importar CV, Suscripciones, Iniciar sesión)` (with backwards-compatible `requiresAuth?` flag)
3. `feat(019): landing-nav — update tests for 5 items + parametrized active-state table`
4. `feat(019): site-header — new SiteHeader + LocalModePill components + tests`
5. `feat(019): layout — wire SiteHeader into app/layout.tsx; strip inline header from app/page.tsx`
6. `chore(019): format + lint + build verification`

**Per-route stripping of inline `<header>`** happens alongside (commit 5 above) to keep the layout change atomic — splitting it across PRs would leave the home page with double nav for a window.

**Gates:** `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:e2e`. Lighthouse a11y ≥ 95 on `/`, `/analizar`.

### PR2 — Mobile menu + empty states + signin redirect fix + Playwright e2e (~300 lines, 6-7 commits)

1. `feat(019): mobile-nav — new MobileNav with native <dialog> + tests (Esc, Tab, focus return, aria-expanded)`
2. `feat(019): site-header — mount MobileNav in SiteHeader (< sm only)`
3. `feat(019): empty-state — new EmptyState + 2 inline icons + tests`
4. `feat(019): copy — add emptyStates.* keys (analyzer, iterate, subscriptions)`
5. `feat(019): routes — wire EmptyState into /analizar, /analizar/iterate, /suscripciones; strip inline headers from /importar, /analizar/editar, /analizar/diff`
6. `fix(019): auth — change local-mode redirect target from /analizar/iterate to /analizar`
7. `test(019): e2e — new navigation.spec.ts (6 cross-route + 4 mobile menu + 2 signin redirect + 1 header invariant + 5 axe)`
8. `chore(019): format + lint + build + Lighthouse verification`

**Gates:** all of PR1's gates + axe-core zero violations + Lighthouse a11y ≥ 95 across the 5 measured routes.

**No feature flags.** The change is a discoverability improvement — rolling it back partially doesn't help anyone. If PR1 ships and PR2 has a regression, the revert is a single commit reverting PR2.

**Backward compatibility:**
- The `requiresAuth?` field on `NavItem` is added but unused in PR1. `Suscripciones` and `Iniciar sesión` are visible to all users in PR1 (matching the proposal Decision #4: "Suscripciones always visible, empty state when anonymous"). When 009-auth-web ships, the layout filters `NAV_ITEMS` based on session — no `<LandingNav>` change needed.
- `lib/auth.ts` exports are unchanged. `IS_LOCAL` already public.
- All existing routes' `metadata` exports are unchanged.

## Compliance

| Article | How 019 complies |
|---|---|
| **I — Cero invención** | Nav labels describe what the user does. Empty-state copy is hand-written in `lib/copy/es.ts` and approved by the owner (per proposal R8). No AI-generated copy in components. |
| **II — Puntaje determinista** | Unchanged. 019 doesn't touch the scoring engine or any algorithm. The score number remains 100% C# deterministic. |
| **III — Privacidad primero** | **No new persistence.** Nav uses no `localStorage`, no `IndexedDB`, no cookies. `<LocalModePill>` reads only `NEXT_PUBLIC_LOCAL_MODE` (already public). Auth-aware nav items will reuse the existing `next-auth` session port — no new data collected. **No CV/job content** flows through any new component. |
| **IV — Encuadre honesto** | Nav labels are concrete ("Importar CV", "Analizar", "Suscripciones") — never "ATS", "Score oficial", "Garantizado". Empty-state copy is honest about state ("No hay CV cargado todavía") not aspirational ("¡Empezá tu viaje!"). The local-mode pill is explicit about the mode, not hidden. |
| **V — Entrada como dato** | Unchanged. 019 doesn't touch the AI pipeline. Nav is pure UI. |
| **VI — Clean Architecture (frontend)** | **Nav is a presentational component.** No business logic, no API calls, no auth derivation inside. Receives `items: ReadonlyArray<NavItem>` and renders. Auth-aware parts compose via `<HeaderExtras>` slot. **No new dependencies** (Tailwind v4 + native `<dialog>` + existing component library only). **No sobre-ingeniería**: promote, don't rewrite; native dialog, not a library. |
| **VII — v0 sin fricción** | Local-mode redirect now lands on `/analizar` (discoverable entry point), not `/analizar/iterate` (wizard leaf). Users can still paste CV + vacancy directly. Nav visible everywhere — never stranded. No new gate, no new friction — strictly less. |
| **VIII — TDD / tests-first** | All new components ship with co-located Vitest unit tests (target: tests written before implementation, per Art. VIII hard rule). Playwright e2e covers cross-route navigation. 0 suppressions. Accessibility tested via `@testing-library/jest-dom` (`toHaveAccessibleName`) + `@axe-core/playwright` in e2e + Lighthouse in CI. |
| **IX — Habeas Data** | Unchanged. No new data collected. No PII in the nav. The local-mode pill is informational, not consent-gated. |

## Risks

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| **1** | **Header composition causes double-render on `/`** if `app/page.tsx:25-33` is not stripped in the same PR as the layout change. | Med | PR1 commits 5 strips the page-level header atomically with the layout-level insertion. Unit test on `<SiteHeader>` asserts exactly one `<header>` in the rendered DOM. E2E `header invariants across routes` test asserts exactly one `<header>` element on `/` specifically (parametrized over 9 routes). |
| **2** | **Active-state logic breaks for nested routes.** Adding `/importar` means `/importar/something-future` would also be marked active (existing `startsWith` rule). Adding `/suscripciones` means `/suscripciones/foo` would also be active. | Low | Parametrized unit test table covers (pathname, expected active href) for 5 primary routes × nested paths. If a future route shares a prefix (e.g., `/importar-archive`), it would falsely inherit `/importar`'s active state — documented in code comment in `landing-nav.tsx`. |
| **3** | **Mobile menu focus return fails.** Native `<dialog>` handles focus trap, but explicit focus return on `close()` and `onClose` is required for WCAG 2.4.3. If the trigger ref is stale (component remounted), focus would land on `<body>`. | Med | E2E test: open menu → Tab to last nav item → Esc → assert `document.activeElement === hamburgerButton`. Test runs on a fresh page load (no prior remount). Belt-and-suspenders: focus return implemented in BOTH `close()` callback AND `onClose` event handler. |
| **4** | **`/auth/signin` redirect change breaks an existing test.** Some Playwright test (e.g., `e2e/auth-flow.spec.ts`) may assert the redirect to `/analizar/iterate`. The change moves it to `/analizar`. | Low-Med | Update `e2e/auth-flow.spec.ts` in the same PR (the spec/test change is part of the deliverable). Verify with `pnpm test:e2e` before merge. Add a regression test in PR2 explicitly asserting `/auth/signin` → `/analizar` in local mode. |
| **5** | **Empty states look generic / "AI slop".** Risk of producing `<EmptyState>` cards with low-effort copy ("¡Ups! Nada aquí todavía"). The frontend-design skill explicitly warns against generic AI aesthetics. | Med | All empty-state copy is hand-written in the proposal's `lib/copy/es.ts` block, reviewed by the owner. Each title/description is specific to the route's actual state. Cite the frontend-design skill's "commit to a bold aesthetic direction" in the spec. |
| **6** | **Scope creep into auth UX rework.** Tempting to also fix auth error states, sign-out flow, etc. in this slice. | Med | Explicit non-goal: 019 is **navigation + empty states + discoverability only**. Auth UX is its own future feature (009-auth-web). The proposal's "Out of Scope" list is binding. PR review rejects any commit touching `app/auth/` beyond the 1-line redirect target. |
| **7** | **CLS regression from new header.** The mobile menu and the new header may shift Cumulative Layout Shift if not properly sized. | Low-Med | Reserve fixed height for the header (`min-h-16` on the `<header>` wrapper, matching existing `py-8` visual height). The mobile menu dialog is an overlay (`position: fixed`), not inline push. Lighthouse CLS measured in PR2's verification. |
| **8** | **`<LocalModePill>` interferes with `<HeaderExtras>` composition.** The pill is rendered before the slot. If both are visible (v1: authenticated local-mode user), the pill might wrap awkwardly. | Low | Pill is small (max-width ~120px). Layout uses `flex items-center gap-3` with `flex-wrap` on `sm-`. Verified in PR1's visual QA at 375px and 1280px viewports. If a visual issue surfaces, PR1 ships a fix before PR2 merges. |

## Open technical questions

- [ ] **`<HeaderExtras>` composition at the layout level vs route group level.** When 009-auth-web ships, where does `<UserMenu />` enter? Options: (a) `app/layout.tsx` always passes `<UserMenu />` as extras — works but layout now imports `useSession`, violating the "layout is composition, not state derivation" principle. (b) A new `app/(authenticated)/layout.tsx` route group passes the user-aware extras; `app/layout.tsx` passes `null` — keeps layout pure but adds a route-group file. **Default: (b)** — defers the decision to 009, but the `<HeaderExtras>` slot is the seam.
- [ ] **`Cuenta` vs `Iniciar sesión` as the 5th nav item.** Proposal Decision #3 lists "Iniciar sesión / Cuenta" as one logical item but the actual label depends on auth state (auth-web v1). For PR1 (no auth), the label is "Iniciar sesión" and the href is `/auth/signin`. When 009-auth-web ships, the same item renders "Cuenta" with a dropdown menu. **Default for PR1**: "Iniciar sesión" → `/auth/signin`. No dropdown, no JSX change in `<LandingNav>` itself.
- [ ] **`prefers-reduced-motion` handling for mobile menu.** The dialog's open animation (fade + slight slide) honors the global reduced-motion rule already in `globals.css` — but should the backdrop click also respect it? **Default**: yes (no animation difference for reduced-motion users; the dialog just appears).
- [ ] **Should `<EmptyState>` support a secondary CTA?** Proposal mentions "one CTA per empty state" but some screens (e.g., `/suscripciones` when anonymous) might benefit from "Iniciar sesión" + "Volver al inicio" — though the latter is already in the layout's nav, so duplicating it is anti-pattern. **Default**: one CTA only; navigation back to home is via the persistent header nav (the whole point of 019).

## Next

`sdd-tasks` → forecast 400-line budget per PR, lock work-unit commits per PR (5-6 for PR1, 6-7 for PR2), generate `tasks.md` with TDD discipline (tests red before implementation per Art. VIII).
