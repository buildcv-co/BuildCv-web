import { test, expect } from "@playwright/test";
import { MOCK_USER, openUserMenu, resetMockBackend, setNextAuthSession } from "./auth-web-fixtures";

test.describe("009-auth-web PR8 — UserMenu smoke and a11y", () => {
  test.skip(process.env.NEXT_PUBLIC_LOCAL_MODE !== "false", "Requires non-local NextAuth mode.");

  test.beforeEach(async ({ page }) => {
    await resetMockBackend(page);
    await setNextAuthSession(page);
  });

  test("UserMenu_AuthenticatedShowsEmailAndCuentaLink", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("user-menu-trigger")).toHaveAccessibleName(
      new RegExp(MOCK_USER.email),
    );
    await openUserMenu(page);
    await expect(page.getByTestId("user-menu-dialog")).toHaveAttribute("aria-label", /menú/i);
    await expect(page.getByTestId("user-menu-my-account")).toHaveAttribute("href", "/cuenta");
  });

  test("UserMenu_DialogRestoresFocusAfterEscape", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByTestId("user-menu-trigger");
    await openUserMenu(page);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });

  test("UserMenu_SignOutClearsVisibleAuthenticatedState", async ({ page }) => {
    await page.goto("/");
    await openUserMenu(page);
    await page.getByTestId("user-menu-signout").click();
    await expect(page.getByTestId("user-menu-signin")).toBeVisible();
    await expect(page.getByText(MOCK_USER.email)).toHaveCount(0);
  });
});
