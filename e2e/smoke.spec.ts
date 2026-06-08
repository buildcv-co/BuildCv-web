import { test, expect } from "@playwright/test";

test.describe("Landing", () => {
  test("muestra el título, el CTA y la copy de privacidad", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: /medido con honestidad/i }),
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: /analizar mi cv/i }).first(),
    ).toBeVisible();

    await expect(
      page.getByText(/tus datos no entrenan ninguna ia/i),
    ).toBeAttached();
  });
});
