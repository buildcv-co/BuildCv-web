import { test, expect as pwExpect, request } from "@playwright/test";
import type { LogEntry } from "@/lib/observability/types";

const VALID_ENTRY: Omit<LogEntry, "message"> & { message: string } = {
  timestamp: "2026-06-09T12:34:56.000Z",
  level: "error",
  message: "e2e-valid",
  stack: "Error: e2e-valid\n  at foo",
  context: {
    url: "https://buildcv.co/analizar",
    userAgent: "Mozilla/5.0",
    viewport: { width: 1280, height: 720 },
    appVersion: "0.5.1",
    buildSha: "a312662",
    locale: "es-CO",
  },
};

test.describe("BFF /api/log (E2E)", () => {
  test("POST con payload válido → 204", async () => {
    const ctx = await request.newContext();
    const res = await ctx.post("/api/log", {
      data: { ...VALID_ENTRY, message: "e2e-valid" },
    });
    pwExpect(res.status()).toBe(204);
    await ctx.dispose();
  });

  test("POST con payload inválido (sin context) → 400", async () => {
    const ctx = await request.newContext();
    const res = await ctx.post("/api/log", {
      data: {
        timestamp: "2026-06-09T12:34:56.000Z",
        level: "error",
        message: "no context",
      },
    });
    pwExpect(res.status()).toBe(400);
    const body = await res.json();
    pwExpect(body["error"]).toBeDefined();
    await ctx.dispose();
  });

  test("POST con timestamp malformado → 400", async () => {
    const ctx = await request.newContext();
    const res = await ctx.post("/api/log", {
      data: { ...VALID_ENTRY, timestamp: "not-a-date" },
    });
    pwExpect(res.status()).toBe(400);
    await ctx.dispose();
  });

  test("GET retorna 200 con array JSON", async () => {
    const ctx = await request.newContext();
    const res = await ctx.get("/api/log");
    pwExpect(res.status()).toBe(200);
    const body = await res.json();
    pwExpect(Array.isArray(body)).toBe(true);
    await ctx.dispose();
  });

  test("FIFO: POST 101 → el array tiene size <= 100", async () => {
    const ctx = await request.newContext();
    for (let i = 0; i < 101; i += 1) {
      await ctx.post("/api/log", {
        data: { ...VALID_ENTRY, message: `bulk-${i}` },
      });
    }
    const get = await ctx.get("/api/log");
    const body = (await get.json()) as ReadonlyArray<LogEntry>;
    pwExpect(body.length).toBeLessThanOrEqual(100);
    const hasNewest = body.some((e) => e.message === "bulk-100");
    pwExpect(hasNewest).toBe(true);
    await ctx.dispose();
  });

  test("GET refleja un POST previo en la misma sesión", async () => {
    const ctx = await request.newContext();
    const unique = `findable-${Date.now()}-${Math.random()}`;
    await ctx.post("/api/log", {
      data: { ...VALID_ENTRY, message: unique },
    });
    const get = await ctx.get("/api/log");
    const body = (await get.json()) as ReadonlyArray<LogEntry>;
    const found = body.some((e) => e.message === unique);
    pwExpect(found).toBe(true);
    await ctx.dispose();
  });
});

test.describe("DevErrorOverlay (UX)", () => {
  test("panel visible en dev mode con disclaimer y emptyHint inicial", async ({
    page,
  }) => {
    await page.goto("/");
    const panel = page.getByRole("alert", {
      name: /errores en desarrollo/i,
    });
    await pwExpect(panel).toBeVisible({ timeout: 5000 });
    // El disclaimer 'no se envían a terceros' (Constitution Art. III)
    await pwExpect(
      page.getByText(/no se envían a terceros/i),
    ).toBeVisible();
    // El emptyHint inicial
    await pwExpect(page.getByText(/sin errores todavía/i)).toBeVisible();
  });

  test("dev overlay se descarta con el botón 'Descartar panel'", async ({
    page,
  }) => {
    await page.goto("/");
    const panel = page.getByRole("alert", {
      name: /errores en desarrollo/i,
    });
    await pwExpect(panel).toBeVisible({ timeout: 5000 });
    await page
      .getByRole("button", { name: /descartar/i })
      .first()
      .click();
    await pwExpect(panel).toBeHidden({ timeout: 2000 });
  });
});

test.describe("Privacy: 0 third-party", () => {
  test("ninguna request a dominios externos durante navegación normal", async ({
    page,
  }) => {
    const externalRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (
        !url.startsWith("http://localhost:3000") &&
        !url.startsWith("data:") &&
        !url.startsWith("blob:") &&
        !url.startsWith("about:")
      ) {
        externalRequests.push(url);
      }
    });
    await page.goto("/");
    await page.goto("/analizar");
    await page.goto("/importar");
    pwExpect(externalRequests).toEqual([]);
  });

  test("0 cookies creados en navegación normal", async ({ page, context }) => {
    await page.goto("/");
    await page.goto("/analizar");
    await page.goto("/importar");
    const cookies = await context.cookies();
    pwExpect(cookies).toEqual([]);
  });
});

test.describe("Web Vitals", () => {
  test("reporta al menos un vital a console.info en dev mode", async ({
    page,
  }) => {
    const consoleLines: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "info" || msg.type() === "log") {
        consoleLines.push(msg.text());
      }
    });
    await page.goto("/");
    // Web Vitals se reportan después de LCP/CLS se estabiliza
    await page.waitForTimeout(3000);
    const hasVitalLog = consoleLines.some((l) => l.includes("BuildCv WebVital"));
    pwExpect(hasVitalLog).toBeTruthy();
  });
});
