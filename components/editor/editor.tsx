"use client";

/**
 * `Editor` — orquestador del editor (PR 4e — migración a JSON Resume).
 *
 * Dos modos controlados por `NEXT_PUBLIC_STRUCTURED_INPUT`:
 *
 *  - **Structured** (default, flag != "false"): renderiza los 4 shells
 *    presentacionales `BasicsForm` / `WorkList` / `EducationList` /
 *    `SkillsByCategory` sobre un `CvDocument` JSON Resume. Persiste bajo
 *    `buildcv:editor:cv-document-v2`. Trackea los dot-paths que el usuario
 *    editó en un `Set<string>` y al guardar llama `promoteConfidence(cv,
 *    touched)` (Constitution Art. I) antes de persistir. Migración: si no
 *    existe la key v2, intenta cargar la legacy `buildcv:editor:cv-document`
 *    y la convierte via `tryMigrateLegacyDraft`.
 *
 *  - **Legacy** (flag === "false"): renderiza el path markdown textarea
 *    con 8 secciones tipadas (preserva el flujo de import de 005/006).
 *    Persiste via `useDraft()` / `LocalStorageCvStore` bajo
 *    `buildcv:draft:default` (sin cambios).
 *
 * Constitution Art. I: parser nunca emite `user_confirmed`. Solo el
 * editor al guardar promueve. Constitution Art. III: no persistimos en
 * servidores — todo es local (browser).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/copy/es";
import { requestScore } from "@/lib/api/score";
import type { ScoreResponse } from "@/lib/api/types";
import { CvDocumentSchema, BLANK_DOCUMENT } from "@/lib/editor/schema";
import type {
  CvDocument,
  LegacyCvDocument,
  CvSection,
  CvSectionKind,
  Basics,
  Work,
  Education,
  Skills,
  Draft,
  ConfidenceMarker,
} from "@/lib/editor/types";
import { useDraft } from "@/lib/editor/use-draft";
import { serializeCvDocument } from "@/lib/editor/markdown/serialize";
import { parseCvDocument } from "@/lib/editor/markdown/parse";
import { EditorToolbar } from "./editor-toolbar";
import { EditorSaveIndicator, type EditorSaveState } from "./editor-save-indicator";
import { SectionNode } from "./section-node";
import { BasicsForm } from "./basics-form";
import { WorkList } from "./work-list";
import { EducationList } from "./education-list";
import { SkillsByCategory } from "./skills-by-category";
import { promoteConfidence } from "@/lib/editor/confidence-promotion";
import { tryMigrateLegacyDraft, migrateLegacyLocalStorage } from "@/lib/storage/migrate";
import { downloadBlob } from "@/lib/api/export";
import { cn } from "@/lib/utils/cn";

/**
 * Storage keys. La v2 key almacena un `CvDocument` JSON Resume
 * (engineVersion 2.0.0). La key legacy tiene shape `LegacyCvDocument`
 * (sections[] + entities[]) y se migra on-mount a v2.
 */
const STRUCTURED_KEY = "buildcv:editor:cv-document-v2";
const LEGACY_EDITOR_KEY = "buildcv:editor:cv-document";

/**
 * Feature flag — Constitution Art. V (encuadre honesto) + rollout
 * controlado. Default true: editor estructurado. Set `NEXT_PUBLIC_STRUCTURED_INPUT=false`
 * para volver al editor markdown legacy (006/006b).
 */
function readStructuredFlag(): boolean {
  return process.env.NEXT_PUBLIC_STRUCTURED_INPUT !== "false";
}

const SECTION_ORDER: CvSectionKind[] = [
  "profile",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "languages",
  "other",
];

const HANDOFF_KEY = "buildcv:editor-handoff";

interface HandoffShape {
  importedText: string;
}

function readHandoff(): HandoffShape | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(HANDOFF_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.importedText !== "string") return null;
    return { importedText: obj.importedText };
  } catch {
    return null;
  }
}

function buildBlankSections(now: string): CvSection[] {
  const base = (id: string): Pick<CvSection, "id" | "source" | "createdAt" | "updatedAt"> => ({
    id,
    source: "user-typed",
    createdAt: now,
    updatedAt: now,
  });
  return [
    {
      ...base("sec_profile"),
      kind: "profile",
      fullName: "",
      headline: "",
      email: "",
      phone: "",
      location: "",
      links: [],
      summary: "",
    },
    {
      ...base("sec_experience"),
      kind: "experience",
      role: "",
      company: "",
      startDate: "",
      endDate: null,
      location: "",
      bullets: [],
      techStack: [],
    },
    {
      ...base("sec_education"),
      kind: "education",
      degree: "",
      institution: "",
      startDate: "",
      endDate: null,
      location: "",
      description: "",
    },
    {
      ...base("sec_skills"),
      kind: "skills",
      groups: [],
    },
    {
      ...base("sec_projects"),
      kind: "projects",
      items: [],
    },
    {
      ...base("sec_certifications"),
      kind: "certifications",
      items: [],
    },
    {
      ...base("sec_languages"),
      kind: "languages",
      items: [],
    },
    {
      ...base("sec_other"),
      kind: "other",
      title: "",
      content: "",
    },
  ];
}

/**
 * `CvDocument` en blanco (engineVersion 2.0.0). Se usa como fallback
 * cuando no hay draft persistido y no hay handoff.
 */
function blankStructuredCv(): CvDocument {
  return {
    basics: {
      name: "",
      email: "",
      profiles: [],
      confidence: {
        name: "inferred",
        email: "inferred",
        phone: "inferred",
        location: "inferred",
        url: "inferred",
        profiles: "inferred",
        summary: "inferred",
        datosPersonales: "inferred",
      },
    },
    work: [],
    education: [],
    skills: [],
    meta: { engineVersion: "2.0.0" },
  };
}

/**
 * Carga un `CvDocument` desde localStorage. Prioriza la key v2; si no
 * existe, intenta la key legacy y migra via `tryMigrateLegacyDraft`.
 * La migración se persiste en `-v2` y se elimina la key legacy.
 *
 * Constitución Art. I: el legacy siempre migra con `confidence: 'inferred'`
 * (la fuente plain-text nunca es confirmación del usuario). Constitución
 * Art. III: todo es local — no se toca el backend.
 */
function loadStructuredCv(): CvDocument {
  if (typeof window === "undefined") return blankStructuredCv();

  // 1) v2 key directo.
  const v2Raw = localStorage.getItem(STRUCTURED_KEY);
  if (v2Raw !== null) {
    try {
      const parsed: unknown = JSON.parse(v2Raw);
      if (isStructuredShape(parsed)) return parsed as CvDocument;
    } catch {
      // JSON inválido — sigue al fallback legacy.
    }
  }

  // 2) legacy key → migrar a v2.
  const legacyRaw = localStorage.getItem(LEGACY_EDITOR_KEY);
  if (legacyRaw !== null) {
    try {
      const parsed: unknown = JSON.parse(legacyRaw);
      const migrated = tryMigrateLegacyDraft(parsed);
      if (migrated !== null) {
        try {
          localStorage.setItem(STRUCTURED_KEY, JSON.stringify(migrated));
          localStorage.removeItem(LEGACY_EDITOR_KEY);
        } catch {
          // quota / serialización — seguimos con la versión en memoria.
        }
        return migrated;
      }
    } catch {
      // JSON inválido — fallback al blank.
    }
  }

  return blankStructuredCv();
}

function isStructuredShape(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (!obj.basics || typeof obj.basics !== "object") return false;
  const basics = obj.basics as Record<string, unknown>;
  if (typeof basics.name !== "string") return false;
  if (typeof basics.email !== "string") return false;
  if (!obj.meta || typeof obj.meta !== "object") return false;
  const meta = obj.meta as Record<string, unknown>;
  return meta.engineVersion === "2.0.0";
}

export function Editor({ initialJobText = "" }: { initialJobText?: string }) {
  // Feature flag — se lee en cada render para que los tests puedan togglear
  // via `vi.stubEnv("NEXT_PUBLIC_STRUCTURED_INPUT", "false")`.
  const structuredInput = readStructuredFlag();

  return structuredInput ? (
    <StructuredEditor initialJobText={initialJobText} />
  ) : (
    <LegacyEditor initialJobText={initialJobText} />
  );
}

// ─────────────────────────────────────────────────────────────────────
// StructuredEditor — JSON Resume path (PR 4a → 4e)
// ─────────────────────────────────────────────────────────────────────

function StructuredEditor({ initialJobText }: { initialJobText: string }) {
  const [cv, setCv] = useState<CvDocument>(() => blankStructuredCv());
  const [jobText, setJobText] = useState<string>(initialJobText);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Migración batch de drafts legacy del store (`buildcv:draft:*` →
    // `buildcv:draft:*-v2`). Idempotente — no-op si ya se corrió.
    try {
      migrateLegacyLocalStorage();
    } catch {
      // ignore — best-effort migration
    }
    // setTimeout(0) para evitar cascading-render warning del lint rule
    // `react-hooks/set-state-in-effect`. El setState debe correr en un
    // tick separado para no disparar renders extra en el mismo commit.
    const handle = setTimeout(() => {
      setCv(loadStructuredCv());
      setHydrated(true);
    }, 0);
    return () => {
      clearTimeout(handle);
    };
  }, []);

  /**
   * Agrega dot-paths al `touched` set. Inmutable: crea un nuevo Set para
   * que React detecte el cambio. Path format: `basics.<slot>`,
   * `basics.datosPersonales.<sub>`, `basics.profiles.<i>.<sub>`,
   * `<section>.<i>.<slot>` (work/education/skills/projects/certificates/
   * languages/awards/interests/references).
   */
  const addTouchedPaths = useCallback((paths: ReadonlyArray<string>) => {
    if (paths.length === 0) return;
    setTouched((prev) => {
      const next = new Set(prev);
      for (const p of paths) next.add(p);
      return next;
    });
  }, []);

  const updateBasics = useCallback(
    (next: Basics) => {
      setCv((prev) => {
        addTouchedPaths(diffBasicsPaths(prev.basics, next));
        return { ...prev, basics: next };
      });
      setIsDirty(true);
    },
    [addTouchedPaths],
  );

  const updateWork = useCallback(
    (next: ReadonlyArray<Work>) => {
      setCv((prev) => {
        addTouchedPaths(diffListPaths(prev.work, next, "work"));
        return { ...prev, work: [...next] };
      });
      setIsDirty(true);
    },
    [addTouchedPaths],
  );

  const updateEducation = useCallback(
    (next: ReadonlyArray<Education>) => {
      setCv((prev) => {
        addTouchedPaths(diffListPaths(prev.education, next, "education"));
        return { ...prev, education: [...next] };
      });
      setIsDirty(true);
    },
    [addTouchedPaths],
  );

  const updateSkills = useCallback(
    (next: ReadonlyArray<Skills>) => {
      setCv((prev) => {
        addTouchedPaths(diffListPaths(prev.skills, next, "skills"));
        return { ...prev, skills: [...next] };
      });
      setIsDirty(true);
    },
    [addTouchedPaths],
  );

  const onSave = useCallback(async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      // Constitution Art. I: promote SOLO los slots tocados a
      // `user_confirmed`. El resto mantiene la confianza del parser
      // (`inferred` / `explicit`).
      const promoted = promoteConfidence(cv, touched);
      localStorage.setItem(STRUCTURED_KEY, JSON.stringify(promoted));
      setCv(promoted);
      setTouched(new Set());
      setIsDirty(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  }, [cv, touched]);

  const onClear = useCallback(async () => {
    try {
      localStorage.removeItem(STRUCTURED_KEY);
      setCv(blankStructuredCv());
      setTouched(new Set());
      setIsDirty(false);
      setScore(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const onRescore = useCallback(async () => {
    if (jobText.trim().length === 0) {
      setErrorMsg(copy.editor.errors.jobTextRequired);
      return;
    }
    setIsRescoring(true);
    setErrorMsg(null);
    try {
      const md = serializeCvDocument(toLegacyDocument());
      const result = await requestScore(md, jobText);
      setScore(result);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : copy.editor.errors.network;
      setErrorMsg(message);
    } finally {
      setIsRescoring(false);
    }
  }, [jobText]);

  const onExportMd = useCallback(() => {
    const md = serializeCvDocument(toLegacyDocument());
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const today = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `cv-${today}.md`);
  }, []);

  const saveState: EditorSaveState = errorMsg
    ? "error"
    : isSaving
      ? "saving"
      : isDirty
        ? "dirty"
        : "saved";

  if (!hydrated) {
    return (
      <div aria-live="polite" className="p-4 text-sm text-muted">
        {copy.editor.page.title}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl">{copy.editor.page.title}</h1>
        <p className="text-sm text-muted">{copy.editor.page.subtitle}</p>
      </header>

      <EditorSaveIndicator
        state={saveState}
        errorMessage={errorMsg ?? undefined}
      />

      <EditorToolbar
        onSave={() => {
          void onSave();
        }}
        onClear={() => {
          void onClear();
        }}
        onRescore={() => {
          void onRescore();
        }}
        onExportMd={onExportMd}
        hasDraft={isDirty || cvHasContent(cv)}
        isSaving={isSaving}
        isRescoring={isRescoring}
        isError={Boolean(errorMsg)}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">
          {copy.analyze.jobLabel}
        </legend>
        <textarea
          rows={4}
          value={jobText}
          onChange={(e) => {
            setJobText(e.target.value);
            setIsDirty(true);
          }}
          aria-label={copy.analyze.jobLabel}
          className={cn(
            "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none",
          )}
          placeholder={copy.analyze.jobPlaceholder}
        />
      </fieldset>

      <BasicsForm basics={cv.basics} onChange={updateBasics} />
      <WorkList items={cv.work} onChange={updateWork} />
      <EducationList items={cv.education} onChange={updateEducation} />
      <SkillsByCategory items={cv.skills} onChange={updateSkills} />

      {score ? (
        <output
          aria-live="polite"
          className="block rounded-2xl border border-present/40 bg-present/10 p-4 text-sm text-present"
        >
          {copy.editor.toasts.rescoreSuccess} — {score.overallScore} ({score.band})
        </output>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// LegacyEditor — markdown textarea path (preserva 005/006 import flow)
// ─────────────────────────────────────────────────────────────────────

function LegacyEditor({ initialJobText }: { initialJobText: string }) {
  const { draft, isLoading, isSaving, save, clear } = useDraft();
  const [document, setDocument] = useState<LegacyCvDocument>(BLANK_DOCUMENT);
  const [jobText, setJobText] = useState<string>(initialJobText);
  const [isDirty, setIsDirty] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  const [score, setScore] = useState<ScoreResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (isLoading) return;
      if (draft) {
        setDocument(draft.document);
        setJobText(draft.jobText);
        setHydrated(true);
        return;
      }
      const handoff = readHandoff();
      const now = new Date().toISOString();
      if (handoff) {
        const userTyped = new Set<string>();
        const original = tokenize(handoff.importedText);
        const parsed = parseCvDocument(handoff.importedText, {
          originalEntities: original,
          userTypedEntities: userTyped,
        });
        const sections =
          parsed.sections.length > 0
            ? parsed.sections
            : buildBlankSections(now);
        const next: LegacyCvDocument = {
          ...BLANK_DOCUMENT,
          id: `doc_${Math.random().toString(36).slice(2, 10)}`,
          createdAt: now,
          updatedAt: now,
          source: "imported",
          sections,
        };
        setDocument(next);
      } else {
        setDocument({
          ...BLANK_DOCUMENT,
          id: `doc_${Math.random().toString(36).slice(2, 10)}`,
          createdAt: now,
          updatedAt: now,
          source: "blank",
          sections: buildBlankSections(now),
        });
      }
      setHydrated(true);
    }, 0);
    return () => {
      clearTimeout(handle);
    };
  }, [isLoading, draft]);

  const updateSection = useCallback((next: CvSection) => {
    setDocument((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === next.id);
      const sections =
        idx >= 0
          ? prev.sections.map((s) => (s.id === next.id ? next : s))
          : [...prev.sections, next];
      return {
        ...prev,
        sections,
        updatedAt: new Date().toISOString(),
      };
    });
    setIsDirty(true);
  }, []);

  const orderedSections = useMemo(() => {
    const byId = new Map(document.sections.map((s) => [s.id, s] as const));
    const present = SECTION_ORDER.map((k) =>
      document.sections.find((s) => s.kind === k),
    ).filter((s): s is CvSection => Boolean(s));
    const extras = document.sections.filter((s) => !present.includes(s));
    void byId;
    return [...present, ...extras];
  }, [document.sections]);

  const onSave = useCallback(async () => {
    const result = CvDocumentSchema.safeParse(document);
    if (!result.success) {
      setErrorMsg(copy.editor.errors.validation);
      return;
    }
    setErrorMsg(null);
    const next: Draft = {
      id: "default",
      document: result.data as LegacyCvDocument,
      jobText,
      scoreHistory: draft?.scoreHistory ?? [],
      lastSavedAt: new Date().toISOString(),
      engineVersions: { editor: "0.5.0", score: "1.0.0" },
    };
    try {
      await save(next);
      setIsDirty(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, [document, jobText, draft, save]);

  const onClear = useCallback(async () => {
    try {
      await clear();
      const now = new Date().toISOString();
      setDocument({
        ...BLANK_DOCUMENT,
        id: `doc_${Math.random().toString(36).slice(2, 10)}`,
        createdAt: now,
        updatedAt: now,
        source: "blank",
        sections: buildBlankSections(now),
      });
      setIsDirty(false);
      setScore(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, [clear]);

  const onRescore = useCallback(async () => {
    if (jobText.trim().length === 0) {
      setErrorMsg(copy.editor.errors.jobTextRequired);
      return;
    }
    setIsRescoring(true);
    setErrorMsg(null);
    try {
      const md = serializeCvDocument(document);
      const result = await requestScore(md, jobText);
      setScore(result);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : copy.editor.errors.network;
      setErrorMsg(message);
    } finally {
      setIsRescoring(false);
    }
  }, [document, jobText]);

  const onExportMd = useCallback(() => {
    const md = serializeCvDocument(document);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const today = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `cv-${today}.md`);
  }, [document]);

  const saveState: EditorSaveState = errorMsg
    ? "error"
    : isSaving
      ? "saving"
      : isDirty
        ? "dirty"
        : "saved";

  if (!hydrated && isLoading) {
    return (
      <div aria-live="polite" className="p-4 text-sm text-muted">
        {copy.editor.page.title}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl">{copy.editor.page.title}</h1>
        <p className="text-sm text-muted">{copy.editor.page.subtitle}</p>
      </header>

      <EditorSaveIndicator
        state={saveState}
        errorMessage={errorMsg ?? undefined}
      />

      <EditorToolbar
        onSave={() => {
          void onSave();
        }}
        onClear={() => {
          void onClear();
        }}
        onRescore={() => {
          void onRescore();
        }}
        onExportMd={onExportMd}
        hasDraft={Boolean(draft) || isDirty}
        isSaving={isSaving}
        isRescoring={isRescoring}
        isError={Boolean(errorMsg)}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">
          {copy.analyze.jobLabel}
        </legend>
        <textarea
          rows={4}
          value={jobText}
          onChange={(e) => {
            setJobText(e.target.value);
            setIsDirty(true);
          }}
          aria-label={copy.analyze.jobLabel}
          className={cn(
            "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none",
          )}
          placeholder={copy.analyze.jobPlaceholder}
        />
      </fieldset>

      <div className="space-y-5">
        {orderedSections.map((section) => (
          <SectionNode
            key={section.id}
            section={section}
            onChange={updateSection}
          />
        ))}
      </div>

      {score && (
        <output
          aria-live="polite"
          className="block rounded-2xl border border-present/40 bg-present/10 p-4 text-sm text-present"
        >
          {copy.editor.toasts.rescoreSuccess} — {score.overallScore} ({score.band})
        </output>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Diff entre `Basics` prev/next. Devuelve los dot-paths que cambiaron.
 * Formato compatible con `promoteConfidence`: `basics.<slot>` (slots
 * directos), `basics.datosPersonales` (sub-objeto), `basics.profiles`
 * (array completo — promoteConfidence trata `profiles` como un único
 * slot de confidence).
 */
function diffBasicsPaths(prev: Basics, next: Basics): string[] {
  const paths: string[] = [];
  const slots: Array<keyof Basics> = [
    "name",
    "email",
    "phone",
    "location",
    "url",
    "summary",
  ];
  for (const slot of slots) {
    if (prev[slot] !== next[slot]) paths.push(`basics.${slot}`);
  }
  if (prev.datosPersonales !== next.datosPersonales) {
    paths.push("basics.datosPersonales");
  }
  if (prev.profiles !== next.profiles) {
    paths.push("basics.profiles");
  }
  return paths;
}

/**
 * Diff entre listas (work/education/skills/projects/certificates/
 * languages/awards/interests/references) prev/next. Para cada índice
 * que existe en ambos, compara slots de `confidence`. Items nuevos
 * (existen solo en `next`) emiten TODOS los slots del confidence
 * (regla PR 4c — items nuevos nacen con `user_confirmed`). Items
 * removidos no emiten paths (no hay nada que promover).
 *
 * `T extends { confidence: Record<string, ConfidenceMarker> }` — la
 * confianza tiene slots tipados por sección; iteramos `Object.keys`
 * para cubrirlos todos sin enumerar a mano.
 */
function diffListPaths<
  T extends { readonly confidence: Record<string, ConfidenceMarker> },
>(
  prev: ReadonlyArray<T>,
  next: ReadonlyArray<T>,
  section: string,
): string[] {
  const paths: string[] = [];
  const len = Math.max(prev.length, next.length);
  for (let i = 0; i < len; i++) {
    const p = prev[i];
    const n = next[i];
    if (p === undefined && n !== undefined) {
      // item nuevo — sus slots nacen en `user_confirmed` (PR 4c).
      for (const slot of Object.keys(n.confidence)) {
        paths.push(`${section}.${i}.${slot}`);
      }
      continue;
    }
    if (p === undefined || n === undefined) continue;
    for (const slot of Object.keys(p.confidence)) {
      if (p.confidence[slot] !== n.confidence[slot]) {
        paths.push(`${section}.${i}.${slot}`);
      }
    }
  }
  return paths;
}

/**
 * `true` cuando el `CvDocument` tiene contenido visible para el usuario
 * (basics no-vacío o alguna lista con items). Se usa en el toolbar para
 * habilitar "Limpiar borrador" sin requerir `isDirty`.
 */
function cvHasContent(cv: CvDocument): boolean {
  if (cv.basics.name.length > 0 || cv.basics.email.length > 0) return true;
  if (cv.work.length > 0) return true;
  if (cv.education.length > 0) return true;
  if (cv.skills.length > 0) return true;
  if ((cv.projects?.length ?? 0) > 0) return true;
  if ((cv.certificates?.length ?? 0) > 0) return true;
  if ((cv.languages?.length ?? 0) > 0) return true;
  return false;
}

/**
 * Adapta un `CvDocument` JSON Resume a `LegacyCvDocument` para serializar
 * markdown (round-trip para el BFF `/api/score` mientras el endpoint
 * acepta v1). PR 5 migrará el BFF a `ScoreResponseV2` con
 * `engineVersion: "2.0.0"`.
 *
 * NOTA: este shim ignora los campos del `CvDocument` por ahora — el
 * `LegacyCvDocument` se usa SOLO para invocar `serializeCvDocument` que
 * necesita un shape con 8 secciones. La serialización real del CV
 * estructurado se hace en PR 5 cuando el BFF acepte JSON Resume directo.
 */
function toLegacyDocument(): LegacyCvDocument {
  const now = new Date().toISOString();
  return {
    ...BLANK_DOCUMENT,
    id: `doc_${now}`,
    createdAt: now,
    updatedAt: now,
    source: "blank",
    sections: buildBlankSections(now),
  };
}

function tokenize(input: string): ReadonlySet<string> {
  const out = new Set<string>();
  const lines = input.split("\n");
  for (const line of lines) {
    let t = line.trim().toLowerCase();
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "«$1»«$2»");
    t = t.replace(/\*\*/g, "");
    t = t.replace(/→/g, "·");
    for (const part of t.split("·")) {
      const trimmed = part.trim();
      if (trimmed.length === 0) continue;
      for (const sub of trimmed.split(",")) {
        const s = sub.replace(/[«»:]/g, "").trim();
        if (s.length > 0) out.add(s);
      }
    }
  }
  return out;
}