import Link from "next/link";
import { useId } from "react";

interface EmptyStateProps {
  /** Rendered as <h2>. Short and descriptive (WCAG 2.4.6 Headings and Labels). */
  readonly title: string;
  /** Rendered as <p>. One or two sentences explaining the next concrete step. */
  readonly description: string;
  /** When both are provided, renders a single <Link> as primary CTA. */
  readonly ctaLabel?: string;
  readonly ctaHref?: string;
  /** Optional decorative SVG. Marked aria-hidden — the title is the accessible name. */
  readonly icon?: React.ReactNode;
  /** Optional secondary CTA. */
  readonly secondaryCtaLabel?: string;
  readonly secondaryCtaHref?: string;
}

/**
 * EmptyState — generic, props-driven, zero business logic.
 * Wraps content in <section aria-labelledby='empty-state-title-{id}'>
 * so screen readers announce the title when the user tabs into it.
 * The CTA is a single <Link>; secondary CTA is optional. The icon is
 * decorative (aria-hidden) — the title remains the accessible name.
 */
export function EmptyState({
  title,
  description,
  ctaLabel,
  ctaHref,
  icon,
  secondaryCtaLabel,
  secondaryCtaHref,
}: EmptyStateProps) {
  const titleId = `empty-state-title-${useId()}`;

  return (
    <section
      aria-labelledby={titleId}
      data-testid="empty-state"
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 rounded-3xl border border-line bg-surface/40 p-8 text-center"
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <h2
        id={titleId}
        className="font-display text-2xl text-ink sm:text-3xl"
      >
        {title}
      </h2>
      <p className="max-w-prose text-sm text-muted sm:text-base">
        {description}
      </p>
      {ctaLabel && ctaHref ? (
        <Link
          href={ctaHref}
          data-testid="empty-state-primary-cta"
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {ctaLabel}
        </Link>
      ) : null}
      {secondaryCtaLabel && secondaryCtaHref ? (
        <Link
          href={secondaryCtaHref}
          data-testid="empty-state-secondary-cta"
          className="text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {secondaryCtaLabel}
        </Link>
      ) : null}
    </section>
  );
}