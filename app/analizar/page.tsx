import type { Metadata } from "next";
import { AnalizarScreen } from "@/components/analyzer/analizar-screen";
import { CreditArea } from "@/components/credits/credit-area";
import { copy } from "@/lib/copy/es";

export const metadata: Metadata = {
  title: `Analizar — ${copy.appName}`,
};

export default function AnalizarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <main id="contenido" className="space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">
          {copy.analyze.title}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <CreditArea />
          <span data-testid="analysis-tagline" className="font-mono text-xs text-faint">análisis determinista · sin guardado</span>
        </div>
        <AnalizarScreen />
      </main>
    </div>
  );
}