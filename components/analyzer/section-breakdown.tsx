"use client";

/**
 * <SectionBreakdown> — render del response v2 del backend (PR 5c).
 *
 * Recibe `perSection` (5 secciones tipadas con score 0–100 o `null`)
 * + `redFlags[]` (severidad low/medium/high) y los proyecta en dos
 * bloques visuales:
 *
 *   1. **Barras por sección** — `role="progressbar"` con `aria-valuenow`,
 *      fill de 0% a 100% según el score. Cada sección tiene un label
 *      semántico + descripción. Casos extremos: `null` → "Sin datos";
 *      `0` → "Vacío"; `100` → "Completo".
 *
 *   2. **Lista de red flags** — `role="list"` con cada flag como
 *      `role="listitem"`. Badge de severidad color-coded via
 *      `data-severity` (proxy semántico para el color, no usamos clases
 *      CSS para el asserto — el `data-attribute` sobrevive refactors de
 *      styling). Severidad `high` recibe ícono de advertencia
 *      (`⚠`, `aria-hidden`) y `aria-label` descriptivo para screen
 *      readers (accesibilidad: el color no es accesible, la palabra
 *      transmite la urgencia).
 *
 * Acceptance criteria (espejo de `021/specs/score-section-breakdown/spec.md`):
 *  - Las 5 barras se renderizan SIEMPRE, incluso si `value === null`.
 *  - A11y: progressbar con valuemin/valuemax/valuenow; list con listitem;
 *    severity badge con aria-label semántico.
 *  - Empty state de red flags visible cuando `redFlags.length === 0`.
 *
 * Copy centralizado en `lib/copy/es.ts` bajo `analyze.sections.*` y
 * `analyze.redFlags.*` (Constitution Art. IV — sin hardcode de strings).
 */

import type { PerSectionScore, RedFlag } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

type SectionKey = keyof PerSectionScore;

// Orden canónico de las 5 secciones — estable para que las pruebas no
// dependan del orden de iteración de `Object.entries` (V8 lo respeta,
// pero ser explícitos es cheaper que depurar).
const SECTION_KEYS: readonly SectionKey[] = [
  "experience",
  "education",
  "skills",
  "certifications",
  "contact",
] as const;

// Token CSS por severidad. Aplicado en el badge vía `cn()`; las pruebas
// assertan `data-severity` (semantic), no las clases (que son detalle de
// implementación).
const SEVERITY_BG: Record<RedFlag["severity"], string> = {
  low: "border-line bg-surface/30 text-muted",
  medium: "border-warn bg-warn/10 text-warn",
  high: "border-missing bg-missing/10 text-missing",
};

interface SectionBreakdownProps {
  readonly perSection: PerSectionScore;
  readonly redFlags: readonly RedFlag[];
}

export function SectionBreakdown({
  perSection,
  redFlags,
}: SectionBreakdownProps) {
  return (
    <div className="space-y-12" data-testid="section-breakdown">
      <PerSectionBars perSection={perSection} />
      <RedFlagsList redFlags={redFlags} />
    </div>
  );
}

/**
 * Bloque 1: 5 barras de progreso, una por sección.
 *
 * Cada barra es `role="progressbar"` con `aria-valuenow` numérico
 * (incluso para `null` usamos `0` como valuenow para que el screen reader
 * no se queje; el texto visible "Sin datos" aclara el caso).
 */
function PerSectionBars({ perSection }: { perSection: PerSectionScore }) {
  return (
    <section
      data-testid="section-breakdown-bars"
      aria-labelledby="section-breakdown-bars-title"
    >
      <header className="mb-5">
        <h2 id="section-breakdown-bars-title" className="font-display text-2xl">
          {copy.analyze.sections.title}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {copy.analyze.sections.subtitle}
        </p>
      </header>
      <ul className="space-y-3">
        {SECTION_KEYS.map((key) => (
          <li key={key}>
            <SectionBar
              sectionKey={key}
              label={copy.analyze.sections.sectionLabels[key]}
              description={copy.analyze.sections.sectionDescriptions[key]}
              value={perSection[key]}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Sub-componente `ProgressBar` — extraído en REFACTOR para que
 * `SectionBar` quede como composición limpia.
 *
 * Componente presentacional puro (sin state). Recibe `value` (0–100 o
 * null), un label accesible y un `testId` estable.
 */
function ProgressBar({
  label,
  value,
  testId,
}: {
  label: string;
  value: number | null;
  testId: string;
}) {
  // Para `null`, valuenow=0 (no es medible). El label explica el caso.
  const valuenow = value ?? 0;
  const fillWidth = value === null ? "0%" : `${value}%`;
  const accessibleLabel =
    value === null
      ? `${label}: sin datos`
      : `${label}: ${value} de 100`;
  return (
    <div
      role="progressbar"
      aria-label={accessibleLabel}
      aria-valuenow={valuenow}
      aria-valuemin={0}
      aria-valuemax={100}
      data-testid={testId}
      className="flex items-center gap-3"
    >
      <span
        className="font-mono text-xs text-faint tabular-nums"
        aria-hidden="true"
      >
        0
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface/40">
        <div
          data-testid="section-bar-fill"
          className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-500"
          style={{ width: fillWidth }}
        />
      </div>
      <span
        className="font-mono text-xs text-faint tabular-nums"
        aria-hidden="true"
      >
        100
      </span>
    </div>
  );
}

/**
 * `SectionBar` — fila de una sección (label + descripción + barra +
 * valor). Compone `ProgressBar` con los textos y los marcadores de
 * casos extremos (null → "Sin datos"; 0 → "Vacío"; 100 → "Completo").
 */
function SectionBar({
  sectionKey,
  label,
  description,
  value,
}: {
  sectionKey: SectionKey;
  label: string;
  description: string;
  value: number | null;
}) {
  // Marcador semántico del estado de la sección — surface para que el
  // usuario entienda de un vistazo si la sección está vacía (0),
  // completa (100) o no medible (null). El número crudo igual se
  // muestra para usuarios que prefieren el dato exacto.
  const stateCopy =
    value === null
      ? copy.analyze.sections.noData
      : value === 0
        ? copy.analyze.sections.empty
        : value === 100
          ? copy.analyze.sections.full
          : null;

  return (
    <article
      data-testid={`section-row-${sectionKey}`}
      data-section={sectionKey}
      className="rounded-xl border border-line bg-surface/40 p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-ink">{label}</h3>
          <p className="mt-0.5 text-xs text-faint">{description}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              value === null ? "text-faint" : "text-ink",
            )}
          >
            {value === null
              ? copy.analyze.sections.noData
              : `${value}${copy.analyze.sections.scoreUnit}`}
          </span>
          {stateCopy && (
            <span
              data-testid={`section-row-state-${sectionKey}`}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                value === null
                  ? "border-line bg-surface/30 text-faint"
                  : value === 0
                    ? "border-line bg-surface/30 text-faint"
                    : "border-present/40 bg-present/10 text-present",
              )}
            >
              {stateCopy}
            </span>
          )}
        </div>
      </div>
      <div className="mt-3">
        <ProgressBar
          label={label}
          value={value}
          testId={`section-bar-${sectionKey}`}
        />
      </div>
    </article>
  );
}

/**
 * Bloque 2: lista de red flags con badge de severidad.
 *
 * Si `redFlags.length === 0`, renderiza el empty state (semantic
 * `role="status"`) en lugar de una lista vacía.
 */
function RedFlagsList({ redFlags }: { redFlags: readonly RedFlag[] }) {
  return (
    <section
      data-testid="section-breakdown-flags"
      aria-labelledby="section-breakdown-flags-title"
    >
      <header className="mb-5">
        <h2 id="section-breakdown-flags-title" className="font-display text-2xl">
          {copy.analyze.redFlags.title}
        </h2>
      </header>
      {redFlags.length === 0 ? (
        <RedFlagsEmpty />
      ) : (
        <ul role="list" className="space-y-3">
          {redFlags.map((flag) => (
            <li key={flag.code}>
              <RedFlagItem flag={flag} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Sub-componente `RedFlagBadge` — extraído en REFACTOR.
 * Aísla el marcado del badge (severidad + ícono + label) del resto del
 * item para que la composición sea legible y testeable de forma aislada.
 */
function RedFlagBadge({ severity }: { severity: RedFlag["severity"] }) {
  const label = copy.analyze.redFlags.severity[severity];
  const ariaLabel = copy.analyze.redFlags.severityAriaLabel[severity];
  const showWarningIcon = severity === "high";
  return (
    <span
      data-testid={`red-flag-severity-${severity}`}
      data-severity={severity}
      role="status"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        SEVERITY_BG[severity],
      )}
    >
      {showWarningIcon && (
        <span
          data-testid="red-flag-warning-icon"
          aria-hidden="true"
          aria-label={copy.analyze.redFlags.warningIconLabel}
        >
          ⚠
        </span>
      )}
      <span aria-hidden="true">{label}</span>
    </span>
  );
}

function RedFlagItem({ flag }: { flag: RedFlag }) {
  return (
    <article
      data-testid={`red-flag-${flag.code}`}
      role="listitem"
      className="rounded-xl border border-line bg-surface/40 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink">{flag.message}</p>
        <RedFlagBadge severity={flag.severity} />
      </div>
      <p className="mt-2 font-mono text-xs text-faint">
        {copy.analyze.redFlags.codeLabel(flag.code)}
      </p>
    </article>
  );
}

function RedFlagsEmpty() {
  return (
    <p
      data-testid="red-flag-empty"
      role="status"
      className="rounded-xl border border-present/30 bg-present/10 px-4 py-3 text-sm text-present"
    >
      {copy.analyze.redFlags.empty}
    </p>
  );
}
