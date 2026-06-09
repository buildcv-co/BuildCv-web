import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorToolbar } from "./editor-toolbar";
import { copy } from "@/lib/copy/es";

describe("EditorToolbar", () => {
  it("renderiza 4 botones: Guardar, Limpiar, Re-puntuar, Exportar Markdown", () => {
    render(
      <EditorToolbar
        onSave={vi.fn()}
        onClear={vi.fn()}
        onRescore={vi.fn()}
        onExportMd={vi.fn()}
        hasDraft={true}
      />,
    );
    expect(
      screen.getByRole("button", { name: copy.editor.toolbar.save }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.editor.toolbar.rescore }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.editor.toolbar.exportMd }),
    ).toBeInTheDocument();
  });

  it("tiene role='toolbar' y aria-label", () => {
    render(
      <EditorToolbar
        onSave={vi.fn()}
        onClear={vi.fn()}
        onRescore={vi.fn()}
        onExportMd={vi.fn()}
        hasDraft={true}
      />,
    );
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("Limpiar está disabled cuando hasDraft=false", () => {
    render(
      <EditorToolbar
        onSave={vi.fn()}
        onClear={vi.fn()}
        onRescore={vi.fn()}
        onExportMd={vi.fn()}
        hasDraft={false}
      />,
    );
    const clear = screen.getByRole("button", { name: copy.editor.toolbar.clear });
    expect(clear).toBeDisabled();
    expect(clear).toHaveAttribute("aria-disabled", "true");
  });

  it("Limpiar está enabled cuando hasDraft=true", () => {
    render(
      <EditorToolbar
        onSave={vi.fn()}
        onClear={vi.fn()}
        onRescore={vi.fn()}
        onExportMd={vi.fn()}
        hasDraft={true}
      />,
    );
    const clear = screen.getByRole("button", { name: copy.editor.toolbar.clear });
    expect(clear).not.toBeDisabled();
  });

  it("click Guardar llama onSave", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <EditorToolbar
        onSave={onSave}
        onClear={vi.fn()}
        onRescore={vi.fn()}
        onExportMd={vi.fn()}
        hasDraft={true}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.save }),
    );
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("click Limpiar llama onClear (que abre modal en el parent)", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <EditorToolbar
        onSave={vi.fn()}
        onClear={onClear}
        onRescore={vi.fn()}
        onExportMd={vi.fn()}
        hasDraft={true}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("click Re-puntuar llama onRescore", async () => {
    const user = userEvent.setup();
    const onRescore = vi.fn();
    render(
      <EditorToolbar
        onSave={vi.fn()}
        onClear={vi.fn()}
        onRescore={onRescore}
        onExportMd={vi.fn()}
        hasDraft={true}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.rescore }),
    );
    expect(onRescore).toHaveBeenCalledTimes(1);
  });

  it("click Exportar Markdown llama onExportMd", async () => {
    const user = userEvent.setup();
    const onExportMd = vi.fn();
    render(
      <EditorToolbar
        onSave={vi.fn()}
        onClear={vi.fn()}
        onRescore={vi.fn()}
        onExportMd={onExportMd}
        hasDraft={true}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.exportMd }),
    );
    expect(onExportMd).toHaveBeenCalledTimes(1);
  });

  it("todos los botones disabled cuando isSaving=true", () => {
    render(
      <EditorToolbar
        onSave={vi.fn()}
        onClear={vi.fn()}
        onRescore={vi.fn()}
        onExportMd={vi.fn()}
        hasDraft={true}
        isSaving={true}
      />,
    );
    const save = screen.getByRole("button", { name: copy.editor.toolbar.saving });
    expect(save).toBeDisabled();
  });
});
