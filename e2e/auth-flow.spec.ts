import { test, expect, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

const NEXTAUTH_SECRET = "playwright-e2e-secret-that-is-long-enough-for-hs256!";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

async function setNextAuthSession(
  page: Page,
  userId: string,
  email: string,
  name: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const token = await encode({
    token: {
      sub: userId,
      email,
      name,
      iat: now,
      exp: now + SESSION_MAX_AGE_SECONDS,
    },
    secret: NEXTAUTH_SECRET,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function mockBffBalance(page: Page, balance: number): Promise<void> {
  await page.route("**/api/credits/balance", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ balance, recentConsumption: 0 }),
    });
  });
  await page.route("**/api/credits/history**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ entries: [], nextCursor: null }),
    });
  });
}

test.describe("013.2-web-jwt-cookie — Auth flow", () => {
  test("AuthFlow_SignIn_Google_CreatesUserInBackend", async ({ page }) => {
    const userId = "11111111-1111-1111-1111-111111111111";

    await setNextAuthSession(page, userId, "test@gmail.com", "Google Tester");

    await page.goto("/analizar");

    expect(page.url()).toContain("/analizar");

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "next-auth.session-token");
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie?.value.length).toBeGreaterThan(0);
  });

  test("AuthFlow_SignIn_LinkedIn_CreatesUserInBackend", async ({ page }) => {
    const userId = "22222222-2222-2222-2222-222222222222";

    await setNextAuthSession(page, userId, "test@linkedin.com", "LinkedIn Tester");

    await page.goto("/analizar");

    expect(page.url()).toContain("/analizar");

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "next-auth.session-token");
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie?.value.length).toBeGreaterThan(0);
  });

  test("AuthFlow_FullFlow_SignIn_NavigateToAnalizar_GetBalanceReturns200", async ({ page }) => {
    const userId = "33333333-3333-3333-3333-333333333333";

    await setNextAuthSession(page, userId, "test@gmail.com", "Full Flow Tester");
    await mockBffBalance(page, 5);

    await page.goto("/analizar");

    const badge = page.getByTestId("credit-badge");
    await expect(badge).toBeVisible({ timeout: 10_000 });
    await expect(badge).toHaveAttribute("data-state", "ok");
    await expect(badge).toHaveText(/^5 créditos$/);
  });

  // 019-navigation-onboarding — REQ-LOCAL-001 regression guard.
  // En local mode (NEXT_PUBLIC_LOCAL_MODE=true), /auth/signin salta
  // el form de OAuth y redirige al usuario a /analizar (NO
  // /analizar/iterate). El landing point es ahora descubrible:
  // empty state con CTA 'Importar CV'.
  test("AuthFlow_019_SignIn_LocalMode_RedirectsToAnalizar_NotIterate", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page).toHaveURL(/\/analizar(\?|$)/);
    expect(page.url()).not.toMatch(/\/analizar\/iterate/);
  });
});