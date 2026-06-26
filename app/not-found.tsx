import { ErrorFallback } from "@/components/landing/error-fallback";
import Link from "next/link";
import { copy } from "@/lib/copy/es";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6">
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