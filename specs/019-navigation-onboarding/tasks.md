# Tasks: 019-navigation-onboarding

## Status

[Tasks] — Ready to apply (2 chained PRs, web-only).

## Overview

019 ships a persistent site header (composed from a new `<SiteHeader>` wrapper around the existing `<LandingNav>` extended from 2 → 5 items), a non-intrusive `<LocalModePill>` for local builds, a mobile hamburger using the native `<dialog>` element, a reusable `<EmptyState>` for routes with unmet preconditions, and a 1-line fix to the `/auth/signin` local-mode redirect target (now `/analizar`, not `/analizar/iterate`). All inline `<header>` blocks across 5 pages are stripped in PR1 atomically with the layout-level insertion to prevent the double-render regression on every route (REQ-LANDING-001). No new persistence, no new external UI libraries, no AI in the nav. **2 chained PRs, each green, each ≤ 300 lines of diff** — well under the 400-line review budget per PR. Direct merge to `main` per project rules (no `main` protection).

> **WEB-only change.** No `BuildCv-api/` counterpart. Backend repository is untouched.

---

## Review workload forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550 lines total (PR1 ~250 + PR2 ~300) |
| 400-line budget risk | **Low** (each PR is ≤ 300 lines, far under the 400-line review budget) |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (layout promotion + nav expansion + local-mode pill + ALL inline header stripping + header-invariant e2e) → PR2 (mobile menu + empty states + signin redirect fix + full e2e) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## PR boundaries (locked)

| PR | Scope | Estimated diff | Files (new) | Files (modified) | Test additions |
|----|-------|----------------|-------------|------------------|----------------|
| **PR1** | Layout promotion + nav expansion + local-mode pill + ALL inline header stripping + header-invariant e2e | ~250 lines | `components/landing/site-header.tsx`, `components/landing/site-header.test.tsx`, `components/landing/local-mode-pill.tsx`, `components/landing/local-mode-pill.test.tsx`, `e2e/navigation.spec.ts` (1 parametrized test over 9 routes) | `app/layout.tsx` (+6), `app/page.tsx` (-9), `app/analizar/page.tsx` (-8), `app/analizar/editar/page.tsx` (-8), `app/analizar/diff/page.tsx` (-8), `app/importar/page.tsx` (-8), `components/landing/landing-nav.tsx` (+5 / -2), `components/landing/landing-nav.test.tsx` (+25 / -8), `lib/copy/es.ts` (+25) | +17 unit tests (6 landing-nav updates + 7 site-header + 4 local-mode-pill) + 1 e2e parametrized scenario (visits 9 routes) |
| **PR2** | Mobile menu (`<MobileNav>` with native `<dialog>`) + `<EmptyState>` + signin redirect fix + full Playwright e2e | ~300 lines | `components/landing/mobile-nav.tsx`, `components/landing/mobile-nav.test.tsx`, `components/common/empty-state.tsx`, `components/common/empty-state.test.tsx`, `components/common/icons.tsx`, `components/common/icons.test.tsx` | `app/analizar/page.tsx` (+20 — add empty state branch), `app/analizar/iterate/page.tsx` (+18 — add empty state), `app/suscripciones/page.tsx` (+22 / -2 — empty state for anon), `app/auth/signin/page.tsx` (-1 / +1 — redirect target), `lib/copy/es.ts` (+18 — emptyStates.* keys), `components/landing/site-header.tsx` (+12 — mount MobileNav), `e2e/auth-flow.spec.ts` (+6 lines — regression assertion for new redirect target) | +18 unit tests (8 mobile-nav + 6 empty-state + 2 icons + 2 site-header mount update) + **18 Playwright e2e scenarios** in `e2e/navigation.spec.ts` (cross-route + mobile menu + signin redirect + axe-core; header-invariant already in PR1) |

> **Per-PR sub-budget**: PR1 = 250 / 400 (62% used); PR2 = 300 / 400 (75% used). Both green for review.

> **Co-location rule**: new component test files sit next to their component (`foo.ts` + `foo.test.ts` per `BuildCv-web/AGENTS.md` line 101). E2E specs live in `e2e/` per `playwright.config.ts` `testDir`.

---

## PR1: Layout promotion + nav expansion + local-mode pill + ALL inline header stripping + header-invariant e2e (~250 lines, +17 unit + 1 e2e test, 6 work-unit tasks → 7 commits)

### Dependency order (critical)

The 6 work-unit tasks below MUST be applied in this order (the 7th and final "commit" is the pre-flight gates baked into T1.6) — each later task depends on earlier ones landing in `main`:

```
T1.1 (copy) ──► T1.2 (LandingNav) ──► T1.3 (LocalModePill) ──► T1.4 (SiteHeader) ──► T1.5 (layout + strip 5 inline headers) ──► T1.6 (header-invariant e2e + final pre-flight gates)
```

If tasks are reordered, the build will fail mid-PR. Specifically:
- `T1.4 (SiteHeader)` imports the extended `NAV_ITEMS` from `landing-nav.tsx` (T1.2), so T1.2 must land first.
- `T1.5 (layout insertion)` references the `<SiteHeader>` symbol (T1.4), so T1.4 must land first.
- `T1.6 (header-invariant e2e)` visits all 9 routes, so T1.5's inline-header stripping must land first.

> **Note on user's commit order**: the user listed SiteHeader → LocalModePill → LandingNav extension → copy keys → layout insertion in the prompt. We reorder to dependency order (copy → LandingNav → LocalModePill → SiteHeader → layout) so each commit compiles in isolation. The reorder is benign — same 7 commits, same scope, same acceptance.

---

### T1.1 — Copy keys: `nav.global.*`, `mobileMenu.*`, `localModePill.*`

| Field | Value |
|-------|-------|
| **What** | Add 8 new keys to `lib/copy/es.ts` under `copy.nav.global` (5 items), `copy.nav.mobileMenu` (3 labels for PR2's `<MobileNav>`), and `copy.localModePill` (label + description) — no consumer yet, pure data. |
| **Files touched** | `BuildCv-web/lib/copy/es.ts` (MODIFY, +25 / -0) |
| **Test added** | 0 (pure data; covered indirectly by component tests in T1.2, T1.3, T1.4, and PR2's T2.2). TypeScript strict-mode compile serves as the contract check (missing key → build error). |
| **Manual verification** | None required (data-only commit). Run `pnpm build` to confirm types compile. |

**New keys** (added to existing `copy.nav` block):
```ts
nav: {
  analyze: "Analizar mi CV", // existing
  global: {
    home: "Inicio",
    analyze: "Analizar",
    import: "Importar CV",
    subscriptions: "Suscripciones",
    account: "Iniciar sesión", // PR1 label; v1 (auth-web) will swap to "Cuenta" + dropdown
  },
  mobileMenu: {
    openLabel: "Abrir menú",          // PR2 only
    closeLabel: "Cerrar menú",         // PR2 only
    dialogLabel: "Menú principal",     // PR2 only
  },
},
localModePill: {
  label: "Modo local",
  description: "Modo local activo, sin autenticación requerida.",
},
```

---

### T1.2 — Extend `<LandingNav>` NAV_ITEMS from 2 → 5 + add `requiresAuth?` flag

| Field | Value |
|-------|-------|
| **What** | Extend `NAV_ITEMS` in `<LandingNav>` from `{ Inicio, Analizar mi CV }` (2 items) to the 5-item product surface; add `requiresAuth?: boolean` flag to `NavItem` (unused in PR1, reserved for 009-auth-web filtering). Keep `isActive` logic unchanged. Update existing tests for 5 items + add parametrized active-state table. |
| **Files touched** | `BuildCv-web/components/landing/landing-nav.tsx` (MODIFY, +5 / -2), `BuildCv-web/components/landing/landing-nav.test.tsx` (MODIFY, +25 / -8) |
| **Test added** | 6 updated/added tests in `landing-nav.test.tsx` (total 9 → 15): `LandingNav_Renderiza_5_Links`, `LandingNav_ActiveState_Table` (5 routes × nested paths via `it.each`), `LandingNav_ActiveState_NestedPath_MarksParentActive`, `LandingNav_LinksSonAnclas_NoBotones`, `LandingNav_SuscripcionesYCuentaSiempreVisibles_PR1`, `LandingNav_RequiresAuthFlag_Reservado_Para_AuthWeb_v1`. |
| **Manual verification** | `pnpm test components/landing/landing-nav.test.tsx` — all 15 pass. |

**Updated `NAV_ITEMS`** (constants):
```ts
const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: "/",              label: copy.nav.global.home },
  { href: "/analizar",      label: copy.nav.global.analyze },
  { href: "/importar",      label: copy.nav.global.import },
  { href: "/suscripciones", label: copy.nav.global.subscriptions },
  { href: "/auth/signin",   label: copy.nav.global.account },
];
```

---

### T1.3 — New `<LocalModePill>` component

| Field | Value |
|-------|-------|
| **What** | New 25-line client component that reads `IS_LOCAL` from `@/lib/auth` at module load and renders a small `<span role="status">` badge when `IS_LOCAL === true`; renders `null` otherwise. The badge has stable `data-testid="local-mode-pill"` and `aria-label` derived from `copy.localModePill.description`. |
| **Files touched** | `BuildCv-web/components/landing/local-mode-pill.tsx` (NEW, ~25 LoC), `BuildCv-web/components/landing/local-mode-pill.test.tsx` (NEW, ~30 LoC) |
| **Test added** | 4 tests in `local-mode-pill.test.tsx`: `LocalModePill_Renderiza_Null_Cuando_IS_LOCAL_False` (mock `@/lib/auth` → `IS_LOCAL = false`), `LocalModePill_Renderiza_Badge_Cuando_IS_LOCAL_True`, `LocalModePill_TieneAccessibleName_DesdeDescription` (uses `toHaveAccessibleName`), `LocalModePill_TieneTestId_Estable`. |
| **Manual verification** | `pnpm test components/landing/local-mode-pill.test.tsx` — all 4 pass. |

**Implementation sketch**:
```tsx
"use client";
import { IS_LOCAL } from "@/lib/auth";
import { copy } from "@/lib/copy/es";

export function LocalModePill() {
  if (!IS_LOCAL) return null;
  return (
    <span
      role="status"
      data-testid="local-mode-pill"
      aria-label={copy.localModePill.description}
      className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-xs text-accent"
    >
      {copy.localModePill.label}
    </span>
  );
}
```

---

### T1.4 — New `<SiteHeader>` composition root

| Field | Value |
|-------|-------|
| **What** | New ~80-line server component that composes the persistent site header: brand mark (Link to `/` with `copy.appName`) + extended `<LandingNav>` + `<LocalModePill>` + an optional `extras?: React.ReactNode` slot (rendered inside `<div data-testid="header-extras">` only when children provided, never a placeholder `<span>`). Header wrapper uses `min-h-16` to reserve CLS space (NFR-PERF-001). Re-exports `NAV_ITEMS` for PR2's `<MobileNav>`. |
| **Files touched** | `BuildCv-web/components/landing/site-header.tsx` (NEW, ~80 LoC), `BuildCv-web/components/landing/site-header.test.tsx` (NEW, ~50 LoC) |
| **Test added** | 7 tests in `site-header.test.tsx`: `SiteHeader_Renderiza_Header_ConRoleBanner` (`getByRole('banner')`), `SiteHeader_Renderiza_Brand_Link_A_HrefSlash`, `SiteHeader_Renderiza_LandingNav`, `SiteHeader_Renderiza_LocalModePill_CuandoIS_LOCALTrue`, `SiteHeader_NoRenderiza_ExtrasWrapper_CuandoExtrasAusente`, `SiteHeader_Renderiza_ExtrasWrapper_CuandoExtrasPresente`, `SiteHeader_DOM_TieneExactamenteUnHeader` (asserts `document.querySelectorAll('header').length === 1` to prevent the regression when later wrapped in pages). |
| **Manual verification** | `pnpm test components/landing/site-header.test.tsx` — all 7 pass. |

**Component contract**:
```ts
interface SiteHeaderProps {
  /** Optional right-side slot for auth-aware UI (UserMenu, CreditBadge).
   *  When undefined or null, no wrapper element is rendered.
   *  Composed by the layout, NOT by SiteHeader. */
  readonly extras?: React.ReactNode;
}
```

---

### T1.5 — Atomic layout insertion + strip ALL duplicated inline `<header>` blocks across 5 pages

| Field | Value |
|-------|-------|
| **What** | (a) Insert `<SiteHeader />` in `app/layout.tsx` between the skip-to-content anchor (L31-36) and `{children}` (L37). (b) Strip the duplicated inline `<header>` blocks from 5 pages so the layout-level header is the only one rendered. **Single commit** — splitting would leave a window where `/` renders two `<header>` elements (the REQ-LANDING-001 regression). |
| **Files touched** | `BuildCv-web/app/layout.tsx` (MODIFY, +6 / -0), `BuildCv-web/app/page.tsx` (MODIFY, -9 lines — strip L25-33 + drop `LandingNav` import), `BuildCv-web/app/analizar/page.tsx` (MODIFY, -8 lines — strip L14-22 inline header, keep `<CreditArea>` in page body, drop unused `Link` import), `BuildCv-web/app/analizar/editar/page.tsx` (MODIFY, -8 lines — strip L15-22 inline header), `BuildCv-web/app/analizar/diff/page.tsx` (MODIFY, -8 lines — strip L23-26 inline header), `BuildCv-web/app/importar/page.tsx` (MODIFY, -8 lines — strip L16-23 inline header) |
| **Test added** | 0 explicit (covered by T1.6's e2e + T1.4's unit) |
| **Manual verification** (gate before commit): `pnpm dev` → visit each of these URLs and assert in DevTools Elements panel that `document.querySelectorAll('header').length === 1` (NOT 2): • `/` → exactly 1 `<header>` (layout-level only), brand mark visible once • `/analizar` → exactly 1 `<header>`, brand mark visible once, `<CreditArea>` still in page body • `/analizar/editar` → exactly 1 `<header>` • `/analizar/diff` → exactly 1 `<header>` • `/importar` → exactly 1 `<header>` • `/auth/signin` (with `NEXT_PUBLIC_LOCAL_MODE=true`) → exactly 1 `<header>` + local-mode pill visible inside it. |

**Layout diff** (insert at `app/layout.tsx` L37, before `{children}`):
```tsx
<a href="#contenido" className="sr-only rounded ...">Saltar al contenido</a>
+ <SiteHeader />
  {children}
```

---

### T1.6 — Header-invariant Playwright e2e (1 parametrized scenario over 9 routes) + final pre-flight gates

| Field | Value |
|-------|-------|
| **What** | (a) Create `e2e/navigation.spec.ts` with the first parametrized test asserting the REQ-LANDING-001 invariant: every primary route renders exactly one `<header>` element and exactly one `<nav aria-label*="principal">` element (parametrized over 9 routes). This is the canary that catches the double-render regression on every route. (b) Run the final PR1 pre-flight gates (`pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:e2e`); if any auto-format or auto-fix delta exists, commit it as part of this commit's working tree (no separate chore commit). |
| **Files touched** | `BuildCv-web/e2e/navigation.spec.ts` (NEW, ~30 LoC); optionally `BuildCv-web/pnpm-lock.yaml` or `eslint.config.mjs` if regeneration triggers a delta (typically none). |
| **Test added** | 1 parametrized e2e scenario (`Header_ExactlyOneHeader_ExactlyOneNavPrincipal_OnEachRoute`) — visits `/`, `/analizar`, `/analizar/iterate`, `/analizar/diff`, `/analizar/editar`, `/importar`, `/suscripciones`, `/auth/signin`, `/ruta-inexistente` and asserts `querySelectorAll('header').length === 1` AND `querySelectorAll('nav[aria-label*="principal"]').length === 1` on each. |
| **Manual verification** | `pnpm test:e2e e2e/navigation.spec.ts` — the 1 parametrized scenario passes for all 9 routes. Run full `pnpm test:e2e` to confirm no regression on existing specs. PR1 pre-flight gates (in `BuildCv-web/`): `pnpm lint` (0 errors), `pnpm build` (0 errors), `pnpm test` (all green), `pnpm test:e2e` (all green). |

**Test sketch**:
```ts
import { test, expect } from "@playwright/test";
const ROUTES = ["/", "/analizar", "/analizar/iterate", "/analizar/diff",
                "/analizar/editar", "/importar", "/suscripciones",
                "/auth/signin", "/ruta-inexistente"] as const;
for (const route of ROUTES) {
  test(`Header_ExactlyOneHeader_ExactlyOneNavPrincipal_OnRoute_${route.replaceAll("/", "_") || "_root"}`, async ({ page }) => {
    await page.goto(route);
    expect(await page.locator("header").count()).toBe(1);
    expect(await page.locator('nav[aria-label*="principal"]').count()).toBe(1);
  });
}
```

---

### PR1 acceptance

- [ ] All 17 new unit tests pass (4 local-mode-pill + 7 site-header + 6 landing-nav updates; existing 9 landing-nav tests → now 15 in that file).
- [ ] `pnpm lint` — 0 errors, 0 warnings.
- [ ] `pnpm build` — 0 errors.
- [ ] `pnpm test` — all green; coverage on new components ≥ 90%.
- [ ] `pnpm test:e2e` — all existing e2e pass (no regressions on `smoke.spec.ts`, `landing.spec.ts`, `importar.spec.ts`, `auth-flow.spec.ts`, `analizar-*.spec.ts`, `subscriptions.spec.ts`, `credits.spec.ts`, `diff.spec.ts`, `iterations.spec.ts`, `observability.spec.ts`) + the new 1 parametrized e2e passes.
- [ ] Home page (`/`) renders exactly ONE `<header>` and exactly ONE `<nav aria-label="Navegación principal">` (manual + unit + e2e all assert this).
- [ ] All 5 inline `<header>` blocks are removed (`app/page.tsx` -9, `app/analizar/page.tsx` -8, `app/analizar/editar/page.tsx` -8, `app/analizar/diff/page.tsx` -8, `app/importar/page.tsx` -8 = total -41 lines from those 5 files).
- [ ] `<LocalModePill>` is NOT rendered in production (`IS_LOCAL === false`); IS rendered in local mode (asserted in unit + manual).
- [ ] 0 suppressions (no `// @ts-ignore`, no `// eslint-disable`, no `it.skip`).
- [ ] Work-unit commits (Spanish conventional, no AI attribution; 7 commits total — pre-flight gates run at end of T1.6, no separate chore commit):
  - `feat(019): copy — agregar nav.global, mobileMenu y localModePill a es.ts`
  - `feat(019): landing-nav — extender NAV_ITEMS a 5 y añadir flag requiresAuth`
  - `test(019): landing-nav — extender cobertura a 5 items + tabla parametrizada de active-state`
  - `feat(019): local-mode-pill — implementar badge condicional + tests`
  - `feat(019): site-header — implementar composition root con brand, nav, pill y slot extras + tests`
  - `feat(019): layout — insertar SiteHeader y eliminar headers duplicados de 5 páginas (atómico para evitar doble render)`
  - `test(019): e2e — navigation.spec.ts con 1 test parametrizado de invariante de header en 9 rutas + pre-flight gates (lint, build, test, e2e) verdes`
- [ ] PR merges to `main`.

---

## PR2: Mobile menu + empty states + signin redirect fix + full e2e (~300 lines, +18 unit + 18 e2e tests, 7 work-unit tasks → 8 commits)

### Dependency order (critical)

```
T2.1 (copy emptyStates) ──► T2.2 (MobileNav) ──► T2.3 (Icons) ──► T2.4 (EmptyState) ──► T2.5 (SiteHeader mounts MobileNav) ──► T2.6 (wire EmptyState into 3 routes) ──► T2.7 (signin redirect) ──► T2.8 (e2e navigation.spec.ts expansion)
```

`T2.5` depends on `T2.2` (the `<MobileNav>` component must exist). `T2.6` depends on `T2.4` (the `<EmptyState>` must exist). `T2.7` is logically independent but is bundled AFTER `T2.6` because the new redirect target `/analizar` needs the `<EmptyState>` branch to be in place for the redirect to be discoverable.

---

### T2.1 — Copy keys: `emptyStates.{analyze, iterate, subscriptions}.{title, description, primaryCta}`

| Field | Value |
|-------|-------|
| **What** | Add 9 new keys to `lib/copy/es.ts` under a new `copy.emptyStates.*` namespace — 3 routes × (title + description + primary CTA label). Hand-written in spec §Copy keys; not LLM-generated. |
| **Files touched** | `BuildCv-web/lib/copy/es.ts` (MODIFY, +18 / -0) |
| **Test added** | 0 (pure data; covered by e2e in T2.8 which asserts the exact text from these keys renders). |
| **Manual verification** | None (data-only commit). `pnpm build` confirms TypeScript types compile. |

**New keys**:
```ts
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
```

---

### T2.2 — New `<MobileNav>` with native `<dialog>` (8 unit tests)

| Field | Value |
|-------|-------|
| **What** | New ~80-line client component that renders a hamburger `<button>` (only below `sm` via Tailwind `sm:hidden`) + a native `<dialog>` containing the same 5 nav items as `<LandingNav>`. Uses `useState` for `isOpen` (NOT derived from `.open` — avoids forced reflow). Focus return is implemented in BOTH `close()` AND `onClose` event handler (belt-and-suspenders for WCAG 2.4.3). Respects `prefers-reduced-motion: reduce` for backdrop fade. `usePathname` effect closes the dialog on route change. Click-on-backdrop handled natively by `<dialog>`. |
| **Files touched** | `BuildCv-web/components/landing/mobile-nav.tsx` (NEW, ~80 LoC), `BuildCv-web/components/landing/mobile-nav.test.tsx` (NEW, ~80 LoC) |
| **Test added** | 8 unit tests in `mobile-nav.test.tsx`: `MobileNav_Renderiza_BotonHamburguesa_ConAriaLabel`, `MobileNav_BotonHamburguesa_TieneAriaExpanded_FalseInicialmente`, `MobileNav_ClickHamburguesa_LlamaShowModal_Y_ActualizaAriaExpanded_True`, `MobileNav_Escape_CierraDialogo_Y_RestauraFocoEnHamburguesa`, `MobileNav_BotonCerrar_CierraDialogo_Y_RestauraFocoEnHamburguesa`, `MobileNav_Tab_CiclaDentroDelDialogo` (asserts focus stays inside), `MobileNav_ClickEnLinkDeNav_CierraDialogo`, `MobileNav_CambioDeRuta_CierraDialogo` (usePathname effect). |
| **Manual verification** | `pnpm test components/landing/mobile-nav.test.tsx` — all 8 pass. |

---

### T2.3 — New `<EmptyState>` generic presentational component (6 unit tests)

| Field | Value |
|-------|-------|
| **What** | New ~60-line props-driven component: `{ icon?: React.ReactNode; title: string; description: string; primaryCta: { label: string; href: string } }`. Renders `<section aria-labelledby="empty-state-title-{useId()}">` with `<h2>` title + `<p>` description + `<Link>` CTA + optional `<span aria-hidden>` icon. Zero business logic, zero storage reads (REQ-PRIV-001). |
| **Files touched** | `BuildCv-web/components/common/empty-state.tsx` (NEW, ~60 LoC), `BuildCv-web/components/common/empty-state.test.tsx` (NEW, ~70 LoC) |
| **Test added** | 6 unit tests in `empty-state.test.tsx`: `EmptyState_Renderiza_Title_Como_H2`, `EmptyState_Renderiza_Description_Como_P`, `EmptyState_Renderiza_PrimaryCta_ComoLink_ConHrefCorrecto`, `EmptyState_Renderiza_Icon_CuandoPropPresente_ConAriaHidden`, `EmptyState_Omitte_Icon_CuandoPropAusente`, `EmptyState_Section_TieneAriaLabelledby_QueApuntaAlTitleId`. |
| **Manual verification** | `pnpm test components/common/empty-state.test.tsx` — all 6 pass. |

---

### T2.4 — Inline SVG icons (`<DocumentIcon>`, `<UserIcon>`) (2 unit tests)

| Field | Value |
|-------|-------|
| **What** | New ~30-line file exporting 2 inline SVG components used by the empty states. `<DocumentIcon>` for `/importar` context, `<UserIcon>` for `/suscripciones`. Each renders `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">…</svg>` — `currentColor` lets Tailwind classes (`text-accent`) drive the icon color. |
| **Files touched** | `BuildCv-web/components/common/icons.tsx` (NEW, ~30 LoC), `BuildCv-web/components/common/icons.test.tsx` (NEW, ~20 LoC) |
| **Test added** | 2 unit tests in `icons.test.tsx`: `DocumentIcon_Renderiza_SVGAriaHidden_ConStrokeCurrentColor`, `UserIcon_Renderiza_SVGAriaHidden_ConStrokeCurrentColor`. |
| **Manual verification** | `pnpm test components/common/icons.test.tsx` — both pass. |

---

### T2.5 — Mount `<MobileNav>` in `<SiteHeader>`

| Field | Value |
|-------|-------|
| **What** | Modify `<SiteHeader>` to render `<MobileNav items={NAV_ITEMS} />` immediately after `<LandingNav items={NAV_ITEMS} />` in the composition tree. Both are in the DOM; Tailwind's `sm:hidden` on the hamburger button + `hidden sm:flex` on `<LandingNav>` handle the responsive switch. Update existing `site-header.test.tsx` to assert `<MobileNav>` is mounted. |
| **Files touched** | `BuildCv-web/components/landing/site-header.tsx` (MODIFY, +12 / -0), `BuildCv-web/components/landing/site-header.test.tsx` (MODIFY, +2 tests) |
| **Test added** | 2 added tests in `site-header.test.tsx` (now 9 total): `SiteHeader_Renderiza_MobileNav_ConMismosItems_QueLandingNav`, `SiteHeader_MobileNav_Y_LandingNav_Comparten_MismoArrayNAV_ITEMS`. |
| **Manual verification** | Resize browser to 375px → hamburger visible, inline nav hidden. Resize to 1280px → inline nav visible, hamburger hidden. `pnpm test components/landing/site-header.test.tsx` — all 9 pass. |

---

### T2.6 — Wire `<EmptyState>` into the 3 affected routes (atomic batch — same pattern)

| Field | Value |
|-------|-------|
| **What** | (a) `/analizar` (MODIFY, +20 / -8 — inline header strip in T1.5 already removed, this adds the empty-state branch above `<Analyzer>`): when `cvText === "" && jobText === "" && !hasStoredCv`, render `<EmptyState icon={<DocumentIcon />} ... primaryCta={{ href: "/importar" }} />` INSTEAD of `<Analyzer />`. (b) `/analizar/iterate` (MODIFY, +18 / -10): when both inputs empty AND no stored CV, render `<EmptyState ... primaryCta={{ href: "/importar" }} />` INSTEAD of the form. (c) `/suscripciones` (MODIFY, +22 / -2): when not authenticated (`useSession()?.status === "unauthenticated"` OR `IS_LOCAL === false && !session`), render `<EmptyState icon={<UserIcon />} primaryCta={{ href: "/auth/signin?callbackUrl=/suscripciones" }} />` INSTEAD of `<SubscriptionDashboard />`. Single commit because all 3 follow the same "empty-state branch + conditional render" pattern. |
| **Files touched** | `BuildCv-web/app/analizar/page.tsx` (MODIFY, +20 / -8), `BuildCv-web/app/analizar/iterate/page.tsx` (MODIFY, +18 / -10), `BuildCv-web/app/suscripciones/page.tsx` (MODIFY, +22 / -2) |
| **Test added** | 0 explicit (covered by e2e in T2.8 + T1.6's existing parametrized header-invariant). |
| **Manual verification** | • `pnpm dev` → `/analizar` with no inputs → empty state with "Ver cómo importar un CV" CTA visible • `/analizar/iterate` with no inputs → empty state with "Importar CV" CTA visible • `/suscripciones` while anonymous → empty state with "Iniciar sesión" CTA visible (NOT the pricing table). |

---

### T2.7 — Fix `/auth/signin` local-mode redirect target (1-line change)

| Field | Value |
|-------|-------|
| **What** | `app/auth/signin/page.tsx` line 41: change `redirect("/analizar/iterate")` → `redirect("/analizar")`. The page-level guard stays (still auto-redirects in local mode to skip the sign-in form), but the target is now a discoverable entry point with an `<EmptyState>` (per T2.6) instead of the wizard's deepest leaf. |
| **Files touched** | `BuildCv-web/app/auth/signin/page.tsx` (MODIFY, -1 / +1) |
| **Test added** | 0 explicit (covered by e2e in T2.8 — 2 new scenarios assert the new redirect target + the EmptyState after redirect). |
| **Manual verification** | `NEXT_PUBLIC_LOCAL_MODE=true pnpm dev` → `http://localhost:3000/auth/signin` → URL bar shows `/analizar` (NOT `/analizar/iterate`); empty state with "Importar CV" CTA visible. |

---

### T2.8 — Update `e2e/auth-flow.spec.ts` + expand `e2e/navigation.spec.ts` to 18 Playwright e2e scenarios + final pre-flight gates

| Field | Value |
|-------|-------|
| **What** | (a) Update existing `e2e/auth-flow.spec.ts` (+6 lines): add 1 new regression test asserting that when `NEXT_PUBLIC_LOCAL_MODE=true`, visiting `/auth/signin` redirects to `/analizar` (not `/analizar/iterate`). (b) Expand `e2e/navigation.spec.ts` (+220 LoC, 17 new scenarios grouped in 4 describes): 6 cross-route discovery, 4 mobile menu, 2 signin redirect, 5 axe-core a11y (header-invariant already in PR1). (c) Run the final PR2 pre-flight gates; auto-format/auto-fix deltas commit as part of this commit (no separate chore commit). |
| **Files touched** | `BuildCv-web/e2e/auth-flow.spec.ts` (MODIFY, +6 / -0), `BuildCv-web/e2e/navigation.spec.ts` (MODIFY, +220 LoC; was 30 LoC, now 250 LoC with 18 scenarios total), `BuildCv-web/package.json` + `pnpm-lock.yaml` (if `@axe-core/playwright` is not already a devDependency — install in this commit) |
| **Test added** | 18 Playwright e2e scenarios in `e2e/navigation.spec.ts` (plus 1 in `e2e/auth-flow.spec.ts`): **6 cross-route**: `Nav_LandOnHome_Shows5Items_InicioActivo`, `Nav_ClickImportarCV_LandOnImportar_BrowserBack_ReturnsToHome_InicioActivo`, `Nav_ClickAnalizar_LandOnAnalizar_AnalizarActivo`, `Nav_ActiveState_NestedRoute_MarksParent` (`/analizar/iterate` → `Analizar` active), `Nav_TabTraversal_All5LinksReachable_KeyboardOnly`, `Nav_LinksSonAnclas_RealAHref_NotButtons` (REQ-SEO-001). **4 mobile menu** (375×812 viewport): `Mobile_OpenHamburger_OpensDialog_5ItemsVertical`, `Mobile_EscapeClosesDialog_FocusReturnsToHamburguesa`, `Mobile_TabCyclesInsideDialog_FocusNeverEscapes`, `Mobile_PrefersReducedMotion_NoAnimation_OnOpenAndClose`. **2 signin local-mode redirect** (run with `NEXT_PUBLIC_LOCAL_MODE=true`): `Signin_LocalMode_RedirectsTo_Analizar_NotIterate`, `Signin_LocalMode_AfterRedirect_ShowsEmptyState_WithImportarCta`. **5 axe-core a11y** (via `@axe-core/playwright`, installed as devDependency in this commit if not already present): `A11y_Axe_ZeroViolations_OnHome`, `A11y_Axe_ZeroViolations_OnAnalizar`, `A11y_Axe_ZeroViolations_OnAnalizarIterate`, `A11y_Axe_ZeroViolations_OnImportar`, `A11y_Axe_ZeroViolations_OnAuthSignin`. |
| **Manual verification** | `pnpm test:e2e e2e/navigation.spec.ts` — all 18 pass. `pnpm test:e2e e2e/auth-flow.spec.ts` — existing 3 + new 1 pass. Full `pnpm test:e2e` — no regressions on any other spec. PR2 pre-flight gates (in `BuildCv-web/`): `pnpm lint` (0 errors), `pnpm build` (0 errors), `pnpm test` (all green), `pnpm test:e2e` (all green). Lighthouse a11y ≥ 95 verified manually on `/`, `/analizar`, `/analizar/iterate`, `/importar`, `/auth/signin`. |

**Dependency**: `@axe-core/playwright` (install in this commit if not already present; verify by `grep "@axe-core/playwright" package.json`).

---

### PR2 acceptance

- [ ] All 18 new unit tests pass (PR2 only) + all 17 PR1 unit tests still pass + all 7 PR1 site-header tests still pass (now 9 after PR2's +2 mount-update tests).
- [ ] All 18 Playwright e2e scenarios in `e2e/navigation.spec.ts` pass (1 from PR1 + 17 new in PR2 = 18 total).
- [ ] All existing e2e pass (`smoke.spec.ts`, `landing.spec.ts`, `importar.spec.ts`, `auth-flow.spec.ts`, `analizar-*.spec.ts`, `subscriptions.spec.ts`, `credits.spec.ts`, `diff.spec.ts`, `iterations.spec.ts`, `observability.spec.ts`) — no regressions.
- [ ] `pnpm lint` — 0 errors, 0 warnings.
- [ ] `pnpm build` — 0 errors.
- [ ] Lighthouse Accessibility ≥ 95 on `/`, `/analizar`, `/analizar/iterate`, `/importar`, `/auth/signin` (manual via `npx lighthouse <url> --only-categories=accessibility --quiet --chrome-flags="--headless"` OR the automated axe-core e2e — both gates pass).
- [ ] Mobile (≤ 640px) hamburger opens native `<dialog>` with focus trap and Esc-to-close restoring focus to the trigger (REQ-NAV-003, REQ-NAV-004).
- [ ] Local-mode `/auth/signin` redirects to `/analizar`, not `/analizar/iterate` (REQ-LOCAL-001).
- [ ] Local-mode pill visible in local builds (when `NEXT_PUBLIC_LOCAL_MODE=true`), hidden in production builds (REQ-LOCAL-002).
- [ ] `<EmptyState>` renders on `/analizar` (empty CV+vacancy), `/analizar/iterate` (no inputs), `/suscripciones` (anonymous), each with one primary CTA (REQ-EMPTY-001).
- [ ] 0 suppressions (no `// @ts-ignore`, no `// eslint-disable`, no `it.skip`, no `vi.skip`).
- [ ] Zero new runtime dependencies in `package.json` (REQ-NAV-PILL — native `<dialog>` + Tailwind v4 only); `@axe-core/playwright` is the only addition (devDependency, installed in T2.8).
- [ ] Work-unit commits (Spanish conventional, no AI attribution; 8 commits total — pre-flight gates run at end of T2.8, no separate chore commit):
  - `feat(019): copy — agregar emptyStates.analyze, iterate, subscriptions a es.ts`
  - `feat(019): mobile-nav — implementar MobileNav con dialog nativo + tests (Esc, Tab, focus return, aria-expanded, click-backdrop, route-change)`
  - `feat(019): empty-state — implementar componente generico + tests (title, description, CTA, icon, aria-labelledby)`
  - `feat(019): icons — agregar DocumentIcon y UserIcon (SVGs inline aria-hidden)`
  - `feat(019): site-header — montar MobileNav al lado de LandingNav (responsive via Tailwind sm:hidden)`
  - `feat(019): routes — wirear EmptyState en /analizar, /analizar/iterate, /suscripciones`
  - `fix(019): auth — cambiar redirect target de /analizar/iterate a /analizar en local mode`
  - `test(019): e2e — navigation.spec.ts con 17 escenarios adicionales (6 cross-route + 4 mobile + 2 signin-redirect + 5 axe-core) + auth-flow.spec.ts con regression test + pre-flight gates (lint, build, test, e2e, Lighthouse ≥ 95) verdes`
- [ ] PR merges to `main`.

---

## Dependency graph between PRs

```
PR1 (Layout promotion + nav expansion + local-mode pill + ALL inline header stripping + header-invariant e2e)
  ├── T1.1: Copy keys (no deps)
  ├── T1.2: LandingNav extension (depends on T1.1's copy.nav.global keys)
  ├── T1.3: LocalModePill (depends on T1.1's copy.localModePill keys + IS_LOCAL constant)
  ├── T1.4: SiteHeader (depends on T1.2's extended NAV_ITEMS + T1.3's pill)
  ├── T1.5: Layout insertion + strip ALL 5 inline headers atomically (depends on T1.4's SiteHeader)
  └── T1.6: Header-invariant e2e + final pre-flight gates (depends on T1.5's header stripping)
PR1 → PR2 (BLOCKED until PR1 merges to main)

PR2 (Mobile menu + empty states + signin fix + full e2e)
  ├── T2.1: Copy keys for emptyStates (no deps)
  ├── T2.2: MobileNav (depends on T1.2's NavItem shape with requiresAuth flag)
  ├── T2.3: EmptyState (no deps)
  ├── T2.4: Inline icons (no deps)
  ├── T2.5: Mount MobileNav in SiteHeader (depends on T2.2 + T1.4's SiteHeader)
  ├── T2.6: Wire EmptyState into 3 routes (depends on T2.3 + T2.4 + T2.1)
  ├── T2.7: Signin redirect fix (depends on T2.6 — the new redirect target `/analizar` needs the EmptyState branch to be in place for the redirect to be discoverable)
  └── T2.8: Update auth-flow.spec.ts + expand e2e navigation.spec.ts to 18 scenarios (final integration check; depends on T2.5 + T2.6 + T2.7)
```

---

## Critical execution order

1. **PR1 first** (T1.1 → T1.2 → T1.3 → T1.4 → T1.5 → T1.6).
2. **PR2 second** (T2.1 → T2.2 → T2.3 → T2.4 → T2.5 → T2.6 → T2.7 → T2.8).
3. **No parallel work** — PR2 must NOT start until PR1 is merged to `main` (PR2's imports depend on PR1's `SiteHeader`, `NAV_ITEMS`, `LocalModePill`, and stripped headers).

Each PR's `pnpm lint` + `pnpm build` + `pnpm test` + `pnpm test:e2e` MUST be green before merge.

---

## Pre-flight checklist per PR

Before declaring any PR done, run these commands in `BuildCv-web/`:

### PR1 pre-flight gates

```bash
pnpm lint                          # 0 errors, 0 warnings
pnpm build                         # next build → 0 errors
pnpm test                          # vitest run → all green; new (15) + updated (15 landing-nav) pass
pnpm test:e2e                      # Playwright → all existing + 1 new parametrized in navigation.spec.ts
# Manual (before commit T1.5):
pnpm dev                           # visit /, /analizar, /analizar/editar, /analizar/diff, /importar, /auth/signin (local) → verify ONE header per page in DevTools
```

### PR2 pre-flight gates (all of PR1's + new e2e)

```bash
pnpm lint                          # 0 errors, 0 warnings
pnpm build                         # next build → 0 errors
pnpm test                          # vitest run → all green; 18 new + existing
pnpm test:e2e                      # Playwright → all 18 new scenarios in navigation.spec.ts + 1 in auth-flow.spec.ts + all existing
# Optional Lighthouse (axe-core in e2e is the automated gate):
npx lighthouse http://localhost:3000/ --only-categories=accessibility --quiet --chrome-flags="--headless"
# Manual:
pnpm dev                           # visit /, /analizar, /importar, /suscripciones (anon), /auth/signin (local) → verify all + resize to 375px to see hamburger
```

---

## Test count forecast

| Phase | Before 019 | After 019 | Delta |
|-------|------------|-----------|-------|
| Web unit (Vitest) | 9 (in `landing-nav.test.tsx` only for the changed slice) + ~28 other web tests | 9 + 17 (PR1: 4 local-mode-pill + 7 site-header + 6 landing-nav updates) + 18 (PR2: 8 mobile-nav + 6 empty-state + 2 icons + 2 site-header mount update) = **44** in changed slice; + ~28 other | **+35 unit tests** (matches design forecast within 2 — design §Test Strategy forecast 33; detailed breakdown above totals 35) |
| Web e2e (Playwright) | 9 specs (smoke + landing + importar + auth-flow + credits + diff + iterations + subscriptions + observability + analizar-*) with ~50 scenarios | 9 specs (1 expanded in auth-flow: +1 scenario) + `navigation.spec.ts` (1 from PR1 + 17 from PR2 = 18 scenarios) | **+18 e2e scenarios in navigation.spec.ts** + 1 regression scenario in auth-flow.spec.ts |
| **TOTAL (this slice)** | — | — | **+54 automated checks** (35 unit + 18 navigation e2e + 1 auth-flow e2e) |

> Baseline note: pre-019 web suite has ~50 Playwright e2e scenarios. The 019 delta adds 19 e2e scenarios (18 in `navigation.spec.ts` + 1 in `auth-flow.spec.ts`) + 35 unit tests = **+54 total new automated checks** (design forecast was 51; +3 is within tolerance for detailed test breakdown).

---

## Conventions per PR

- **Conventional commits**, Spanish messages, no AI attribution (`feat(019): …`, `test(019): …`, `fix(019): …`, `chore(019): …`, `docs(019): …`).
- **Work-unit commits** (1 commit per logical group, NOT per file). Tests + docs ship IN the same commit as the behavior they verify (per `work-unit-commits` skill).
- **Branch**: only `main` (no feature branches; the project has no `main` protection).
- **Direct merge** to `main` (PR-N+1 starts from main after PR-N merges).
- **No suppressions**: no `// @ts-ignore`, no `// eslint-disable-next-line`, no `it.skip`, no `vi.skip`. If a test is flaky, fix the test or fix the component — never silence (Constitution Art. VIII).
- **Pre-flight is mandatory**: ALL 4 commands (`pnpm lint`, `pnpm build`, `pnpm test`, `pnpm test:e2e`) MUST be green before saying "listo".

---

## Risk register

The 8 risks from `design.md`, mapped to which PR + commit mitigates each:

| # | Risk | Likelihood | PR | Commit(s) | Mitigation |
|---|------|------------|----|-----------|------------|
| **1** | **Header composition causes double-render on `/`** if `app/page.tsx:25-33` is not stripped in the same PR as the layout change. Same risk applies to `/analizar`, `/importar`, `/analizar/editar`, `/analizar/diff` (each had its own inline `<header>`). | Med | **PR1** | T1.5 (atomic — strips ALL 5 inline headers in the same commit as the layout insertion) | The layout insertion AND the inline header stripping from all 5 pages are bundled in ONE atomic commit. Unit test in T1.4 (`SiteHeader_DOM_TieneExactamenteUnHeader`) asserts `<SiteHeader>` produces exactly one `<header>` in the DOM. E2E in PR1 T1.6 (`Header_ExactlyOneHeader_ExactlyOneNavPrincipal_OnEachRoute`) is parametrized over 9 routes including all 5 previously-inline-header routes; this is the canary that catches the regression on every route. |
| **2** | **Active-state logic breaks for nested routes.** Adding `/importar` means `/importar/something-future` would also be marked active. Adding `/suscripciones` means `/suscripciones/foo` would also be active. | Low | **PR1 + PR2** | PR1 T1.2 (parametrized active-state table in unit tests); PR2 T2.6 (routes that exercise the rule in production) | Parametrized unit test table in PR1 covers (pathname, expected active href) for 5 primary routes × nested paths. PR2's routes add real-world coverage: `/analizar/iterate` → `Analizar` active is the most important case (asserted by `Nav_ActiveState_NestedRoute_MarksParent` e2e scenario). |
| **3** | **Mobile menu focus return fails.** Native `<dialog>` handles focus trap, but explicit focus return on `close()` and `onClose` is required for WCAG 2.4.3. If the trigger ref is stale (component remounted), focus would land on `<body>`. | Med | **PR2** | T2.2 (mobile-nav component + 8 unit tests) + T2.8 (2 e2e focus return tests) | Unit test `MobileNav_Escape_CierraDialogo_Y_RestauraFocoEnHamburguesa` and `MobileNav_BotonCerrar_CierraDialogo_Y_RestauraFocoEnHamburguesa` (T2.2). E2E tests `Mobile_EscapeClosesDialog_FocusReturnsToHamburguesa` and `Mobile_TabCyclesInsideDialog_FocusNeverEscapes` (T2.8) on a fresh page load (no prior remount). Belt-and-suspenders: focus return implemented in BOTH `close()` callback AND `onClose` event handler. |
| **4** | **`/auth/signin` redirect change breaks an existing test.** Existing `e2e/auth-flow.spec.ts` already navigates to `/analizar` (NOT `/analizar/iterate`) for its assertions — verified by reading the file (lines 61, 76, 92 — all `await page.goto("/analizar")`). So the existing test does NOT break. But the spec demands an explicit regression test in PR2. | Low (verified by reading `e2e/auth-flow.spec.ts`) | **PR2** | T2.7 (1-line fix) + T2.8 (2 new e2e scenarios in `navigation.spec.ts` + 1 regression in `auth-flow.spec.ts`) | The 2 new e2e scenarios in T2.8 explicitly assert the redirect target is `/analizar` and the `<EmptyState>` with "Importar CV" CTA renders after the redirect. The 1 new regression test in `auth-flow.spec.ts` asserts the redirect behavior in the existing auth flow context. All existing `auth-flow.spec.ts` tests continue to pass unchanged. |
| **5** | **Empty states look generic / "AI slop".** Risk of producing `<EmptyState>` cards with low-effort copy ("¡Ups! Nada aquí todavía"). The frontend-design skill explicitly warns against generic AI aesthetics. | Med | **PR2** | T2.1 (copy authored in `spec.md` §Copy keys, locked at spec-review time) + T2.6 (wire into routes) + T2.8 (e2e asserts specific copy) | All empty-state copy is hand-written in the spec's `lib/copy/es.ts` block (locked at spec-review time, not generated at apply time). E2E tests assert the EXACT text from `copy.emptyStates.*` is rendered — not a generic placeholder. The frontend-design skill's "commit to a bold aesthetic direction" is enforced via the typography (Fraunces display) and the dark-warm theme already in `globals.css`. |
| **6** | **Scope creep into auth UX rework.** Tempting to also fix auth error states, sign-out flow, etc. in this slice. | Med | **PR2** | T2.7 (1-line fix ONLY) + Out-of-Scope section | The "Out of scope" section below lists auth UX explicitly as deferred. PR review rejects any commit touching `app/auth/` beyond the 1-line redirect target change. The `requiresAuth?` flag on `NavItem` is added but UNUSED in PR1 — reserved for 009-auth-web. |
| **7** | **CLS regression from new header.** The mobile menu and the new header may shift Cumulative Layout Shift if not properly sized. | Low-Med | **PR1 + PR2** | PR1 T1.4 (`min-h-16` on the `<header>` wrapper) + PR2 T2.2 (mobile dialog is `position: fixed` overlay, not inline push) | The header wrapper has `min-h-16` (Tailwind utility). The mobile dialog is `position: fixed` with a backdrop, so opening it does not shift page content. Lighthouse CLS measured manually in PR2 T2.8's pre-flight step. |
| **8** | **`<LocalModePill>` interferes with `<HeaderExtras>` composition.** The pill is rendered before the slot. If both are visible (v1: authenticated local-mode user), the pill might wrap awkwardly. | Low | **PR1** | T1.4 (composition order: brand → nav → pill → extras) + T1.5's manual visual QA at 375px and 1280px | Pill is small (max-width ~120px). Layout uses `flex items-center gap-3` with `flex-wrap` Tailwind utility. Visual QA at 375px and 1280px in PR1 T1.5's manual verification step. `extras` is `null` in PR1 — the issue doesn't materialize until 009-auth-web; if it does, 009 fixes the layout, NOT 019 (out of scope). |

---

## Out of scope (deferred to 009-auth-web / 010-payments-web / v1.5)

- **`<HeaderExtras>` consumers** (`<CreditBadge>`, `<UserMenu>`). The slot is scaffolded in PR1 but `null` by default. 009-auth-web fills it.
- **Auth-gated filtering of nav items.** The `requiresAuth?` flag is added to `NavItem` but UNUSED in PR1 — every item is visible to every user. 009-auth-web reads the flag and filters the array.
- **Wizard breadcrumbs** on `/analizar/iterate` and `/analizar/diff` (semantic `<nav aria-label="Progreso">` + `<ol>`). Useful but not blocking. Defer to a follow-up if budget allows.
- **Cross-route context preservation** (e.g., paste text in `/analizar`, navigate to `/importar`, offer "Importá un CV y lo precargamos aquí"). Reuses `ICvStore` port. Behind a feature flag.
- **Full multi-step wizard with persistent progress bar.** Product redesign. Defer to v1.5.
- **Onboarding tooltips / coach-marks** (userpilot, intro.js, etc.). Adds a dependency, bakes a vendor. Defer.
- **A/B testing of CTA copy.** No analytics infra in v0. Defer to v1 (post-payments).
- **Bottom-nav for mobile.** Top hamburger is enough for 5 nav items. Don't add a second navigation paradigm.
- **Search / command palette.** Out of scope; 5 primary routes, not 50.
- **Auth state derivation in the nav itself.** The nav stays a dumb presentational component (REQ-NAV-PILL). Session/credit state lives in dedicated components composed by the layout via `<HeaderExtras>`, NOT by `<LandingNav>` or `<MobileNav>`.
- **Touching the scoring engine, the AI pipeline, or the backend** (`BuildCv-api/`). 019 is strictly web-side.

---

## Constitution compliance summary (per PR)

| Article | PR1 enforcement | PR2 enforcement |
|---------|-----------------|-----------------|
| **I — Cero invención** | Nav contains no LLM-generated text; copy in `es.ts`. | Empty-state copy hand-written in `es.ts`; e2e asserts exact text. |
| **II — Puntaje determinista** | Unchanged. 019 doesn't touch scoring. | Unchanged. |
| **III — Privacidad primero** | No new persistence (REQ-PRIV-001 enforced via T1.4 composition — no storage imports); `<LocalModePill>` reads only public env. | No new persistence; mobile menu has no IO; empty states don't read storage. |
| **IV — Encuadre honesto** | Nav labels concrete ("Importar CV", "Analizar"); local-mode pill explicit. | Empty-state copy honest about state ("Empezá pegando tu CV" not "¡Empezá tu viaje!"). |
| **V — Entrada como dato** | Unchanged. | Unchanged. |
| **VI — Clean Architecture** | Nav is presentational (no `lib/auth` import in `<LandingNav>`; `<LocalModePill>` is the only auth-aware component, and it reads a build-time constant); `<HeaderExtras>` slot is the composition point. | `<EmptyState>` is props-driven (no fetching, no auth derivation); `<MobileNav>` is props-driven (no auth, no API). |
| **VII — v0 sin fricción** | Nav visible everywhere; mobile-friendly (≥640px inline, <640px hamburger in PR2). | Empty states guide next step; signin redirect lands on discoverable `/analizar`. |
| **VIII — TDD** | Tests written before implementation in T1.2/T1.3/T1.4/T1.6; co-located with components. | Tests in T2.2/T2.3/T2.4/T2.5/T2.6/T2.7/T2.8; e2e in T2.8; 0 suppressions globally. |
| **IX — Habeas Data** | Unchanged. No PII in nav. | Unchanged. |

**Verdict**: 019 PASSES all nine articles without amendment in both PRs.

---

## Next

`sdd-apply` → implement PR1 first (7 commits; ~250 lines; all gates green; merge to `main`), then PR2 (8 commits; ~300 lines; all gates + axe-core + 18 new e2e scenarios + Lighthouse ≥ 95 verified; merge to `main`).

Then `sdd-verify` → 6/6 gates green (lint, build, test, e2e, constitution-check, Lighthouse a11y) + 16/16 REQs PASS + 52/52 new automated checks.

Then `sdd-archive` → tag `019-navigation-onboarding-v1.0`, sync delta specs (none, since this is a fresh feature not modifying an existing capability spec).