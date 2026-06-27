/**
 * Slot vacío para la sección de derechos ARCO (009-auth-web PR4).
 *
 * PR6 inyecta `<ArcoPanel>` aquí. Mismo patrón que `<ConsentSectionSlot>`:
 * el `id` estable y el `<section>` vacío se mantienen para que PR6
 * reemplace el contenido sin tocar el resto del layout.
 *
 * Copy viene de `lib/copy/es.ts` para no hardcodear (AGENTS.md rule).
 */

interface ArcoSectionSlotProps {
  title: string;
  placeholderMessage: string;
}

export function ArcoSectionSlot({ title, placeholderMessage }: ArcoSectionSlotProps) {
  return (
    <section
      id="arco"
      aria-labelledby="arco-title"
      className="flex flex-col gap-3 border-t border-line pt-6"
      data-testid="arco-section-slot"
      data-slot="arco"
    >
      <h2 id="arco-title" className="font-display text-xl">
        {title}
      </h2>
      <p className="text-sm text-muted" data-testid="arco-placeholder">
        {placeholderMessage}
      </p>
    </section>
  );
}