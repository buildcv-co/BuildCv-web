import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

test.describe("009-auth-web PR8 — endpoint drift gate", () => {
  test("DriftGate_CheckEndpointDriftScriptPasses", () => {
    const output = execFileSync("node", ["scripts/check-endpoint-drift.mjs"], {
      encoding: "utf-8",
    });
    expect(output).toContain("Endpoint drift check: PASS");
  });

  test("DriftGate_NoLegacyPathsInWebBffSources", () => {
    const output = execFileSync("node", ["scripts/check-endpoint-drift.mjs", "--web-only"], {
      encoding: "utf-8",
    });
    expect(output).toContain("Web forbidden paths: PASS");
  });

  test("DriftGate_BackendCanonicalPathsArePresent", () => {
    const output = execFileSync("node", ["scripts/check-endpoint-drift.mjs", "--backend-only"], {
      encoding: "utf-8",
    });
    expect(output).toContain("Backend canonical paths: PASS");
  });
});
