import { test, expect, type Page } from "@playwright/test";

const ACTIVE_SUB = {
  id: "11111111-1111-1111-1111-111111111111",
  plan: "starter",
  status: "active",
  currentPeriodStart: "2026-06-25T00:00:00.000Z",
  currentPeriodEnd: "2026-07-25T00:00:00.000Z",
  nextChargeAt: "2026-07-22T00:00:00.000Z",
  canceledAt: null,
};

const CANCELED_SUB = {
  id: "11111111-1111-1111-1111-111111111111",
  plan: "starter",
  status: "canceled",
  currentPeriodStart: "2026-06-25T00:00:00.000Z",
  currentPeriodEnd: "2026-07-25T00:00:00.000Z",
  nextChargeAt: "2026-07-22T00:00:00.000Z",
  canceledAt: "2026-07-10T00:00:00.000Z",
};

type MockState = {
  initialGet: { status: number; body: unknown };
  post?: { status: number; body: unknown };
  postCapture?: (body: { plan: string; paymentSourceId: string }) => void;
  afterPostGet?: { status: number; body: unknown };
  afterDeleteGet?: { status: number; body: unknown };
};

async function applyMock(page: Page, state: MockState) {
  let postOccurred = false;
  let deleteOccurred = false;
  await page.route("**/api/subscriptions", async (route) => {
    if (route.request().method() === "GET") {
      const getResponse =
        deleteOccurred && state.afterDeleteGet
          ? state.afterDeleteGet
          : postOccurred && state.afterPostGet
            ? state.afterPostGet
            : state.initialGet;
      await route.fulfill({
        status: getResponse.status,
        contentType: "application/json",
        body: JSON.stringify(getResponse.body),
      });
      return;
    }
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { plan: string; paymentSourceId: string };
      state.postCapture?.(body);
      const postResponse = state.post ?? { status: 201, body: ACTIVE_SUB };
      postOccurred = true;
      await route.fulfill({
        status: postResponse.status,
        contentType: "application/json",
        body: JSON.stringify(postResponse.body),
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/subscriptions/cancel", async (route) => {
    deleteOccurred = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "canceled", accessUntil: CANCELED_SUB.currentPeriodEnd }),
    });
  });
}

test.describe("016-subscription-recurring — UI", () => {
  test("empty state shows subscribe CTA and opens modal", async ({ page }) => {
    await applyMock(page, {
      initialGet: { status: 404, body: { error: "SUBSCRIPTION/NOT_FOUND" } },
    });

    await page.goto("/suscripciones");

    const emptyCard = page.getByTestId("subscription-card-empty");
    await expect(emptyCard).toBeVisible();

    await page.getByRole("button", { name: /suscribirme/i }).first().click();

    const modal = page.getByTestId("subscribe-modal");
    await expect(modal).toBeVisible();
    await expect(page.getByTestId("plan-option-starter")).toHaveAttribute("data-selected", "true");
  });

  test("subscribe flow: modal confirms a plan and payment source", async ({ page }) => {
    let capturedPlan: string | null = null;
    let capturedPaymentSource: string | null = null;

    await applyMock(page, {
      initialGet: { status: 404, body: { error: "SUBSCRIPTION/NOT_FOUND" } },
      postCapture: (body) => {
        capturedPlan = body.plan;
        capturedPaymentSource = body.paymentSourceId;
      },
    });

    await page.goto("/suscripciones");
    await page.getByRole("button", { name: /suscribirme/i }).first().click();
    await page.getByTestId("plan-option-standard").click();
    await page.getByLabel(/wompi payment source/i).fill("ps_test_e2e");
    await page.getByRole("button", { name: /suscribirme/i }).nth(1).click();

    expect(capturedPlan).toBe("standard");
    expect(capturedPaymentSource).toBe("ps_test_e2e");
  });

  test("subscription card: displays active plan and renews-automatically copy", async ({ page }) => {
    await applyMock(page, { initialGet: { status: 200, body: ACTIVE_SUB } });

    await page.goto("/suscripciones");

    const card = page.getByTestId("subscription-card");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-status", "active");
    await expect(card).toContainText(/se renueva automáticamente cada mes/i);
  });

  test("cancel flow: confirms cancellation and updates UI to canceled state", async ({ page }) => {
    await applyMock(page, {
      initialGet: { status: 200, body: ACTIVE_SUB },
      afterDeleteGet: { status: 200, body: CANCELED_SUB },
    });

    await page.goto("/suscripciones");
    await page.getByRole("button", { name: /cancelar suscripción/i }).click();

    const cancelModal = page.getByTestId("cancel-modal");
    await expect(cancelModal).toBeVisible();
    await expect(cancelModal).toContainText(/sin reembolso al cancelar/i);

    await page.getByRole("button", { name: /sí, cancelar/i }).click();

    const card = page.getByTestId("subscription-card");
    await expect(card).toHaveAttribute("data-status", "canceled");
    await expect(card).toContainText(/suscripción cancelada/i);
  });

  test("subscribe when already canceled-but-active server-side: 409 shows error alert", async ({ page }) => {
    await applyMock(page, {
      initialGet: { status: 200, body: CANCELED_SUB },
      post: { status: 409, body: { error: "SUBSCRIPTION/ALREADY_ACTIVE" } },
    });

    await page.goto("/suscripciones");
    await page.getByRole("button", { name: /suscribirme/i }).first().click();
    await page.getByLabel(/wompi payment source/i).fill("ps_test_dup");
    await page.getByRole("button", { name: /suscribirme/i }).nth(1).click();

    const alert = page.getByText(/no pudimos procesar la suscripción/i);
    await expect(alert).toBeVisible();
    await expect(alert).toHaveAttribute("role", "alert");
  });

  test("feature flag disabled: 503 shows error alert", async ({ page }) => {
    await applyMock(page, {
      initialGet: { status: 404, body: { error: "SUBSCRIPTION/NOT_FOUND" } },
      post: { status: 503, body: { error: "SUBSCRIPTION/DISABLED" } },
    });

    await page.goto("/suscripciones");
    await page.getByRole("button", { name: /suscribirme/i }).first().click();
    await page.getByLabel(/wompi payment source/i).fill("ps_test_disabled");
    await page.getByRole("button", { name: /suscribirme/i }).nth(1).click();

    const alert = page.getByText(/no pudimos procesar la suscripción/i);
    await expect(alert).toBeVisible();
    await expect(alert).toHaveAttribute("role", "alert");
  });
});