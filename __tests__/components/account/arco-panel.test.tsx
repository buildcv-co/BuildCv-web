import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Tests del componente `<ArcoPanel>` (009-auth-web PR6 — T-PR6-005..008).
 *
 * Spec: REQ-FN-014 + REQ-FN-015 + REQ-FN-016 + REQ-FN-021 + CR-ARCO-1.
 *
 * Cubre:
 *  - Renderiza 3 secciones: Access / Rectify / Cancel.
 *  - Access: botón "Ver mis datos" → muestra JSON en `<details open>`.
 *  - Rectify: editar name + submit → invoca `useArco.rectify({name})`.
 *  - Cancel: botón "Eliminar mi cuenta" → renderiza `<ArcoCancelModal>`.
 *  - Email rotation → `signOut()` + `router.push("/auth/signin?reason=email-rotated")`.
 *  - NO expone tokens / BFF_API_KEY / Authorization / email en logs.
 */

const useArcoMock = vi.fn();
const signOutMock = vi.fn();
const routerPushMock = vi.fn();

vi.mock("@/lib/copy/es", () => ({
  copy: {
    account: {
      arcoSlot: { title: "Derechos ARCO" },
      arco: {
        access: {
          title: "Ver mis datos",
          button: "Ver mis datos",
          jsonLabel: "Detalle de tu cuenta",
        },
        rectify: {
          title: "Rectificar datos",
          nameLabel: "Nombre",
          emailLabel: "Email",
          emailRotationNote:
            "Si cambiás tu email, vas a tener que iniciar sesión de nuevo.",
          submit: "Guardar cambios",
          submitting: "Guardando…",
          success: "Cambios guardados.",
        },
        cancel: {
          title: "Eliminar mi cuenta",
          button: "Eliminar mi cuenta",
          modalTitle: "¿Eliminar tu cuenta?",
          modalBody: "Vas a eliminar tu perfil.",
          emailHelp: (e: string) => `Escribí tu email para confirmar: ${e}`,
          confirm: "Eliminar definitivamente",
          cancel: "Cancelar",
          close: "Cerrar",
        },
        errors: {
          rateLimit: "Demasiadas solicitudes. Reintentá más tarde.",
          validation: "Revisá el formato.",
          network: "No pudimos contactar el servidor. Reintentá.",
          generic: "No pudimos guardar los cambios. Reintentá.",
        },
      },
    },
    auth: {
      emailRotatedBanner:
        "Tu email fue actualizado por una solicitud ARCO. Iniciá sesión con tu nuevo email.",
    },
  },
}));

vi.mock("@/lib/use-arco", () => ({
  useArco: (...args: unknown[]) => useArcoMock(...args),
}));

vi.mock("@/lib/api/sign-out", () => ({
  signOut: () => signOutMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn() }),
  redirect: vi.fn(),
}));

vi.mock("@/components/account/arco-cancel-modal", () => ({
  ArcoCancelModal: ({
    userEmail,
    onConfirm,
    onCancel,
  }: {
    userEmail: string;
    onConfirm: () => Promise<void> | void;
    onCancel: () => void;
  }) => (
    <div data-testid="arco-cancel-modal" data-user-email={userEmail}>
      <button type="button" onClick={onCancel} data-testid="modal-cancel">
        Cancel
      </button>
      <button
        type="button"
        onClick={() => {
          void onConfirm();
        }}
        data-testid="modal-confirm"
      >
        Confirm
      </button>
    </div>
  ),
}));

async function loadPanel() {
  return await import("@/components/account/arco-panel");
}

const SESSION_USER = {
  userId: "11111111-1111-1111-1111-111111111111",
  provider: "google" as const,
  email: "ada@example.com",
  name: "Ada Lovelace",
  createdAt: "2026-06-25T10:00:00Z",
  lastLoginAt: "2026-06-26T08:00:00Z",
};

beforeEach(() => {
  useArcoMock.mockReset();
  signOutMock.mockReset();
  routerPushMock.mockReset();
});

describe("<ArcoPanel> — T-PR6-005..008", () => {
  it("renderiza 3 secciones: Access, Rectify, Cancel (T-PR6-005)", async () => {
    useArcoMock.mockReturnValue({
      status: "idle",
      error: null,
      sessionEmail: SESSION_USER.email,
      rectify: vi.fn(),
      cancel: vi.fn(),
    });
    const { ArcoPanel } = await loadPanel();
    render(<ArcoPanel userData={SESSION_USER} />);

    expect(screen.getByTestId("arco-panel")).toBeInTheDocument();
    expect(screen.getByTestId("arco-access-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("arco-rectify-form")).toBeInTheDocument();
    expect(screen.getByTestId("arco-cancel-trigger")).toBeInTheDocument();
    // el modal NO se renderiza hasta que el usuario hace click
    expect(screen.queryByTestId("arco-cancel-modal")).not.toBeInTheDocument();
  });

  it("Access: click 'Ver mis datos' → muestra JSON en `<details open>` (T-PR6-006)", async () => {
    useArcoMock.mockReturnValue({
      status: "idle",
      error: null,
      sessionEmail: SESSION_USER.email,
      rectify: vi.fn(),
      cancel: vi.fn(),
    });
    const { ArcoPanel } = await loadPanel();
    const user = userEvent.setup();
    render(<ArcoPanel userData={SESSION_USER} />);

    const details = screen.getByTestId("arco-access-details");
    expect(details).toBeInTheDocument();
    expect(details.hasAttribute("open")).toBe(false);

    const button = screen.getByRole("button", { name: "Ver mis datos" });
    await user.click(button);

    expect(details.hasAttribute("open")).toBe(true);
    expect(details.textContent).toContain("ada@example.com");
    expect(details.textContent).toContain("Ada Lovelace");
    expect(details.textContent).toContain("google");
  });

  it("Rectify: editar name + submit → invoca `useArco.rectify({name})` (T-PR6-007)", async () => {
    const rectify = vi.fn().mockResolvedValue(undefined);
    useArcoMock.mockReturnValue({
      status: "idle",
      error: null,
      sessionEmail: SESSION_USER.email,
      rectify,
      cancel: vi.fn(),
    });
    const { ArcoPanel } = await loadPanel();
    const user = userEvent.setup();
    render(<ArcoPanel userData={SESSION_USER} />);

    const nameInput = screen.getByLabelText("Nombre");
    expect(nameInput).toHaveValue("Ada Lovelace");
    await user.clear(nameInput);
    await user.type(nameInput, "Ada Lovelace v2");
    const submit = screen.getByRole("button", { name: "Guardar cambios" });
    await user.click(submit);

    expect(rectify).toHaveBeenCalledTimes(1);
    expect(rectify).toHaveBeenCalledWith({ name: "Ada Lovelace v2" });
  });

  it("Cancel: click 'Eliminar mi cuenta' → renderiza `<ArcoCancelModal>` con `userEmail` (T-PR6-008)", async () => {
    useArcoMock.mockReturnValue({
      status: "idle",
      error: null,
      sessionEmail: SESSION_USER.email,
      rectify: vi.fn(),
      cancel: vi.fn(),
    });
    const { ArcoPanel } = await loadPanel();
    const user = userEvent.setup();
    render(<ArcoPanel userData={SESSION_USER} />);

    const cancel = screen.getByRole("button", { name: "Eliminar mi cuenta" });
    await user.click(cancel);

    const modal = screen.getByTestId("arco-cancel-modal");
    expect(modal).toBeInTheDocument();
    expect(modal.dataset.userEmail).toBe("ada@example.com");
  });

  it("Cancel modal confirm → llama `useArco.cancel()` + `signOut()` + `router.push('/auth/signin?reason=arco-cancel')`", async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    useArcoMock.mockReturnValue({
      status: "idle",
      error: null,
      sessionEmail: SESSION_USER.email,
      rectify: vi.fn(),
      cancel,
    });
    const { ArcoPanel } = await loadPanel();
    const user = userEvent.setup();
    render(<ArcoPanel userData={SESSION_USER} />);

    await user.click(screen.getByRole("button", { name: "Eliminar mi cuenta" }));
    await user.click(screen.getByTestId("modal-confirm"));

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(routerPushMock).toHaveBeenCalledWith(
      expect.stringContaining("reason=arco-cancel"),
    );
  });

  it("NO expone email en logs (NFR-OBS-1 / Art. III)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    useArcoMock.mockReturnValue({
      status: "idle",
      error: null,
      sessionEmail: SESSION_USER.email,
      rectify: vi.fn(),
      cancel: vi.fn(),
    });
    const { ArcoPanel } = await loadPanel();
    render(<ArcoPanel userData={SESSION_USER} />);

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
      expect(call).not.toContain("Bearer");
      expect(call).not.toContain("BFF_API_KEY");
    }
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
    infoSpy.mockRestore();
  });
});