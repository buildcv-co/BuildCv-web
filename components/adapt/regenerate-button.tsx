import { copy } from "@/lib/copy/es";
import { cn } from "@/lib/utils/cn";

export function RegenerateButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading}
      className={cn(
        "rounded-full px-5 py-2.5 text-sm font-medium transition",
        loading
          ? "cursor-not-allowed bg-surface-2 text-faint"
          : "border border-partial/40 bg-partial/10 text-partial hover:border-partial/60 hover:bg-partial/15",
      )}
    >
      {copy.adapt.cta.regenerate}
    </button>
  );
}
