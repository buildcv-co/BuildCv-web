import { test, expect } from "@playwright/test";
import { copy } from "@/lib/copy/es";

const PUBLIC_PATHS = [
  "/",
  "/analizar",
  "/importar",
  "/analizar/editar",
  "/analizar/diff",
  "/analizar/adapt",
  "/analizar/export",
] as const;

test.describe("SEO — sitemap.xml", () => {
  test("GET /sitemap.xml retorna 200", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
  });

  test("Content-Type es application/xml", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/xml/);
  });

  test("contiene las 7 URLs públicas", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    const body = await res.text();
    for (const path of PUBLIC_PATHS) {
      expect(body).toContain(`https://buildcv.co${path}`);
    }
  });

  test("XML parseable con DOMParser (en page context)", async ({ page, request }) => {
    const res = await request.get("/sitemap.xml");
    const xml = await res.text();
    await page.setContent("<!doctype html><html><body>ok</body></html>");
    const ok = await page.evaluate((xmlString: string) => {
      const parsed = new DOMParser().parseFromString(xmlString, "text/xml");
      const errs = parsed.getElementsByTagName("parsererror");
      return errs.length === 0 && parsed.documentElement.localName === "urlset";
    }, xml);
    expect(ok).toBe(true);
  });

  test("cada <url> tiene <loc>, <changefreq>, <priority>", async ({ page, request }) => {
    const res = await request.get("/sitemap.xml");
    const xml = await res.text();
    await page.setContent("<!doctype html><html><body>ok</body></html>");
    const counts = await page.evaluate((xmlString: string) => {
      const parsed = new DOMParser().parseFromString(xmlString, "text/xml");
      const urls = Array.from(parsed.getElementsByTagName("url"));
      return {
        urlCount: urls.length,
        locAll: urls.every((u) => u.getElementsByTagName("loc").length === 1),
        changefreqAll: urls.every((u) => u.getElementsByTagName("changefreq").length === 1),
        priorityAll: urls.every((u) => u.getElementsByTagName("priority").length === 1),
      };
    }, xml);
    expect(counts.urlCount).toBe(PUBLIC_PATHS.length);
    expect(counts.locAll).toBe(true);
    expect(counts.changefreqAll).toBe(true);
    expect(counts.priorityAll).toBe(true);
  });
});

test.describe("SEO — robots.txt", () => {
  test("GET /robots.txt retorna 200", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
  });

  test("contiene 'User-agent: *' y 'Allow: /'", async ({ request }) => {
    const res = await request.get("/robots.txt");
    const body = await res.text();
    // Next.js normalizes a 'User-agent' (mayúsculas distintas) — chequeamos case-insensitive
    expect(body.toLowerCase()).toContain("user-agent: *");
    expect(body).toContain("Allow: /");
  });

  test("apunta al sitemap oficial", async ({ request }) => {
    const res = await request.get("/robots.txt");
    const body = await res.text();
    expect(body).toContain("Sitemap: https://buildcv.co/sitemap.xml");
  });
});

test.describe("SEO — landing metadata", () => {
  test("el <title> contiene 'BuildCv' y 'honestidad'", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.toLowerCase()).toContain("buildcv");
    expect(title.toLowerCase()).toContain("honestidad");
  });

  test("hay <meta name='description'> con la descripción del producto", async ({ page }) => {
    await page.goto("/");
    const desc = await page.locator('meta[name="description"]').first().getAttribute("content");
    expect(desc).toBeTruthy();
    expect((desc ?? "").length).toBeGreaterThanOrEqual(50);
    expect((desc ?? "").length).toBeLessThanOrEqual(200);
  });

  test("hay <meta property='og:title'> y <meta property='og:description'>", async ({ page }) => {
    await page.goto("/");
    const ogTitle = await page.locator('meta[property="og:title"]').first().getAttribute("content");
    const ogDesc = await page.locator('meta[property="og:description"]').first().getAttribute("content");
    expect(ogTitle).toBeTruthy();
    expect(ogDesc).toBeTruthy();
  });

  test("hay <link rel='canonical'> apuntando a https://buildcv.co/", async ({ page }) => {
    await page.goto("/");
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href");
    expect(canonical).toBe("https://buildcv.co/");
  });

  test("hay <meta name='robots' content='index, follow'>", async ({ page }) => {
    await page.goto("/");
    const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
    expect(robots).toMatch(/index/);
    expect(robots).toMatch(/follow/);
  });
});

test.describe("SEO — JSON-LD", () => {
  test("hay 1 <script type='application/ld+json'> en el landing", async ({ page }) => {
    await page.goto("/");
    const scripts = page.locator('script[type="application/ld+json"]');
    await expect(scripts).toHaveCount(1);
  });

  test("el JSON-LD es JSON parseable y tiene @graph con 4 schemas", async ({ page }) => {
    await page.goto("/");
    const json = (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "";
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed["@context"]).toBe("https://schema.org");
    const graph = parsed["@graph"] as ReadonlyArray<Record<string, unknown>>;
    expect(graph).toHaveLength(4);
    const types = graph.map((g) => g["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("SoftwareApplication");
    expect(types).toContain("FAQPage");
  });

  test("FAQPage.mainEntity tiene la misma cantidad que copy.landing.faqs", async ({ page }) => {
    await page.goto("/");
    const json = (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? "";
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const graph = parsed["@graph"] as ReadonlyArray<Record<string, unknown>>;
    const faq = graph.find((g) => g["@type"] === "FAQPage")!;
    const main = faq.mainEntity as ReadonlyArray<unknown>;
    expect(main.length).toBe(copy.landing.faqs.length);
  });
});

test.describe("SEO — trust signals, FAQ, nav, 404", () => {
  test("la landing tiene 3 trust badges visibles", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Código abierto")).toBeVisible();
    await expect(page.getByText(/constitution v1\.1\.0 ratificada/i)).toBeVisible();
    await expect(page.getByText(/540 tests/i)).toBeVisible();
  });

  test("el link 'Código abierto' apunta al repo de GitHub con rel y target correctos", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: /código abierto/i });
    await expect(link).toHaveAttribute("href", "https://github.com/buildcv-co/BuildCv-web");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("rel", /noreferrer/);
  });

  test("la FAQ tiene 6 preguntas (5-7) con <details>/<summary>", async ({ page }) => {
    await page.goto("/");
    const details = page.locator("details");
    const count = await details.count();
    expect(count).toBeGreaterThanOrEqual(5);
    expect(count).toBeLessThanOrEqual(7);
    // Cada details tiene un summary
    const summaries = page.locator("details summary");
    expect(await summaries.count()).toBe(count);
  });

  test("click en un summary expande el <details>", async ({ page }) => {
    await page.goto("/");
    const firstSummary = page.locator("details summary").first();
    const firstDetails = page.locator("details").first();
    await expect(firstDetails).not.toHaveAttribute("open", "");
    await firstSummary.click();
    await expect(firstDetails).toHaveAttribute("open", "");
  });

  test("GET /ruta-inexistente retorna 404 con copy en español", async ({ page }) => {
    const res = await page.goto("/ruta-inexistente");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("Página no encontrada")).toBeVisible();
    await expect(page.getByRole("link", { name: /volver al inicio/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /ir a analizar/i })).toBeVisible();
  });

  test("aria-current='page' en el nav del landing marca 'Inicio'", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: /principal/i });
    const inicio = nav.getByRole("link", { name: /inicio/i });
    await expect(inicio).toHaveAttribute("aria-current", "page");
  });

  test("el link 'Analizar' del nav NO tiene aria-current en el landing", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: /principal/i });
    const analizar = nav.getByRole("link", { name: /analizar/i });
    await expect(analizar).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("a11y — prefers-reduced-motion", () => {
  test("la landing carga sin errores con reducedMotion: 'reduce'", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("Constitution Art. III — no tracking", () => {
  test("el landing NO escribe cookies (no document.cookie set por nuestro código)", async ({ page }) => {
    await page.goto("/");
    const cookies = await page.context().cookies();
    // Next.js puede setear una cookie interna mínima; lo que prohibimos es tracking.
    // Validamos que no haya cookies con nombres de trackers comunes.
    for (const c of cookies) {
      const name = c.name.toLowerCase();
      expect(name).not.toMatch(/^(_ga|_gid|_fb|amplitude|mixpanel|sentry|posthog|hotjar|gtm|hubspot)/);
    }
  });
});
