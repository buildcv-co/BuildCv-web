/**
 * Helpers seguros para DOM APIs. En SSR, jsdom, o entornos sin DOM,
 * algunas APIs no existen o no animan. Estos helpers devuelven valores seguros.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Wrapper de requestAnimationFrame. Devuelve un ID opaco (number o fallback). */
export function safeRequestAnimationFrame(callback: (now: number) => void): number {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(callback);
  }
  // Fallback: setTimeout que se comporta como rAF (llama lo antes posible)
  return setTimeout(() => callback(performance.now()), 16) as unknown as number;
}

/** Wrapper de cancelAnimationFrame. Acepta tanto number como fallback de setTimeout. */
export function safeCancelAnimationFrame(id: number): void {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(id);
    return;
  }
  clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
}
