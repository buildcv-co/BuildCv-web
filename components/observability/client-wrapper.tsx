"use client";

import { type ReactNode } from "react";
import { ErrorBoundary } from "@/components/observability/error-boundary";

/**
 * ClientWrapper — server-renderable boundary wrapper. Lo usan las páginas
 * de Server Components para envolver su contenido cliente en un
 * ErrorBoundary sin necesidad de convertir la página entera a "use client".
 *
 * Spec: 008-web-observability-web · FR-086.
 */
export function ClientWrapper({
  children,
}: {
  readonly children: ReactNode;
}): React.JSX.Element {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
