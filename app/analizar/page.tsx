import type { Metadata } from "next";
import Link from "next/link";
import { Analyzer } from "@/components/analyzer/analyzer";
import { CreditArea } from "@/components/credits/credit-area";
import { copy } from "@/lib/copy/es";

export const metadata: Metadata = {
  title: `Analizar — ${copy.appName}`,
};

export default function AnalizarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="font-display text-xl">
          {copy.appName}
        </Link>
        <div className="flex items-center gap-3">
          <CreditArea />
          <span className="font-mono text-xs text-faint">análisis determinista · sin guardado</span>
        </div>
      </header>

      <main id="contenido" className="space-y-6">
        <h1 className="font-display text-3xl sm:text-4xl">{copy.analyze.title}</h1>
        <p className="max-w-2xl text-sm italic text-muted">{copy.home.honesty}</p>
        <Analyzer />
      </main>
    </div>
  );
}
