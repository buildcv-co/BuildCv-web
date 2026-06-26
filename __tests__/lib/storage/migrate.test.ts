/**
 * Tests RED → GREEN de `lib/storage/migrate.ts` (PR 4b).
 *
 * Cubre:
 *  - Detección de shape legacy (sections[] + entities[] en raíz).
 *  - Migración de `LegacyCvDocument` → `CvDocument` JSON Resume con
 *    `meta.engineVersion === "2.0.0"` y todos los campos
 *    `confidence: 'inferred'`.
 *  - `migrateLegacyLocalStorage()` recorre las keys `buildcv:draft:*` y
 *    migra in-place a `buildcv:draft:*-v2`.
 *  - Keys ya migradas (sufijo `-v2`) o con shape desconocido se dejan
 *    intactas.
 *  - Modo SSR (sin `localStorage`) → no-op, retorna 0.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  migrateLegacyLocalStorage,
  tryMigrateLegacyDraft,
} from "@/lib/storage/migrate";
import type { LegacyCvDocument } from "@/lib/editor/types";

const LEGACY_DRAFT_KEY = "buildcv:draft:default";

const ISO = "2026-06-08T14:30:00.000Z";

function makeLegacy(): LegacyCvDocument {
  return {
    id: "doc_legacy_01",
    version: "0.5.0",
    locale: "es-CO",
    sections: [
      {
        id: "sec_profile",
        kind: "profile",
        source: "imported",
        createdAt: ISO,
        updatedAt: ISO,
        fullName: "Ada Lovelace",
        headline: "Engineer",
        email: "ada@example.com",
        phone: "+573001234567",
        location: "Bogotá",
        links: [],
        summary: "Mathematician",
      },
    ],
    entities: [
      {
        id: "ent_01",
        kind: "skill",
        value: "Node.js",
        normalized: "node.js",
        source: "imported",
        confidence: "high",
        sectionId: "sec_profile",
        firstSeenAt: ISO,
      },
    ],
    createdAt: ISO,
    updatedAt: ISO,
    source: "imported",
  };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("tryMigrateLegacyDraft", () => {
  it("rechaza null / undefined / primitivos", () => {
    expect(tryMigrateLegacyDraft(null)).toBeNull();
    expect(tryMigrateLegacyDraft(undefined)).toBeNull();
    expect(tryMigrateLegacyDraft("string")).toBeNull();
    expect(tryMigrateLegacyDraft(42)).toBeNull();
    expect(tryMigrateLegacyDraft(true)).toBeNull();
  });

  it("rechaza objetos sin sections[] o entities[]", () => {
    expect(tryMigrateLegacyDraft({})).toBeNull();
    expect(tryMigrateLegacyDraft({ sections: [] })).toBeNull();
    expect(tryMigrateLegacyDraft({ entities: [] })).toBeNull();
  });

  it("migra un LegacyCvDocument válido → CvDocument JSON Resume", () => {
    const cv = tryMigrateLegacyDraft(makeLegacy());
    expect(cv).not.toBeNull();
    expect(cv?.meta.engineVersion).toBe("2.0.0");
    // Constitution Art. I: todo 'inferred' (no auto-promote)
    expect(cv?.basics.confidence.name).toBe("inferred");
    expect(cv?.basics.confidence.email).toBe("inferred");
    expect(cv?.work).toEqual([]);
    expect(cv?.education).toEqual([]);
    expect(cv?.skills).toEqual([]);
  });
});

describe("migrateLegacyLocalStorage", () => {
  it("retorna 0 cuando localStorage no está disponible (SSR)", () => {
    const original = globalThis.localStorage;
    // @ts-expect-error — testing SSR path
    delete globalThis.localStorage;
    try {
      expect(migrateLegacyLocalStorage()).toBe(0);
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  });

  it("migra una key legacy `buildcv:draft:default` → `buildcv:draft:default-v2`", () => {
    localStorage.setItem(LEGACY_DRAFT_KEY, JSON.stringify(makeLegacy()));

    const migratedCount = migrateLegacyLocalStorage();

    expect(migratedCount).toBe(1);
    expect(localStorage.getItem(LEGACY_DRAFT_KEY)).toBeNull();
    const newRaw = localStorage.getItem(`${LEGACY_DRAFT_KEY}-v2`);
    expect(newRaw).not.toBeNull();
    const parsed = JSON.parse(newRaw as string);
    expect(parsed.meta.engineVersion).toBe("2.0.0");
    expect(parsed.basics.confidence.name).toBe("inferred");
  });

  it("NO migra keys ya migradas (sufijo -v2) — las deja intactas", () => {
    const v2Raw = JSON.stringify({
      basics: { name: "Ada", email: "ada@example.com", profiles: [] },
      work: [],
      education: [],
      skills: [],
      meta: { engineVersion: "2.0.0" },
    });
    localStorage.setItem(`${LEGACY_DRAFT_KEY}-v2`, v2Raw);

    const migratedCount = migrateLegacyLocalStorage();

    expect(migratedCount).toBe(0);
    expect(localStorage.getItem(`${LEGACY_DRAFT_KEY}-v2`)).toBe(v2Raw);
  });

  it("NO migra keys con shape desconocido (no sections/entities)", () => {
    localStorage.setItem("buildcv:draft:other", JSON.stringify({ foo: "bar" }));

    const migratedCount = migrateLegacyLocalStorage();

    expect(migratedCount).toBe(0);
    expect(localStorage.getItem("buildcv:draft:other")).not.toBeNull();
  });

  it("NO migra keys con JSON inválido — las deja intactas", () => {
    localStorage.setItem("buildcv:draft:broken", "{not valid json");

    const migratedCount = migrateLegacyLocalStorage();

    expect(migratedCount).toBe(0);
    expect(localStorage.getItem("buildcv:draft:broken")).toBe("{not valid json");
  });

  it("migra múltiples keys legacy en una sola pasada", () => {
    localStorage.setItem("buildcv:draft:default", JSON.stringify(makeLegacy()));
    localStorage.setItem("buildcv:draft:work", JSON.stringify(makeLegacy()));
    localStorage.setItem("buildcv:other:thing", JSON.stringify({ unrelated: true }));

    const migratedCount = migrateLegacyLocalStorage();

    expect(migratedCount).toBe(2);
    expect(localStorage.getItem("buildcv:draft:default-v2")).not.toBeNull();
    expect(localStorage.getItem("buildcv:draft:work-v2")).not.toBeNull();
    expect(localStorage.getItem("buildcv:draft:default")).toBeNull();
    expect(localStorage.getItem("buildcv:draft:work")).toBeNull();
    expect(localStorage.getItem("buildcv:other:thing")).not.toBeNull();
  });
});
