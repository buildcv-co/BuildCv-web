import { test, expect } from "@playwright/test";
import { copy } from "@/lib/copy/es";

const IMPORT_SUCCESS = {
  text: "Juan Pérez\nBackend Developer con 5 años de experiencia en C# y .NET.\n\nEXPERIENCIA\n\nAcme Corp · Senior Developer · 2022-2026\n- Lideré migración de monolito a microservicios",
  sections: [
    { heading: "EXPERIENCIA", start: 76, end: 245, confidence: "High" },
  ],
  warnings: [
    { code: "IMAGE_OMITTED", message: "Se omitieron 1 imagen(es).", severity: "Info" },
  ],
  engineVersion: "1.0.0",
  traceId: "0HMVD9F2E5Q2P:00000001",
};

test.describe("005-web-cv-import-ui — flujo de import PDF/DOCX", () => {
  test("happy path: 200 + ImportResult válido → muestra preview y CTA para analizar", async ({
    page,
  }) => {
    await page.route("**/api/import", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(IMPORT_SUCCESS),
      });
    });

    await page.goto("/importar");

    // El FileUpload está visible
    await expect(
      page.getByRole("button", { name: /cargar cv en pdf o docx/i }),
    ).toBeVisible();
    await expect(page.getByText(/tamaño máximo: 5 mb/i)).toBeVisible();

    // Seteamos un archivo en el input y disparamos el change
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "cv.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nmock"),
    });

    // El preview del texto extraído aparece con las acciones principales
    await expect(page.getByTestId("import-result-text")).toContainText("Juan Pérez");
    await expect(page.getByTestId("import-result-text")).toContainText("Backend Developer");
    await expect(page.getByRole("button", { name: copy.import.buttonAnalyze })).toBeVisible();
    await expect(page.getByRole("button", { name: copy.import.buttonUploadAnother })).toBeVisible();
  });

  test("422 (PDF escaneado): muestra ImportErrorPanel con mensaje del backend", async ({
    page,
  }) => {
    await page.route("**/api/import", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          title: "PDF escaneado",
          status: 422,
          detail:
            "Este PDF parece un escaneo. No podemos extraer texto. Pega el contenido manualmente o usa un PDF con texto seleccionable.",
          code: "IMPORT_SCANNED_PDF",
        }),
      });
    });

    await page.goto("/importar");
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "scan.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nmock"),
    });

    const errorAlert = page.locator("[role='alert'][aria-live='assertive']").filter({
      hasText: /escaneo/i,
    });
    await expect(errorAlert).toBeVisible();
  });

  test("429 (rate-limit): muestra mensaje honesto '30/hora' SIN botón retry", async ({
    page,
  }) => {
    await page.route("**/api/import", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Too Many Requests",
          status: 429,
          detail: "Has alcanzado el tope de importaciones (30/hora).",
          code: "IMPORT_RATE_LIMIT_EXCEEDED",
        }),
      });
    });

    await page.goto("/importar");
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "cv.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nmock"),
    });

    await expect(page.getByText(/30\/hora/)).toBeVisible();
    await expect(page.getByRole("button", { name: /reintentar/i })).toHaveCount(0);
  });

  test("415 (MIME spoofing): muestra mensaje 'PDF o DOCX'", async ({ page }) => {
    await page.route("**/api/import", async (route) => {
      await route.fulfill({
        status: 415,
        contentType: "application/json",
        body: JSON.stringify({
          title: "Tipo no soportado",
          status: 415,
          detail: "Tipo de archivo no soportado. Sube un PDF o DOCX.",
          code: "IMPORT_UNSUPPORTED_MEDIA",
        }),
      });
    });

    await page.goto("/importar");
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "spoof.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not really a PDF"),
    });

    const errorAlert = page.locator("[role='alert'][aria-live='assertive']").filter({
      hasText: /PDF o DOCX/,
    });
    await expect(errorAlert).toBeVisible();
  });

  test("Constitution Art. III: el archivo NO se guarda en localStorage tras el import", async ({
    page,
  }) => {
    await page.route("**/api/import", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(IMPORT_SUCCESS),
      });
    });

    await page.goto("/importar");
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles({
      name: "cv.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nmock"),
    });

    // Esperar a que el import termine
    await expect(page.getByTestId("import-result-text")).toContainText("Juan Pérez");

    // Verificar que localStorage NO contiene el archivo
    const lsLength = await page.evaluate(() => localStorage.length);
    expect(lsLength).toBe(0);
  });
});
