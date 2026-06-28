import { expect, test, type Page } from "@playwright/test";

const SCORE_MOCK = {
  overallScore: 75,
  band: "high",
  perSection: { experience: 70, education: 60, skills: 80, certifications: 0, contact: 90 },
  redFlags: [],
  gatesApplied: [],
  honestyNotice: "coincidencia con la vacante + legibilidad",
  engineVersion: "2.0.0",
  lexiconVersion: "1.0.0",
  traceId: "ctx-llm-pr4",
};

const LLM_SUCCESS = {
  summary: "Buen encaje técnico para backend .NET.",
  strengths: ["Experiencia explícita en C#"],
  risks: ["Azure aparece como brecha"],
  suggestions: [{ category: "skills", text: "Refuerza Docker con métricas", severity: "medium" }],
  missingKeywords: ["Azure"],
  questions: ["¿Has liderado despliegues productivos?"],
  provider: "fake",
  model: "fake-local-v1",
  generatedAt: "2026-06-28T12:00:00.000Z",
  degraded: false,
};

async function seedAnalyzer(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "buildcv:analizar:cv-preseed",
      "Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8),
    );
  });
}

async function dismissDevErrorOverlayIfPresent(page: Page): Promise<void> {
  const overlay = page.locator('[aria-label="Panel de errores en desarrollo"]');
  if ((await overlay.count()) === 0) return;
  const dismiss = overlay.getByRole("button", { name: /descartar panel/i }).first();
  if ((await dismiss.count()) > 0) await dismiss.click();
}

async function fillAndSubmitJobSpecForm(page: Page): Promise<void> {
  await dismissDevErrorOverlayIfPresent(page);
  await page.getByLabel("Título del puesto").fill("Backend Developer");
  await page.getByLabel("Empresa").fill("Acme Corp");
  await page.getByLabel("Ubicación").fill("Remoto, Colombia");
  await page.getByLabel("Tipo de empleo").selectOption("full_time");
  await page.getByLabel("Descripción de la vacante").fill("Buscamos backend .NET con AWS y PostgreSQL.");
  await page.getByLabel("Requisito 1", { exact: true }).fill("3 años de experiencia en .NET");
  await dismissDevErrorOverlayIfPresent(page);
  await page.getByTestId("job-spec-form-submit").click();
}

async function analyze(page: Page): Promise<void> {
  await page.route("**/api/score", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SCORE_MOCK) });
  });
  await page.goto("/analizar");
  await fillAndSubmitJobSpecForm(page);
  await page.getByTestId("analyzer-submit").click();
  await expect(page.getByRole("region", { name: "AI Feedback" })).toBeVisible();
}

test.describe("022 PR4 — LLM feedback panel", () => {
  test.beforeEach(async ({ page }) => {
    await seedAnalyzer(page);
  });

  test("fake provider success renders the feedback panel", async ({ page }) => {
    await page.route("**/api/llm/feedback", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LLM_SUCCESS) });
    });

    await analyze(page);
    await page.getByRole("button", { name: "Obtener feedback IA" }).click();

    await expect(page.getByText("Buen encaje técnico para backend .NET.")).toBeVisible();
    await expect(page.getByText("fake · fake-local-v1")).toBeVisible();
  });

  test("session toggle off disables the panel and avoids fetch across navigation", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/llm/feedback", async (route) => {
      calls += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(LLM_SUCCESS) });
    });

    await analyze(page);
    await page.getByRole("button", { name: "Desactivar feedback IA" }).click();
    await expect(page.getByText("Feedback IA desactivado para esta sesión")).toBeVisible();
    await page.goto("/");
    await page.goto("/analizar");
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();

    await expect(page.getByText("Feedback IA desactivado para esta sesión")).toBeVisible();
    expect(calls).toBe(0);
  });

  test("backend error renders unavailable state", async ({ page }) => {
    await page.route("**/api/llm/feedback", async (route) => {
      await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "unavailable" }) });
    });

    await analyze(page);
    await page.getByRole("button", { name: "Obtener feedback IA" }).click();

    await expect(page.getByText("Feedback IA no disponible")).toBeVisible();
  });
});
