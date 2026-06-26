"use client";

import { Fragment, useId, useState } from "react";
import type { Work } from "@/lib/editor/types";
import { Field, inputClass } from "./_shared/form-field";
import { AddItemButton, ListCard, StatusLive } from "./_shared/list-card";
import { ConfidenceBadge } from "./_shared/confidence-badge";

/**
 * WorkList — shell presentacional para la sección `work` del editor
 * JSON Resume.
 *
 * Cada work item se renderiza en un `ListCard` collapsible con:
 *  - Empresa, cargo, fechas (start/end), resumen, highlights[].
 *  - `endDate` admite string vacío (mapea a `null`); checkbox
 *    "Trabajo actual" mapea al literal `"Present"` (UX del editor
 *    preserva el marker en el scoring).
 *  - Highlights[] es un textarea con bullets (uno por línea) — el patrón
 *    open-resume estándar.
 *  - `ConfidenceBadge` por item (PR 4d) muestra el `ConfidenceMarker` del
 *    campo `position` — la cara más visible del item.
 *
 * "Agregar experiencia" crea un item con TODO `confidence:
 * "user_confirmed"` porque el usuario lo está creando activamente.
 * PR 4d extiende la regla: editar un field existente también promueve
 * `inferred → user_confirmed` solo en ese field.
 */
export function WorkList({
  items,
  onChange,
}: {
  items: ReadonlyArray<Work>;
  onChange: (next: ReadonlyArray<Work>) => void;
}) {
  const id = useId();
  const [status, setStatus] = useWorkStatus();

  const appendBlank = () => {
    const blank: Work = {
      name: "",
      position: "",
      startDate: "2024-01",
      endDate: null,
      summary: "",
      highlights: [],
      confidence: {
        name: "user_confirmed",
        position: "user_confirmed",
        startDate: "user_confirmed",
        endDate: "user_confirmed",
        summary: "user_confirmed",
        highlights: "user_confirmed",
      },
    };
    onChange([...items, blank]);
    setStatus(`Experiencia ${items.length + 1} agregada`);
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setStatus(`Experiencia ${index + 1} eliminada`);
  };

  const updateAt = (index: number, patch: Partial<Work>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-4 rounded-2xl border border-line bg-surface/30 p-5"
    >
      <header className="flex items-end justify-between gap-3">
        <h2 id={`${id}-title`} className="font-display text-xl text-ink">
          Experiencia
        </h2>
        <AddItemButton label="+ Agregar experiencia" onClick={appendBlank} />
      </header>

      {items.length === 0 ? (
        <p className="text-xs text-faint">
          Aún no agregaste experiencia. Hacé click en &ldquo;Agregar experiencia&rdquo;.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((w, idx) => (
            <li key={idx}>
              <ListCard
                title={`${w.position || "Cargo"} — ${w.name || "Empresa"}`}
                subtitle={
                  <Fragment>
                    <span>{formatDateRange(w)}</span>
                    <ConfidenceBadge
                      marker={w.confidence.position}
                      value={w.position}
                    />
                  </Fragment>
                }
                removeLabel={`Eliminar experiencia ${idx + 1}`}
                onRemove={() => {
                  removeAt(idx);
                }}
              >
                <WorkItemFields
                  idPrefix={`${id}-work-${idx}`}
                  item={w}
                  onChange={(patch) => {
                    updateAt(idx, patch);
                  }}
                  onEndDateFocus={() => {
                    // Auto-flow: tras tab desde startDate, focus endDate.
                    // El componente ya tabula naturalmente al siguiente
                    // input; este hook queda como hook explícito para
                    // tests de integración.
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

function useWorkStatus(): [string | null, (s: string) => void] {
  const [status, setStatus] = useState<string | null>(null);
  return [status, setStatus];
}

function formatDateRange(w: Work): string {
  const start = w.startDate;
  const end = w.endDate === "Present" ? "Presente" : w.endDate ?? "—";
  return `${start} → ${end}`;
}

function WorkItemFields({
  idPrefix,
  item,
  onChange,
  onEndDateFocus,
}: {
  idPrefix: string;
  item: Work;
  onChange: (patch: Partial<Work>) => void;
  onEndDateFocus: () => void;
}) {
  const highlightsText = (item.highlights ?? []).join("\n");
  const isPresent = item.endDate === "Present";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Empresa" htmlFor={`${idPrefix}-name`}>
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={item.name}
            onChange={(e) => {
              onChange({ name: e.target.value });
            }}
            className={inputClass()}
          />
        </Field>
        <Field label="Cargo" htmlFor={`${idPrefix}-position`}>
          <input
            id={`${idPrefix}-position`}
            type="text"
            value={item.position}
            onChange={(e) => {
              onChange({ position: e.target.value });
            }}
            className={inputClass()}
          />
        </Field>
        <Field label="Fecha inicio (YYYY-MM)" htmlFor={`${idPrefix}-start`}>
          <input
            id={`${idPrefix}-start`}
            type="month"
            value={item.startDate}
            onChange={(e) => {
              onChange({ startDate: e.target.value });
            }}
            className={inputClass()}
          />
        </Field>
        <Field
          label="Fecha fin (YYYY-MM)"
          htmlFor={`${idPrefix}-end`}
          hint='Marcá "Trabajo actual" si seguís ahí'
        >
          <input
            id={`${idPrefix}-end`}
            type="month"
            value={isPresent ? "" : (item.endDate ?? "")}
            disabled={isPresent}
            onChange={(e) => {
              onChange({ endDate: e.target.value || null });
            }}
            onFocus={onEndDateFocus}
            className={inputClass()}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={isPresent}
          onChange={(e) => {
            onChange({ endDate: e.target.checked ? "Present" : null });
          }}
          className="size-4 accent-[var(--color-accent)]"
        />
        Trabajo actual
      </label>
      <Field label="Resumen" htmlFor={`${idPrefix}-summary`}>
        <textarea
          id={`${idPrefix}-summary`}
          rows={2}
          value={item.summary ?? ""}
          onChange={(e) => {
            onChange({ summary: e.target.value || undefined });
          }}
          className={inputClass()}
        />
      </Field>
      <Field
        label="Logros / highlights"
        htmlFor={`${idPrefix}-highlights`}
        hint="Un logro por línea"
      >
        <textarea
          id={`${idPrefix}-highlights`}
          rows={4}
          value={highlightsText}
          onChange={(e) => {
            const arr = e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            onChange({ highlights: arr });
          }}
          className={inputClass("font-mono text-xs")}
        />
      </Field>
    </div>
  );
}
