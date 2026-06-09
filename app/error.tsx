"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/landing/error-fallback";
import Link from "next/link";
import { copy } from "@/lib/copy/es";

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6">
      <header className="flex items-center justify-between py-8">
        <span className="font-display text-xl">{copy.appName}</span>
        <Link
          href="/analizar"
          className="rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copy.nav.analyze}
        </Link>
      </header>
      <ErrorFallback
        title={copy.landing.serverError.title}
        detail={copy.landing.serverError.detail}
        onRetry={reset}
        retryLabel={copy.landing.serverError.retry}
        showHomeLink
        homeLabel={copy.landing.serverError.backHome}
      />
    </div>
  );
}
