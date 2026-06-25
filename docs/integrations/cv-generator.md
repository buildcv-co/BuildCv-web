# CV Generator Integration

`~/Documentos/CV_generator:main` is a separate repository that generates CVs in
Markdown / PDF format. BuildCv consumes those CVs through the iteration loop
(`POST /api/v1/adapt/iterate`) after the user has adapted them to a vacancy.

## v1 (current) — manual upload

In v1, there is **no direct API integration**. The user must complete these
steps before iterating:

1. **Generate the CV** in `CV_generator` (Markdown output recommended).
2. **Upload it to BuildCv** via the existing import endpoint:
   - `POST /api/v1/import` (BuildCv backend)
   - proxy: `POST /api/import` (BuildCv-web BFF)
   - accepts PDF / DOCX / Markdown; returns plain text + detected sections.
3. **Paste the parsed text** into the iteration request body (`cvText` field):
   - `POST /api/v1/adapt/iterate` (BuildCv backend)
   - proxy: `POST /api/adapt/iterate` (BuildCv-web BFF)
   - body: `{ cvText, vacancyText, iterationCount, probabilityThreshold }`
4. **Review the result** on `/analizar/iterate` — best step, all steps,
   probability warning (Art. IV honest copy).

This flow reuses existing 005-cv-pdf-docx-import infrastructure; no new
backend endpoint is required for v1.

## v2 (deferred) — direct API integration

Direct integration with `CV_generator`'s API is **out of scope for v1** and
deferred to a future milestone. When implemented, the rough shape will be:

- `CV_generator` POSTs a webhook to BuildCv when the user exports a CV.
- BuildCv enqueues an iteration loop against the user's last target vacancy.
- The iteration result is surfaced in the user's BuildCv dashboard.

Constraints inherited from the constitution:

- **Art. III (Privacidad primero)** — webhook payload contains only metadata
  + parsed text; the user's CV never leaves BuildCv in clear text via the
  webhook URL (HTTPS + signed payload).
- **Art. IV (Encuadre honesto)** — UI copy in the integration banner must
  avoid "garantizado", "perfect match", "alto porcentaje de éxito".
- **Art. IX (Habeas Data)** — webhook must respect the user's data-export /
  delete preferences (009 ARCO endpoints).

## Why v1 defers v2

- **Spec scope**: 018-cv-iteration-loop explicitly lists direct integration in
  its "Out of scope (deferred)" section.
- **Manual upload is already proven**: 005 has shipped and is exercised by
  ~1k real users; the import → iterate path works end-to-end.
- **Auth surface**: a direct API integration requires a shared secret or
  OAuth handshake between two independent repos; that is non-trivial and
  belongs in its own spec.