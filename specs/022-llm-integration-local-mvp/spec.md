# Spec: 022 — LLM Integration Local MVP

## 1. Overview
Optional local-first `llmFeedback` for developer/technical early adopters. Success=foundation: fake/offline, flags, tests, zero score regression.

## 2. Scope
- PR1 api: fake, `LLM_*`/`Llm:*`, defaults, tests.
- PR2 api: endpoint, redaction, logs, fallback, limit, timeout.
- PR3 web: BFF, adapter, tests.
- PR4 web: panel, toggle, states, a11y, fake e2e.

## 3. Out of Scope
023/Ollama PR5-6; Anthropic/OpenAI/Minimax; billing/credits; persistent preference; 009 `/privacidad`/consent; deploy/Render; payments.

## 4. Assumptions
021 markers shipped; 009 auth/BFF shipped; Constitution v1.2.0; LocalAuth works; score=`2.0.0`; CI=fake-only.

## 5. Functional Requirements
|ID|G/W/T|
|---|---|
|REQ-LLM-001|G default;W boot;T `LLM_ENABLED=false`.|
|REQ-LLM-002|G offline;W call;T deterministic fake.|
|REQ-LLM-003|G config;W read;T `LLM_*`/`Llm:*`,not`Ai:*`.|
|REQ-LLM-004|G result;W validate;T 10-field `llmFeedback` contract.|
|REQ-LLM-005|G any LLM;W score;T 021-identical.|
|REQ-LLM-006|G markers;W feedback;T inferred=tentative,explicit=strong,user_confirmed=truth.|
|REQ-LLM-007|G request;W route;T distinct `POST /api/v1/llm/feedback`.|
|REQ-LLM-008|G web;W proxy;T server-side `X-BFF-Key`.|
|REQ-LLM-009|G analyzer;W render;T panel≠FixList.|
|REQ-LLM-010|G toggle;W off;T disabled.|
|REQ-LLM-011|G fetch;W pending;T loading.|
|REQ-LLM-012|G off;W render;T disabled-copy.|
|REQ-LLM-013|G fail;W render;T unavailable-copy.|
|REQ-LLM-014|G excess;W limit;T 429+Retry-After.|
|REQ-LLM-015|G timeout;W exceeded;T `degraded=true`.|
|REQ-LLM-016|G error;W respond;T fallback+score-intact.|
|REQ-LLM-017|G CV/job;W send;T PII-redacted-first.|
|REQ-LLM-018|G malicious-CV;W process;T data-only/no-tools.|
|REQ-LLM-019|G logs;W write;T metadata-only.|
|REQ-LLM-020|G CI;W tests;T fake-only.|
|REQ-LLM-021|G 009;W run;T pass.|
|REQ-LLM-022|G 021;W run;T pass.|

## 6. Non-Functional Requirements
`NFR-SEC-01` no secret/prompt/PII leak. `NFR-PRIV-01` redact/minimize. `NFR-DET-01` Art.II unchanged. `NFR-OFFLINE-01` fake offline. `NFR-RES-01` timeout/error=>degraded+score. `NFR-RATE-01` dedicated configurable limit. `NFR-OBS-01` sanitized provider/latency/failure logs. `NFR-CONFIG-01` server env; no `NEXT_PUBLIC_LLM_API_KEY`. `NFR-TEST-01` CI fake. `NFR-A11Y-01` region/label/keyboard/SR.

## 7. Compliance Requirements
`CR-CONST-II` score sealed/no bump. `CR-CONST-III` no CV/job logs. `CR-CONST-V` content=DATA. `CR-CONST-VI` Domain pure/IO port. `CR-CONST-IX` no ARCO regression. `CR-NO-3P-CONTENT` no third-party CV default. `CR-NO-SECRETS` no hardcoded/logged secrets. `CR-NO-TOOLS` no function/tool calling. `CR-MARKERS` inferred≠truth.

## 8. Acceptance Criteria
PR1: ☐disabled-default ☐`LlmFeedback` options ☐fake-v2 ☐offline-tests ☐Domain-pure. PR2: ☐endpoint-200 ☐429+Retry-After ☐timeout-degraded ☐sanitized-error ☐redact-email/phone/URLs ☐contentless-logs ☐injection-no-tools ☐Art.II-tests. PR3: ☐BFF+`X-BFF-Key` ☐adapter-states ☐unit-tests. PR4: ☐separate-panel ☐loading ☐disabled ☐unavailable ☐sessionStorage ☐fake-e2e ☐a11y-attrs ☐lint/type/e2e. Cross: ☐009-e2e ☐021-e2e ☐pnpm-1134/1134 ☐Domain≥90% ☐endpoint-drift ☐CI-no-secrets/PII ☐no-`NEXT_PUBLIC_LLM_*` ☐deterministic-fake-only.

## 9. Traceability Matrix
|Requirement ID|Description|PR|Repo|Tests expected|Risks covered|Source|
|---|---|---|---|---|---|---|
|REQ-LLM-001|disabled-default|PR1|api|unit|offline/abuse|Proposal§5/D1|
|REQ-LLM-002|fake-offline|PR1|api|unit|offline|D1+D8|
|REQ-LLM-003|namespace|PR1|api|unit|config-leak|D9|
|REQ-LLM-004|v2-contract|PR1+2|api|contract|drift|D10|
|REQ-LLM-005|score-unchanged|PR2+verify|api|regression|score|D2+CR-II|
|REQ-LLM-006|markers|PR2|api|unit|marker-abuse|P3|
|REQ-LLM-007|endpoint|PR2|api|contract|drift|Proposal§6|
|REQ-LLM-008|BFF|PR3|web|unit/e2e|auth/secret|Proposal§6|
|REQ-LLM-009|panel|PR4|web|unit/e2e|UI-confusion|D4|
|REQ-LLM-010|toggle|PR4|web|e2e|preference|D5|
|REQ-LLM-011|loading|PR4|web|e2e|UX|A11Y|
|REQ-LLM-012|disabled|PR4|web|e2e|UX|A11Y|
|REQ-LLM-013|unavailable|PR4|web|e2e|UX|RES|
|REQ-LLM-014|rate-limit|PR2|api|unit/int|abuse|D3|
|REQ-LLM-015|timeout|PR2|api|unit|timeout|RES|
|REQ-LLM-016|fallback|PR2+4|both|int|score-visible|D2|
|REQ-LLM-017|redaction|PR2|api|unit/int|PII|CR-III|
|REQ-LLM-018|injection|PR2|api|unit|injection|CR-V|
|REQ-LLM-019|logs|PR2|api|unit|leaks|CR-III|
|REQ-LLM-020|CI-fake|PR1+3|both|config|cost/leak|TEST|
|REQ-LLM-021|009-regression|verify|both|e2e|regression|Art.VI|
|REQ-LLM-022|021-regression|verify|both|e2e|regression|P3|

## 10. Deferred Items
023 Ollama PR5-6; multi-provider feedback; external billing/credits; persistent preference; advanced injection suite; production deploy smoke; 009 `/privacidad`; 009 consent UI.

## 11. Open Questions
None.
