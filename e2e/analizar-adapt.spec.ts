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

/**
 * Dismisses the dev-only `DevErrorOverlay` (`components/observability/
 * dev-error-overlay.tsx`) if it appears. The overlay captures runtime
 * errors and floats fixed at bottom-right (z-50) — in headless e2e, the
 * BFF logs its own `ECONNREFUSED` errors when the backend isn't running
 * and the overlay shows up overlapping our buttons. Dismissing it (the
 * "Descartar panel" button per `copy.observability.devOverlay`) is the
 * cheapest fix; production builds don't render the overlay at all
 * (`isDev` guard).
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
 *
 * Mirrors the helper in `a11y-structured.spec.ts` (kept inline to avoid
 * cross-file e2e helper imports — each spec stays self-contained).
 */
async function fillAndSubmitJobSpecForm(page: Page): Promise<void> {
  // The dev error overlay can appear on /analizar when the BFF can't
  // reach the backend (e.g., headless e2e). It overlaps the form's
  // submit button at bottom-right (z-50), so dismiss it before clicking.
  await dismissDevErrorOverlayIfPresent(page);
  await page.getByLabel("Título del puesto").fill("Backend Developer");
  await page.getByLabel("Empresa").fill("Acme Corp");
  await page.getByLabel("Ubicación").fill("Remoto, Colombia");
  await page.getByLabel("Tipo de empleo").selectOption("full_time");
  await page.getByLabel("Descripción de la vacante").fill("Buscamos backend .NET con AWS y PostgreSQL.");
  // `getByLabel("Requisito 1")` substring-matches the "Eliminar requisito 1"
  // button too — `exact: true` scopes to the input.
  await page.getByLabel("Requisito 1", { exact: true }).fill("3 años de experiencia en .NET");
  // JobSpecForm's submit (text "Analizar" matches the analyzer-level
  // submit too — disambiguate via `data-testid`).
  await page.getByTestId("job-spec-form-submit").click();
}

test.describe("003-web-adapt-ui — flujo de adaptación", () => {
  test("happy path: analizar → adaptar → ver CV adaptado con severity badge", async ({ page }) => {
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

    await page.goto("/analizar");
    await expect(page.getByLabel("Tu hoja de vida")).toBeVisible();
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();

    // Espera al AdaptPanel (heading del panel)
    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();

    // Click en Adaptar (copy: 'Adaptar mi CV')
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
    await expect(page.getByLabel("Tu hoja de vida")).toBeVisible();
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();

    await expect(page.getByRole("heading", { name: "Adaptar tu CV" })).toBeVisible();
    await page.getByRole("button", { name: /adaptar mi cv/i }).click();

    await expect(page.getByText(/FakeCorp/)).toBeVisible();
    await expect(page.getByRole("button", { name: /regenerar con prompt estricto/i })).toBeVisible();
  });

  test("success con Hard inventions: NO muestra Descargar PDF, SÍ muestra panel + Regenerar adaptación", async ({ page }) => {
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
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ADAPT_SUCCESS_CRITICAL) });
    });

    await page.goto("/analizar");
    await expect(page.getByLabel("Tu hoja de vida")).toBeVisible();
    await fillAndSubmitJobSpecForm(page);
    await page.getByTestId("analyzer-submit").click();

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
