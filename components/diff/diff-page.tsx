"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { z } from "zod";
import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import { computeDiff } from "@/lib/diff/compute-diff";
import { flagEntitiesInDiff } from "@/lib/diff/flag-entities";
import type { DiffHandoff, DiffMode } from "@/lib/diff/types";
import {
  AdaptationExpiredError,
  AdaptationStorageError,
  clearDiffHandoff,
  readDiffHandoff,
  readValidDiffHandoff,
  writeDiffHandoff,
} from "@/lib/diff/handoff";
import { requestScore, type ScoreError } from "@/lib/api/score";
import type { EntityInvention } from "@/lib/api/types";
import { DiffView } from "./diff-view";
import { DiffToolbar } from "./diff-toolbar";
import { ActionFooter } from "./action-footer";

type Status = "loading" | "ready" | "expired" | "no-handoff" | "empty" | "error";

interface InlineEdit {
  readonly entity: EntityInvention;
  readonly value: string;
}

const InlineValueSchema = z
  .string()
  .min(1, "vacío")
  .max(200, "demasiado largo");

export interface DiffPageProps {
  /** Texto de la vacante, necesario para re-puntuar. */
  readonly jobText: string;
}

// Snapshot del handoff para useSyncExternalStore. Server-render y primer
// render del cliente devuelven el mismo "loading"; tras hidratar, el cliente
// lee sessionStorage y se rehidrata.
interface HandoffSnapshot {
  readonly status: Status;
  readonly handoff: DiffHandoff | null;
  readonly originalText: string;
  readonly adaptedText: string;
  readonly inventions: ReadonlyArray<EntityInvention>;
}

const LOADING_SNAPSHOT: HandoffSnapshot = {
  status: "loading",
  handoff: null,
  originalText: "",
  adaptedText: "",
  inventions: [],
};

// Cache de snapshots por status. useSyncExternalStore exige que getSnapshot
// devuelva siempre LA MISMA referencia si el estado no cambió.
const SNAPSHOT_CACHE: Record<Status, HandoffSnapshot> = {
  loading: LOADING_SNAPSHOT,
  "no-handoff": { ...LOADING_SNAPSHOT, status: "no-handoff" },
  expired: { ...LOADING_SNAPSHOT, status: "expired" },
  error: { ...LOADING_SNAPSHOT, status: "error" },
  ready: LOADING_SNAPSHOT, // se sobreescribe en getSnapshot cuando hay handoff
  empty: LOADING_SNAPSHOT, // idem
};

let readySnapshot: HandoffSnapshot = LOADING_SNAPSHOT;

function getServerSnapshot(): HandoffSnapshot {
  return LOADING_SNAPSHOT;
}

function getClientSnapshot(): HandoffSnapshot {
  if (typeof window === "undefined") return LOADING_SNAPSHOT;
  const raw = readDiffHandoff();
  if (raw === null) return SNAPSHOT_CACHE["no-handoff"];
  try {
    const h = readValidDiffHandoff();
    const nextStatus: Status = h.adaptedText.trim().length === 0 ? "empty" : "ready";
    // Si el snapshot cacheado representa el MISMO handoff (comparando los
    // strings crudos de sessionStorage), lo devolvemos para mantener la
    // referencia estable. useSyncExternalStore exige referencia estable.
    if (
      readySnapshot.handoff !== null &&
      readySnapshot.status === nextStatus &&
      readySnapshot.adaptedText === h.adaptedText &&
      readySnapshot.originalText === h.originalText
    ) {
      return readySnapshot;
    }
    readySnapshot = {
      status: nextStatus,
      handoff: h,
      originalText: h.originalText,
      adaptedText: h.adaptedText,
      inventions: h.validation.inventions,
    };
    return readySnapshot;
  } catch (err) {
    if (err instanceof AdaptationExpiredError) return SNAPSHOT_CACHE.expired;
    if (err instanceof AdaptationStorageError) return SNAPSHOT_CACHE["no-handoff"];
    return SNAPSHOT_CACHE.error;
  }
}

let handoffListeners: Array<() => void> = [];
function subscribeHandoff(listener: () => void): () => void {
  handoffListeners.push(listener);
  return () => {
    handoffListeners = handoffListeners.filter((l) => l !== listener);
  };
}

export function DiffPage({ jobText }: DiffPageProps) {
  const hydration = useSyncExternalStore(
    subscribeHandoff,
    getClientSnapshot,
    getServerSnapshot,
  );
  // Local mutable state para ediciones inline. Se inicializa en el primer
  // render con el valor del handoff. La sincronización con hydration se hace
  // mediante un useEffect que escucha cambios en el handoff (otro tab).
  const [editedText, setEditedText] = useState<string | null>(null);
  const [inventions, setInventions] = useState<ReadonlyArray<EntityInvention>>(
    [],
  );
  // Hidratar el state local cuando llega el handoff (post-mount).
  // Usamos un useEffect con un flag para inicializar UNA vez.
  const hydratedRef = useState(false);
  const hydrated = hydratedRef[0];
  const setHydrated = hydratedRef[1];
  if (
    typeof window !== "undefined" &&
    !hydrated &&
    (hydration.status === "ready" || hydration.status === "empty")
  ) {
    // Render-phase: se ejecuta en el cliente tras hydration. Sincroniza
    // el state local con el handoff. No se ejecuta en SSR (window === undefined).
    setEditedText(hydration.adaptedText);
    setInventions(hydration.inventions);
    setHydrated(true);
  }
  const [mode, setMode] = useState<DiffMode>(() => {
    if (typeof window === "undefined") return "unified";
    return window.matchMedia("(min-width: 768px)").matches
      ? "side-by-side"
      : "unified";
  });
  const [isRescoring, setIsRescoring] = useState(false);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // El adaptedText efectivo: si el usuario editó, usamos el editado;
  // si no, usamos el del handoff.
  const adaptedText = editedText ?? hydration.adaptedText;

  // Mode listener: se suscribe a cambios del viewport (sistema externo).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      setMode(e.matches ? "side-by-side" : "unified");
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const result = useMemo(() => {
    if (hydration.status !== "ready") return null;
    const diff = computeDiff(hydration.originalText, adaptedText);
    return flagEntitiesInDiff(diff, inventions);
  }, [hydration.status, hydration.originalText, adaptedText, inventions]);

  const hasJobText = jobText.trim().length > 0;

  const onRescore = useCallback(async () => {
    if (!hasJobText) return;
    setIsRescoring(true);
    setErrorMsg(null);
    try {
      const r = await requestScore(adaptedText, jobText);
      setLastScore(r.overallScore);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as ScoreError).message)
          : copy.diff.errors.network;
      setErrorMsg(message);
    } finally {
      setIsRescoring(false);
    }
  }, [adaptedText, jobText, hasJobText]);

  const onEditEntity = useCallback(
    (entity: EntityInvention) => {
      setInlineEdit({ entity, value: entity.claimed });
    },
    [],
  );

  const onKeepEntity = useCallback(() => {
    // No-op: "Mantener" significa que el usuario acepta el término tal cual.
    // El badge sigue visible; la invención NO se elimina del array.
  }, []);

  const onConfirmEdit = useCallback(() => {
    if (!inlineEdit) return;
    const parsed = InlineValueSchema.safeParse(inlineEdit.value);
    if (!parsed.success) {
      setToastMsg(copy.diff.errors.validationFailed);
      setInlineEdit(null);
      return;
    }
    const { entity } = inlineEdit;
    // Reemplazar la primera ocurrencia de `claimed` por `parsed.data` en adaptedText,
    // en el offset de `entity.position`.
    const before = adaptedText.slice(0, entity.position);
    const after = adaptedText.slice(entity.position + entity.claimed.length);
    const next = before + parsed.data + after;
    setEditedText(next);
    setInventions(inventions.filter((i) => i !== entity));
    setInlineEdit(null);
  }, [inlineEdit, adaptedText, inventions]);

  const onCancelEdit = useCallback(() => {
    setInlineEdit(null);
  }, []);

  const onAcceptExport = useCallback(() => {
    if (!hydration.handoff) return;
    const next: DiffHandoff = {
      ...hydration.handoff,
      adaptedText,
      validation: {
        ...hydration.handoff.validation,
        inventions: inventions.slice(),
      },
      timestamp: new Date().toISOString(),
    };
    writeDiffHandoff(next);
    if (typeof window !== "undefined") {
      window.location.href = "/analizar/exportar";
    }
    // Notificamos a los listeners (otros componentes suscritos al handoff)
    for (const listener of handoffListeners) listener();
  }, [hydration.handoff, adaptedText, inventions]);

  const onEditInEditor = useCallback(() => {
    if (!hydration.handoff) return;
    const next: DiffHandoff = {
      ...hydration.handoff,
      adaptedText,
      validation: {
        ...hydration.handoff.validation,
        inventions: inventions.slice(),
      },
      timestamp: new Date().toISOString(),
    };
    writeDiffHandoff(next);
    if (typeof window !== "undefined") {
      window.location.href = "/analizar/editar";
    }
    for (const listener of handoffListeners) listener();
  }, [hydration.handoff, adaptedText, inventions]);

  const onReject = useCallback(() => {
    clearDiffHandoff();
    if (typeof sessionStorage !== "undefined") {
      // Guardar contexto de re-prompt (opcional, futuro)
      sessionStorage.setItem(
        "buildcv:reprompt:context",
        JSON.stringify({ originalText: hydration.originalText, timestamp: new Date().toISOString() }),
      );
    }
    setToastMsg(copy.diff.actions.rejectToast);
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.location.href = "/analizar";
      }, 300);
    }
  }, [hydration.originalText]);

  // Estados terminales
  if (hydration.status === "loading") {
    return (
      <div aria-live="polite" className="p-4 text-sm text-muted">
        {copy.diff.page.title}
      </div>
    );
  }

  if (hydration.status === "expired" || hydration.status === "no-handoff" || hydration.status === "error") {
    const heading =
      hydration.status === "expired"
        ? copy.diff.page.expired
        : hydration.status === "no-handoff"
          ? copy.diff.page.noHandoff
          : copy.diff.page.loadError;
    return (
      <div
        role="alert"
        className="space-y-4 rounded-2xl border border-missing/40 bg-missing/10 p-6 text-missing"
      >
        <h1 className="font-display text-2xl">{heading}</h1>
        <Link
          href="/analizar"
          className="inline-block rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-muted"
        >
          Volver a analizar
        </Link>
      </div>
    );
  }

  if (hydration.status === "empty" || adaptedText.trim().length === 0) {
    return (
      <div
        role="alert"
        className="space-y-4 rounded-2xl border border-missing/40 bg-missing/10 p-6 text-missing"
      >
        <h1 className="font-display text-2xl">{copy.diff.page.emptyAdapted}</h1>
        <Link
          href="/analizar"
          className="inline-block rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-muted"
        >
          Volver a analizar
        </Link>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl">{copy.diff.page.title}</h1>
        <p className="text-sm text-muted">{copy.diff.page.subtitle}</p>
      </header>

      {errorMsg && (
        <div role="alert" className="rounded-xl border border-missing/40 bg-missing/10 p-3 text-sm text-missing">
          {errorMsg}
        </div>
      )}

      {toastMsg && (
        <div role="status" aria-live="polite" className="rounded-xl border border-line bg-surface/30 p-3 text-sm text-ink">
          {toastMsg}
        </div>
      )}

      {inlineEdit ? (
        <InlineEditRow
          edit={inlineEdit}
          onChange={(value) => setInlineEdit({ ...inlineEdit, value })}
          onConfirm={onConfirmEdit}
          onCancel={onCancelEdit}
        />
      ) : null}

      <DiffToolbar
        mode={mode}
        onModeChange={setMode}
        onRescore={onRescore}
        isRescoring={isRescoring}
        lastScore={lastScore}
        hasJobText={hasJobText}
      />

      {result.orphanedFlags.length > 0 && (
        <div
          role="note"
          className="rounded-xl border border-partial/40 bg-partial/10 p-3 text-sm text-partial"
        >
          Hay {result.orphanedFlags.length} invención(es) que el backend marcó en una posición
          que el visor no pudo mapear. Revísalas en el editor antes de aceptar.
        </div>
      )}

      <DiffView
        segments={result.segments}
        mode={mode}
        onModeChange={setMode}
        onEditEntity={onEditEntity}
        onKeepEntity={onKeepEntity}
      />

      <ActionFooter
        inventions={inventions}
        onAcceptExport={onAcceptExport}
        onEditInEditor={onEditInEditor}
        onReject={onReject}
      />
    </div>
  );
}

function InlineEditRow({
  edit,
  onChange,
  onConfirm,
  onCancel,
}: {
  readonly edit: InlineEdit;
  readonly onChange: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}) {
  return (
    <div
      role="group"
      aria-label={`Editar ${edit.entity.type}`}
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/30 p-3"
    >
      <label
        htmlFor="inline-edit-input"
        className="font-mono text-xs text-muted"
      >
        Nuevo valor:
      </label>
      <input
        id="inline-edit-input"
        type="text"
        value={edit.value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onConfirm();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => onConfirm()}
        className={cn(
          "flex-1 min-w-[200px] rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink",
          "focus:border-accent focus:outline-none",
        )}
      />
      <button
        type="button"
        onClick={onConfirm}
        className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:brightness-110"
      >
        {copy.diff.invention.confirm}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-muted"
      >
        {copy.diff.invention.cancel}
      </button>
    </div>
  );
}
