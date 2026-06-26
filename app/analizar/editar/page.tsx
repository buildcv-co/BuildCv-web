import type { Metadata } from "next";
import { Editor } from "@/components/editor/editor";
import { ClientWrapper } from "@/components/observability/client-wrapper";
import { copy } from "@/lib/copy/es";

export const metadata: Metadata = {
  title: `Editar borrador — ${copy.appName}`,
  description: copy.editor.page.subtitle,
};

export default function EditarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <main id="contenido">
        <ClientWrapper>
          <Editor />
        </ClientWrapper>
      </main>
    </div>
  );
}
