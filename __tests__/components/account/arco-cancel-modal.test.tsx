import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Tests del modal ARCO Cancel (009-auth-web PR6 — T-PR6-009..011).
 *
 * Spec: REQ-FN-016 + CR-ARCO-1 + Art. V (double-confirmation).
 *
 * Contrato:
 *  - Native `<dialog>` con aria-labelledby + aria-describedby.
 *  - Input email type-to-confirm; confirm button disabled hasta que
 *    `input === userEmail` (case-insensitive).
 *  - Confirm → invoca `onConfirm`.
 *  - Cancel → invoca `onCancel` (NO llama a `onConfirm`).
 *  - Botón Cancel cierra el dialog (Esc / click Cancel).
 *  - WCAG 2.2: aria-live para anunciar estado.
 *  - NO expone email en logs.
 */

vi.mock("@/lib/copy/es", () => ({
  copy: {
    account: {
      arco: {
        cancel: {
          modalTitle: "¿Eliminar tu cuenta?",
          modalBody:
            "Vas a eliminar tu perfil y todos tus consentimientos. Las facturas ya emitidas se conservan por ley. Esta acción no se puede deshacer.",
          emailHelp: (email: string) => `Escribí tu email para confirmar: ${email}`,
          confirm: "Eliminar definitivamente",
          cancel: "Cancelar",
          close: "Cerrar",
        },
      },
    },
  },
}));

const userDataModuleMock = {
  deleteUserData: vi.fn(),
};

vi.mock("@/lib/api/user-data", () => userDataModuleMock);

async function loadModal() {
  return await import("@/components/account/arco-cancel-modal");
}

beforeEach(() => {
  userDataModuleMock.deleteUserData.mockReset();
});

describe("<ArcoCancelModal> — T-PR6-009..011", () => {
  it("abre como `<dialog open>` con copy correcto, input email y confirm disabled", async () => {
    const { ArcoCancelModal } = await loadModal();
    render(
      <ArcoCancelModal
        userEmail="ada@example.com"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.tagName.toLowerCase()).toBe("dialog");
    const title = screen.getByText("¿Eliminar tu cuenta?");
    expect(title).toBeInTheDocument();
    const body = screen.getByText(
      /Vas a eliminar tu perfil y todos tus consentimientos/,
    );
    expect(body).toBeInTheDocument();
    const input = screen.getByLabelText(
      /Escribí tu email para confirmar: ada@example.com/,
    );
    expect(input).toBeInTheDocument();
    const confirmBtn = screen.getByRole("button", {
      name: "Eliminar definitivamente",
    });
    expect(confirmBtn).toBeDisabled();
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    expect(cancelBtn).toBeEnabled();
  });

  it("confirm permanece disabled con email incorrecto (T-PR6-009)", async () => {
    const { ArcoCancelModal } = await loadModal();
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ArcoCancelModal
        userEmail="ada@example.com"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(
      /Escribí tu email para confirmar: ada@example.com/,
    );
    await user.type(input, "wrong@example.com");
    const confirmBtn = screen.getByRole("button", {
      name: "Eliminar definitivamente",
    });
    expect(confirmBtn).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirm se habilita al escribir el email exacto (case-insensitive) y al click invoca `onConfirm`", async () => {
    const { ArcoCancelModal } = await loadModal();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <ArcoCancelModal
        userEmail="ada@example.com"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(
      /Escribí tu email para confirmar: ada@example.com/,
    );
    // type-insensitive
    await user.type(input, "  ADA@example.com  ");
    const confirmBtn = screen.getByRole("button", {
      name: "Eliminar definitivamente",
    });
    expect(confirmBtn).toBeEnabled();
    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("click en Cancel invoca `onCancel` y NO llama a `onConfirm` (T-PR6-011)", async () => {
    const { ArcoCancelModal } = await loadModal();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ArcoCancelModal
        userEmail="ada@example.com"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    await user.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("NO expone el email del usuario en logs (NFR-OBS-1 / Art. III)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { ArcoCancelModal } = await loadModal();
    render(
      <ArcoCancelModal
        userEmail="ada@example.com"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const allCalls = [
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
      ...logSpy.mock.calls,
      ...infoSpy.mock.calls,
    ]
      .flat()
      .map((c) => String(c));
    for (const call of allCalls) {
      expect(call).not.toContain("ada@example.com");
    }
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
    infoSpy.mockRestore();
  });
});

// fireEvent import kept for potential future use
void fireEvent;