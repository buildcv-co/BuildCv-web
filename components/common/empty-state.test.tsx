import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renderiza el title como <h2>", () => {
    render(
      <EmptyState
        title="Empezá pegando tu CV"
        description="Solo texto, sin persistencia."
      />,
    );
    const heading = screen.getByRole("heading", { level: 2, name: /empezá pegando tu cv/i });
    expect(heading).toBeInTheDocument();
  });

  it("renderiza el description como <p>", () => {
    render(
      <EmptyState
        title="Empezá pegando tu CV"
        description="Solo texto, sin persistencia."
      />,
    );
    const desc = screen.getByText(/solo texto, sin persistencia/i);
    expect(desc.tagName).toBe("P");
  });

  it("renderiza el CTA primario como <a> con el href correcto cuando ctaLabel y ctaHref están presentes", () => {
    render(
      <EmptyState
        title="Importá un CV"
        description="Subí un PDF o DOCX."
        ctaLabel="Importar CV"
        ctaHref="/importar"
      />,
    );
    const cta = screen.getByTestId("empty-state-primary-cta");
    expect(cta.tagName).toBe("A");
    expect(cta).toHaveAttribute("href", "/importar");
    expect(cta).toHaveTextContent(/importar cv/i);
  });

  it("NO renderiza el CTA cuando falta ctaHref o ctaLabel", () => {
    const { container } = render(
      <EmptyState
        title="Sin CTA"
        description="No hay acción primaria definida."
      />,
    );
    expect(
      container.querySelector('[data-testid="empty-state-primary-cta"]'),
    ).toBeNull();
  });

  it("renderiza el icon como aria-hidden cuando la prop está presente", () => {
    render(
      <EmptyState
        title="Con icono"
        description="Descripción."
        icon={<svg data-testid="fake-icon" viewBox="0 0 24 24" />}
      />,
    );
    const wrapper = screen.getByTestId("fake-icon").parentElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("omite el wrapper de icon cuando la prop está ausente", () => {
    render(
      <EmptyState
        title="Sin icono"
        description="Solo texto."
      />,
    );
    expect(screen.queryByTestId("fake-icon")).toBeNull();
  });

  it("el <section> tiene aria-labelledby que apunta al id del title", () => {
    render(
      <EmptyState
        title="Identificable"
        description="El título es el accessible name."
      />,
    );
    const section = screen.getByTestId("empty-state");
    const heading = screen.getByRole("heading", { level: 2 });
    const labelledBy = section.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    expect(heading.getAttribute("id")).toBe(labelledBy);
  });
});