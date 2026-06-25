import { test, expect, type Page } from "@playwright/test";

const CV_TEXT = [
  "Mariana López",
  "Backend developer con 5 años de experiencia en C#, .NET y ASP.NET Core.",
  "He trabajado en RealCorp como ingeniera de software senior construyendo",
  "APIs REST con Entity Framework Core, autenticación JWT, Docker y AWS Lambda.",
].join(" ");

const VACANCY_TEXT = [
  "Buscamos backend developer con C# y .NET para equipo fintech.",
  "Requisitos: ASP.NET Core, Entity Framework Core, PostgreSQL, Docker, AWS.",
  "Ofrecemos contrato indefinido y trabajo remoto.",
].join(" ");

type StepDto = {
  iterationNumber: number;
  adaptedCvText: string;
  score: number;
  passedArtI: boolean;
  timestamp: string;
};

type ResultDto = {
  requestId: string;
  status: "Running" | "Completed" | "Failed" | "TimedOut";
  bestStep: StepDto | null;
  allSteps: StepDto[];
  probabilityWarning: string | null;
  creditsConsumed: number;
  completedAt: string;
};

function makeStep(n: number, score: number, passed = true): StepDto {
  return {
    iterationNumber: n,
    adaptedCvText: `# Iteración ${n}\n\n- Bullet A\n- Bullet B`,
    score,
    passedArtI: passed,
    timestamp: new Date(2026, 5, 25, 12, 0, n).toISOString(),
  };
}

function makeResult(overrides: Partial<ResultDto> = {}): ResultDto {
  return {
    requestId: "11111111-1111-1111-1111-111111111111",
    status: "Completed",
    bestStep: makeStep(3, 78),
    allSteps: [makeStep(1, 65), makeStep(2, 71), makeStep(3, 78)],
    probabilityWarning: null,
    creditsConsumed: 3,
    completedAt: new Date(2026, 5, 25, 12, 0, 5).toISOString(),
    ...overrides,
  };
}

async function mockIterateRoute(page: Page, response: unknown, status = 200) {
  await page.route("**/api/adapt/iterate", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

async function mockGetIterationRoute(
  page: Page,
  requestId: string,
  response: unknown,
  status = 200,
) {
  await page.route(`**/api/adapt/iterate/${requestId}`, async (route) => {
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

test.describe("018-cv-iteration-loop — BFF contracts", () => {
  test("happy path: POST iterate returns 200 with requestId, status, allSteps, creditsConsumed", async ({ page }) => {
    const response = makeResult({
      bestStep: makeStep(2, 82),
      allSteps: [makeStep(1, 70), makeStep(2, 82)],
      creditsConsumed: 2,
    });
    await mockIterateRoute(page, response);

    await page.goto("/");
    const result = await page.evaluate(
      async ({ payload }) => {
        const res = await fetch("/api/adapt/iterate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        return { status: res.status, body: await res.json() };
      },
      {
        payload: {
          cvText: CV_TEXT,
          vacancyText: VACANCY_TEXT,
          iterationCount: 2,
          probabilityThreshold: 50,
        },
      },
    );

    expect(result.status).toBe(200);
    expect(result.body.requestId).toBe("11111111-1111-1111-1111-111111111111");
    expect(result.body.status).toBe("Completed");
    expect(result.body.allSteps).toHaveLength(2);
    expect(result.body.creditsConsumed).toBe(2);
    expect(result.body.bestStep.iterationNumber).toBe(2);
  });

  test("insufficient credits: POST iterate returns 402 with CREDIT/INSUFFICIENT", async ({ page }) => {
    await mockIterateRoute(
      page,
      { error: "CREDIT/INSUFFICIENT", message: "No tenés créditos suficientes." },
      402,
    );

    await page.goto("/");
    const status = await page.evaluate(async ({ cvText, vacancyText }) => {
      const res = await fetch("/api/adapt/iterate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cvText, vacancyText, iterationCount: 20 }),
      });
      return { status: res.status, body: await res.json() };
    }, { cvText: CV_TEXT, vacancyText: VACANCY_TEXT });

    expect(status.status).toBe(402);
    expect(status.body.error).toBe("CREDIT/INSUFFICIENT");
  });

  test("invalid input: POST iterate with empty CV returns 422 with VALIDATION/INVALID_INPUT", async ({ page }) => {
    await mockIterateRoute(
      page,
      { error: "VALIDATION/INVALID_INPUT", message: "CV text required" },
      422,
    );

    await page.goto("/");
    const status = await page.evaluate(async ({ vacancyText }) => {
      const res = await fetch("/api/adapt/iterate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cvText: "", vacancyText }),
      });
      return { status: res.status, body: await res.json() };
    }, { vacancyText: VACANCY_TEXT });

    expect(status.status).toBe(422);
    expect(status.body.error).toBe("VALIDATION/INVALID_INPUT");
  });

  test("art. I violations: when all steps fail, status is Failed and bestStep is null", async ({ page }) => {
    const response = makeResult({
      status: "Failed",
      bestStep: null,
      allSteps: [makeStep(1, 0, false), makeStep(2, 0, false)],
      creditsConsumed: 2,
    });
    await mockIterateRoute(page, response);

    await page.goto("/");
    const result = await page.evaluate(async ({ cvText, vacancyText }) => {
      const res = await fetch("/api/adapt/iterate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cvText, vacancyText, iterationCount: 2 }),
      });
      return { status: res.status, body: await res.json() };
    }, { cvText: CV_TEXT, vacancyText: VACANCY_TEXT });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe("Failed");
    expect(result.body.bestStep).toBeNull();
    expect(result.body.allSteps).toHaveLength(2);
    expect(result.body.allSteps.every((s: StepDto) => s.passedArtI === false)).toBe(true);
  });

  test("probability warning: when best score is below threshold, BFF returns probabilityWarning field", async ({ page }) => {
    const response = makeResult({
      bestStep: makeStep(2, 35),
      allSteps: [makeStep(1, 30), makeStep(2, 35)],
      probabilityWarning:
        "Tu compatibilidad con esta vacante es del 35% (umbral: 50%). Considera mejorar tu CV antes de aplicar.",
      creditsConsumed: 2,
    });
    await mockIterateRoute(page, response);

    await page.goto("/");
    const result = await page.evaluate(async ({ cvText, vacancyText }) => {
      const res = await fetch("/api/adapt/iterate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cvText, vacancyText, iterationCount: 2, probabilityThreshold: 50 }),
      });
      return { status: res.status, body: await res.json() };
    }, { cvText: CV_TEXT, vacancyText: VACANCY_TEXT });

    expect(result.status).toBe(200);
    expect(result.body.probabilityWarning).toContain("35%");
    expect(result.body.probabilityWarning).toContain("umbral: 50%");
  });

  test("GET by requestId: cached result returns 200 with same requestId", async ({ page }) => {
    const requestId = "22222222-2222-2222-2222-222222222222";
    const response = makeResult({ requestId, creditsConsumed: 5 });
    await mockGetIterationRoute(page, requestId, response);

    await page.goto("/");
    const result = await page.evaluate(async (id) => {
      const res = await fetch(`/api/adapt/iterate/${id}`, {
        headers: { "content-type": "application/json" },
      });
      return { status: res.status, body: await res.json() };
    }, requestId);

    expect(result.status).toBe(200);
    expect(result.body.requestId).toBe(requestId);
    expect(result.body.creditsConsumed).toBe(5);
  });

  test("GET by requestId: missing requestId returns 404 with ITERATION/NOT_FOUND", async ({ page }) => {
    const missingId = "33333333-3333-3333-3333-333333333333";
    await mockGetIterationRoute(
      page,
      missingId,
      { error: "ITERATION/NOT_FOUND", message: "La iteración solicitada no existe o ya expiró." },
      404,
    );

    await page.goto("/");
    const result = await page.evaluate(async (id) => {
      const res = await fetch(`/api/adapt/iterate/${id}`, {
        headers: { "content-type": "application/json" },
      });
      return { status: res.status, body: await res.json() };
    }, missingId);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe("ITERATION/NOT_FOUND");
  });
});