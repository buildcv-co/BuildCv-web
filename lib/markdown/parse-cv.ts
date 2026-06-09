/**
 * Parser minimalista de markdown-like para el CV adaptado.
 *
 * Decisiones de diseño:
 * - Solo soporta h1/h2/h3 (Cabecera de CV típico). h4+ se considera paragraph.
 * - Listas solo con guion `- ` (suficiente para v0; el stub del backend usa este formato).
 * - Blockquote solo con `> `.
 * - Párrafos se unen por líneas consecutivas no vacías (markdown estándar).
 * - Escape de HTML: TODO el texto se preserva verbatim. El componente NUNCA interpreta HTML.
 *   Esta es la regla Constitution Art. V (entrada como dato) — defense in depth.
 *
 * La función es pura y testeable de forma aislada.
 */

export type CvBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "blockquote"; text: string };

const H1_RE = /^# (.*)$/;
const H2_RE = /^## (.*)$/;
const H3_RE = /^### (.*)$/;
const LIST_RE = /^- (.+)$/;
const BQ_RE = /^> (.+)$/;

export function parseCvMarkdown(input: string): CvBlock[] {
  const lines = input.split("\n");
  const blocks: CvBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Línea en blanco → separador, saltar
    if (trimmed === "") {
      i++;
      continue;
    }

    // Headings
    const h1 = H1_RE.exec(trimmed);
    if (h1) {
      blocks.push({ type: "heading", level: 1, text: h1[1] });
      i++;
      continue;
    }
    const h2 = H2_RE.exec(trimmed);
    if (h2) {
      blocks.push({ type: "heading", level: 2, text: h2[1] });
      i++;
      continue;
    }
    const h3 = H3_RE.exec(trimmed);
    if (h3) {
      blocks.push({ type: "heading", level: 3, text: h3[1] });
      i++;
      continue;
    }

    // Blockquote
    const bq = BQ_RE.exec(trimmed);
    if (bq) {
      blocks.push({ type: "blockquote", text: bq[1] });
      i++;
      continue;
    }

    // Lista: agrupar items consecutivos
    const listMatch = LIST_RE.exec(trimmed);
    if (listMatch) {
      const items: string[] = [listMatch[1]];
      i++;
      while (i < lines.length) {
        const next = lines[i].trim();
        const nextMatch = LIST_RE.exec(next);
        if (nextMatch) {
          items.push(nextMatch[1]);
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", items });
      continue;
    }

    // Párrafo: agrupar líneas consecutivas no-vacías
    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        next === "" ||
        H1_RE.test(next) ||
        H2_RE.test(next) ||
        H3_RE.test(next) ||
        BQ_RE.test(next) ||
        LIST_RE.test(next)
      ) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join(" ") });
  }

  return blocks;
}
