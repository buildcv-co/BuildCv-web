import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchHistory } from "@/lib/api/credits";

describe("BFF history route contract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards limit and cursor query params via the API client", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ entries: [], nextCursor: null }), { status: 200 }),
    );

    await fetchHistory({ limit: 25, cursor: "abc" });

    const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=25");
    expect(calledUrl).toContain("cursor=abc");
  });
});
