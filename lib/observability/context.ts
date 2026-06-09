import type { LogContext } from "./types";

/**
 * buildContext — recolecta contexto del navegador en runtime.
 * SSR-safe: si `window` o `navigator` no están definidos, retorna
 * defaults seguros (string vacío, viewport 0×0, locale es-CO).
 *
 * Spec: 008-web-observability-web · FR-085.
 */
export function buildContext(): LogContext {
  if (typeof window === "undefined") {
    return {
      url: "",
      userAgent: "",
      viewport: { width: 0, height: 0 },
      appVersion: readAppVersion(),
      buildSha: readBuildSha(),
      locale: "es-CO",
    };
  }

  const nav: Navigator | undefined =
    typeof navigator !== "undefined" ? navigator : undefined;

  return {
    url: window.location?.href ?? "",
    userAgent: nav?.userAgent ?? "",
    viewport: {
      width: window.innerWidth ?? 0,
      height: window.innerHeight ?? 0,
    },
    appVersion: readAppVersion(),
    buildSha: readBuildSha(),
    locale: nav?.language ?? "es-CO",
  };
}

function readAppVersion(): string {
  // Next.js expone next/package.json con la versión, pero queremos
  // la versión de NUESTRO package.json. La inyectamos en build-time
  // via NEXT_PUBLIC_APP_VERSION. Fallback a "0.0.0" para dev/test.
  if (typeof process !== "undefined" && process.env) {
    const v = process.env["NEXT_PUBLIC_APP_VERSION"];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "0.0.0";
}

function readBuildSha(): string {
  if (typeof process !== "undefined" && process.env) {
    const sha = process.env["NEXT_PUBLIC_BUILD_SHA"];
    if (typeof sha === "string" && sha.length > 0) return sha;
  }
  return "dev";
}
