"use client";

import { cn } from "@/lib/utils/cn";

const INPUT =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";

/**
 * Field — wrapper compartido para label + control + hint + error.
 *  - Asocia label por `htmlFor` (WCAG 4.1.2).
 *  - `hint` se referencia via `aria-describedby` para screen readers.
 *  - `error` se anuncia via `role="alert"` (WCAG 4.1.3).
 *
 * Usado por todos los componentes de sección del editor (PR 4c).
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const hintId = `${htmlFor}-hint`;
  const describedBy = [hint ? hintId : null, error ? `${htmlFor}-error` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <div data-described-by={describedBy || undefined}>{children}</div>
      {hint ? (
        <p id={hintId} className="text-xs text-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs font-medium text-missing"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function inputClass(extra?: string): string {
  return cn(INPUT, "w-full", extra);
}

export function SectionHeader({
  title,
  addLabel,
  onAdd,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <button
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {addLabel}
      </button>
    </div>
  );
}
