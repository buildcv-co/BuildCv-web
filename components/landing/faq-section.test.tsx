import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FaqSection } from "./faq-section";

vi.mock("@/lib/copy/es", () => ({
  copy: {
    landing: {
      faqs: [
        { q: "¿BuildCv guarda mi CV?", a: "No, se procesa en memoria." },
        { q: "¿Cuánto cuesta?", a: "Es gratis en v0." },
        { q: "¿Funciona en móvil?", a: "Sí, es responsive." },
        { q: "¿Puedo exportar a PDF?", a: "Sí, después de adaptar." },
        { q: "¿Qué pasa si el backend falla?", a: "Los datos se descartaron." },
        { q: "¿La IA puede inventar contenido?", a: "No, hay un validador Hard." },
      ],
    },
  },
}));

describe("FaqSection", () => {
  it("renderiza un heading h2 con la sección de FAQ", () => {
    render(<FaqSection />);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toBeInTheDocument();
  });

  it("renderiza 6 <details> con <summary> correspondiente", () => {
    render(<FaqSection />);
    // Los <details> no tienen role group — los cuento por tag
    const detailsEls = document.querySelectorAll("details");
    expect(detailsEls.length).toBe(6);
    const summaryEls = document.querySelectorAll("summary");
    expect(summaryEls.length).toBe(6);
  });

  it("cada <details> tiene un <summary> con la pregunta", () => {
    render(<FaqSection />);
    expect(screen.getByText("¿BuildCv guarda mi CV?")).toBeInTheDocument();
    expect(screen.getByText("¿Cuánto cuesta?")).toBeInTheDocument();
    expect(screen.getByText("¿La IA puede inventar contenido?")).toBeInTheDocument();
  });

  it("cada <details> contiene la respuesta correspondiente", () => {
    render(<FaqSection />);
    expect(screen.getByText("No, se procesa en memoria.")).toBeInTheDocument();
    expect(screen.getByText("Es gratis en v0.")).toBeInTheDocument();
  });

  it("click en un <summary> expande el <details> (atributo open)", async () => {
    const user = userEvent.setup();
    render(<FaqSection />);
    const firstSummary = document.querySelector("summary")!;
    const firstDetails = document.querySelector("details")!;
    expect(firstDetails.hasAttribute("open")).toBe(false);
    await user.click(firstSummary);
    expect(firstDetails.hasAttribute("open")).toBe(true);
  });

  it("el <summary> tiene clase cursor-pointer (UX visual)", () => {
    render(<FaqSection />);
    const summary = document.querySelector("summary");
    expect(summary?.className).toContain("cursor-pointer");
  });
});
