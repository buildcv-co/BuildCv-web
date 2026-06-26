import type { Metadata } from "next";
import { ImportButton } from "@/components/import/import-button";
import { ClientWrapper } from "@/components/observability/client-wrapper";
import { copy } from "@/lib/copy/es";

export const metadata: Metadata = {
  title: `Cargar CV — ${copy.appName}`,
  description: copy.import.page.metaDescription,
};

export default function ImportarPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <main id="contenido" className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl sm:text-4xl">
            {copy.import.page.title}
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            {copy.import.page.subtitle}
          </p>
          <p className="text-xs text-faint">
            {copy.import.page.supportedFormats}
          </p>
        </div>
        <ClientWrapper>
          <ImportButton editorAvailable={false} />
        </ClientWrapper>
      </main>
    </div>
  );
}
