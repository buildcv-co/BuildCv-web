import { parseCvMarkdown, type CvBlock } from "@/lib/markdown/parse-cv";

/**
 * Renderiza el CV adaptado con markup semántico cuando es posible.
 *
 * Decisiones:
 * - Si el texto tiene estructura (headings/listas/blockquotes), renderiza un árbol
 *   semántico con <article>, <h2>/<h3>, <ul>, <blockquote>. Article se eleva al <h1> de
 *   la página porque el viewer es una sección subordinada (el <h1> principal es
 *   "Analiza tu CV"). Por eso usamos <h2> para el primer heading del CV.
 *   Concretamente: el nivel del heading en el CV se mapea a `level + 1` en el DOM
 *   para no colisionar con la jerarquía de la página (que tiene h1 de página, h2
 *   de "Desglose"/"Palabras clave"/"Cambios aplicados"/"Adaptar tu CV con IA").
 *   Si el heading del CV es h1, en el DOM se vuelve h2; h2→h3; h3→h4.
 * - TODO el texto se renderiza como nodo de texto. NUNCA dangerouslySetInnerHTML.
 *   Constitution Art. V (entrada como dato) — defense in depth.
 */
export function AdaptedCvViewer({ adaptedCv }: { adaptedCv: string }) {
  const blocks = parseCvMarkdown(adaptedCv);

  return (
    <section
      aria-label="CV adaptado"
      role="region"
      className="rise rounded-xl border border-line bg-surface/60 p-5"
    >
      {blocks.length === 0 ? (
        <p className="text-sm text-muted">Sin contenido.</p>
      ) : (
        <article className="space-y-3 text-sm leading-relaxed text-ink">
          {blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </article>
      )}
    </section>
  );
}

function Block({ block }: { block: CvBlock }) {
  switch (block.type) {
    case "heading": {
      // Mapeo: h1→h2, h2→h3, h3→h4 para no chocar con la jerarquía de la página.
      const Tag = (`h${Math.min(block.level + 1, 6)}` as unknown) as
        | "h2"
        | "h3"
        | "h4"
        | "h5"
        | "h6";
      return (
        <Tag
          className={
            block.level === 1
              ? "font-display text-xl"
              : block.level === 2
                ? "font-display text-base font-medium"
                : "font-medium"
          }
        >
          {block.text}
        </Tag>
      );
    }
    case "paragraph":
      return <p className="whitespace-pre-wrap">{block.text}</p>;
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-5">
          {block.items.map((item, i) => (
            <li key={i} className="whitespace-pre-wrap">
              {item}
            </li>
          ))}
        </ul>
      );
    case "blockquote":
      return (
        <blockquote className="border-l-2 border-muted pl-3 italic text-muted">
          {block.text}
        </blockquote>
      );
  }
}
