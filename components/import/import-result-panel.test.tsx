import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportResultPanel } from "./import-result-panel";
import type { ImportResult } from "@/lib/api/types";
import { copy } from "@/lib/copy/es";

const resultWithSections: ImportResult = {
  text: "Juan Pérez\nBackend Developer\n\nEXPERIENCIA\n\nAcme Corp",
  sections: [
    { heading: "EXPERIENCIA", start: 27, end: 50, confidence: "High" },
    { heading: "EDUCACIÓN", start: 51, end: 80, confidence: "Low" },
  ],
  warnings: [
    { code: "IMAGE_OMITTED", message: "Se omitieron 1 imagen(es).", severity: "Info" },
  ],
  engineVersion: "1.0.0",
  traceId: "0HMVD9F2E5Q2P:00000001",
};

const resultNoSections: ImportResult = {
  text: "Solo texto sin secciones.",
  sections: [],
  warnings: [],
  engineVersion: "1.0.0",
  traceId: "0HMVD9F2E5Q2P:00000002",
};

const resultHtmlInjection: ImportResult = {
  text: "<script>alert('xss')</script>\nTexto normal",
  sections: [],
  warnings: [],
  engineVersion: "1.0.0",
  traceId: "0HMVD9F2E5Q2P:00000003",
};

describe("ImportResultPanel — renderizado de texto extraído", () => {
  it("renderiza el text en un contenedor semántico (escape HTML — Constitution Art. V)", () => {
    render(<ImportResultPanel result={resultWithSections} onUseInEditor={vi.fn()} />);
    const textContainer = screen.getByTestId("import-result-text");
    expect(textContainer).toBeInTheDocument();
    expect(textContainer.textContent).toContain("Juan Pérez");
    expect(textContainer.textContent).toContain("EXPERIENCIA");
    // CRÍTICO: el contenido NO debe interpretarse como HTML
    expect(textContainer.querySelector("script")).toBeNull();
  });

  it("con texto con intento de XSS: lo renderiza como texto literal, NO como HTML", () => {
    render(<ImportResultPanel result={resultHtmlInjection} onUseInEditor={vi.fn()} />);
    const textContainer = screen.getByTestId("import-result-text");
    expect(textContainer.querySelector("script")).toBeNull();
    expect(textContainer.textContent).toContain("<script>");
  });
});

describe("ImportResultPanel — secciones detectadas", () => {
  it("renderiza el título 'Secciones detectadas'", () => {
    render(<ImportResultPanel result={resultWithSections} onUseInEditor={vi.fn()} />);
    expect(screen.getByText(copy.import.sections.title)).toBeInTheDocument();
  });

  it("lista cada sección con su heading y label de confidence", () => {
    render(<ImportResultPanel result={resultWithSections} onUseInEditor={vi.fn()} />);
    expect(screen.getByText("EXPERIENCIA")).toBeInTheDocument();
    expect(screen.getByText("EDUCACIÓN")).toBeInTheDocument();
    expect(screen.getByText(copy.import.sections.confidenceHigh)).toBeInTheDocument();
    expect(screen.getByText(copy.import.sections.confidenceLow)).toBeInTheDocument();
  });

  it("sections[] vacío → muestra mensaje 'No se detectaron secciones'", () => {
    render(<ImportResultPanel result={resultNoSections} onUseInEditor={vi.fn()} />);
    expect(screen.getByText(copy.import.sections.empty)).toBeInTheDocument();
  });
});

describe("ImportResultPanel — warnings", () => {
  it("renderiza los warnings en una <ul> con aria-label (WCAG 2.2 AA)", () => {
    render(<ImportResultPanel result={resultWithSections} onUseInEditor={vi.fn()} />);
    const list = screen.getByRole("list", { name: copy.import.warnings.title });
    expect(list).toBeInTheDocument();
    expect(list.textContent).toContain("Se omitieron 1 imagen(es).");
  });

  it("warnings[] vacío → muestra 'Sin avisos'", () => {
    render(<ImportResultPanel result={resultNoSections} onUseInEditor={vi.fn()} />);
    expect(screen.getByText(copy.import.warnings.empty)).toBeInTheDocument();
  });
});

describe("ImportResultPanel — handoff al editor", () => {
  it("renderiza el botón 'Usar este texto en el editor'", () => {
    render(<ImportResultPanel result={resultWithSections} onUseInEditor={vi.fn()} />);
    const btn = screen.getByRole("button", { name: copy.import.buttonUseInEditor });
    expect(btn).toBeInTheDocument();
  });

  it("click en el botón llama onUseInEditor", async () => {
    const onUseInEditor = vi.fn();
    const user = userEvent.setup();
    render(<ImportResultPanel result={resultWithSections} onUseInEditor={onUseInEditor} />);
    const btn = screen.getByRole("button", { name: copy.import.buttonUseInEditor });
    await user.click(btn);
    expect(onUseInEditor).toHaveBeenCalledTimes(1);
  });

  it("editorAvailable=false → botón disabled con label 'Próximamente' + aria-disabled + hint", () => {
    render(
      <ImportResultPanel
        result={resultWithSections}
        onUseInEditor={vi.fn()}
        editorAvailable={false}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).toHaveTextContent("Próximamente");
    expect(screen.getByText(copy.import.handoffHint)).toBeInTheDocument();
  });

  it("editorAvailable=true (default) → botón enabled", () => {
    render(<ImportResultPanel result={resultWithSections} onUseInEditor={vi.fn()} />);
    const btn = screen.getByRole("button", { name: copy.import.buttonUseInEditor });
    expect(btn).toBeEnabled();
  });
});

describe("ImportResultPanel — accesibilidad", () => {
  it("aria-live='polite' para anunciar el estado de éxito al screen reader", () => {
    const { container } = render(
      <ImportResultPanel result={resultWithSections} onUseInEditor={vi.fn()} />,
    );
    const region = container.querySelector("[aria-live='polite']");
    expect(region).toBeTruthy();
  });

  it("muestra el engine version y el traceId como metadatos", () => {
    render(<ImportResultPanel result={resultWithSections} onUseInEditor={vi.fn()} />);
    expect(screen.getByText(/1\.0\.0/)).toBeInTheDocument();
    expect(screen.getByText(/0HMVD9F2E5Q2P:00000001/)).toBeInTheDocument();
  });
});
