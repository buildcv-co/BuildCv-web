import { test, expect, type Page } from "@playwright/test";
import { openUserMenu, resetMockBackend, setNextAuthSession } from "./auth-web-fixtures";

async function expectBaseA11y(page: Page, route: string): Promise<void> {
  const lang = await page.evaluate(() => document.documentElement.lang);
  expect(lang, `${route}: html lang must be declared`).toBeTruthy();
  expect((await page.title()).length, `${route}: title must not be empty`).toBeGreaterThan(0);
  await expect(page.locator("main")).toHaveCount(1);
  const controlsWithoutLabel = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("input, select, textarea"))
      .filter((el) => !el.hasAttribute("disabled"))
      .filter((el) => {
        const id = el.getAttribute("id");
        return !el.getAttribute("aria-label") &&
          !el.getAttribute("aria-labelledby") &&
          !(id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) &&
          !el.closest("label");
      })
      .map((el) => el.getAttribute("data-testid") ?? el.getAttribute("id") ?? el.tagName);
  });
  expect(controlsWithoutLabel, `${route}: form controls must be labelled`).toEqual([]);
}

test.describe("009-auth-web PR8 — in-house a11y", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockBackend(page);
    await setNextAuthSession(page);
  });

  test("A11y_CuentaHasLandmarksHeadingsAndLabels", async ({ page }) => {
    await page.goto("/cuenta");
    await expectBaseA11y(page, "/cuenta");
    await expect(page.getByRole("heading", { name: /datos personales/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /derechos arco/i })).toBeVisible();
  });

  test("A11y_UserMenuDialogHasNameAndKeyboardClose", async ({ page }) => {
    test.skip(process.env.NEXT_PUBLIC_LOCAL_MODE !== "false", "Requires non-local NextAuth mode.");

    await page.goto("/");
    await openUserMenu(page);
    const dialog = page.getByTestId("user-menu-dialog");
    await expect(dialog).toHaveAttribute("aria-label", /menú/i);
    await page.keyboard.press("Tab");
    const focusedInside = await page.evaluate(() => {
      const dialogEl = document.querySelector('[data-testid="user-menu-dialog"]');
      return Boolean(dialogEl?.contains(document.activeElement));
    });
    expect(focusedInside).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("user-menu-trigger")).toBeFocused();
  });

  test("A11y_ArcoCancelModalHasNameLabelAndNoKeyboardTrap", async ({ page }) => {
    await page.goto("/cuenta");
    await page.getByTestId("arco-cancel-trigger").click();
    const modal = page.getByTestId("arco-cancel-modal");
    await expect(modal).toHaveAttribute("aria-labelledby", /arco-cancel-title/);
    // Scope to modal — UserMenu trigger also matches the email regex via aria-label.
    await expect(modal.getByTestId("arco-confirm-email")).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await page.getByTestId("arco-cancel-button").click();
    await expect(modal).toHaveCount(0);
  });

  test("A11y_HeaderNavigationHasAccessibleLandmarks", async ({ page }) => {
    test.skip(process.env.NEXT_PUBLIC_LOCAL_MODE !== "false", "Requires non-local NextAuth mode.");

    await page.goto("/");
    await expect(page.locator("header")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: /principal/i })).toBeVisible();
    await expect(page.getByTestId("user-menu-trigger")).toHaveAccessibleName(/ada@example.com/i, {
      timeout: 10_000,
    });
  });
});
