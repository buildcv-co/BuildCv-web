import type { Metadata } from "next";
import Link from "next/link";
import { Editor } from "@/components/editor/editor";
import { copy } from "@/lib/copy/es";

export const metadata: Metadata = {
  title: `Editar borrador — ${copy.appName}`,
  description: copy.editor.page.subtitle,
};

export default function EditarPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="font-display text-xl">
          {copy.appName}
        </Link>
        <span className="font-mono text-xs text-faint">
          borrador local · solo en este navegador
        </span>
      </header>

      <main id="contenido">
        <Editor />
      </main>
    </div>
  );
}
