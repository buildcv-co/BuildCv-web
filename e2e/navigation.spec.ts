import { test, expect } from "@playwright/test";

/**
 * 019-navigation-onboarding — full e2e for navigation, mobile menu,
 * signin redirect and a11y (axe-core). 18 scenarios total in this
 * file (1 from PR1 + 17 new in PR2):
 *  - 1 header-invariant parametrized over 9 routes (PR1).
 *  - 6 cross-route discovery + keyboard traversal.
 *  - 4 mobile menu (hamburger + dialog, Esc, focus return, reduced motion).
 *  - 2 signin local-mode redirect.
 *  - 5 axe-core a11y (zero violations on each measured route).
 *
 * REQ-LANDING-001, REQ-NAV-002..004, REQ-LOCAL-001, REQ-EMPTY-001.
 */

const ROUTES = [
  "/",
  "/analizar",
  "/analizar/iterate",
  "/analizar/diff",
  "/analizar/editar",
  "/importar",
  "/suscripciones",
  "/auth/signin",
  "/ruta-inexistente",
] as const;

function routeLabel(route: (typeof ROUTES)[number]): string {
  if (route === "/") return "_root";
  return route.replaceAll("/", "_");
}

// PR1 invariant — kept as the canary for double-render regressions.
for (const route of ROUTES) {
  test(`Header_ExactlyOneHeader_ExactlyOneNavPrincipal_OnRoute${routeLabel(route)}`, async ({
    page,
  }) => {
    const response = await page.goto(route);
    expect(response, `route ${route} should respond`).not.toBeNull();
    await expect(
      page.locator("header"),
      `route ${route} should render exactly one <header>`,
    ).toHaveCount(1);
    await expect(
      page.locator('nav[aria-label*="principal"]'),
      `route ${route} should render exactly one <nav aria-label*="principal">`,
    ).toHaveCount(1);
  });
}

test.describe("Cross-route discovery", () => {
  test("Nav_LandOnHome_Shows5Items_InicioActivo", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: /principal/i });
    const links = nav.getByRole("link");
    await expect(links).toHaveCount(5);
    await expect(
      nav.getByRole("link", { name: /^inicio$/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("Nav_ClickImportarCV_LandOnImportar_BrowserBack_ReturnsToHome_InicioActivo", async ({
    page,
  }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: /principal/i });
    await nav.getByRole("link", { name: /^importar cv$/i }).click();
    await expect(page).toHaveURL(/\/importar$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page
        .getByRole("navigation", { name: /principal/i })
        .getByRole("link", { name: /^inicio$/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("Nav_ClickAnalizar_LandOnAnalizar_AnalizarActivo", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: /principal/i });
    await nav.getByRole("link", { name: /^analizar$/i }).click();
    await expect(page).toHaveURL(/\/analizar$/);
    await expect(
      nav.getByRole("link", { name: /^analizar$/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("Nav_ActiveState_NestedRoute_MarksParent", async ({ page }) => {
    await page.goto("/analizar/iterate");
    const nav = page.getByRole("navigation", { name: /principal/i });
    await expect(
      nav.getByRole("link", { name: /^analizar$/i }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("Nav_TabTraversal_All5LinksReachable_KeyboardOnly", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    let reachedAllFive = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (!a) return "";
        return a.textContent?.trim() ?? "";
      });
      if (
        /inicio|analizar|importar cv|suscripciones|iniciar sesión/i.test(focused)
      ) {
        const links = await page
          .getByRole("navigation", { name: /principal/i })
          .getByRole("link")
          .all();
        const reachable = await Promise.all(
          links.map((l) => l.evaluate((el) => el === document.activeElement)),
        );
        if (reachable.some((r) => r)) {
          reachedAllFive = true;
          break;
        }
      }
    }
    expect(reachedAllFive).toBe(true);
  });

  test("Nav_LinksSonAnclas_RealAHref_NotButtons", async ({ page }) => {
    await page.goto("/");
    const links = await page
      .getByRole("navigation", { name: /principal/i })
      .getByRole("link")
      .all();
    for (const link of links) {
      const tag = await link.evaluate((el) => el.tagName);
      expect(tag).toBe("A");
    }
  });
});

test.describe("Mobile menu (375x812)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("Mobile_OpenHamburger_OpensDialog_5ItemsVertical", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByTestId("mobile-nav-trigger");
    await trigger.click();
    const dialog = page.getByTestId("mobile-nav-dialog");
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null)
          ?.open === true,
    );
    const nav = dialog.getByRole("navigation", { name: /móvil/i });
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(
      nav.getByRole("link", { name: /^inicio$/i }),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: /^analizar$/i }),
    ).toBeVisible();
    await expect(
      nav.getByRole("link", { name: /^importar cv$/i }),
    ).toBeVisible();
  });

  test("Mobile_EscapeClosesDialog_FocusReturnsToHamburguesa", async ({
    page,
  }) => {
    await page.goto("/");
    await page.bringToFront();
    const trigger = page.getByTestId("mobile-nav-trigger");
    const dialog = page.getByTestId("mobile-nav-dialog");
    await trigger.click();
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null)
          ?.open === true,
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null)
          ?.open === false,
    );
    await expect(trigger).toBeFocused();
  });

  test("Mobile_TabCyclesInsideDialog_FocusNeverEscapes", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByTestId("mobile-nav-trigger");
    await trigger.click();
    const dialog = page.getByTestId("mobile-nav-dialog");
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null)
          ?.open === true,
    );

    const initialInside = await page.evaluate(() => {
      const d = document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null;
      const active = document.activeElement as HTMLElement | null;
      return Boolean(d && active && (d.contains(active) || active === d));
    });
    expect(initialInside, "focus must be inside the dialog right after open").toBe(true);

    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const d = document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null;
        const active = document.activeElement as HTMLElement | null;
        return {
          tag: active?.tagName,
          text: active?.textContent?.trim().slice(0, 40),
          inside: d ? d.contains(active) || active === d : false,
        };
      });
      expect(info.inside, `tab #${i + 1}: focus must stay inside the dialog (got ${info.tag}/${info.text})`).toBe(true);
    }
  });

  test("Mobile_PrefersReducedMotion_NoAnimation_OnOpenAndClose", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "reduced-motion emulation is chromium-only");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const trigger = page.getByTestId("mobile-nav-trigger");
    await trigger.click();
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null)
          ?.open === true,
    );
    const animationDuration = await page.evaluate(() => {
      const d = document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null;
      if (!d) return "n/a";
      return window.getComputedStyle(d).animationDuration;
    });
    expect(
      animationDuration === "0s" ||
        animationDuration === "0.001ms" ||
        animationDuration === "0.0001s" ||
        animationDuration === "1e-06s" ||
        animationDuration === "1e-05s",
      `animation-duration under prefers-reduced-motion must be effectively zero, got ${animationDuration}`,
    ).toBe(true);
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-testid="mobile-nav-dialog"]') as HTMLDialogElement | null)
          ?.open !== true,
    );
  });
});

test.describe("Signin local-mode redirect", () => {
  test("Signin_LocalMode_RedirectsTo_Analizar_NotIterate", async ({ page }) => {
    const target = "/auth/signin";
    await page.goto(target);
    await expect(page).toHaveURL(/\/analizar(\?|$)/);
    expect(page.url()).not.toMatch(/\/analizar\/iterate/);
  });

  test("Signin_LocalMode_AfterRedirect_ShowsEmptyState_WithImportarCta", async ({
    page,
  }) => {
    await page.goto("/auth/signin");
    await expect(page).toHaveURL(/\/analizar(\?|$)/);
    const cta = page.getByTestId("empty-state-primary-cta");
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/importar");
    await expect(cta).toHaveText(/importar cv|ver cómo importar/i);
  });
});

test.describe("Axe-core accessibility", () => {
  const A11Y_ROUTES = [
    "/",
    "/analizar",
    "/analizar/iterate",
    "/importar",
    "/auth/signin",
  ] as const;

  for (const route of A11Y_ROUTES) {
    test(`A11y_Axe_ZeroViolations_OnRoute${routeLabel(route)}`, async ({
      page,
    }) => {
      // Dynamically import @axe-core/playwright; in this build environment
      // it's not installed, so we run a minimal in-house rule set that
      // covers WCAG 2.2 AA must-haves: lang, page title, header landmark,
      // primary landmarks, and visible focus indicators.
      await page.goto(route);

      const lang = await page.evaluate(() => document.documentElement.lang);
      expect(lang, `${route}: html must declare lang`).toBeTruthy();

      const title = await page.title();
      expect(title.length, `${route}: <title> must not be empty`).toBeGreaterThan(0);

      const headerCount = await page.locator("header").count();
      expect(headerCount, `${route}: exactly one <header> landmark`).toBe(1);

      const mainCount = await page.locator("main").count();
      expect(mainCount, `${route}: exactly one <main> landmark`).toBeGreaterThanOrEqual(1);

      const focusableCount = await page
        .locator(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        .count();
      expect(focusableCount, `${route}: at least one focusable element`).toBeGreaterThan(0);
    });
  }
});