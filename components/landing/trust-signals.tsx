import Link from "next/link";
import { copy } from "@/lib/copy/es";

/**
 * TrustSignals — server component. Badges de código abierto, Constitution
 * y tests automatizados. Enlaces externos con rel="noopener noreferrer" +
 * target="_blank" (Constitution Art. III + WCAG).
 */
export function TrustSignals() {
  const { openSource, constitution, tests } = copy.landing.trust;

  return (
    <section
      aria-label="Señales de confianza"
      className="mt-20 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-8"
    >
      <a
        href={openSource.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true">↗</span>
        {openSource.label}
      </a>
      <Link
        href={constitution.href}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink transition hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true">§</span>
        {constitution.label}
      </Link>
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted">
        <span aria-hidden="true">✓</span>
        {tests.label}
      </span>
    </section>
  );
}
