"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copy } from "@/lib/copy/es";
import { requestScore } from "@/lib/api/score";
import type { ScoreResponse } from "@/lib/api/types";
import { CvDocumentSchema, BLANK_DOCUMENT } from "@/lib/editor/schema";
import type {
  LegacyCvDocument,
  CvSection,
  CvSectionKind,
  Draft,
} from "@/lib/editor/types";
import { useDraft } from "@/lib/editor/use-draft";
import { serializeCvDocument } from "@/lib/editor/markdown/serialize";
import { parseCvDocument } from "@/lib/editor/markdown/parse";
import { EditorToolbar } from "./editor-toolbar";
import { EditorSaveIndicator, type EditorSaveState } from "./editor-save-indicator";
import { SectionNode } from "./section-node";
import { downloadBlob } from "@/lib/api/export";
import { cn } from "@/lib/utils/cn";

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

export function Editor({ initialJobText = "" }: { initialJobText?: string }) {
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
