# Exploration: 022 — LLM Integration Local MVP

> **Change:** `022-llm-integration-local-mvp`  
> **Scope:** cross-repo exploration, artifact stored in `BuildCv-web/specs/022-llm-integration-local-mvp/` and referencing `BuildCv-api` as backend counterpart.  
> **Date:** 2026-06-27  
> **Constitution:** BuildCv-api `.specify/memory/constitution.md` v1.2.0. Art. II is binding: LLM may explain or suggest, but MUST NOT calculate the score.

## 1. Current State

- BuildCv currently has a deterministic scoring flow and a separate AI adaptation flow. `POST /api/v1/score` is anonymous, rate-limited by `score`, and calls `ScoreCvHandler` → `ScoringEngine` / `ScoringEngine.ScoreV2`; the scoring number remains pure C# and is sealed at `ScoringEngine.Version = "2.0.0"` after 021.
- `POST /api/v1/adapt` already uses the `IAiClient` port through `AdaptCvHandler`, but the endpoint is authenticated, credit-gated, and rate-limited by `ai` (5/hour). It is an adaptation flow, not a local-first LLM feedback flow for analysis.
- Existing AI providers are selected by `Ai:Provider`: `Stub`, `Anthropic`, or `Minimax`. Default `appsettings.json` uses `Stub`, but `appsettings.Development.json` currently selects `Anthropic` with an empty `ApiKey`, which makes local dev fragile unless overridden.
- There is no `LLM_ENABLED` master flag and no `LLM_*` env namespace. AI config currently lives under `Ai:{Provider,ApiKey,BaseUrl,Model,MaxTokens}`.

## 2. API flow actual

```text
Browser
  → BuildCv-web BFF app/api/score/route.ts
  → BuildCv-api POST /api/v1/score
  → ScoreCvHandler
     ├─ engineVersion 1.0.0: JobAnalyzer + CvAnalyzer + IScoringEngine.Score(text)
     └─ engineVersion 2.0.0: JobSpecAdapter + ScoringEngine.ScoreV2(CvDocument, JobInput)
  → ScoreResponse / ScoreCvResponseV2

Browser
  → BuildCv-web BFF app/api/adapt/route.ts
  → BuildCv-api POST /api/v1/adapt
  → AdaptEndpoints: RequireAuthorization + RequireCredits(1) + ai rate-limit
  → AdaptCvHandler
     ├─ PromptBuilder.Build(cvText, jobText, seed)
     ├─ IAiClient.CompleteStructuredAsync<AdaptationResponse>()
     ├─ EntityExtractor + CrossEntityValidator + SeverityPolicy
     └─ AdaptResponseMapper
```

Current endpoints touching scoring/AI:

- `BuildCv-api/src/BuildCv.Api/Endpoints/ScoringEndpoints.cs` — `POST /api/v1/score`, deterministic, no auth, `RateLimiting.ScorePolicy`.
- `BuildCv-api/src/BuildCv.Api/Endpoints/AdaptEndpoints.cs` — `POST /api/v1/adapt`, AI, auth + credit + `RateLimiting.AiPolicy`.
- `BuildCv-api/src/BuildCv.Api/Endpoints/IterationEndpoints.cs` — best-of-N adaptation loop, uses `AdaptCvHandler` and then scores adapted CVs with legacy text path.
- `BuildCv-api/src/BuildCv.Api/Endpoints/ImportEndpoints.cs` — `POST /api/v1/import`, structured CV parsing, not LLM.

Handlers/commands/queries:

- `AdaptCvCommand`, `AdaptCvHandler`, `AdaptationResponse`, `PromptBuilder`, `IAiClient`.
- `ScoreCvCommand` discriminated union (`TextScoreCommand` / `StructuredScoreCommand`), `ScoreCvValidator`, `ScoreCvHandler`, `ScoreOutcome`.
- `IterateAdaptationHandler` calls `AdaptCvHandler` repeatedly and persists iteration request/result through `IIterationStore`.

## 3. Web flow actual

Affected screens:

- `app/analizar/page.tsx` — main analyzer page with `CreditArea`, deterministic tagline, and `<AnalizarScreen />`.
- `components/analyzer/analizar-screen.tsx` — reads localStorage preseed and renders `<Analyzer />` or `<EmptyState />`.
- `components/analyzer/analyzer.tsx` — calls `requestScoreV2()` and renders legacy result panels or `<SectionBreakdown />` for v2.
- `app/importar/page.tsx` — import entry point; `ImportButton` currently renders with `editorAvailable={false}`.
- `app/analizar/editar/page.tsx` and `components/editor/` — structured editor exists from 021, relevant for feeding real `CvDocument` later.
- `app/suscripciones/page.tsx` — subscription UI exists, but 022 MUST NOT add payments/credits UX.
- `app/cuenta/page.tsx` — account/ARCO from 009; should remain untouched.

BFF routes:

- `app/api/score/route.ts` — pass-through JSON to `${BACKEND_URL}/api/v1/score`.
- `app/api/adapt/route.ts` — pass-through JSON to `${BACKEND_URL}/api/v1/adapt`; currently does not forward auth/credit headers itself.
- `app/api/import/route.ts` — multipart proxy to `/api/v1/import`, forwards `X-Engine-Version`.
- `app/api/export/route.ts`, `app/api/health/route.ts`, `app/api/auth/*/route.ts` — existing flows, not LLM feedback.

UX without LLM:

- Deterministic score is visible via score gauge, honesty note, per-section bars/red flags for v2, and legacy keyword/fix lists for v1.
- There is no dedicated “LLM feedback unavailable” state in the analyzer.
- `requestAdapt()` has unavailable/rate-limit copy for adaptation, but not for analysis feedback.
- No provider is visible in the UI except `AdaptationResult.aiModel` in the contract; analyzer does not expose provider status.

## 4. Existing LLM-related code

Inventory:

- `BuildCv-api/src/BuildCv.Application/Features/Adapt/IAiClient.cs` — AI port with `CompleteStructuredAsync<T>()` and `CompleteAsync()`.
- `BuildCv-api/src/BuildCv.Infrastructure/Ai/StubAiClient.cs` — deterministic offline stub; no external IO; supports `AdaptationResponse` only.
- `BuildCv-api/src/BuildCv.Infrastructure/Ai/AnthropicAiClient.cs` — Anthropic SDK adapter using forced tool use for structured output; logs type only.
- `BuildCv-api/src/BuildCv.Infrastructure/Ai/MinimaxAiClient.cs` — OpenAI-compatible-ish JSON mode adapter via `/v1/chat/completions`; uses `BaseUrl`, `ApiKey`, `Model`, `MaxTokens`.
- `BuildCv-api/src/BuildCv.Application/Features/Adapt/PromptBuilder.cs` — inline prompt template with nonce-delimited `<DATA>` blocks and explicit “data, not instructions” rules.
- `BuildCv-api/src/BuildCv.Infrastructure/DependencyInjection.cs` — `RegisterAiClient()` selects `Stub`, `Anthropic`, or `Minimax` from `Ai:Provider`.
- `BuildCv-api/src/BuildCv.Api/appsettings.json` — `Ai.Provider=Stub`, empty `ApiKey`, model `claude-sonnet-4-20250514`, `MaxTokens=4096`.
- `BuildCv-api/src/BuildCv.Api/appsettings.Development.json` — `Ai.Provider=Anthropic`, empty `ApiKey`.
- `BuildCv-api/render.yaml` — comments mention setting `Ai__ApiKey` in Render for M1, no full `Ai__Provider`/`Ai__Model` matrix.
- `BuildCv-api/src/BuildCv.Api/HealthChecks/AiClientHealthCheck.cs` is referenced by specs, but no concrete file was found in the current `src` tree during this exploration.
- Tests: `AdaptCvHandlerTests`, `AdaptCvHandlerStructuredOutputTests`, `StubAiClientStructuredOutputTests`, `PromptBuilderTests`, `JsonSchemaExporterHelperTests`, iteration handler tests with fake `IAiClient`.

No external prompt template files (`.md`/`.txt`/`.json`) were found for AI prompts; prompts are inline C# constants today.

## 5. Gaps

Priority gaps for a usable local LLM MVP:

1. No `LLM_ENABLED=false` master kill switch; current provider selection can instantiate real providers from config.
2. No `LLM_*` env namespace; existing config is `Ai:*`, with different naming than the requested operational contract.
3. Local dev is not fully offline-safe because `appsettings.Development.json` selects `Anthropic` with no key unless overridden.
4. No analyzer-specific LLM feedback endpoint/contract; existing AI endpoint is `/adapt`, auth + credits + adaptation-specific.
5. No UI slot for LLM feedback separate from deterministic score/per-section breakdown/fix list.
6. No PII redaction/minimization layer before sending CV/job to real providers; `PromptBuilder` sends the full CV and full job text.
7. No provider latency, token/cost estimate, or provider failure metrics for AI calls beyond sanitized success/failure logs.
8. No timeout/retry policy on `IAiClient` adapters except cancellation tokens passed from callers; iteration has per-iteration timeout, adapt endpoint direct path does not define provider-specific timeout.
9. No Ollama/local-real provider and no generic OpenAI-compatible adapter named as such; `MinimaxAiClient` is close but provider-specific.
10. No fake deterministic provider tailored for feedback contracts; `StubAiClient` only materializes `AdaptationResponse`.
11. Potential privacy gap outside 022: `IterationRequest` and `IterationResult` can persist `CvText`, `VacancyText`, and adapted CV text in EF-backed stores, conflicting with the current Constitution statement that CV/job content is never persisted server-side.

## 6. Security/privacy risks

- **PII leakage to provider — High.** Current adaptation prompt sends full CV/job to the configured provider. CVs can include email, phone, address, IDs, employers, education, and sensitive employment history. Constitution Art. III requires minimization and no misleading privacy claims.
- **Prompt injection — High.** `PromptBuilder` has nonce-delimited `<DATA>` blocks and strips attempts to close the block, but any new LLM feedback prompt must repeat the same “input is data” rule and must avoid tool execution/function calling exposed to user input. Constitution Art. V applies.
- **Secret leakage — High.** `Ai:ApiKey` is server-side today, but any new web config must not use `NEXT_PUBLIC_LLM_API_KEY`. Logs and error responses must not include API keys, Authorization headers, prompt bodies, or provider raw errors.
- **Cost attacks — Medium/High.** Existing `ai` limit is 5/hour and `/adapt` consumes credits, but a new LLM feedback endpoint could become a cheaper unauthenticated cost sink unless it reuses or tightens rate limits and request size caps.
- **Provider outage/compromise — Medium.** LLM failure must never block deterministic score. UI should degrade to deterministic analysis with “AI feedback no disponible”.
- **Constitution compliance — High.** Art. II forbids LLM in score/keyword/invention counts; Art. III forbids content logs and requires minimization; Art. V requires input-as-data; Art. IX blocks public ZDR/no-retention claims until contractually verified.

## 7. Local-first requirements

- Default must be offline-safe: `LLM_ENABLED=false` and deterministic score/import/editor continue working without network/API keys.
- A fake deterministic provider must support tests and local demos without internet, with stable outputs and no randomness.
- CI must never call Anthropic/OpenAI/Ollama/Minimax. Tests use fake/stub providers and contract fixtures.
- Optional local-real provider should be Ollama behind explicit configuration (`LLM_ENABLED=true`, `LLM_PROVIDER=ollama`, `LLM_BASE_URL=http://localhost:11434`, `LLM_MODEL=...`).
- Real external provider use requires explicit owner config and server-side `LLM_API_KEY`; browser must never receive it.
- Dev docs should explain that enabling a real provider may send CV/job content externally and must not be the default.

## 8. Provider options

| Provider | Pros | Cons | Complexity | Local-first? |
|---|---|---|---|---|
| Fake deterministic | Sin internet, sin API key, determinista, ideal para CI/dev offline | No genera feedback real, solo valida UX/contract | Baja | ✓ |
| Ollama | LLM local real, sin API key, control total, no external data transfer by default | Requiere Ollama instalado, model download, CPU/GPU cost, variable model quality | Media | ✓ |
| OpenAI-compatible | Flexible, can target OpenAI, Groq, local gateways, or compatible services with one adapter | Requires external API key/cost unless pointed to local gateway; privacy/ZDR varies by provider | Media | ✗ by default |
| Anthropic directo | Existing code already has Anthropic adapter; high-quality model | Requires API key, cost, not offline; ZDR not guaranteed for standard account per Constitution Art. IX note | Media | ✗ |
| Minimax existing adapter | Already implemented as `MinimaxAiClient`, JSON mode shape resembles OpenAI-compatible | Provider-specific naming/config; not a generic OpenAI-compatible contract; external cost/privacy | Media | ✗ |

Recommendation: **fake deterministic for dev/tests, Ollama as optional local-real provider, OpenAI-compatible for production with API key configured by owner**. Anthropic can remain supported through the existing adapter, but should not be the first local MVP default.

## 9. Recommended architecture

- LLM complements the deterministic score; it never writes `overallScore`, `perSection`, `keywordAnalysis`, red-flag counts, invention counts, or engine version. This preserves Constitution Art. II.
- API layering:
  - Domain: unchanged and pure. `ScoringEngine` remains IO-free.
  - Application: introduce a feedback-oriented abstraction/contract that uses `IAiClient` or a narrower `ILlmFeedbackClient` if needed; add PII redaction/minimization and prompt-building in Application.
  - Infrastructure: add adapters for `FakeDeterministic`, `Ollama`, and generic OpenAI-compatible; reuse/keep `AnthropicAiClient` where appropriate.
  - Api: expose a new feedback endpoint or extend a non-scoring flow with clear fallback; keep `/score` deterministic.
- Web:
  - Add BFF route such as `app/api/llm/feedback/route.ts` that proxies server-to-server only.
  - Add `lib/api/llm.ts` adapter with typed errors and no real-provider calls in tests.
  - Add UI component, e.g. `components/analyzer/ai-feedback.tsx`, placed after deterministic score/per-section breakdown or beside `FixList`.
- Feature flag cascade:
  - `LLM_ENABLED=false` (master, default off).
  - `LLM_PROVIDER=fake|ollama|openai-compatible|anthropic|minimax`.
  - `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, `LLM_TIMEOUT_MS`, `LLM_MAX_TOKENS`, `LLM_TEMPERATURE`.
- Fallback chain: deterministic score always returns; LLM feedback is best-effort. Timeout/error/rate-limit returns a typed “unavailable” response that the UI renders without hiding score.
- Observability: log only provider name, model, input/output lengths, latency, traceId, status/error code, and token estimates if provided. Never log CV/job/prompt content or secrets.

## 10. Suggested PR breakdown

- **PR1 (api):** fake deterministic feedback provider + `LLM_*` options + `LLM_ENABLED=false` default + config tests. Keep old `Ai:*` compatibility only if needed and document migration.
- **PR2 (api):** LLM feedback endpoint/handler with fallback, PII redaction/minimization, prompt builder using data blocks, latency/failure logging, timeout, request size caps, and fake-provider tests.
- **PR3 (web):** BFF `/api/llm/feedback` + `lib/api/llm.ts` adapter + typed error mapping; tests with `vi.mock`/fake responses.
- **PR4 (web):** UI integration on analyzer (`ai-feedback` component, loading/unavailable states, copy in `lib/copy/es.ts`), no score changes.
- **PR5 (api+web):** optional Ollama provider + local docs + integration tests against a stub HTTP server, not a real Ollama daemon in CI.
- **PR6 (web):** a11y pass for feedback panel and e2e smoke with fake provider only.
- **PR7 (verify):** cross-repo sdd-verify evidence: score determinism unchanged, 009-auth-web unaffected, 021 structured import unaffected, no real LLM calls in CI, logs sanitized.

Chain strategy: cross-repo feature-branch chain following the 009-auth-web pattern, with API foundation before Web UI.

## 11. Open questions

1. ¿Provider local preferido: fake deterministic, Ollama, o ambos?
2. ¿LLM complementa score (mantiene Art. II intacto) o reemplaza alguna parte del análisis?
3. ¿Rate limit dedicado o reusar el existente (5/h para AI)?
4. ¿Dónde en UI mostrar feedback LLM? ¿Nuevo panel o integrado en fix-list?
5. ¿UI debe permitir desactivar LLM por usuario (preference)?
6. ¿Soporte multi-provider desde el inicio (Anthropic + OpenAI + Ollama) o MVP con uno solo?
7. ¿Cost controls: el usuario paga créditos extra por usar LLM, o viene incluido?
8. ¿Modo offline: solo fake deterministic o también Ollama?
9. ¿Nombre del contrato: `aiFeedback` o `llmFeedback`?
10. ¿Versionado del contrato: `v1` (llmFeedback como string) o ya pensar v2 estructurado?

## 12. MVP acceptance criteria

- [ ] `LLM_ENABLED=false` por defecto, configurable via env.
- [ ] Fake deterministic provider funcional en dev sin internet.
- [ ] Score determinista NO se ve afectado por cambios 022 (Art. II compliance).
- [ ] BFF route nuevo para LLM feedback con timeout, retry, fallback.
- [ ] UI muestra feedback LLM cuando está habilitado y disponible.
- [ ] UI muestra fallback "AI feedback no disponible" cuando LLM falla o está deshabilitado.
- [ ] 0 secrets/tokens/PII en logs (Art. III compliance).
- [ ] 0 prompt injection viable (input como data con system prompt explícito).
- [ ] Tests unit + integration sin provider real en CI.
- [ ] Constitution Art. V (input como data) cumplido.
- [ ] Constitution Art. III (no loguear contenido) cumplido.
- [ ] 009-auth-web no roto.
- [ ] 021-structured-cv-import no roto.
- [ ] Gates verdes: lint, test, build, typecheck, endpoint-drift.

## 13. What not to do

- NO integrar pagos (no feature de créditos premium para LLM en este change).
- NO deploy.
- NO Render.
- NO OAuth real dev.
- NO enviar CV/job reales a proveedor externo por default (requiere `LLM_ENABLED=true` + `LLM_API_KEY` configurado).
- NO usar LLM en tests CI reales.
- NO tool execution en la LLM (no function calling).
- NO romper score determinista.
- NO modificar AGENTS.md ni constitution.md.
- NO abrir 010-payments-web ni 020-a11y-automated-audit en este change.
