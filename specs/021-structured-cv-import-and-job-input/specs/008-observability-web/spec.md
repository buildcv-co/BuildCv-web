# Delta for 008-observability-web

> **Status**: DELTA (change 021-structured-cv-import-and-job-input)
> **Adds**: `engineVersion` tag to all observability events tied to backend responses
> **Constitution**: Art. III (privacy first — no PII in logs)

## ADDED Requirements

### Requirement: Every observability event includes engineVersion

The system MUST tag every observability event (error logs, web vitals, BFF `/api/log` payloads) that originates from a backend interaction with an `engineVersion` field. When the backend response carries `engineVersion`, the observability event MUST echo that exact value. When no backend interaction is involved, the field MUST be `"n/a"`.

#### Scenario: Score event carries engineVersion

- GIVEN a `POST /api/score` returns `engineVersion: "2.0.0"`
- WHEN the client logs a `score.success` event
- THEN the event payload includes `engineVersion: "2.0.0"`

#### Scenario: Import event carries engineVersion

- GIVEN a `POST /api/import` returns `engineVersion: "2.0.0"`
- WHEN the client logs an `import.success` event
- THEN the event payload includes `engineVersion: "2.0.0"`

#### Scenario: Non-backend event

- GIVEN a client-side error not tied to a backend call
- WHEN logged
- THEN `engineVersion: "n/a"`

### Requirement: Version mismatch logged as warning

The system MUST log a warning (level `"warning"`) when the client requests `engineVersion: "2.0.0"` but receives a `1.0.0` response (or vice versa), tagging the event with both the requested and received versions.

#### Scenario: Requested v2, got v1

- GIVEN the client sends `engineVersion: "2.0.0"`
- WHEN the response carries `engineVersion: "1.0.0"` (server still on legacy)
- THEN a warning event is logged with `requested: "2.0.0"`, `received: "1.0.0"`, and a stable `code: "ENGINE_VERSION_DOWNGRADE"`

#### Scenario: Requested v1, got v2

- GIVEN the client sends `engineVersion: "1.0.0"`
- WHEN the response carries `engineVersion: "2.0.0"` (server upgraded)
- THEN a warning event is logged with `code: "ENGINE_VERSION_UPGRADE"`

### Requirement: Aggregated metric per engineVersion

The system MUST expose (via the `/api/log` BFF) a per-engineVersion counter that the dev can `GET` to inspect how many events of each kind ran against each backend version.

#### Scenario: GET /api/log/metrics

- GIVEN 3 events ran against `"2.0.0"` and 7 against `"1.0.0"`
- WHEN the dev GETs `/api/log/metrics`
- THEN the response is `{ "2.0.0": { events: 3 }, "1.0.0": { events: 7 } }`

#### Scenario: Metrics survive within session

- GIVEN events are logged over the session
- WHEN the BFF is queried
- THEN the counters reflect the live totals (FIFO at 100 entries for the event log; metrics counters are unbounded for the session)

## MODIFIED Requirements

### Requirement: FR-085 — Log context fields

The system MUST include `engineVersion` (default `"n/a"`) in every log payload's `context` object.
(Previously: the context object contained `url, userAgent, viewport, appVersion, buildSha, locale` and did NOT include `engineVersion`.)

#### Scenario: Log payload shape

- GIVEN any log event
- WHEN the payload is inspected
- THEN `context.engineVersion` is present alongside the other context fields

#### Scenario: Web vitals carry engineVersion

- GIVEN a web vitals metric is reported
- WHEN the structured log is written
- THEN `context.engineVersion` is `"n/a"` (web vitals are not tied to backend calls)

### Requirement: FR-091 — BFF payload shape

The system MUST accept `/api/log` payloads whose `context` includes `engineVersion`.
(Previously: the payload shape did not include `engineVersion`.)

#### Scenario: Schema accepts new field

- GIVEN a payload with `context.engineVersion`
- WHEN `LogPayloadSchema.safeParse` runs (Zod)
- THEN it succeeds

#### Scenario: Schema rejects unknown fields when strict

- GIVEN a payload with `context.engineVersionX` (typo)
- WHEN strict Zod validation runs
- THEN the payload is rejected with a 400 listing the unknown field

## REMOVED Requirements

_None._

## Rollback Plan Scenarios

### Requirement: engineVersion field is additive, not breaking

The system MUST treat `engineVersion` as a strictly additive observability field. Its presence MUST NOT cause any v1 client to fail or change behavior. Existing v1 consumers that ignore the new field continue to work unchanged.

#### Scenario: v1 consumer ignores engineVersion

- GIVEN a downstream consumer that does not know about `engineVersion`
- WHEN it receives an updated log payload
- THEN it parses the legacy fields successfully and ignores the new field

#### Scenario: Rollback removes the tag, not the data

- GIVEN the owner rolls back to a build without the engineVersion tag
- WHEN logs are emitted
- THEN the tag is absent (no error, no crash) and the rest of the payload is intact

## Out of Scope

- Sending `engineVersion` to a third-party observability backend — none integrated (Art. III).
- Auto-alerting on `ENGINE_VERSION_DOWNGRADE` — out of scope; the event is logged, not alerted.