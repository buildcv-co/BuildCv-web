# Spec: 024-minimax-real-provider

## 1. Overview
024 adds optional MiniMax cloud feedback, reusing 022 `ILlmFeedbackClient`, redaction, rate-limit, fallback, logs, BFF contract. Owner lacks GPU; MiniMax is viable. Default remains fake/disabled.

## 2. Scope
In: PR1 api `MinimaxLlmFeedbackClient`, options `BaseUrl/ApiKey/MaxInputLength/MaxOutputTokens`, conditional DI, safe appsettings, unit tests (~250 LOC). PR2 api dispatch by `Provider=minimax`, max validation, integration+contract tests (~150 LOC). PR3 web optional type-only. Out: 023/Ollama, multi-provider, streaming, thinking, persistent preference, 009 privacy/consent, 010/020, billing UI; MUST NOT touch 009, 022 fake, ScoreEngine, `/adapt`.

## 3. Functional Requirements
| ID | MUST/SHALL |
|---|---|
| FR-001..002 | `Provider=minimax` activates MiniMax client; `fake` default unchanged. |
| FR-003..007 | Config: `BaseUrl=https://api.minimax.io/anthropic`, server-only `ApiKey`, `Model=MiniMax-M2.7`, `MaxInputLength=32000`, `MaxOutputTokens=1024`; no M3 hardcode. |
| FR-008..011 | Anthropic Messages text-only `{model,max_tokens,system,messages[{role:"user",content:"<redacted>"}]}`; no tools/media; DATA prompt; `PiiRedactor` before call; no redacted fields. |
| FR-012..014 | Parse text `content[]` only to v2; stamp `provider="minimax"`, configured model; malformed→degraded empty arrays. |
| FR-015..021 | 401/403→502 no key leak; 429→429+`Retry-After`; 5xx→502/degraded; timeout→504/degraded; non-streaming; discard thinking; CI fake handler. |
| FR-022..026 | Score `2.0.0`, `/adapt`, 022 fake, 009 auth-web intact; web unchanged unless drift. |

## 4. Non-Functional Requirements
NFRs: SEC no tracked/client secrets; PRIV PII minimization; DET score intact; REL degraded fallback; COST 32000/1024/30-per-60s/0 retries; PERF 5000ms; OBS metadata-only logs; TEST no real CI; BC 022/009/021; MAINT Clean Architecture; CONFIG env vars.

## 5. Compliance Requirements
CRs: Constitution II/III/V/VI/IX; no tracked or client keys; no real MiniMax in CI; no claims about free tier, M3, or exact provider limits.

## 6. Data / Config Requirements
| Key | Default | Server | Notes |
|---|---|---|---|
| `Enabled` | `false` | yes | kill switch |
| `Provider` | `fake` | yes | `fake|minimax` |
| `BaseUrl` | `https://api.minimax.io/anthropic` | yes | minimax |
| `ApiKey` | empty | yes | never tracked |
| `Model` | `MiniMax-M2.7` | yes | no M3 hardcode |
| `TimeoutMs` | `5000` | yes | CT |
| `RedactionEnabled` | `true` | yes | toggle |
| `RateLimit:RequestsPerWindow` | `30` | yes | cost |
| `RateLimit:WindowSeconds` | `60` | yes | cost |
| `MaxInputLength` | `32000` | yes | chars |
| `MaxOutputTokens` | `1024` | yes | tokens |

## 7. Security & Privacy Requirements
SPR-001..009: `ApiKey` env/server-only; MAY be in gitignored local dev; MUST NOT be tracked or `NEXT_PUBLIC_*`; logs/errors MUST NOT include key, prompts, CV/job, tokens, PII, stacks, internals; redact emails/phones/personal URLs/addresses pre-call; DATA prompt; no tools/functions/browsing; revoked leaked key MUST NOT be used/referenced; 30/60 limit first cost barrier.

## 8. Acceptance Criteria
AC-001 GIVEN fake WHEN invoked THEN fake client. AC-002 GIVEN minimax+key THEN minimax client. AC-003 missing key→502 sanitized. AC-004 bad BaseUrl→400. AC-005 valid 200→10-field v2. AC-006 malformed→degraded empty arrays, score intact. AC-007 401/403→502 no key. AC-008 429→429+`Retry-After`. AC-009 5xx→502/degraded. AC-010 timeout→degraded score intact. AC-011 over input→truncate or 400. AC-012 sends `max_tokens`. AC-013 PII removed pre-call. AC-014 metadata logs only. AC-015 no forbidden `NEXT_PUBLIC_*`. AC-016 CI zero MiniMax HTTP. AC-017 022 fake tests pass. AC-018 ScoringEngine tests pass. AC-019 009 auth e2e passes. AC-020 gates green.

## 9. Traceability Matrix
| Req | Area | Test | PR |
|---|---|---|---|
| FR-001/003/005/007/008/012/013/020/023 | adapter/options/DI | `MinimaxLlmFeedbackClientTests` | PR1 |
| FR-002/024 | fake | regression | PR1+2 |
| FR-004/021 | env/CI | grep + fake handler | PR1+2 |
| FR-006/014/015/016/017/018 | endpoint | `LlmFeedbackEndpointMinimaxTests` | PR2 |
| FR-009 | prompt | `PromptTemplateTests` | PR1 |
| FR-010/011 | redactor/body | redactor+body asserts | PR1 |
| FR-019/022/025/026 | static/regression | grep, ScoringEngine, auth/web e2e | verify |

## 10. Deferred / Out of Scope
Ollama; selector UI; streaming; thinking mapping; persistent preference; cost dashboard; model listing; real MiniMax CI smoke; billing UI; 020 audit; deploy automation; `/adapt` auth baseline; 009 changes; 022 UI; ScoreEngine.

## 11. Open Questions
Non-blocking: model availability; account RPM/TPM; account pricing. All configurable; 022 controls remain first barrier.
