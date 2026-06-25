import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubscribeModal } from "@/components/subscriptions/subscribe-modal";

describe("SubscribeModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <SubscribeModal open={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("opens the plan picker with both plans and the Starter selected by default", () => {
    render(<SubscribeModal open={true} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByTestId("subscribe-modal")).toBeInTheDocument();
    expect(screen.getByTestId("plan-option-starter")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("plan-option-standard")).toHaveAttribute("data-selected", "false");
  });

  it("selects Standard when the user clicks its card", async () => {
    const user = userEvent.setup();

    render(<SubscribeModal open={true} onClose={vi.fn()} onConfirm={vi.fn()} />);

    await user.click(screen.getByTestId("plan-option-standard"));

    expect(screen.getByTestId("plan-option-standard")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("plan-option-starter")).toHaveAttribute("data-selected", "false");
  });

  it("calls onConfirm with the chosen plan and payment source", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(<SubscribeModal open={true} onClose={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByTestId("plan-option-standard"));
    await user.type(screen.getByLabelText(/wompi payment source/i), "ps_test_001");
    await user.click(screen.getByRole("button", { name: /suscribirme/i }));

    expect(onConfirm).toHaveBeenCalledWith("standard", "ps_test_001");
  });

  it("shows an error alert when the payment source is empty", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<SubscribeModal open={true} onClose={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: /suscribirme/i }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("closes the modal when the keep button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<SubscribeModal open={true} onClose={onClose} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /no, mantener/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});