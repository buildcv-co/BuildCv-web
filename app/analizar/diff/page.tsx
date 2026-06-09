import type { Metadata } from "next";
import { DiffPage } from "@/components/diff/diff-page";
import { copy } from "@/lib/copy/es";

export const metadata: Metadata = {
  title: `${copy.diff.page.title} — ${copy.appName}`,
  description: copy.diff.page.subtitle,
};

// Esta página es un Server Component que monta el Client Component DiffPage.
// DiffPage lee el handoff de sessionStorage en el cliente (es privacy-safe
// por Constitution Art. III: no exponemos PII en URL).
export default async function DiffRoutePage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const sp = await searchParams;
  const jobText = typeof sp.job === "string" ? sp.job : "";
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-xl">{copy.appName}</span>
        <span className="font-mono text-xs text-faint">diff viewer</span>
      </header>
      <main id="contenido">
        <DiffPage jobText={jobText} />
      </main>
    </div>
  );
}
