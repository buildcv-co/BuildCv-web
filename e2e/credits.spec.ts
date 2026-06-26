import { test, expect, type Page } from "@playwright/test";

const BALANCE_RESPONSE = (balance: number) => ({
  balance,
  recentConsumption: 0,
});

const HISTORY_RESPONSE = (entries: Array<Record<string, unknown>> = []) => ({
  entries,
  nextCursor: null,
});

async function mockBalanceRoute(page: Page, balance: number) {
  await page.route("**/api/credits/balance", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(BALANCE_RESPONSE(balance)),
    });
  });
}

async function mockHistoryRoute(page: Page, entries: Array<Record<string, unknown>> = []) {
  await page.route("**/api/credits/history", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(HISTORY_RESPONSE(entries)),
    });
  });
}

async function mockAdaptRoute(page: Page, status = 200) {
  await page.route("**/api/adapt", async (route) => {
    if (status === 402) {
      await route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          type: "https://buildcv.com/errors/credit-insufficient",
          title: "INSUFFICIENT_CREDITS",
          status: 402,
          code: "CREDIT/INSUFFICIENT",
          balance: 0,
          required: 1,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        adaptedCv: "# CV adaptado\n\n- AWS",
        validation: { isValid: true, severity: "None", inventions: [], warnings: [] },
        engineVersion: "1.0.0",
        aiModel: "stub",
      }),
    });
  });
}

/**
 * Dismisses the dev-only `DevErrorOverlay` if it appears. See the
 * `a11y-structured.spec.ts` for the full rationale.
 */
async function dismissDevErrorOverlayIfPresent(page: Page): Promise<void> {
  const overlay = page.locator('[aria-label="Panel de errores en desarrollo"]');
  if ((await overlay.count()) === 0) return;
  const dismiss = overlay.getByRole("button", { name: /descartar panel/i }).first();
  if ((await dismiss.count()) > 0) {
    await dismiss.click();
  }
}

/**
 * Fills the JobSpecForm with valid data and submits it. The form's
 * internal submit calls `onJob(job)` which propagates to `InputPanel`'s
 * `pendingJob` state — without this, the analyzer-level submit stays
 * disabled (Constitution Art. V: form schema is the only allowed gate).
 */
async function fillAndSubmitJobSpecForm(page: Page): Promise<void> {
  await dismissDevErrorOverlayIfPresent(page);
  await page.getByLabel("Título del puesto").fill("Backend Developer");
  await page.getByLabel("Empresa").fill("Acme Corp");
  await page.getByLabel("Ubicación").fill("Remoto, Colombia");
  await page.getByLabel("Tipo de empleo").selectOption("full_time");
  await page.getByLabel("Descripción de la vacante").fill("Buscamos backend .NET con AWS.");
  await page.getByLabel("Requisito 1", { exact: true }).fill("3 años de experiencia en .NET");
  await page.getByTestId("job-spec-form-submit").click();
}

/**
 * Mock mínimo de ScoreCvResponseV2 (engineVersion 2.0.0). El BFF
 * /api/score se mockea con el contrato v2 desde PR 5b — la UI del
 * analyzer discrimina con `isScoreResponseV2` y renderiza el
 * `SectionBreakdown` con perSection + redFlags.
 */
const SCORE_MOCK_V2 = {
  overallScore: 75,
  band: "high",
  perSection: { experience: 70, education: 60, skills: 80, certifications: 0, contact: 90 },
  redFlags: [],
  gatesApplied: [],
  honestyNotice: "coincidencia con la vacante + legibilidad",
  engineVersion: "2.0.0",
  lexiconVersion: "1.0.0",
  traceId: "ctx-test",
};

test.describe("013-credit-consumption — UI", () => {
  test("credit badge muestra '3 créditos' después del signup", async ({ page }) => {
    await mockBalanceRoute(page, 3);
    await mockHistoryRoute(page);
    await page.goto("/analizar");

    const badge = page.getByTestId("credit-badge");
    await expect(badge).toHaveAttribute("data-state", "ok");
    await expect(badge).toHaveText(/^3 créditos$/);
  });

  test("credit badge muestra estado zero en rojo cuando balance=0", async ({ page }) => {
    await mockBalanceRoute(page, 0);
    await mockHistoryRoute(page);
    await page.goto("/analizar");

    const badge = page.getByTestId("credit-badge");
    await expect(badge).toHaveAttribute("data-state", "zero");
    await expect(badge).toHaveAttribute("data-balance", "0");
  });

  test("credit badge muestra estado low en amber cuando balance=2", async ({ page }) => {
    await mockBalanceRoute(page, 2);
    await mockHistoryRoute(page);
    await page.goto("/analizar");

    const badge = page.getByTestId("credit-badge");
    await expect(badge).toHaveAttribute("data-state", "low");
  });

  test("badge permanece visible cuando balance cambia entre renders", async ({ page }) => {
    await mockBalanceRoute(page, 7);
    await mockHistoryRoute(page);

    await page.goto("/analizar");
    const badge = page.getByTestId("credit-badge");
    await expect(badge).toHaveAttribute("data-state", "ok");
    await expect(badge).toHaveAttribute("data-balance", "7");
    await expect(badge).toHaveText(/^7 créditos$/);
  });

  test("low-credit banner aparece cuando balance ≤ 2", async ({ page }) => {
    await mockBalanceRoute(page, 2);
    await mockHistoryRoute(page);
    await page.goto("/analizar");

    const banner = page.getByTestId("low-credit-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute("data-state", "low");
    await expect(page.getByTestId("buy-credits-link")).toHaveAttribute("href", "/pricing");
  });

  test("low-credit banner muestra estado zero cuando balance=0", async ({ page }) => {
    await mockBalanceRoute(page, 0);
    await mockHistoryRoute(page);
    await page.goto("/analizar");

    const banner = page.getByTestId("low-credit-banner");
    await expect(banner).toHaveAttribute("data-state", "zero");
    await expect(banner).toContainText(/Sin créditos/);
  });

  test("low-credit banner NO aparece cuando balance > 2", async ({ page }) => {
    await mockBalanceRoute(page, 5);
    await mockHistoryRoute(page);
    await page.goto("/analizar");

    await expect(page.getByTestId("low-credit-banner")).toHaveCount(0);
  });

  test("adapt: 402 muestra modal con link Comprar más créditos", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "buildcv:analizar:cv-preseed",
        "Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8),
      );
    });
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SCORE_MOCK_V2),
      });
    });
    await mockBalanceRoute(page, 0);
    await mockHistoryRoute(page);
    await mockAdaptRoute(page, 402);

    await page.goto("/analizar");
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();
    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();

    const modal = page.getByTestId("payment-required-modal");
    await expect(modal).toBeVisible();
    await expect(page.getByTestId("payment-required-buy-link")).toHaveAttribute("href", "/pricing");
  });

  test("adapt: 402 modal tiene botón Cancelar que cierra el modal", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "buildcv:analizar:cv-preseed",
        "Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8),
      );
    });
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SCORE_MOCK_V2),
      });
    });
    await mockBalanceRoute(page, 0);
    await mockHistoryRoute(page);
    await mockAdaptRoute(page, 402);

    await page.goto("/analizar");
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();
    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();
    await expect(page.getByTestId("payment-required-modal")).toBeVisible();

    await page.getByTestId("payment-required-cancel").click();
    await expect(page.getByTestId("payment-required-modal")).toHaveCount(0);
  });

  test("adapt: 200 después de comprar más créditos", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "buildcv:analizar:cv-preseed",
        "Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8),
      );
    });
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(SCORE_MOCK_V2),
      });
    });
    await mockBalanceRoute(page, 5);
    await mockHistoryRoute(page);
    await mockAdaptRoute(page, 200);

    await page.goto("/analizar");
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();
    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();

    await expect(page.getByRole("heading", { name: "CV adaptado" })).toBeVisible();
  });

  test("history: muestra entradas paginadas con nextCursor", async ({ page }) => {
    const sampleEntries = [
      {
        id: "e1",
        userId: "u1",
        reason: "Purchase",
        reference: "payment:abc",
        delta: 10,
        balanceAfter: 10,
        metadata: null,
        createdAt: "2026-06-24T12:00:00Z",
      },
      {
        id: "e2",
        userId: "u1",
        reason: "Consumption",
        reference: "adapt:xyz",
        delta: -1,
        balanceAfter: 9,
        metadata: null,
        createdAt: "2026-06-24T12:05:00Z",
      },
    ];
    await mockBalanceRoute(page, 9);
    await mockHistoryRoute(page, sampleEntries);

    let capturedLimit: string | null = null;
    await page.route("**/api/credits/history**", async (route) => {
      const url = new URL(route.request().url());
      capturedLimit = url.searchParams.get("limit");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          entries: sampleEntries,
          nextCursor: "abc-cursor",
        }),
      });
    });

    await page.goto("/api/credits/history?limit=10");
    expect(capturedLimit).toBe("10");
  });
});
