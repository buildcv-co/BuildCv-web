"use client";

import { useId, useState } from "react";
import type { Skills } from "@/lib/editor/types";
import { Field, inputClass } from "./_shared/form-field";
import { AddItemButton, ListCard, StatusLive } from "./_shared/list-card";

/**
 * SkillsByCategory — shell presentacional para la sección `skills` del
 * editor JSON Resume. El campo `name` de cada `Skills` ES la categoría
 * (backend ya emite skills agrupados); el componente renderiza un header
 * por categoría con sus keywords[] abajo.
 *
 *  - Cada categoría se renderiza dentro de un `ListCard` para mantener
 *    simetría con WorkList/EducationList (UX consistente).
 *  - Editar `name` cambia la categoría; editar `keywords` reescribe la
 *    lista completa (csv-style: coma-separado o newline — optamos por
 *    newline para listas largas).
 *  - Items nuevos arrancan con `confidence: "user_confirmed"` (regla
 *    "el usuario lo está creando activamente" — ver WorkList para el
 *    rationale; PR 4d extiende la regla).
 */
export function SkillsByCategory({
  items,
  onChange,
}: {
  items: ReadonlyArray<Skills>;
  onChange: (next: ReadonlyArray<Skills>) => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<string | null>(null);

  const appendBlank = () => {
    const blank: Skills = {
      name: "",
      level: "",
      keywords: [],
      confidence: {
        name: "user_confirmed",
        level: "user_confirmed",
        keywords: "user_confirmed",
      },
    };
    onChange([...items, blank]);
    setStatus(`Habilidad ${items.length + 1} agregada`);
  };

  const removeAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setStatus(`Habilidad ${index + 1} eliminada`);
  };

  const updateAt = (index: number, patch: Partial<Skills>) => {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="space-y-4 rounded-2xl border border-line bg-surface/30 p-5"
    >
      <header className="flex items-end justify-between gap-3">
        <h2 id={`${id}-title`} className="font-display text-xl text-ink">
          Habilidades
        </h2>
        <AddItemButton label="+ Agregar habilidad" onClick={appendBlank} />
      </header>

      {items.length === 0 ? (
        <p className="text-xs text-faint">
          Aún no agregaste habilidades. Hacé click en &ldquo;Agregar habilidad&rdquo;.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((s, idx) => (
            <li key={idx}>
              <ListCard
                title={s.name || "Categoría sin nombre"}
                subtitle={
                  s.level ? `Nivel: ${s.level}` : undefined
                }
                removeLabel={`Eliminar habilidad ${idx + 1}`}
                onRemove={() => {
                  removeAt(idx);
                }}
              >
                <SkillItemFields
                  idPrefix={`${id}-skill-${idx}`}
                  item={s}
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

function SkillItemFields({
  idPrefix,
  item,
  onChange,
}: {
  idPrefix: string;
  item: Skills;
  onChange: (patch: Partial<Skills>) => void;
}) {
  const keywordsText = (item.keywords ?? []).join("\n");
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Categoría" htmlFor={`${idPrefix}-name`}>
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
        <Field label="Nivel (opcional)" htmlFor={`${idPrefix}-level`}>
          <input
            id={`${idPrefix}-level`}
            type="text"
            value={item.level ?? ""}
            onChange={(e) => {
              onChange({ level: e.target.value || undefined });
            }}
            className={inputClass()}
          />
        </Field>
      </div>
      <Field
        label="Palabras clave"
        htmlFor={`${idPrefix}-keywords`}
        hint="Una por línea"
      >
        <textarea
          id={`${idPrefix}-keywords`}
          rows={4}
          value={keywordsText}
          onChange={(e) => {
            const arr = e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            onChange({ keywords: arr });
          }}
          className={inputClass("font-mono text-xs")}
        />
      </Field>
    </div>
  );
}
