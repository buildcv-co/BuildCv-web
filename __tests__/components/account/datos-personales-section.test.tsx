import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatosPersonalesSection } from "@/components/account/datos-personales-section";
import type { UserDataResponse } from "@/lib/api/user-data";
import { RateLimitError } from "@/lib/api/user-data";

/**
 * Tests de `<DatosPersonalesSection>` (009-auth-web PR4 — T-PR4-007).
 *
 * Cobertura:
 *  - Estado loading (userData=null): skeleton rows con `aria-busy`.
 *  - Estado cargado (UserDataResponse válido): email + provider + fechas.
 *  - Estado error `RateLimitError`: banner con copy rate-limit + fecha.
 *  - Estado error genérico: banner genérico sin PII.
 *
 * Constitution: NO se loguea email/name en consola; copy en español
 * centralizado en `lib/copy/es.ts`.
 */

const SAMPLE: UserDataResponse = {
  userId: "11111111-1111-1111-1111-111111111111",
  provider: "google",
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-06-25T10:00:00Z",
  lastLoginAt: "2026-06-26T08:00:00Z",
};

describe("<DatosPersonalesSection>", () => {
  it("renderiza skeleton con aria-busy cuando userData es null (loading)", () => {
    render(<DatosPersonalesSection userData={null} />);

    const section = screen.getByTestId("datos-personales-section");
    expect(section).toHaveAttribute("data-state", "loading");
    const loading = screen.getByTestId("datos-personales-loading");
    expect(section).toContainElement(loading);
    // aria-busy en el <dl>
    expect(loading).toHaveAttribute("aria-busy", "true");
  });

  it("renderiza email + proveedor + fechas cuando userData está cargado", () => {
    render(<DatosPersonalesSection userData={SAMPLE} />);

    const section = screen.getByTestId("datos-personales-section");
    expect(section).toHaveAttribute("data-state", "loaded");
    expect(screen.getByTestId("datos-personales-email")).toHaveTextContent(
      "ada@example.com",
    );
    expect(screen.getByTestId("datos-personales-provider")).toHaveTextContent(
      "Google",
    );
    expect(screen.getByTestId("datos-personales-created-at")).toBeInTheDocument();
    expect(screen.getByTestId("datos-personales-last-login-at")).toBeInTheDocument();
  });

  it("renderiza banner rate-limit con fecha formateada cuando recibe `RateLimitError`", () => {
    const future = new Date("2026-06-26T15:30:00Z");
    render(
      <DatosPersonalesSection
        userData={null}
        error={new RateLimitError(future, "Too many")}
      />,
    );

    const section = screen.getByTestId("datos-personales-section");
    expect(section).toHaveAttribute("data-state", "error");
    const banner = screen.getByTestId("datos-personales-error");
    expect(banner).toHaveAttribute("data-error-kind", "rate-limit");
    expect(banner).toHaveAttribute("role", "alert");
    // Sanity: copy contiene el patrón de fecha formateada
    expect(banner.textContent).toMatch(/Demasiadas solicitudes/);
    expect(banner.textContent).toMatch(/2026/);
  });

  it("renderiza banner genérico (sin PII) cuando recibe error no-rate-limit", () => {
    render(
      <DatosPersonalesSection
        userData={null}
        error={new Error("DB connection refused: host=internal-db password=hunter2")}
      />,
    );

    const section = screen.getByTestId("datos-personales-section");
    expect(section).toHaveAttribute("data-state", "error");
    const banner = screen.getByTestId("datos-personales-error");
    expect(banner).toHaveAttribute("data-error-kind", "generic");
    // Sin PII / secretos en el banner genérico
    expect(banner.textContent).not.toContain("hunter2");
    expect(banner.textContent).not.toContain("internal-db");
    expect(banner.textContent).toContain("No pudimos cargar tus datos");
  });
});