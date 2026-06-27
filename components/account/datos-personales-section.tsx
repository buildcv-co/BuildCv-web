import { copy } from "@/lib/copy/es";
import { formatRetryAfter } from "@/lib/api/_utils";
import { RateLimitError } from "@/lib/api/user-data";
import type { UserDataResponse } from "@/lib/api/user-data";

/**
 * `<DatosPersonalesSection>` — sección "Tus datos personales" (PR4).
 *
 * Estados:
 *  - `userData === null`: loading skeleton (4 filas `<dd>` con animate-pulse).
 *  - `userData !== null` + sin error: render del `<dl>` con email / provider /
 *    createdAt / lastLoginAt.
 *  - `error instanceof RateLimitError`: banner inline con la fecha formateada
 *    del `Retry-After` (REQ-FN-018, NFR-RATE-1).
 *  - otro error: banner genérico.
 *
 * Footer disclaimer viene de `copy.account.inMemoryNotice` (CR-PRIV-1).
 *
 * Comportamiento:
 *  - `<section id="datos-personales" aria-labelledby="datos-personales-title">`.
 *  - NO loguea email/name (Constitution Art. III, NFR-OBS-1).
 *  - NO expone el backend JWT (CR-TOK-1).
 *
 * Spec: REQ-FN-010 (AC#2), CR-PRIV-1 (footer disclaimer).
 */

interface DatosPersonalesSectionProps {
  userData: UserDataResponse | null;
  error?: RateLimitError | Error;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function DatosPersonalesSection({
  userData,
  error,
}: DatosPersonalesSectionProps) {
  if (error) {
    const isRateLimit = error instanceof RateLimitError;
    const formatted = isRateLimit
      ? formatRetryAfter(error.retryAfter, "es-CO")
      : null;

    return (
      <section
        id="datos-personales"
        aria-labelledby="datos-personales-title"
        className="flex flex-col gap-3 border-t border-line pt-6"
        data-testid="datos-personales-section"
        data-state="error"
      >
        <h2
          id="datos-personales-title"
          className="font-display text-xl"
        >
          {copy.account.datosPersonales.title}
        </h2>
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-rose-400"
          data-testid="datos-personales-error"
          data-error-kind={isRateLimit ? "rate-limit" : "generic"}
        >
          {isRateLimit
            ? formatted
              ? copy.account.errors.rateLimitWithDate(formatted)
              : copy.account.errors.rateLimit
            : copy.account.errors.loadFailed}
        </p>
      </section>
    );
  }

  if (!userData) {
    return (
      <section
        id="datos-personales"
        aria-labelledby="datos-personales-title"
        className="flex flex-col gap-3 border-t border-line pt-6"
        data-testid="datos-personales-section"
        data-state="loading"
      >
        <h2
          id="datos-personales-title"
          className="font-display text-xl"
        >
          {copy.account.datosPersonales.title}
        </h2>
        <dl
          aria-busy="true"
          aria-label={copy.account.datosPersonales.loadingAria}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]"
          data-testid="datos-personales-loading"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="contents">
              <dt className="h-4 w-32 animate-pulse rounded bg-surface" />
              <dd className="h-4 w-full animate-pulse rounded bg-surface" />
            </div>
          ))}
        </dl>
      </section>
    );
  }

  return (
    <section
      id="datos-personales"
      aria-labelledby="datos-personales-title"
      className="flex flex-col gap-3 border-t border-line pt-6"
      data-testid="datos-personales-section"
      data-state="loaded"
    >
      <h2 id="datos-personales-title" className="font-display text-xl">
        {copy.account.datosPersonales.title}
      </h2>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
        <dt className="text-sm text-muted">
          {copy.account.datosPersonales.labels.email}
        </dt>
        <dd className="text-sm" data-testid="datos-personales-email">
          {userData.email}
        </dd>
        <dt className="text-sm text-muted">
          {copy.account.datosPersonales.labels.provider}
        </dt>
        <dd className="text-sm" data-testid="datos-personales-provider">
          {userData.provider === "google"
            ? copy.account.datosPersonales.providerGoogle
            : copy.account.datosPersonales.providerLinkedIn}
        </dd>
        <dt className="text-sm text-muted">
          {copy.account.datosPersonales.labels.createdAt}
        </dt>
        <dd className="text-sm" data-testid="datos-personales-created-at">
          {formatDate(userData.createdAt)}
        </dd>
        <dt className="text-sm text-muted">
          {copy.account.datosPersonales.labels.lastLoginAt}
        </dt>
        <dd className="text-sm" data-testid="datos-personales-last-login-at">
          {formatDate(userData.lastLoginAt)}
        </dd>
      </dl>
    </section>
  );
}