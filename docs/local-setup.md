# Local Setup — BuildCv Web

Run the entire system locally for personal use. No production OAuth, no real
Wompi keys, no production database.

## Prerequisites

- **Node.js 22+**
- **pnpm 11**
- The BuildCv backend running on `http://localhost:5080` (see
  `../../BuildCv-api/docs/local-setup.md`)

## Quick Start

```bash
cd BuildCv-web
pnpm install
cp .env.example .env.local
# .env.local already has NEXT_PUBLIC_LOCAL_MODE=true and NEXTAUTH_SECRET set
pnpm dev
```

The frontend opens at `http://localhost:3000` and auto-authenticates you as
`local@buildcv.dev`.

## Local mode env vars

The example `.env.local` (from `.env.example`) ships with:

```
NEXT_PUBLIC_LOCAL_MODE=true
NEXTAUTH_SECRET=local-dev-secret-min-32-chars-for-testing-only
NEXTAUTH_ISSUER=buildcv-web
NEXTAUTH_AUDIENCE=buildcv-api
BACKEND_URL=http://localhost:5080
```

`NEXT_PUBLIC_LOCAL_MODE=true` makes the BFF:

1. Skip NextAuth OAuth entirely.
2. Sign a local-mode HS256 JWT in `lib/api/jwt.ts` using `NEXTAUTH_SECRET`.
3. Exchange it with the backend `/api/v1/auth/session` for a backend JWT.
4. Use the backend JWT for all subsequent same-origin BFF calls.

The signing secret MUST match the backend's `NextAuth:SigningKey` config
(loaded from `appsettings.Development.json`).

## Switching to production mode

In `.env.local`:

```
NEXT_PUBLIC_LOCAL_MODE=false
NEXTAUTH_SECRET=<real-shared-secret-min-32-chars>
GOOGLE_CLIENT_ID=<real>
GOOGLE_CLIENT_SECRET=<real>
LINKEDIN_CLIENT_ID=<real>
LINKEDIN_CLIENT_SECRET=<real>
```

The backend must have `LocalAuth:Enabled=false` for production builds.

## What works locally

- All scoring (002-score-engine)
- All adaptation (003-adapt-ia)
- CV import (005)
- CV iteration loop (018-cv-iteration-loop) — `/analizar/iterate` runs N iterations and shows the best
- Credit consumption (013)
- Subscriptions (016) — Wompi mock, no real charges
- Admin endpoints (015-feature-flags) — flip flags at runtime

## What's stubbed in local mode

- Wompi real charges (backend uses mock keys)
- Anthropic API (backend uses `StubAiClient`)
- OAuth providers (NextAuth bypassed)
- Database (backend uses `InMemory`)

## File map

| File | Purpose |
|------|---------|
| `lib/auth.ts` | Exports `IS_LOCAL`, local user constants, `NEXT_AUTH_ISSUER/AUDIENCE` |
| `lib/api/jwt.ts` | Signs local-mode HS256 JWT and exchanges it for backend JWT |
| `app/auth/signin/page.tsx` | Auto-redirects to `/analizar/iterate` when `IS_LOCAL=true` |
| `.env.example` | Documents `NEXT_PUBLIC_LOCAL_MODE`, `NEXTAUTH_SECRET`, etc. |
