import { expect, type Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

const NEXTAUTH_SECRET = "playwright-e2e-secret-that-is-long-enough-for-hs256!";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export const MOCK_USER = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "ada@example.com",
  name: "Ada Lovelace",
};

export async function setNextAuthSession(page: Page): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const token = await encode({
    token: {
      sub: MOCK_USER.id,
      email: MOCK_USER.email,
      name: MOCK_USER.name,
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

export async function resetMockBackend(page: Page): Promise<void> {
  await page.request.post("http://127.0.0.1:4018/__test/reset", {
    data: { email: MOCK_USER.email, name: MOCK_USER.name },
  });
}

export async function openUserMenu(page: Page): Promise<void> {
  const trigger = page.getByTestId("user-menu-trigger");
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();
  await page.waitForFunction(
    () =>
      (document.querySelector('[data-testid="user-menu-dialog"]') as HTMLDialogElement | null)
        ?.open === true,
  );
}
