"use client";

import { IS_LOCAL } from "@/lib/auth";
import { copy } from "@/lib/copy/es";

/**
 * LocalModePill — small non-intrusive badge rendered in the site header
 * when the build runs in local mode (NEXT_PUBLIC_LOCAL_MODE=true).
 * Reads IS_LOCAL at module load (build-time constant from env); no
 * runtime session state, no API calls, no persistence (Art. III).
 * Returns null when IS_LOCAL === false (production builds never
 * render this element — verified by unit + manual visual QA).
 */
export function LocalModePill() {
  if (!IS_LOCAL) return null;
  return (
    <span
      role="status"
      data-testid="local-mode-pill"
      aria-label={copy.localModePill.description}
      className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-xs text-accent"
    >
      <span aria-hidden="true">●</span>
      {copy.localModePill.label}
    </span>
  );
}