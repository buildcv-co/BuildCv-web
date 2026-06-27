import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Test defensivo (Vitest grep) — verifica NFR-ENV-1 + REQ-FN-004 (PR1):
 *
 *  - `NEXT_PUBLIC_BFF_API_KEY` NUNCA aparece (sería leak al bundle del cliente).
 *  - `BFF_API_KEY` NO aparece en `components/` (debe quedarse server-side).
 *  - `X-BFF-Key` NO aparece en `components/` (header server-side).
 *  - `BACKEND_URL` NO aparece hardcodeado en `components/` (debe ser import).
 *  - El path legacy `/auth/${provider}/callback` NO aparece en `lib/auth.ts`.
 *  - El campo legacy `providerId` NO aparece como key de objeto en `lib/`
 *    o `app/api/`.
 *
 * Razón: Constitution Art. III + IV + VI. Si este test falla, alguien
 * introdujo un secret o re-introdujo el contrato drift. PR1 lo deja como
 * regression-net para PR2..PR8.
 *
 * NOTA: este test NO escanea URLs públicas de documentación
 * (github.com/buildcv-co, jsonresume.org/schema, console.cloud.google.com,
 * linkedin.com/developers) que son legítimas y pre-existentes.
 */

const REPO_ROOT = process.cwd();

interface ScannedFile {
  path: string;
  contents: string;
}

function listTypeScriptFiles(root: string): string[] {
  const out: string[] = [];
  const absRoot = join(REPO_ROOT, root);
  let entries: string[];
  try {
    entries = readdirSync(absRoot);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = join(absRoot, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      out.push(...listTypeScriptFiles(join(root, entry)));
    } else if (/\.(ts|tsx|mts)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      out.push(join(root, entry));
    }
  }
  return out;
}

function readAllFiles(roots: readonly string[]): ScannedFile[] {
  const out: ScannedFile[] = [];
  for (const root of roots) {
    for (const rel of listTypeScriptFiles(root)) {
      try {
        const contents = readFileSync(join(REPO_ROOT, rel), "utf-8");
        out.push({ path: rel, contents });
      } catch {
        // file disappeared between list and read; skip
      }
    }
  }
  return out;
}

describe("NFR-ENV-1 + REQ-FN-004 (PR1): anti-regression de secrets y contract drift", () => {
  it("ningún archivo fuente contiene `NEXT_PUBLIC_BFF_API_KEY` (leak al bundle)", () => {
    const all = readAllFiles(["lib", "app", "components"]);
    const offenders = all.filter((f) => f.contents.includes("NEXT_PUBLIC_BFF_API_KEY"));
    expect(offenders).toEqual([]);
  });

  it("`components/` (client-side) no contiene `BFF_API_KEY`", () => {
    const all = readAllFiles(["components"]);
    const offenders = all.filter((f) => /\bBFF_API_KEY\b/.test(f.contents));
    expect(offenders).toEqual([]);
  });

  it("`components/` (client-side) no contiene `X-BFF-Key`", () => {
    const all = readAllFiles(["components"]);
    const offenders = all.filter((f) => f.contents.includes("X-BFF-Key"));
    expect(offenders).toEqual([]);
  });

  it("`components/` (client-side) no importa `BACKEND_URL` directamente", () => {
    const all = readAllFiles(["components"]);
    const offenders = all.filter((f) => /\bBACKEND_URL\b/.test(f.contents));
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("`lib/auth.ts` no contiene paths legacy de OAuth callback", () => {
    const contents = readFileSync(join(REPO_ROOT, "lib/auth.ts"), "utf-8");
    expect(contents).not.toMatch(/\/auth\/\$\{provider\}\/callback/);
    expect(contents).not.toContain("/callback");
  });

  it("ningún archivo de `lib/` o `app/api/` usa el campo legacy snake_case en payloads de auth", () => {
    const all = readAllFiles(["lib", "app"]);
    const offenders = all.filter((f) =>
      /\{\s*['"]?providerId['"]?\s*:/.test(f.contents),
    );
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it("`lib/api/auth-adapter.ts` no aparece en `components/` (server-only)", () => {
    const all = readAllFiles(["components"]);
    const offenders = all.filter((f) =>
      f.contents.includes("@/lib/api/auth-adapter"),
    );
    expect(offenders).toEqual([]);
  });
});