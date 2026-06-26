import { test, expect } from "@playwright/test";

/**
 * 019-navigation-onboarding — header-invariant e2e (REQ-LANDING-001).
 *
 * Parametrized over 9 primary routes (5 with stripped inline headers +
 * the wizard + auth + not-found). Asserts the invariant: every route
 * renders exactly ONE <header> element and exactly ONE
 * <nav aria-label*='principal'> element.
 *
 * This is the canary that catches the double-render regression: if a
 * future commit forgets to strip the inline <header> from one of the
 * 5 affected pages when promoting a new layout-level header, this test
 * fails for that route.
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

for (const route of ROUTES) {
  test(`Header_ExactlyOneHeader_ExactlyOneNavPrincipal_OnRoute${routeLabel(route)}`, async ({
    page,
  }) => {
    const response = await page.goto(route);
    expect(response, `route ${route} should respond`).not.toBeNull();
    expect(
      await page.locator("header").count(),
      `route ${route} should render exactly one <header>`,
    ).toBe(1);
    expect(
      await page.locator('nav[aria-label*="principal"]').count(),
      `route ${route} should render exactly one <nav aria-label*="principal">`,
    ).toBe(1);
  });
}