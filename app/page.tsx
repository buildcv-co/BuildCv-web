import Link from "next/link";
import { copy } from "@/lib/copy/es";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6">
      <header className="flex items-center justify-between py-8">
        <span className="font-display text-xl">{copy.appName}</span>
        <Link
          href="/analizar"
          className="rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:border-accent/60 hover:text-accent"
        >
          {copy.nav.analyze}
        </Link>
      </header>

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
            className="rounded-full bg-accent px-7 py-3 font-medium text-accent-ink transition hover:brightness-110"
          >
            {copy.home.cta}
          </Link>
          <a
            href="#como"
            className="rounded-full border border-line px-7 py-3 text-ink transition hover:border-muted hover:bg-surface"
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
      </main>

      <footer className="mt-12 border-t border-line py-8 text-sm text-faint">
        Hecho para quienes buscan empleo en Colombia · Tus datos no entrenan ninguna IA y no se guardan.
      </footer>
    </div>
  );
}
