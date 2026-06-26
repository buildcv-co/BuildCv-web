# Spec: score-section-breakdown — Per-section scoring + red-flag detection

> **Status**: NEW (delta scope: 021-structured-cv-import-and-job-input)
> **Owners**: BuildCv.Domain (pure C#) + BuildCv.Application (orchestration)
> **Constitution**: Art. II (deterministic, no IO/clock/randomness), Art. VIII (test-first)

## Purpose

Extend the scoring output so the user sees **which part of the CV matched** and **which parts didn't**, mirroring how a real TA evaluates a candidate: experience, education, skills, certifications, contact. Adds red flags (employment gaps, job hopping) as first-class signal, never as a deduction.

## Requirements

### Requirement: PerSection score envelope

The system MUST return `perSection: { experience: number, education: number, skills: number, certifications: number, contact: number }` where each value is an integer 0–100, and the sum of weighted sections equals `overallScore` (within ±1 due to integer rounding).

#### Scenario: All sections present

- GIVEN a `CvDocument` with populated `basics`, `work`, `education`, `skills`, `certificates`
- WHEN `ScoringEngine.Score(cv, job, engineVersion="2.0.0")` runs
- THEN `perSection` contains all five integers 0–100 and `overallScore` equals the weighted sum (±1)

#### Scenario: Missing section reported as null

- GIVEN a `CvDocument` with no `certificates`
- WHEN scored
- THEN `perSection.certifications === null` and `overallScore` is renormalized as if the section were excluded (Art. II FR-011)

### Requirement: Experience subscore from structured work

The system MUST compute `perSection.experience` from the JSON Resume `work[]` entries, weighting years of relevant experience, role-seniority match, and recency. Inputs MUST come exclusively from the structured `CvDocument`, never from re-parsing free text.

#### Scenario: Experience matches job seniority

- GIVEN `cv.work` with 6 years at "Senior Backend Developer" and `job.title` = "Senior Backend"
- WHEN scored
- THEN `perSection.experience >= 80`

#### Scenario: Experience lacks relevant years

- GIVEN `cv.work` with 6 years as "Junior Frontend" and `job.title` = "Senior Backend"
- WHEN scored
- THEN `perSection.experience < 60`

### Requirement: Education subscore

The system MUST compute `perSection.education` from `cv.education[]`, accepting Colombian credential labels (`Técnico`, `Tecnólogo`, `Pregrado`, `Especialización`, `Maestría`, `Doctorado`) and standard international equivalents.

#### Scenario: Required degree present

- GIVEN `cv.education` includes `Pregrado en Ingeniería de Sistemas` and `job.requirements` mentions `ingeniero`
- WHEN scored
- THEN `perSection.education >= 80`

#### Scenario: Education field absent

- GIVEN `cv.education` is empty `[]`
- WHEN scored
- THEN `perSection.education === null` and overall score renormalizes

### Requirement: Skills subscore

The system MUST compute `perSection.skills` by intersecting `cv.skills[].keywords` (flattened) with tokens derived from `job.requirements` and `job.description`. Match MUST go through the existing T0–T4 cascade (Art. VIII) but skip the regex analyzer when structured skills are available.

#### Scenario: Direct skill overlap

- GIVEN `cv.skills` includes `["C#", ".NET", "PostgreSQL"]` and `job.requirements` lists the same three
- WHEN scored
- THEN `perSection.skills >= 90`

#### Scenario: No overlap

- GIVEN `cv.skills` = `["PHP", "MySQL"]` and `job.requirements` lists `["Rust", "Kafka"]`
- WHEN scored
- THEN `perSection.skills < 30`

### Requirement: Certifications subscore

The system MUST compute `perSection.certifications` from `cv.certificates[]`, matching against `job.requirements` terms that match certification patterns (e.g. `AWS Certified`, `PMP`, `Scrum Master`).

#### Scenario: Job requires a cert that the CV has

- GIVEN `cv.certificates` contains `"AWS Solutions Architect"` and `job.requirements` lists `"AWS certification"`
- WHEN scored
- THEN `perSection.certifications >= 70`

#### Scenario: No certificates

- GIVEN `cv.certificates` is empty
- WHEN scored
- THEN `perSection.certifications === null`

### Requirement: Contact subscore

The system MUST compute `perSection.contact` from `cv.basics.email`, `phone`, `url` (LinkedIn / portfolio). A missing email is a hard gate: `overallScore` is capped at 0 with `Band: "Bajo"` (parity with v1, FR-018).

#### Scenario: Complete contact info

- GIVEN `cv.basics` has email, phone, and LinkedIn URL
- WHEN scored
- THEN `perSection.contact === 100`

#### Scenario: Missing email halts score

- GIVEN `cv.basics.email` is empty
- WHEN scored
- THEN `overallScore === 0`, `Band === "Bajo"`, and `redFlags` contains `{ code: "MISSING_EMAIL", severity: "Error" }`

### Requirement: Red-flag detection (gaps)

The system MUST detect employment gaps > 6 months from `cv.work[]` date ranges (treating missing `endDate` as "current"). Each gap MUST appear as a `RedFlag { code: "EMPLOYMENT_GAP", months, severity: "Info" | "Warning" }` and MUST NOT subtract from `overallScore` (signal only, never deduction, Art. I).

#### Scenario: 14-month gap surfaced

- GIVEN `cv.work` has entries ending `2022-03` and starting `2023-05`
- WHEN scored
- THEN `redFlags` contains `{ code: "EMPLOYMENT_GAP", months: 14, severity: "Warning" }` and `overallScore` is unchanged

#### Scenario: No gaps

- GIVEN contiguous work entries with at most 1-month transitions
- WHEN scored
- THEN `redFlags` does not contain `EMPLOYMENT_GAP`

### Requirement: Red-flag detection (job hopping)

The system MUST flag a "job-hopping" pattern when ≥ 3 distinct employers in the last 5 years had tenure < 18 months each. The flag MUST be `severity: "Info"` and MUST NOT affect `overallScore`.

#### Scenario: Pattern detected

- GIVEN `cv.work` shows 4 employers in 2021–2026 with avg tenure 11 months
- WHEN scored
- THEN `redFlags` contains `{ code: "JOB_HOPPING", employersIn5y: 4, severity: "Info" }`

### Requirement: Determinism — same input ⇒ byte-identical output (Art. II)

The system MUST guarantee that `ScoringEngine.Score(cv, job, engineVersion="2.0.0")` produces byte-identical `ScoreResponse` for the same `(cv, job)` pair across runs, processes, and machines. No wall-clock, no `Guid.NewGuid()`, no `DateTime.UtcNow` on the calc path.

#### Scenario: Repeated run is identical

- GIVEN a fixed `cv` and `job`
- WHEN `Score(cv, job, "2.0.0")` runs 1000 times in parallel
- THEN all 1000 responses are byte-equal (property-based test)

#### Scenario: Version bump changes response shape

- GIVEN the same `cv` and `job`
- WHEN scored with `engineVersion="1.0.0"` then `"2.0.0"`
- THEN the v2 response includes `perSection` + `redFlags` and the v1 response does not

### Requirement: Backward-compat shim (text path)

The system MUST still accept legacy `{ cvText, jobText }` when `engineVersion: "1.0.0"` is explicit. The text path MAY emit `perSection` with `null` values (degraded mode) but MUST NOT emit `redFlags` (they require structured dates).

#### Scenario: Legacy 1.0.0 client

- GIVEN `{ cvText, jobText, engineVersion: "1.0.0" }`
- WHEN scored
- THEN the v1 shape is returned (no `perSection`, no `redFlags`)

#### Scenario: Mixed version + structured

- GIVEN `{ cv: CvDocument, job: JobSpec, engineVersion: "1.0.0" }`
- WHEN scored
- THEN HTTP 422 with code `VERSION_MISMATCH` (v1 cannot consume structured input)

## Out of Scope

- LLM-based summaries explaining the score breakdown — covered in 003-adapt-ia.
- Personalized recommendations per candidate — separate feature.
- Salary estimation from CV — out of product scope.