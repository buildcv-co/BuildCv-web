import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CancelModal } from "@/components/subscriptions/cancel-modal";

describe("CancelModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <CancelModal open={false} accessUntil={null} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the confirmation copy and the access-until date when open", () => {
    render(
      <CancelModal
        open={true}
        accessUntil="2026-08-01"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByTestId("cancel-modal")).toBeInTheDocument();
    expect(screen.getByText(/¿cancelar la suscripción\?/i)).toBeInTheDocument();
    expect(screen.getByText(/sin reembolso al cancelar/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-08-01/)).toBeInTheDocument();
  });

  it("invokes onConfirm when the destructive button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <CancelModal open={true} accessUntil={null} onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: /sí, cancelar/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose when the keep button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CancelModal open={true} accessUntil={null} onClose={onClose} onConfirm={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /no, mantener/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("displays an error alert when onConfirm rejects", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error("network"));

    render(
      <CancelModal open={true} accessUntil={null} onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: /sí, cancelar/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});