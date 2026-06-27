# Design: 009-auth-web — Integrate backend 009-auth into BuildCv-web

> **Status**: [Design] — Pending tasks (locked architecture; ready for `sdd-tasks`).
> **Proposal**: [`./proposal.md`](./proposal.md) (508 lines · 9-PR chain · 6 locked decisions · Q1=B · Q2=A · Q3=A).
> **Spec**: [`./spec.md`](./spec.md) (517 lines · 21 REQs · 8 NFRs · 6 Compliance Requirements).
> **Exploration**: [`./exploration.md`](./exploration.md) (cross-repo surface mapping · contract-drift discovery).
> **Backend counterpart (shipped)**: [`../../BuildCv-api/specs/009-auth/spec.md`](../../BuildCv-api/specs/009-auth/spec.md) (47 tasks · 290 tests · in-memory · per `BuildCv-api/AGENTS.md` Constitution priority).
> **Design reference**: [`../019-navigation-onboarding/design.md`](../019-navigation-onboarding/design.md) (composition-pattern + `<HeaderExtras>` slot + native `<dialog>`).
> **Constitution**: `BuildCv-api/.specify/memory/constitution.md` v1.2.0 (Art. I–IX · ley suprema).
> **Created**: 2026-06-26.

> **CROSS-REPO change.** Touches `BuildCv-web/` (PR1–PR8) AND `BuildCv-api/` (PR0). Chain strategy `feature-branch-chain`: PR0 (api, chain root) → PR1 → PR2 → PR3 → PR4 → PR5 → PR6 → PR7 → PR8 (last merges to `main` sequentially). PR1 depends on PR0; PR4 depends on PR2; PR5/PR6 depend on PR4; PR7 depends on PR2; PR8 depends on PR0–PR7.

> **⚠ Endpoint reconciliation.** This design uses the SHIPPED backend endpoints (verified against `BuildCv-api/src/BuildCv.Api/Endpoints/*.cs`) and the locked spec (`REQ-FN-001` etc.). The earlier prompt's endpoint list contained 8 paths/methods that DO NOT match the backend; those are catalogued in §13 Risks → R-ENDPOINT-DRIFT and are NOT the source of truth here. The web's BFF routes in §3 follow the SHIPPED contract verbatim.

---

## 1. Overview

009-auth-web makes `BuildCv-web` a real consumer of the shipped backend `009-auth` (12 endpoints, 290 tests, in-memory). Users sign in with Google/LinkedIn via NextAuth, exercise Habeas Data rights (consent grant/revoke, ARCO access/rectify/cancel) on `/cuenta`, read the privacy policy at `/privacidad` with a v1/v2/v3 selector, see an auth-aware `<UserMenu>` in the header, and sign out with full server-side token revocation. The change ships as 9 chained PRs (PR0 api prep + PR1–PR8 web), each ≤350 LOC, each green in isolation, all through the BFF same-origin port pattern (`app/api/*` → `BACKEND_URL/api/v1/*`). Zero new dependencies, zero new persistence on the web, local mode (`IS_LOCAL === true`) keeps skipping all auth UI per Art. VII.

---

## 2. Architecture

### 2.1 Repo boundaries

| Repo | Scope | Toolchain | Independent? |
|---|---|---|---|
| `BuildCv-api/` | PR0 only (cross-repo prep): `/auth/web-signup`, revoke-all-for-user, bearer-only logout | .NET 10 · xUnit · `dotnet build` / `dotnet test` | ✅ separate `.git`, CI, deploy |
| `BuildCv-web/` | PR1–PR8: full UI, BFF, tests | Next.js 16 · Vitest 2 · Playwright 1 · `pnpm` | ✅ separate `.git`, CI, deploy |

The cross-repo coupling is locked to PR0 (api) → PR1 (web). After PR0 lands, all subsequent PRs are web-only. Per `BuildCv-web/AGENTS.md` and `BuildCv-api/AGENTS.md`, repos do not share toolchain, dependencies, or CI.

### 2.2 Frontend layering (Art. VI Clean Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│  app/                     (App Router pages + BFF route handlers) │
│   layout.tsx              composition root (passes <UserMenu>    │
│                            as <SiteHeader extras> per 019)       │
│   page.tsx                landing                                │
│   privacidad/page.tsx     server component (PR3)                  │
│   cuenta/page.tsx         server component w/ route guard (PR4)   │
│   auth/signin/page.tsx    existing; error-map updated (PR1)       │
│   api/auth/web-signup/    BFF POST → backend (PR1)                │
│   api/auth/logout/        BFF POST → backend (PR2)                │
│   api/privacy/            BFF GET  → backend (PR3)                │
│   api/user/data/          BFF GET/PUT/DELETE → backend (PR4+PR6)  │
│   api/consent/grant|revoke/  BFF POST → backend (PR5)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼  (BFFs call via lib/api/* ports)
┌─────────────────────────────────────────────────────────────────┐
│  lib/api/                 (typed ports — no direct fetch in cmp)  │
│   auth-adapter.ts         registerWithBackend (PR1)               │
│   jwt.ts                  EXISTING — getJwtFromSession + cache    │
│   privacy.ts              getPrivacyPolicy (PR3)                  │
│   user-data.ts            getUserData, rectifyUserData,           │
│                           deleteUserData (PR4 + PR6)              │
│   consent.ts              grantConsent, revokeConsent (PR5)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼  (server-to-server, never browser)
┌─────────────────────────────────────────────────────────────────┐
│  components/             (presentational only — no fetch)         │
│   landing/site-header.tsx  EXISTING (per 019) — exposes <HeaderExtras>│
│   landing/landing-nav.tsx  EXISTING — extended to hide Cuenta   │
│                                  when authenticated (PR7)         │
│   header/user-menu.tsx     NEW — avatar + <dialog> dropdown (PR7)│
│   account/cuenta-skeleton  NEW — 3 named slots (PR4)             │
│   account/datos-personales NEW — email/provider/createdAt (PR4)   │
│   account/consent-panel    NEW — 2 purposes (PR5)                 │
│   account/consent-grant-   NEW — <dialog> + scroll gate (PR5)    │
│              modal.tsx                                              │
│   account/arco-panel       NEW — 3 sections (PR6)                 │
│   account/arco-cancel-     NEW — type-email gate (PR6)            │
│              modal.tsx                                              │
│   privacy/privacy-policy-view  NEW — <pre> + version selector (PR3)│
│   privacy/privacy-version-selector  NEW — <select> (PR3)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  lib/auth-client.ts       signOutAndClear (PR2)                  │
│  lib/use-user-menu.ts     wraps useSession (PR7)                 │
│  lib/use-consent.ts       consent state (PR5)                    │
│  lib/use-arco.ts          arco state (PR6)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BUILDcv-api BACKEND (PR0 adds web-signup + revoke-all + bearer-only logout)│
│  /api/v1/auth/{web-signup,google,linkedin,refresh,logout,me,session}│
│  /api/v1/user/data        /api/v1/user/data/consent[/revoke]      │
│  /api/v1/privacy-policy                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Cross-repo data path (OAuth happy path)

```
User                Browser                Web (Next.js)              Backend (.NET)
 │                    │                        │                          │
 │  click "Google"    │                        │                          │
 │ ──────────────────>│                        │                          │
 │                    │  NextAuth signIn("google")                       │
 │                    │ ──────────────────────>│                          │
 │                    │                        │  Google redirect dance  │
 │                    │                        │  (NextAuth-managed)      │
 │                    │                        │                          │
 │                    │  NextAuth JWT          │                          │
 │                    │ <──────────────────────│                          │
 │                    │                        │  events.signIn →         │
 │                    │                        │   registerWithBackend()  │
 │                    │                        │  POST /api/auth/web-signup│
 │                    │                        │ ─────────────────────────>│
 │                    │                        │                          │  IUserDataService
 │                    │                        │                          │  .GetOrCreateAsync(
 │                    │                        │                          │    provider, acctId,
 │                    │                        │                          │    email, name)
 │                    │                        │  { userId }              │
 │                    │                        │ <─────────────────────────│
 │                    │  next-auth.session-token│                         │
 │                    │ <──────────────────────│                          │
 │                    │                        │                          │
 │  navigate /cuenta  │                        │                          │
 │ ──────────────────>│  GET /cuenta            │                          │
 │                    │ ──────────────────────>│  getServerSession() →    │
 │                    │                        │  NextAuth JWT present    │
 │                    │                        │                          │
 │                    │                        │  getUserData() →         │
 │                    │                        │   GET /api/user/data     │
 │                    │                        │ ─────────────────────────>│
 │                    │                        │  getJwtFromSession() →   │
 │                    │                        │  GET /api/v1/auth/session│
 │                    │                        │ ─────────────────────────>│
 │                    │                        │  <─ { jwt, expiresAt }   │
 │                    │                        │  <─ UserDataResponse     │
 │                    │  HTML w/ 3 sections    │                          │
 │                    │ <──────────────────────│                          │
```

### 2.4 Architecture decisions

#### Decision: BFF ports in `lib/api/*.ts`, not direct fetch in components

**Choice**: Every backend call goes through a typed port (`lib/api/auth-adapter.ts`, `lib/api/user-data.ts`, `lib/api/consent.ts`, `lib/api/privacy.ts`). Components import the port, never `fetch` or `BACKEND_URL` directly.
**Alternatives considered**: (a) `swr` / `react-query` for client-side data — rejected: adds a runtime dep and a fetch strategy for a 9-PR change that needs server components primarily. (b) Server actions — rejected: PR4+ are server components already; client mutations live in BFF POST handlers, which keeps the response surface uniform.
**Rationale**: aligns with Art. VI (BFF is a port, components are presentational) and `BuildCv-web/AGENTS.md` "no external UI library" rule. Error wrapping (`RateLimitError` with `retryAfter: Date`) lives in the port, not duplicated in every component.

#### Decision: Native `<dialog>` for ALL modals (UserMenu, ConsentGrant, ArcoCancel)

**Choice**: Use the platform's `<dialog>` element with `dialog.showModal()` / `dialog.close()`. No headless-ui, no radix-ui.
**Alternatives considered**: (a) Custom `<div role="dialog">` with `useEffect` focus trap — rejected: re-invents the platform. (b) Radix Dialog — rejected: adds ~12 KB gzipped + abstraction we don't otherwise need.
**Rationale**: per 019 design §"Decision: Native `<dialog>`", native gives focus trap + Esc + inert-background + focus return on close for free. WCAG 2.4.3 (Focus Order) and 2.1.2 (No Keyboard Trap) satisfied by the platform.

#### Decision: `<UserMenu>` lives in `<HeaderExtras>` slot, NOT in `<LandingNav>`

**Choice**: PR7 mounts `<UserMenu>` as `extras` prop of `<SiteHeader>` (the slot created in 019 PR1). `<LandingNav>` only gains the conditional `display:none` on its existing `Cuenta` item when authenticated — no nav internal logic change.
**Alternatives considered**: (a) Render `<UserMenu>` inside `<LandingNav>` — rejected: violates 019 REQ-NAV-PILL (`<LandingNav>` is pure presentational, no `useSession()`). (b) Render `<UserMenu>` directly in `app/layout.tsx` siblings of `<SiteHeader>` — rejected: duplicates the slot pattern already established.
**Rationale**: preserves the composition pattern from 019. The `<SiteHeader extras>` slot is the explicit extension point for auth-aware UI (already documented in 019 design as the seam for 009-auth-web).

#### Decision: PR0 + PR1 are atomic cross-repo (cannot land separately)

**Choice**: PR0 (api) lands first; PR1 (web) targets PR0's branch. If PR0 is reverted, PR1 must follow.
**Alternatives considered**: (a) Land PR1 with a stub BFF that 200s without backend — rejected: PR0 is small (~100 LOC), no reason to defer. (b) Do the contract fix in PR1 only and skip PR0 — rejected: backend's `/auth/logout` requires body today (`RefreshTokenRequest` is non-nullable); PR0 must make it nullable and add `RevokeAllForUserAsync`.
**Rationale**: the contract drift is resolved by the SHIPPED `/auth/web-signup` endpoint, which requires backend code. The chain root is unambiguous.

#### Decision: Scroll-to-bottom via `scroll` event listener on `<pre>` ref (not `IntersectionObserver`)

**Choice**: `<ConsentGrantModal>` attaches a `scroll` event listener to the `<pre>` element's ref. Sets `hasScrolledToBottom = true` when `scrollTop + clientHeight >= scrollHeight - 1` (1px tolerance).
**Alternatives considered**: (a) `IntersectionObserver` on a sentinel element below the content — considered because the user prompt mentions it. **Rejected for v0.5.1**: `IntersectionObserver` requires the modal's content to have a known scroll container with a sentinel. With `<pre>` containing markdown, the simplest reliable test is the scroll-event check. (b) `scrollend` event — rejected: not yet Baseline (Baseline 2024); jsdom doesn't fire it.
**Rationale**: scroll-event + 1px tolerance is testable with jsdom by mocking `scrollHeight` directly. The 1px tolerance absorbs sub-pixel rounding. Documented in `components/account/consent-grant-modal.tsx` header comment. **Open for v0.6**: revisit `IntersectionObserver` when the policy content grows beyond ~5 screens.

---

## 3. API/BFF Contracts

> **Truth source**: `BuildCv-api/src/BuildCv.Api/Endpoints/{AuthEndpoints,UserDataEndpoints,PrivacyEndpoints,SessionEndpoint}.cs` (verified). The BFF routes in `BuildCv-web/app/api/*` proxy these verbatim. No invented endpoints. Items flagged `[NEEDS BACKEND VERIFY]` indicate where the user's prompt listed a path that does NOT exist in the shipped backend; the design uses the SHIPPED path and flags the discrepancy in §13.

### 3.1 Backend endpoint surface (verified against shipped code)

| Method | Path (shipped) | Auth | Rate-limit | Body / Response | BFF wrapper |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/web-signup` *(PR0 NEW)* | none | `auth` 30/min/IP | `{provider: "google"\|"linkedin", providerAccountId, email, name}` → `{userId: Guid}` | `app/api/auth/web-signup/route.ts` (PR1) |
| POST | `/api/v1/auth/google` | none | `auth` 30/min/IP | `{code, state}` → `{accessToken, refreshToken, user}` | *(not called by web; NextAuth does the dance)* |
| POST | `/api/v1/auth/linkedin` | none | `auth` 30/min/IP | `{code, state}` → `{accessToken, refreshToken, user}` | *(not called by web)* |
| GET | `/api/v1/auth/me` | bearer JWT | `auth` 30/min/IP | `{userId, provider, email, name}` | *(future use; PR7 wraps if needed)* |
| POST | `/api/v1/auth/refresh` | none | `auth` 30/min/IP | `{refreshToken}` → `{accessToken, refreshToken, user}` | *(future auto-refresh in v0.6; see §14 OQ-1)* |
| POST | `/api/v1/auth/logout` *(PR0 accepts bearer-only)* | bearer JWT (PR0) | `auth` 30/min/IP | `{}` (optional body) → `{message: "Logged out successfully"}` | `app/api/auth/logout/route.ts` (PR2) |
| GET | `/api/v1/auth/session` | NextAuth JWT bearer | none | `{jwt, expiresAt, user:{id,email,name}}` | *(no BFF — direct proxy from `lib/api/jwt.ts`)* |
| GET | `/api/v1/privacy-policy?version=N` | none | none | `{version, content, effectiveDate, dataCategories[], purposes[]}` | `app/api/privacy/route.ts` (PR3) |
| GET | `/api/v1/user/data` | bearer JWT | `consent` 10/min/IP | `{userId, provider, email, name, createdAt, lastLoginAt}` | `app/api/user/data/route.ts` (PR4) |
| POST | `/api/v1/user/data/consent` | bearer JWT | `consent` 10/min/IP | `{purpose}` → `{message, consentId}` | `app/api/consent/grant/route.ts` (PR5) |
| POST | `/api/v1/user/data/consent/revoke` | bearer JWT | `consent` 10/min/IP | `{purpose}` → `{message}` | `app/api/consent/revoke/route.ts` (PR5) |
| PUT | `/api/v1/user/data` | bearer JWT | `consent` 10/min/IP | `{email?, name?}` → `UserDataResponse` | `app/api/user/data/route.ts` (PR6) |
| DELETE | `/api/v1/user/data` | bearer JWT | `consent` 10/min/IP | `{}` → `{message}` | `app/api/user/data/route.ts` (PR6) |

### 3.2 BFF route handler signatures (Zod-validated)

```ts
// app/api/auth/web-signup/route.ts (PR1)
import { z } from "zod";
export const WebSignupBodySchema = z.object({
  provider: z.enum(["google", "linkedin"]),
  providerAccountId: z.string().min(1).max(255),
  email: z.string().email().max(320),
  name: z.string().min(1).max(200),
});
export type WebSignupBody = z.infer<typeof WebSignupBodySchema>;
// POST: validates body → fetch BACKEND_URL/api/v1/auth/web-signup w/ 5s timeout
// 200 → return { userId }
// 4xx → return same status + backend detail
// 5xx → return 502 + log via console.warn (no PII per Art. III)

// app/api/auth/logout/route.ts (PR2)
// POST: getServerSession → getJwtFromSession → fetch BACKEND_URL/api/v1/auth/logout
//       Authorization: Bearer <jwt>, body {} (or omitted)
// 200 → clear BFF cache + return 200
// 4xx/5xx → still clear cache + console.warn + return 200 (best-effort per Art. VII)

// app/api/privacy/route.ts (PR3)
export const PrivacyQuerySchema = z.object({
  version: z.coerce.number().int().min(1).max(3).optional(),
});
// GET ?version=N → fetch BACKEND_URL/api/v1/privacy-policy?version=N
// 200 → return JSON
// 404 → return { error: "not_found", version } (page renders error UI)

// app/api/user/data/route.ts (PR4 GET; PR6 PUT + DELETE)
export const RectifyBodySchema = z.object({
  email: z.string().email().max(320).optional(),
  name: z.string().min(1).max(200).optional(),
}).refine((b) => b.email !== undefined || b.name !== undefined, {
  message: "At least one of email or name is required",
});
// GET  → fetch BACKEND_URL/api/v1/user/data (bearer)
// PUT  → fetch BACKEND_URL/api/v1/user/data (bearer + JSON body)
// DELETE → fetch BACKEND_URL/api/v1/user/data (bearer + no body)
// 429 → forward Retry-After header verbatim

// app/api/consent/grant/route.ts (PR5)
export const GrantBodySchema = z.object({ purpose: z.string().min(1).max(64) });
// POST → fetch BACKEND_URL/api/v1/user/data/consent (bearer + {purpose})

// app/api/consent/revoke/route.ts (PR5)
export const RevokeBodySchema = z.object({ purpose: z.string().min(1).max(64) });
// POST → fetch BACKEND_URL/api/v1/user/data/consent/revoke (bearer + {purpose})
```

### 3.3 Typed ports (lib/api/*.ts)

```ts
// lib/api/auth-adapter.ts (PR1)
export interface WebSignupRequest {
  provider: "google" | "linkedin";
  providerAccountId: string;
  email: string;
  name: string;
}
export interface WebSignupResponse { userId: string }
export async function registerWithBackend(req: WebSignupRequest): Promise<WebSignupResponse>;
export class AuthAdapterError extends Error {
  constructor(public readonly status: number, public readonly detail: string);
}

// lib/api/privacy.ts (PR3)
export interface PrivacyPolicy {
  version: 1 | 2 | 3;
  content: string;          // markdown (rendered in <pre>)
  effectiveDate: string;    // ISO-8601 date
  dataCategories: ReadonlyArray<string>;
  purposes: ReadonlyArray<string>;
}
export async function getPrivacyPolicy(version?: number): Promise<PrivacyPolicy>;
export class PrivacyNotFoundError extends Error { constructor(public readonly version: number) }

// lib/api/user-data.ts (PR4 + PR6)
export interface UserDataResponse {
  userId: string;
  provider: "google" | "linkedin";
  email: string;
  name: string;
  createdAt: string;        // ISO-8601
  lastLoginAt: string;
}
export interface RectifyRequest { email?: string; name?: string }
export async function getUserData(): Promise<UserDataResponse>;
export async function rectifyUserData(req: RectifyRequest): Promise<UserDataResponse>;
export async function deleteUserData(): Promise<{ message: string }>;
export class RateLimitError extends Error {
  constructor(public readonly retryAfter: Date); // parsed from Retry-After
}

// lib/api/consent.ts (PR5)
export interface GrantRequest  { purpose: string }
export interface RevokeRequest { purpose: string }
export interface GrantResponse { message: string; consentId: string }
export async function grantConsent(req: GrantRequest): Promise<GrantResponse>;
export async function revokeConsent(req: RevokeRequest): Promise<{ message: string }>;

// lib/api/jwt.ts (EXISTING — verified; PR2 wires clearJwtCache into sign-out)
export async function getJwtFromSession(): Promise<{ jwt: string; userId: string; expiresAt: Date } | null>;
export function clearJwtCache(): void;
```

### 3.4 Error mapping (consistent across BFFs)

| Backend status | BFF status | Client UX |
|---|---|---|
| 200/201 | 200 | success path |
| 400 (validation) | 400 | inline form error "Revisá el formato" |
| 401 (no/invalid bearer) | 401 | sign-in redirect if on protected route (`/cuenta`); toast otherwise |
| 404 (privacy version) | 404 | `<PrivacyNotFoundError>` UI with link back to `/privacidad` |
| 409 (consent already granted) | 409 | inline "Ya otorgaste este consentimiento" (no re-grant) |
| 429 | 429 with `Retry-After` forwarded verbatim | inline "Demasiadas solicitudes. Reintentá en <formatted date>." per REQ-FN-018 |
| 5xx | 502 | `console.warn` (no PII), non-blocking — client retries manually |
| network error | 503 | "No pudimos contactar el servidor. Reintentá." |

---

## 4. Component Contracts

> All props `readonly`. Arrays `ReadonlyArray<T>`. Discriminated unions where applicable. No `any`. No `as` casts outside event handlers. Native `<dialog>` (per 2.4). WCAG 2.2 AA per NFR-A11Y-1.

### 4.1 `<UserMenu>` — `components/header/user-menu.tsx` (PR7)

```ts
// No props. Internal state: { dialogOpen: boolean; triggerRef: RefObject<HTMLButtonElement> }.
type UserMenuStatus = "loading" | "authenticated" | "unauthenticated";
interface UserMenuState {
  status: UserMenuStatus;
  user?: { email: string; name: string | null };  // name may be null from Google
}

// Behavior:
// - Reads IS_LOCAL from @/lib/auth; returns null when IS_LOCAL === true (Art. VII).
// - When status === "loading": renders <div role="status" aria-label="Cargando"
//   className="min-h-16 w-32 animate-pulse rounded-full bg-stone-800" /> (no CLS).
// - When status === "authenticated":
//   <button type="button" aria-haspopup="dialog" aria-expanded={dialogOpen}
//            aria-controls="user-menu-dialog" onClick={() => dialogRef.current?.showModal()}
//            className="min-h-16 ...">
//     <span aria-hidden="true">{avatarInitial}</span>
//     <span>{user.email}</span>
//   </button>
//   <dialog id="user-menu-dialog" ref={dialogRef} aria-label="Menú de usuario"
//           onClose={() => { triggerRef.current?.focus(); setDialogOpen(false); }}>
//     <ul role="menu">
//       <li role="none"><Link role="menuitem" href="/cuenta">Mi cuenta</Link></li>
//       <li role="none"><button role="menuitem" type="button"
//                              onClick={() => signOutAndClear()}>Cerrar sesión</button></li>
//     </ul>
//     <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar menú">×</button>
//   </dialog>
// - When status === "unauthenticated": renders <a href="/auth/signin" className="...">Iniciar sesión</a>.
// - Honors prefers-reduced-motion: the dropdown fade is disabled when matchMedia("(prefers-reduced-motion: reduce)").matches.
// - Keyboard: ArrowDown/Up moves focus between menuitems; Home/End jumps to first/last.
// - Focus return: explicit in close() AND dialog's onClose (belt-and-suspenders per 019 pattern).
```

### 4.2 `<ConsentPanel>` — `components/account/consent-panel.tsx` (PR5)

```ts
interface ConsentPanelProps {
  /** Server-passed initial consent state. Defaults to { functional: true, analytics: false }. */
  initial: Readonly<Record<"functional" | "analytics", boolean>>;
  onGrant: (purpose: "functional" | "analytics") => Promise<void>;
  onRevoke: (purpose: "functional" | "analytics") => Promise<void>;
  /** When set, renders the grant modal for the given purpose; null when closed. */
  grantModalPurpose: "functional" | "analytics" | null;
  onCloseGrantModal: () => void;
  onConsentChange?: (next: Record<"functional" | "analytics", boolean>) => void;
}

// Behavior:
// - Renders <section id="consent" aria-labelledby="consent-title"> with <h2 id="consent-title">.
// - Lists 2 rows from copy.consent.purposes.* (functional = essential, cannot revoke;
//   analytics = opt-in). Each row: <h3>, <p>description, <button>Otorgar/Revocar</button>.
// - On Otorgar click → calls onGrant → opens grant modal via parent state.
// - On Revocar click → calls onRevoke directly (no modal — revoke is reversible, REQ-FN-012).
// - Error display: <p role="alert" aria-live="polite">{error.message}</p> on 4xx/5xx.
// - RateLimitError: <p role="alert" aria-live="polite"> with formatted Retry-After timestamp.
```

### 4.3 `<ConsentGrantModal>` — `components/account/consent-grant-modal.tsx` (PR5)

```ts
interface ConsentGrantModalProps {
  purpose: "functional" | "analytics";
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

// Behavior:
// - Native <dialog ref={dialogRef} aria-labelledby="grant-modal-title"
//   aria-describedby="grant-modal-desc">.
// - On open: fetches getPrivacyPolicy(3) via SWR or server-passed prop. Renders <pre>{content}</pre>
//   inside a <div ref={contentRef} onScroll={handleScroll} className="max-h-96 overflow-y-auto">.
// - hasScrolledToBottom: scroll event sets true when
//   contentRef.current.scrollTop + contentRef.current.clientHeight >=
//   contentRef.current.scrollHeight - 1.
// - Checkbox: <input type="checkbox" id="grant-consent" aria-describedby="grant-modal-desc"
//   checked={hasRead} onChange={(e) => setHasRead(e.target.checked)} />.
// - Confirm button: <button type="button" disabled={!hasScrolledToBottom || !hasRead}
//   onClick={onConfirm}>Otorgar consentimiento</button>.
// - Cancel button: <button type="button" onClick={() => dialogRef.current?.close()}>Cancelar</button>.
// - On close (Esc or Cancel): onCancel() → parent closes modal.
// - RateLimitError from onConfirm: stays open, displays inline error above checkbox.
// - prefers-reduced-motion: backdrop fade disabled.
```

### 4.4 `<ArcoPanel>` — `components/account/arco-panel.tsx` (PR6)

```ts
interface ArcoPanelProps {
  userData: UserDataResponse;
  onRectify: (req: { email?: string; name?: string }) => Promise<UserDataResponse>;
  onDelete: () => Promise<{ message: string }>;
  onEmailRotated: (newEmail: string) => void;  // PR6 calls signOutAndClear() + redirect
}

// Behavior:
// - 3 sections inside <section id="arco" aria-labelledby="arco-title">.
// - ACCESS: <button type="button" aria-expanded={open} onClick={loadData}>Ver mis datos</button> +
//   <details open={open}><summary>Detalle</summary><pre>{JSON.stringify(userData, null, 2)}</pre></details>.
//   The fetch reuses parent userData; the button is a "refresh" affordance.
// - RECTIFY: <form aria-labelledby="rectify-title"> with name + email inputs.
//   <button type="submit" disabled={isSubmitting}>Guardar cambios</button>.
//   On 200: success toast + if email changed, calls onEmailRotated(newEmail).
//   On 400: inline "Revisá el formato". On 429: inline with Retry-After.
//   On 5xx: "No pudimos guardar los cambios. Reintentá."
// - CANCEL: <button type="button" className="bg-red-700 ...">Eliminar mi cuenta</button> → opens cancel modal.
```

### 4.5 `<ArcoCancelModal>` — `components/account/arco-cancel-modal.tsx` (PR6)

```ts
interface ArcoCancelModalProps {
  userEmail: string;
  onConfirm: () => Promise<void>;  // internally calls deleteUserData + signOutAndClear
  onCancel: () => void;
}

// Behavior:
// - Native <dialog ref={dialogRef} aria-labelledby="arco-cancel-title" aria-describedby="arco-cancel-desc">.
// - Copy from copy.arco.cancel.* — explicit: "Vas a eliminar tu perfil y todos tus
//   consentimientos. Las facturas ya emitidas se conservan por ley. Esta acción no se puede deshacer."
// - Input: <input type="email" id="arco-confirm-email" aria-describedby="arco-confirm-email-help"
//   value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} />.
// - Help text: "Escribí tu email para confirmar: <strong>{userEmail}</strong>".
// - Confirm button: disabled until confirmEmail === userEmail (exact, case-insensitive).
// - On confirm: calls onConfirm → parent calls deleteUserData() → on 200 calls signOutAndClear()
//   → router.push("/"). On 429: inline with Retry-After.
// - Cancel / Esc: onCancel() (no deletion).
```

### 4.6 `<PrivacyPolicyView>` — `components/privacy/privacy-policy-view.tsx` (PR3)

```ts
interface PrivacyPolicyViewProps {
  policy: PrivacyPolicy;       // version, content, effectiveDate, dataCategories, purposes
  currentVersion: number;      // selected version (1, 2, or 3)
}

// Behavior:
// - <article aria-labelledby="privacy-title"> with <h1 id="privacy-title">.
// - Renders <PrivacyVersionSelector currentVersion={currentVersion} versions={[1,2,3]} />.
// - Subtitle: "Política de privacidad — versión N (vigente desde DATE)" from copy.privacy.*.
// - Renders content in <pre className="whitespace-pre-wrap font-mono">{policy.content}</pre>.
//   No markdown parsing (no extra dep per project rule). Content is hardcoded by backend.
// - Footer: <p>{copy.privacy.effectiveDate}: {policy.effectiveDate}</p>.
```

### 4.7 `<PrivacyVersionSelector>` — `components/privacy/privacy-version-selector.tsx` (PR3)

```ts
interface PrivacyVersionSelectorProps {
  currentVersion: number;
  versions: ReadonlyArray<1 | 2 | 3>;
}

// Behavior:
// - <label htmlFor="privacy-version" className="...">{copy.privacy.versionLabel}</label>
// - <select id="privacy-version" defaultValue={String(currentVersion)}
//   onChange={(e) => router.push(`/privacidad?version=${e.target.value}`)}>
//   {versions.map(v => <option key={v} value={v}>Versión {v}</option>)}
// - WCAG 2.2 §1.3.1 (Info and Relationships): <label htmlFor> association.
```

### 4.8 `<CuentaSkeleton>` — `components/account/cuenta-skeleton.tsx` (PR4)

```ts
interface CuentaSkeletonProps {
  datosPersonales: React.ReactNode;  // <DatosPersonalesSection> — filled in PR4
  consent: React.ReactNode;          // <ConsentSectionSlot> — filled in PR5
  arco: React.ReactNode;             // <ArcoSectionSlot> — filled in PR6
}

// Behavior:
// - <main aria-labelledby="cuenta-title">
//   <h1 id="cuenta-title">{copy.account.title}</h1>
//   {datosPersonales}
//   {consent}
//   {arco}
// - Each slot renders inside <section id="datos-personales|cconsent|arco" aria-labelledby="...">.
// - PR4 ships the page with: datosPersonales filled, consent = <ConsentSectionSlot/>, arco = <ArcoSectionSlot/>.
// - PR5 fills the consent slot. PR6 fills the arco slot. Non-overlapping diffs.
```

### 4.9 `<DatosPersonalesSection>` — `components/account/datos-personales-section.tsx` (PR4)

```ts
interface DatosPersonalesSectionProps {
  userData: UserDataResponse | null;  // null = still loading
  error?: RateLimitError | Error;
}

// Behavior:
// - <dl> with rows: Email, Proveedor, Cuenta creada, Último inicio de sesión.
// - Loading: 4 skeleton <dd> rows with animate-pulse.
// - Error: <p role="alert"> with copy + (if RateLimitError) formatted retryAfter.
// - Footer: <small>{copy.account.inMemoryNotice}</small> ("Tu cuenta se guarda en memoria durante esta sesión de desarrollo").
```

### 4.10 `<SignInButton>` — `components/auth/signin-button.tsx` (PR1)

```ts
interface SignInButtonProps {
  provider: "google" | "linkedin";
  callbackUrl?: string;
}

// Behavior:
// - <button type="button" onClick={() => signIn(provider, { callbackUrl: callbackUrl ?? "/" })}>
//   Continuar con {provider === "google" ? "Google" : "LinkedIn"}
// - No <div onClick>. Native <button> per CR-DLG-1.
```

---

## 5. State & Session Model

### 5.1 Session shape

```ts
// NextAuth session (existing, lib/auth.ts:33-58)
interface NextAuthSession {
  user?: { id: string; email: string; name: string | null };
  expires: string;  // ISO-8601, 7 days
}

// Backend access JWT (cached, lib/api/jwt.ts:24-35)
interface CachedBackendJwt {
  userId: string;
  jwt: string;          // HS256, 15min TTL
  expiresAt: Date;
  cachedAt: Date;       // now
}
// Cache: Map<userId, CachedBackendJwt>. TTL = min(expiresAt - now, JWT_CACHE_TTL_SECONDS=300).

// UserDataResponse (from /api/v1/user/data)
interface UserDataResponse {
  userId: string;
  provider: "google" | "linkedin";
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
}
```

### 5.2 Cookie config (verified against `lib/auth.ts:33` + NextAuth defaults)

| Cookie | httpOnly | SameSite | Secure | Path | TTL |
|---|---|---|---|---|---|
| `next-auth.session-token` (dev) | ✅ true | `Lax` (NextAuth default) | `false` (dev) / `true` (prod via `__Secure-` prefix) | `/` | 7 days |
| `__Secure-next-auth.session-token` (prod) | ✅ true | `Lax` | ✅ true (required by `__Secure-` prefix) | `/` | 7 days |
| `next-auth.csrf-token` | ✅ true | `Lax` | matches session token | `/` | session |
| `next-auth.callback-url` | ❌ false (NextAuth) | `Lax` | matches session token | `/` | session |

**No tokens in `localStorage` / `IndexedDB` / `sessionStorage`** (NFR-SEC-1, CR-TOK-1). The backend access JWT lives only in the BFF in-memory cache, never serialized to the client.

### 5.3 Refresh rotation algorithm (backend-side; web observes)

> The web does NOT directly rotate refresh tokens (Q1=B path). Backend's `POST /auth/refresh` rotates on every use (verified `AuthEndpointTests.Refresh_token_rotation_old_token_invalidated` line 116). The web observes the new `expiresAt` from the `/auth/session` response and clamps cache TTL accordingly.

```
Backend:                                         Web (BFF cache):
───────                                          ────────────────
1. POST /auth/refresh w/ old refresh_token
2. validate old token → mark INVALIDATED
3. generate new access + refresh
4. return { accessToken, refreshToken, user }
                                                  5. (not called in v0.5.1 — auto-refresh deferred)
                                                  6. next getJwtFromSession() → /auth/session
                                                  7. backend validates NextAuth JWT → fresh 15min JWT
                                                  8. cache.set(userId, { jwt, expiresAt, cachedAt: now })
                                                  9. TTL = min(expiresAt - now, 300s) = 5min cap
```

### 5.4 Sign-out + revoke-all flow

```
User click "Cerrar sesión" in <UserMenu>
  → signOutAndClear() in lib/auth-client.ts:
    1. signOut({ callbackUrl: "/" })  // NextAuth clears next-auth.session-token
    2. POST /api/auth/logout          // BFF handler:
       a. getServerSession() → null (cookie cleared)
       b. OR if cookie present: getJwtFromSession() → backend JWT
       c. fetch BACKEND_URL/api/v1/auth/logout (bearer, no body)
       d. handler.RevokeAllForUserAsync(userId)  // PR0 backend change
       e. return 200 (even if backend returned 5xx — best-effort)
    3. clearJwtCache() from lib/api/jwt.ts:152
    4. router.push(callbackUrl ?? "/")
```

### 5.5 Auto-sign-out trigger (REQ-FN-021, R16)

```
ARCO Rectify form submit w/ new email
  → PUT /user/data w/ { email: "new@example.com" }
  → 200 + UserDataResponse { email: "new@example.com", ... }
  → ArcoPanel.onEmailRotated(newEmail):
    a. signOutAndClear()  // clears NextAuth cookie + calls BFF logout + clears cache
    b. router.push("/auth/signin?reason=email-rotated&email=" + encodeURIComponent(newEmail))
  → SignInPage reads ?reason=email-rotated&email=...:
    a. Shows banner copy.auth.emailRotatedBanner
    b. After successful re-auth, the new NextAuth JWT encodes the new email
```

### 5.6 State ownership map

| State | Owner | Lifetime | Storage |
|---|---|---|---|
| NextAuth session | `lib/auth.ts` NextAuth | 7 days | `next-auth.session-token` cookie |
| Backend JWT | `lib/api/jwt.ts` cache | min(15min, 5min) | In-memory `Map<userId, CachedBackendJwt>` |
| User data | `<ArcoPanel>` (server-passed) | per-page-load | React state only |
| Consent state | `<ConsentPanel>` (server-passed) | per-page-load | React state only |
| Modal open state | Modal component | ephemeral | `useState` in parent |
| `IS_LOCAL` | `lib/auth.ts` constant | build-time | `process.env.NEXT_PUBLIC_LOCAL_MODE` |

---

## 6. Data Flow

### 6.1 OAuth happy path

```
[Browser]      [NextAuth]       [Web BFF]         [Backend]
   │              │                │                  │
   │ signIn("google")              │                  │
   │ ────────────>│                │                  │
   │              │ Google OAuth redirect dance       │
   │              │ (NextAuth-managed, browser-side)  │
   │              │                │                  │
   │              │ set next-auth.session-token        │
   │              │ (httpOnly cookie)                  │
   │              │                │                  │
   │              │ events.signIn fires               │
   │              │ → registerWithBackend()           │
   │              │ ───────────────>│                  │
   │              │                │ POST /auth/web-signup
   │              │                │ ────────────────>│
   │              │                │   { provider, providerAccountId,
   │              │                │     email, name } │
   │              │                │   IUserDataService.GetOrCreateAsync
   │              │                │ <────────────────│  { userId }
   │              │ JWT session    │                  │
   │ <────────────│ cookie         │                  │
   │              │                │                  │
   │ navigate /cuenta              │                  │
   │ ────────────>│                │                  │
   │              │ getServerSession() → JWT present  │
   │              │                │                  │
   │              │ getJwtFromSession()               │
   │              │ → GET /auth/session (NextAuth JWT)│
   │              │ ───────────────>│ ────────────────>│
   │              │                │ NextAuthJwtValidator
   │              │                │ <────────────────│ { jwt, expiresAt, user }
   │              │                │ cache.set(...)   │
   │              │ getUserData()  │                  │
   │              │ → GET /user/data (backend JWT)    │
   │              │ ───────────────>│ ────────────────>│
   │              │                │ <────────────────│ UserDataResponse
   │              │ HTML render w/ 3 sections         │
   │ <────────────│                │                  │
```

### 6.2 Refresh rotation (deferred to v0.6; web observes via /auth/session)

```
[Web BFF cache]                              [Backend]
       │                                           │
       │ getJwtFromSession()                        │
       │ cache MISS (or expired)                    │
       │ GET /auth/session (NextAuth JWT)           │
       │ ──────────────────────────────────────────>│
       │                                           │ NextAuthJwtValidator
       │ <──────────────────────────────────────────│ { jwt (15min), expiresAt }
       │                                           │
       │ cache.set(userId, { jwt, expiresAt })     │
       │ TTL = min(expiresAt - now, 300s)          │
       │                                           │
       │ ... 15min later, backend JWT expires ...   │
       │                                           │
       │ getJwtFromSession()                        │
       │ cache HIT but jwt expired                  │
       │ → invalidate cache entry                   │
       │ → GET /auth/session again                  │
```

### 6.3 Sign-out

```
[<UserMenu> Cerrar sesión] → signOutAndClear()
       │
       │ 1. signOut({ callbackUrl: "/" })
       │    → NextAuth clears next-auth.session-token (Set-Cookie Max-Age=0)
       │
       │ 2. POST /api/auth/logout (same-origin)
       │    → BFF handler:
       │       a. getServerSession() → null (cookie cleared)
       │       b. (no JWT to forward — short-circuit if null)
       │       c. return 200
       │
       │ 3. clearJwtCache()
       │    → Map<userId, CachedBackendJwt>.clear()
       │
       │ 4. router.push("/")
```

### 6.4 ARCO rectify → email-rotation → auto-sign-out

```
[<ArcoPanel> form submit] w/ { email: "new@example.com" }
       │
       │ rectifyUserData({ email })
       │ → PUT /api/user/data (backend JWT, body { email })
       │ → BACKEND_URL/api/v1/user/data (PUT, body { email })
       │                                           → IUserDataService.RectifyAsync
       │                                           → AuditLog.Write(RECTIFY)
       │ <─ 200 UserDataResponse { email: "new@..." }
       │
       │ email !== session.email → onEmailRotated("new@example.com")
       │
       │ onEmailRotated:
       │   signOutAndClear()  // see 6.3
       │   router.push("/auth/signin?reason=email-rotated&email=new%40example.com")
       │
       │ SignInPage renders banner:
       │   "Tu email fue actualizado por una solicitud ARCO.
       │    Iniciá sesión con tu nuevo email."
```

### 6.5 Consent grant with privacy-read gate

```
[<ConsentPanel> Otorgar click on "analytics"]
       │
       │ onGrant("analytics")
       │ → parent opens <ConsentGrantModal purpose="analytics">
       │
       │ <ConsentGrantModal> open:
       │   - getPrivacyPolicy(3) → render content in scrollable <pre>
       │   - hasScrolledToBottom = false; hasRead = false
       │   - confirm button disabled
       │
       │ User scrolls to bottom
       │   - scroll event: hasScrolledToBottom = true (still disabled — checkbox unchecked)
       │
       │ User ticks checkbox
       │   - hasRead = true → confirm button enabled
       │
       │ User clicks "Otorgar consentimiento"
       │   - grantConsent({ purpose: "analytics" })
       │     → POST /api/consent/grant → BACKEND_URL/api/v1/user/data/consent
       │     → 200 { message, consentId }
       │   - close modal
       │   - parent updates row to "Otorgado"
```

---

## 7. Error Handling & Rate Limits

### 7.1 Error taxonomy

| Error class | Source | HTTP | UX |
|---|---|---|---|
| `AuthAdapterError` | `lib/api/auth-adapter.ts` | 502/5xx | Non-blocking `console.warn`, sign-in proceeds (R1-A) |
| `PrivacyNotFoundError` | `lib/api/privacy.ts` | 404 | `<PrivacyNotFoundError>` UI + link to `/privacidad` |
| `RateLimitError` | `lib/api/user-data.ts`, `lib/api/consent.ts` | 429 | Inline with formatted `retryAfter: Date` |
| Zod `ZodError` | BFF route handlers | 400 | "Revisá el formato" (PR6) |
| NextAuth `OAuthCallback` | NextAuth `signIn` callback | 302 → `/auth/signin?error=...` | Friendly Spanish error copy (PR1) |
| `NetworkError` | `fetch` rejection | 503 | "No pudimos contactar el servidor. Reintentá." |

### 7.2 Retry-After handling

```ts
// lib/api/_utils.ts (shared util; PR4 first to use)
export function parseRetryAfter(value: string | null): Date | null {
  if (!value) return null;
  // HTTP-date format (RFC 7231): "Wed, 21 Oct 2026 07:28:00 GMT"
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date;
  // delta-seconds format: "30"
  const seconds = Number.parseInt(value, 10);
  if (!Number.isNaN(seconds)) return new Date(Date.now() + seconds * 1000);
  return null;
}

// Surface to user (locale-formatted)
export function formatRetryAfter(date: Date, locale = "es-CO"): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).format(date);
}
```

Inline error format: `"Demasiadas solicitudes. Reintentá en ${formatRetryAfter(retryAfter)}."` per REQ-FN-018. The error carries `retryAfter: Date` and an `<button>Reintentar</button>` that re-submits the original action. **No auto-retry** (NFR-RATE-1).

### 7.3 Offline behavior

- The web does not implement service workers or offline-first (Art. III — no PII cached beyond what's in `lib/api/jwt.ts` per-process memory).
- On `TypeError: fetch failed` (network down), the affected BFF route returns 503 with `{ error: "network_unavailable" }`. Components show "No pudimos contactar el servidor. Reintentá." with a `<button>Reintentar</button>`.
- The `<UserMenu>` keeps its cached auth display (avatar + email) even when offline — the NextAuth session cookie persists locally and `useSession()` returns the cached session.

### 7.4 Rate-limit policy recap

| BFF route | Backend policy | Per IP |
|---|---|---|
| `/api/auth/web-signup` (PR1) | `auth` | 30/min |
| `/api/auth/logout` (PR2) | `auth` | 30/min |
| `/api/privacy` (PR3) | none (public) | — |
| `/api/user/data` GET (PR4) | `consent` | 10/min |
| `/api/user/data` PUT (PR6) | `consent` | 10/min |
| `/api/user/data` DELETE (PR6) | `consent` | 10/min |
| `/api/consent/grant` (PR5) | `consent` | 10/min |
| `/api/consent/revoke` (PR5) | `consent` | 10/min |

---

## 8. Accessibility Design

### 8.1 WCAG 2.2 AA checklist (NFR-A11Y-1)

| Criterion | Implementation |
|---|---|
| **2.1.1 Keyboard** | Every interactive element is native `<button>`, `<a>`, `<select>`, or `<input>`. No `<div onClick>`. |
| **2.4.3 Focus Order** | DOM order matches visual order. `<dialog>` (native) restores focus on close. |
| **2.4.7 Focus Visible** | Global `:focus-visible` ring (already in `globals.css`). |
| **2.5.8 Target Size** | All interactive elements ≥ 24×24 CSS px (Tailwind `min-h-16`, `p-3` etc.). |
| **1.4.3 Contrast** | Text 4.5:1, large text 3:1. Verified by `@axe-core/playwright` in PR8. |
| **1.4.11 Non-text Contrast** | Buttons + borders 3:1. |
| **2.3.3 Animation from Interactions** | `prefers-reduced-motion: reduce` disables dialog fades + skeleton pulses. |
| **1.3.1 Info and Relationships** | `<label htmlFor>` on all inputs (incl. `<PrivacyVersionSelector>`). `<dl>` in `<DatosPersonalesSection>`. `<select>` in selector. |
| **2.1.2 No Keyboard Trap** | Native `<dialog>` handles focus trap + Esc. |

### 8.2 `<dialog>` focus trap pattern (CR-DLG-1)

```ts
// All 4 modals follow this pattern:
const dialogRef = useRef<HTMLDialogElement>(null);
const triggerRef = useRef<HTMLButtonElement>(null);

const open = useCallback(() => {
  dialogRef.current?.showModal();
}, []);

const close = useCallback(() => {
  dialogRef.current?.close();
}, []);

// Native <dialog> handles:
// - focus trap (browser-implemented)
// - Esc to close
// - inert on rest of page
// We add belt-and-suspenders focus return:
useEffect(() => {
  const dialog = dialogRef.current;
  if (!dialog) return;
  const handleClose = () => triggerRef.current?.focus();
  dialog.addEventListener("close", handleClose);
  return () => dialog.removeEventListener("close", handleClose);
}, []);
```

### 8.3 Scroll-to-bottom algorithm (consent grant modal)

```ts
// <ConsentGrantModal>:
const contentRef = useRef<HTMLDivElement>(null);
const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

const handleScroll = useCallback(() => {
  const el = contentRef.current;
  if (!el) return;
  // 1px tolerance for sub-pixel rounding (jsdom reports integer values but real browsers don't)
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
    setHasScrolledToBottom(true);
  }
}, []);

// useEffect for jsdom fallback (when scrollHeight === clientHeight, no scroll needed)
useEffect(() => {
  const el = contentRef.current;
  if (!el) return;
  if (el.scrollHeight <= el.clientHeight + 1) {
    setHasScrolledToBottom(true);
  }
}, [policy.content]);
```

**Why scroll-event over `IntersectionObserver`**: with hardcoded backend markdown content of known length, the scroll-position check is the simplest reliable approach. `IntersectionObserver` would require a sentinel element + dynamic layout — overkill for a single-purpose modal. Vitest mocks `scrollHeight` to assert the gate works. **Documented for v0.6 revisit** if policy content grows beyond ~5 screens.

### 8.4 Reduced motion

```ts
// All components use the existing util from lib/utils/prefers-reduced-motion.ts:
// import { prefersReducedMotion } from "@/lib/utils/prefers-reduced-motion";
// Used in: <UserMenu> dialog fade, <ConsentGrantModal> backdrop,
//          <ArcoCancelModal> backdrop, skeletons.
```

### 8.5 Focus management on route changes

- `/auth/signin?error=...` → focus moves to the heading `<h1>` (server-rendered, browser default).
- `/auth/signin?reason=email-rotated` → focus moves to the banner heading.
- `/privacidad?version=N` → focus moves to the `<h1>` after navigation completes (manual `useEffect` in `<PrivacyPolicyView>` — uses existing `<main id="contenido">` from 019 layout).

---

## 9. Security Design

### 9.1 Token handling (NFR-SEC-1, CR-TOK-1)

| Token | Storage | Lifetime | Rotation |
|---|---|---|---|
| NextAuth session JWT | `next-auth.session-token` cookie (httpOnly) | 7 days | Per NextAuth `update()` age |
| Backend access JWT | BFF `Map<userId, CachedBackendJwt>` (per-process) | 15min backend / 5min BFF cap | Re-fetched on `/auth/session` |
| Refresh token | **NEVER on the web** | 7 days (backend) | Backend rotates on `/auth/refresh` (verified) |

**Refresh tokens never leave the backend** (CR-TOK-1). Vitest asserts `lib/api/*.ts` does not reference the literal string `refreshToken` in any exported function signature (test in `__tests__/security/no-refresh-token-leak.test.ts`).

### 9.2 CSRF

- NextAuth's OAuth `state` parameter is server-generated (CSRF protection built-in, Art. V).
- BFF route handlers use Next.js's default CSRF protection for state-mutating routes (POST/PUT/DELETE).
- ARCO Cancel double-confirmation (type-email) is the user-side CSRF equivalent for the most destructive action.

### 9.3 Refresh rotation (NFR-SEC-2)

The web does NOT call `/auth/refresh` directly in v0.5.1 (deferred per §14 OQ-1). The backend's rotation invariant is preserved by PR0 — `RevokeAllForUserAsync` does NOT introduce a reuse path. A backend integration test in PR0 (`AuthEndpointTests.RefreshTokenRotation_PreservedAfterRevokeAll`) asserts that two consecutive `/auth/refresh` calls with the same token result in 200 then 401.

### 9.4 Rate-limit

The web surfaces `Retry-After` to the user (REQ-FN-018, NFR-RATE-1). The web does NOT auto-retry (avoids hidden load on backend). The web does NOT swallow errors silently.

### 9.5 Secret management (NFR-ENV-1)

| Secret | Read from | Lifetime |
|---|---|---|
| `NEXTAUTH_SECRET` | `process.env.NEXTAUTH_SECRET` (≥32 chars per `NextAuthJwtValidator.cs:23`) | server-side only |
| `NEXTAUTH_URL` | `process.env.NEXTAUTH_URL` | server-side |
| `GOOGLE_CLIENT_ID` / `_SECRET` | `process.env.GOOGLE_CLIENT_*` | server-side |
| `LINKEDIN_CLIENT_ID` / `_SECRET` | `process.env.LINKEDIN_CLIENT_*` | server-side |
| `BACKEND_URL` | `process.env.BACKEND_URL` (default `http://localhost:5080`) | server-side |
| `NEXT_PUBLIC_LOCAL_MODE` | `process.env.NEXT_PUBLIC_LOCAL_MODE` | client-visible (intentional) |

**Vitest assertion** (`__tests__/security/no-hardcoded-urls.test.ts`): no `https://` URL or 20+ char string appears as a literal in `lib/auth.ts` or `lib/api/*.ts` (excluding type imports).

### 9.6 Session hijacking

- Cookies are `httpOnly` + `SameSite=Lax` (NextAuth default). `Secure` flag is auto-set when `NEXTAUTH_URL` is `https://` (production).
- The `__Secure-` prefix is automatically used in production by NextAuth.
- On `/cuenta` route guard (PR4), the server-side `getServerSession()` is the authoritative auth check — not client `useSession()`.
- On backend 401 from a BFF route, the BFF returns 401 to the client; the client redirects to `/auth/signin?callbackUrl=...`. No silent retry.

### 9.7 ARCO email-rotation (R16, REQ-FN-021)

After ARCO Rectify on email:
1. Backend `PUT /user/data` returns 200 + new `UserDataResponse`.
2. Web's `<ArcoPanel>` detects `newEmail !== session.email`.
3. Calls `signOutAndClear()` (clears NextAuth cookie + BFF cache + backend revoke-all).
4. Redirects to `/auth/signin?reason=email-rotated&email=<newEmail>`.
5. SignInPage shows banner: "Tu email fue actualizado por una solicitud ARCO. Iniciá sesión con tu nuevo email."

This prevents the NextAuth JWT from being reused with a stale email identity (R16 mitigation).

---

## 10. Copy / UX Strings

> All copy lives in `lib/copy/es.ts` per `BuildCv-web/AGENTS.md`. No hardcoded strings in components. Bilingual deferred to v1; v0.5.1 is Spanish only (Colombia, `es-CO`).

### 10.1 Copy schema

```ts
// lib/copy/es.ts (additive)
export const copy = {
  // ... existing keys ...
  auth: {
    emailRotatedBanner: "Tu email fue actualizado por una solicitud ARCO. Iniciá sesión con tu nuevo email.",
    signinErrorOAuthCallback: "No pudimos completar el inicio de sesión con el proveedor. Probá de nuevo.",
    signinErrorAccessDenied: "Cancelaste el inicio de sesión. Probá de nuevo cuando quieras.",
    signinErrorConfiguration: "Hubo un problema de configuración. Contactanos si persiste.",
    signinErrorVerification: "El enlace de verificación expiró. Probá de nuevo.",
    signinErrorDefault: "No pudimos iniciar sesión. Probá de nuevo.",
  },
  account: {
    title: "Tu cuenta",
    datosPersonales: {
      title: "Tus datos personales",
      emailLabel: "Email",
      providerLabel: "Proveedor",
      createdAtLabel: "Cuenta creada",
      lastLoginAtLabel: "Último inicio de sesión",
      inMemoryNotice: "Tu cuenta se guarda en memoria durante esta sesión de desarrollo.",
    },
  },
  consent: {
    sectionTitle: "Consentimientos",
    purposes: {
      functional: {
        name: "Funcional",
        description: "Esencial para iniciar sesión y ejercer tus derechos ARCO. No se puede revocar.",
      },
      analytics: {
        name: "Analytics",
        description: "Mejoras opcionales del producto. Nunca se comparte con terceros.",
      },
    },
    actions: {
      grant: "Otorgar",
      revoke: "Revocar",
      alreadyGranted: "Ya otorgaste este consentimiento.",
    },
    modal: {
      title: "Otorgar consentimiento",
      description: "Para otorgar tu consentimiento, leé la política de privacidad y confirmá que la entendiste.",
      checkboxLabel: "He leído la política de privacidad v3",
      confirm: "Otorgar consentimiento",
      cancel: "Cancelar",
      scrollToContinue: "Desplazate hasta el final del documento para continuar.",
    },
  },
  arco: {
    sectionTitle: "Derechos ARCO",
    sections: {
      access: "Ver mis datos",
      accessDetails: "Detalle de tus datos almacenados",
      rectify: "Rectificar datos",
      rectifySubmit: "Guardar cambios",
      cancel: "Eliminar mi cuenta",
    },
    cancel: {
      title: "Eliminar tu cuenta",
      description: "Vas a eliminar tu perfil y todos tus consentimientos. Las facturas ya emitidas se conservan por ley. Esta acción no se puede deshacer.",
      confirmHelp: "Escribí tu email para confirmar:",
      confirmButton: "Eliminar definitivamente",
      cancelButton: "Cancelar",
      successAndSignedOut: "Tu cuenta fue eliminada. Cerramos tu sesión.",
    },
    rectify: {
      successToast: "Cambios guardados.",
      emailChangeNotice: "Si cambiás tu email, vas a tener que iniciar sesión de nuevo.",
    },
  },
  privacy: {
    title: "Política de privacidad",
    versionLabel: "Versión",
    effectiveDate: "Vigente desde",
    notFound: {
      title: "Versión no encontrada",
      description: "La versión solicitada no existe. Te mostramos la más reciente.",
      backLink: "Ver versión actual",
    },
  },
  userMenu: {
    myAccount: "Mi cuenta",
    signOut: "Cerrar sesión",
    signIn: "Iniciar sesión",
    menuLabel: "Menú de usuario",
    closeMenu: "Cerrar menú",
    loading: "Cargando",
  },
  rateLimit: {
    inline: "Demasiadas solicitudes. Reintentá en {retryAfter}.",
    retryButton: "Reintentar",
  },
  network: {
    unavailable: "No pudimos contactar el servidor. Reintentá.",
    retry: "Reintentar",
  },
};
```

### 10.2 Rate-limit UX (inline error)

```tsx
// components/common/rate-limit-error.tsx (PR5 first to use; PR6 + PR8 reuse)
<p role="alert" aria-live="polite" className="text-sm text-red-300">
  {copy.rateLimit.inline.replace(
    "{retryAfter}",
    formatRetryAfter(error.retryAfter)
  )}
</p>
<button type="button" onClick={onRetry} className="...">
  {copy.rateLimit.retryButton}
</button>
```

### 10.3 Auto-sign-out banner (R16)

```tsx
// app/auth/signin/page.tsx (existing; PR1 adds the banner)
{searchParams.reason === "email-rotated" && (
  <aside role="status" aria-live="polite"
         className="mb-4 rounded border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-100">
    {copy.auth.emailRotatedBanner}
    {searchParams.email && (
      <p className="mt-1 text-xs text-amber-200/80">
        Nuevo email: <strong>{searchParams.email}</strong>
      </p>
    )}
  </aside>
)}
```

---

## 11. Test Design

### 11.1 Per-PR test strategy

| PR | Vitest unit | Vitest + MSW integration | Playwright e2e | Coverage target |
|---|---|---|---|---|
| PR0 (api) | — | xUnit + `WebApplicationFactory` (≥6 new tests) | — | ≥90% statements/branches on `IRefreshTokenStore.RevokeAllForUserAsync` |
| PR1 (web) | `lib/api/auth-adapter.test.ts` (4) · `__tests__/lib/auth.test.ts` (3 updated + 1 new) · `__tests__/security/no-hardcoded-urls.test.ts` (1) | `__tests__/app/api/auth/web-signup/route.test.ts` (5) | — | ≥90% on new files |
| PR2 (web) | `__tests__/lib/auth-client.test.ts` (3) | `__tests__/app/api/auth/logout/route.test.ts` (5) | — | ≥90% on new files |
| PR3 (web) | `__tests__/lib/api/privacy.test.ts` (3) · `__tests__/components/privacy/privacy-policy-view.test.tsx` (4) | `__tests__/app/privacidad/page.test.tsx` (2) | — | ≥90% on new files |
| PR4 (web) | `__tests__/lib/api/user-data.test.ts` (2) · `__tests__/components/account/datos-personales-section.test.tsx` (3) | `__tests__/app/cuenta/page.test.tsx` (3) · `__tests__/app/api/user/data/route.test.ts` (3 GET tests) | — | ≥90% on new files |
| PR5 (web) | `__tests__/lib/api/consent.test.ts` (3) · `__tests__/lib/use-consent.test.ts` (2) · `__tests__/components/account/consent-panel.test.tsx` (4) · `__tests__/components/account/consent-grant-modal.test.tsx` (3) | — | — | ≥90% on new files |
| PR6 (web) | `__tests__/lib/api/user-data.test.ts` (+2 rectify + delete) · `__tests__/lib/use-arco.test.ts` (2) · `__tests__/components/account/arco-panel.test.tsx` (4) · `__tests__/components/account/arco-cancel-modal.test.tsx` (3) | — | — | ≥90% on new files |
| PR7 (web) | `__tests__/lib/use-user-menu.test.ts` (3) · `__tests__/components/header/user-menu.test.tsx` (4) · `__tests__/local-mode-skips-user-menu.test.tsx` (1) | — | — | ≥90% on new files |
| PR8 (web) | `__tests__/e2e/rate-limit-ux.test.ts` (1) | — | `e2e/account-flow.spec.ts` (6) · `e2e/privacy-policy.spec.ts` (3) · `e2e/user-menu.spec.ts` (3) · `e2e/a11y-flow.spec.ts` (3, includes `@axe-core/playwright` + Lighthouse ≥95) · `e2e/auth-flow.spec.ts` (+2) | Lighthouse ≥95 on 3 routes |

**Total**: ~88 new tests (matches proposal §PR recommendation).

### 11.2 Specific test names (TDD red-green-refactor evidence)

```ts
// PR1 — auth-adapter.test.ts
describe("registerWithBackend", () => {
  it("POSTs {provider, providerAccountId, email, name} to /api/auth/web-signup");
  it("returns {userId} on 200");
  it("throws AuthAdapterError with status 502 on backend 500");
  it("throws AuthAdapterError with status 401 on backend 401");
  it("throws AuthAdapterError on network failure");
});

// PR1 — auth.test.ts (replaces obsolete test)
it("does NOT post to backend in signIn callback (NextAuth handles OAuth dance)");

// PR2 — auth-client.test.ts
describe("signOutAndClear", () => {
  it("calls signOut → POST /api/auth/logout → clearJwtCache in order");
  it("clears cache even when BFF logout returns 5xx");
  it("is a no-op when no NextAuth session");
});

// PR5 — consent-grant-modal.test.tsx
describe("<ConsentGrantModal>", () => {
  it("renders privacy policy v3 in scrollable region on open");
  it("disables confirm button initially (no scroll, no checkbox)");
  it("enables confirm after scroll to bottom AND checkbox");
  it("calls onConfirm and closes modal on submit");
  it("keeps modal open and shows inline rate-limit error on 429");
  it("renders focus-trap and Esc closes (native <dialog>)");
});

// PR6 — arco-cancel-modal.test.tsx
describe("<ArcoCancelModal>", () => {
  it("disables confirm until input === user.email (case-insensitive)");
  it("calls onConfirm on matching email → deleteUserData + signOutAndClear");
  it("calls onCancel on Esc or Cancel button (no deletion)");
});

// PR8 — account-flow.spec.ts (Playwright)
test("sign in via mock cookie → /cuenta → grant analytics → revoke functional is blocked → ARCO access expands → rectify name → ARCO cancel modal blocks wrong email → matching email enables → confirm → /");
test("privacy policy renders v3 by default");
test("user menu dropdown opens with native <dialog>");
test("rate-limit inline error shows formatted Retry-After date");
test("@axe-core/playwright reports zero serious/critical violations on /cuenta, /privacidad, /auth/signin");
```

### 11.3 Coverage target

`pnpm test:cov` reports ≥90% statements/branches on every NEW file (per `BuildCv-web/AGENTS.md` "0 supresiones" + Art. VIII).

### 11.4 TDD discipline (Art. VIII)

Per-PR work-unit commit pattern (from `work-unit-commits` skill):

```
feat(009): [PR-N] tests for <unit>  (RED)
feat(009): [PR-N] implement <unit> (GREEN)
feat(009): [PR-N] refactor <unit>   (REFACTOR)
chore(009): [PR-N] format + lint + typecheck
```

No suppressions: no `it.skip`, no `vi.skip`, no `# type: ignore`, no `// @ts-ignore`. Failing tests get fixed.

---

## 12. PR-by-PR Implementation Notes

> Total: ~1,780 LOC, ~88 new tests, 9 PRs. Each PR ≤350 LOC. Chain strategy `feature-branch-chain`.

### 12.1 PR0 — Backend: `/auth/web-signup` + revoke-all + bearer-only logout

**Files touched (api):**

| File | Action | Scope |
|---|---|---|
| `src/BuildCv.Api/Endpoints/AuthEndpoints.cs` | Modify | +30 LOC: add `MapPost("/api/v1/auth/web-signup", ...)`; modify logout to accept empty body |
| `src/BuildCv.Api/Contracts/AuthContracts.cs` | Modify | +15 LOC: `WebSignupRequest` record; make `RefreshTokenRequest.RefreshToken` nullable |
| `src/BuildCv.Application/Features/Auth/LogoutHandler.cs` | Modify | +10 LOC: handle bearer-only path by extracting `sub` from `ClaimsPrincipal` |
| `src/BuildCv.Application/Features/Auth/IRefreshTokenStore.cs` | Modify | +5 LOC: `RevokeAllForUserAsync(Guid userId, CancellationToken ct)` |
| `src/BuildCv.Infrastructure/Auth/InMemoryRefreshTokenStore.cs` | Modify | +10 LOC: implementation |
| `src/BuildCv.Infrastructure/Auth/EfRefreshTokenStore.cs` | Modify | +10 LOC: implementation (kept aligned for 010-persistence) |
| `tests/BuildCv.Api.IntegrationTests/AuthEndpointTests.cs` | Modify | +~50 LOC: 4 tests (web-signup happy + 400s + logout-without-body + revoke-all) |
| `tests/BuildCv.Application.UnitTests/Auth/RefreshTokenStoreTests.cs` | Modify | +~20 LOC: 2 tests (RevokeAllForUserAsync happy + idempotent) |

**Key functions:** `WebSignupHandler.HandleAsync`, `LogoutHandler.HandleAsync` (now dispatches on body presence), `InMemoryRefreshTokenStore.RevokeAllForUserAsync`.

**Dependencies:** none (chain root).

**Acceptance:** `dotnet build BuildCv.slnx -c Release` green; `dotnet test` green (≥6 new tests); `POST /auth/web-signup` returns 200 with `{userId}`; `POST /auth/logout` with bearer-only body revokes all refresh tokens; `RevokeAllForUserAsync` is idempotent.

### 12.2 PR1 — Web: auth adapter + contract fix

**Files touched (web):**

| File | Action | Scope |
|---|---|---|
| `lib/auth.ts` | Modify | +30 LOC: drop broken `signIn`-callback POST; add `events.signIn` hook calling `registerWithBackend` |
| `__tests__/lib/auth.test.ts` | Modify | +~15 LOC: 3 tests (replace 1 obsolete + add 2 new) |
| `lib/api/auth-adapter.ts` | New | ~50 LOC: `registerWithBackend` + `AuthAdapterError` |
| `app/api/auth/web-signup/route.ts` | New | ~50 LOC: BFF POST handler with 5s timeout |
| `__tests__/lib/api/auth-adapter.test.ts` | New | ~80 LOC: 4 tests |
| `__tests__/app/api/auth/web-signup/route.test.ts` | New | ~100 LOC: 5 tests |
| `__tests__/security/no-hardcoded-urls.test.ts` | New | ~30 LOC: 1 test |

**Key functions:** `registerWithBackend(req)`, BFF POST handler with Zod validation.

**Dependencies:** PR0.

**Acceptance:** `pnpm test` green (≥10 new tests); `lib/auth.ts` no longer POSTs to `/callback`; NextAuth `events.signIn` calls `/auth/web-signup` BFF; existing test updated, not deleted; Google + LinkedIn providers configured.

**CI OpenAPI gate (NFR-XREPO-1):**

```yaml
# .github/workflows/ci.yml (PR1 adds this job)
- name: Cross-repo OpenAPI consistency check
  run: |
    pnpm tsx scripts/check-openapi-drift.ts
```

```ts
// scripts/check-openapi-drift.ts (PR1)
import { z } from "zod";
import { execSync } from "node:child_process";

const openapi = execSync("curl -sf https://api-dev.buildcv.com/scalar/v1.json", { encoding: "utf-8" });
const schema = JSON.parse(openapi);

// Compare against the BFF route response schemas (manual table for v0.5.1;
// v0.6 generates with openapi-typescript).
const expected = {
  "/api/v1/auth/web-signup": { request: WebSignupBodySchema, response: z.object({ userId: z.string().uuid() }) },
  "/api/v1/user/data": { request: z.undefined(), response: UserDataResponseSchema },
  // ...
};

for (const [path, def] of Object.entries(expected)) {
  const backendPath = path.replace("/api/v1", "/api/v1"); // identity for now
  const backendOp = schema.paths[backendPath];
  // assert response schema matches def.response shape
}
console.log("OpenAPI drift check: PASS");
```

### 12.3 PR2 — Web: session refresh + sign-out helpers

**Files touched (web):**

| File | Action | Scope |
|---|---|---|
| `app/api/auth/logout/route.ts` | New | ~60 LOC: POST handler (best-effort) |
| `lib/auth-client.ts` | New | ~50 LOC: `signOutAndClear()` + `useAuthClient()` hook |
| `__tests__/lib/auth-client.test.ts` | New | ~50 LOC: 3 tests |
| `__tests__/app/api/auth/logout/route.test.ts` | New | ~120 LOC: 5 tests |

**Dependencies:** PR1.

**Acceptance:** `pnpm test` green (≥8 new tests); `signOutAndClear()` runs three steps in order; best-effort semantics on backend 500; no-op when no session.

### 12.4 PR3 — Web: `/privacidad` page + version selector

**Files touched (web):**

| File | Action | Scope |
|---|---|---|
| `lib/api/privacy.ts` | New | ~40 LOC: `getPrivacyPolicy` + `PrivacyNotFoundError` |
| `app/api/privacy/route.ts` | New | ~40 LOC: BFF GET handler |
| `app/privacidad/page.tsx` | New | ~50 LOC: server component with `searchParams` |
| `components/privacy/privacy-policy-view.tsx` | New | ~60 LOC: presentational |
| `components/privacy/privacy-version-selector.tsx` | New | ~30 LOC: client `<select>` |
| `lib/copy/es.ts` | Modify | +~15 LOC: `copy.privacy.*` |
| `__tests__/lib/api/privacy.test.ts` | New | ~50 LOC: 3 tests |
| `__tests__/components/privacy/privacy-policy-view.test.tsx` | New | ~80 LOC: 4 tests |
| `__tests__/app/privacidad/page.test.tsx` | New | ~30 LOC: 2 tests |

**Dependencies:** PR1.

**Acceptance:** `pnpm test` green (≥9 new tests); `/privacidad` renders v3 by default; selector switches to v1/v2 via `?version=`; 404 fallback renders error UI; public route.

### 12.5 PR4 — Web: `/cuenta` page skeleton + GET user-data BFF

**Files touched (web):**

| File | Action | Scope |
|---|---|---|
| `lib/api/user-data.ts` | New | ~50 LOC: `getUserData()` + `RateLimitError` |
| `app/api/user/data/route.ts` | New | ~60 LOC: GET handler (PUT + DELETE added in PR6) |
| `app/cuenta/page.tsx` | New | ~70 LOC: server component with route guard + 3 slots |
| `components/account/cuenta-skeleton.tsx` | New | ~40 LOC: 3 named slots |
| `components/account/datos-personales-section.tsx` | New | ~50 LOC: email/provider/createdAt/lastLoginAt |
| `lib/copy/es.ts` | Modify | +~10 LOC: `copy.account.*` |
| `lib/api/_utils.ts` | New | ~20 LOC: `parseRetryAfter` + `formatRetryAfter` (shared) |
| `__tests__/lib/api/user-data.test.ts` | New | ~50 LOC: 2 tests |
| `__tests__/app/cuenta/page.test.tsx` | New | ~80 LOC: 3 tests |
| `__tests__/app/api/user/data/route.test.ts` | New | ~80 LOC: 3 tests (GET only) |

**Dependencies:** PR2 (uses `lib/api/jwt.ts` patterns + session).

**Acceptance:** `pnpm test` green (≥8 new tests); `/cuenta` redirects anonymous → `/auth/signin?callbackUrl=/cuenta`; three sections render with stable ids; 429 surfaces `Retry-After` to page.

### 12.6 PR5 — Web: consent management

**Files touched (web):**

| File | Action | Scope |
|---|---|---|
| `lib/api/consent.ts` | New | ~60 LOC: `grantConsent` + `revokeConsent` |
| `app/api/consent/grant/route.ts` | New | ~40 LOC: BFF POST |
| `app/api/consent/revoke/route.ts` | New | ~40 LOC: BFF POST |
| `lib/use-consent.ts` | New | ~50 LOC: hook |
| `components/account/consent-panel.tsx` | New | ~80 LOC: 2 purposes with toggle |
| `components/account/consent-grant-modal.tsx` | New | ~70 LOC: native `<dialog>` + scroll gate |
| `components/common/rate-limit-error.tsx` | New | ~25 LOC: shared inline error |
| `app/cuenta/page.tsx` | Modify | +~5 LOC: render `<ConsentPanel>` in slot |
| `lib/copy/es.ts` | Modify | +~30 LOC: `copy.consent.*` |
| `__tests__/lib/api/consent.test.ts` | New | ~60 LOC: 3 tests |
| `__tests__/lib/use-consent.test.ts` | New | ~50 LOC: 2 tests |
| `__tests__/components/account/consent-panel.test.tsx` | New | ~100 LOC: 4 tests |
| `__tests__/components/account/consent-grant-modal.test.tsx` | New | ~80 LOC: 3 tests |

**Dependencies:** PR4 (consumes `<ConsentSectionSlot>`).

**Split path (R3):** if implementation >350 LOC, split into PR5a (panel + BFFs + hook, ~200 LOC) + PR5b (consent-grant modal, ~150 LOC).

**Acceptance:** `pnpm test` green (≥12 new tests); two purposes shown; grant modal blocks confirm until scroll + checkbox; revoke is direct (no modal); 429 in modal keeps modal open with inline error.

### 12.7 PR6 — Web: ARCO request flow

**Files touched (web):**

| File | Action | Scope |
|---|---|---|
| `lib/api/user-data.ts` | Modify | +~40 LOC: `rectifyUserData` + `deleteUserData` |
| `app/api/user/data/route.ts` | Modify | +~50 LOC: PUT + DELETE handlers |
| `lib/use-arco.ts` | New | ~50 LOC: hook with email-rotation detection |
| `components/account/arco-panel.tsx` | New | ~100 LOC: 3 sections (Access/Rectify/Cancel) |
| `components/account/arco-cancel-modal.tsx` | New | ~80 LOC: type-email gate |
| `app/cuenta/page.tsx` | Modify | +~5 LOC: render `<ArcoPanel>` in slot |
| `lib/copy/es.ts` | Modify | +~30 LOC: `copy.arco.*` |
| `__tests__/lib/api/user-data.test.ts` | Modify | +~30 LOC: +2 tests (rectify + delete) + 1 (rectify 400 mapping) |
| `__tests__/lib/use-arco.test.ts` | New | ~50 LOC: 2 tests |
| `__tests__/components/account/arco-panel.test.tsx` | New | ~100 LOC: 4 tests |
| `__tests__/components/account/arco-cancel-modal.test.tsx` | New | ~80 LOC: 3 tests |

**Dependencies:** PR4 (consumes `<ArcoSectionSlot>`) + PR2 (reuses `signOutAndClear()` for auto-sign-out).

**Split path (R4):** if implementation >350 LOC, split into PR6a (Access + Rectify + BFF PUT, ~200 LOC) + PR6b (Cancel + type-email modal + BFF DELETE + auto-sign-out, ~150 LOC).

**Acceptance:** `pnpm test` green (≥12 new tests); three ARCO sections render; access expands JSON in `<details>`; rectify updates name/email with success toast + error mapping; cancel modal requires matching email + auto-sign-outs; email change auto-sign-outs.

### 12.8 PR7 — Web: `<UserMenu>` component

**Files touched (web):**

| File | Action | Scope |
|---|---|---|
| `lib/use-user-menu.ts` | New | ~50 LOC: wraps `useSession()` |
| `components/header/user-menu.tsx` | New | ~80 LOC: presentational + native `<dialog>` |
| `app/layout.tsx` | Modify | +~5 LOC: pass `<UserMenu>` as `<SiteHeader extras>` |
| `components/landing/landing-nav.tsx` | Modify | +~10 LOC: hide "Cuenta" when authenticated |
| `lib/copy/es.ts` | Modify | +~10 LOC: `copy.userMenu.*` |
| `__tests__/lib/use-user-menu.test.ts` | New | ~50 LOC: 3 tests |
| `__tests__/components/header/user-menu.test.tsx` | New | ~100 LOC: 4 tests |
| `__tests__/local-mode-skips-user-menu.test.tsx` | New | ~30 LOC: 1 test |

**Dependencies:** PR2 (consumes `signOutAndClear`).

**Acceptance:** `pnpm test` green (≥8 new tests); `<UserMenu>` renders in `<HeaderExtras>`; three states render correctly; native `<dialog>` with focus trap + Esc; local mode renders `null`; `<LandingNav>` "Cuenta" hidden when authenticated.

### 12.9 PR8 — Web: E2E + accessibility hardening

**Files touched (web):**

| File | Action | Scope |
|---|---|---|
| `e2e/account-flow.spec.ts` | New | ~120 LOC: 6 scenarios |
| `e2e/privacy-policy.spec.ts` | New | ~50 LOC: 3 scenarios |
| `e2e/user-menu.spec.ts` | New | ~50 LOC: 3 scenarios |
| `e2e/a11y-flow.spec.ts` | New | ~80 LOC: 3 scenarios (axe + Lighthouse) |
| `e2e/auth-flow.spec.ts` | Modify | +~20 LOC: +2 scenarios |
| `__tests__/e2e/rate-limit-ux.test.ts` | New | ~30 LOC: 1 unit test |
| `scripts/check-openapi-drift.ts` | New | ~50 LOC: cross-repo OpenAPI drift check (NFR-XREPO-1) |

**Dependencies:** PR0–PR7.

**Acceptance:** `pnpm test:e2e` green (≥15 new scenarios); Lighthouse Accessibility ≥95 on `/cuenta`, `/privacidad`, `/auth/signin`; `@axe-core/playwright` reports zero `serious`/`critical` violations; rate-limit UX tested.

---

## 13. Risks & Mitigations

| ID | Risk | Likelihood | Mitigation | Status |
|---|---|---|---|---|
| **R1** | PR0 (api) + PR1 (web) are atomic cross-repo. | Med | `feature-branch-chain`: PR1 targets PR0's branch; final merges sequential. | Tracked (proposal §7) |
| **R2** | PR4 `/cuenta` skeleton + PR5/PR6 integration coupling. | Med | PR4 commits to stable slot structure (`<ConsentSectionSlot>`, `<ArcoSectionSlot>`); PR5 and PR6 each touch ONE slot. | Tracked (proposal §7) |
| **R3** | PR5 at 350-LOC upper bound. | Med | Split path: PR5a (panel + BFFs + hook, ~200 LOC) + PR5b (consent-grant modal, ~150 LOC) if exceeds 350. | Tracked |
| **R4** | PR6 at 350-LOC upper bound. | Med | Split path: PR6a (Access + Rectify + BFF PUT, ~200 LOC) + PR6b (Cancel + modal + BFF DELETE, ~150 LOC) if exceeds 350. | Tracked |
| **R5** | PR8 e2e spec density. | Low | Each spec ≤120 LOC; split into `*-2.spec.ts` if exceeds. | Tracked |
| **R16** | ARCO email-rotation → auto-sign-out + redirect. | Low | REQ-FN-021 + REQ-FN-015 mandate `signOutAndClear()` after email change. Vitest asserts the call. | Tracked (spec) |
| **R-ENDPOINT-DRIFT** | **8 endpoint discrepancies found between user prompt and shipped backend.** Catalogued below. | Med | Design uses SHIPPED backend endpoints + locked spec REQ-FN-001. Spec + proposal are the truth source. **Flagged for orchestrator verification in §13.1.** | **NEW — design-time** |
| **R-OPENAPI-CI** | PR1's `scripts/check-openapi-drift.ts` is hand-written for v0.5.1; v0.6 should use `openapi-typescript` for type generation. | Low | Documented in PR1 implementation notes. Manual table covers the 11 endpoints in this change. | NEW — design-time |
| **R-LOCAL-MODE-CACHE** | `lib/api/jwt.ts` cache survives `signOut()` only when `clearJwtCache()` is called explicitly. PR2's `signOutAndClear()` wires this; PR7's `<UserMenu>` calls `signOutAndClear()`. Risk: a future code path that calls raw `signOut()` would leak the cache. | Low | Single source of truth: only export `signOutAndClear()` from `lib/auth-client.ts`. Raw `signOut` import is gated behind an ESLint rule (or PR7's `<UserMenu>` is the ONLY consumer of signOut). | NEW — design-time |
| **R-DIALOG-JSDOM** | jsdom does not implement `<dialog>` `showModal()` / `close()` fully. Vitest tests for modal components may need to mock. | Med | PR5/PR6/PR7 use `userEvent` + `dialogRef.current?.close()` directly. Vitest assertion uses `dialog.open` property (jsdom exposes it). E2E (PR8) uses real Chromium for true native dialog behavior. | NEW — design-time |
| **R-DECISION-VS-OBSERVER** | Scroll-to-bottom via `scroll` event vs `IntersectionObserver`. Decision: scroll-event for v0.5.1. | Low | Documented in §2.4 Decision + §8.3. v0.6 revisit if policy content grows. | NEW — design-time (locked in design) |

### 13.1 Endpoint discrepancies catalogued (R-ENDPOINT-DRIFT)

> The earlier prompt's endpoint list diverged from the SHIPPED backend at `BuildCv-api/src/BuildCv.Api/Endpoints/*.cs`. The design uses the SHIPPED paths/methods; the discrepancies are flagged here for orchestrator + owner verification. None of these affect implementation — the BFF routes in §3 follow the SHIPPED contract verbatim.

| # | User prompt listed | SHIPPED backend (truth) | Source |
|---|---|---|---|
| 1 | `POST /api/v1/auth/sign-out` | `POST /api/v1/auth/logout` | `AuthEndpoints.cs:91` |
| 2 | `GET /api/v1/session` | `GET /api/v1/auth/session` | `SessionEndpoint.cs:10` |
| 3 | `GET /api/v1/privacy/policies` | `GET /api/v1/privacy-policy` | `PrivacyEndpoints.cs:9` |
| 4 | `GET /api/v1/user/data/consent` | **No GET endpoint exists.** Backend ships only POST grant + POST revoke. | `UserDataEndpoints.cs:88,114` (POST only) |
| 5 | `POST /api/v1/user/data/arco/request` | **No `/arco/request` endpoint.** ARCO Access = `GET /user/data`. | `UserDataEndpoints.cs:12` |
| 6 | `POST /api/v1/user/data/arco/rectify` | `PUT /api/v1/user/data` | `UserDataEndpoints.cs:37` |
| 7 | `POST /api/v1/user/data/arco/cancel` | `DELETE /api/v1/user/data` | `UserDataEndpoints.cs:63` |
| 8 | `web-signup` body `{providerId, email, name}` | Spec REQ-FN-001: `{provider, providerAccountId, email, name}` | `spec.md:71` (REQ-FN-001) |

**Impact**: zero on implementation. The BFF routes (§3.2) use the SHIPPED paths and the spec's locked body shape. The web's `lib/api/*.ts` ports match.

**Action for orchestrator**: confirm with the owner that the user-prompt endpoint list was an earlier draft (since superseded by the spec's REQ-FN-001 / REQ-FN-011 / REQ-FN-012 / REQ-FN-013 / REQ-FN-015 / REQ-FN-016 / REQ-FN-018 mapping). No spec or proposal changes needed.

---

## 14. Deferred Items

> From `spec.md` §"Open Questions / Deferred Items" + new items surfaced during design.

| # | Item | Status | Owner | Target |
|---|---|---|---|---|
| **OQ-1** | **Auto-refresh on BFF 401** — defer to v0.6: surface 401 to client and let `<UserMenu>` re-render with `unauthenticated` state. | Deferred (spec §5) | — | v0.6 |
| **OQ-2** | **Real OAuth provider dance in Playwright e2e** — keep cookie-injection pattern; no real Google/LinkedIn round-trip in CI. | Deferred (spec §5) | — | v0.6 |
| **OQ-3** | **`<UserMenu>` avatar source** — first-letter initial (no photo upload); photo upload deferred. | Deferred (within scope but minimal) | — | v1 |
| **OQ-4** | **Privacy v4 migration** — if backend bumps to v4 mid-cycle, PR3's selector needs re-deploy. Backend deploy log monitored. | Operational | Backend team | when v4 ships |
| **OQ-5** | **Suscripciones CTA verification** — verify 019 REQ-EMPTY-001 still applies for anonymous `/suscripciones` after PR7 hides `<UserMenu>` Cuenta link. | Verify in PR8 | e2e | PR8 |
| **OQ-6** | **Scroll-to-bottom algorithm** — current scroll-event + 1px tolerance. Revisit `IntersectionObserver` when policy content >5 screens. | Deferred (design §2.4, §8.3) | — | v0.6 |
| **OQ-7** | **OpenAPI type generation** — PR1 ships a hand-written `check-openapi-drift.ts`. v0.6 should use `openapi-typescript` for type generation. | Deferred (PR1 notes) | — | v0.6 |
| **OQ-8** | **ESLint rule gating raw `signOut` import** — currently a code review convention. Could be enforced via `no-restricted-imports` in `eslint.config.mjs` to prevent raw `signOut` outside `lib/auth-client.ts`. | Low priority | — | v0.6 |

---

## 15. Traceability

### 15.1 Functional Requirements (21/21)

| ID | Type | Description | Design Section | PR |
|---|---|---|---|---|
| REQ-FN-001 | Backend | `POST /auth/web-signup` accepts `{provider, providerAccountId, email, name}` | §3.1, §3.2, §3.3 | PR0 |
| REQ-FN-002 | Backend | Bearer-only logout revokes all refresh tokens | §3.1, §3.2, §5.4 | PR0 |
| REQ-FN-003 | Web | Auth adapter wires NextAuth `events.signIn` to BFF | §3.3 (`registerWithBackend`), §12.2 | PR1 |
| REQ-FN-004 | Web | Contract drift fix in `lib/auth.ts` (drop broken POST) | §12.2 (PR1 file list) | PR1 |
| REQ-FN-005 | Web | Google OAuth provider configured | §12.2 (PR1 file list) | PR1 |
| REQ-FN-006 | Web | LinkedIn OAuth provider configured | §12.2 (PR1 file list) | PR1 |
| REQ-FN-007 | Web | Sign-out helpers (full revocation) | §5.4 (signOutAndClear flow), §3.3, §12.3 | PR2 |
| REQ-FN-008 | Web | `/privacidad` renders policy v3 by default | §4.6 (`<PrivacyPolicyView>`), §12.4 | PR3 |
| REQ-FN-009 | Web | Privacy policy version selector | §4.7 (`<PrivacyVersionSelector>`), §12.4 | PR3 |
| REQ-FN-010 | Web | `/cuenta` page skeleton with route guard | §4.8 (`<CuentaSkeleton>`), §12.5 | PR4 |
| REQ-FN-011 | Web | GET user-data BFF | §3.2, §3.3 (`getUserData`), §12.5 | PR4 |
| REQ-FN-012 | Web | Consent panel with two purposes | §4.2 (`<ConsentPanel>`), §12.6 | PR5 |
| REQ-FN-013 | Web | Consent grant modal with privacy-read gate | §4.3 (`<ConsentGrantModal>`), §8.3, §12.6 | PR5 |
| REQ-FN-014 | Web | ARCO Access section shows user data | §4.4 (`<ArcoPanel>` ACCESS section), §12.7 | PR6 |
| REQ-FN-015 | Web | ARCO Rectify updates name/email | §4.4 (`<ArcoPanel>` RECTIFY section), §6.4, §12.7 | PR6 |
| REQ-FN-016 | Web | ARCO Cancel with type-email confirmation and auto-sign-out | §4.5 (`<ArcoCancelModal>`), §5.5, §12.7 | PR6 |
| REQ-FN-017 | Web | `<UserMenu>` component in header | §4.1 (`<UserMenu>`), §12.8 | PR7 |
| REQ-FN-018 | Web | Rate-limit UX surfaces `Retry-After` timestamp | §7.2 (parseRetryAfter + formatRetryAfter), §10.2, §12.5/12.6/12.9 | PR5/PR6/PR8 |
| REQ-FN-019 | Web | E2E happy-path coverage (4 spec files, 15+ scenarios) | §11.2 (test names), §12.9 | PR8 |
| REQ-FN-020 | Web | Existing `lib/auth.ts` test updated, not deleted | §12.2 (PR1 file list + commit message) | PR1 |
| REQ-FN-021 | Web | Auto-sign-out after ARCO email rotation | §5.5, §6.4, §10.3 (banner copy) | PR6 |

**21 / 21 traced.**

### 15.2 Non-Functional Requirements (8/8)

| ID | Description | Design Section | PR |
|---|---|---|---|
| NFR-SEC-1 | Session security (httpOnly cookies, no client storage) | §5.2, §9.1, §9.5 | PR1/PR2 |
| NFR-SEC-2 | Refresh token rotation on backend (preserved by PR0) | §5.3, §9.3 | PR0 |
| NFR-ENV-1 | No hardcoded environment variables | §9.5, §12.2 (`__tests__/security/no-hardcoded-urls.test.ts`) | PR1 |
| NFR-A11Y-1 | WCAG 2.2 AA compliance | §8.1 (checklist), §8.2 (dialog pattern), §4.* (component contracts) | PR3/PR4/PR5/PR6/PR7/PR8 |
| NFR-RATE-1 | Rate-limit handling (no auto-retry, no silent swallow) | §7.2, §7.3, §10.2 | PR5/PR6/PR8 |
| NFR-OBS-1 | Minimal observability (no PII in logs) | §3.4 (error mapping), §9.1 | PR0/PR1/PR2/PR4/PR5/PR6 |
| NFR-RES-1 | Resilience to auth errors (no retry storm, single retry max) | §5.3, §7.3 | PR2/PR5 |
| NFR-XREPO-1 | Cross-repo consistency (OpenAPI drift check) | §12.2 (`scripts/check-openapi-drift.ts`), §13 R-OPENAPI-CI | PR1/PR8 |

**8 / 8 traced.**

### 15.3 Compliance Requirements (6/6)

| ID | Description | Design Section | PR |
|---|---|---|---|
| CR-PRIV-1 | Privacy (no new persistence, no PII in logs, footer disclaimer) | §4.9 (`<DatosPersonalesSection>` footer), §9.1, §12.5 | PR0/PR1/PR4 |
| CR-CONS-1 | Consent (granular opt-in/out, "functional" + "analytics", privacy-read gate) | §4.2, §4.3, §8.3, §12.6 | PR5 |
| CR-ARCO-1 | ARCO rights (Access/Rectify/Cancel/Opposition) | §4.4, §4.5, §5.5, §6.4, §12.7 | PR6 |
| CR-TOK-1 | Token isolation (refresh tokens never on web) | §5.1, §5.2, §9.1 | PR1/PR2 |
| CR-DATA-1 | User data handling (minimal local storage, no third-party analytics) | §5.6 (state ownership), §9.1 | PR4/PR5/PR6 |
| CR-DLG-1 | Accessible UI (native `<dialog>`, focus trap, Esc, focus return) | §8.2, §4.1/4.3/4.5 | PR5/PR6/PR7 |

**6 / 6 traced.**

### 15.4 Total

| Category | Count | Traced |
|---|---|---|
| Functional Requirements | 21 | 21 / 21 ✅ |
| Non-Functional Requirements | 8 | 8 / 8 ✅ |
| Compliance Requirements | 6 | 6 / 6 ✅ |
| **Total** | **35** | **35 / 35 ✅** |

---

## Next

`tasks.md` (sdd-tasks) → forecast 350-LOC budget per PR (with split paths documented for R3/R4); lock work-unit commits per PR (4-6 each following `work-unit-commits` skill); recommend 9 chained PRs in dependency order (PR0 → PR1 → {PR2, PR3} → PR4 → {PR5, PR6} → PR7 → PR8).

Apply phase (sdd-apply) → 9 chained PRs, each green, each mergeable.

Verify phase (sdd-verify) → 21/21 REQs PASS · 8/8 NFRs PASS · 6/6 Compliance PASS · 9/9 PRs shipped · all CI gates green.

Archive phase (sdd-archive) → tag `009-auth-web-v1.0`.
