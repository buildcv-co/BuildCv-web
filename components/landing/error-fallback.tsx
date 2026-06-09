import type { ReactNode } from "react";
import Link from "next/link";

/**
 * ErrorFallback — UI compartida para app/not-found.tsx, app/error.tsx
 * y app/global-error.tsx. Acepta props para que cada call site controle
 * CTAs (retry, home, extra links).
 *
 * Renders role="alert" para que screen readers anuncien el error
 * (WCAG 2.2 AA).
 */
export interface ErrorFallbackProps {
  readonly title: string;
  readonly detail: string;
  readonly onRetry?: () => void;
  readonly retryLabel?: string;
  readonly showHomeLink?: boolean;
  readonly homeLabel?: string;
  readonly children?: ReactNode;
}

export function ErrorFallback({
  title,
  detail,
  onRetry,
  retryLabel = "Reintentar",
  showHomeLink = false,
  homeLabel = "Volver al inicio",
  children,
}: ErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="mx-auto w-full max-w-2xl px-6 py-20"
      aria-live="polite"
    >
      <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg text-muted">{detail}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-accent px-6 py-2.5 font-medium text-accent-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {retryLabel}
          </button>
        ) : null}
        {showHomeLink ? (
          <Link
            href="/"
            className="rounded-full border border-line px-6 py-2.5 text-ink transition hover:border-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {homeLabel}
          </Link>
        ) : null}
        {children}
      </div>
    </div>
  );
}
