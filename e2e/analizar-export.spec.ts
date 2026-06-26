import { test, expect, type Page } from "@playwright/test";

const SCORE_MOCK = {
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

const ADAPT_SUCCESS_NONE = {
  adaptedCv: "# CV adaptado\n\n## Skills\n- C#, .NET",
  validation: { isValid: true, severity: "None", inventions: [], warnings: [] },
  engineVersion: "1.0.0",
  aiModel: "stub",
};

const PDF_BYTES = Buffer.from("%PDF-1.4\n%mock\n%%EOF");

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
  await page.getByLabel("Descripción de la vacante").fill("Buscamos backend .NET con AWS y PostgreSQL.");
  await page.getByLabel("Requisito 1", { exact: true }).fill("3 años de experiencia en .NET");
  await page.getByTestId("job-spec-form-submit").click();
}

test.describe("004-web-export-ui — flujo de export PDF", () => {
  test("happy path: analizar → adaptar → descargar PDF dispara la descarga vía blob URL", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "buildcv:analizar:cv-preseed",
        "Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8),
      );
    });
    await page.route("**/api/score", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SCORE_MOCK) });
    });
    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ADAPT_SUCCESS_NONE) });
    });
    await page.route("**/api/export", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/pdf", body: PDF_BYTES });
    });

    await page.goto("/analizar");
    await expect(page.getByLabel("Tu hoja de vida")).toBeVisible();
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();

    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();
    await expect(page.getByText(/sin invenciones/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /descargar pdf/i })).toBeVisible();

    // Captura la descarga
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /descargar pdf/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^cv-adapted-\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test("error 422: el botón Descargar muestra panel con Regenerar", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "buildcv:analizar:cv-preseed",
        "Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8),
      );
    });
    await page.route("**/api/score", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SCORE_MOCK) });
    });
    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ADAPT_SUCCESS_NONE) });
    });
    await page.route("**/api/export", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ title: "Export bloqueado", detail: "Invención Hard detectada" }),
      });
    });

    await page.goto("/analizar");
    await expect(page.getByLabel("Tu hoja de vida")).toBeVisible();
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();

    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();
    await expect(page.getByText(/sin invenciones/i)).toBeVisible();
    await page.getByRole("button", { name: /descargar pdf/i }).click();

    // Panel de error con mensaje
    await expect(page.getByText(/Invenci[oó]n Hard/i)).toBeVisible();
  });
});
