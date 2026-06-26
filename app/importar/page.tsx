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
      <main id="contenido">
        <h1 className="font-display text-3xl sm:text-4xl">
          {copy.import.page.title}
        </h1>
        <p className="mb-2 mt-2 max-w-2xl text-sm text-muted">
          {copy.import.page.subtitle}
        </p>
        <p className="mb-8 text-xs text-faint">
          {copy.import.page.supportedFormats}
        </p>
        <ClientWrapper>
          <ImportButton editorAvailable={false} />
        </ClientWrapper>
      </main>
    </div>
  );
}
