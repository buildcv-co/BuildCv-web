import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBalance, fetchHistory, CreditError } from "./credits";

describe("fetchBalance", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed balance object on 200", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ balance: 7, recentConsumption: 2 }), { status: 200 }),
    );

    const balance = await fetchBalance();

    expect(balance).toEqual({ balance: 7, recentConsumption: 2 });
  });

  it("throws CreditError on network failure", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(fetchBalance()).rejects.toThrow(CreditError);
  });

  it("throws CreditError on non-OK response", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "AUTH/UNAUTHENTICATED" }), { status: 401 }),
    );

    await expect(fetchBalance()).rejects.toMatchObject({
      status: 401,
      code: "AUTH/UNAUTHENTICATED",
    });
  });
});

describe("fetchHistory", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes limit and cursor in query params", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ entries: [], nextCursor: null }), { status: 200 }),
    );

    await fetchHistory({ limit: 25, cursor: "abc" });

    const called = fetchMock.mock.calls[0][0] as string;
    expect(called).toContain("limit=25");
    expect(called).toContain("cursor=abc");
  });

  it("returns parsed history page on 200", async () => {
    const fetchMock = vi.mocked(fetch);
    const sample = {
      entries: [
        {
          id: "e1",
          userId: "u1",
          reason: "Welcome",
          reference: "welcome:u1",
          delta: 3,
          balanceAfter: 3,
          metadata: null,
          createdAt: "2026-06-01T00:00:00Z",
        },
      ],
      nextCursor: null,
    };
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(sample), { status: 200 }));

    const page = await fetchHistory();

    expect(page.entries).toHaveLength(1);
    expect(page.entries[0].reason).toBe("Welcome");
    expect(page.nextCursor).toBeNull();
  });
});
