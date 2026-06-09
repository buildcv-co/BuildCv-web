import type { Keyword, KeywordAnalysis } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";

type Tone = "present" | "partial" | "missing";

const toneClasses: Record<Tone, string> = {
  present: "border-present/40 bg-present/10 text-present",
  partial: "border-partial/40 bg-partial/10 text-partial",
  missing: "border-missing/40 bg-missing/10 text-missing",
};

export function KeywordCloud({ analysis }: { analysis: KeywordAnalysis }) {
  const groups: { title: string; items: Keyword[]; tone: Tone }[] = [
    { title: copy.result.present, items: analysis.present, tone: "present" },
    { title: copy.result.partialKw, items: analysis.partial, tone: "partial" },
    { title: copy.result.missing, items: analysis.missing, tone: "missing" },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {groups.map((group) => (
        <div key={group.tone}>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-faint">
            {group.title} · {group.items.length}
          </h3>
          {group.items.length === 0 ? (
            <p className="text-sm text-muted">
              {group.tone === "missing" ? copy.result.noMissing : "—"}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {group.items.map((keyword) => (
                <li
                  key={keyword.canonicalTerm}
                  title={keyword.note}
                  className={`rounded-full border px-2.5 py-1 text-xs ${toneClasses[group.tone]}`}
                >
                  {keyword.canonicalTerm}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
