"use client";

import { Fragment, useId, useState } from "react";
import type { Education } from "@/lib/editor/types";
import { Field, inputClass } from "./_shared/form-field";
import { AddItemButton, ListCard, StatusLive } from "./_shared/list-card";
import { ConfidenceBadge } from "./_shared/confidence-badge";

/**
 * EducationList — shell presentacional para la sección `education` del
 * editor JSON Resume. Mismo patrón que `WorkList`: ListCard collapsible
 * por item, add/remove con estado de confianza `user_confirmed` para los
 * items nuevos, status live para anunciar cambios (WCAG 4.1.3).
 *
 * `ConfidenceBadge` por item (PR 4d) refleja el `ConfidenceMarker` de
 * `institution` — la cara más visible del item.
 */
export function EducationList({
  items,
  onChange,
}: {
  items: ReadonlyArray<Education>;
  onChange: (next: ReadonlyArray<Education>) => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<string | null>(null);

  const appendBlank = () => {
    const blank: Education = {
      institution: "",
      area: "",
      studyType: "",
      startDate: "2020-01",
      endDate: null,
      score: "",
      courses: [],
      confidence: {
        institution: "user_confirmed",
        area: "user_confirmed",
        studyType: "user_confirmed",
        startDate: "user_confirmed",
        endDate: "user_confirmed",
        score: "user_confirmed",
      },
    };
    onChange([...items, blank]);
    setStatus(`Educación ${items.length + 1} agregada`);
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setStatus(`Educación ${index + 1} eliminada`);
  };

  const updateAt = (index: number, patch: Partial<Education>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-4 rounded-2xl border border-line bg-surface/30 p-5"
    >
      <header className="flex items-end justify-between gap-3">
        <h2 id={`${id}-title`} className="font-display text-xl text-ink">
          Educación
        </h2>
        <AddItemButton label="+ Agregar educación" onClick={appendBlank} />
      </header>

      {items.length === 0 ? (
        <p className="text-xs text-faint">
          Aún no agregaste educación. Hacé click en &ldquo;Agregar educación&rdquo;.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((ed, idx) => (
            <li key={idx}>
              <ListCard
                title={`${ed.studyType || "Estudio"} — ${ed.institution || "Institución"}`}
                subtitle={
                  <Fragment>
                    <span>{formatEduDateRange(ed)}</span>
                    <ConfidenceBadge
                      marker={ed.confidence.institution}
                      value={ed.institution}
                    />
                  </Fragment>
                }
                removeLabel={`Eliminar educación ${idx + 1}`}
                onRemove={() => {
                  removeAt(idx);
                }}
              >
                <EducationItemFields
                  idPrefix={`${id}-edu-${idx}`}
                  item={ed}
                  onChange={(patch) => {
                    updateAt(idx, patch);
                  }}
                />
              </ListCard>
            </li>
          ))}
        </ul>
      )}

      <StatusLive message={status} />
    </section>
  );
}

function formatEduDateRange(e: Education): string {
  const start = e.startDate ?? "—";
  const end = e.endDate ?? "—";
  return `${start} → ${end}`;
}

function EducationItemFields({
  idPrefix,
  item,
  onChange,
}: {
  idPrefix: string;
  item: Education;
  onChange: (patch: Partial<Education>) => void;
}) {
  const coursesText = (item.courses ?? []).join("\n");
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Institución" htmlFor={`${idPrefix}-inst`}>
          <input
            id={`${idPrefix}-inst`}
            type="text"
            value={item.institution}
            onChange={(e) => {
              onChange({ institution: e.target.value });
            }}
            className={inputClass()}
          />
        </Field>
        <Field label="Tipo de estudio" htmlFor={`${idPrefix}-type`}>
          <input
            id={`${idPrefix}-type`}
            type="text"
            value={item.studyType ?? ""}
            onChange={(e) => {
              onChange({ studyType: e.target.value || undefined });
            }}
            className={inputClass()}
          />
        </Field>
        <Field label="Área" htmlFor={`${idPrefix}-area`}>
          <input
            id={`${idPrefix}-area`}
            type="text"
            value={item.area ?? ""}
            onChange={(e) => {
              onChange({ area: e.target.value || undefined });
            }}
            className={inputClass()}
          />
        </Field>
        <Field label="Nota / promedio" htmlFor={`${idPrefix}-score`}>
          <input
            id={`${idPrefix}-score`}
            type="text"
            value={item.score ?? ""}
            onChange={(e) => {
              onChange({ score: e.target.value || undefined });
            }}
            className={inputClass()}
          />
        </Field>
        <Field label="Fecha inicio (YYYY-MM)" htmlFor={`${idPrefix}-start`}>
          <input
            id={`${idPrefix}-start`}
            type="month"
            value={item.startDate ?? ""}
            onChange={(e) => {
              onChange({ startDate: e.target.value || undefined });
            }}
            className={inputClass()}
          />
        </Field>
        <Field label="Fecha fin (YYYY-MM)" htmlFor={`${idPrefix}-end`}>
          <input
            id={`${idPrefix}-end`}
            type="month"
            value={item.endDate ?? ""}
            onChange={(e) => {
              onChange({ endDate: e.target.value || null });
            }}
            className={inputClass()}
          />
        </Field>
      </div>
      <Field
        label="Cursos relevantes"
        htmlFor={`${idPrefix}-courses`}
        hint="Un curso por línea"
      >
        <textarea
          id={`${idPrefix}-courses`}
          rows={3}
          value={coursesText}
          onChange={(e) => {
            const arr = e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            onChange({ courses: arr });
          }}
          className={inputClass("font-mono text-xs")}
        />
      </Field>
    </div>
  );
}
