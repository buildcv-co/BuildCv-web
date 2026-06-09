import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionFooter } from "./action-footer";
import { copy } from "@/lib/copy/es";
import type { EntityInvention } from "@/lib/api/types";

function inv(severity: "Soft" | "Hard"): EntityInvention {
  return {
    type: "Company",
    claimed: "FakeCorp",
    original: null,
    severity,
    position: 0,
  };
}

describe("ActionFooter", () => {
  it("renderiza 3 botones: Aceptar y exportar, Editar en el editor, Rechazar y re-prompt", () => {
    render(
      <ActionFooter
        inventions={[]}
        onAcceptExport={vi.fn()}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(copy.diff.actions.edit, "i") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(copy.diff.actions.reject, "i") })).toBeInTheDocument();
  });

  it("click Aceptar y exportar SIN Hard → llama onAcceptExport directo", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <ActionFooter
        inventions={[]}
        onAcceptExport={onAccept}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("click Aceptar y exportar CON Hard → abre modal (role=alertdialog)", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <ActionFooter
        inventions={[inv("Hard"), inv("Soft")]}
        onAcceptExport={onAccept}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("modal tiene 2 opciones: Aceptar de todos modos y Revisarlas primero", async () => {
    const user = userEvent.setup();
    render(
      <ActionFooter
        inventions={[inv("Hard")]}
        onAcceptExport={vi.fn()}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    expect(screen.getByRole("button", { name: new RegExp(copy.diff.actions.acceptAnyway, "i") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(copy.diff.actions.reviewFirst, "i") })).toBeInTheDocument();
  });

  it("modal: Aceptar de todos modos llama onAcceptExport y cierra el modal", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <ActionFooter
        inventions={[inv("Hard")]}
        onAcceptExport={onAccept}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.acceptAnyway, "i") }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("modal: Revisarlas primero cierra el modal sin llamar onAcceptExport", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <ActionFooter
        inventions={[inv("Hard")]}
        onAcceptExport={onAccept}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.reviewFirst, "i") }));
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("modal: Escape cierra sin llamar onAcceptExport", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <ActionFooter
        inventions={[inv("Hard")]}
        onAcceptExport={onAccept}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    await user.keyboard("{Escape}");
    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("modal: title y detail muestran el conteo de Hard pendientes", async () => {
    const user = userEvent.setup();
    render(
      <ActionFooter
        inventions={[inv("Hard"), inv("Hard")]}
        onAcceptExport={vi.fn()}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    const dialog = screen.getByRole("alertdialog");
    const text = dialog.textContent ?? "";
    expect(text).toMatch(/2/);
  });

  it("click Editar en el editor llama onEditInEditor", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <ActionFooter
        inventions={[]}
        onAcceptExport={vi.fn()}
        onEditInEditor={onEdit}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.edit, "i") }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("click Rechazar y re-prompt llama onReject", async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(
      <ActionFooter
        inventions={[]}
        onAcceptExport={vi.fn()}
        onEditInEditor={vi.fn()}
        onReject={onReject}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.reject, "i") }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("el modal tiene aria-labelledby y aria-describedby", async () => {
    const user = userEvent.setup();
    render(
      <ActionFooter
        inventions={[inv("Hard")]}
        onAcceptExport={vi.fn()}
        onEditInEditor={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: new RegExp(copy.diff.actions.accept, "i") }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");
  });
});
