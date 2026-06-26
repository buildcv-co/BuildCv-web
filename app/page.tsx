import Link from "next/link";
import { copy } from "@/lib/copy/es";
import { buildLandingMetadata } from "@/lib/seo/metadata";
import { buildAllLdSchemas } from "@/lib/seo/jsonld";
import { FaqSection } from "@/components/landing/faq-section";
import { TrustSignals } from "@/components/landing/trust-signals";

export const metadata = buildLandingMetadata();

export default function HomePage() {
  return (
    <>
      {/*
        The ONLY dangerouslySetInnerHTML in the project. The JSON string is
        built at build time by buildAllLdSchemas() with JSON.stringify
        (which natively escapes ", <, >, &, control chars, etc.) from
        static copy. There is no user input. See lib/seo/jsonld.ts.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildAllLdSchemas(copy.landing.faqs) }} // ONLY: JSON-LD built-time, no user input (Art. V documented exception)
      />
      <div className="mx-auto w-full max-w-5xl px-6">
        <main id="contenido" className="py-12 sm:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
            {copy.home.kicker}
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[1.03] sm:text-7xl">
            {copy.home.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">{copy.home.subtitle}</p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/analizar"
              className="rounded-full bg-accent px-7 py-3 font-medium text-accent-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.home.cta}
            </Link>
            <a
              href="#como"
              className="rounded-full border border-line px-7 py-3 text-ink transition hover:border-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copy.home.secondary}
            </a>
          </div>

          <p className="mt-5 max-w-xl text-sm italic text-faint">{copy.home.honesty}</p>

          <section id="como" className="mt-24 grid gap-8 sm:grid-cols-3">
            {copy.home.steps.map((step) => (
              <div key={step.n} className="border-t border-line pt-5">
                <span className="font-display text-3xl text-accent">{step.n}</span>
                <h2 className="mt-3 font-medium">{step.t}</h2>
                <p className="mt-2 text-sm text-muted">{step.d}</p>
              </div>
            ))}
          </section>

          <FaqSection />

          <TrustSignals />
        </main>

        <footer className="mt-12 border-t border-line py-8 text-sm text-faint">
          Hecho para quienes buscan empleo en Colombia · Tus datos no entrenan ninguna IA y no se guardan.
        </footer>
      </div>
    </>
  );
}
