import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LowCreditBanner } from "./low-credit-banner";

describe("LowCreditBanner", () => {
  it("renders nothing when balance is above threshold", () => {
    const { container } = render(<LowCreditBanner balance={5} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders warning state at threshold balance", () => {
    render(<LowCreditBanner balance={2} />);

    const banner = screen.getByTestId("low-credit-banner");
    expect(banner).toHaveAttribute("data-state", "low");
    expect(banner).toHaveAttribute("role", "alert");
    expect(screen.getByText(/Te quedan 2 créditos/)).toBeInTheDocument();
    expect(screen.getByTestId("buy-credits-link")).toHaveAttribute("href", "/pricing");
  });

  it("renders zero state when balance is zero", () => {
    render(<LowCreditBanner balance={0} />);

    const banner = screen.getByTestId("low-credit-banner");
    expect(banner).toHaveAttribute("data-state", "zero");
    expect(screen.getByText(/Sin créditos/)).toBeInTheDocument();
  });

  it("uses singular noun for balance of 1", () => {
    render(<LowCreditBanner balance={1} />);

    expect(screen.getByText(/Te quedan 1 crédito\./)).toBeInTheDocument();
  });
});
