import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditorSaveIndicator } from "./editor-save-indicator";
import { copy } from "@/lib/copy/es";

describe("EditorSaveIndicator", () => {
  it("state='saved' muestra 'Guardado'", () => {
    render(<EditorSaveIndicator state="saved" />);
    expect(screen.getByText(copy.editor.toolbar.saved)).toBeInTheDocument();
  });

  it("state='saving' muestra 'Guardando…'", () => {
    render(<EditorSaveIndicator state="saving" />);
    expect(screen.getByText(copy.editor.toolbar.saving)).toBeInTheDocument();
  });

  it("state='dirty' muestra 'Sin guardar'", () => {
    render(<EditorSaveIndicator state="dirty" />);
    expect(screen.getByText(copy.editor.toolbar.dirty)).toBeInTheDocument();
  });

  it("state='error' muestra mensaje de error", () => {
    render(<EditorSaveIndicator state="error" errorMessage="falló" />);
    expect(screen.getByText("falló")).toBeInTheDocument();
  });

  it("tiene aria-live='polite' para anunciar cambios", () => {
    const { container } = render(<EditorSaveIndicator state="saved" />);
    const el = container.querySelector("[aria-live='polite']");
    expect(el).toBeInTheDocument();
  });
});
