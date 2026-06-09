"use client";

import { type ReactNode, type ErrorInfo } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { copy } from "@/lib/copy/es";
import { reportError } from "@/lib/observability/error-reporter";

/**
 * ErrorBoundary — wrapper sobre `react-error-boundary` que captura
 * errores de React render en client components. Complementa
 * `app/error.tsx` (que captura errores de Next.js routing).
 *
 * Spec: 008-web-observability-web · FR-086, FR-087, FR-093.
 */

export type ErrorBoundaryFallback = (
  error: Error,
  reset: () => void,
) => ReactNode;

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onError?: (error: Error, info: ErrorInfo) => void;
  readonly fallback?: ErrorBoundaryFallback;
}

interface DefaultFallbackProps {
  readonly error: Error;
  readonly resetErrorBoundary: () => void;
}

function DefaultFallback({
  error,
  resetErrorBoundary,
}: DefaultFallbackProps): React.JSX.Element {
  return (
    <div role="alert" aria-live="polite" className="px-6 py-12">
      <h2 className="font-display text-2xl">
        {copy.observability.errorBoundary.title}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {copy.observability.errorBoundary.detail}
      </p>
      {error.message ? (
        <p className="mt-2 font-mono text-xs text-faint">{error.message}</p>
      ) : null}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="rounded-full bg-accent px-5 py-2 font-medium text-accent-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copy.observability.errorBoundary.retryLabel}
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundary({
  children,
  onError,
  fallback,
}: ErrorBoundaryProps): React.JSX.Element {
  const Fallback = fallback
    ? ({ error, resetErrorBoundary }: DefaultFallbackProps) => (
        <>
          {fallback(error, () => {
            resetErrorBoundary();
          })}
        </>
      )
    : DefaultFallback;

  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onError={(error: Error, info: ErrorInfo) => {
        reportError(error, { componentStack: info.componentStack ?? "" });
        if (onError) onError(error, info);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
