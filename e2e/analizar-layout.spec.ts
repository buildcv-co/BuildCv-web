import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
] as const;

for (const vp of VIEWPORTS) {
  test.describe(`/analizar header @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("brand (SiteHeader) y tagline de análisis están visibles sin solaparse", async ({ page }) => {
      await page.goto("/analizar");
      const logo = page.getByTestId("brand-mark");
      const tagline = page.locator('[data-testid="analysis-tagline"]');
      await expect(logo).toBeVisible();
      await expect(tagline).toBeVisible();

      const logoBox = await logo.boundingBox();
      const taglineBox = await tagline.boundingBox();
      expect(logoBox).not.toBeNull();
      expect(taglineBox).not.toBeNull();

      const hOverlap =
        Math.min(logoBox!.x + logoBox!.width, taglineBox!.x + taglineBox!.width) -
        Math.max(logoBox!.x, taglineBox!.x);
      const vOverlap =
        Math.min(logoBox!.y + logoBox!.height, taglineBox!.y + taglineBox!.height) -
        Math.max(logoBox!.y, taglineBox!.y);
      expect(hOverlap <= 0 || vOverlap <= 0).toBe(true);
    });

    test("el privacy notice está visible en TODOS los viewports", async ({ page }) => {
      await page.goto("/analizar");
      const notice = page.getByText(/procesamos en memoria|procesa en memoria/i).first();
      await expect(notice).toBeVisible();
    });

    test("el EmptyState con CTA 'Ver cómo importar un CV' es visible cuando no hay inputs", async ({ page }) => {
      await page.goto("/analizar");
      const cta = page.getByTestId("empty-state-primary-cta");
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("href", "/importar");
      await expect(cta).toHaveText(/importar/i);
    });
  });
}
