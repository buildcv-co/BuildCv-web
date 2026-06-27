/**
 * Slot vacío para la sección de consentimientos (009-auth-web PR4).
 *
 * PR5 inyecta `<ConsentPanel>` aquí. Mantenemos este slot con un `id`
 * estable para que el anchor `<UserMenu>` (PR7) y los e2e selectors
 * (PR8) sigan funcionando cuando PR5 mergee.
 *
 * Copy viene de `lib/copy/es.ts` para no hardcodear (AGENTS.md rule).
 */

interface ConsentSectionSlotProps {
  title: string;
  placeholderMessage: string;
}

export function ConsentSectionSlot({
  title,
  placeholderMessage,
}: ConsentSectionSlotProps) {
  return (
    <section
      id="consent"
      aria-labelledby="consent-title"
      className="flex flex-col gap-3 border-t border-line pt-6"
      data-testid="consent-section-slot"
      data-slot="consent"
    >
      <h2 id="consent-title" className="font-display text-xl">
        {title}
      </h2>
      <p className="text-sm text-muted" data-testid="consent-placeholder">
        {placeholderMessage}
      </p>
    </section>
  );
}