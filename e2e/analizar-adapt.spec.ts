import { test, expect } from "@playwright/test";

test.describe("003-web-adapt-ui — flujo de adaptación", () => {
  test("happy path: analizar → adaptar → ver CV adaptado con severity badge", async ({ page }) => {
    const successBody = {
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

    // Mock del BFF /api/adapt (el browser habla con el BFF, no con el backend)
    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(successBody),
      });
    });

    await page.goto("/analizar");

    const cvTextarea = page.getByLabel("Tu hoja de vida");
    const jobTextarea = page.getByLabel("La vacante");

    await cvTextarea.fill("Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8));
    await jobTextarea.fill("Buscamos backend .NET con AWS y PostgreSQL.\n".repeat(4));

    // Click Analizar (puede fallar por backend apagado; solo necesitamos que aparezca el resultado o un error)
    // El test no depende del score real — forzamos el score con un mock.
    // Sin embargo, el botón Analizar en el estado vacío no requiere nada más.
    // Aquí probamos la rama: si el score falla, validamos que el AdaptPanel siga abajo del layout.

    // Hacemos click en "Analizar" — pero el BFF /api/score NO está mockeado, así que el flujo
    // podría quedarse en error. Para esta spec 003 el focus es el AdaptPanel. Como el
    // AdaptPanel solo aparece si hay result, necesitamos también mockear /api/score con un
    // payload válido mínimo para que el flujo llegue a mostrar el AdaptPanel.
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
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
        }),
      });
    });

    await page.getByRole("button", { name: "Analizar" }).click();

    // Espera a que aparezca el AdaptPanel (título)
    await expect(
      page.getByRole("heading", { name: "Adaptar tu CV con IA" }),
    ).toBeVisible();

    // Click en Adaptar con IA
    await page.getByRole("button", { name: "Adaptar con IA" }).click();

    // Espera a que aparezca el severity badge (sin invenciones)
    await expect(page.getByText(/sin invenciones/i)).toBeVisible();

    // Y el viewer del CV adaptado
    await expect(page.getByText(/# CV adaptado por IA/)).toBeVisible();
  });

  test("error 422: el panel muestra el mensaje del backend y un botón Regenerar", async ({ page }) => {
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
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
        }),
      });
    });

    await page.route("**/api/adapt", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          title: "HardInvention",
          detail: "Se detectó [FakeCorp] que no existe en el CV original.",
        }),
      });
    });

    await page.goto("/analizar");

    const cvTextarea = page.getByLabel("Tu hoja de vida");
    const jobTextarea = page.getByLabel("La vacante");
    await cvTextarea.fill("Mariana\nBackend dev con experiencia en C# y ASP.NET Core.\n".repeat(8));
    await jobTextarea.fill("Buscamos backend .NET con AWS.\n".repeat(4));

    await page.getByRole("button", { name: "Analizar" }).click();
    await expect(
      page.getByRole("heading", { name: "Adaptar tu CV con IA" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Adaptar con IA" }).click();
    await expect(page.getByText(/FakeCorp/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /regenerar/i }),
    ).toBeVisible();
  });
});
