import { copy } from "@/lib/copy/es";

/**
 * FaqSection — server component. Usa <details>/<summary> nativos (sin
 * librería, sin JS de cliente). Accesible por default (WCAG 2.2 AA).
 * Cada <details> tiene un id estable para que el JSON-LD pueda enlazarse
 * si en el futuro se desea (no requerido por Google Rich Results).
 */
export function FaqSection() {
  return (
    <section id="faq" className="mt-24" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="font-display text-3xl sm:text-4xl">
        Preguntas frecuentes
      </h2>
      <div className="mt-8 border-t border-line">
        {copy.landing.faqs.map((faq) => (
          <details
            key={faq.q}
            id={`faq-${slug(faq.q)}`}
            className="group border-b border-line py-5"
          >
            <summary className="cursor-pointer list-none text-base font-medium text-ink transition hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <span aria-hidden="true" className="mr-2 text-accent transition group-open:rotate-45 inline-block">
                +
              </span>
              {faq.q}
            </summary>
            <p className="mt-3 max-w-2xl pl-6 text-sm text-muted">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
