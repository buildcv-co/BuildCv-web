import { test, expect } from "@playwright/test";

const SCORE_MOCK = {
  overallScore: 75,
  band: "Buen encaje",
  honestyNotice: "coincidencia con la vacante + legibilidad",
  engineVersion: "1.0.0",
  lexiconVersion: "1.0.0",
  contextId: "ctx-test",
  components: [],
  keywordAnalysis: { present: [], partial: [], missing: [] },
  recommendations: [],
  formatIssues: [],
  gatesApplied: [],
};

const ADAPT_SUCCESS_NONE = {
  adaptedCv: "# CV adaptado\n\n## Skills\n- C#, .NET",
  validation: { isValid: true, severity: "None", inventions: [], warnings: [] },
  engineVersion: "1.0.0",
  aiModel: "stub",
};

const PDF_BYTES = Buffer.from("%PDF-1.4\n%mock\n%%EOF");

test.describe("004-web-export-ui — flujo de export PDF", () => {
  test("happy path: analizar → adaptar → descargar PDF dispara la descarga vía blob URL", async ({ page }) => {
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
    await page.getByLabel("Tu hoja de vida").fill("Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8));
    await page.getByLabel("La vacante").fill("Buscamos backend .NET con AWS y PostgreSQL.\n".repeat(4));
    await page.getByRole("button", { name: "Analizar" }).click();

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
    await page.getByLabel("Tu hoja de vida").fill("Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8));
    await page.getByLabel("La vacante").fill("Buscamos backend .NET con AWS y PostgreSQL.\n".repeat(4));
    await page.getByRole("button", { name: "Analizar" }).click();

    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();
    await expect(page.getByText(/sin invenciones/i)).toBeVisible();
    await page.getByRole("button", { name: /descargar pdf/i }).click();

    // Panel de error con mensaje
    await expect(page.getByText(/Invenci[oó]n Hard/i)).toBeVisible();
  });
});
