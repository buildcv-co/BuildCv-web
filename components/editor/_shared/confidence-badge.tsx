import { cn } from "@/lib/utils/cn";
import type { ConfidenceMarker } from "@/lib/editor/types";

const TONE: Record<ConfidenceMarker, string> = {
  inferred: "text-partial border-partial/40 bg-partial/10",
  explicit: "text-present border-present/40 bg-present/10",
  user_confirmed: "text-accent border-accent/40 bg-accent/10",
};

const LABEL: Record<ConfidenceMarker, string> = {
  inferred: "Detectado",
  explicit: "Explícito",
  user_confirmed: "Confirmado por ti",
};

/**
 * ConfidenceBadge — pill visual que indica el `ConfidenceMarker` de un
 * campo (Constitution Art. I). Es decorativo: el accessible name se
 * entrega vía `aria-label` derivado del marcador + valor opcional.
 *
 * Reusado por todas las secciones del editor (PR 4c/4d) y por el badge
 * inline que muestra confianza per-field. Es presentacional — no toca
 * state.
 */
export function ConfidenceBadge({
  marker,
  value,
  className,
}: {
  marker: ConfidenceMarker;
  value?: string;
  className?: string;
}) {
  const accessible = value ? `${LABEL[marker]}: ${value}` : LABEL[marker];
  return (
    <span
      role="note"
      aria-label={accessible}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE[marker],
        className,
      )}
    >
      {LABEL[marker]}
    </span>
  );
}
