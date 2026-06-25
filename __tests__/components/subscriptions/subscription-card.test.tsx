import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";

describe("SubscriptionCard", () => {
  it("renders the empty state with subscribe CTA when no subscription", () => {
    const onSubscribe = vi.fn();

    render(<SubscriptionCard subscription={null} onSubscribe={onSubscribe} onCancel={vi.fn()} />);

    expect(screen.getByTestId("subscription-card-empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suscribirme/i })).toBeInTheDocument();
  });

  it("displays plan and active status for an active subscription", () => {
    const subscription = {
      id: "sub-1",
      plan: "starter" as const,
      status: "active" as const,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      nextChargeAt: "2026-07-29T00:00:00.000Z",
      canceledAt: null,
    };

    render(<SubscriptionCard subscription={subscription} onSubscribe={vi.fn()} onCancel={vi.fn()} />);

    const card = screen.getByTestId("subscription-card");
    expect(card).toHaveAttribute("data-status", "active");
    expect(screen.getByText(/se renueva automáticamente cada mes/i)).toBeInTheDocument();
    expect(screen.getAllByText(/starter/i).length).toBeGreaterThan(0);
  });

  it("shows the access-until message and re-subscribe CTA for a canceled subscription", () => {
    const subscription = {
      id: "sub-1",
      plan: "standard" as const,
      status: "canceled" as const,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      nextChargeAt: "2026-07-29T00:00:00.000Z",
      canceledAt: "2026-07-15T00:00:00.000Z",
    };

    render(<SubscriptionCard subscription={subscription} onSubscribe={vi.fn()} onCancel={vi.fn()} />);

    const card = screen.getByTestId("subscription-card");
    expect(card).toHaveAttribute("data-status", "canceled");
    expect(screen.getAllByText(/suscripción cancelada/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /suscribirme/i })).toBeInTheDocument();
  });

  it("invokes onCancel when the cancel CTA is clicked on an active subscription", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <SubscriptionCard
        subscription={{
          id: "sub-1",
          plan: "starter" as const,
          status: "active" as const,
          currentPeriodEnd: "2026-08-01T00:00:00.000Z",
          nextChargeAt: "2026-07-29T00:00:00.000Z",
          canceledAt: null,
        }}
        onSubscribe={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: /cancelar suscripción/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});