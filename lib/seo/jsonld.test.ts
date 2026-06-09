import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  buildOrganizationLd,
  buildWebSiteLd,
  buildSoftwareApplicationLd,
  buildFaqPageLd,
  buildAllLdSchemas,
} from "./jsonld";

// Defense in depth: Zod schemas for testing. They are NOT used in production —
// runtime validation is Google Rich Results Test. These catch regressions in
// builder output during development.
const OrganizationLdSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("Organization"),
  name: z.string().min(1).max(200),
  url: z.string().url(),
  logo: z.string().url(),
  sameAs: z.array(z.string().url()).max(10),
});

const WebSiteLdSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("WebSite"),
  name: z.string().min(1),
  url: z.string().url(),
  inLanguage: z.literal("es-CO"),
});

const SoftwareApplicationLdSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("SoftwareApplication"),
  name: z.string().min(1),
  applicationCategory: z.literal("BusinessApplication"),
  operatingSystem: z.literal("Web"),
  offers: z.object({
    "@type": z.literal("Offer"),
    price: z.literal("0"),
    priceCurrency: z.literal("COP"),
  }),
  description: z.string().min(1),
});

const QuestionSchema = z.object({
  "@type": z.literal("Question"),
  name: z.string().min(1),
  acceptedAnswer: z.object({
    "@type": z.literal("Answer"),
    text: z.string().min(1),
  }),
});

const FaqPageLdSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@type": z.literal("FAQPage"),
  mainEntity: z.array(QuestionSchema).min(1).max(20),
});

const GraphLdSchema = z.object({
  "@context": z.literal("https://schema.org"),
  "@graph": z
    .array(z.union([OrganizationLdSchema, WebSiteLdSchema, SoftwareApplicationLdSchema, FaqPageLdSchema]))
    .min(1)
    .max(10),
});

const SAMPLE_FAQS: ReadonlyArray<{ q: string; a: string }> = [
  { q: "¿BuildCv guarda mi CV?", a: "No. Se procesa en memoria y se descarta." },
  { q: "¿Cuánto cuesta?", a: "Es gratis en v0." },
  { q: "¿Funciona en móvil?", a: "Sí, el diseño es responsive." },
];

describe("buildOrganizationLd", () => {
  it("retorna JSON parseable", () => {
    const json = buildOrganizationLd();
    expect(() => JSON.parse(json) as unknown).not.toThrow();
  });

  it("tiene @context='https://schema.org' y @type='Organization'", () => {
    const parsed = JSON.parse(buildOrganizationLd()) as Record<string, unknown>;
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Organization");
  });

  it("tiene name, url, logo no vacíos", () => {
    const parsed = JSON.parse(buildOrganizationLd()) as Record<string, unknown>;
    expect(typeof parsed.name).toBe("string");
    expect((parsed.name as string).length).toBeGreaterThan(0);
    expect(typeof parsed.url).toBe("string");
    expect(typeof parsed.logo).toBe("string");
  });

  it("sameAs es array de URLs", () => {
    const parsed = JSON.parse(buildOrganizationLd()) as Record<string, unknown>;
    expect(Array.isArray(parsed.sameAs)).toBe(true);
    const sameAs = parsed.sameAs as ReadonlyArray<unknown>;
    expect(sameAs.length).toBeGreaterThan(0);
    for (const url of sameAs) {
      expect(typeof url).toBe("string");
      expect(url as string).toMatch(/^https?:\/\//);
    }
  });

  it("Zod valida el output (defense in depth)", () => {
    const parsed = JSON.parse(buildOrganizationLd());
    expect(() => OrganizationLdSchema.parse(parsed)).not.toThrow();
  });
});

describe("buildWebSiteLd", () => {
  it("retorna JSON parseable", () => {
    const json = buildWebSiteLd();
    expect(() => JSON.parse(json) as unknown).not.toThrow();
  });

  it("tiene @type='WebSite' y url absoluta", () => {
    const parsed = JSON.parse(buildWebSiteLd()) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("WebSite");
    const url = parsed.url as string;
    expect(url).toMatch(/^https?:\/\//);
  });

  it("inLanguage es 'es-CO'", () => {
    const parsed = JSON.parse(buildWebSiteLd()) as Record<string, unknown>;
    expect(parsed.inLanguage).toBe("es-CO");
  });

  it("Zod valida el output", () => {
    expect(() => WebSiteLdSchema.parse(JSON.parse(buildWebSiteLd()))).not.toThrow();
  });
});

describe("buildSoftwareApplicationLd", () => {
  it("retorna JSON parseable", () => {
    const json = buildSoftwareApplicationLd();
    expect(() => JSON.parse(json) as unknown).not.toThrow();
  });

  it("tiene @type='SoftwareApplication'", () => {
    const parsed = JSON.parse(buildSoftwareApplicationLd()) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("SoftwareApplication");
  });

  it("offers.price='0' y offers.priceCurrency='COP'", () => {
    const parsed = JSON.parse(buildSoftwareApplicationLd()) as Record<string, unknown>;
    const offers = parsed.offers as Record<string, unknown>;
    expect(offers["@type"]).toBe("Offer");
    expect(offers.price).toBe("0");
    expect(offers.priceCurrency).toBe("COP");
  });

  it("applicationCategory='BusinessApplication' y operatingSystem='Web'", () => {
    const parsed = JSON.parse(buildSoftwareApplicationLd()) as Record<string, unknown>;
    expect(parsed.applicationCategory).toBe("BusinessApplication");
    expect(parsed.operatingSystem).toBe("Web");
  });

  it("Zod valida el output", () => {
    expect(() => SoftwareApplicationLdSchema.parse(JSON.parse(buildSoftwareApplicationLd()))).not.toThrow();
  });
});

describe("buildFaqPageLd", () => {
  it("retorna JSON parseable", () => {
    const json = buildFaqPageLd(SAMPLE_FAQS);
    expect(() => JSON.parse(json) as unknown).not.toThrow();
  });

  it("tiene @type='FAQPage'", () => {
    const parsed = JSON.parse(buildFaqPageLd(SAMPLE_FAQS)) as Record<string, unknown>;
    expect(parsed["@type"]).toBe("FAQPage");
  });

  it("mainEntity es array con la misma cantidad de items que la entrada", () => {
    const parsed = JSON.parse(buildFaqPageLd(SAMPLE_FAQS)) as Record<string, unknown>;
    const main = parsed.mainEntity as ReadonlyArray<unknown>;
    expect(main).toHaveLength(SAMPLE_FAQS.length);
  });

  it("cada item es un Question con acceptedAnswer (Answer)", () => {
    const parsed = JSON.parse(buildFaqPageLd(SAMPLE_FAQS)) as Record<string, unknown>;
    const main = parsed.mainEntity as ReadonlyArray<Record<string, unknown>>;
    for (const item of main) {
      expect(item["@type"]).toBe("Question");
      const ans = item.acceptedAnswer as Record<string, unknown>;
      expect(ans["@type"]).toBe("Answer");
    }
  });

  it("escapa correctamente caracteres especiales (quotes, <, >, &)", () => {
    const faqsWithSpecial: ReadonlyArray<{ q: string; a: string }> = [
      { q: '¿"BuildCv" <guarda> & comparte?', a: "Respuesta con \"comillas\" y <tags>." },
    ];
    const json = buildFaqPageLd(faqsWithSpecial);
    // No debe contener sin escapar
    expect(json).not.toContain('"<guarda>"');
    // Y debe reparsear OK
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const main = parsed.mainEntity as ReadonlyArray<Record<string, unknown>>;
    const first = main[0]!;
    const ans = first.acceptedAnswer as Record<string, unknown>;
    expect(ans.text as string).toContain('"comillas"');
    expect(ans.text as string).toContain("<tags>");
  });

  it("Zod valida el output", () => {
    expect(() => FaqPageLdSchema.parse(JSON.parse(buildFaqPageLd(SAMPLE_FAQS)))).not.toThrow();
  });
});

describe("buildAllLdSchemas", () => {
  it("retorna JSON parseable con @graph", () => {
    const json = buildAllLdSchemas(SAMPLE_FAQS);
    const parsed = JSON.parse(json) as Record<string, unknown>;
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(Array.isArray(parsed["@graph"])).toBe(true);
  });

  it("@graph contiene 4 schemas: Organization, WebSite, SoftwareApplication, FAQPage", () => {
    const parsed = JSON.parse(buildAllLdSchemas(SAMPLE_FAQS)) as Record<string, unknown>;
    const graph = parsed["@graph"] as ReadonlyArray<Record<string, unknown>>;
    const types = graph.map((g) => g["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("SoftwareApplication");
    expect(types).toContain("FAQPage");
  });

  it("Zod valida el @graph completo", () => {
    const parsed = JSON.parse(buildAllLdSchemas(SAMPLE_FAQS));
    expect(() => GraphLdSchema.parse(parsed)).not.toThrow();
  });
});
