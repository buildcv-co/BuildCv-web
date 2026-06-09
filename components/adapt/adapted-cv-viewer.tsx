export function AdaptedCvViewer({ adaptedCv }: { adaptedCv: string }) {
  return (
    <section
      aria-label="CV adaptado"
      role="region"
      className="rise rounded-xl border border-line bg-surface/60 p-5"
    >
      <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-ink">
        {adaptedCv}
      </pre>
    </section>
  );
}
