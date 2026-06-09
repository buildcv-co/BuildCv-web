import { serializeCvDocument } from "./markdown/serialize";
import { parseCvDocument, type ParseContext } from "./markdown/parse";
import { CvDocumentSchema } from "./schema";
import { EntityNotAllowedError, RoundTripMismatchError } from "./errors";
import type { CvDocument } from "./types";

export type RoundTripResult =
  | { readonly ok: true; readonly markdown: string }
  | {
      readonly ok: false;
      readonly error: "ENTITY_NOT_ALLOWED" | "SECTION_VALIDATION_FAILED" | "ROUNDTRIP_MISMATCH";
      readonly details: string;
    };

export function roundtrip(
  doc: CvDocument,
  ctx: ParseContext,
): RoundTripResult {
  const md = serializeCvDocument(doc);
  let reparsed: CvDocument;
  try {
    reparsed = parseCvDocument(md, ctx);
  } catch (err) {
    if (err instanceof EntityNotAllowedError) {
      return {
        ok: false,
        error: "ENTITY_NOT_ALLOWED",
        details: `${err.entityValue} en sección ${err.sectionKind}`,
      };
    }
    return {
      ok: false,
      error: "SECTION_VALIDATION_FAILED",
      details: err instanceof Error ? err.message : "validation failed",
    };
  }

  const reparsedResult = CvDocumentSchema.safeParse(reparsed);
  if (!reparsedResult.success) {
    return {
      ok: false,
      error: "SECTION_VALIDATION_FAILED",
      details: reparsedResult.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }

  if (!sameStructure(doc, reparsed)) {
    return {
      ok: false,
      error: "ROUNDTRIP_MISMATCH",
      details: `sections ${doc.sections.length} vs ${reparsed.sections.length}, kinds ${doc.sections.map((s) => s.kind).join(",")} vs ${reparsed.sections.map((s) => s.kind).join(",")}`,
    };
  }

  return { ok: true, markdown: md };
}

function sameStructure(a: CvDocument, b: CvDocument): boolean {
  if (a.sections.length !== b.sections.length) return false;
  for (let i = 0; i < a.sections.length; i++) {
    const sa = a.sections[i];
    const sb = b.sections[i];
    if (!sa || !sb) return false;
    if (sa.kind !== sb.kind) return false;
  }
  return true;
}

export { RoundTripMismatchError };
