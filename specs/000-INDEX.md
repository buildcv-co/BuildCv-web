# INDEX — Registro consolidado de features (BuildCv-web)

> **Entry point oficial al estado del frontend BuildCv.**
> Cualquier agente o humano que necesite saber "qué UI está hecha, qué UI está en curso, qué UI falta" debe leer esto primero.

**Última actualización:** 2026-06-26 (v0.5.3: **021-structured-cv-import-and-job-input** ✅ **SHIPPED + ARCHIVED** — Engine bump MAYOR `1.0.0 → 2.0.0` (Constitution Art. II SemVer seal, nota agregada en `constitution.md`); JSON Resume `CvDocument` + `ConfidenceMarker` en parsers; `JobSpec` mandatory con Zod; editor open-resume-inspired (`BasicsForm`/`WorkList`/`EducationList`/`SkillsByCategory`); `promoteConfidence` solo en editor on blur (Constitution Art. I); `engineVersion: "2.0.0"` (Art. II seal, response observation tagging via `engineVersion` en `lib/observability`); feature flag `NEXT_PUBLIC_STRUCTURED_INPUT=true` (default en `.env.example` + `.env.local`); 6 chained PRs + 1 followup (PR1 foundation → PR2 parser restructure → PR3 scoring v2 → PR4 web editor → PR5 web analyzer + observability → PR6 tests/a11y/e2e/docs → followups-1 fixing 8 e2e tests + AnalizarScreen bug + typo fix); 23 work-unit commits web (`30672b4` → `b75c5b1` + `55985f3` + typo fix `82a400b`) + 11 work-unit commits api (`5f3982a` → `6f0456f`) all merged to `main` + pushed to `origin` in BOTH repos; HEAD web `82a400b`, HEAD api `5d40a53`; delta specs synced into main `BuildCv-web/specs/{006-web-cv-editor,008-observability-web}/spec.md` + `BuildCv-api/specs/{002-score-engine,005-cv-pdf-docx-import}/spec.md`; see [archive report](./021-structured-cv-import-and-job-input/archive-report.md))

## Relación con el backend

Este sub-proyecto es el **frontend** (BFF + UI) que consume el backend (`BuildCv-api`). Las features frontend **siempre tienen un ID correlativo** con su contraparte backend:

| Frontend | Backend | Relación |
|---|---|---|
| 002-web-score-ui | 002-score-engine ✅ | Consume `POST /api/v1/score` |
| 003-web-adapt-ui | 003-adapt-ia ✅ | Consume `POST /api/v1/adapt` |
| 004-web-export-ui | 004-export-pdf ✅ | Consume `POST /api/v1/export` |
| 005-web-cv-import-ui | 005-cv-pdf-docx-import ✅ | Consume `POST /api/v1/import` (NUEVO v0.5) |
| 006-web-cv-editor | (frontend only) ✅ | Editor estructurado; re-usa 002/003/004 con texto editado |
| 006-web-cv-diff-viewer | (frontend only) ✅ | Diff visual original vs adaptado |

## Constitución vigente

Misma que el backend: `../BuildCv-api/.specify/memory/constitution.md` v1.1.0.

**Cambios que afectan al frontend (v1.1.0):**
- **Art. III**: ahora se permite persistencia local EXCLUSIVAMENTE en el dispositivo del usuario para el borrador de edición. El frontend DEBE ofrecer botón "Limpiar borrador" (FR-040b).
- **Art. I FR-029a**: el editor (006) NO agrega entidades que el usuario no haya tipeado. Zod rechaza nuevas entidades en round-trip.
- **Art. VI**: el frontend tiene su propio puerto `ICvStore` (localStorage, IndexedDB).

## Estado del producto (consolidado)

| # | Feature | Hito | Status | BFF endpoint |
|---|---|---|---|---|
| 001 | `web-mvp-original` | MVP original | 🗄️ Archivado | (n/a) |
| 002 | `web-score-ui` | v0 / M0.0 | ✅ SHIPPED | `app/api/score/route.ts` |
| 003 | `web-adapt-ui` | v0 / M1.1 | ✅ SHIPPED | `app/api/adapt/route.ts` |
| 004 | `web-export-ui` | v0 / M2.1 | ✅ SHIPPED | `app/api/export/route.ts` |
| 005 | `web-cv-import-ui` | v0.5 / M3 | ✅ SHIPPED | `app/api/import/route.ts` |
| 006 | `web-cv-editor` | v0.5 / M4 | ✅ SHIPPED | (re-usa 002/003/004) |
| 006b | `web-cv-diff-viewer` | v0.5 / M4 | ✅ SHIPPED | (re-usa 003) |
| 007 | `landing-ui` | v0.5.1 | ✅ SHIPPED | (n/a) |
| 008 | `observability-web` | v0.5.1 | ✅ SHIPPED | (n/a) |
| 019 | `navigation-onboarding` | v0.5.2 | ✅ SHIPPED | (n/a) |
| 009 | `auth-web` | v1 | 📋 PLANEADO | (n/a) |
| 010 | `payments-web` | v1 | 📋 PLANEADO | (n/a) |
| 020 | `a11y-automated-audit` | v0.5.3 | 📋 PLANEADO | (n/a) |
| 021 | `structured-cv-import-and-job-input` (cross-repo: web frontend + api backend) | v0.5.3 | ✅ **SHIPPED + ARCHIVED** — JSON Resume `CvDocument` + `ConfidenceMarker` en parsers; `JobSpec` mandatory con Zod (web) + FluentValidation (api); `engineVersion` bump MAYOR `1.0.0 → 2.0.0` (Art. II SemVer seal); `perSection: {experience, education, skills, certifications, contact}` + `redFlags[]` (employment gaps + job-hopping); discriminated-union `ScoreCvCommand` con backward-compat shim v1; editor open-resume-inspired; `promoteConfidence` solo en editor on blur (Art. I); feature flag `NEXT_PUBLIC_STRUCTURED_INPUT=true` (default); determinism property test (1000 iter + parallel byte-identical); 6 chained PRs + 1 followup; tag `021-structured-cv-import-and-job-input-v1.0` at HEAD `82a400b` (web) / `5d40a53` (api). See [archive report](./021-structured-cv-import-and-job-input/archive-report.md) | (n/a, wires via `/api/{score,import}`) |

## Leyenda de status

- ✅ **SHIPPED** — feature cerrada, en producción
- 🚧 **EN CURSO** — implementación activa
- 📋 **PLANEADO** — los 7 artifacts están escritos; esperando ventana de implementación
- 🗄️ **ARCHIVADO** — feature antigua, conservada solo para historia

> **Convención de numeración cross-repo:** Los números 002–005 son correlativos (tienen contraparte frontend+backend = mismo producto). A partir de 006, cada repo (`BuildCv-api` / `BuildCv-web`) tiene su propia secuencia para features independientes. Ver también `BuildCv-api/specs/000-INDEX.md`.

## Features SHIPPED (detalle)

### 002-web-score-ui (v0 / M0.0)

- **Spec:** [specs/002-web-score-ui/spec.md](./002-web-score-ui/spec.md)
- **Plan:** [specs/002-web-score-ui/plan.md](./002-web-score-ui/plan.md)
- **Research:** [specs/002-web-score-ui/research.md](./002-web-score-ui/research.md)
- **Data model:** [specs/002-web-score-ui/data-model.md](./002-web-score-ui/data-model.md)
- **Quickstart:** [specs/002-web-score-ui/quickstart.md](./002-web-score-ui/quickstart.md)
- **Tasks:** [specs/002-web-score-ui/tasks.md](./002-web-score-ui/tasks.md)
- **Contracts:** [specs/002-web-score-ui/contracts/frontend-consumes-api.md](./002-web-score-ui/contracts/frontend-consumes-api.md)
- **Backend:** [../BuildCv-api/specs/002-score-engine/](../BuildCv-api/specs/002-score-engine/) (✅ SHIPPED)
- **Estado:** Score gauge animado + component bars + keyword cloud + fix list + honesty note.
- **Path frontend:** `app/analizar/page.tsx` + `components/analyzer/`
- **BFF:** `app/api/score/route.ts` (proxyea a `POST ${BACKEND_URL}/api/v1/score`)
- **Commit:** `ed13890` (M0 score engine original)

### 003-web-adapt-ui (v0 / M1.1)

- **Spec:** [specs/003-web-adapt-ui/spec.md](./003-web-adapt-ui/spec.md)
- **Backend counterpart:** ✅ SHIPPED con StubAiClient (`BuildCv-api/specs/003-adapt-ia/`).
- **Estado:** Panel de adaptación con severity indicator (verde/amarillo/rojo), delta de mejora, export gate, rate-limit handling.
- **Path frontend:** `components/adapt/` + `lib/api/adapt.ts`
- **BFF:** `app/api/adapt/route.ts` (proxyea a `POST ${BACKEND_URL}/api/v1/adapt`)
- **Commit:** `19577ab` (2026-06-09)
- **Tests:** unit + E2E verdes al cierre.

### 004-web-export-ui (v0 / M2.1)

- **Spec:** [specs/004-web-export-ui/spec.md](./004-web-export-ui/spec.md)
- **Backend counterpart:** ✅ SHIPPED con QuestPDF.
- **Estado:** Botón "Descargar PDF" con spinner, rate-limit y blocked-invention handling.
- **Path frontend:** `components/export/` + `lib/api/export.ts`
- **BFF:** `app/api/export/route.ts` (proxyea a `POST ${BACKEND_URL}/api/v1/export`)
- **Commit:** `45ec05d` (2026-06-09)

### 005-web-cv-import-ui (v0.5 / M3)

- **Spec:** [specs/005-web-cv-import-ui/spec.md](./005-web-cv-import-ui/spec.md)
- **Plan:** [specs/005-web-cv-import-ui/plan.md](./005-web-cv-import-ui/plan.md)
- **Research:** [specs/005-web-cv-import-ui/research.md](./005-web-cv-import-ui/research.md)
- **Data model:** [specs/005-web-cv-import-ui/data-model.md](./005-web-cv-import-ui/data-model.md)
- **Quickstart:** [specs/005-web-cv-import-ui/quickstart.md](./005-web-cv-import-ui/quickstart.md)
- **Tasks:** [specs/005-web-cv-import-ui/tasks.md](./005-web-cv-import-ui/tasks.md)
- **Contracts:** [specs/005-web-cv-import-ui/contracts/frontend-consumes-api.md](./005-web-cv-import-ui/contracts/frontend-consumes-api.md)
- **Estado:** Drag/drop PDF/DOCX, extracción de texto, secciones detectadas con confidence, handoff al editor.
- **Path frontend:** `app/importar/page.tsx` + `components/import/{FileUpload, ImportButton, ImportResultPanel}.tsx` + `lib/api/import.ts`
- **BFF:** `app/api/import/route.ts` (proxy a `POST ${BACKEND_URL}/api/v1/import`, `runtime = "nodejs"` por multipart >4 MB)
- **Commits:** web `318a1c0` + backend `c61bdf4` (2026-06-09)

### 006-web-cv-editor (v0.5 / M4)

- **Spec:** [specs/006-web-cv-editor/spec.md](./006-web-cv-editor/spec.md)
- **Plan:** [specs/006-web-cv-editor/plan.md](./006-web-cv-editor/plan.md)
- **Research:** [specs/006-web-cv-editor/research.md](./006-web-cv-editor/research.md)
- **Data model:** [specs/006-web-cv-editor/data-model.md](./006-web-cv-editor/data-model.md)
- **Quickstart:** [specs/006-web-cv-editor/quickstart.md](./006-web-cv-editor/quickstart.md)
- **Tasks:** [specs/006-web-cv-editor/tasks.md](./006-web-cv-editor/tasks.md)
- **Contracts:** [specs/006-web-cv-editor/contracts/frontend-internal.md](./006-web-cv-editor/contracts/frontend-internal.md)
- **Estado:** 8 secciones estructuradas con Zod round-trip, persistencia local con `ICvStore` (LocalStorage + IndexedDB fallback), botón "Limpiar borrador", re-score en caliente, export a Markdown.
- **Path frontend:** `app/analizar/editar/page.tsx` + `components/editor/`
- **Stack shipped:** `zod` v3 (Tiptap/Zustand/idb/nanoid/remark NO instalados — decisión técnica documentada en `tasks.md` L9-24, deuda para v1)
- **Persistencia:** `ICvStore` port (Art. VI v1.1.0) con `LocalStorageCvStore` (default). `IndexedDbCvStore` deferred a v1 (deuda técnica — quota overflow se surfacea al usuario vía `error-reporter`/`EditorSaveIndicator`).
- **Engine version:** `0.5.0` (sello en cada Draft, simetría con backend)
- **Constitution compliance:** Art. I ✅ (FR-029a: Zod rechaza entidades nuevas en round-trip), Art. III ✅ (FR-040b botón "Limpiar borrador" obligatorio), Art. VI ✅ (`ICvStore` puerto oficial)
- **A11y:** WCAG 2.2 AA, keyboard nav completa, ARIA labels por sección
- **Commit:** `748611d` (2026-06-09)

### 006-web-cv-diff-viewer (v0.5 / M4) — sub-feature del editor

- **Spec:** [specs/006-web-cv-diff-viewer/spec.md](./006-web-cv-diff-viewer/spec.md)
- **Plan:** [specs/006-web-cv-diff-viewer/plan.md](./006-web-cv-diff-viewer/plan.md)
- **Research:** [specs/006-web-cv-diff-viewer/research.md](./006-web-cv-diff-viewer/research.md)
- **Data model:** [specs/006-web-cv-diff-viewer/data-model.md](./006-web-cv-diff-viewer/data-model.md)
- **Quickstart:** [specs/006-web-cv-diff-viewer/quickstart.md](./006-web-cv-diff-viewer/quickstart.md)
- **Tasks:** [specs/006-web-cv-diff-viewer/tasks.md](./006-web-cv-diff-viewer/tasks.md)
- **Contracts:** [specs/006-web-cv-diff-viewer/contracts/frontend-internal.md](./006-web-cv-diff-viewer/contracts/frontend-internal.md)
- **Estado:** Visor unified / side-by-side con word-level diff, badges rojo para invenciones Soft/Hard, modal de confirmación para Hard sin revisar, edición inline con Zod.
- **Path frontend:** `app/analizar/diff/page.tsx` + `components/diff/`
- **Stack shipped:** `diff` (jsdiff v5, BSD-3-Clause) + custom React renderer (edición inline con `<input>` controlado, no Tiptap)
- **Modos:** unified (mobile <768px default) / side-by-side (desktop ≥768px default), toggle persiste en `localStorage["buildcv:diff:mode"]`
- **Constitution compliance:** Art. I ✅ (canDirectAccept retorna `false` si hay invenciones `Hard`; modal de confirmación obligatorio), Art. V ✅ (diff no se renderiza como HTML)
- **A11y:** color contrast WCAG AA, keyboard nav entre entidades flagged, screen reader anuncia cada flag
- **Commit:** `4bf92b7` (2026-06-09)

### 007-landing-ui (v0.5.1)

- **Spec:** [specs/007-landing-ui/spec.md](./007-landing-ui/spec.md)
- **Estado:** Hero + steps + trust signals + FAQ + metadata completa (OpenGraph, Twitter, canonical, robots, sitemap, JSON-LD) + error pages (404, 500, global-error).
- **Path frontend:** `app/page.tsx` + `components/landing/{hero, how-it-works, honesty-note, cta, faq, trust-signals, error-fallback}.tsx` + `app/{error,not-found,global-error}.tsx`
- **Commit:** `a312662` (2026-06-09)

### 008-observability-web (v0.5.1)

- **Spec:** [specs/008-observability-web/spec.md](./008-observability-web/spec.md)
- **Estado:** Client-side error reporting puro (NO third-party), global React error boundary (`<ErrorBoundary>` con `react-error-boundary`), dev overlay de errores, helpers en `lib/observability/`.
- **Path frontend:** `components/observability/` + `lib/observability/`
- **Commit:** `4168475` (2026-06-09)

### 019-navigation-onboarding (v0.5.2)

- **Spec:** [specs/019-navigation-onboarding/spec.md](./019-navigation-onboarding/spec.md)
- **Design:** [specs/019-navigation-onboarding/design.md](./019-navigation-onboarding/design.md)
- **Tasks:** [specs/019-navigation-onboarding/tasks.md](./019-navigation-onboarding/tasks.md)
- **Verify:** [specs/019-navigation-onboarding/verify-report.md](./019-navigation-onboarding/verify-report.md)
- **Archive:** [specs/019-navigation-onboarding/archive-report.md](./019-navigation-onboarding/archive-report.md)
- **Estado:** Promoted `<LandingNav>` to root layout (persistent header on every route); expanded NAV_ITEMS from 2 → 5; added mobile menu with native `<dialog>` (focus trap, Esc-to-close, focus return); added `<EmptyState>` to `/analizar`, `/analizar/iterate`, `/suscripciones` (single primary CTA each); fixed local-mode signin redirect from `/analizar/iterate` → `/analizar`. All routes now have discoverable nav.
- **Tags:** `019-navigation-onboarding-pr1-v1.0` (`a8193ae`), `019-navigation-onboarding-pr2-v1.0` (`4b72c4a`), `019-navigation-onboarding-v1.0` (combined)
- **Delivery:** 2 chained PRs, 15 work-unit commits (9 squash-merged on main), +54 automated checks (+35 unit + 19 e2e).
- **Path frontend:** `components/landing/{site-header,landing-nav,local-mode-pill,mobile-nav}.tsx` + `components/common/{empty-state,icons}.tsx` + `app/layout.tsx:38` + 5 page-level `<header>` strips.
- **Stack shipped:** native `<dialog>` + Tailwind v4 `sm:hidden` (zero new runtime deps; `@axe-core/playwright` deferred — see WARNING-2 in verify-report).
- **Constitution compliance:** Art. I ✅ (no IA-generated nav/empty copy), Art. III ✅ (no persistence; nav reads only build-time `IS_LOCAL`), Art. IV ✅ (concrete labels; honest empty-state copy), Art. VI ✅ (nav is pure presentational; auth-aware pieces isolated in extras slot), Art. VIII ✅ (tests-first; 0 suppressions).
- **A11y:** WCAG 2.2 AA must-haves (lang, title, header landmark, main landmark, focusable, `:focus-visible`, 24×24 target size, focus return on Esc). Automated contrast check deferred to `020-a11y-automated-audit`.
- **Commits:** `a8193ae` (PR1 head) → `4b72c4a` (PR2 head, current `main`).
- **Date:** 2026-06-25.

### 021-structured-cv-import-and-job-input (v0.5.3, cross-repo: web frontend + api backend) — ✅ SHIPPED + ARCHIVED

- **Proposal:** [specs/021-structured-cv-import-and-job-input/proposal.md](./021-structured-cv-import-and-job-input/proposal.md)
- **Spec:** [specs/021-structured-cv-import-and-job-input/spec.md](./021-structured-cv-import-and-job-input/spec.md)
- **Design:** [specs/021-structured-cv-import-and-job-input/design.md](./021-structured-cv-import-and-job-input/design.md)
- **Tasks:** [specs/021-structured-cv-import-and-job-input/tasks.md](./021-structured-cv-import-and-job-input/tasks.md)
- **Archive:** [specs/021-structured-cv-import-and-job-input/archive-report.md](./021-structured-cv-import-and-job-input/archive-report.md)
- **Estado:** Replaces free-text `{CvText, JobText}` with typed JSON end-to-end. CV flows as JSON Resume `CvDocument` with `confidence` markers (`inferred` | `explicit` | `user_confirmed`); job flows as mandatory `JobSpec` (Zod web + FluentValidation api). Scoring emits per-section breakdown + red flags (employment gaps >6mo, job-hopping ≥3 <18mo in 5y). `engineVersion` bumps MAYOR `1.0.0 → 2.0.0` (Constitution Art. II SemVer seal). v1 path reachable via `engineVersion: "1.0.0"` shim for one release cycle.
- **Backend counterpart:** [../BuildCv-api/specs/000-INDEX.md#021-structured-cv-import-and-job-input](../BuildCv-api/specs/000-INDEX.md) (✅ SHIPPED + ARCHIVED, tag `021-structured-cv-import-and-job-input-v1.0`).
- **Tags:** `021-structured-cv-import-and-job-input-v1.0` (HEAD web `82a400b`, HEAD api `5d40a53`, NOT pushed by archive per project rules).
- **Delivery:** 6 chained PRs + 1 followup (`feature/021-structured-cv-import-and-job-input`). 23 work-unit commits web + 11 work-unit commits api + 1 typo fix web. All merged to `main` and pushed to `origin` in BOTH repos before archive.
- **Engine version:** `2.0.0` (bumped from `1.0.0`; v1 path retained via `engineVersion: "1.0.0"` for one release cycle).
- **Path frontend (web):** `lib/editor/schema/jsonresume.ts` (12 Zod schemas, Colombian `datosPersonales`) + `lib/editor/types.ts` (re-exports + `migrateLegacyToJsonResume` bridge) + `components/editor/{basics-form,work-list,education-list,skills-by-category,_shared/*}.tsx` + `lib/editor/confidence-promotion.ts` (pure `promoteConfidence(cv, touched)`) + `lib/job/{job-spec,cv-document}.ts` + `components/analyzer/{job-spec-form,section-breakdown}.tsx` + `lib/observability/{log-store,types}.ts` (engineVersion tagging) + `__tests__/fixtures/json-resume/*.json` (golden fixtures).
- **Stack shipped:** `zod@^3` (already in stack) — no new runtime deps. axe-aligned in-house rule set (per 019 pattern); `@axe-core/playwright` deferred to 020.
- **Feature flag:** `NEXT_PUBLIC_STRUCTURED_INPUT=true` (default in `.env.example` + `.env.local`); flip to `"false"` for instant rollback (no redeploy needed).
- **Delta specs synced:** `BuildCv-web/specs/{006-web-cv-editor,008-observability-web}/spec.md` (web, +v2.0.0 section) + `BuildCv-api/specs/{002-score-engine,005-cv-pdf-docx-import}/spec.md` (api, +v2.0.0 section). New cross-cutting sub-specs (`score-section-breakdown`, `structured-job-spec`) preserved in `specs/021-structured-cv-import-and-job-input/specs/` as audit trail.
- **Constitution compliance:** Art. I ✅ (parser only INFERs + `promoteConfidence` only on editor blur; never auto-promote to `user_confirmed`), Art. II ✅ (`ScoringEngine.Version` sealed at compile-time; determinism property test 1000 iter + parallel byte-identical), Art. III ✅ (zero server-side persistence; `LocalStorageCvStore` v2 path; rollback has no data impact), Art. IV ✅ (honest copy in `lib/copy/es.ts`; no "ATS oficial"), Art. V ✅ (Zod + FluentValidation anti-prompt-injection; JobSpec validator rejects control chars + zero-width + known injection substrings), Art. VI ✅ (Domain pure; `ICvParser` port extended via discriminated-union `ParseResult`; no new ports needed), Art. VIII ✅ (TDD on every handler + adapter + UI component; 0 suppressions across both repos).
- **A11y:** WCAG 2.2 AA must-haves (`role="progressbar"` + `aria-valuemin/max/now` on 5 per-section bars; `role="list"`/`role="listitem"` for red flags; severity badge `aria-label`s; `data-testid` discriminators for e2e; all section forms keyboard-reachable via Tab; submit buttons distinguishable).
- **Commits web (23 work-unit):** `30672b4` (PR1 Zod+types) → `9eadbc0` (PR2a docs) → `5739415` (PR2b docs) → `1a7f95f` (PR2c docs) → `03f3672` (PR2e web consumer) → `bd7c8f0` (PR3b docs) → `9550792` (PR3c web) → `2bea434` (PR3d docs) → `ef22c59` (PR4a Zod schemas) → `f332f80` (PR4b types) → `2baf9b0` (PR4c section components) → `0bc5ed8` (PR4d promoteConfidence) → `82c0bfd` (PR4e editor migration + flag) → `4b97a06` (PR5a JobSpecForm) → `6d006ee` (PR5b InputPanel + Analyzer wired) → `a5f50be` (PR5c SectionBreakdown) → `38577ec` (PR5d observability) → `af59e67` (PR6a Playwright e2e) → `79242b2` (PR6b axe-aligned a11y) → `07a9142` (PR6c golden fixtures + round-trip) → `b75c5b1` (PR6d INDEX sync + proposal final-status) → `55985f3` (followups-1: 8 e2e tests migrated + AnalizarScreen job-lift fix) → `c9b893a` (merge) → `82a400b` (typo fix `020→021`).
- **Commits api (11 work-unit):** `5f3982a` (PR1 FluentValidation + CvDocument + ScoreCvCommand) → `bcbd078` (PR2a IStructuredParser) → `7dd0089` (PR2b PdfPigCvParser) → `9456bbc` (PR2c OpenXmlCvParser) → `a4c4277` (PR2d ParserRouter) → `2194c92` (PR2e ImportEndpoints) → `1628a5f` (PR3a Domain types PerSectionScore/RedFlag) → `64c3987` (PR3b ScoreV2 pure function) → `3afbe26` (PR3c sealed v2.0.0 + handler dispatch) → `26cdd2b` (PR3d determinism property test) → `6f0456f` (PR6d constitution SemVer note + INDEX sync) → `5d40a53` (merge).
- **Date:** 2026-06-26.

## Features PLANEADAS (v1 backlog)

### 009-auth-web (v1)

- **Estado:** 📋 PLANEADO. Spec aún no escrita.
- **Bloqueado por:** gate Habeas Data (Art. IX) — consentimiento expreso del usuario.

### 010-payments-web (v1)

- **Estado:** 📋 PLANEADO. Spec aún no escrita.
- **Bloqueado por:** gates Art. IX (ZDR + Habeas Data) + Wompi integration.

### 020-a11y-automated-audit (v0.5.3) — seguimiento de 019

- **Estado:** 📋 PLANEADO. Spec aún no escrita.
- **Bloqueado por:** WARNING-2 del verify-report de 019 — REQ-A11Y-002 (contraste WCAG 4.5:1) no se puede verificar automáticamente porque `@axe-core/playwright` no está instalado.
- **Objetivo:** instalar `@axe-core/playwright` (o alternativamente Lighthouse CI), reemplazar el in-house axe-core rule set, y cubrir REQ-A11Y-002 + advanced ARIA checks. **Cierra WARNING-1 también** (bajar branches de `<EmptyState>` ≥ 90% agregando 1 test del secondary CTA o removerlo — decision al spec).
- **Tamaño:** M (1-2 horas).

## Features ARCHIVADAS

### 001-web-mvp-original

- **Status:** 🗄️ Archivado. La spec original cubría score + adapt + export en una sola página.
- **Archive:** [specs/_archive/001-web-mvp-original/](./_archive/001-web-mvp-original/)
- **Razón del archivo:** scope demasiado grande, specs pequeñas son más testeables.

## Próximos pasos (backlog, en orden de desbloqueo)

1. **020-a11y-automated-audit (v0.5.3)** — desbloqueado. Cierra WARNING-2 de 019 (instalar `@axe-core/playwright` o Lighthouse CI para verificar REQ-A11Y-002 contraste + advanced ARIA). Effort M (1-2 h). **Recomendado como próximo feature**.
2. **009-auth-web (v1)** — bloqueado por gate Habeas Data (Art. IX). Habilita cuentas, historial, sync entre devices. Sugerencia: extraer `<CreditArea>` de `/analizar` a `<HeaderExtras>` slot (SUGGESTION-1 del verify-report de 019) durante PR1 de 009.
3. **010-payments-web (v1)** — bloqueado por gates Art. IX (ZDR + Habeas Data) + Wompi integration. Monetización.
4. **v1 polish sprints** (opcional) — agregar Tiptap al editor (deuda documentada en `006-web-cv-editor/tasks.md`), i18n (en/pt), 008-observability-api (backend), accessibility audit WCAG 2.2 AAA.

## Reglas de mantenimiento

1. **Cada feature frontend DEBE referenciar su contraparte backend** en el spec. Sin excepción.
2. **El INDEX se actualiza AL COMMITEAR** el commit que cierra la feature.
3. **Las BFF routes** se documentan con el endpoint backend que proxyean.
4. **El frontend NUNCA habla directo con el backend** — siempre via BFF (`app/api/*/route.ts`).
5. **Copy en `lib/copy/es.ts`** — nunca hardcodeado en componentes (Constitution Art. IV).
6. **0 supresiones** — no `// @ts-ignore`, no `// eslint-disable-next-line`.
7. **Persistencia local SOLO vía `ICvStore`** (Constitution Art. III v1.1.0). Nunca `localStorage.setItem` directo en componentes.
8. **Botón "Limpiar borrador"** en cualquier feature que toque persistencia local (FR-040b).

## Convenciones de naming

- `NNN-web-kebab-case-name/` — NNN es el número correlativo con el backend.
- Ejemplos: `002-web-score-ui/`, `003-web-adapt-ui/`, `004-web-export-ui/`, `005-web-cv-import-ui/`, `006-web-cv-editor/`.
- `000-INDEX.md` (este archivo) es la única excepción al patrón numérico.
- Sub-features de una feature existente usan sufijo: `NNN-web-feature-name/sub-feature/`.

## Stack técnico

- **Next.js 16.2.7** (App Router) + React 19.2.4
- **TypeScript ^5 strict**
- **Tailwind CSS v4** (PostCSS via `@tailwindcss/postcss`)
- **pnpm 11** (frozen lockfile en CI)
- **Node 22+**
- **Sin librería UI externa** — diseño custom (consistente en todo el proyecto)
- **Helpers de observabilidad/diff/parsing** (no son librería UI): `web-vitals@^4` (Core Web Vitals en dev overlay), `react-error-boundary@^5` (error boundary global), `diff@^5` (jsdiff, word-level Myers diff para 006b), `zod@^3` (schemas de validación para 006)

## Constitución cumplimiento (frontend)

- **Art. I (Cero invención)**: el editor (006) valida con Zod que toda entidad provenga de tokens del usuario (defense in depth FR-029a). El diff viewer (006b) bloquea "Aceptar y exportar" si hay invenciones Hard pendientes.
- **Art. III (Privacidad)**: BFF same-origin oculta el backend. Persistencia local SOLO en dispositivo del usuario vía `ICvStore` (v1.1.0). Botón "Limpiar borrador" obligatorio. Copy: "Tus datos no entrenan ninguna IA y no se guardan en nuestros servidores."
- **Art. IV (Encuadre honesto)**: copy en `lib/copy/es.ts` dice "coincidencia con la vacante + legibilidad", nunca "ATS oficial".
- **Art. V (Entrada como dato)**: nunca `dangerouslySetInnerHTML` con CV/vacante. Parsed text del import (005) se trata como dato, no se renderiza como HTML.
- **Art. VI (Clean Arch)**: BFF = `app/api/*` proxyea al backend. Browser NUNCA habla directo. Puertos frontend: `ICvStore` (storage local del editor 006), `ICvParser` (puerto backend del import 005 — `PdfCvParser` / `DocxCvParser`).

## Links externos

- **Backend INDEX:** [../BuildCv-api/specs/000-INDEX.md](../BuildCv-api/specs/000-INDEX.md)
- **Constitution:** [../BuildCv-api/.specify/memory/constitution.md](../BuildCv-api/.specify/memory/constitution.md) (v1.1.0, ley suprema)
- **AGENTS.md:** [../AGENTS.md](../AGENTS.md) (tarjeta de identidad del sub-proyecto)
- **Spec-kit:** [.specify/](../.specify/) (CLI, scripts bash, plantillas)
