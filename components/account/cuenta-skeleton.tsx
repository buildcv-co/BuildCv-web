import type { ReactNode } from "react";

/**
 * Layout skeleton de `/cuenta` (009-auth-web PR4).
 *
 * Compone tres secciones nombradas con `id` estable para que PR5 y PR6
 * inyecten `<ConsentPanel>` y `<ArcoPanel>` sin colisionar (R2).
 *
 * Slots:
 *  - `datosPersonales`: filled en PR4 con `<DatosPersonalesSection>`.
 *  - `consent`: slot vacío (placeholder) — PR5 reemplaza con `<ConsentPanel>`.
 *  - `arco`: slot vacío (placeholder) — PR6 reemplaza con `<ArcoPanel>`.
 *
 * Cada slot vive dentro de un `<section id="..." aria-labelledby="...">`
 * con `id` estable como anchor target para `<UserMenu>` (PR7) y e2e
 * selectors (PR8).
 *
 * Constitución:
 *  - **Art. III**: el footer con la disclaimer in-memory del backend.
 *  - **Art. IV**: copy honesto, sin claims rotundos.
 *  - **NFR-A11Y-1**: `<main aria-labelledby="cuenta-title">` + heading.
 */

interface CuentaSkeletonProps {
  datosPersonales: ReactNode;
  consent: ReactNode;
  arco: ReactNode;
  title: string;
  inMemoryNotice: string;
}

export function CuentaSkeleton({
  datosPersonales,
  consent,
  arco,
  title,
  inMemoryNotice,
}: CuentaSkeletonProps) {
  return (
    <main
      aria-labelledby="cuenta-title"
      className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10"
      data-testid="cuenta-skeleton"
    >
      <h1 id="cuenta-title" className="font-display text-3xl">
        {title}
      </h1>
      {datosPersonales}
      {consent}
      {arco}
      <footer className="text-xs text-muted">
        <small>{inMemoryNotice}</small>
      </footer>
    </main>
  );
}