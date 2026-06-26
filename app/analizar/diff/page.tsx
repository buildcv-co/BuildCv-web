import type { Metadata } from "next";
import { DiffPage } from "@/components/diff/diff-page";
import { ClientWrapper } from "@/components/observability/client-wrapper";
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
      <main id="contenido">
        <ClientWrapper>
          <DiffPage jobText={jobText} />
        </ClientWrapper>
      </main>
    </div>
  );
}
