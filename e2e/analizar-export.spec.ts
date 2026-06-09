import { test, expect } from "@playwright/test";

const VALID_CV =
  "Mariana\nBackend dev con experiencia en C# y ASP.NET Core. He trabajado con AWS, Docker y Kubernetes. Lideré un equipo de 5 personas que redujo el tiempo de deploy en 60%.";
const VALID_JOB =
  "Buscamos backend .NET con AWS y PostgreSQL. Valoramos experiencia con Docker y Kubernetes.";

// Input-panel valida: CV ≥200 chars, JOB ≥100 chars.
const FILLED_CV = `${VALID_CV}\n${VALID_CV}`;
const FILLED_JOB = `${VALID_JOB}\n${VALID_JOB}\n`;

const scoreBody = {
  overallScore: 78,
  band: "Buen encaje",
  honestyNotice: "coincidencia con la vacante + legibilidad",
  engineVersion: "1.0.0",
  lexiconVersion: "1.0.0",
  contextId: "ctx-export-test",
  components: [],
  keywordAnalysis: { present: [], partial: [], missing: [] },
  recommendations: [],
  formatIssues: [],
  gatesApplied: [],
};

const adaptSuccessBody = {
  adaptedCv: "# CV adaptado por IA\n\n## Experiencia\n- Backend con C# y AWS",
  validation: {
    isValid: true,
    severity: "None",
    inventions: [],
    warnings: [],
  },
  engineVersion: "1.0.0",
  aiModel: "stub",
};

test.describe("004-web-export-ui — flujo de export PDF", () => {
  test("happy path: analizar → adaptar → descargar PDF dispara la descarga vía blob URL", async ({
    page,
  }) => {
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(scoreBody),
      });
    });

    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(adaptSuccessBody),
      });
    });

    // Mock /api/export con un PDF binario mínimo válido (magic bytes %PDF-1.4)
    const pdfBytes = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n180\n%%EOF",
    );

    await page.route("**/api/export", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        headers: {
          "content-disposition": 'attachment; filename="cv-adapted-2026-06-08.pdf"',
        },
        body: pdfBytes,
      });
    });

    // Capturar el download event (Playwright lo emite cuando el browser recibe
    // un content-disposition: attachment, o cuando se dispara un <a download> click).
    const downloadPromise = page.waitForEvent("download");

    await page.goto("/analizar");

    const cvTextarea = page.getByLabel("Tu hoja de vida");
    const jobTextarea = page.getByLabel("La vacante");
    await cvTextarea.fill(FILLED_CV);
    await jobTextarea.fill(FILLED_JOB);

    await page.getByRole("button", { name: "Analizar" }).click();

    // Espera el AdaptPanel
    await expect(
      page.getByRole("heading", { name: "Adaptar tu CV con IA" }),
    ).toBeVisible();

    // Click Adaptar con IA
    await page.getByRole("button", { name: "Adaptar con IA" }).click();

    // Espera a que aparezca el botón de export (ExportButton dentro de AdaptPanel)
    const exportBtn = page.getByRole("button", { name: "Descargar PDF" });
    await expect(exportBtn).toBeVisible();

    // El filename-hint debe estar visible
    await expect(page.getByTestId("filename-hint")).toBeVisible();
    await expect(page.getByTestId("filename-hint")).toHaveText(
      /^cv-adapted-\d{4}-\d{2}-\d{2}\.pdf$/,
    );

    // Click en Descargar PDF
    await exportBtn.click();

    // Verificamos que la descarga se disparó — Playwright emite el evento
    // 'download' cuando el browser recibe un attachment, o cuando se hace
    // click en un <a download>. El downloadPath queda accesible aquí.
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^cv-adapted-\d{4}-\d{2}-\d{2}\.pdf$/);

    // El contenido descargado debe tener el magic number de PDF
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }
    const downloaded = Buffer.concat(chunks);
    expect(downloaded.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });

  test("error 422: el botón Descargar muestra panel con Regenerar", async ({ page }) => {
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(scoreBody),
      });
    });

    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(adaptSuccessBody),
      });
    });

    // /api/export retorna 422 con un problem+json
    await page.route("**/api/export", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          title: "HardInvention",
          detail: "Se detectó [FakeCorp] que no existe en el CV.",
        }),
      });
    });

    await page.goto("/analizar");

    const cvTextarea = page.getByLabel("Tu hoja de vida");
    const jobTextarea = page.getByLabel("La vacante");
    await cvTextarea.fill(FILLED_CV);
    await jobTextarea.fill(FILLED_JOB);

    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(
      page.getByRole("heading", { name: "Adaptar tu CV con IA" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Adaptar con IA" }).click();

    const exportBtn = page.getByRole("button", { name: "Descargar PDF" });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Panel de error visible con el detalle del backend
    await expect(page.getByText(/FakeCorp/)).toBeVisible();
    // Botón Regenerar (por el kind=invention)
    await expect(
      page.getByRole("button", { name: /regenerar/i }),
    ).toBeVisible();
    // NO botón reintentar (kind=invention no es 503)
    await expect(
      page.getByRole("button", { name: /reintentar/i }),
    ).toHaveCount(0);
  });
});
