import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentError, fetchPayment, listPayments, requestCheckout } from "./payment";

describe("requestCheckout", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws PaymentError on network failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("boom"));

    await expect(requestCheckout("starter")).rejects.toMatchObject({
      code: "PAYMENT_NETWORK",
      status: 0,
    });
  });

  it("returns the checkout session on success", async () => {
    const session = {
      sessionId: "sess-1",
      publicKey: "pub_test",
      amountInCents: 1_500_000,
      currency: "COP",
      reference: "ref-1",
    };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(session), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await requestCheckout("starter");
    expect(result).toEqual(session);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/payments/checkout",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("maps 400 to PaymentError with code from problem details", async () => {
    const body = { error: "PAYMENT/INVALID_PACKAGE", message: "bad" };
    const responses = [
      new Response(JSON.stringify(body), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
      new Response(JSON.stringify(body), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    ];
    vi.mocked(fetch).mockResolvedValueOnce(responses[0]).mockResolvedValueOnce(responses[1]);

    await expect(requestCheckout("nope")).rejects.toBeInstanceOf(PaymentError);
    await expect(requestCheckout("nope")).rejects.toMatchObject({
      code: "PAYMENT/INVALID_PACKAGE",
      status: 400,
    });
  });

  it("throws on invalid response shape", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ not: "a session" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(requestCheckout("starter")).rejects.toMatchObject({
      code: "PAYMENT_INVALID_RESPONSE",
    });
  });
});

describe("fetchPayment", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the payment on success", async () => {
    const payment = { id: "p1", amountInCents: 1500000 };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(payment), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchPayment("p1");
    expect(result).toEqual(payment);
  });
});

describe("listPayments", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds query string and returns array", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "p1" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await listPayments({ page: 2, perPage: 5 });
    expect(result).toEqual([{ id: "p1" }]);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/payments?page=2&perPage=5",
      expect.any(Object),
    );
  });
});
