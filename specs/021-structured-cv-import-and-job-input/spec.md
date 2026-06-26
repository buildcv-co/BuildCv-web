# Spec: 021 — Structured CV Import + Mandatory Job Spec

> **Mode**: hybrid · **Change**: 021-structured-cv-import-and-job-input
> **Engine version bump**: `1.0.0 → 2.0.0` (sealed, backward-compat shim shipped)
> **Constitution**: Art. I (zero invention + confidence), Art. II (deterministic C#), Art. V (input as data, anti prompt-injection), Art. VI (Domain purity), Art. VIII (test-first)

## Intent

Replace free-text `{CvText, JobText}` exchange with typed JSON end-to-end. CV flows as JSON Resume `CvDocument` with `confidence` markers; job flows as a mandatory `JobSpec`. Scoring emits a per-section breakdown + red flags. The v1 text path remains reachable via explicit `engineVersion: "1.0.0"` for one release cycle.

## NEW Capabilities

### structured-job-spec → [specs/structured-job-spec/spec.md](specs/structured-job-spec/spec.md)

Mandatory `JobSpec { title, company, description, location, employmentType, requirements[] }`. Validated identically by Zod (web) and FluentValidation (api). Hard length caps (title ≤ 200, description ≤ 20_000, requirements ≤ 500 × 100). Closed enum on `employmentType`. Anti-prompt-injection allowlist rejects control chars, zero-width chars, and substrings (`"ignore previous"`, `"<|im_start|>"`, `"system:"`, `"assistant:"`). Backward-compat shim accepts `{ jobText, engineVersion: "1.0.0" }`.

### score-section-breakdown → [specs/score-section-breakdown/spec.md](specs/score-section-breakdown/spec.md)

`ScoringEngine.Score(cv, job, "2.0.0")` returns `perSection: { experience, education, skills, certifications, contact }` (each integer 0–100 or `null` when section absent and renormalized). `redFlags[]` surfaces employment gaps (>6 months) and job-hopping patterns (≥3 employers <18 months tenure in 5y) as signal-only (never a deduction, Art. I). Determinism is property-tested: same input + `engineVersion="2.0.0"` ⇒ byte-identical output across 1000 parallel runs.

## MODIFIED Capabilities (Deltas)

### 005-cv-pdf-docx-import → [specs/005-cv-pdf-docx-import/spec.md](specs/005-cv-pdf-docx-import/spec.md)

`ImportResult` evolves from `{text, sections[]}` to `{cv: CvDocument}` with `engineVersion: "2.0.0"`. Every parsed field carries `confidence: 'inferred' | 'explicit'`; `'user_confirmed'` is set ONLY by the editor on save (no auto-promotion, Art. I). Free-form `heading` becomes a discriminator (`kind: 'basics'|'work'|...|'other'`) with `rawHeading` preserved for unknown headers. Colombian `datosPersonales` (`cedula`, `nacionalidad`, `estadoCivil`, `libretaMilitar`, `rh`) lives under `cv.basics.datosPersonales` (undefined when absent). Legacy v1 shape regenerable via `serializeCvDocument()` when clients pin `engineVersion: "1.0.0"`.

### 002-score-engine → [specs/002-score-engine/spec.md](specs/002-score-engine/spec.md)

`ScoreCvCommand` accepts a discriminated union: `{cv: CvDocument, job: JobSpec, engineVersion: "2.0.0"}` OR `{cvText, jobText, engineVersion: "1.0.0"}`. Mixing structured `cv` with v1 is rejected with `VERSION_MISMATCH`. Structured input bypasses regex analyzers (Domain consumes typed inputs directly). `ScoreResponse` gains `perSection` and `redFlags` on v2; both fields are absent on v1. `ScoringEngine.Version` is a single `public const string Version = "2.0.0"` (compile-time, byte-identical across the codebase).

### 006-web-cv-editor → [specs/006-web-cv-editor/spec.md](specs/006-web-cv-editor/spec.md)

Legacy 8-textarea editor is replaced by JSON-Resume-shaped section forms (`BasicsForm`, `WorkList`, `EducationList`, `SkillsByCategory`, `ProjectsList`, `CertificatesList`, `LanguagesList`) inspired by `xitanggg/open-resume` UX (MIT, reference only — no copy). Each `CvDocument` field carries its `confidence` marker; inferred fields get a visual indicator and become `user_confirmed` only on explicit edit/blur. Colombian `datosPersonales` sub-form renders when `navigator.language` starts with `es-CO` or the imported CV carries the fields. Legacy editor lives behind `NEXT_PUBLIC_STRUCTURED_INPUT` (default `"false"` during rollout).

### 008-observability-web → [specs/008-observability-web/spec.md](specs/008-observability-web/spec.md)

Every observability event tied to a backend interaction carries an `engineVersion` field echoing the response. Version mismatches log a warning event with codes `ENGINE_VERSION_DOWNGRADE` / `ENGINE_VERSION_UPGRADE`. `/api/log/metrics` exposes per-engineVersion counters. The field is additive (strict Zod on the payload, but legacy consumers that ignore it continue working).

## Cross-cutting Rules

- **No LLM on the calc path** (Art. II) — `ScoringEngine.Score` has zero `DateTime.UtcNow` / `Guid.NewGuid` / `Random`.
- **Confidence is metadata** (Art. I) — `'user_confirmed'` is set ONLY by the editor on save.
- **Rollback**: revert server to v1; nothing to migrate (Art. III = no persistence); clients that pinned `1.0.0` keep working.

## File Map

| File | Type | Reqs | Scenarios |
|---|---|---|---|
| `specs/structured-job-spec/spec.md` | NEW | 6 | 11 |
| `specs/score-section-breakdown/spec.md` | NEW | 10 | 19 |
| `specs/005-cv-pdf-docx-import/spec.md` | DELTA | 11 | 20 |
| `specs/002-score-engine/spec.md` | DELTA | 10 | 18 |
| `specs/006-web-cv-editor/spec.md` | DELTA | 11 | 20 |
| `specs/008-observability-web/spec.md` | DELTA | 6 | 13 |

## Next Phase

→ `design.md` then `tasks.md` (4–6 chained PRs, each <400 LOC, TDD-ordered).