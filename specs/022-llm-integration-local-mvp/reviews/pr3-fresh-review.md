# Fresh Review — 022 PR3 Web BFF + adapter

Date: 2026-06-28
Branch: `feature/022-llm-local-pr3-web-bff`

## Verdict

**APPROVE** — PR3 implements the Web BFF and typed adapter within scope. Gates are green, production LOC is below the 400-line cap, and no UI/backend/provider scope creep was introduced.

## Adversarial checklist

- BLOCKER 0 ✓
- MAJOR 0 ✓
- BFF route correcta ✓ — `POST /api/llm/feedback` proxies server-side to backend `POST /api/v1/llm/feedback` using `BACKEND_URL`.
- Adapter correcto ✓ — `LlmFeedbackResponse` v2 has 10 fields and `LlmFeedbackState` is a discriminated union covering `idle|loading|success|degraded|disabled|unavailable|rate_limited|timeout|error`.
- Error normalization correcta ✓ — 403 `disabled`, 429 `rate_limited` + `Retry-After`, 504 `timeout`, 502/503 `unavailable`, 400 `validationError`, 500 `serverError` surfaced as unavailable.
- No provider real ✓ — code only calls same-origin BFF or backend endpoint; no Anthropic/OpenAI/Minimax/Ollama config or calls.
- No secrets client-side ✓ — `BFF_API_KEY` is read only in the server route and never returned.
- No `NEXT_PUBLIC_LLM_*` ✓ — focused PR3 code grep has 0 hits.
- No raw CV/job/prompt logs ✓ — PR3 adds no logging of request bodies or prompts.
- No UI scope creep ✓ — no components/pages/analyzer UI modified.
- No backend touched ✓ — only web repository files changed.
- 009 auth-web no tocado ✓ — no `/api/auth/*` source modified.
- 021 structured input no roto ✓ — full `pnpm test`, `pnpm build`, and `pnpm typecheck` pass.
- endpoint drift limpio ✓ — `node scripts/check-endpoint-drift.mjs` passes with LLM paths included.

## Evidence

- `pnpm lint` → 0
- `pnpm test` → 0 (1151 passing)
- `pnpm build` → 0
- `pnpm typecheck` → 0
- `pnpm exec vitest run lib/api/llm app/api/llm` → 0 (17 passing)
- `node scripts/check-endpoint-drift.mjs` → 0
- Focused defensive grep over PR3 code paths for `NEXT_PUBLIC_LLM`, `LLM_API_KEY`, provider real names, suppressions, `providerId`, `aiFeedback`, `/api/v1/adapt`, `/api/v1/score` → 0 hits.

## Minor notes

- Test count is 17 rather than forecast ~12 because secret/header stripping and Retry-After propagation are tested explicitly.
- Broad repository greps still include historical endpoint-drift forbidden-list strings in `scripts/check-endpoint-drift.mjs`; those are guard patterns, not new endpoint usages.
