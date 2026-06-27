import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const backendRoot = join(root, "..", "BuildCv-api");
const mode = process.argv[2] ?? "--all";

const webDirs = ["app", "lib", "components"];
const backendFiles = [
  "src/BuildCv.Api/Endpoints/AuthEndpoints.cs",
  "src/BuildCv.Api/Endpoints/SessionEndpoint.cs",
  "src/BuildCv.Api/Endpoints/PrivacyEndpoints.cs",
  "src/BuildCv.Api/Endpoints/UserDataEndpoints.cs",
];

const forbiddenWeb = [
  "/auth/sign-out",
  "/privacy/policies",
  "/user/consent",
  "/api/v1/auth/${provider}/callback",
  "/api/v1/auth/google/callback",
  "/api/v1/auth/linkedin/callback",
  "/arco/request",
  "/arco/rectify",
  "/arco/cancel",
  "providerId, email, name",
  "NEXT_PUBLIC_BFF_API_KEY",
];

const requiredWeb = [
  "/api/v1/auth/web-signup",
  "/api/v1/auth/session",
  "/api/v1/auth/logout",
  "/api/v1/user/data",
];

const requiredBackend = [
  "/api/v1/auth/web-signup",
  "/api/v1/auth/logout",
  "/api/v1/auth/session",
  "/api/v1/privacy-policy",
  "/api/v1/user/data",
  "/api/v1/user/data/consent",
  "/api/v1/user/data/consent/revoke",
];

function collectFiles(dir) {
  if (!existsSync(dir)) return [];
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "coverage", "test-results", "playwright-report"].includes(entry.name)) continue;
      result.push(...collectFiles(path));
      continue;
    }
    if (/\.(ts|tsx|js|jsx|mjs|cs)$/.test(entry.name)) result.push(path);
  }
  return result;
}

function readAll(files) {
  return files.map((file) => ({ file, text: stripComments(readFileSync(file, "utf-8")) }));
}

function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function fail(message, details) {
  process.stderr.write(`${message}\n${details.join("\n")}\n`);
  process.exit(1);
}

function checkWeb() {
  const files = webDirs.flatMap((dir) => collectFiles(join(root, dir)));
  const sources = readAll(files);
  const forbiddenHits = [];
  for (const source of sources) {
    for (const pattern of forbiddenWeb) {
      if (source.text.includes(pattern)) {
        forbiddenHits.push(`${relative(root, source.file)} contains ${pattern}`);
      }
    }
  }
  if (forbiddenHits.length > 0) fail("Web forbidden paths: FAIL", forbiddenHits);

  const allText = sources.map((s) => s.text).join("\n");
  const missing = requiredWeb.filter((path) => !allText.includes(path));
  if (missing.length > 0) fail("Web canonical paths: FAIL", missing.map((p) => `missing ${p}`));
  process.stdout.write("Web forbidden paths: PASS\n");
  process.stdout.write("Web canonical paths: PASS\n");
}

function checkBackend() {
  const sources = backendFiles.map((file) => {
    const path = join(backendRoot, file);
    if (!existsSync(path)) fail("Backend source: FAIL", [`missing ${file}`]);
    return readFileSync(path, "utf-8");
  }).join("\n");
  const missing = requiredBackend.filter((path) => !sources.includes(path));
  if (missing.length > 0) fail("Backend canonical paths: FAIL", missing.map((p) => `missing ${p}`));
  process.stdout.write("Backend canonical paths: PASS\n");
}

if (mode !== "--backend-only") checkWeb();
if (mode !== "--web-only") checkBackend();
process.stdout.write("Endpoint drift check: PASS\n");
