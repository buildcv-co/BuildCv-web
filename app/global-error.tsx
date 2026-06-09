"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/landing/error-fallback";
import { copy } from "@/lib/copy/es";

/**
 * app/global-error.tsx — error boundary raíz. Reemplaza el root layout
 * cuando este falla, por lo que DEBE incluir su propio <html> y <body>
 * (Next.js 16 lo requiere explícitamente).
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es-CO">
      <body>
        <ErrorFallback
          title={copy.landing.globalError.title}
          detail={copy.landing.globalError.detail}
          onRetry={() => {
            if (typeof window !== "undefined") window.location.reload();
            else reset();
          }}
          retryLabel={copy.landing.globalError.reload}
          showHomeLink
          homeLabel={copy.landing.globalError.backHome}
        />
      </body>
    </html>
  );
}
