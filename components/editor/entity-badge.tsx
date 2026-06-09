import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";
import type { EntitySource } from "@/lib/editor/types";

const TONE: Record<EntitySource, string> = {
  imported: "text-present border-present/40 bg-present/10",
  "user-typed": "text-partial border-partial/40 bg-partial/10",
};

const LABEL: Record<EntitySource, string> = {
  imported: copy.editor.entityBadge.importedLabel,
  "user-typed": copy.editor.entityBadge.userTypedLabel,
};

export function EntityBadge({
  value,
  source,
}: {
  value: string;
  source: EntitySource;
}) {
  return (
    <span
      role="note"
      aria-label={`${LABEL[source]}: ${value}`}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
        TONE[source],
      )}
    >
      {value}
    </span>
  );
}
