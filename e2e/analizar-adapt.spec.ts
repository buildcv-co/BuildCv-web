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
  adaptedCv: "# CV adaptado\n\n## Experiencia\n- Backend con C# y AWS",
  validation: { isValid: true, severity: "None", inventions: [], warnings: [] },
  engineVersion: "1.0.0",
  aiModel: "stub",
};

const ADAPT_SUCCESS_CRITICAL = {
  adaptedCv: "# CV adaptado\n\n## Experiencia\n- Trabajé en RealCorp",
  validation: {
    isValid: false,
    severity: "Critical",
    inventions: [
      { type: "Company", claimed: "RealCorp", original: null, severity: "Hard", position: 10 },
    ],
    warnings: [],
  },
  engineVersion: "1.0.0",
  aiModel: "stub",
};

test.describe("003-web-adapt-ui — flujo de adaptación", () => {
  test("happy path: analizar → adaptar → ver CV adaptado con severity badge", async ({ page }) => {
    await page.route("**/api/score", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SCORE_MOCK) });
    });
    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ADAPT_SUCCESS_NONE) });
    });

    await page.goto("/analizar");
    await page.getByLabel("Tu hoja de vida").fill("Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8));
    await page.getByLabel("La vacante").fill("Buscamos backend .NET con AWS y PostgreSQL.\n".repeat(4));
    await page.getByRole("button", { name: "Analizar" }).click();

    // Espera al AdaptPanel (heading del panel)
    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();

    // Click en Adaptar (copy nuevo: 'Adaptar mi CV')
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();

    // Severity badge: "sin invenciones"
    await expect(page.getByText(/sin invenciones/i)).toBeVisible();

    // El viewer del CV adaptado ahora usa markup semántico: el '# CV adaptado' se
    // renderiza como heading h2 con texto 'CV adaptado' (sin el '#').
    await expect(page.getByRole("heading", { name: "CV adaptado", level: 2 })).toBeVisible();

    // El botón "Descargar PDF" debe aparecer (severity None, sin Hard inventions)
    await expect(page.getByRole("button", { name: /descargar pdf/i })).toBeVisible();
  });

  test("error 422: el panel muestra el mensaje del backend y un botón Regenerar", async ({ page }) => {
    await page.route("**/api/score", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SCORE_MOCK) });
    });
    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          title: "HardInvention",
          detail: "Se detectó [FakeCorp] que no existe.",
        }),
      });
    });

    await page.goto("/analizar");
    await page.getByLabel("Tu hoja de vida").fill("Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8));
    await page.getByLabel("La vacante").fill("Buscamos backend .NET con AWS y PostgreSQL.\n".repeat(4));
    await page.getByRole("button", { name: "Analizar" }).click();

    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();

    await expect(page.getByText(/FakeCorp/)).toBeVisible();
    await expect(page.getByRole("button", { name: /regenerar con prompt estricto/i })).toBeVisible();
  });

  test("success con Hard inventions: NO muestra Descargar PDF, SÍ muestra panel + Regenerar adaptación", async ({ page }) => {
    await page.route("**/api/score", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SCORE_MOCK) });
    });
    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ADAPT_SUCCESS_CRITICAL) });
    });

    await page.goto("/analizar");
    await page.getByLabel("Tu hoja de vida").fill("Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8));
    await page.getByLabel("La vacante").fill("Buscamos backend .NET con AWS y PostgreSQL.\n".repeat(4));
    await page.getByRole("button", { name: "Analizar" }).click();

    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();

    // Severity Critical: "Atención" + 1
    await expect(page.getByText(/Atenci[oó]n/)).toBeVisible();
    // Panel explicativo: "No podemos exportar este CV todavía"
    await expect(page.getByText(/No podemos exportar este CV todav[ií]a/i)).toBeVisible();
    // El botón "Descargar PDF" NO debe estar presente (Constitution Art. I)
    await expect(page.getByRole("button", { name: /descargar pdf/i })).not.toBeVisible();
    // Botón Regenerar adaptación (label custom del exportGate)
    await expect(page.getByRole("button", { name: /regenerar adaptaci[oó]n/i })).toBeVisible();
  });
});
