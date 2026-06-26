"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/landing/error-fallback";
import { copy } from "@/lib/copy/es";

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6">
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