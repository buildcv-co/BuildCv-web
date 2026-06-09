import { test, expect } from "@playwright/test";

const BASE_HANDOFF = {
  originalText:
    "Juan Pérez\nBackend Developer\nStack: Node.js, PostgreSQL",
  adaptedText:
    "Juan Pérez\nBackend Developer Senior\nStack: Node.js, PostgreSQL, Redis\nMétrica: reduje latencia 40%",
  validation: {
    isValid: false,
    severity: "Critical",
    inventions: [
      {
        type: "Title",
        claimed: "Senior",
        original: null,
        severity: "Hard",
        position: 30,
      },
      {
        type: "Metric",
        claimed: "40%",
        original: "35%",
        severity: "Soft",
        position: 88,
      },
    ],
    warnings: ["Hard y Soft detectadas"],
  },
  adaptTraceId: "0HMVD9F2E5Q2P:00000012",
};

function freshHandoff() {
  return {
    ...BASE_HANDOFF,
    timestamp: new Date().toISOString(),
  };
}

test.describe("006-web-cv-diff-viewer — visor de diff", () => {
  test("happy path: badge Soft y Hard visibles, columnas del diff", async ({
    page,
  }) => {
    const handoff = freshHandoff();
    await page.addInitScript((data) => {
      sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(data));
    }, handoff);

    await page.goto("/analizar/diff?job=vacante%20de%20prueba");

    // Wait for hydration: el botón "Aceptar y exportar" solo aparece cuando
    // el status === "ready" (después de hidratar de sessionStorage).
    await expect(
      page.getByRole("button", { name: /aceptar y exportar/i }),
    ).toBeVisible({ timeout: 10000 });

    // El DiffView renderiza con role=region
    await expect(
      page.getByRole("region", { name: /visor de diff/i }),
    ).toBeVisible();

    // En ≥768px (chromium desktop) el default es side-by-side
    await expect(
      page.getByRole("article", { name: /columna cv original/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("article", { name: /columna cv adaptado/i }),
    ).toBeVisible();

    // Badges rojo (Soft y Hard)
    await expect(
      page.getByRole("button", { name: /40%/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Senior/i }),
    ).toBeVisible();
  });

  test("Hard sin resolver → click Aceptar y exportar abre modal", async ({
    page,
  }) => {
    const handoff = freshHandoff();
    await page.addInitScript((data) => {
      sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(data));
    }, handoff);

    await page.goto("/analizar/diff");
    // Wait for hydration
    await expect(
      page.getByRole("button", { name: /aceptar y exportar/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /aceptar y exportar/i }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /aceptar de todos modos/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /revisarlas primero/i }),
    ).toBeVisible();
  });

  test("Side-by-side: ambos textos se ven en columnas separadas", async ({
    page,
  }) => {
    const handoff = freshHandoff();
    await page.addInitScript((data) => {
      sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(data));
    }, handoff);

    await page.goto("/analizar/diff");
    const originalCol = page.getByRole("article", { name: /columna cv original/i });
    const adaptedCol = page.getByRole("article", { name: /columna cv adaptado/i });
    await expect(originalCol).toBeVisible({ timeout: 10000 });
    await expect(adaptedCol).toBeVisible();
    expect(await originalCol.textContent()).toContain("Backend Developer");
    expect(await adaptedCol.textContent()).toContain("Backend Developer Senior");
  });

  test("Toggle a unificado: cambia la vista a una sola columna", async ({
    page,
  }) => {
    const handoff = freshHandoff();
    await page.addInitScript((data) => {
      sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(data));
    }, handoff);

    await page.goto("/analizar/diff");
    // Wait for hydration
    await expect(
      page.getByRole("button", { name: /aceptar y exportar/i }),
    ).toBeVisible({ timeout: 10000 });
    // Cambia a unificado desde el toolbar (radio)
    await page
      .getByRole("radio", { name: /unificado/i })
      .check();
    // El selector 'columna cv original' NO debe estar presente
    await expect(
      page.getByRole("article", { name: /columna cv original/i }),
    ).toHaveCount(0);
    // Vuelve a side-by-side
    await page
      .getByRole("radio", { name: /lado a lado/i })
      .check();
    await expect(
      page.getByRole("article", { name: /columna cv original/i }),
    ).toBeVisible();
  });

  test("Editar un badge: input controlado + Enter actualiza texto", async ({
    page,
  }) => {
    const handoff = freshHandoff();
    await page.addInitScript((data) => {
      sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(data));
    }, handoff);

    await page.goto("/analizar/diff");
    // Wait for hydration
    await expect(
      page.getByRole("button", { name: /aceptar y exportar/i }),
    ).toBeVisible({ timeout: 10000 });
    const badge = page.getByRole("button", { name: /Senior/i });
    await badge.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const dialog = page.getByRole("dialog");
    const editBtn = dialog.getByRole("button", { name: "Editar" });
    await editBtn.click();
    const input = page.getByRole("textbox");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("Senior");
    await input.fill("Mid");
    await input.press("Enter");
    await expect(input).toBeHidden();
    await expect(
      page.getByRole("button", { name: /^Senior$/ }),
    ).toHaveCount(0);
  });

  test("Re-puntuar: mockea /api/score y muestra el nuevo score", async ({
    page,
  }) => {
    const handoff = freshHandoff();
    await page.addInitScript((data) => {
      sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(data));
    }, handoff);

    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          overallScore: 88,
          band: "Buen encaje",
          honestyNotice: "n/a",
          engineVersion: "1.0.0",
          lexiconVersion: "1.0.0",
          contextId: "ctx",
          components: [],
          keywordAnalysis: { present: [], partial: [], missing: [] },
          recommendations: [],
          formatIssues: [],
          gatesApplied: [],
        }),
      });
    });

    await page.goto("/analizar/diff?job=vacante%20de%20prueba");
    await expect(
      page.getByRole("button", { name: /aceptar y exportar/i }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /^re-puntuar$/i }).click();
    await expect(page.getByText("88")).toBeVisible({ timeout: 5000 });
  });

  test("Adaptación expirada (>1h) → muestra mensaje y botón Volver", async ({
    page,
  }) => {
    const expired = {
      ...BASE_HANDOFF,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
    await page.addInitScript((data) => {
      sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(data));
    }, expired);

    await page.goto("/analizar/diff");
    await expect(
      page.getByText(/la adaptaci[oó]n expir[oó]/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Sin handoff en sessionStorage → muestra 'no handoff'", async ({
    page,
  }) => {
    // No seedamos sessionStorage
    await page.goto("/analizar/diff");
    await expect(
      page.getByText(/no hay una adaptaci[oó]n reciente/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Constitution Art. III: el handoff está en sessionStorage, NO en localStorage", async ({
    page,
  }) => {
    const handoff = freshHandoff();
    await page.addInitScript((data) => {
      sessionStorage.setItem("buildcv:diff-handoff", JSON.stringify(data));
    }, handoff);

    await page.goto("/analizar/diff");
    // Wait for hydration
    await expect(
      page.getByRole("button", { name: /aceptar y exportar/i }),
    ).toBeVisible({ timeout: 10000 });
    // Verificamos que NO hay handoff en localStorage
    const lsKey = await page.evaluate(() =>
      localStorage.getItem("buildcv:diff-handoff"),
    );
    expect(lsKey).toBeNull();
    // Y que SÍ está en sessionStorage
    const ssKey = await page.evaluate(() =>
      sessionStorage.getItem("buildcv:diff-handoff"),
    );
    expect(ssKey).not.toBeNull();
  });
});
