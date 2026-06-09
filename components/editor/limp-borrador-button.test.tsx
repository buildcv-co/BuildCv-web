import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LimpBorradorButton } from "./limp-borrador-button";
import { copy } from "@/lib/copy/es";

describe("LimpBorradorButton", () => {
  it("click botón abre modal de confirmación (role='alertdialog')", async () => {
    const user = userEvent.setup();
    render(<LimpBorradorButton onConfirm={vi.fn()} disabled={false} />);
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("modal muestra title y detail", async () => {
    const user = userEvent.setup();
    render(<LimpBorradorButton onConfirm={vi.fn()} disabled={false} />);
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    );
    expect(
      screen.getByText(copy.editor.confirm.clearDraft.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(copy.editor.confirm.clearDraft.detail),
    ).toBeInTheDocument();
  });

  it("modal tiene aria-labelledby y aria-describedby", async () => {
    const user = userEvent.setup();
    render(
      <LimpBorradorButton onConfirm={vi.fn()} disabled={false} />,
    );
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    );
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");
  });

  it("click 'Sí, limpiar' llama onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LimpBorradorButton onConfirm={onConfirm} disabled={false} />);
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    );
    await user.click(
      screen.getByRole("button", { name: copy.editor.confirm.clearDraft.confirm }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("click 'Cancelar' cierra modal sin llamar onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LimpBorradorButton onConfirm={onConfirm} disabled={false} />);
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    );
    await user.click(
      screen.getByRole("button", { name: copy.editor.confirm.clearDraft.cancel }),
    );
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("botón disabled cuando disabled=true", () => {
    render(<LimpBorradorButton onConfirm={vi.fn()} disabled={true} />);
    const btn = screen.getByRole("button", { name: copy.editor.toolbar.clear });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });

  it("Escape cierra el modal", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LimpBorradorButton onConfirm={onConfirm} disabled={false} />);
    await user.click(
      screen.getByRole("button", { name: copy.editor.toolbar.clear }),
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
