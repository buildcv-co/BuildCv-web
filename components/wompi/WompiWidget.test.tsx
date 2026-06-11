import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WompiWidget } from "./WompiWidget";
import type { CheckoutSession } from "./wompi-types";

const SAMPLE_SESSION: CheckoutSession = {
  sessionId: "sess-1",
  publicKey: "pub_test",
  amountInCents: 1_500_000,
  currency: "COP",
  reference: "ref-1",
};

describe("WompiWidget", () => {
  beforeEach(() => {
    window.WidgetCheckout = {
      open: vi.fn(() => ({
        on: vi.fn(),
        unmount: vi.fn(),
      })),
    };
  });

  afterEach(() => {
    delete window.WidgetCheckout;
  });

  it("renders the widget container with the configured locale", () => {
    render(<WompiWidget session={SAMPLE_SESSION} locale="es" />);

    const container = screen.getByTestId("wompi-widget");
    expect(container).toBeInTheDocument();
    expect(container.getAttribute("data-locale")).toBe("es");
  });

  it("opens the Wompi widget with the session parameters", () => {
    render(<WompiWidget session={SAMPLE_SESSION} />);

    expect(window.WidgetCheckout?.open).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: "COP",
        amountInCents: 1_500_000,
        reference: "ref-1",
        publicKey: "pub_test",
        sessionId: "sess-1",
      }),
    );
  });
});
