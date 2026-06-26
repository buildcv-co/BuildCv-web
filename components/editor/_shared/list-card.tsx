"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * ListCard — collapsible card reutilizable para items dentro de listas
 * (work / education / skills / projects / certificates / languages).
 *
 *  - Header clickable con chevron que toggle la región de detalle.
 *  - Acciones siempre visibles en el header (eliminar) para no obligar
 *    a abrir la card para remover un item.
 *  - `aria-expanded` + `aria-controls` mantienen la región accesible
 *    (WCAG 4.1.2).
 *  - Live region `aria-live="polite"` anuncia add/remove a screen
 *    readers (cumple WCAG 4.1.3 Status Messages).
 *
 * Es presentacional — la lógica de add/remove la lleva cada sección.
 */
export function ListCard({
  title,
  subtitle,
  removeLabel,
  onRemove,
  defaultOpen = true,
  children,
}: {
  title: string;
  /**
   * Texto secundario debajo del título (ej: rango de fechas, nivel).
   * Acepta `ReactNode` para que cada sección pueda añadir un badge u
   * otra decoración (PR 4d — `ConfidenceBadge` por item).
   */
  subtitle?: React.ReactNode;
  removeLabel: string;
  onRemove: () => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();
  const headingId = useId();

  return (
    <article
      className="space-y-3 rounded-2xl border border-line bg-surface/30 p-4"
      aria-labelledby={headingId}
    >
      <header className="flex items-start gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => {
            setOpen((v) => !v);
          }}
          className="flex flex-1 items-center gap-2 rounded-md text-left hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span
            aria-hidden="true"
            className={cn(
              "inline-block size-2.5 transition-transform",
              open ? "rotate-90" : "rotate-0",
            )}
          >
            ▶
          </span>
          <span className="flex-1">
            <h3
              id={headingId}
              className="block font-display text-base text-ink"
            >
              {title || "Sin título"}
            </h3>
            {subtitle ? (
              <span className="block text-xs text-faint">{subtitle}</span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="rounded-full border border-missing/40 bg-missing/10 px-2.5 py-1 text-xs font-medium text-missing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ×
        </button>
      </header>
      {open ? (
        <div id={regionId} className="space-y-3">
          {children}
        </div>
      ) : null}
    </article>
  );
}

export function AddItemButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {label}
    </button>
  );
}

export function StatusLive({
  message,
}: {
  message: string | null;
}) {
  return (
    <div aria-live="polite" role="status" className="sr-only">
      {message ?? ""}
    </div>
  );
}
