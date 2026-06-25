import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { CreditBadge } from "./credit-badge";

describe("CreditBadge", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows loading placeholder before fetch resolves", () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ balance: 5, recentConsumption: 0 }), { status: 200 }),
    );

    render(<CreditBadge />);

    expect(screen.getByTestId("credit-badge")).toHaveAttribute("data-state", "loading");
  });

  it("displays balance with singular/plural noun", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ balance: 1, recentConsumption: 0 }), { status: 200 }),
    );

    render(<CreditBadge />);

    await waitFor(() => {
      expect(screen.getByTestId("credit-badge")).toHaveTextContent(/^1 crédito$/);
    });

    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ balance: 7, recentConsumption: 2 }), { status: 200 }),
    );

    await act(async () => {
      render(<CreditBadge key="plural" />);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("credit-badge")[1]).toHaveTextContent(/^7 créditos$/);
    });
  });

  it("applies red state when balance is zero", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ balance: 0, recentConsumption: 5 }), { status: 200 }),
    );

    render(<CreditBadge />);

    await waitFor(() => {
      const badge = screen.getByTestId("credit-badge");
      expect(badge).toHaveAttribute("data-state", "zero");
      expect(badge).toHaveAttribute("data-balance", "0");
      expect(badge.className).toMatch(/text-red-600/);
    });
  });

  it("applies amber state when balance is at or below threshold", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ balance: 2, recentConsumption: 1 }), { status: 200 }),
    );

    render(<CreditBadge />);

    await waitFor(() => {
      const badge = screen.getByTestId("credit-badge");
      expect(badge).toHaveAttribute("data-state", "low");
      expect(badge.className).toMatch(/text-amber-600/);
    });
  });

  it("calls onBalanceChange when balance updates", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ balance: 4, recentConsumption: 0 }), { status: 200 }),
    );

    const onChange = vi.fn();
    render(<CreditBadge onBalanceChange={onChange} />);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(4);
    });
  });
});
