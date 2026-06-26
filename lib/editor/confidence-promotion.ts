/**
 * `promoteConfidence` — Constitution Art. I enforcement (PR 4d).
 *
 * El parser (PR 2b/2c del backend) NUNCA emite `confidence: 'user_confirmed'`.
 * Solo dos fuentes pueden: (1) el editor al guardar un item nuevo desde
 * `WorkList`/`EducationList`/`SkillsByCategory` (PR 4c ya lo hace — el
 * usuario lo está creando activamente), y (2) esta función cuando el
 * editor llama `promoteConfidence(cv, touchedFieldPaths)` antes de
 * persistir (PR 4e lo cableará al save handler).
 *
 * Por cada path en `touched`:
 *  - `basics.<slot>` → `basics.confidence[slot] = 'user_confirmed'`
 *  - `basics.datosPersonales.<sub>` → `basics.confidence.datosPersonales`
 *    (este slot no tiene granularidad per-sub-field en el schema)
 *  - `basics.profiles.<i>.<sub>` → `basics.confidence.profiles`
 *  - `<section>.<i>.<slot>` (work/education/skills/projects/certificates/
 *    languages/awards/interests/references) → `<section>[i].confidence[slot]`
 *  - `meta.*` → NO SE TOCA (engineVersion es SemVer seal, inmutable)
 *
 * Pure function:
 *  - Nunca muta `cv`.
 *  - Si `touched.size === 0` retorna la misma referencia (no clone inútil).
 *  - Structural sharing: secciones no tocadas comparten referencia con el
 *    input (memoria eficiente).
 */
import type {
  CvDocument,
  Basics,
  ConfidenceMarker,
} from "@/lib/editor/types";

/**
 * Extrae el nombre de la sección (primer segmento del dot-path).
 *
 * @example
 *   pathPrefix("basics.email")         // → "basics"
 *   pathPrefix("work.0.position")      // → "work"
 *   pathPrefix("basics")               // → "basics"
 */
export function pathPrefix(path: string): string {
  const dot = path.indexOf(".");
  return dot === -1 ? path : path.slice(0, dot);
}

/**
 * Marca los campos que el usuario tocó activamente como
 * `confidence: 'user_confirmed'`. Los campos no tocados conservan la
 * confianza que el parser emitió (`'inferred'` o `'explicit'`).
 *
 * Constitution Art. I: parser nunca emite `user_confirmed`. Solo el
 * editor al guardar promueve a `user_confirmed` basándose en interacción
 * real del usuario.
 *
 * @param cv `CvDocument` actual.
 * @param touched `Set` de dot-paths que el usuario editó
 *                 (ej: `"basics.email"`, `"work.0.position"`,
 *                 `"skills.2.name"`).
 * @returns Nuevo `CvDocument` con `confidence` actualizado solo en los
 *          paths tocados. Si `touched` está vacío retorna `cv` sin cambios.
 */
export function promoteConfidence(
  cv: CvDocument,
  touched: ReadonlySet<string>,
): CvDocument {
  if (touched.size === 0) return cv;

  const basics = promoteBasics(cv.basics, touched);
  const work = promoteList(cv.work, "work", touched);
  const education = promoteList(cv.education, "education", touched);
  const skills = promoteList(cv.skills, "skills", touched);
  const projects = cv.projects
    ? promoteList(cv.projects, "projects", touched)
    : undefined;
  const certificates = cv.certificates
    ? promoteList(cv.certificates, "certificates", touched)
    : undefined;
  const languages = cv.languages
    ? promoteList(cv.languages, "languages", touched)
    : undefined;
  const awards = cv.awards
    ? promoteList(cv.awards, "awards", touched)
    : undefined;
  const interests = cv.interests
    ? promoteList(cv.interests, "interests", touched)
    : undefined;
  const references = cv.references
    ? promoteList(cv.references, "references", touched)
    : undefined;

  // Si nada cambió, evita crear un wrapper object innecesario.
  if (
    basics === undefined &&
    work === undefined &&
    education === undefined &&
    skills === undefined &&
    projects === undefined &&
    certificates === undefined &&
    languages === undefined &&
    awards === undefined &&
    interests === undefined &&
    references === undefined
  ) {
    return cv;
  }

  return {
    ...cv,
    basics: basics ?? cv.basics,
    work: work ?? cv.work,
    education: education ?? cv.education,
    skills: skills ?? cv.skills,
    projects: projects ?? cv.projects,
    certificates: certificates ?? cv.certificates,
    languages: languages ?? cv.languages,
    awards: awards ?? cv.awards,
    interests: interests ?? cv.interests,
    references: references ?? cv.references,
  };
}

/**
 * Maneja los paths `basics.*`. El slot `datosPersonales` y `profiles`
 * viven bajo `basics` como sub-objetos/arrays — sus sub-paths
 * (`basics.datosPersonales.cedula`, `basics.profiles.0.network`) promueven
 * el slot completo (no hay confianza per-sub-field en el schema).
 */
function promoteBasics(
  basics: Basics,
  touched: ReadonlySet<string>,
): Basics | undefined {
  let next: Basics | undefined;
  const prefix = "basics.";

  for (const path of touched) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);

    let slot: keyof Basics["confidence"] | null = null;
    if (rest in basics.confidence) {
      slot = rest as keyof Basics["confidence"];
    } else if (rest.startsWith("datosPersonales.")) {
      slot = "datosPersonales";
    } else if (rest.startsWith("profiles.")) {
      slot = "profiles";
    }

    if (slot === null) continue;
    if (basics.confidence[slot] === "user_confirmed") continue;

    next ??= { ...basics, confidence: { ...basics.confidence } };
    next.confidence[slot] = "user_confirmed";
  }

  return next;
}

/**
 * Maneja los paths `<section>.<index>.<slot>` para las secciones que son
 * arrays de items con `confidence` por-slot (work, education, skills, …).
 *
 *  - `pathPrefix("work")` valida que el path esté en la sección correcta.
 *  - `<index>` debe ser entero ≥ 0 y menor que `list.length`.
 *  - `<slot>` debe ser una key del `confidence` del item; si no, se ignora.
 *  - Si el slot ya es `user_confirmed` no se reasigna (idempotencia).
 *
 * Retorna `undefined` si ningún item cambió (structural sharing con el
 * array original); retorna un nuevo array si al menos un item fue tocado.
 */
function promoteList<
  T extends { readonly confidence: Record<string, ConfidenceMarker> },
>(
  list: ReadonlyArray<T>,
  section: string,
  touched: ReadonlySet<string>,
): T[] | undefined {
  let next: T[] | undefined;
  const prefix = `${section}.`;

  for (const path of touched) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    const dot = rest.indexOf(".");
    if (dot === -1) continue; // sin field, nada que promover

    const idx = Number.parseInt(rest.slice(0, dot), 10);
    const field = rest.slice(dot + 1);
    if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) continue;

    const item = list[idx];
    if (item === undefined) continue;
    if (!(field in item.confidence)) continue;

    const slotKey = field as keyof T["confidence"] & string;
    if (item.confidence[slotKey] === "user_confirmed") continue;

    next ??= list.map((it) => ({
      ...it,
      confidence: { ...it.confidence },
    }));
    const nextItem = next[idx];
    if (nextItem !== undefined) {
      nextItem.confidence[slotKey] = "user_confirmed";
    }
  }

  return next;
}
