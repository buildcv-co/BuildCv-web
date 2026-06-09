import { copy } from "@/lib/copy/es";

function formatDate(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function FilenameHint({ date }: { date: Date }) {
  const filename = copy.export.filenameHint.replace("{date}", formatDate(date));
  return (
    <p
      aria-label={filename}
      className="font-mono text-xs text-faint"
      data-testid="filename-hint"
    >
      {filename}
    </p>
  );
}
