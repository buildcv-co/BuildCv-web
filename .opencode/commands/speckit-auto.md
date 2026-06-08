---
description: AUTO-MODE spec-kit pipeline: /speckit.specify → /speckit.plan → /speckit.tasks → /speckit.implement. Runs the entire spec-driven development flow in a single command, no prompts. Use this in BuildCv-api or BuildCv-web for feature work.
---

# /speckit-auto — Full spec-kit pipeline in auto mode

## What this does

Runs the full Spec-Driven Development flow for a new feature without any interactive prompts:

1. `/speckit.specify <description>` — creates `specs/NNN-<name>/spec.md` from your description
2. `/speckit.clarify` — fills in `[NEEDS CLARIFICATION]` markers with reasonable defaults (auto-resolve, do not prompt)
3. `/speckit.plan` — generates `plan.md` + `data-model.md` + `research.md` + `quickstart.md` + `contracts/`
4. `/speckit.tasks` — generates `tasks.md` with TDD-aware task ordering
5. `/speckit.checklist` — generates quality checklist for the spec
6. `/speckit.analyze` — cross-artifact consistency check
7. `/speckit.implement` — executes tasks with strict TDD

## When to use this

- Inside `BuildCv-api/` or `BuildCv-web/`, NOT at the monorepo root.
- When you have a clear feature description and want everything generated + implemented in one shot.
- When you don't want to babysit the spec-kit flow.

## Constitution precedence (MANDATORY)

Before running any phase, read the **BuildCv constitution at `../BuildCv-api/.specify/memory/constitution.md`**. The 9 articles of THIS constitution **override** any spec-kit defaults. Cite the article (I-IX) in each PR/commit.

Constitution articles that apply to the frontend (BuildCv-web):

- **Art. III** Privacidad — no telemetry, no localStorage con CV/vacante, headers CSP.
- **Art. IV** Encuadre honesto — copy correcto, "coincidencia + legibilidad".
- **Art. V** Entrada como dato — no `dangerouslySetInnerHTML`, validación client.
- **Art. VI** Clean Arch — BFF = `app/api/*` proxyea al backend.
- **Art. VII** v0 sin fricción — sin auth, sin DB, sin cookies persistentes.

## AUTO behavior

- **DO NOT** invoke `/speckit.constitution` (it is disabled).
- **DO NOT** prompt the user for `[NEEDS CLARIFICATION]` answers — auto-resolve with reasonable defaults and document them in `spec.md` under "Auto-resolved clarifications".
- **DO NOT** pause between phases. Run them sequentially.
- **IF** any phase produces a critical failure, STOP and report.
- **IF** tasks.md forecasts > 400 changed lines, split into chained PRs.

## How to invoke

```
/speckit-auto <feature description>
```

Examples:

```
/speckit-auto UI for adapted CV preview with diff against original
/speckit-auto Export adapted CV to PDF (download button + progress)
/speckit-auto Landing page redesign with honesty note as primary CTA
```

## Output

A final summary block listing:

- Spec number (NNN) generated
- Files created
- Tests written + passing
- Constitution articles cited
- PR-ready branch name

## Failure recovery

If a phase fails, the command:

1. Saves the partial state to engram (topic_key: `sdd-spec-kit-auto/<feature>/partial`)
2. Reports which phase failed and why
3. Suggests the manual command to retry that phase

Re-invoking `/speckit-auto <same feature>` will pick up from the partial state.
