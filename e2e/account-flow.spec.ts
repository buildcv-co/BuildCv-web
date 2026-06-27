import { test, expect } from "@playwright/test";
import { MOCK_USER, resetMockBackend, setNextAuthSession } from "./auth-web-fixtures";

test.describe("009-auth-web PR8 — account and ARCO smoke", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockBackend(page);
    await setNextAuthSession(page);
  });

  test("Cuenta_LoadsAuthenticatedUserData", async ({ page }) => {
    await page.goto("/cuenta");
    await expect(page.getByRole("heading", { name: /mi cuenta/i })).toBeVisible();
    await expect(page.getByTestId("datos-personales-email")).toHaveText(MOCK_USER.email);
    await expect(page.getByTestId("datos-personales-provider")).toHaveText(/google/i);
  });

  test("Cuenta_ShowsArcoPanelWithAccessRectifyCancel", async ({ page }) => {
    await page.goto("/cuenta");
    await expect(page.getByTestId("arco-panel")).toBeVisible();
    await expect(page.getByRole("button", { name: /ver mis datos/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /guardar cambios/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /eliminar mi cuenta/i })).toBeVisible();
  });

  test("Arco_AccessExpandsJsonWithUserData", async ({ page }) => {
    await page.goto("/cuenta");
    await page.getByTestId("arco-access-toggle").click();
    await expect(page.getByTestId("arco-access-details")).toHaveAttribute("open", "");
    await expect(page.getByTestId("arco-access-json")).toContainText(MOCK_USER.email);
  });

  test("Arco_RectifyNameShowsSuccessAndUpdatedData", async ({ page }) => {
    await page.goto("/cuenta");
    await page.getByTestId("arco-rectify-name").fill("Ada Byron");
    await page.getByTestId("arco-rectify-submit").click();
    await expect(page.getByTestId("arco-rectify-success")).toBeVisible();
    await page.getByTestId("arco-access-toggle").click();
    await expect(page.getByTestId("arco-access-json")).toContainText("Ada Byron");
  });

  test("Arco_CancelModalRequiresMatchingEmail", async ({ page }) => {
    await page.goto("/cuenta");
    await page.getByTestId("arco-cancel-trigger").click();
    const dialog = page.getByTestId("arco-cancel-modal");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-labelledby", /arco-cancel-title/);
    const confirm = page.getByTestId("arco-confirm-button");
    await expect(confirm).toBeDisabled();
    await page.getByTestId("arco-confirm-email").fill("wrong@example.com");
    await expect(confirm).toBeDisabled();
    await page.getByTestId("arco-confirm-email").fill(`  ${MOCK_USER.email.toUpperCase()}  `);
    await expect(confirm).toBeEnabled();
  });

  test("Arco_CancelConfirmSignsOut", async ({ page }) => {
    await page.goto("/cuenta");
    await page.getByTestId("arco-cancel-trigger").click();
    await page.getByTestId("arco-confirm-email").fill(MOCK_USER.email);
    await page.getByTestId("arco-confirm-button").click();
    await expect(page).toHaveURL(/\/auth\/signin\?reason=arco-cancel/);
  });
});
