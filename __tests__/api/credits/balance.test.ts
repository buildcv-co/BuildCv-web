import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBalance } from "@/lib/api/credits";

describe("BFF balance route contract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses no-store cache and the expected path", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ balance: 5, recentConsumption: 0 }), { status: 200 }),
    );

    await fetchBalance();

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit | undefined;
    expect(init?.cache).toBe("no-store");
    const calledUrl = vi.mocked(fetch).mock.calls[0][0];
    expect(calledUrl).toBe("/api/credits/balance");
  });
});
