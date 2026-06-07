import type { Gate } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";

export function HonestyNote({
  notice,
  gates,
  engineVersion,
  lexiconVersion,
}: {
  notice: string;
  gates: Gate[];
  engineVersion: string;
  lexiconVersion: string;
}) {
  return (
    <div className="space-y-3 border-t border-line pt-5 text-sm text-muted">
      <p className="italic">{notice}</p>
      {gates.length > 0 && (
        <ul className="space-y-1">
          {gates.map((gate) => (
            <li key={gate.reason} className="text-faint">
              · {gate.message}
            </li>
          ))}
        </ul>
      )}
      <p className="font-mono text-xs text-faint">
        {copy.result.sealedWith} {copy.result.engine} {engineVersion} · {copy.result.lexicon}{" "}
        {lexiconVersion}
      </p>
    </div>
  );
}
