import { ErrorFallback } from "@/components/landing/error-fallback";
import Link from "next/link";
import { copy } from "@/lib/copy/es";

export default function NotFound() {
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
        title={copy.landing.notFound.title}
        detail={copy.landing.notFound.detail}
        showHomeLink
        homeLabel={copy.landing.notFound.backHome}
      >
        <Link
          href="/analizar"
          className="rounded-full border border-line px-6 py-2.5 text-ink transition hover:border-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copy.landing.notFound.backAnalyze}
        </Link>
      </ErrorFallback>
    </div>
  );
}
